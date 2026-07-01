import clsx from 'clsx';

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={clsx(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent',
        className ?? 'h-4 w-4'
      )}
      role="status"
      aria-label="Loading"
    />
  );
}

export function FullPageLoader() {
  return (
    <div className="flex h-screen items-center justify-center bg-canvas">
      <div className="flex flex-col items-center gap-3 text-brand-600">
        <Spinner className="h-7 w-7" />
        <span className="text-sm font-medium text-ink-muted">Loading your workspace…</span>
      </div>
    </div>
  );
}
