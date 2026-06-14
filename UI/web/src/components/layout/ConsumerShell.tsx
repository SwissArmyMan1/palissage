import { NavLink, useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Award, ScanLine, User, Wine } from 'lucide-react';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { LogoutButton } from './LogoutButton';
import { zoneLink } from '@/lib/zone';
import { cn } from '@/lib/cn';

const ease = [0.2, 0, 0, 1] as const;

interface Tab {
  to: string;
  label: string;
  icon: ReactNode;
  center?: boolean;
  end?: boolean;
}

const tabs: Tab[] = [
  { to: zoneLink('consumer', '/passport'), label: 'Passport', icon: <Wine size={20} /> },
  { to: zoneLink('consumer', '/achievements'), label: 'Awards', icon: <Award size={20} /> },
  { to: zoneLink('consumer', ''), label: 'Scan', icon: <ScanLine size={24} />, center: true, end: true },
  { to: zoneLink('consumer', '/passport'), label: 'My wines', icon: <Wine size={20} /> },
  { to: zoneLink('consumer', '/profile'), label: 'Profile', icon: <User size={20} /> },
];

export function ConsumerShell() {
  const outlet = useOutlet();
  const location = useLocation();
  return (
    <div className="min-h-screen bg-page">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur">
        <Logo variant="mark" to={zoneLink('consumer', '')} className="h-12 w-12" />
        <span className="flex-1" />
        <ThemeToggle />
        <LogoutButton variant="icon" />
      </header>

      <main className="mx-auto w-full max-w-reading px-4 pb-28 pt-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto flex h-16 max-w-reading border-t border-line bg-surface">
        {tabs.map((t, i) =>
          t.center ? (
            <div key={i} className="relative flex flex-1 items-start justify-center">
              <NavLink
                to={t.to}
                end={t.end}
                className="absolute -top-4 grid h-14 w-14 place-items-center rounded-full bg-accent text-fg-inverse shadow-e2"
                aria-label="Scan"
              >
                {t.icon}
              </NavLink>
            </div>
          ) : (
            <NavLink
              key={i}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'flex flex-1 flex-col items-center justify-center gap-1',
                  isActive ? 'text-accent' : 'text-fg-tertiary',
                )
              }
            >
              {t.icon}
              <span className="t-caption normal-case tracking-normal">{t.label}</span>
            </NavLink>
          ),
        )}
      </nav>
    </div>
  );
}
