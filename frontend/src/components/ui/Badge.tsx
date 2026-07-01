import clsx from 'clsx';
import { Role, TaskPriority, TaskStatus, ProjectStatus } from '../../lib/types';

const ROLE_STYLES: Record<Role, string> = {
  owner: 'bg-brand-100 text-brand-700',
  admin: 'bg-violet-100 text-violet-700',
  manager: 'bg-sky-100 text-sky-700',
  employee: 'bg-emerald-100 text-emerald-700',
  viewer: 'bg-canvas text-ink-muted',
};

export function RoleBadge({ role }: { role: Role }) {
  return <span className={clsx('chip capitalize', ROLE_STYLES[role])}>{role}</span>;
}

const PRIORITY_STYLES: Record<TaskPriority, string> = {
  low: 'bg-canvas text-ink-muted',
  medium: 'bg-sky-100 text-sky-700',
  high: 'bg-amber-100 text-amber-700',
  urgent: 'bg-red-100 text-red-700',
};

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  return (
    <span className={clsx('chip capitalize', PRIORITY_STYLES[priority])}>{priority}</span>
  );
}

const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'To do',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
};
export const TASK_STATUS_ORDER: TaskStatus[] = ['todo', 'in_progress', 'review', 'done'];
export function taskStatusLabel(status: TaskStatus) {
  return TASK_STATUS_LABELS[status];
}

const PROJECT_STATUS_STYLES: Record<ProjectStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  completed: 'bg-brand-100 text-brand-700',
  archived: 'bg-canvas text-ink-muted',
};
const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On hold',
  completed: 'Completed',
  archived: 'Archived',
};

export function ProjectStatusBadge({ status }: { status: ProjectStatus }) {
  return (
    <span className={clsx('chip', PROJECT_STATUS_STYLES[status])}>
      {PROJECT_STATUS_LABELS[status]}
    </span>
  );
}

// Colored dot for pipeline stages, cycling through a fixed palette by index.
const STAGE_DOTS = [
  'bg-slate-400',
  'bg-sky-400',
  'bg-violet-400',
  'bg-amber-400',
  'bg-orange-400',
  'bg-emerald-500',
  'bg-red-400',
];
export function StageDot({ index }: { index: number }) {
  return (
    <span className={clsx('h-2.5 w-2.5 rounded-full', STAGE_DOTS[index % STAGE_DOTS.length])} />
  );
}
