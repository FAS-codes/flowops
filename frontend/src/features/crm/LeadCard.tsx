import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import clsx from 'clsx';
import { Building2, CalendarClock } from 'lucide-react';
import { Avatar } from '../../components/ui/Avatar';
import { currency, formatDate, isOverdue } from '../../lib/format';
import { Lead } from '../../lib/types';

export function LeadCardView({
  lead,
  dragging,
  onClick,
}: {
  lead: Lead;
  dragging?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'group cursor-pointer rounded-xl border border-line bg-surface p-3.5 shadow-card transition-all',
        dragging ? 'rotate-2 shadow-pop' : 'hover:border-brand-200 hover:shadow-soft'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug text-ink">{lead.title}</p>
      </div>

      {lead.company && (
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs text-ink-muted">
          <Building2 className="h-3.5 w-3.5" />
          {lead.company}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="chip bg-emerald-50 text-emerald-700">
          {currency(lead.dealValue)}
        </span>
        {lead.assignedTo ? (
          <Avatar name={lead.assignedTo.name} size="xs" />
        ) : (
          <span className="h-6 w-6 rounded-full border border-dashed border-line" />
        )}
      </div>

      {lead.followUpAt && (
        <p
          className={clsx(
            'mt-2.5 inline-flex items-center gap-1.5 text-xs',
            isOverdue(lead.followUpAt) ? 'text-red-500' : 'text-ink-subtle'
          )}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          {formatDate(lead.followUpAt)}
        </p>
      )}
    </div>
  );
}

export function SortableLeadCard({ lead, onClick }: { lead: Lead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead._id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={clsx(isDragging && 'opacity-40')}
      {...attributes}
      {...listeners}
    >
      <LeadCardView lead={lead} onClick={onClick} />
    </div>
  );
}
