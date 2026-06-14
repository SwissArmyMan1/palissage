import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

const ease = [0.2, 0, 0, 1] as const;

/** Animated page wrapper — fades/slides on route change, scrolls to top. */
export function Page({
  children,
  className,
  scroll,
}: {
  children: ReactNode;
  className?: string;
  scroll?: HTMLElement | null;
}) {
  const { pathname } = useLocation();
  useEffect(() => {
    (scroll ?? window).scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, scroll]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.24, ease }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  );
}

/** Staggered children reveal helper for grids/lists. */
export function Stagger({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3, ease } },
      }}
    >
      {children}
    </motion.div>
  );
}
