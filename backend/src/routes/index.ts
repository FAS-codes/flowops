import { Router } from 'express';
import authRoutes from './auth.routes';
import dashboardRoutes from './dashboard.routes';
import leadRoutes from './lead.routes';
import orgRoutes from './org.routes';
import projectRoutes from './project.routes';
import taskRoutes from './task.routes';

const router = Router();

router.get('/health', (_req, res) => res.json({ status: 'ok', ts: Date.now() }));
router.use('/auth', authRoutes);
router.use('/organization', orgRoutes);
router.use('/leads', leadRoutes);
router.use('/projects', projectRoutes);
router.use('/tasks', taskRoutes);
router.use('/dashboard', dashboardRoutes);

export default router;
