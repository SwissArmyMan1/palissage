import { motion } from 'framer-motion';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/lib/theme';

/** 64×32 light/dark pill toggle with a spring-animated thumb. */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = theme === 'dark';
  return (
    <button
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label="Toggle theme"
      className="relative flex h-8 w-16 items-center rounded-full border border-line bg-page-subtle px-1"
    >
      <motion.span
        layout
        transition={{ type: 'spring', stiffness: 500, damping: 32 }}
        className="grid h-6 w-6 place-items-center rounded-full bg-surface shadow-e1"
        style={{ marginLeft: dark ? 'auto' : 0 }}
      >
        {dark ? (
          <Moon size={14} className="text-fg-secondary" />
        ) : (
          <Sun size={14} className="text-fg-secondary" />
        )}
      </motion.span>
    </button>
  );
}
