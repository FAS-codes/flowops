import { Types } from 'mongoose';
import { Activity } from '../models/Activity';
import { emitToOrg } from '../realtime';

interface LogActivityInput {
  organization: string | Types.ObjectId;
  actor: string | Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string | Types.ObjectId;
  summary: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget activity logging. We intentionally do not await this in
 * request handlers' critical path failures — a logging error must never break
 * the underlying business operation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const doc = await Activity.create(input);
    // Push to the org so dashboards/activity feeds update live.
    emitToOrg(String(input.organization), 'activity:new', {
      _id: doc._id,
      action: doc.action,
      entityType: doc.entityType,
      summary: doc.summary,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('[activity] failed to record activity', err);
  }
}
