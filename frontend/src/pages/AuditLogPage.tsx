import { useQuery } from '@tanstack/react-query';
import { ScrollText } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../lib/api';
import { formatDate, relativeTime } from '../lib/format';

interface AuditEntry {
  _id: string;
  actor: { name: string; email: string } | null;
  action: string;
  entityType: string;
  summary: string;
  metadata?: { before?: unknown; after?: unknown };
  createdAt: string;
}

interface AuditResponse {
  items: AuditEntry[];
  total: number;
  page: number;
  pages: number;
  actions: string[];
}

function humanizeAction(action: string) {
  return action.replace(/[._]/g, ' ');
}

export function AuditLogPage() {
  const [action, setAction] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { action, page }],
    queryFn: async () =>
      (
        await api.get<AuditResponse>('/audit', {
          params: { action: action || undefined, page, limit: 20 },
        })
      ).data,
  });

  return (
    <div className="animate-fade-in space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-ink">Audit log</h2>
          <p className="text-sm text-ink-muted">
            Every important action in this workspace, with who did what and when.
          </p>
        </div>
        <select
          className="input max-w-[14rem]"
          value={action}
          onChange={(e) => {
            setAction(e.target.value);
            setPage(1);
          }}
        >
          <option value="">All actions</option>
          {data?.actions.map((a) => (
            <option key={a} value={a}>
              {humanizeAction(a)}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center text-brand-600">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !data || data.items.length === 0 ? (
        <EmptyState
          icon={ScrollText}
          title="No audit entries"
          description="Actions like creating leads, moving deals, and changing roles will appear here."
        />
      ) : (
        <>
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                  <th className="py-3 pl-5 pr-3">Actor</th>
                  <th className="px-3 py-3">Action</th>
                  <th className="px-3 py-3">Details</th>
                  <th className="px-3 py-3">Change</th>
                  <th className="px-3 py-3 pr-5 text-right">When</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e._id} className="border-t border-line align-top">
                    <td className="py-3 pl-5 pr-3">
                      <div className="flex items-center gap-2.5">
                        <Avatar name={e.actor?.name ?? 'System'} size="sm" />
                        <span className="font-medium text-ink">
                          {e.actor?.name ?? 'System'}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <span className="chip bg-canvas capitalize text-ink-muted">
                        {humanizeAction(e.action)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-ink">{e.summary}</td>
                    <td className="px-3 py-3">
                      {e.metadata?.before !== undefined || e.metadata?.after !== undefined ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="rounded bg-red-50 px-1.5 py-0.5 text-red-600 line-through">
                            {String(e.metadata?.before ?? '—')}
                          </span>
                          <span className="text-ink-subtle">→</span>
                          <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">
                            {String(e.metadata?.after ?? '—')}
                          </span>
                        </span>
                      ) : (
                        <span className="text-ink-subtle">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 pr-5 text-right">
                      <span className="text-ink-muted" title={formatDate(e.createdAt)}>
                        {relativeTime(e.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                Page {data.page} of {data.pages} · {data.total} entries
              </span>
              <div className="flex gap-2">
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </button>
                <button
                  className="btn-secondary px-3 py-1.5"
                  disabled={page >= data.pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
