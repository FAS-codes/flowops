import { Request, Response } from 'express';
import { z } from 'zod';
import { Project } from '../models/Project';
import { Task, TASK_PRIORITIES, TASK_STATUSES } from '../models/Task';
import { AppError } from '../utils/AppError';
import { logActivity } from '../services/activity.service';
import { notify } from '../services/notification.service';
import { emitToOrg } from '../realtime';

export const createTaskSchema = z.object({
  project: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional(),
  status: z.enum(TASK_STATUSES).optional(),
  priority: z.enum(TASK_PRIORITIES).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.coerce.date().optional(),
});

export const updateTaskSchema = createTaskSchema.partial().omit({ project: true });

export const moveTaskSchema = z.object({
  status: z.enum(TASK_STATUSES),
  order: z.number().int().min(0),
});

/** Ensure a referenced project belongs to the active org before linking tasks. */
async function assertProjectInOrg(orgId: string, projectId: string) {
  const exists = await Project.exists({ _id: projectId, organization: orgId });
  if (!exists) throw AppError.badRequest('Project does not belong to this organization');
}

export async function listTasks(req: Request, res: Response) {
  const filter: Record<string, unknown> = { organization: req.orgId };
  if (req.query.project) filter.project = req.query.project;
  if (req.query.status) filter.status = req.query.status;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const tasks = await Task.find(filter)
    .populate('assignedTo', 'name email')
    .sort({ status: 1, order: 1 })
    .lean();
  res.json(tasks);
}

export async function createTask(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createTaskSchema>;
  await assertProjectInOrg(req.orgId!, body.project);

  const status = body.status ?? 'todo';
  const last = await Task.findOne({ organization: req.orgId, project: body.project, status })
    .sort({ order: -1 })
    .lean();

  const task = await Task.create({
    ...body,
    status,
    order: (last?.order ?? -1) + 1,
    organization: req.orgId,
    createdBy: req.userId,
  });

  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'task.created',
    entityType: 'Task',
    entityId: task._id,
    summary: `Created task "${task.title}"`,
  });

  emitToOrg(req.orgId!, 'task:changed', { project: task.project });
  if (task.assignedTo) {
    void notify({
      organization: req.orgId!,
      user: task.assignedTo,
      actor: req.userId,
      type: 'task.assigned',
      title: 'New task assigned to you',
      body: task.title,
      link: `/app/projects/${task.project}`,
    });
  }

  res.status(201).json(task);
}

async function findTaskInOrg(req: Request) {
  const task = await Task.findOne({ _id: req.params.id, organization: req.orgId });
  if (!task) throw AppError.notFound('Task not found');
  return task;
}

export async function updateTask(req: Request, res: Response) {
  const task = await findTaskInOrg(req);
  const previousAssignee = task.assignedTo?.toString();
  Object.assign(task, req.body);
  await task.save();

  emitToOrg(req.orgId!, 'task:changed', { project: task.project });
  if (task.assignedTo && task.assignedTo.toString() !== previousAssignee) {
    void notify({
      organization: req.orgId!,
      user: task.assignedTo,
      actor: req.userId,
      type: 'task.assigned',
      title: 'A task was assigned to you',
      body: task.title,
      link: `/app/projects/${task.project}`,
    });
  }
  res.json(task);
}

export async function moveTask(req: Request, res: Response) {
  const task = await findTaskInOrg(req);
  const { status, order } = req.body as z.infer<typeof moveTaskSchema>;
  const previous = task.status;
  task.status = status;
  task.order = order;
  await task.save();

  if (previous !== status) {
    await logActivity({
      organization: req.orgId!,
      actor: req.userId!,
      action: 'task.status_changed',
      entityType: 'Task',
      entityId: task._id,
      summary: `Moved task "${task.title}" from ${previous} to ${status}`,
      metadata: { before: previous, after: status },
    });
  }
  emitToOrg(req.orgId!, 'task:changed', { project: task.project });
  res.json(task);
}

export async function deleteTask(req: Request, res: Response) {
  const task = await findTaskInOrg(req);
  await task.deleteOne();
  emitToOrg(req.orgId!, 'task:changed', { project: task.project });
  res.status(204).end();
}
