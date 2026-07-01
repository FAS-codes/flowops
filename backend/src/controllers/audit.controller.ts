import { Request, Response } from 'express';
import { Activity } from '../models/Activity';

/**
 * Paginated, filterable audit trail for the org. Reads the same Activity log the
 * dashboard feed uses, but exposes filters + before/after metadata and is gated
 * behind the `audit:read` permission (manager and above).
 */
export async function listAudit(req: Request, res: Response) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10)));

  const filter: Record<string, unknown> = { organization: req.orgId };
  if (req.query.action) filter.action = req.query.action;
  if (req.query.entityType) filter.entityType = req.query.entityType;
  if (req.query.actor) filter.actor = req.query.actor;
  if (req.query.from || req.query.to) {
    const range: Record<string, Date> = {};
    if (req.query.from) range.$gte = new Date(String(req.query.from));
    if (req.query.to) range.$lte = new Date(String(req.query.to));
    filter.createdAt = range;
  }

  const [items, total, actions] = await Promise.all([
    Activity.find(filter)
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Activity.countDocuments(filter),
    // Distinct action types in this org, to populate the filter dropdown.
    Activity.distinct('action', { organization: req.orgId }),
  ]);

  res.json({
    items,
    total,
    page,
    pages: Math.ceil(total / limit),
    actions: (actions as string[]).sort(),
  });
}
