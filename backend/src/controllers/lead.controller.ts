import { Request, Response } from 'express';
import { z } from 'zod';
import { Lead } from '../models/Lead';
import { Organization } from '../models/Organization';
import { AppError } from '../utils/AppError';
import { logActivity } from '../services/activity.service';
import { notify } from '../services/notification.service';
import { emitToOrg } from '../realtime';

export const createLeadSchema = z.object({
  title: z.string().min(1).max(160),
  contactName: z.string().max(120).optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  contactPhone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  dealValue: z.number().min(0).optional(),
  stage: z.string().optional(),
  assignedTo: z.string().optional(),
  notes: z.string().max(5000).optional(),
  followUpAt: z.coerce.date().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const moveLeadSchema = z.object({
  stage: z.string().min(1),
  order: z.number().int().min(0),
});

async function firstStage(orgId: string): Promise<string> {
  const org = await Organization.findById(orgId).lean();
  return org?.pipelineStages?.[0] ?? 'New lead';
}

/** Returns leads grouped by pipeline stage — the shape the Kanban board wants. */
export async function getBoard(req: Request, res: Response) {
  const org = await Organization.findById(req.orgId).lean();
  const stages = org?.pipelineStages ?? [];

  const leads = await Lead.find({ organization: req.orgId })
    .populate('assignedTo', 'name email')
    .sort({ stage: 1, order: 1 })
    .lean();

  const columns = stages.map((stage) => ({
    stage,
    leads: leads.filter((l) => l.stage === stage),
  }));

  res.json({ stages, columns });
}

export async function listLeads(req: Request, res: Response) {
  const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10));
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? '25'), 10)));
  const filter: Record<string, unknown> = { organization: req.orgId };
  if (req.query.stage) filter.stage = req.query.stage;
  if (req.query.assignedTo) filter.assignedTo = req.query.assignedTo;

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .populate('assignedTo', 'name email')
      .sort({ updatedAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Lead.countDocuments(filter),
  ]);

  res.json({ items, total, page, pages: Math.ceil(total / limit) });
}

export async function createLead(req: Request, res: Response) {
  const body = req.body as z.infer<typeof createLeadSchema>;
  const stage = body.stage || (await firstStage(req.orgId!));

  // Place new lead at the end of its stage column.
  const last = await Lead.findOne({ organization: req.orgId, stage })
    .sort({ order: -1 })
    .lean();

  const lead = await Lead.create({
    ...body,
    contactEmail: body.contactEmail || undefined,
    stage,
    order: (last?.order ?? -1) + 1,
    organization: req.orgId,
    createdBy: req.userId,
  });

  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'lead.created',
    entityType: 'Lead',
    entityId: lead._id,
    summary: `Created lead "${lead.title}"`,
  });

  emitToOrg(req.orgId!, 'lead:changed', { id: lead._id });
  if (lead.assignedTo) {
    void notify({
      organization: req.orgId!,
      user: lead.assignedTo,
      actor: req.userId,
      type: 'lead.assigned',
      title: 'New lead assigned to you',
      body: lead.title,
      link: '/app/crm',
    });
  }

  res.status(201).json(lead);
}

async function findLeadInOrg(req: Request) {
  const lead = await Lead.findOne({ _id: req.params.id, organization: req.orgId });
  if (!lead) throw AppError.notFound('Lead not found');
  return lead;
}

export async function getLead(req: Request, res: Response) {
  const lead = await Lead.findOne({ _id: req.params.id, organization: req.orgId })
    .populate('assignedTo', 'name email')
    .lean();
  if (!lead) throw AppError.notFound('Lead not found');
  res.json(lead);
}

export async function updateLead(req: Request, res: Response) {
  const lead = await findLeadInOrg(req);
  const body = req.body as z.infer<typeof updateLeadSchema>;
  const previousAssignee = lead.assignedTo?.toString();
  Object.assign(lead, body);
  if (body.contactEmail === '') lead.contactEmail = undefined;
  await lead.save();

  emitToOrg(req.orgId!, 'lead:changed', { id: lead._id });
  // Notify only when the assignee actually changes to someone new.
  if (lead.assignedTo && lead.assignedTo.toString() !== previousAssignee) {
    void notify({
      organization: req.orgId!,
      user: lead.assignedTo,
      actor: req.userId,
      type: 'lead.assigned',
      title: 'A lead was assigned to you',
      body: lead.title,
      link: '/app/crm',
    });
  }
  res.json(lead);
}

/** Move a lead to a new stage/position — persists drag-and-drop reordering. */
export async function moveLead(req: Request, res: Response) {
  const lead = await findLeadInOrg(req);
  const { stage, order } = req.body as z.infer<typeof moveLeadSchema>;

  const org = await Organization.findById(req.orgId).lean();
  if (!org?.pipelineStages.includes(stage)) {
    throw AppError.badRequest('Unknown pipeline stage');
  }

  const previousStage = lead.stage;
  lead.stage = stage;
  lead.order = order;
  await lead.save();

  if (previousStage !== stage) {
    await logActivity({
      organization: req.orgId!,
      actor: req.userId!,
      action: 'lead.stage_changed',
      entityType: 'Lead',
      entityId: lead._id,
      summary: `Moved "${lead.title}" from ${previousStage} to ${stage}`,
      metadata: { before: previousStage, after: stage },
    });
  }

  emitToOrg(req.orgId!, 'lead:changed', { id: lead._id });
  res.json(lead);
}

export async function deleteLead(req: Request, res: Response) {
  const lead = await findLeadInOrg(req);
  await lead.deleteOne();
  await logActivity({
    organization: req.orgId!,
    actor: req.userId!,
    action: 'lead.deleted',
    entityType: 'Lead',
    entityId: lead._id,
    summary: `Deleted lead "${lead.title}"`,
  });
  emitToOrg(req.orgId!, 'lead:changed', { id: lead._id });
  res.status(204).end();
}
