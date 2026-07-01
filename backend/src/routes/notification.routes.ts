import { Router } from 'express';
import * as notif from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { requireTenant } from '../middleware/tenant';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
router.use(requireAuth, requireTenant);

// Notifications are personal — every org member can read/clear their own.
router.get('/', asyncHandler(notif.listNotifications));
router.post('/read-all', asyncHandler(notif.markAllRead));
router.patch('/:id/read', asyncHandler(notif.markRead));

export default router;
