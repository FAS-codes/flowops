import { Document, Schema, Types, model } from 'mongoose';

/**
 * A workflow automation: "when <trigger> [and <conditions>] then <actions>".
 * Triggers, conditions and actions are stored as data and interpreted by the
 * automation engine (services/automation.service.ts) at runtime.
 */
export const TRIGGER_EVENTS = [
  'lead.created',
  'lead.stage_changed',
  'deal.won',
  'task.created',
  'task.completed',
] as const;
export type TriggerEvent = (typeof TRIGGER_EVENTS)[number];

export const CONDITION_OPERATORS = ['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains'] as const;
export type ConditionOperator = (typeof CONDITION_OPERATORS)[number];

export const ACTION_TYPES = ['create_task', 'create_project', 'notify', 'send_email'] as const;
export type ActionType = (typeof ACTION_TYPES)[number];

export interface AutomationCondition {
  field: string; // e.g. 'dealValue', 'stage', 'priority', 'company'
  operator: ConditionOperator;
  value: string;
}

export interface AutomationAction {
  type: ActionType;
  // create_task
  projectId?: string;
  title?: string;
  priority?: string;
  // create_project
  name?: string;
  // notify
  target?: 'entity_owner' | 'entity_creator';
  body?: string;
  // send_email
  to?: string; // literal email or a {{field}} template
  subject?: string;
}

export interface AutomationDocument extends Document {
  _id: Types.ObjectId;
  organization: Types.ObjectId;
  name: string;
  enabled: boolean;
  trigger: { event: TriggerEvent; stage?: string };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  createdBy: Types.ObjectId;
  runCount: number;
  lastRunAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const conditionSchema = new Schema<AutomationCondition>(
  {
    field: { type: String, required: true },
    operator: { type: String, enum: CONDITION_OPERATORS, required: true },
    value: { type: String, default: '' },
  },
  { _id: false }
);

const actionSchema = new Schema<AutomationAction>(
  {
    type: { type: String, enum: ACTION_TYPES, required: true },
    projectId: String,
    title: String,
    priority: String,
    name: String,
    target: { type: String, enum: ['entity_owner', 'entity_creator'] },
    body: String,
    to: String,
    subject: String,
  },
  { _id: false }
);

const automationSchema = new Schema<AutomationDocument>(
  {
    organization: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    enabled: { type: Boolean, default: true },
    trigger: {
      event: { type: String, enum: TRIGGER_EVENTS, required: true },
      stage: String, // only used by lead.stage_changed
    },
    conditions: { type: [conditionSchema], default: [] },
    actions: { type: [actionSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    runCount: { type: Number, default: 0 },
    lastRunAt: Date,
  },
  { timestamps: true }
);

// The engine looks up enabled automations by org + trigger event on every event.
automationSchema.index({ organization: 1, 'trigger.event': 1, enabled: 1 });

export const Automation = model<AutomationDocument>('Automation', automationSchema);
