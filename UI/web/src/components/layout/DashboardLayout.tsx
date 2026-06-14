import { NavLink, useOutlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { Logo } from './Logo';
import { ThemeToggle } from './ThemeToggle';
import { WalletChip } from './WalletChip';
import { LogoutButton } from './LogoutButton';
import { ROLE_META, type Role } from '@/lib/roles';
import { cn } from '@/lib/cn';

const ease = [0.2, 0, 0, 1] as const;

export interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
}

/** Role shell: persistent sidebar (desktop) + bottom tab bar (mobile).
 *  Only the routed content crossfades on navigation. */
export function RoleShell({
  nav,
  role,
}: {
  nav: NavItem[];
  role: Role;
}) {
  const outlet = useOutlet();
  const location = useLocation();
  const home = nav[0]?.to || '/';
  const meta = ROLE_META[role];
  const zoneLabel = meta.label;

  return (
    <div className="min-h-screen bg-page">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface md:flex">
        <div className="px-5 py-5">
          <Logo to={home} className="w-48" />
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {nav.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-11 items-center gap-3 rounded-md px-4 t-body transition-colors',
                  isActive
                    ? 'bg-accent-subtle text-accent t-body-strong'
                    : 'text-fg hover:bg-page-subtle',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                  )}
                  <span className="shrink-0">{it.icon}</span>
                  {it.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="t-small text-fg-secondary">Theme</span>
            <ThemeToggle />
          </div>
          <WalletChip />
          <LogoutButton className="w-full" />
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur md:hidden">
        <Logo variant="mark" to={home} className="h-12 w-12" />
        <span className="t-body-strong flex-1 text-fg">{zoneLabel}</span>
        <ThemeToggle />
        <LogoutButton variant="icon" />
      </header>

      <div className="md:pl-64">
        <main className="px-4 pb-28 pt-5 md:px-10 md:py-8">
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
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-20 flex h-16 border-t border-line bg-surface md:hidden">
        {nav.slice(0, 5).map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center justify-center gap-1',
                isActive ? 'text-accent' : 'text-fg-tertiary',
              )
            }
          >
            {it.icon}
            <span className="t-caption normal-case tracking-normal">{it.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

/** Page-level title + primary action (sits at the top of each screen's content). */
export function PageHeader({
  title,
  action,
}: {
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <h1 className="t-h1 flex-1 text-fg">{title}</h1>
      {action}
    </div>
  );
}
