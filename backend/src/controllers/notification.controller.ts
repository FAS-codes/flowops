import { Request, Response } from 'express';
import { Notification } from '../models/Notification';
import { AppError } from '../utils/AppError';

/** The current user's notifications for the active org, newest first. */
export async function listNotifications(req: Request, res: Response) {
  const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10)));
  const [items, unread] = await Promise.all([
    Notification.find({ organization: req.orgId, user: req.userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean(),
    Notification.countDocuments({
      organization: req.orgId,
      user: req.userId,
      read: false,
    }),
  ]);
  res.json({ items, unread });
}

export async function markRead(req: Request, res: Response) {
  const notif = await Notification.findOneAndUpdate(
    { _id: req.params.id, organization: req.orgId, user: req.userId },
    { read: true },
    { new: true }
  );
  if (!notif) throw AppError.notFound('Notification not found');
  res.json(notif);
}

export async function markAllRead(req: Request, res: Response) {
  await Notification.updateMany(
    { organization: req.orgId, user: req.userId, read: false },
    { read: true }
  );
  res.status(204).end();
}
