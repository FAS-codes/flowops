import { Router } from 'express';
import auditRoutes from './audit.routes';
import authRoutes from './auth.routes';
import automationRoutes from './automation.routes';
import dashboardRoutes from './dashboard.routes';
import fileRoutes from './file.routes';
import leadRoutes from './lead.routes';
import notificationRoutes from './notification.routes';
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
router.use('/notifications', notificationRoutes);
router.use('/files', fileRoutes);
router.use('/audit', auditRoutes);
router.use('/automations', automationRoutes);

export default router;
