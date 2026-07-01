import { Router } from 'express';
import * as lead from '../controllers/lead.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/board', requirePermission('lead:read'), asyncHandler(lead.getBoard));
router.get('/', requirePermission('lead:read'), asyncHandler(lead.listLeads));
router.post(
  '/',
  requirePermission('lead:create'),
  validateBody(lead.createLeadSchema),
  asyncHandler(lead.createLead)
);
router.get('/:id', requirePermission('lead:read'), asyncHandler(lead.getLead));
router.patch(
  '/:id',
  requirePermission('lead:update'),
  validateBody(lead.updateLeadSchema),
  asyncHandler(lead.updateLead)
);
router.patch(
  '/:id/move',
  requirePermission('lead:update'),
  validateBody(lead.moveLeadSchema),
  asyncHandler(lead.moveLead)
);
router.delete('/:id', requirePermission('lead:delete'), asyncHandler(lead.deleteLead));

export default router;
