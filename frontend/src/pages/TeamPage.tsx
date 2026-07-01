import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Copy, Mail, MoreHorizontal, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import { Avatar } from '../components/ui/Avatar';
import { RoleBadge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Spinner } from '../components/ui/Spinner';
import { useAuth } from '../context/AuthContext';
import { api, apiError } from '../lib/api';
import { relativeTime } from '../lib/format';
import { can } from '../lib/permissions';
import { Member, Role } from '../lib/types';

const ASSIGNABLE_ROLES: Role[] = ['admin', 'manager', 'employee', 'viewer'];

function InviteModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('employee');
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);

  const invite = useMutation({
    mutationFn: async () =>
      (await api.post('/organization/invitations', { email, role })).data,
    onSuccess: (data: { inviteUrl: string }) => {
      qc.invalidateQueries({ queryKey: ['invitations'] });
      setInviteUrl(`${window.location.origin}${data.inviteUrl}`);
      toast.success('Invitation created');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  function reset() {
    setEmail('');
    setRole('employee');
    setInviteUrl(null);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={reset}
      title="Invite a teammate"
      description="They'll join this workspace with the role you choose."
      footer={
        !inviteUrl && (
          <>
            <button className="btn-secondary" onClick={reset}>
              Cancel
            </button>
            <button
              className="btn-primary"
              disabled={!email || invite.isPending}
              onClick={() => invite.mutate()}
            >
              {invite.isPending ? <Spinner /> : 'Create invite'}
            </button>
          </>
        )
      }
    >
      {inviteUrl ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-muted">
            Share this link with <span className="font-medium text-ink">{email}</span>.
            (In V2 this is emailed automatically.)
          </p>
          <div className="flex items-center gap-2 rounded-lg border border-line bg-canvas p-2.5">
            <code className="flex-1 truncate text-xs text-ink-muted">{inviteUrl}</code>
            <button
              className="btn-secondary px-2.5 py-1.5"
              onClick={() => {
                navigator.clipboard.writeText(inviteUrl);
                toast.success('Link copied');
              }}
            >
              <Copy className="h-4 w-4" />
            </button>
          </div>
          <button className="btn-primary w-full" onClick={reset}>
            Done
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">Email address</label>
            <input
              type="email"
              className="input"
              placeholder="teammate@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="label">Role</label>
            <select
              className="input"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ASSIGNABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r[0].toUpperCase() + r.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </Modal>
  );
}

function MemberRow({ member }: { member: Member }) {
  const qc = useQueryClient();
  const { role: myRole, user: me } = useAuth();
  const canManage = can(myRole, 'member:manage') && member.role !== 'owner';
  const isMe = me?.id === member.user._id;

  const changeRole = useMutation({
    mutationFn: async (newRole: Role) =>
      api.patch(`/organization/members/${member.id}/role`, { role: newRole }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members-list'] });
      toast.success('Role updated');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  const remove = useMutation({
    mutationFn: async () => api.delete(`/organization/members/${member.id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['members-list'] });
      toast.success('Member removed');
    },
    onError: (err) => toast.error(apiError(err)),
  });

  return (
    <tr className="border-t border-line">
      <td className="py-3 pl-5 pr-3">
        <div className="flex items-center gap-3">
          <Avatar name={member.user.name} size="md" />
          <div>
            <p className="text-sm font-medium text-ink">
              {member.user.name}
              {isMe && <span className="ml-2 text-xs text-ink-subtle">(you)</span>}
            </p>
            <p className="text-xs text-ink-muted">{member.user.email}</p>
          </div>
        </div>
      </td>
      <td className="px-3 py-3">
        {canManage && !isMe ? (
          <select
            className="input max-w-[9rem] py-1.5 text-sm capitalize"
            value={member.role}
            onChange={(e) => changeRole.mutate(e.target.value as Role)}
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </td>
      <td className="px-3 py-3 text-sm text-ink-muted">{relativeTime(member.joinedAt)}</td>
      <td className="px-3 py-3 pr-5 text-right">
        {canManage && !isMe && (
          <button
            className="btn-ghost p-1.5 text-ink-subtle hover:text-red-600"
            onClick={() => remove.mutate()}
            title="Remove member"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </td>
    </tr>
  );
}

export function TeamPage() {
  const { role } = useAuth();
  const [invite, setInvite] = useState(false);

  const { data: members, isLoading } = useQuery({
    queryKey: ['members-list'],
    queryFn: async () => (await api.get<Member[]>('/organization/members')).data,
  });

  const { data: invitations } = useQuery({
    queryKey: ['invitations'],
    queryFn: async () =>
      (
        await api.get<{ email: string; role: Role; expiresAt: string }[]>(
          '/organization/invitations'
        )
      ).data,
    enabled: can(role, 'member:invite'),
  });

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Team</h2>
          <p className="text-sm text-ink-muted">Manage members and their access.</p>
        </div>
        {can(role, 'member:invite') && (
          <button className="btn-primary" onClick={() => setInvite(true)}>
            <UserPlus className="h-4 w-4" /> Invite member
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              <th className="py-3 pl-5 pr-3">Member</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Joined</th>
              <th className="px-3 py-3 pr-5" />
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="py-12 text-center text-brand-600">
                  <Spinner className="h-5 w-5" />
                </td>
              </tr>
            ) : (
              members?.map((m) => <MemberRow key={m.id} member={m} />)
            )}
          </tbody>
        </table>
      </div>

      {can(role, 'member:invite') && invitations && invitations.length > 0 && (
        <div className="card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-ink">
            <Mail className="h-4 w-4 text-ink-muted" /> Pending invitations
          </h3>
          <ul className="space-y-2">
            {invitations.map((inv, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-lg border border-line px-3.5 py-2.5"
              >
                <div className="flex items-center gap-2">
                  <MoreHorizontal className="h-4 w-4 text-ink-subtle" />
                  <span className="text-sm text-ink">{inv.email}</span>
                </div>
                <RoleBadge role={inv.role} />
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteModal open={invite} onClose={() => setInvite(false)} />
    </div>
  );
}
