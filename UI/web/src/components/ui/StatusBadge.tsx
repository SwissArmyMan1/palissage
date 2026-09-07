import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'accent';

const TONES: Record<BadgeTone, string> = {
  neutral: 'bg-page-subtle text-fg border-line',
  info: 'bg-info-subtle text-info border-transparent',
  warning: 'bg-warning-subtle text-warning border-transparent',
  success: 'bg-success-subtle text-success border-transparent',
  danger: 'bg-danger-subtle text-danger border-transparent',
  accent: 'bg-accent-subtle text-accent border-transparent',
};

/** Colour is never the only signal: the label always carries the meaning. */
export function StatusBadge({
  tone = 'neutral',
  children,
  icon,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium leading-4',
        TONES[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}

export function ModeBanner({ mode, label }: { mode: 'demo' | 'testnet'; label: string }) {
  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2 px-4 py-1.5 text-xs font-medium',
        mode === 'demo' ? 'bg-warning-subtle text-warning' : 'bg-info-subtle text-info',
      )}
    >
      <span aria-hidden="true">{mode === 'demo' ? '◆' : '◈'}</span>
      <span>{label}</span>
    </div>
  );
}
