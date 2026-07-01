import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { Activity } from '../models/Activity';
import { Lead } from '../models/Lead';
import { Project } from '../models/Project';
import { Task } from '../models/Task';

/**
 * Aggregates the headline business metrics for the active org. Each figure is a
 * scoped aggregation so no cross-tenant data can leak into another org's board.
 */
export async function getStats(req: Request, res: Response) {
  const orgId = new Types.ObjectId(req.orgId);
  const now = new Date();

  const [
    leadsByStage,
    pipelineValue,
    projectsByStatus,
    overdueTasks,
    workload,
  ] = await Promise.all([
    Lead.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: '$stage', count: { $sum: 1 }, value: { $sum: '$dealValue' } } },
    ]),
    Lead.aggregate([
      { $match: { organization: orgId, stage: { $nin: ['Won', 'Lost'] } } },
      { $group: { _id: null, total: { $sum: '$dealValue' } } },
    ]),
    Project.aggregate([
      { $match: { organization: orgId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
    Task.countDocuments({
      organization: orgId,
      status: { $ne: 'done' },
      dueDate: { $lt: now },
    }),
    Task.aggregate([
      { $match: { organization: orgId, status: { $ne: 'done' }, assignedTo: { $ne: null } } },
      { $group: { _id: '$assignedTo', openTasks: { $sum: 1 } } },
      { $sort: { openTasks: -1 } },
      { $limit: 10 },
      {
        $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' },
      },
      { $unwind: '$user' },
      { $project: { _id: 0, userId: '$_id', name: '$user.name', openTasks: 1 } },
    ]),
  ]);

  const totalLeads = leadsByStage.reduce((sum, s) => sum + s.count, 0);
  const won = leadsByStage.find((s) => s._id === 'Won')?.count ?? 0;
  const lost = leadsByStage.find((s) => s._id === 'Lost')?.count ?? 0;
  const closed = won + lost;

  res.json({
    leads: {
      total: totalLeads,
      won,
      lost,
      conversionRate: closed ? Math.round((won / closed) * 100) : 0,
      pipelineValue: pipelineValue[0]?.total ?? 0,
      byStage: leadsByStage.map((s) => ({ stage: s._id, count: s.count, value: s.value })),
    },
    projects: {
      total: projectsByStatus.reduce((sum, s) => sum + s.count, 0),
      byStatus: projectsByStatus.map((s) => ({ status: s._id, count: s.count })),
    },
    tasks: { overdue: overdueTasks },
    workload,
  });
}

/** Recent activity feed for the org (also the seed of the V2 audit log view). */
export async function getActivity(req: Request, res: Response) {
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '30'), 10)));
  const activities = await Activity.find({ organization: req.orgId })
    .populate('actor', 'name email')
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();
  res.json(activities);
}
