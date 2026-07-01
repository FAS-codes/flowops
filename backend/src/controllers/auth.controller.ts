import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env, primaryClientUrl } from '../config/env';
import { Organization, DEFAULT_PIPELINE_STAGES } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { User, UserDocument, hashPassword } from '../models/User';
import { sendWelcomeEmail } from '../services/mailer';
import { buildConsentUrl, exchangeCodeForProfile } from '../services/google';
import { AppError } from '../utils/AppError';
import { slugify } from '../utils/slugify';
import {
  hashToken,
  newTokenId,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../utils/tokens';

/** Creates an organization owned by the user and sets it as their default. */
async function createDefaultWorkspace(user: UserDocument, orgName: string) {
  const org = await Organization.create({
    name: orgName,
    slug: await slugify(orgName),
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
  return org;
}

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
    authProvider: 'local',
  });

  const org = await createDefaultWorkspace(user, organizationName);
  void sendWelcomeEmail(user.email, user.name).catch(() => undefined);

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

  const user = await User.findById(payload.sub).select('+refreshTokens').lean();
  if (!user) throw AppError.unauthorized();

  const stored = user.refreshTokens.find((t) => t.jti === payload.jti);
  if (!stored || stored.tokenHash !== hashToken(token)) {
    // Token not recognised — likely reuse of a rotated token. Revoke all.
    // Atomic update (not save()) so concurrent refreshes don't hit a
    // Mongoose VersionError racing on the refreshTokens array.
    await User.updateOne({ _id: payload.sub }, { $set: { refreshTokens: [] } });
    throw AppError.unauthorized('Refresh token has been revoked');
  }

  // Atomically remove the used token before issuing a new one (rotation).
  await User.updateOne(
    { _id: payload.sub },
    { $pull: { refreshTokens: { jti: payload.jti } } }
  );

  const accessToken = await issueTokens(req, res, payload.sub);
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

/** Public feature flags the login/register screens use to render conditionally. */
export async function authConfig(_req: Request, res: Response) {
  res.json({ googleEnabled: env.google.enabled });
}

// --- Google OAuth (server-side redirect flow) -----------------------------

/** Step 1: redirect the browser to Google's consent screen. */
export async function googleStart(_req: Request, res: Response) {
  if (!env.google.enabled) {
    throw AppError.badRequest('Google sign-in is not configured on this server');
  }
  // Signed, short-lived state token guards against CSRF on the callback.
  const state = jwt.sign({ p: 'google' }, env.jwt.accessSecret, { expiresIn: '10m' });
  res.redirect(buildConsentUrl(state));
}

/**
 * Step 2: Google redirects back here with a code. We verify state, exchange the
 * code for the user's profile, find-or-create the account, set the refresh
 * cookie, then bounce to the SPA — which restores the session via /auth/refresh.
 */
export async function googleCallback(req: Request, res: Response) {
  const clientUrl = primaryClientUrl();
  const fail = (reason: string) =>
    res.redirect(`${clientUrl}/login?error=${encodeURIComponent(reason)}`);

  const { code, state, error } = req.query as Record<string, string>;
  if (error) return fail('google_denied');
  if (!code || !state) return fail('google_invalid');

  try {
    jwt.verify(state, env.jwt.accessSecret);
  } catch {
    return fail('google_state');
  }

  let profile;
  try {
    profile = await exchangeCodeForProfile(code);
  } catch {
    return fail('google_exchange');
  }

  // Find by googleId, else link an existing local account by email, else create.
  let user = await User.findOne({ googleId: profile.googleId });
  if (!user) {
    user = await User.findOne({ email: profile.email });
    if (user) {
      user.googleId = profile.googleId;
      if (!user.avatarUrl) user.avatarUrl = profile.picture;
      await user.save();
    } else {
      user = await User.create({
        name: profile.name,
        email: profile.email,
        authProvider: 'google',
        googleId: profile.googleId,
        avatarUrl: profile.picture,
      });
      const first = profile.name.split(' ')[0];
      await createDefaultWorkspace(user, `${first}'s Workspace`);
      void sendWelcomeEmail(user.email, user.name).catch(() => undefined);
    }
  }

  await issueTokens(req, res, user._id.toString());
  return res.redirect(`${clientUrl}/app/dashboard`);
}
