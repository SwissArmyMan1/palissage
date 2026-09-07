import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

function shouldAnimate(): boolean {
  if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') return false;
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * A secondary section fades and lifts once as it enters the viewport.
 * The hidden state is only ever entered when an observer is available and
 * motion is allowed, so a failed observer can never leave content invisible.
 */
export function Reveal({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(() => !shouldAnimate());

  useEffect(() => {
    const element = ref.current;
    if (!element || !shouldAnimate()) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        'transition-[opacity,transform] duration-[var(--motion-reveal)] ease-enter motion-reduce:transition-none',
        shown ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-90',
        className,
      )}
    >
      {children}
    </div>
  );
}
