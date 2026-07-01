import { Router } from 'express';
import * as audit from '../controllers/audit.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/', requirePermission('audit:read'), asyncHandler(audit.listAudit));

export default router;
