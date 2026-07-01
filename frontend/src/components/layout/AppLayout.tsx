import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

const TITLES: Record<string, string> = {
  '/app/dashboard': 'Dashboard',
  '/app/crm': 'Sales Pipeline',
  '/app/projects': 'Projects',
  '/app/team': 'Team',
  '/app/audit': 'Audit Log',
};

export function AppLayout() {
  const { pathname } = useLocation();
  const title =
    Object.entries(TITLES).find(([key]) => pathname.startsWith(key))?.[1] ?? 'FlowOps';

  return (
    <div className="flex h-screen overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
