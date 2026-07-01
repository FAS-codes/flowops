import { Types } from 'mongoose';
import {
  Automation,
  AutomationAction,
  AutomationCondition,
  TriggerEvent,
} from '../models/Automation';
import { Project } from '../models/Project';
import { Task } from '../models/Task';
import { emitToOrg } from '../realtime';
import { logActivity } from './activity.service';
import { sendGenericEmail } from './mailer';
import { notify } from './notification.service';

/** The entity shape the engine reasons about (lead or task, as a plain object). */
export type AutomationEntity = Record<string, unknown> & {
  _id?: unknown;
  assignedTo?: unknown;
  createdBy?: unknown;
};

// --- pure, unit-testable core ---------------------------------------------

/** Evaluate one condition against an entity field. Numeric-aware for </>. */
export function evaluateCondition(
  entity: AutomationEntity,
  { field, operator, value }: AutomationCondition
): boolean {
  const raw = entity[field];
  const actual = raw === undefined || raw === null ? '' : String(raw);

  switch (operator) {
    case 'eq':
      return actual === value;
    case 'ne':
      return actual !== value;
    case 'contains':
      return actual.toLowerCase().includes(value.toLowerCase());
    case 'gt':
    case 'gte':
    case 'lt':
    case 'lte': {
      const a = Number(actual);
      const b = Number(value);
      if (Number.isNaN(a) || Number.isNaN(b)) return false;
      if (operator === 'gt') return a > b;
      if (operator === 'gte') return a >= b;
      if (operator === 'lt') return a < b;
      return a <= b;
    }
    default:
      return false;
  }
}

/** All conditions must pass (logical AND). No conditions ⇒ always true. */
export function evaluateConditions(
  entity: AutomationEntity,
  conditions: AutomationCondition[]
): boolean {
  return conditions.every((c) => evaluateCondition(entity, c));
}

/** Replace `{{field}}` placeholders with entity values. */
export function renderTemplate(template: string, entity: AutomationEntity): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
    const v = entity[key];
    return v === undefined || v === null ? '' : String(v);
  });
}

// --- action execution ------------------------------------------------------

interface RunContext {
  orgId: string;
  actorId: string;
  entity: AutomationEntity;
}

async function executeAction(action: AutomationAction, ctx: RunContext): Promise<void> {
  const { orgId, actorId, entity } = ctx;

  switch (action.type) {
    case 'create_task': {
      if (!action.projectId || !action.title) return;
      const inOrg = await Project.exists({ _id: action.projectId, organization: orgId });
      if (!inOrg) return;
      const task = await Task.create({
        organization: orgId,
        project: action.projectId,
        title: renderTemplate(action.title, entity),
        priority: action.priority ?? 'medium',
        status: 'todo',
        order: 0,
        assignedTo: entity.assignedTo ?? undefined,
        createdBy: actorId,
      });
      emitToOrg(orgId, 'task:changed', { project: action.projectId });
      if (task.assignedTo) {
        void notify({
          organization: orgId,
          user: task.assignedTo,
          type: 'task.assigned',
          title: 'Automation created a task for you',
          body: task.title,
          link: `/app/projects/${action.projectId}`,
        });
      }
      return;
    }

    case 'create_project': {
      if (!action.name) return;
      const project = await Project.create({
        organization: orgId,
        name: renderTemplate(action.name, entity),
        status: 'active',
        createdBy: actorId,
      });
      emitToOrg(orgId, 'project:changed', { id: project._id });
      return;
    }

    case 'notify': {
      const recipient =
        action.target === 'entity_creator' ? entity.createdBy : entity.assignedTo;
      if (!recipient) return;
      await notify({
        organization: orgId,
        user: recipient as Types.ObjectId,
        type: 'automation',
        title: action.title ? renderTemplate(action.title, entity) : 'Automation',
        body: action.body ? renderTemplate(action.body, entity) : undefined,
      });
      return;
    }

    case 'send_email': {
      if (!action.to || !action.subject) return;
      const to = renderTemplate(action.to, entity);
      if (!to || !to.includes('@')) return; // skip if template resolved to nothing
      await sendGenericEmail({
        to,
        subject: renderTemplate(action.subject, entity),
        text: renderTemplate(action.body ?? '', entity),
      });
      return;
    }
  }
}

/**
 * Entry point called from controllers after a mutation. Finds enabled
 * automations for the org matching the event (and stage, for stage changes),
 * checks their conditions, and runs their actions. Fire-and-forget: failures
 * are logged but never break the originating request.
 */
export async function runAutomations(params: {
  orgId: string;
  event: TriggerEvent;
  actorId: string;
  entity: AutomationEntity;
  stage?: string; // for lead.stage_changed, the destination stage
}): Promise<void> {
  const { orgId, event, actorId, entity, stage } = params;
  try {
    const automations = await Automation.find({
      organization: orgId,
      enabled: true,
      'trigger.event': event,
    }).lean();

    for (const auto of automations) {
      // Stage-specific triggers only fire for their configured stage.
      if (event === 'lead.stage_changed' && auto.trigger.stage && auto.trigger.stage !== stage) {
        continue;
      }
      if (!evaluateConditions(entity, auto.conditions)) continue;

      for (const action of auto.actions) {
        try {
          await executeAction(action, { orgId, actorId, entity });
        } catch (err) {
          console.error(`[automation] action ${action.type} failed`, err);
        }
      }

      await Automation.updateOne(
        { _id: auto._id },
        { $inc: { runCount: 1 }, $set: { lastRunAt: new Date() } }
      );
      await logActivity({
        organization: orgId,
        actor: actorId,
        action: 'automation.ran',
        entityType: 'Automation',
        entityId: auto._id,
        summary: `Automation "${auto.name}" ran`,
      });
    }
  } catch (err) {
    console.error('[automation] runAutomations failed', err);
  }
}
