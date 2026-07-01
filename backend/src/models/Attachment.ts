import { Document, Schema, Types, model } from 'mongoose';

/**
 * File metadata. The bytes live in the configured storage backend (local disk by
 * default; swappable for S3/Cloudinary in production) and `url` points at them.
 */
export interface AttachmentDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  entityType: 'Project' | 'Lead' | 'Task';
  entityId: Types.ObjectId;
  uploadedBy: Types.ObjectId;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
  url: string;
  createdAt: Date;
}

const attachmentSchema = new Schema<AttachmentDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    entityType: { type: String, enum: ['Project', 'Lead', 'Task'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },
    url: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

attachmentSchema.index({ organization: 1, entityType: 1, entityId: 1, createdAt: -1 });

export const Attachment = model<AttachmentDocument>('Attachment', attachmentSchema);
