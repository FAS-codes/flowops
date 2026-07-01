export type Role = 'owner' | 'admin' | 'manager' | 'employee' | 'viewer';

export interface UserRef {
  _id: string;
  name: string;
  email: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  role: Role;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface Lead {
  _id: string;
  title: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  company?: string;
  dealValue: number;
  stage: string;
  order: number;
  assignedTo?: UserRef | null;
  notes?: string;
  followUpAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardColumn {
  stage: string;
  leads: Lead[];
}

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';

export interface Project {
  _id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  members: UserRef[];
  dueDate?: string;
  taskCount: number;
  doneCount: number;
  progress: number;
  createdAt: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Task {
  _id: string;
  project: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  order: number;
  assignedTo?: UserRef | null;
  dueDate?: string;
  createdAt: string;
}

export interface Member {
  id: string;
  role: Role;
  user: UserRef;
  joinedAt: string;
}

export interface Activity {
  _id: string;
  actor: UserRef;
  action: string;
  entityType: string;
  summary: string;
  createdAt: string;
}

export type TriggerEvent =
  | 'lead.created'
  | 'lead.stage_changed'
  | 'deal.won'
  | 'task.created'
  | 'task.completed';

export type ConditionOperator = 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains';
export type ActionType = 'create_task' | 'create_project' | 'notify' | 'send_email';

export interface AutomationCondition {
  field: string;
  operator: ConditionOperator;
  value: string;
}

export interface AutomationAction {
  type: ActionType;
  projectId?: string;
  title?: string;
  priority?: string;
  name?: string;
  target?: 'entity_owner' | 'entity_creator';
  body?: string;
  to?: string;
  subject?: string;
}

export interface Automation {
  _id: string;
  name: string;
  enabled: boolean;
  trigger: { event: TriggerEvent; stage?: string };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  runCount: number;
  lastRunAt?: string;
  createdAt: string;
}

export interface DashboardStats {
  leads: {
    total: number;
    won: number;
    lost: number;
    conversionRate: number;
    pipelineValue: number;
    byStage: { stage: string; count: number; value: number }[];
  };
  projects: {
    total: number;
    byStatus: { status: string; count: number }[];
  };
  tasks: { overdue: number };
  workload: { userId: string; name: string; openTasks: number }[];
}
