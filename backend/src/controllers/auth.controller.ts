import { Request, Response } from 'express';
import { z } from 'zod';
import { env } from '../config/env';
import { Organization, DEFAULT_PIPELINE_STAGES } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { User, hashPassword } from '../models/User';
import { AppError } from '../utils/AppError';
import { slugify } from '../utils/slugify';
import {
  hashToken,
  newTokenId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';

const REFRESH_COOKIE = 'flowops_refresh';

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(128),
  organizationName: z.string().min(1).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

function refreshCookieOptions() {
  // In production the SPA and API live on different domains, so the refresh
  // cookie must be SameSite=None + Secure to be sent on cross-site requests.
  // Locally we stay on SameSite=Lax (None requires HTTPS).
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: (env.isProd ? 'none' : 'lax') as 'none' | 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };
}

/** Issue a fresh access+refresh pair and persist the hashed refresh token. */
async function issueTokens(req: Request, res: Response, userId: string) {
  const jti = newTokenId();
  const refreshToken = signRefreshToken(userId, jti);
  const accessToken = signAccessToken(userId);

  await User.updateOne(
    { _id: userId },
    {
      $push: {
        refreshTokens: {
          jti,
          tokenHash: hashToken(refreshToken),
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    }
  );

  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
  return accessToken;
}

export async function register(req: Request, res: Response) {
  const { name, email, password, organizationName } = req.body as z.infer<
    typeof registerSchema
  >;

  const existing = await User.findOne({ email });
  if (existing) throw AppError.conflict('An account with that email already exists');

  const user = await User.create({
    name,
    email,
    passwordHash: await hashPassword(password),
  });

  const org = await Organization.create({
    name: organizationName,
    slug: await slugify(organizationName),
    createdBy: user._id,
    pipelineStages: DEFAULT_PIPELINE_STAGES,
  });

  await OrganizationMember.create({
    organization: org._id,
    user: user._id,
    role: 'owner',
  });

  user.defaultOrganization = org._id;
  await user.save();

  const accessToken = await issueTokens(req, res, user._id.toString());
  res.status(201).json({
    accessToken,
    user: { id: user._id, name: user.name, email: user.email },
    organization: { id: org._id, name: org.name, slug: org.slug },
  });
}

export async function login(req: Request, res: Response) {
  const { email, password } = req.body as z.infer<typeof loginSchema>;

  const user = await User.findOne({ email }).select('+passwordHash');
  if (!user || !(await user.comparePassword(password))) {
    throw AppError.unauthorized('Invalid email or password');
  }

  const accessToken = await issueTokens(req, res, user._id.toString());
  res.json({
    accessToken,
    user: { id: user._id, name: user.name, email: user.email },
    defaultOrganization: user.defaultOrganization,
  });
}

/**
 * Refresh-token rotation: verify the incoming refresh token, ensure its jti is
 * still stored (i.e. not already used/revoked), delete it, and issue a brand new
 * pair. Reuse of a rotated token finds no matching jti and is rejected — the
 * signal of a stolen token.
 */
export async function refresh(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (!token) throw AppError.unauthorized('No refresh token');

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    throw AppError.unauthorized('Invalid refresh token');
  }

  const user = await User.findById(payload.sub).select('+refreshTokens');
  if (!user) throw AppError.unauthorized();

  const stored = user.refreshTokens.find((t) => t.jti === payload.jti);
  if (!stored || stored.tokenHash !== hashToken(token)) {
    // Token not recognised — likely reuse of a rotated token. Revoke all.
    user.refreshTokens = [];
    await user.save();
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  // Remove the used token before issuing a new one (rotation).
  user.refreshTokens = user.refreshTokens.filter((t) => t.jti !== payload.jti);
  await user.save();

  const accessToken = await issueTokens(req, res, user._id.toString());
  res.json({ accessToken });
}

export async function logout(req: Request, res: Response) {
  const token = req.cookies?.[REFRESH_COOKIE];
  if (token) {
    try {
      const payload = verifyRefreshToken(token);
      await User.updateOne(
        { _id: payload.sub },
        { $pull: { refreshTokens: { jti: payload.jti } } }
      );
    } catch {
      // Token already invalid — nothing to revoke.
    }
  }
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
  res.status(204).end();
}

/** Current user plus every organization they belong to (for the org switcher). */
export async function me(req: Request, res: Response) {
  const user = await User.findById(req.userId);
  if (!user) throw AppError.unauthorized();

  const memberships = await OrganizationMember.find({ user: user._id })
    .populate('organization', 'name slug')
    .lean();

  res.json({
    user: { id: user._id, name: user.name, email: user.email },
    defaultOrganization: user.defaultOrganization,
    organizations: memberships.map((m) => ({
      id: (m.organization as unknown as { _id: string })._id,
      name: (m.organization as unknown as { name: string }).name,
      slug: (m.organization as unknown as { slug: string }).slug,
      role: m.role,
    })),
  });
}
