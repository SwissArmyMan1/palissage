import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import type { ReactNode, ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Kind = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'md' | 'sm';

const base =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap ' +
  'transition-[background-color,border-color,color,transform,box-shadow] duration-150 ease-brand ' +
  'active:scale-[.98] disabled:pointer-events-none disabled:opacity-60 select-none';

const kinds: Record<Kind, string> = {
  primary: 'bg-accent text-fg-inverse hover:bg-accent-hover active:bg-accent-pressed',
  secondary: 'border border-line-strong text-fg hover:bg-page-subtle',
  ghost: 'text-fg hover:bg-page-subtle',
  danger: 'bg-danger text-fg-inverse hover:opacity-90 active:opacity-80',
};

const sizes: Record<Size, string> = {
  md: 'h-10 px-4 text-[16px]',
  sm: 'h-8 px-3 text-[14px]',
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  kind?: Kind;
  size?: Size;
  loading?: boolean;
  icon?: ReactNode;
  to?: string;
  full?: boolean;
  children?: ReactNode;
}

export function Button({
  kind = 'primary',
  size = 'md',
  loading,
  icon,
  to,
  full,
  className,
  children,
  ...rest
}: Props) {
  const cls = cn(base, kinds[kind], sizes[size], full && 'w-full', className);

  const inner = loading ? (
    <Loader2 size={size === 'sm' ? 14 : 16} className="animate-spin" />
  ) : (
    <>
      {icon}
      {children}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  }
  return (
    <button className={cls} disabled={loading || rest.disabled} {...rest}>
      {inner}
    </button>
  );
}
