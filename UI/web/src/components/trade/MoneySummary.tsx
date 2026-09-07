import { useState, type ReactNode } from 'react';
import type { Money } from '@/domain/types';
import { formatExact, formatMoney, isZero } from '@/domain/money';
import { useI18n } from '@/app/i18n-context';
import { cn } from '@/lib/cn';

export function MoneyValue({
  value,
  className,
  basis,
  emphasis,
}: {
  value: Money;
  className?: string;
  basis?: string;
  emphasis?: boolean;
}) {
  const { locale } = useI18n();
  return (
    <span className={cn('tabular whitespace-nowrap', emphasis && 'font-semibold', className)}>
      {formatMoney(value, locale)}
      {basis ? <span className="ml-1 text-sm font-normal text-fg-secondary">{basis}</span> : null}
    </span>
  );
}

export type MoneyRow = {
  label: string;
  value: Money;
  /** Deducted from someone else's proceeds rather than added to a total. */
  note?: string;
  emphasis?: boolean;
  negative?: boolean;
};

/**
 * A money breakdown that always adds up. The expanded view shows base-unit
 * precision so a split with fractions of a cent visibly reconciles.
 */
export function MoneySummary({
  rows,
  total,
  totalLabel,
  footnote,
  showExact = true,
}: {
  rows: MoneyRow[];
  total?: { label: string; value: Money };
  totalLabel?: string;
  footnote?: ReactNode;
  showExact?: boolean;
}) {
  const { d, locale } = useI18n();
  const [expanded, setExpanded] = useState(false);
  const needsExact = rows.some((row) => {
    const text = formatMoney(row.value, locale, { exact: true });
    return text !== formatMoney(row.value, locale);
  });

  return (
    <div className="flex flex-col gap-3">
      <dl className="flex flex-col gap-2 text-sm">
        {rows.map((row, index) => (
          <div key={index} className="flex items-baseline justify-between gap-4">
            <dt className={cn('text-fg-secondary', row.emphasis && 'font-medium text-fg')}>
              {row.label}
              {row.note ? <span className="block text-xs text-fg-secondary">{row.note}</span> : null}
            </dt>
            <dd className={cn('tabular text-right', row.emphasis && 'font-semibold')}>
              {row.negative && !isZero(row.value) ? '−' : ''}
              {formatMoney(row.value, locale)}
            </dd>
          </div>
        ))}
        {total ? (
          <div className="mt-1 flex items-baseline justify-between gap-4 border-t border-line pt-3">
            <dt className="font-medium">{total.label ?? totalLabel}</dt>
            <dd className="tabular text-right text-lg font-semibold">{formatMoney(total.value, locale)}</dd>
          </div>
        ) : null}
      </dl>

      {showExact && needsExact ? (
        <div>
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="link text-sm"
          >
            {expanded ? d.common.showLess : d.price.exactAmount}
          </button>
          {expanded ? (
            <dl className="mt-2 flex flex-col gap-1 rounded-[8px] bg-page-subtle p-3 text-sm">
              <p className="caption">{d.price.precision}</p>
              {rows.map((row, index) => (
                <div key={index} className="flex items-baseline justify-between gap-4">
                  <dt className="text-fg-secondary">{row.label}</dt>
                  <dd className="code tabular">{formatExact(row.value, locale)}</dd>
                </div>
              ))}
              {total ? (
                <div className="flex items-baseline justify-between gap-4 border-t border-line pt-1">
                  <dt className="text-fg-secondary">{total.label}</dt>
                  <dd className="code tabular">{formatExact(total.value, locale)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
        </div>
      ) : null}

      {footnote ? <p className="text-xs leading-5 text-fg-secondary">{footnote}</p> : null}
    </div>
  );
}
