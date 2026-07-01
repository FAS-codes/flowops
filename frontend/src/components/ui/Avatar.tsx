import clsx from 'clsx';
import { avatarColor, initials } from '../../lib/format';

interface AvatarProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-9 w-9 text-sm',
  lg: 'h-11 w-11 text-base',
};

export function Avatar({ name, size = 'md', className }: AvatarProps) {
  return (
    <span
      title={name}
      className={clsx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-surface',
        avatarColor(name),
        SIZES[size],
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({ names, max = 3 }: { names: string[]; max?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size="sm" />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-canvas text-xs font-semibold text-ink-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </div>
  );
}
