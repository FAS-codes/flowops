import { Document, Schema, Types, model } from 'mongoose';
import { ROLES, Role } from '../utils/rbac';

export interface OrganizationMemberDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  user: Types.ObjectId;
  role: Role;
  createdAt: Date;
  updatedAt: Date;
}

const organizationMemberSchema = new Schema<OrganizationMemberDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ROLES, required: true, default: 'employee' },
  },
  { timestamps: true }
);

// A user can belong to an organization exactly once.
organizationMemberSchema.index({ organization: 1, user: 1 }, { unique: true });

export const OrganizationMember = model<OrganizationMemberDocument>(
  'OrganizationMember',
  organizationMemberSchema
);
