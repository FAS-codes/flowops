import { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Validates and coerces `req.body` against a Zod schema, replacing it with the
 * parsed result so handlers receive clean, typed input.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.') || 'body'}: ${i.message}`)
        .join('; ');
      return next(AppError.badRequest(message));
    }
    req.body = result.data;
    return next();
  };
}
