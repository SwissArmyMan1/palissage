import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'compact' | 'default' | 'hero';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-white hover:bg-accent-hover active:bg-accent-pressed border border-transparent',
  secondary: 'bg-surface text-fg border border-line-strong hover:bg-page-subtle',
  ghost: 'bg-transparent text-accent border border-transparent hover:bg-accent-subtle',
  danger: 'bg-danger text-white border border-transparent hover:brightness-95',
};

const SIZES: Record<ButtonSize, string> = {
  compact: 'min-h-[40px] px-3 text-sm',
  default: 'min-h-[48px] px-5 text-[0.9375rem]',
  hero: 'min-h-[52px] px-6 text-base',
};

const BASE =
  'inline-flex items-center justify-center gap-2 rounded-[8px] font-medium text-center ' +
  'transition-colors duration-[var(--motion-base)] ease-standard ' +
  'active:scale-[0.985] motion-reduce:active:scale-100 ' +
  'disabled:cursor-not-allowed disabled:bg-page-subtle disabled:text-fg-secondary ' +
  'disabled:border-line disabled:hover:bg-page-subtle';

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  loadingLabel?: string;
  icon?: ReactNode;
  fullWidth?: boolean;
};

export type ButtonProps = CommonProps & ButtonHTMLAttributes<HTMLButtonElement>;

/**
 * An action is a `button`; navigation is a link. A loading button keeps its
 * label and width so the layout never jumps, and stays disabled so a second
 * click cannot submit twice.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'default', loading = false, loadingLabel, icon, fullWidth, className, children, disabled, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      <span>{loading && loadingLabel ? loadingLabel : children}</span>
    </button>
  );
});

export type ButtonLinkProps = CommonProps & LinkProps & { external?: boolean };

export function ButtonLink({
  variant = 'primary',
  size = 'default',
  icon,
  fullWidth,
  className,
  children,
  external,
  ...rest
}: ButtonLinkProps) {
  if (external) {
    return (
      <a
        href={String(rest.to)}
        target="_blank"
        rel="noreferrer noopener"
        className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)}
      >
        {icon}
        <span>{children}</span>
      </a>
    );
  }
  return (
    <Link className={cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className)} {...rest}>
      {icon}
      <span>{children}</span>
    </Link>
  );
}

/** Rotation stops as soon as loading ends; reduced motion shows a static mark. */
export function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('h-4 w-4 animate-spin motion-reduce:animate-none', className)}
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{ animationDuration: '900ms', animationTimingFunction: 'linear' }}
    >
      <circle cx="8" cy="8" r="6.5" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2" />
      <path d="M8 1.5a6.5 6.5 0 0 1 6.5 6.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function IconButton({
  label,
  children,
  className,
  ...rest
}: { label: string } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      aria-label={label}
      className={cn(
        'inline-flex h-11 w-11 items-center justify-center rounded-[8px] text-fg',
        'transition-colors duration-[var(--motion-base)] ease-standard hover:bg-page-subtle',
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
