import { useQuery } from '@tanstack/react-query';
import {
  Activity as ActivityIcon,
  ArrowUpRight,
  CircleDollarSign,
  Target,
  TrendingUp,
  Users2,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Avatar } from '../components/ui/Avatar';
import { Spinner } from '../components/ui/Spinner';
import { api } from '../lib/api';
import { compactCurrency, currency, relativeTime } from '../lib/format';
import { Activity, DashboardStats } from '../lib/types';

const STAGE_COLORS = [
  '#94a3b8',
  '#38bdf8',
  '#a78bfa',
  '#fbbf24',
  '#fb923c',
  '#10b981',
  '#f87171',
];

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: typeof Target;
  accent: string;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-ink-muted">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-ink">{value}</p>
        </div>
        <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${accent}`}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      {hint && (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <ArrowUpRight className="h-3.5 w-3.5" />
          {hint}
        </p>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async () => (await api.get<DashboardStats>('/dashboard/stats')).data,
  });
  const { data: activity } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => (await api.get<Activity[]>('/dashboard/activity')).data,
  });

  if (isLoading || !stats) {
    return (
      <div className="flex h-64 items-center justify-center text-brand-600">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  const chartData = stats.leads.byStage.map((s) => ({ name: s.stage, value: s.value }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Here's how your business is doing
        </h2>
        <p className="mt-0.5 text-sm text-ink-muted">
          A live snapshot of pipeline, projects and team workload.
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Pipeline value"
          value={compactCurrency(stats.leads.pipelineValue)}
          hint="Open deals"
          icon={CircleDollarSign}
          accent="bg-emerald-100 text-emerald-600"
        />
        <StatCard
          label="Total leads"
          value={String(stats.leads.total)}
          hint={`${stats.leads.won} won`}
          icon={Target}
          accent="bg-brand-100 text-brand-600"
        />
        <StatCard
          label="Conversion rate"
          value={`${stats.leads.conversionRate}%`}
          icon={TrendingUp}
          accent="bg-sky-100 text-sky-600"
        />
        <StatCard
          label="Overdue tasks"
          value={String(stats.tasks.overdue)}
          icon={ActivityIcon}
          accent="bg-amber-100 text-amber-600"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Pipeline chart */}
        <div className="card p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-ink">Revenue by pipeline stage</h3>
              <p className="text-sm text-ink-muted">Deal value across your funnel</p>
            </div>
          </div>
          {chartData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-ink-muted">
              No pipeline data yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} margin={{ left: -18, right: 8 }}>
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#9d9ca8' }}
                  axisLine={false}
                  tickLine={false}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#9d9ca8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => compactCurrency(v as number)}
                />
                <Tooltip
                  cursor={{ fill: '#f7f7f8' }}
                  formatter={(v) => [currency(v as number), 'Value']}
                  contentStyle={{
                    borderRadius: 12,
                    border: '1px solid #ecebef',
                    fontSize: 13,
                    boxShadow: '0 12px 32px -8px rgb(24 23 34 / 0.18)',
                  }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {chartData.map((_, i) => (
                    <Cell key={i} fill={STAGE_COLORS[i % STAGE_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Workload */}
        <div className="card p-6">
          <h3 className="mb-1 font-semibold text-ink">Team workload</h3>
          <p className="mb-5 text-sm text-ink-muted">Open tasks per member</p>
          {stats.workload.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-center text-sm text-ink-muted">
              <span className="inline-flex items-center gap-2">
                <Users2 className="h-4 w-4" /> No open tasks assigned.
              </span>
            </div>
          ) : (
            <ul className="space-y-4">
              {stats.workload.map((w) => {
                const max = Math.max(...stats.workload.map((x) => x.openTasks));
                return (
                  <li key={w.userId} className="flex items-center gap-3">
                    <Avatar name={w.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="truncate text-sm font-medium text-ink">
                          {w.name}
                        </span>
                        <span className="text-xs font-semibold text-ink-muted">
                          {w.openTasks}
                        </span>
                      </div>
                      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-canvas">
                        <div
                          className="h-full rounded-full bg-brand-500"
                          style={{ width: `${(w.openTasks / max) * 100}%` }}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {/* Recent activity */}
      <div className="card p-6">
        <h3 className="mb-5 font-semibold text-ink">Recent activity</h3>
        {!activity || activity.length === 0 ? (
          <p className="py-8 text-center text-sm text-ink-muted">No activity yet.</p>
        ) : (
          <ul className="space-y-1">
            {activity.map((a) => (
              <li
                key={a._id}
                className="flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-canvas"
              >
                <Avatar name={a.actor?.name ?? 'System'} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-ink">
                    <span className="font-medium">{a.actor?.name ?? 'Someone'}</span>{' '}
                    <span className="text-ink-muted">{a.summary}</span>
                  </p>
                </div>
                <span className="whitespace-nowrap text-xs text-ink-subtle">
                  {relativeTime(a.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
