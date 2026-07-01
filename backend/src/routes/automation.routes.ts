import { Router } from 'express';
import * as automation from '../controllers/automation.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/meta', requirePermission('automation:read'), asyncHandler(automation.getMeta));
router.get('/', requirePermission('automation:read'), asyncHandler(automation.listAutomations));
router.post(
  '/',
  requirePermission('automation:manage'),
  validateBody(automation.automationSchema),
  asyncHandler(automation.createAutomation)
);
router.patch(
  '/:id',
  requirePermission('automation:manage'),
  validateBody(automation.updateAutomationSchema),
  asyncHandler(automation.updateAutomation)
);
router.delete(
  '/:id',
  requirePermission('automation:manage'),
  asyncHandler(automation.deleteAutomation)
);

export default router;
