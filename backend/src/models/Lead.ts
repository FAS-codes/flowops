import { Document, Schema, Types, model } from 'mongoose';

export interface LeadDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  title: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  dealValue: number;
  stage: string;
  // Order within a pipeline stage column (for drag-and-drop persistence).
  order: number;
  assignedTo?: Types.ObjectId;
  notes?: string;
  followUpAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const leadSchema = new Schema<LeadDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    contactName: String,
    contactEmail: { type: String, lowercase: true, trim: true },
    contactPhone: String,
    company: String,
    dealValue: { type: Number, default: 0, min: 0 },
    stage: { type: String, required: true },
    order: { type: Number, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: String,
    followUpAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

// Primary query pattern: fetch a board's leads by org, grouped/sorted by stage.
leadSchema.index({ organization: 1, stage: 1, order: 1 });
leadSchema.index({ organization: 1, assignedTo: 1 });

export const Lead = model<LeadDocument>('Lead', leadSchema);
