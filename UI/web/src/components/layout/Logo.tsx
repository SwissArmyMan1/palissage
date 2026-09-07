import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

/**
 * The trellis motif: three posts and two crossbars, drawn in code.
 * Decorative wherever the wordmark is present.
 */
export function Trellis({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden="true" fill="none">
      <g stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M12 12V68" />
        <path d="M40 12V68" />
        <path d="M68 12V68" />
        <path d="M8 28H72" />
        <path d="M8 52H72" />
      </g>
    </svg>
  );
}

export function Logo({ className, to = '/' }: { className?: string; to?: string }) {
  return (
    <Link to={to} className={cn('inline-flex items-center gap-2.5 text-fg', className)}>
      <Trellis className="h-7 w-7 text-accent" />
      <span className="font-serif text-xl font-medium tracking-tight">Palissage</span>
    </Link>
  );
}
