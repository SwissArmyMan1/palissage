import { useI18n } from '@/app/i18n-context';
import { cn } from '@/lib/cn';

/** Changing language never changes the settlement currency or loses a draft. */
export function LocaleSwitch({ className }: { className?: string }) {
  const { locale, setLocale, d } = useI18n();
  return (
    <div className={cn('inline-flex items-center rounded-[8px] border border-line-strong p-0.5', className)} role="group" aria-label={d.nav.language}>
      {(['en', 'fr'] as const).map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => setLocale(value)}
          aria-pressed={locale === value}
          className={cn(
            'min-h-[36px] min-w-[40px] rounded-[6px] px-2 text-sm font-medium transition-colors duration-[var(--motion-base)]',
            locale === value ? 'bg-accent text-white' : 'text-fg-secondary hover:text-fg',
          )}
        >
          {value.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
