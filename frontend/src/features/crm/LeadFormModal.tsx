import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Modal } from '../../components/ui/Modal';
import { Spinner } from '../../components/ui/Spinner';
import { api, apiError } from '../../lib/api';
import { Member } from '../../lib/types';

interface Props {
  open: boolean;
  onClose: () => void;
  stages: string[];
  defaultStage?: string;
}

export function LeadFormModal({ open, onClose, stages, defaultStage }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    title: '',
    company: '',
    contactName: '',
    contactEmail: '',
    dealValue: '',
    stage: defaultStage ?? stages[0] ?? '',
    assignedTo: '',
  });

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: async () => (await api.get<Member[]>('/organization/members')).data,
    enabled: open,
  });

  const create = useMutation({
    mutationFn: async () => {
      const payload = {
        title: form.title,
        company: form.company || undefined,
        contactName: form.contactName || undefined,
        contactEmail: form.contactEmail || undefined,
        dealValue: form.dealValue ? Number(form.dealValue) : 0,
        stage: form.stage,
        assignedTo: form.assignedTo || undefined,
      };
      return (await api.post('/leads', payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['crm-board'] });
      toast.success('Lead added');
      onClose();
      setForm((f) => ({ ...f, title: '', company: '', contactName: '', dealValue: '' }));
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add a lead"
      description="Track a new opportunity in your pipeline."
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={() => create.mutate()}
            disabled={!form.title || create.isPending}
          >
            {create.isPending ? <Spinner /> : 'Add lead'}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <label className="label">Title</label>
          <input
            className="input"
            placeholder="e.g. Acme — annual contract"
            value={form.title}
            onChange={set('title')}
            autoFocus
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Company</label>
            <input className="input" value={form.company} onChange={set('company')} />
          </div>
          <div>
            <label className="label">Deal value ($)</label>
            <input
              className="input"
              type="number"
              min="0"
              value={form.dealValue}
              onChange={set('dealValue')}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Contact name</label>
            <input
              className="input"
              value={form.contactName}
              onChange={set('contactName')}
            />
          </div>
          <div>
            <label className="label">Contact email</label>
            <input
              className="input"
              type="email"
              value={form.contactEmail}
              onChange={set('contactEmail')}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Stage</label>
            <select className="input" value={form.stage} onChange={set('stage')}>
              {stages.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Assign to</label>
            <select className="input" value={form.assignedTo} onChange={set('assignedTo')}>
              <option value="">Unassigned</option>
              {members?.map((m) => (
                <option key={m.user._id} value={m.user._id}>
                  {m.user.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </Modal>
  );
}
