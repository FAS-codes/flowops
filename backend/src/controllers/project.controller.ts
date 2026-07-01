import { Request, Response } from 'express';
import { z } from 'zod';
import { Project, PROJECT_STATUSES } from '../models/Project';
import { Task } from '../models/Task';
import { AppError } from '../utils/AppError';
import { logActivity } from '../services/activity.service';
import { emitToOrg } from '../realtime';

export const createProjectSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(5000).optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  members: z.array(z.string()).optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export async function listProjects(req: Request, res: Response) {
  const filter: Record<string, unknown> = { organization: req.orgId };
  if (req.query.status) filter.status = req.query.status;

  const projects = await Project.find(filter)
    .populate('members', 'name email')
    .sort({ updatedAt: -1 })
    .lean();

  // Attach task progress per project in a single grouped query.
  const ids = projects.map((p) => p._id);
  const counts = await Task.aggregate([
    { $match: { project: { $in: ids } } },
    {
      $group: {
        _id: '$project',
        total: { $sum: 1 },
        done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
      },
    },
  ]);
  const byProject = new Map(counts.map((c) => [String(c._id), c]));

  res.json(
    projects.map((p) => {
      const c = byProject.get(String(p._id));
      const total = c?.total ?? 0;
      const done = c?.done ?? 0;
      return {
        ...p,
        taskCount: total,
        doneCount: done,
        progress: total ? Math.round((done / total) * 100) : 0,
      };
    })
  );
}

export async function createProject(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createProjectSchema>;
  const project = await Project.create({
    ...body,
    organization: req.orgId,
    createdBy: req.userId,
  });
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'project.created',
    entityType: 'Project',
    entityId: project._id,
    summary: `Created project "${project.name}"`,
  });
  emitToOrg(req.orgId!, 'project:changed', { id: project._id });
  res.status(201).json(project);
}

async function findProjectInOrg(req: Request) {
  const project = await Project.findOne({ _id: req.params.id, organization: req.orgId });
  if (!project) throw AppError.notFound('Project not found');
  return project;
}

export async function getProject(req: Request, res: Response) {
  const project = await Project.findOne({ _id: req.params.id, organization: req.orgId })
    .populate('members', 'name email')
    .lean();
  if (!project) throw AppError.notFound('Project not found');
  res.json(project);
}

export async function updateProject(req: Request, res: Response) {
  const project = await findProjectInOrg(req);
  Object.assign(project, req.body);
  await project.save();
  emitToOrg(req.orgId!, 'project:changed', { id: project._id });
  res.json(project);
}

export async function deleteProject(req: Request, res: Response) {
  const project = await findProjectInOrg(req);
  await Task.deleteMany({ project: project._id, organization: req.orgId });
  await project.deleteOne();
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'project.deleted',
    entityType: 'Project',
    entityId: project._id,
    summary: `Deleted project "${project.name}"`,
  });
  emitToOrg(req.orgId!, 'project:changed', { id: project._id });
  res.status(204).end();
}
