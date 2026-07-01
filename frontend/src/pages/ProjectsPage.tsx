import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarClock, FolderKanban, Plus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { AvatarStack } from '../components/ui/Avatar';
import { ProjectStatusBadge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { formatDate } from '../lib/format';
import { can } from '../lib/permissions';
import { Project } from '../lib/types';

function CreateProjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: '', description: '', dueDate: '' });

  const create = useMutation({
    mutationFn: async () =>
      (
        await api.post('/projects', {
          name: form.name,
          description: form.description || undefined,
          dueDate: form.dueDate || undefined,
        })
      ).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] });
      toast.success('Project created');
      setForm({ name: '', description: '', dueDate: '' });
      onClose();
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="New project"
      description="Group tasks and collaborate with your team."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            disabled={!form.name || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? <Spinner /> : 'Create project'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Project name</label>
          <input
            className="input"
            autoFocus
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. Website Redesign"
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input min-h-[84px] resize-none"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="What's this project about?"
          />
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
    </Modal>
  );
}

export function ProjectsPage() {
  const { role } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const { data: projects, isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => (await api.get<Project[]>('/projects')).data,
  });

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Projects</h2>
          <p className="text-sm text-ink-muted">Plan work and track progress.</p>
        </div>
        {can(role, 'project:create') && (
          <button className="btn-primary" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> New project
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-brand-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Create your first project to start organizing tasks and collaborating."
          action={
            can(role, 'project:create') && (
              <button className="btn-primary" onClick={() => setOpen(true)}>
                <Plus className="h-4 w-4" /> New project
              </button>
            )
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <button
              key={p._id}
              onClick={() => navigate(`/app/projects/${p._id}`)}
              className="card group p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-soft"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-semibold text-ink group-hover:text-brand-700">
                  {p.name}
                </h3>
                <ProjectStatusBadge status={p.status} />
              </div>
              {p.description && (
                <p className="mt-1.5 line-clamp-2 text-sm text-ink-muted">{p.description}</p>
              )}

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-muted">
                    {p.doneCount}/{p.taskCount} tasks
                  </span>
                  <span className="font-semibold text-ink">{p.progress}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                  <div
                    className="h-full rounded-full bg-brand-500 transition-all"
                    style={{ width: `${p.progress}%` }}
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                {p.members.length > 0 ? (
                  <AvatarStack names={p.members.map((m) => m.name)} />
                ) : (
                  <span className="text-xs text-ink-subtle">No members</span>
                )}
                {p.dueDate && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                    <CalendarClock className="h-3.5 w-3.5" />
                    {formatDate(p.dueDate)}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      <CreateProjectModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
}
