import { Router } from 'express';
import * as dashboard from '../controllers/dashboard.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/stats', requirePermission('dashboard:read'), asyncHandler(dashboard.getStats));
router.get(
  '/activity',
  requirePermission('dashboard:read'),
  asyncHandler(dashboard.getActivity)
);

export default router;
