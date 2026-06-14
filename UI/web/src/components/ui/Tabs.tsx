import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';

export function Tabs({
  items,
  value,
  onChange,
  id = 'tabs',
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  return (
    <div className="flex gap-6 overflow-x-auto border-b border-line">
      {items.map((it) => {
        const active = it === value;
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={cn(
              'relative whitespace-nowrap pb-2.5 pt-1 transition-colors',
              active ? 't-body-strong text-accent' : 't-body text-fg-secondary hover:text-fg',
            )}
          >
            {it}
            {active && (
              <motion.span
                layoutId={`${id}-underline`}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Filter chips row (mobile / compact filtering). */
export function Chips({
  items,
  value,
  onChange,
}: {
  items: string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {items.map((it) => {
        const active = it === value;
        return (
          <button
            key={it}
            onClick={() => onChange(it)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3.5 py-2 t-small-strong transition-colors',
              active
                ? 'border-accent bg-accent-subtle text-accent'
                : 'border-line-strong bg-surface text-fg-secondary hover:text-fg',
            )}
          >
            {it}
          </button>
        );
      })}
    </div>
  );
}
