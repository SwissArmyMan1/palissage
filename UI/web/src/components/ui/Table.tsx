import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface Column<T> {
  key: string;
  header: string;
  width: string; // CSS grid track, e.g. '1fr' | '120px'
  align?: 'left' | 'right';
  cell: (row: T) => ReactNode;
  /** used as the card title on mobile */
  primary?: boolean;
  /** shown as a label:value pair on mobile cards */
  card?: boolean;
}

/**
 * Desktop: aligned grid "table" (caption-caps header, 56px rows).
 * Mobile: collapses into a stack of cards so there is never any horizontal scroll.
 */
export function ResponsiveTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
}) {
  const template = columns.map((c) => c.width).join(' ');
  const primary = columns.find((c) => c.primary);
  const cardCols = columns.filter((c) => c.card);
  const statusCol = columns.find((c) => c.key === 'status');

  return (
    <div className="overflow-hidden rounded-lg border border-line bg-surface">
      {/* desktop */}
      <div className="hidden md:block">
        <div
          className="grid items-center gap-4 bg-page-subtle px-4 py-2.5"
          style={{ gridTemplateColumns: template }}
        >
          {columns.map((c) => (
            <span
              key={c.key}
              className={cn('t-caption text-fg-secondary', c.align === 'right' && 'text-right')}
            >
              {c.header}
            </span>
          ))}
        </div>
        {rows.map((row) => (
          <div
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className={cn(
              'grid items-center gap-4 border-t border-line px-4',
              'min-h-14 py-2',
              onRowClick && 'cursor-pointer transition-colors hover:bg-page-subtle',
            )}
            style={{ gridTemplateColumns: template }}
          >
            {columns.map((c) => (
              <div key={c.key} className={cn(c.align === 'right' && 'flex justify-end text-right')}>
                {c.cell(row)}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* mobile cards */}
      <div className="flex flex-col md:hidden">
        {rows.map((row) => (
          <button
            key={rowKey(row)}
            onClick={() => onRowClick?.(row)}
            className="flex flex-col gap-2 border-t border-line p-4 text-left first:border-t-0"
          >
            <div className="flex items-center gap-2">
              <span className="t-body-strong flex-1 text-fg">
                {primary?.cell(row)}
              </span>
              {statusCol?.cell(row)}
            </div>
            {cardCols.map((c) => (
              <div key={c.key} className="flex items-baseline justify-between gap-2">
                <span className="t-small text-fg-secondary">{c.header}</span>
                <span className="t-small text-fg">{c.cell(row)}</span>
              </div>
            ))}
            {onRowClick && (
              <span className="flex justify-end text-fg-tertiary">
                <ChevronRight size={16} />
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
