import { NextFunction, Request, Response } from 'express';
import { AppError } from '../utils/AppError';
import { Permission, roleHasPermission } from '../utils/rbac';

/**
 * Guards a route by permission. Must run after requireTenant, which sets
 * `req.role` from the user's verified membership. Enforcement lives here on the
 * backend — the frontend hiding a button is never the security boundary.
 */
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.role) {
      return next(AppError.forbidden('No role in active organization'));
    }
    const allowed = permissions.every((p) => roleHasPermission(req.role!, p));
    if (!allowed) {
      return next(
        AppError.forbidden('You do not have permission to perform this action')
      );
    }
    return next();
  };
}
