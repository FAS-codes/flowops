import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { verifyAccessToken } from '../utils/tokens';

/**
 * Authenticates the request from the `Authorization: Bearer <token>` header.
 * Only proves *who* the user is — organization scoping is handled separately by
 * requireTenant so that identity and tenancy stay decoupled.
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return next(AppError.unauthorized('Missing or malformed access token'));
  }
  const token = header.slice('Bearer '.length);
  try {
    const payload = verifyAccessToken(token);
    req.userId = payload.sub;
    return next();
  } catch {
    return next(AppError.unauthorized('Invalid or expired access token'));
  }
}
