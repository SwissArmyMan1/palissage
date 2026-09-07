import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { Trellis } from '@/components/layout/Logo';

/** Distinguishes "nothing created", "no matches", "unavailable" and an error. */
export function EmptyState({
  title,
  body,
  action,
  tone = 'neutral',
}: {
  title: string;
  body: string;
  action?: ReactNode;
  tone?: 'neutral' | 'warning' | 'danger';
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-start gap-3 rounded-panel border border-dashed p-6 sm:p-8',
        tone === 'neutral' && 'border-line bg-surface',
        tone === 'warning' && 'border-warning bg-warning-subtle',
        tone === 'danger' && 'border-danger bg-danger-subtle',
      )}
    >
      {tone === 'neutral' ? <Trellis className="h-10 w-10 text-line-strong" /> : null}
      <h3 className="h3">{title}</h3>
      <p className="max-w-prose text-fg-secondary">{body}</p>
      {action}
    </div>
  );
}

export function ErrorPanel({
  title,
  body,
  action,
  details,
}: {
  title: string;
  body: string;
  action?: ReactNode;
  details?: string;
}) {
  return (
    <div role="alert" className="rounded-panel border border-danger bg-danger-subtle p-5">
      <h3 className="text-base font-semibold text-danger">{title}</h3>
      <p className="mt-1 text-sm text-fg">{body}</p>
      {action ? <div className="mt-3">{action}</div> : null}
      {details ? (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-danger">Details</summary>
          <p className="code mt-2 text-fg-secondary">{details}</p>
        </details>
      ) : null}
    </div>
  );
}

export function Notice({
  tone = 'info',
  title,
  children,
  action,
}: {
  tone?: 'info' | 'warning' | 'success' | 'neutral';
  title?: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div
      className={cn(
        'rounded-[8px] border p-4 text-sm',
        tone === 'info' && 'border-transparent bg-info-subtle text-info',
        tone === 'warning' && 'border-transparent bg-warning-subtle text-warning',
        tone === 'success' && 'border-transparent bg-success-subtle text-success',
        tone === 'neutral' && 'border-line bg-page-subtle text-fg',
      )}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      <div className={cn(title && 'mt-1', 'leading-6')}>{children}</div>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/** Placeholder geometry only; never a fake number. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn('animate-pulse rounded-[8px] bg-page-subtle motion-reduce:animate-none', className)}
    />
  );
}

export function LoadingBlock({ label }: { label: string }) {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">{label}</span>
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

/** Section heading with an optional supporting line and trailing action. */
export function SectionHeader({
  title,
  description,
  action,
  as: Tag = 'h2',
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  as?: 'h2' | 'h3';
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        <Tag className={Tag === 'h2' ? 'h2' : 'h3'}>{title}</Tag>
        {description ? <p className="mt-2 max-w-prose text-fg-secondary">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function MetricTile({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'neutral' | 'accent';
}) {
  return (
    <div className={cn('panel-flush p-5', tone === 'accent' && 'border-accent bg-accent-subtle')}>
      <p className="caption">{label}</p>
      <p className="numeric mt-1">{value}</p>
      {detail ? <p className="mt-1 text-sm text-fg-secondary">{detail}</p> : null}
    </div>
  );
}

export function DefinitionList({
  items,
  columns = 1,
}: {
  items: { term: ReactNode; value: ReactNode }[];
  columns?: 1 | 2;
}) {
  return (
    <dl className={cn('grid gap-x-8 gap-y-3', columns === 2 ? 'sm:grid-cols-2' : '')}>
      {items.map((item, index) => (
        <div key={index} className="flex flex-col gap-0.5 border-b border-line pb-3 last:border-0 sm:border-0 sm:pb-0">
          <dt className="caption">{item.term}</dt>
          <dd className="text-sm font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}
