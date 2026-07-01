import { NextFunction, Request, Response } from 'express';
import { OrganizationMember } from '../models/OrganizationMember';
import { AppError } from '../utils/AppError';

/**
 * Establishes the active organization for the request.
 *
 * The client names which org it wants via the `X-Organization-Id` header, but
 * that claim is never trusted on its own: we look up an OrganizationMember row
 * proving this authenticated user actually belongs to that org, and derive both
 * `req.orgId` and `req.role` from that row. If no membership exists the request
 * is rejected — this is what prevents one tenant from touching another's data.
 *
 * Every downstream query must filter by `req.orgId`.
 */
export async function requireTenant(req: Request, _res: Response, next: NextFunction) {
  if (!req.userId) {
    return next(AppError.unauthorized());
  }

  const orgId = req.header('X-Organization-Id');
  if (!orgId) {
    return next(AppError.badRequest('Missing X-Organization-Id header'));
  }

  const membership = await OrganizationMember.findOne({
    organization: orgId,
    user: req.userId,
  }).lean();

  if (!membership) {
    // 404 (not 403) so we don't confirm the org exists to a non-member.
    return next(AppError.notFound('Organization not found'));
  }

  req.orgId = orgId;
  req.role = membership.role;
  return next();
}
