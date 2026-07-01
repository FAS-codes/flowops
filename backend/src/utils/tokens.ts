import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { env } from '../config/env';

export interface AccessTokenPayload {
  sub: string; // user id
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // token id, so a specific refresh token can be rotated/revoked
}

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl,
  } as SignOptions);
}

export function signRefreshToken(userId: string, jti: string): string {
  return jwt.sign({ sub: userId, jti }, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl,
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as RefreshTokenPayload;
}

export function newTokenId(): string {
  return crypto.randomUUID();
}

/** SHA-256 hash used to store refresh tokens at rest (never store them raw). */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
