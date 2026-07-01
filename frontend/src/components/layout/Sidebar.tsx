import clsx from 'clsx';
import {
  KanbanSquare,
  LayoutDashboard,
  FolderKanban,
  ScrollText,
  Users,
  Sparkles,
} from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../lib/permissions';
import { Logo } from '../Logo';

const NAV = [
  { to: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/app/crm', label: 'Sales Pipeline', icon: KanbanSquare },
  { to: '/app/projects', label: 'Projects', icon: FolderKanban },
  { to: '/app/team', label: 'Team', icon: Users },
];

export function Sidebar() {
  const { role } = useAuth();
  const nav = [
    ...NAV,
    ...(can(role, 'audit:read')
      ? [{ to: '/app/audit', label: 'Audit Log', icon: ScrollText }]
      : []),
  ];
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex h-16 items-center px-6">
        <Logo />
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
          Workspace
        </p>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  className={clsx(
                    'h-[18px] w-[18px] transition-colors',
                    isActive ? 'text-brand-600' : 'text-ink-subtle group-hover:text-ink-muted'
                  )}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="p-3">
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-brand-600 to-brand-800 p-4 text-white shadow-brand">
          <Sparkles className="absolute -right-3 -top-3 h-16 w-16 text-white/10" />
          <p className="text-sm font-semibold">Automations</p>
          <p className="mt-1 text-xs text-brand-100">
            Trigger tasks &amp; alerts automatically. Coming in your V3.
          </p>
        </div>
      </div>
    </aside>
  );
}
