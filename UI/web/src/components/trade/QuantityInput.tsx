import { useId } from 'react';
import { useI18n } from '@/app/i18n-context';
import { cn } from '@/lib/cn';

/**
 * Whole bottles, typed directly or stepped. Out-of-range input produces a
 * message; it is never silently corrected to the nearest allowed quantity.
 */
export function QuantityInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  label,
  unit,
  error,
  disabled,
  fieldName = 'quantity',
}: {
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  label: string;
  unit: string;
  error?: string;
  disabled?: boolean;
  fieldName?: string;
}) {
  const { d, fmt, formatNumber } = useI18n();
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  const hintId = `${id}-hint`;
  const current = Number(value);
  const numeric = Number.isFinite(current) ? current : min;

  const nudge = (delta: number) => {
    const next = Math.min(Math.max(numeric + delta, min), Math.max(max, min));
    onChange(String(next));
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <button
          type="button"
          aria-label={d.a11y.decrease}
          onClick={() => nudge(-step)}
          disabled={disabled || numeric <= min}
          className="h-12 w-12 shrink-0 rounded-[8px] border border-line-strong text-lg disabled:bg-page-subtle disabled:text-fg-secondary"
        >
          −
        </button>
        <div className="relative flex-1">
          <input
            id={id}
            data-field={fieldName}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="off"
            value={value}
            disabled={disabled}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ')}
            aria-invalid={error ? true : undefined}
            onChange={(event) => onChange(event.target.value)}
            className={cn('field-input h-12 pr-20 tabular')}
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-fg-secondary">
            {unit}
          </span>
        </div>
        <button
          type="button"
          aria-label={d.a11y.increase}
          onClick={() => nudge(step)}
          disabled={disabled || numeric >= max}
          className="h-12 w-12 shrink-0 rounded-[8px] border border-line-strong text-lg disabled:bg-page-subtle disabled:text-fg-secondary"
        >
          +
        </button>
      </div>
      <p id={hintId} className="caption">
        {fmt(d.common.quantityAvailable, { count: formatNumber(max) })}
        {step > 1 ? ` · ${fmt(d.validation.quantityStep, { step })}` : ''}
      </p>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
