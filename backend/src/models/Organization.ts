import { Document, Schema, Types, model } from 'mongoose';

export interface OrganizationDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  createdBy: Types.ObjectId;
  // Ordered pipeline stages used by the CRM board for this org.
  pipelineStages: string[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_PIPELINE_STAGES = [
  'New lead',
  'Contacted',
  'Qualified',
  'Proposal sent',
  'Negotiation',
  'Won',
  'Lost',
];

const organizationSchema = new Schema<OrganizationDocument>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    pipelineStages: { type: [String], default: DEFAULT_PIPELINE_STAGES },
  },
  { timestamps: true }
);

export const Organization = model<OrganizationDocument>('Organization', organizationSchema);
