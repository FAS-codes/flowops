import { Types } from 'mongoose';
import { Notification } from '../models/Notification';
import { emitToUser } from '../realtime';

interface CreateNotificationInput {
  organization: string | Types.ObjectId;
  user: string | Types.ObjectId; // recipient
  actor?: string; // if the recipient is the actor, we skip (no self-notify)
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Persists a notification and pushes it to the recipient in real time. Skips
 * self-notifications (you don't get pinged for assigning something to yourself).
 */
export async function notify(input: CreateNotificationInput): Promise<void> {
  const recipient = String(input.user);
  if (input.actor && input.actor === recipient) return;
  try {
    const doc = await Notification.create({
      organization: input.organization,
      user: input.user,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    });
    emitToUser(recipient, 'notification:new', doc.toObject());
  } catch (err) {
    console.error('[notify] failed to create notification', err);
  }
}
