import { Router } from 'express';
import * as project from '../controllers/project.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/', requirePermission('project:read'), asyncHandler(project.listProjects));
router.post(
  '/',
  requirePermission('project:create'),
  validateBody(project.createProjectSchema),
  asyncHandler(project.createProject)
);
router.get('/:id', requirePermission('project:read'), asyncHandler(project.getProject));
router.patch(
  '/:id',
  requirePermission('project:update'),
  validateBody(project.updateProjectSchema),
  asyncHandler(project.updateProject)
);
router.delete(
  '/:id',
  requirePermission('project:delete'),
  asyncHandler(project.deleteProject)
);

export default router;
