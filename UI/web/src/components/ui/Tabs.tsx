import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { cn } from '@/lib/cn';

export type TabItem = { id: string; label: string; count?: number };

/**
 * Tabs write the active panel into `?tab=`, so a deep link and Back both work.
 * They are links, not buttons, because they change the address.
 */
export function Tabs({
  items,
  activeId,
  label,
  param = 'tab',
}: {
  items: TabItem[];
  activeId: string;
  label: string;
  param?: string;
}) {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  return (
    <div className="overflow-x-auto">
      <nav aria-label={label} className="flex min-w-max gap-1 border-b border-line">
        {items.map((item) => {
          const next = new URLSearchParams(searchParams);
          next.set(param, item.id);
          const active = item.id === activeId;
          return (
            <Link
              key={item.id}
              to={{ pathname: location.pathname, search: `?${next.toString()}` }}
              aria-current={active ? 'page' : undefined}
              replace
              className={cn(
                'relative -mb-px inline-flex min-h-[44px] items-center gap-2 border-b-2 px-4 text-sm font-medium',
                'transition-colors duration-[var(--motion-base)] ease-standard',
                active ? 'border-accent text-accent' : 'border-transparent text-fg-secondary hover:text-fg',
              )}
            >
              {item.label}
              {typeof item.count === 'number' ? (
                <span className="rounded-full bg-page-subtle px-2 py-0.5 text-xs tabular">{item.count}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
