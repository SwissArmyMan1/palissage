import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { useEffect, type ReactNode } from 'react';

const ease = [0.2, 0, 0, 1] as const;

/** Dialog that renders as a centered modal on desktop and a bottom sheet on mobile. */
export function Modal({
  open,
  onClose,
  title,
  children,
  size = 'md',
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'md' | 'lg';
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  const w = size === 'lg' ? 'sm:max-w-[640px]' : 'sm:max-w-[480px]';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="modal"
          className="fixed inset-0 z-50 flex items-end justify-center bg-[#231d18]/50 sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        >
          <motion.div
            className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-lg bg-surface shadow-e3 sm:rounded-lg ${w}`}
            initial={{ y: '4%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '4%', opacity: 0 }}
            transition={{ duration: 0.22, ease }}
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mt-2 h-1 w-8 rounded-full bg-line-strong sm:hidden" />
            {title && (
              <div className="flex items-center justify-between gap-4 px-6 pb-4 pt-4">
                <h3 className="t-h3 text-fg">{title}</h3>
                <button onClick={onClose} aria-label="Close" className="text-fg-secondary hover:text-fg">
                  <X size={20} />
                </button>
              </div>
            )}
            <div className="px-6 pb-6">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
