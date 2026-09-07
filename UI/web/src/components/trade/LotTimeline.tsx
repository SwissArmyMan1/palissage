import { useI18n } from '@/app/i18n-context';
import { cn } from '@/lib/cn';

export type TimelineEvent = {
  label: string;
  detail?: string;
  occurredAt?: string;
  state: 'done' | 'current' | 'future' | 'skipped';
  source?: string;
};

/**
 * An ordered list where a future step is visually and textually distinct from
 * a recorded one. Progress is never conveyed by the connecting line alone.
 */
export function LotTimeline({ events, label }: { events: TimelineEvent[]; label: string }) {
  const { d, formatDate } = useI18n();
  return (
    <ol aria-label={label} className="flex flex-col">
      {events.map((event, index) => (
        <li key={index} className="relative flex gap-4 pb-5 last:pb-0">
          <div className="flex flex-col items-center">
            <span
              aria-hidden="true"
              className={cn(
                'mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                event.state === 'done' && 'border-vine bg-vine',
                event.state === 'current' && 'border-accent bg-accent',
                event.state === 'future' && 'border-line-strong bg-surface',
                event.state === 'skipped' && 'border-line bg-page-subtle',
              )}
            />
            {index < events.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn('w-0.5 flex-1', event.state === 'done' ? 'bg-vine/40' : 'bg-line')}
              />
            ) : null}
          </div>
          <div className="min-w-0 pb-1">
            <p className={cn('text-sm font-medium', event.state === 'future' && 'text-fg-secondary')}>
              {event.label}
              {event.state === 'skipped' ? (
                <span className="ml-2 text-xs font-normal text-fg-secondary">({d.passport.notRecorded})</span>
              ) : null}
            </p>
            {event.detail ? <p className="text-sm text-fg-secondary">{event.detail}</p> : null}
            {event.occurredAt ? (
              <p className="caption mt-0.5">
                {formatDate(event.occurredAt)}
                {event.source ? ` · ${event.source}` : ''}
              </p>
            ) : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
