import { Document, Schema, Types, model } from 'mongoose';

export const PROJECT_STATUSES = ['active', 'on_hold', 'completed', 'archived'] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export interface ProjectDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  description?: string;
  status: ProjectStatus;
  members: Types.ObjectId[];
  dueDate?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const projectSchema = new Schema<ProjectDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: String,
    status: { type: String, enum: PROJECT_STATUSES, default: 'active' },
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    dueDate: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

projectSchema.index({ organization: 1, status: 1 });

export const Project = model<ProjectDocument>('Project', projectSchema);
