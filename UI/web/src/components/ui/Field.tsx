import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/cn';

const fieldBox =
  'flex h-10 w-full items-center gap-2 rounded-md border bg-surface px-3 ' +
  'border-line-strong transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20';

export function Field({
  label,
  error,
  children,
  className,
}: {
  label?: string;
  error?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn('flex flex-col gap-2', className)}>
      {label && <span className="t-small text-fg-secondary">{label}</span>}
      {children}
      {error && <span className="t-small text-danger">{error}</span>}
    </label>
  );
}

export function Input({
  label,
  error,
  mono,
  suffix,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
  mono?: boolean;
  suffix?: string;
}) {
  return (
    <Field label={label} error={error} className={className}>
      <span className={cn(fieldBox, error && 'border-danger ring-2 ring-danger/20')}>
        <input
          className={cn(
            'w-full bg-transparent outline-none placeholder:text-fg-tertiary',
            mono ? 't-mono' : 't-body',
          )}
          {...rest}
        />
        {suffix && <span className="t-caption text-fg-tertiary">{suffix}</span>}
      </span>
    </Field>
  );
}

export function SearchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={cn(fieldBox, className)}>
      <Search size={16} className="shrink-0 text-fg-tertiary" />
      <input
        className="w-full bg-transparent outline-none t-body placeholder:text-fg-tertiary"
        {...rest}
      />
    </span>
  );
}

export function Select({
  label,
  className,
  children,
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement> & { label?: string }) {
  return (
    <Field label={label} className={className}>
      <span className={fieldBox}>
        <select
          className="w-full cursor-pointer bg-transparent outline-none t-body text-fg"
          {...rest}
        >
          {children}
        </select>
      </span>
    </Field>
  );
}
