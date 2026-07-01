import clsx from 'clsx';

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={clsx('shrink-0', className)}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="32" height="32" rx="8" fill="url(#flowops-g)" />
      <path
        d="M10 22V10h9M10 16h7"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="22" cy="21" r="2.4" fill="#fff" />
      <defs>
        <linearGradient
          id="flowops-g"
          x1="0"
          y1="0"
          x2="32"
          y2="32"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#6366f1" />
          <stop offset="1" stopColor="#4436c9" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <div className={clsx('flex items-center gap-2.5', className)}>
      <LogoMark className="h-8 w-8" />
      <span className="text-lg font-semibold tracking-tight text-ink">
        Flow<span className="text-brand-600">Ops</span>
      </span>
    </div>
  );
}
