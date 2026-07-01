import crypto from 'crypto';
import { Document, Schema, Types, model } from 'mongoose';
import { ROLES, Role } from '../utils/rbac';

export interface InvitationDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  email: string;
  role: Role;
  token: string;
  invitedBy: Types.ObjectId;
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<InvitationDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: { type: String, enum: ROLES, default: 'employee' },
    token: { type: String, required: true, unique: true, index: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked'],
      default: 'pending',
    },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export function newInvitationToken(): string {
  return crypto.randomBytes(24).toString('hex');
}

export const Invitation = model<InvitationDocument>('Invitation', invitationSchema);
