import { Router } from 'express';
import * as task from '../controllers/task.controller';
import { requireAuth } from '../middleware/auth';
import { requirePermission } from '../middleware/rbac';
import { requireTenant } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

router.get('/', requirePermission('task:read'), asyncHandler(task.listTasks));
router.post(
  '/',
  requirePermission('task:create'),
  validateBody(task.createTaskSchema),
  asyncHandler(task.createTask)
);
router.patch(
  '/:id',
  requirePermission('task:update'),
  validateBody(task.updateTaskSchema),
  asyncHandler(task.updateTask)
);
router.patch(
  '/:id/move',
  requirePermission('task:update'),
  validateBody(task.moveTaskSchema),
  asyncHandler(task.moveTask)
);
router.delete('/:id', requirePermission('task:delete'), asyncHandler(task.deleteTask));

export default router;
