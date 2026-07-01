import { KanbanSquare, ShieldCheck, Zap } from 'lucide-react';
import { Logo } from './Logo';

const HIGHLIGHTS = [
  {
    icon: KanbanSquare,
    title: 'Sales pipeline that moves',
    body: 'Drag leads across stages and watch your revenue forecast update live.',
  },
  {
    icon: ShieldCheck,
    title: 'Multi-tenant by design',
    body: 'Every workspace is fully isolated with role-based access control.',
  },
  {
    icon: Zap,
    title: 'Built for real teams',
    body: 'Projects, tasks, and a business dashboard — all in one place.',
  },
];

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-canvas">
      {/* Brand panel */}
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-12 text-white lg:flex">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.15]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="relative flex items-center gap-2.5">
          <Logo className="[&_span]:text-white [&_.text-brand-600]:text-brand-200" />
        </div>

        <div className="relative max-w-md space-y-8">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            The operating system for your customer relationships.
          </h1>
          <div className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="flex gap-4">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/20">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-medium">{title}</p>
                  <p className="text-sm text-brand-100">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative text-sm text-brand-200">
          © {new Date().getFullYear()} FlowOps. Crafted for modern teams.
        </p>
      </div>

      {/* Form panel */}
      <div className="flex w-full items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
