import { Link, useLocation } from 'react-router-dom';
import type { MouseEvent } from 'react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/cn';

/**
 * Brand logo from the supplied PNGs (550×240). Picks the asset for the
 * active theme.
 *  - variant="full" → the whole wordmark logo (default).
 *  - variant="mark" → a clean square crop of the centre vine panel only
 *    (wordmark + tagline excluded) — used in compact top bars and as the
 *    faint decorative element on the landing hero.
 *  When `to` is set the logo is a link back to that page's top. Clicking it
 *  while already on `to` smooth-scrolls to the top instead of re-navigating.
 *
 *  Width/height come entirely from `className` (callers pass e.g. `w-48`),
 *  so there is no default size class to conflict with.
 */
export function Logo({
  variant = 'full',
  to,
  className,
}: {
  variant?: 'full' | 'mark';
  to?: string;
  className?: string;
}) {
  const { theme } = useTheme();
  const { pathname } = useLocation();
  const dark = theme === 'dark';

  const inner =
    variant === 'mark' ? (
      <img
        src={dark ? '/img/brand/mark-dark.png' : '/img/brand/mark-light.png'}
        alt="Palissage"
        className={cn('object-contain select-none', className)}
      />
    ) : (
      <img
        src={dark ? '/img/brand/logo-dark.png' : '/img/brand/logo-light.png'}
        alt="Palissage — real world wine assets"
        className={cn('h-auto select-none', className)}
      />
    );

  if (to) {
    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
      // Already on the destination → don't re-navigate, just return to the top.
      if (pathname === to) {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    return (
      <Link
        to={to}
        onClick={handleClick}
        aria-label="Palissage — home"
        className="inline-flex shrink-0 items-center transition-opacity hover:opacity-80"
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
