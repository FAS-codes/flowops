import { Request, Response } from 'express';
import { z } from 'zod';
import { Invitation, newInvitationToken } from '../models/Invitation';
import { Organization } from '../models/Organization';
import { OrganizationMember } from '../models/OrganizationMember';
import { User } from '../models/User';
import { AppError } from '../utils/AppError';
import { ROLES } from '../utils/rbac';
import { logActivity } from '../services/activity.service';
import { sendInvitationEmail } from '../services/mailer';

export const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(ROLES).default('employee'),
});

export const updateRoleSchema = z.object({
  role: z.enum(ROLES),
});

export const acceptInviteSchema = z.object({
  token: z.string().min(1),
});

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function getMembers(req: Request, res: Response) {
  const members = await OrganizationMember.find({ organization: req.orgId })
    .populate('user', 'name email')
    .lean();
  res.json(
    members.map((m) => ({
      id: m._id,
      role: m.role,
      user: m.user,
      joinedAt: m.createdAt,
    }))
  );
}

export async function invite(req: Request, res: Response) {
  const { email, role } = req.body as z.infer<typeof inviteSchema>;

  // An owner role can only be granted by transferring ownership, not via invite.
  if (role === 'owner') throw AppError.badRequest('Cannot invite a user as owner');

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    const alreadyMember = await OrganizationMember.exists({
      organization: req.orgId,
      user: existingUser._id,
    });
    if (alreadyMember) throw AppError.conflict('User is already a member');
  }

  const token = newInvitationToken();
  const invitation = await Invitation.create({
    organization: req.orgId,
    email,
    role,
    token,
    invitedBy: req.userId,
    status: 'pending',
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'member.invited',
    entityType: 'Invitation',
    entityId: invitation._id,
    summary: `Invited ${email} as ${role}`,
  });

  // Send the invitation email (no-op console log in dev if SMTP isn't set up).
  const [org, inviter] = await Promise.all([
    Organization.findById(req.orgId).lean(),
    User.findById(req.userId).lean(),
  ]);
  void sendInvitationEmail({
    to: email,
    orgName: org?.name ?? 'a workspace',
    inviterName: inviter?.name ?? 'A teammate',
    role,
    token,
  }).catch((err) => console.error('[mailer] invitation email failed', err));

  // Also return the accept link so it works even without email configured.
  res.status(201).json({
    id: invitation._id,
    email,
    role,
    token,
    inviteUrl: `/invite/accept?token=${token}`,
    expiresAt: invitation.expiresAt,
  });
}

export async function listInvitations(req: Request, res: Response) {
  const invitations = await Invitation.find({
    organization: req.orgId,
    status: 'pending',
  })
    .select('email role status expiresAt createdAt')
    .lean();
  res.json(invitations);
}

/**
 * Accepts an invitation. Runs authenticated (no tenant middleware) because the
 * accepting user is not yet a member of the target org — membership is created
 * here after validating the token and matching email.
 */
export async function acceptInvitation(req: Request, res: Response) {
  const { token } = req.body as z.infer<typeof acceptInviteSchema>;

  const invitation = await Invitation.findOne({ token, status: 'pending' });
  if (!invitation) throw AppError.notFound('Invitation not found or already used');
  if (invitation.expiresAt < new Date()) throw AppError.badRequest('Invitation expired');

  const user = await User.findById(req.userId);
  if (!user) throw AppError.unauthorized();
  if (user.email !== invitation.email) {
    throw AppError.forbidden('This invitation was issued to a different email');
  }

  const existing = await OrganizationMember.findOne({
    organization: invitation.organization,
    user: user._id,
  });
  if (!existing) {
    await OrganizationMember.create({
      organization: invitation.organization,
      user: user._id,
      role: invitation.role,
    });
  }

  invitation.status = 'accepted';
  await invitation.save();

  if (!user.defaultOrganization) {
    user.defaultOrganization = invitation.organization;
    await user.save();
  }

  const org = await Organization.findById(invitation.organization).lean();
  res.json({
    organization: org && { id: org._id, name: org.name, slug: org.slug },
    role: invitation.role,
  });
}

export async function updateMemberRole(req: Request, res: Response) {
  const { role } = req.body as z.infer<typeof updateRoleSchema>;
  const memberId = req.params.memberId;

  const member = await OrganizationMember.findOne({
    _id: memberId,
    organization: req.orgId,
  });
  if (!member) throw AppError.notFound('Member not found');

  if (member.role === 'owner') throw AppError.badRequest('Cannot change the owner role');
  if (role === 'owner') throw AppError.badRequest('Use ownership transfer to assign owner');

  const previous = member.role;
  member.role = role;
  await member.save();

  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'member.role_changed',
    entityType: 'OrganizationMember',
    entityId: member._id,
    summary: `Changed member role from ${previous} to ${role}`,
    metadata: { before: previous, after: role },
  });

  res.json({ id: member._id, role: member.role });
}

export async function removeMember(req: Request, res: Response) {
  const member = await OrganizationMember.findOne({
    _id: req.params.memberId,
    organization: req.orgId,
  });
  if (!member) throw AppError.notFound('Member not found');
  if (member.role === 'owner') throw AppError.badRequest('Cannot remove the owner');

  await member.deleteOne();
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'member.removed',
    entityType: 'OrganizationMember',
    entityId: member._id,
    summary: `Removed a member from the organization`,
  });
  res.status(204).end();
}
