import clsx from 'clsx';
import { Check, ChevronDown, LogOut, Building2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';

function useClickOutside(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);
  return ref;
}

function OrgSwitcher() {
  const { organizations, activeOrg, switchOrg } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));

  if (!activeOrg) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-lg border border-line bg-surface py-1.5 pl-2 pr-2.5 text-sm shadow-card transition-colors hover:bg-canvas"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-brand-600 text-xs font-bold text-white">
          {activeOrg.name.slice(0, 1).toUpperCase()}
        </span>
        <span className="max-w-[10rem] truncate font-medium text-ink">{activeOrg.name}</span>
        <ChevronDown className="h-4 w-4 text-ink-subtle" />
      </button>

      {open && (
        <div className="absolute left-0 z-30 mt-2 w-64 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <p className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-ink-subtle">
            Your organizations
          </p>
          {organizations.map((org) => (
            <button
              key={org.id}
              onClick={() => {
                switchOrg(org.id);
                setOpen(false);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-canvas"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-md bg-canvas text-xs font-bold text-ink-muted">
                {org.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="flex-1 truncate font-medium text-ink">{org.name}</span>
              {org.id === activeOrg.id && <Check className="h-4 w-4 text-brand-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const { user, activeOrg, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useClickOutside(() => setOpen(false));
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-canvas"
      >
        <Avatar name={user.name} size="md" />
        <ChevronDown className="mr-1 h-4 w-4 text-ink-subtle" />
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-2 w-60 animate-fade-in overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop">
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar name={user.name} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
            </div>
          </div>
          {activeOrg && (
            <div className="flex items-center justify-between px-2.5 py-1.5">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                <Building2 className="h-3.5 w-3.5" /> Role
              </span>
              <RoleBadge role={activeOrg.role} />
            </div>
          )}
          <div className="my-1 h-px bg-line" />
          <button
            onClick={async () => {
              await logout();
              navigate('/login');
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

export function Topbar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/80 px-4 backdrop-blur-md sm:px-6">
      <div className="flex items-center gap-3">
        <h1 className={clsx('text-lg font-semibold text-ink')}>{title}</h1>
      </div>
      <div className="flex items-center gap-3">
        <OrgSwitcher />
        <div className="h-6 w-px bg-line" />
        <UserMenu />
      </div>
    </header>
  );
}
