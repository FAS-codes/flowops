import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { KanbanSquare, Plus } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { StageDot } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import { LeadCardView, SortableLeadCard } from '../features/crm/LeadCard';
import { LeadFormModal } from '../features/crm/LeadFormModal';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { compactCurrency } from '../lib/format';
import { can } from '../lib/permissions';
import { BoardColumn, Lead } from '../lib/types';

type Columns = Record<string, Lead[]>;

/** A droppable, scrollable stage column that hosts sortable lead cards. */
function Column({
  stage,
  index,
  leads,
  onCardClick,
}: {
  stage: string;
  index: number;
  leads: Lead[];
  onCardClick: (lead: Lead) => void;
}) {
  // Keep the column itself droppable even when empty.
  const { setNodeRef } = useSortable({ id: stage, data: { type: 'column' } });
  const total = leads.reduce((sum, l) => sum + l.dealValue, 0);

  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <StageDot index={index} />
          <span className="text-sm font-semibold text-ink">{stage}</span>
          <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
            {leads.length}
          </span>
        </div>
        <span className="text-xs font-medium text-ink-subtle">
          {compactCurrency(total)}
        </span>
      </div>

      <SortableContext items={leads.map((l) => l._id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-[8rem] flex-1 flex-col gap-2.5 rounded-2xl bg-canvas/70 p-2.5 ring-1 ring-inset ring-line/60"
        >
          {leads.map((lead) => (
            <SortableLeadCard key={lead._id} lead={lead} onClick={() => onCardClick(lead)} />
          ))}
          {leads.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-ink-subtle">Drop leads here</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function CrmBoardPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [columns, setColumns] = useState<Columns>({});
  const [stages, setStages] = useState<string[]>([]);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['crm-board'],
    queryFn: async () =>
      (await api.get<{ stages: string[]; columns: BoardColumn[] }>('/leads/board')).data,
  });

  // Sync server state into local drag state (but not mid-drag).
  useEffect(() => {
    if (!data || activeLead) return;
    setStages(data.stages);
    const next: Columns = {};
    for (const col of data.columns) next[col.stage] = col.leads;
    setColumns(next);
  }, [data, activeLead]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findStage = (id: string): string | undefined => {
    if (id in columns) return id;
    return stages.find((s) => columns[s]?.some((l) => l._id === id));
  };

  const totalValue = useMemo(
    () =>
      Object.values(columns)
        .flat()
        .reduce((sum, l) => sum + l.dealValue, 0),
    [columns]
  );

  function onDragStart(e: DragStartEvent) {
    const lead = Object.values(columns)
      .flat()
      .find((l) => l._id === e.active.id);
    setActiveLead(lead ?? null);
  }

  // Move a card across columns live while dragging.
  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findStage(active.id as string);
    const to = findStage(over.id as string);
    if (!from || !to || from === to) return;

    setColumns((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const moving = fromItems.find((l) => l._id === active.id);
      if (!moving) return prev;
      const overIndex = toItems.findIndex((l) => l._id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter((l) => l._id !== active.id),
        [to]: [...toItems.slice(0, insertAt), moving, ...toItems.slice(insertAt)],
      };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const moved = activeLead;
    setActiveLead(null);
    if (!over || !moved) return;

    const stage = findStage(over.id as string);
    if (!stage) return;

    // Reorder within the destination column and read the final index.
    let finalIndex = 0;
    setColumns((prev) => {
      const items = [...prev[stage]];
      const oldIndex = items.findIndex((l) => l._id === active.id);
      const overIndex = items.findIndex((l) => l._id === over.id);
      if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
        const [m] = items.splice(oldIndex, 1);
        items.splice(overIndex, 0, m);
      }
      finalIndex = Math.max(0, items.findIndex((l) => l._id === active.id));
      return { ...prev, [stage]: items };
    });

    try {
      await api.patch(`/leads/${moved._id}/move`, { stage, order: finalIndex });
      qc.invalidateQueries({ queryKey: ['crm-board'] });
      qc.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    } catch (err) {
      toast.error(apiError(err, 'Could not move lead'));
      qc.invalidateQueries({ queryKey: ['crm-board'] });
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center text-brand-600">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">Sales Pipeline</h2>
            <p className="text-sm text-ink-muted">
              Drag leads between stages · {compactCurrency(totalValue)} in play
            </p>
          </div>
        </div>
        {can(role, 'lead:create') && (
          <button className="btn-primary" onClick={() => setModalOpen(true)}>
            <Plus className="h-4 w-4" /> Add lead
          </button>
        )}
      </div>

      {stages.length === 0 ? (
        <div className="flex h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-line text-ink-muted">
          <KanbanSquare className="mb-2 h-6 w-6" />
          No pipeline stages configured.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={onDragStart}
          onDragOver={onDragOver}
          onDragEnd={onDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-4">
            {stages.map((stage, i) => (
              <Column
                key={stage}
                stage={stage}
                index={i}
                leads={columns[stage] ?? []}
                onCardClick={() => undefined}
              />
            ))}
          </div>
          <DragOverlay>
            {activeLead ? <LeadCardView lead={activeLead} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <LeadFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        stages={stages}
      />
    </div>
  );
}
