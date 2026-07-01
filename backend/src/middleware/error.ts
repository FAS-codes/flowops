import { NextFunction, Request, Response } from 'express';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';

export function notFound(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
}

/**
 * Centralized error handler. Known AppErrors surface their status/message;
 * everything else is logged and returned as an opaque 500 so we never leak
 * internals to clients.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Mongoose duplicate-key error → 409.
  if (typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000) {
    return res.status(409).json({ error: 'A record with that value already exists' });
  }

  console.error('[error] unhandled', err);
  return res.status(500).json({
    error: 'Internal server error',
    ...(env.isProd ? {} : { detail: err instanceof Error ? err.message : String(err) }),
  });
}
