import { Document, Schema, Types, model } from 'mongoose';

export interface NotificationDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  user: Types.ObjectId; // recipient
  type: string; // e.g. 'lead.assigned', 'task.assigned'
  title: string;
  body?: string;
  link?: string; // in-app route to open
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<NotificationDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    body: String,
    link: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Recipient's inbox, newest first, with fast unread lookups.
notificationSchema.index({ organization: 1, user: 1, read: 1, createdAt: -1 });

export const Notification = model<NotificationDocument>('Notification', notificationSchema);
