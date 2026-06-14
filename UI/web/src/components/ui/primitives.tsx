import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/* ---- StatCard (dashboard metric) ---- */
export function StatCard({
  label,
  value,
  suffix,
  delta,
  deltaTone = 'success',
  loading,
}: {
  label: string;
  value: string;
  suffix?: string;
  delta?: string;
  deltaTone?: 'success' | 'warning' | 'danger' | 'muted';
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="card flex flex-col gap-3 p-5">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton h-9 w-40" />
        <div className="skeleton h-3 w-20" />
      </div>
    );
  }
  const deltaCls = {
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-danger',
    muted: 'text-fg-tertiary',
  }[deltaTone];
  return (
    <div className="card flex flex-col gap-2 p-5">
      <span className="t-caption text-fg-secondary">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className="t-num-sm text-fg">{value}</span>
        {suffix && <span className="t-mono text-fg-tertiary">{suffix}</span>}
      </span>
      {delta && <span className={cn('t-small', deltaCls)}>{delta}</span>}
    </div>
  );
}

/* ---- EmptyState ---- */
export function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: ReactNode;
  title: string;
  text?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-12 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-full bg-page-subtle text-fg-tertiary">
        {icon}
      </div>
      <h3 className="t-h3 text-fg">{title}</h3>
      {text && <p className="t-small max-w-[320px] text-fg-secondary">{text}</p>}
      {action}
    </div>
  );
}

/* ---- Section heading ---- */
export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="t-h3 text-fg">{children}</h2>;
}

/* ---- Onchain accordion-style detail line ---- */
export function OnchainRow({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-page-subtle px-4 py-3 t-mono text-fg-secondary">
      {children}
    </div>
  );
}

/* ---- FeeBreakdown — itemised fees + total, always shown before a payment is confirmed ---- */
export function FeeBreakdown({
  rows,
  total,
}: {
  rows: { label: string; value: string }[];
  total: { label: string; value: string };
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md bg-page-subtle p-4">
      {rows.map((r) => (
        <div key={r.label} className="flex items-baseline justify-between gap-2">
          <span className="t-small text-fg-secondary">{r.label}</span>
          <span className="t-mono text-fg-secondary">{r.value}</span>
        </div>
      ))}
      <div className="mt-1 flex items-baseline justify-between gap-2 border-t border-line-strong pt-2.5">
        <span className="t-body-strong text-fg">{total.label}</span>
        <span className="t-mono text-fg">{total.value}</span>
      </div>
    </div>
  );
}
