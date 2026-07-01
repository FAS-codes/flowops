import { Document, Schema, Types, model } from 'mongoose';

/**
 * Lightweight activity/audit trail. Every meaningful mutation records who did
 * what to which entity, scoped to an organization. The dashboard's "recent
 * activity" feed and the (V2) audit log both read from here.
 */
export interface ActivityDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  actor: Types.ObjectId;
  action: string; // e.g. 'lead.created', 'task.status_changed'
  entityType: string; // e.g. 'Lead', 'Task', 'Project'
  entityId?: Types.ObjectId;
  summary: string; // human-readable one-liner
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const activitySchema = new Schema<ActivityDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    actor: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId },
    summary: { type: String, required: true },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

activitySchema.index({ organization: 1, createdAt: -1 });

export const Activity = model<ActivityDocument>('Activity', activitySchema);
