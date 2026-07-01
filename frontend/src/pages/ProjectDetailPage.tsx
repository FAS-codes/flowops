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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Plus } from 'lucide-react';
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';
import { ProjectStatusBadge, taskStatusLabel, TASK_STATUS_ORDER } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { AttachmentsPanel } from '../features/files/AttachmentsPanel';
import { useAuth } from '../context/AuthContext';
import { SortableTaskCard, TaskCardView } from '../features/tasks/TaskCard';
import { api, apiError } from '../lib/api';
import { can } from '../lib/permissions';
import { Member, Project, Task, TaskPriority, TaskStatus } from '../lib/types';

type Columns = Record<TaskStatus, Task[]>;

function AddTaskModal({
  open,
  onClose,
  projectId,
}: {
  open: boolean;
  onClose: () => void;
  projectId: string;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    priority: 'medium' as TaskPriority,
    assignedTo: '',
    dueDate: '',
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: async () => (await api.get<Member[]>('/organization/members')).data,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/tasks', {
          project: projectId,
          title: form.title,
          priority: form.priority,
          assignedTo: form.assignedTo || undefined,
          dueDate: form.dueDate || undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      toast.success('Task added');
      setForm({ title: '', priority: 'medium', assignedTo: '', dueDate: '' });
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add task"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!form.title || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Spinner /> : 'Add task'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            autoFocus
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Priority</label>
            <select
              className="input"
              value={form.priority}
              onChange={(e) =>
                setForm((f) => ({ ...f, priority: e.target.value as TaskPriority }))
              }
            >
              {(['low', 'medium', 'high', 'urgent'] as TaskPriority[]).map((p) => (
                <option key={p} value={p}>
                  {p[0].toUpperCase() + p.slice(1)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Due date</label>
            <input
              type="date"
              className="input"
              value={form.dueDate}
              onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">Assign to</label>
          <select
            className="input"
            value={form.assignedTo}
            onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
          >
            <option value="">Unassigned</option>
            {members?.map((m) => (
              <option key={m.user._id} value={m.user._id}>
                {m.user.name}
              </option>
            ))}
          </select>
        </div>
      </div>
    </Modal>
  );
}

function TaskColumn({ status, tasks }: { status: TaskStatus; tasks: Task[] }) {
  const { setNodeRef } = useSortable({ id: status, data: { type: 'column' } });
  return (
    <div className="flex w-72 shrink-0 flex-col">
      <div className="mb-3 flex items-center gap-2 px-1">
        <span className="text-sm font-semibold text-ink">{taskStatusLabel(status)}</span>
        <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-medium text-ink-muted">
          {tasks.length}
        </span>
      </div>
      <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy}>
        <div
          ref={setNodeRef}
          className="flex min-h-[8rem] flex-1 flex-col gap-2.5 rounded-2xl bg-canvas/70 p-2.5 ring-1 ring-inset ring-line/60"
        >
          {tasks.map((t) => (
            <SortableTaskCard key={t._id} task={t} />
          ))}
          {tasks.length === 0 && (
            <p className="px-2 py-8 text-center text-xs text-ink-subtle">No tasks</p>
          )}
        </div>
      </SortableContext>
    </div>
  );
}

export function ProjectDetailPage() {
  const { projectId = '' } = useParams();
  const qc = useQueryClient();
  const { role } = useAuth();
  const [columns, setColumns] = useState<Columns>({
    todo: [],
    in_progress: [],
    review: [],
    done: [],
  });
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [open, setOpen] = useState(false);

  const { data: project } = useQuery({
    queryKey: ['project', projectId],
    queryFn: async () => (await api.get<Project>(`/projects/${projectId}`)).data,
  });
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', projectId],
    queryFn: async () =>
      (await api.get<Task[]>('/tasks', { params: { project: projectId } })).data,
  });

  useEffect(() => {
    if (!tasks || activeTask) return;
    const next: Columns = { todo: [], in_progress: [], review: [], done: [] };
    for (const t of tasks) next[t.status].push(t);
    setColumns(next);
  }, [tasks, activeTask]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const findStatus = (id: string): TaskStatus | undefined => {
    if (TASK_STATUS_ORDER.includes(id as TaskStatus)) return id as TaskStatus;
    return TASK_STATUS_ORDER.find((s) => columns[s].some((t) => t._id === id));
  };

  function onDragStart(e: DragStartEvent) {
    const t = Object.values(columns)
      .flat()
      .find((x) => x._id === e.active.id);
    setActiveTask(t ?? null);
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const from = findStatus(active.id as string);
    const to = findStatus(over.id as string);
    if (!from || !to || from === to) return;
    setColumns((prev) => {
      const fromItems = [...prev[from]];
      const toItems = [...prev[to]];
      const moving = fromItems.find((t) => t._id === active.id);
      if (!moving) return prev;
      const overIndex = toItems.findIndex((t) => t._id === over.id);
      const insertAt = overIndex >= 0 ? overIndex : toItems.length;
      return {
        ...prev,
        [from]: fromItems.filter((t) => t._id !== active.id),
        [to]: [...toItems.slice(0, insertAt), moving, ...toItems.slice(insertAt)],
      };
    });
  }

  async function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    const moved = activeTask;
    setActiveTask(null);
    if (!over || !moved) return;
    const status = findStatus(over.id as string);
    if (!status) return;

    let finalIndex = 0;
    setColumns((prev) => {
      const items = [...prev[status]];
      const oldIndex = items.findIndex((t) => t._id === active.id);
      const overIndex = items.findIndex((t) => t._id === over.id);
      if (oldIndex >= 0 && overIndex >= 0 && oldIndex !== overIndex) {
        const [m] = items.splice(oldIndex, 1);
        items.splice(overIndex, 0, m);
      }
      finalIndex = Math.max(0, items.findIndex((t) => t._id === active.id));
      return { ...prev, [status]: items };
    });

    try {
      await api.patch(`/tasks/${moved._id}/move`, { status, order: finalIndex });
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
      qc.invalidateQueries({ queryKey: ['projects'] });
    } catch (err) {
      toast.error(apiError(err, 'Could not move task'));
      qc.invalidateQueries({ queryKey: ['tasks', projectId] });
    }
  }

  return (
    <div className="animate-fade-in">
      <Link
        to="/app/projects"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-muted hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" /> Projects
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            {project?.name ?? 'Project'}
          </h2>
          {project && <ProjectStatusBadge status={project.status} />}
        </div>
        {can(role, 'task:create') && (
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> Add task
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-brand-600">
          <Spinner className="h-6 w-6" />
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
            {TASK_STATUS_ORDER.map((status) => (
              <TaskColumn key={status} status={status} tasks={columns[status]} />
            ))}
          </div>
          <DragOverlay>
            {activeTask ? <TaskCardView task={activeTask} dragging /> : null}
          </DragOverlay>
        </DndContext>
      )}

      <div className="mt-6 max-w-2xl">
        <AttachmentsPanel entityType="Project" entityId={projectId} />
      </div>

      <AddTaskModal open={open} onClose={() => setOpen(false)} projectId={projectId} />
    </div>
  );
}
