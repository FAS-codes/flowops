import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { CalendarClock } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { PriorityBadge } from '../../components/ui/Badge';
import { formatDate, isOverdue } from '../../lib/format';
import { Task } from '../../lib/types';

export function TaskCardView({ task, dragging }: { task: Task; dragging?: boolean }) {
  const overdue = task.status !== 'done' && isOverdue(task.dueDate);
  return (
    <div
      className={clsx(
        'rounded-xl border border-line bg-surface p-3.5 shadow-card transition-all',
        dragging ? 'rotate-2 shadow-pop' : 'hover:border-brand-200 hover:shadow-soft'
      )}
    >
      <p className="text-sm font-medium leading-snug text-ink">{task.title}</p>
      <div className="mt-3 flex items-center justify-between">
        <PriorityBadge priority={task.priority} />
        {task.assignedTo && <Avatar name={task.assignedTo.name} size="xs" />}
      </div>
      {task.dueDate && (
        <p
          className={clsx(
            'mt-2.5 inline-flex items-center gap-1.5 text-xs',
            overdue ? 'text-red-500' : 'text-ink-subtle'
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(task.dueDate)}
        </p>
      )}
    </div>
  );
}

export function SortableTaskCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: task._id });
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <TaskCardView task={task} />
    </div>
  );
}
