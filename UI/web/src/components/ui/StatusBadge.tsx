import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'gold';

const tones: Record<Tone, { dot: string; text: string; bg: string }> = {
  neutral: { dot: 'bg-fg-secondary', text: 'text-fg-secondary', bg: 'bg-page-subtle' },
  success: { dot: 'bg-success', text: 'text-success', bg: 'bg-success-subtle' },
  warning: { dot: 'bg-warning', text: 'text-warning', bg: 'bg-warning-subtle' },
  danger: { dot: 'bg-danger', text: 'text-danger', bg: 'bg-danger-subtle' },
  info: { dot: 'bg-info', text: 'text-info', bg: 'bg-info-subtle' },
  gold: { dot: 'bg-gold', text: 'text-gold', bg: 'bg-gold-subtle' },
};

/** Single shared pill for lifecycle status, so the tone colors stay consistent everywhere. */
export function StatusBadge({
  tone = 'neutral',
  children,
  icon,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  const t = tones[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 t-caption',
        t.bg,
        t.text,
        className,
      )}
    >
      {icon ?? <span className={cn('h-2 w-2 rounded-full', t.dot)} />}
      {children}
    </span>
  );
}
