import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Column<T> = {
  key: string;
  header: string;
  /** Right-aligned, tabular figures. */
  numeric?: boolean;
  render: (row: T) => ReactNode;
  /** Hidden on the mobile definition-list rendering when false. */
  mobile?: boolean;
};

export type DataTableProps<T> = {
  caption: string;
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  /** Card title used by the mobile layout. */
  mobileTitle?: (row: T) => ReactNode;
  empty?: ReactNode;
  className?: string;
};

/**
 * One table, two presentations: a real `<table>` from 768px and a definition
 * list below it, so a phone keeps every value rather than scrolling sideways.
 */
export function DataTable<T>({ caption, columns, rows, rowKey, mobileTitle, empty, className }: DataTableProps<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={className}>
      <table className="hidden w-full text-sm md:table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-line">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-11 px-4 py-3 text-left align-middle text-xs font-semibold uppercase tracking-wide text-fg-secondary',
                  column.numeric && 'text-right',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-page-subtle/60">
              {columns.map((column) => (
                <td
                  key={column.key}
                  className={cn('min-h-16 px-4 py-4 align-middle', column.numeric && 'text-right tabular')}
                >
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <ul className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <li key={rowKey(row)} className="panel-flush p-4">
            {mobileTitle ? <div className="mb-3 font-medium">{mobileTitle(row)}</div> : null}
            <dl className="flex flex-col gap-2 text-sm">
              {columns
                .filter((column) => column.mobile !== false)
                .map((column) => (
                  <div key={column.key} className="flex items-baseline justify-between gap-4">
                    <dt className="text-fg-secondary">{column.header}</dt>
                    <dd className={cn('text-right font-medium', column.numeric && 'tabular')}>{column.render(row)}</dd>
                  </div>
                ))}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}
