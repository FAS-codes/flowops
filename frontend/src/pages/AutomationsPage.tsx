import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Workflow, Zap } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { relativeTime } from '../lib/format';
import { can } from '../lib/permissions';
import {
  ActionType,
  Automation,
  AutomationAction,
  AutomationCondition,
  ConditionOperator,
  Project,
  TriggerEvent,
} from '../lib/types';

const TRIGGER_LABELS: Record<TriggerEvent, string> = {
  'lead.created': 'When a lead is created',
  'lead.stage_changed': 'When a lead moves to a stage',
  'deal.won': 'When a deal is won',
  'task.created': 'When a task is created',
  'task.completed': 'When a task is completed',
};

const ACTION_LABELS: Record<ActionType, string> = {
  create_task: 'Create a task',
  create_project: 'Create a project',
  notify: 'Send a notification',
  send_email: 'Send an email',
};

const OPERATOR_LABELS: Record<ConditionOperator, string> = {
  eq: 'equals',
  ne: 'is not',
  gt: 'greater than',
  gte: '≥',
  lt: 'less than',
  lte: '≤',
  contains: 'contains',
};

const PIPELINE_STAGES = [
  'New lead',
  'Contacted',
  'Qualified',
  'Proposal sent',
  'Negotiation',
  'Won',
  'Lost',
];

interface FormState {
  name: string;
  enabled: boolean;
  trigger: { event: TriggerEvent; stage?: string };
  conditions: AutomationCondition[];
  actions: AutomationAction[];
}

const EMPTY_FORM: FormState = {
  name: '',
  enabled: true,
  trigger: { event: 'lead.stage_changed', stage: 'Qualified' },
  conditions: [],
  actions: [{ type: 'notify', target: 'entity_owner', title: '' }],
};

