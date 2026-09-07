import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type FieldShellProps = {
  label: string;
  hint?: string;
  error?: string;
  required?: boolean;
  optionalLabel?: string;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
};

/**
 * Label above the control, hint and error wired through `aria-describedby`.
 * A placeholder never stands in for a label.
 */
export function Field({ label, hint, error, required, optionalLabel, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="label text-fg">
        {label}
        {required ? (
          <span className="text-accent" aria-hidden="true">
            {' '}
            *
          </span>
        ) : optionalLabel ? (
          <span className="ml-1 font-normal text-fg-secondary">({optionalLabel})</span>
        ) : null}
      </label>
      {hint ? (
        <p id={hintId} className="caption">
          {hint}
        </p>
      ) : null}
      {children({ id, describedBy, invalid: Boolean(error) })}
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  fieldName?: string;
};

export function TextField({ label, hint, error, required, optionalLabel, fieldName, className, ...rest }: TextFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          data-field={fieldName}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          className={cn('field-input', className)}
          {...rest}
        />
      )}
    </Field>
  );
}

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  fieldName?: string;
};

export function SelectField({ label, hint, error, required, optionalLabel, fieldName, className, children, ...rest }: SelectFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel}>
      {({ id, describedBy, invalid }) => (
        <select
          id={id}
          data-field={fieldName}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          className={cn('field-input appearance-none bg-surface pr-9', className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1.5 6 6.5 11 1.5' fill='none' stroke='%236B625D' stroke-width='1.6' stroke-linecap='round'/%3E%3C/svg%3E\")",
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'right 12px center',
          }}
          {...rest}
        >
          {children}
        </select>
      )}
    </Field>
  );
}

export type TextAreaFieldProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'id'> & {
  label: string;
  hint?: string;
  error?: string;
  optionalLabel?: string;
  fieldName?: string;
};

export function TextAreaField({ label, hint, error, required, optionalLabel, fieldName, className, ...rest }: TextAreaFieldProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required} optionalLabel={optionalLabel}>
      {({ id, describedBy, invalid }) => (
        <textarea
          id={id}
          data-field={fieldName}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          required={required}
          rows={4}
          className={cn('field-input min-h-[112px] resize-y', className)}
          {...rest}
        />
      )}
    </Field>
  );
}

export function CheckboxField({
  label,
  description,
  error,
  ...rest
}: { label: ReactNode; description?: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId();
  const errorId = error ? `${id}-error` : undefined;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          aria-describedby={errorId}
          aria-invalid={error ? true : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--c-accent)]"
          {...rest}
        />
        <label htmlFor={id} className="text-sm leading-6">
          {label}
          {description ? <span className="block text-fg-secondary">{description}</span> : null}
        </label>
      </div>
      {error ? (
        <p id={errorId} className="text-sm font-medium text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function RadioGroup({
  legend,
  name,
  value,
  options,
  onChange,
  error,
}: {
  legend: string;
  name: string;
  value: string;
  options: { value: string; label: string; description?: string; disabled?: boolean }[];
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="label mb-1">{legend}</legend>
      {options.map((option) => (
        <label
          key={option.value}
          className={cn(
            'flex min-h-[48px] cursor-pointer items-start gap-3 rounded-[8px] border p-3',
            value === option.value ? 'border-accent bg-accent-subtle' : 'border-line-strong bg-surface',
            option.disabled && 'cursor-not-allowed opacity-100',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            disabled={option.disabled}
            onChange={() => onChange(option.value)}
            className="mt-1 h-4 w-4 accent-[var(--c-accent)]"
          />
          <span className="text-sm leading-6">
            <span className="font-medium">{option.label}</span>
            {option.description ? <span className="block text-fg-secondary">{option.description}</span> : null}
          </span>
        </label>
      ))}
      {error ? <p className="text-sm font-medium text-danger">{error}</p> : null}
    </fieldset>
  );
}

/** Links each message to its field so the summary is a working shortcut. */
export function ErrorSummary({ title, errors }: { title: string; errors: { field: string; message: string }[] }) {
  if (errors.length === 0) return null;
  return (
    <div role="alert" tabIndex={-1} className="rounded-[8px] border border-danger bg-danger-subtle p-4">
      <p className="text-sm font-semibold text-danger">{title}</p>
      <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-sm text-danger">
        {errors.map((error) => (
          <li key={error.field}>
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={() => {
                const target = document.querySelector<HTMLElement>(`[data-field="${error.field}"]`);
                target?.focus();
              }}
            >
              {error.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
