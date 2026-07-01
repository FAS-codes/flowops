import { Request, Response } from 'express';
import { z } from 'zod';
import {
  ACTION_TYPES,
  Automation,
  CONDITION_OPERATORS,
  TRIGGER_EVENTS,
} from '../models/Automation';
import { AppError } from '../utils/AppError';
import { logActivity } from '../services/activity.service';

const conditionSchema = z.object({
  field: z.string().min(1),
  operator: z.enum(CONDITION_OPERATORS),
  value: z.string().default(''),
});

const actionSchema = z.object({
  type: z.enum(ACTION_TYPES),
  projectId: z.string().optional(),
  title: z.string().optional(),
  priority: z.string().optional(),
  name: z.string().optional(),
  target: z.enum(['entity_owner', 'entity_creator']).optional(),
  body: z.string().optional(),
  to: z.string().optional(),
  subject: z.string().optional(),
});

export const automationSchema = z.object({
  name: z.string().min(1).max(120),
  enabled: z.boolean().default(true),
  trigger: z.object({
    event: z.enum(TRIGGER_EVENTS),
    stage: z.string().optional(),
  }),
  conditions: z.array(conditionSchema).default([]),
  actions: z.array(actionSchema).min(1, 'Add at least one action'),
});

export const updateAutomationSchema = automationSchema.partial();

/** Static metadata that powers the builder UI (dropdown options). */
export async function getMeta(_req: Request, res: Response) {
  res.json({
    triggers: TRIGGER_EVENTS,
    operators: CONDITION_OPERATORS,
    actions: ACTION_TYPES,
  });
}

export async function listAutomations(req: Request, res: Response) {
  const automations = await Automation.find({ organization: req.orgId })
    .sort({ updatedAt: -1 })
    .lean();
  res.json(automations);
}

export async function createAutomation(req: Request, res: Response) {
  const body = req.body as z.infer<typeof automationSchema>;
  const automation = await Automation.create({
    ...body,
    organization: req.orgId,
    createdBy: req.userId,
  });
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'automation.created',
    entityType: 'Automation',
    entityId: automation._id,
    summary: `Created automation "${automation.name}"`,
  });
  res.status(201).json(automation);
}

async function findInOrg(req: Request) {
  const automation = await Automation.findOne({
    _id: req.params.id,
    organization: req.orgId,
  });
  if (!automation) throw AppError.notFound('Automation not found');
  return automation;
}

export async function updateAutomation(req: Request, res: Response) {
  const automation = await findInOrg(req);
  Object.assign(automation, req.body);
  await automation.save();
  res.json(automation);
}

export async function deleteAutomation(req: Request, res: Response) {
  const automation = await findInOrg(req);
  await automation.deleteOne();
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'automation.deleted',
    entityType: 'Automation',
    entityId: automation._id,
    summary: `Deleted automation "${automation.name}"`,
  });
  res.status(204).end();
}
