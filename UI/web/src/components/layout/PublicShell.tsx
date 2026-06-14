import { useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

const ease = [0.2, 0, 0, 1] as const;

/** No chrome — just smooth crossfade between public routes. */
export function PublicShell() {
  const outlet = useOutlet();
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.24, ease }}
      >
        {outlet}
      </motion.div>
    </AnimatePresence>
  );
}
