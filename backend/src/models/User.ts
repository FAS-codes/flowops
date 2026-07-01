import bcrypt from 'bcryptjs';
import { Document, Schema, Types, model } from 'mongoose';

export interface RefreshTokenEntry {
  jti: string;
  tokenHash: string;
  userAgent?: string;
  ip?: string;
  createdAt: Date;
  expiresAt: Date;
}

export type AuthProvider = 'local' | 'google';

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  name: string;
  email: string;
  // Optional: Google (OAuth) accounts have no local password.
  passwordHash?: string;
  authProvider: AuthProvider;
  googleId?: string;
  avatarUrl?: string;
  defaultOrganization?: Types.ObjectId;
  refreshTokens: RefreshTokenEntry[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const refreshTokenSchema = new Schema<RefreshTokenEntry>(
  {
    jti: { type: String, required: true },
    tokenHash: { type: String, required: true },
    userAgent: String,
    ip: String,
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true },
  },
  { _id: false }
);

const userSchema = new Schema<UserDocument>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    passwordHash: { type: String, select: false },
    authProvider: { type: String, enum: ['local', 'google'], default: 'local' },
    googleId: { type: String, index: { unique: true, sparse: true } },
    avatarUrl: String,
    defaultOrganization: { type: Schema.Types.ObjectId, ref: 'Organization' },
    refreshTokens: { type: [refreshTokenSchema], default: [], select: false },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = function (candidate: string) {
  if (!this.passwordHash) return Promise.resolve(false);
  return bcrypt.compare(candidate, this.passwordHash);
};

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export const User = model<UserDocument>('User', userSchema);
