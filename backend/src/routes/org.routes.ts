import { Router } from 'express';
import * as org from '../controllers/org.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Accepting an invitation only needs auth (the user isn't a member yet).
router.post(
  '/invitations/accept',
  requireAuth,
  validateBody(org.acceptInviteSchema),
  asyncHandler(org.acceptInvitation)
);

// Everything below is scoped to the active organization.
router.use(requireAuth, requireTenant);

router.get('/members', requirePermission('lead:read'), asyncHandler(org.getMembers));

router.post(
  '/invitations',
  requirePermission('member:invite'),
  validateBody(org.inviteSchema),
  asyncHandler(org.invite)
);
router.get(
  '/invitations',
  requirePermission('member:invite'),
  asyncHandler(org.listInvitations)
);

router.patch(
  '/members/:memberId/role',
  requirePermission('member:role:update'),
  validateBody(org.updateRoleSchema),
  asyncHandler(org.updateMemberRole)
);
router.delete(
  '/members/:memberId',
  requirePermission('member:remove'),
  asyncHandler(org.removeMember)
);

export default router;
