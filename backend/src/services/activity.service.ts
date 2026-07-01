import { Types } from 'mongoose';
import { Activity } from '../models/Activity';

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
    await Activity.create(input);
  } catch (err) {
    console.error('[activity] failed to record activity', err);
  }
}
