import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type DialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Filters and previews may close on a backdrop click; reviews may not. */
  dismissOnBackdrop?: boolean;
  closeLabel: string;
  size?: 'review' | 'wide';
};

/**
 * A modal with a real focus trap, an accessible name, an inert background and
 * Escape to close. Focus lands on the heading — never on an irreversible
 * Confirm button.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  footer,
  dismissOnBackdrop = false,
  closeLabel,
  size = 'review',
}: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const opener = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    headingRef.current?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      opener.current?.focus?.();
    };
  }, [open]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable || focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center"
      onKeyDown={onKeyDown}
      role="presentation"
    >
      <div
        className="motion-backdrop absolute inset-0 bg-[var(--c-overlay)]"
        onClick={dismissOnBackdrop ? onClose : undefined}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={cn(
          'motion-dialog relative flex max-h-[100dvh] w-full flex-col overflow-hidden bg-surface shadow-overlay',
          'sm:max-h-[calc(100dvh-48px)] sm:rounded-panel',
          size === 'review' ? 'sm:max-w-dialog' : 'sm:max-w-3xl',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <h2 id="dialog-title" ref={headingRef} tabIndex={-1} className="h3 outline-none">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="-mr-2 -mt-1 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[8px] text-fg-secondary hover:bg-page-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer ? <div className="border-t border-line bg-page px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

/** A drawer for mobile filters and workspace navigation. */
export function Drawer({
  open,
  title,
  onClose,
  children,
  footer,
  closeLabel,
}: Omit<DialogProps, 'dismissOnBackdrop' | 'size'>) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panelRef.current?.querySelector<HTMLElement>('button, a, input')?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[50]" role="presentation">
      <div className="motion-backdrop absolute inset-0 bg-[var(--c-overlay)]" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="motion-drawer absolute inset-y-0 right-0 flex h-[100dvh] w-full max-w-sm flex-col bg-surface shadow-overlay"
      >
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <p className="font-medium">{title}</p>
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel}
            className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] text-fg-secondary hover:bg-page-subtle"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4" style={{ paddingBottom: 'max(16px, env(safe-area-inset-bottom))' }}>
          {children}
        </div>
        {footer ? <div className="border-t border-line px-4 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}
