import { Router } from 'express';
import * as file from '../controllers/file.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/', requirePermission('project:read'), asyncHandler(file.listFiles));
router.post(
  '/',
  requirePermission('project:update'),
  file.uploadMiddleware,
  asyncHandler(file.uploadFile)
);
router.delete('/:id', requirePermission('project:update'), asyncHandler(file.deleteFile));

export default router;