function ActionFields({
  action,
  projects,
  onChange,
}: {
  action: AutomationAction;
  projects: Project[];
  onChange: (patch: Partial<AutomationAction>) => void;
}) {
  switch (action.type) {
    case 'create_task':
      return (
        <div className="space-y-2">
          <select
            className="input py-1.5 text-sm"
            value={action.projectId ?? ''}
            onChange={(e) => onChange({ projectId: e.target.value })}
          >
            <option value="">Select project…</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          <input
            className="input py-1.5 text-sm"
            placeholder="Task title (use {{title}}, {{company}}…)"
            value={action.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <select
            className="input py-1.5 text-sm"
            value={action.priority ?? 'medium'}
            onChange={(e) => onChange({ priority: e.target.value })}
          >
            {['low', 'medium', 'high', 'urgent'].map((p) => (
              <option key={p} value={p}>
                {p[0].toUpperCase() + p.slice(1)} priority
              </option>
            ))}
          </select>
        </div>
      );
    case 'create_project':
      return (
        <input
          className="input py-1.5 text-sm"
          placeholder="Project name (e.g. {{company}} onboarding)"
          value={action.name ?? ''}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      );
    case 'notify':
      return (
        <div className="space-y-2">
          <select
            className="input py-1.5 text-sm"
            value={action.target ?? 'entity_owner'}
            onChange={(e) =>
              onChange({ target: e.target.value as AutomationAction['target'] })
            }
          >
            <option value="entity_owner">Notify the assignee</option>
            <option value="entity_creator">Notify the creator</option>
          </select>
          <input
            className="input py-1.5 text-sm"
            placeholder="Notification title"
            value={action.title ?? ''}
            onChange={(e) => onChange({ title: e.target.value })}
          />
          <input
            className="input py-1.5 text-sm"
            placeholder="Message (optional)"
            value={action.body ?? ''}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </div>
      );
    case 'send_email':
      return (
        <div className="space-y-2">
          <input
            className="input py-1.5 text-sm"
            placeholder="To (email or {{contactEmail}})"
            value={action.to ?? ''}
            onChange={(e) => onChange({ to: e.target.value })}
          />
          <input
            className="input py-1.5 text-sm"
            placeholder="Subject"
            value={action.subject ?? ''}
            onChange={(e) => onChange({ subject: e.target.value })}
          />
          <textarea
            className="input min-h-[60px] py-1.5 text-sm"
            placeholder="Body"
            value={action.body ?? ''}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        </div>
      );
  }
}

function BuilderModal({
  open,
  onClose,
  editing,
}: {
  open: boolean;
  onClose: () => void;
  editing: Automation | null;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [initialized, setInitialized] = useState(false);

  // Seed the form when opening (create → empty, edit → existing values).
  if (open && !initialized) {
    setForm(
      editing
        ? {
            name: editing.name,
            enabled: editing.enabled,
            trigger: editing.trigger,
            conditions: editing.conditions,
            actions: editing.actions.length ? editing.actions : EMPTY_FORM.actions,
          }
        : EMPTY_FORM
    );
    setInitialized(true);
  }
  if (!open && initialized) setInitialized(false);

  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
    enabled: open,
  });

  const save = useMutation({
    mutationFn: async () => {
      const payload = { ...form };
      if (payload.trigger.event !== 'lead.stage_changed') delete payload.trigger.stage;
      if (editing) return api.patch(`/automations/${editing._id}`, payload);
      return api.post('/automations', payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success(editing ? 'Automation updated' : 'Automation created');
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const patchAction = (i: number, patch: Partial<AutomationAction>) =>
    setForm((f) => ({
      ...f,
      actions: f.actions.map((a, idx) => (idx === i ? { ...a, ...patch } : a)),
    }));

  const patchCondition = (i: number, patch: Partial<AutomationCondition>) =>
    setForm((f) => ({
      ...f,
      conditions: f.conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit automation' : 'New automation'}
      description="When a trigger fires and conditions match, run the actions."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!form.name || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? <Spinner /> : 'Save automation'}
          </button>
        </>
      }
    >
      <div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
        <div>
          <label className="label">Name</label>
          <input
            className="input"
            placeholder="e.g. Follow up on qualified leads"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            autoFocus
          />
        </div>

        {/* Trigger */}
        <div className="rounded-xl border border-line p-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-brand-600">
            Trigger
          </p>
          <select
            className="input"
            value={form.trigger.event}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                trigger: { ...f.trigger, event: e.target.value as TriggerEvent },
              }))
            }
          >
            {(Object.keys(TRIGGER_LABELS) as TriggerEvent[]).map((t) => (
              <option key={t} value={t}>
                {TRIGGER_LABELS[t]}
              </option>
            ))}
          </select>
          {form.trigger.event === 'lead.stage_changed' && (
            <select
              className="input mt-2"
              value={form.trigger.stage ?? ''}
              onChange={(e) =>
                setForm((f) => ({ ...f, trigger: { ...f.trigger, stage: e.target.value } }))
              }
            >
              <option value="">Any stage</option>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>
                  → {s}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Conditions */}
        <div className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
              Conditions <span className="normal-case text-ink-subtle">(optional, all must match)</span>
            </p>
            <button
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  conditions: [...f.conditions, { field: 'dealValue', operator: 'gte', value: '' }],
                }))
              }
            >
              + Add condition
            </button>
          </div>
          {form.conditions.length === 0 && (
            <p className="text-sm text-ink-subtle">Runs for every trigger.</p>
          )}
          <div className="space-y-2">
            {form.conditions.map((c, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  className="input py-1.5 text-sm"
                  placeholder="field (e.g. dealValue)"
                  value={c.field}
                  onChange={(e) => patchCondition(i, { field: e.target.value })}
                />
                <select
                  className="input w-32 py-1.5 text-sm"
                  value={c.operator}
                  onChange={(e) =>
                    patchCondition(i, { operator: e.target.value as ConditionOperator })
                  }
                >
                  {(Object.keys(OPERATOR_LABELS) as ConditionOperator[]).map((op) => (
                    <option key={op} value={op}>
                      {OPERATOR_LABELS[op]}
                    </option>
                  ))}
                </select>
                <input
                  className="input py-1.5 text-sm"
                  placeholder="value"
                  value={c.value}
                  onChange={(e) => patchCondition(i, { value: e.target.value })}
                />
                <button
                  className="btn-ghost p-1.5 text-ink-subtle hover:text-red-600"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      conditions: f.conditions.filter((_, idx) => idx !== i),
                    }))
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="rounded-xl border border-line p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wider text-brand-600">
              Actions
            </p>
            <button
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  actions: [...f.actions, { type: 'notify', target: 'entity_owner', title: '' }],
                }))
              }
            >
              + Add action
            </button>
          </div>
          <div className="space-y-3">
            {form.actions.map((a, i) => (
              <div key={i} className="rounded-lg bg-canvas/70 p-2.5">
                <div className="mb-2 flex items-center gap-2">
                  <select
                    className="input py-1.5 text-sm"
                    value={a.type}
                    onChange={(e) =>
                      patchAction(i, { type: e.target.value as ActionType })
                    }
                  >
                    {(Object.keys(ACTION_LABELS) as ActionType[]).map((t) => (
                      <option key={t} value={t}>
                        {ACTION_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  {form.actions.length > 1 && (
                    <button
                      className="btn-ghost p-1.5 text-ink-subtle hover:text-red-600"
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          actions: f.actions.filter((_, idx) => idx !== i),
                        }))
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
                <ActionFields
                  action={a}
                  projects={projects ?? []}
                  onChange={(patch) => patchAction(i, patch)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function AutomationsPage() {
  const qc = useQueryClient();
  const { role } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Automation | null>(null);
  const manage = can(role, 'automation:manage');

  const { data: automations, isLoading } = useQuery({
    queryKey: ['automations'],
    queryFn: async () => (await api.get<Automation[]>('/automations')).data,
  });

  const toggle = useMutation({
    mutationFn: async (a: Automation) =>
      api.patch(`/automations/${a._id}`, { enabled: !a.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['automations'] }),
    onError: (err) => toast.error(apiError(err)),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => api.delete(`/automations/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['automations'] });
      toast.success('Automation deleted');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(a: Automation) {
    setEditing(a);
    setModalOpen(true);
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Automations</h2>
          <p className="text-sm text-ink-muted">
            Put your busywork on autopilot with if-this-then-that rules.
          </p>
        </div>
        {manage && (
          <button className="btn-primary" onClick={openCreate}>
            <Plus className="h-4 w-4" /> New automation
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-brand-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !automations || automations.length === 0 ? (
        <EmptyState
          icon={Workflow}
          title="No automations yet"
          description="Create a rule like: when a lead moves to Qualified, create a follow-up task and notify the owner."
          action={
            manage && (
              <button className="btn-primary" onClick={openCreate}>
                <Plus className="h-4 w-4" /> New automation
              </button>
            )
          }
        />
      ) : (
        <div className="space-y-3">
          {automations.map((a) => (
            <div key={a._id} className="card flex items-center gap-4 p-4">
              <span
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                  a.enabled ? 'bg-brand-50 text-brand-500' : 'bg-canvas text-ink-subtle'
                }`}
              >
                <Zap className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-ink">{a.name}</p>
                <p className="truncate text-sm text-ink-muted">
                  {TRIGGER_LABELS[a.trigger.event]}
                  {a.trigger.stage ? ` (${a.trigger.stage})` : ''} ·{' '}
                  {a.actions.length} action{a.actions.length !== 1 ? 's' : ''} · ran{' '}
                  {a.runCount}×
                  {a.lastRunAt ? ` · last ${relativeTime(a.lastRunAt)}` : ''}
                </p>
              </div>

              {manage && (
                <>
                  {/* Enable/disable toggle */}
                  <button
                    role="switch"
                    aria-checked={a.enabled}
                    onClick={() => toggle.mutate(a)}
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      a.enabled ? 'bg-brand-600' : 'bg-line'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        a.enabled ? 'left-0.5 translate-x-5' : 'left-0.5'
                      }`}
                    />
                  </button>
                  <button className="btn-secondary px-3 py-1.5 text-sm" onClick={() => openEdit(a)}>
                    Edit
                  </button>
                  <button
                    className="btn-ghost p-1.5 text-ink-subtle hover:text-red-600"
                    onClick={() => remove.mutate(a._id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <BuilderModal open={modalOpen} onClose={() => setModalOpen(false)} editing={editing} />
    </div>
  );
}
