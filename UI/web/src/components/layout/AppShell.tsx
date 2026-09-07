import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import type { Role } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useModeLink } from '@/app/environment-context';
import { Logo } from './Logo';
import { LocaleSwitch } from './LocaleSwitch';
import { Drawer } from '@/components/ui/Dialog';
import { ModeBanner } from '@/components/ui/StatusBadge';
import { EnvironmentGate } from '@/features/system/EnvironmentGate';
import { cn } from '@/lib/cn';

type NavItem = { to: string; label: string };

function navFor(role: Role, d: ReturnType<typeof useI18n>['d']): NavItem[] {
  switch (role) {
    case 'buyer':
      return [
        { to: '/app/buyer/overview', label: d.nav.overview },
        { to: '/app/buyer/allocations', label: d.nav.allocations },
        { to: '/app/buyer/secondary', label: d.nav.secondary },
        { to: '/app/buyer/deliveries', label: d.nav.deliveries },
        { to: '/app/buyer/account', label: d.nav.account },
      ];
    case 'winery':
      return [
        { to: '/app/winery/overview', label: d.nav.overview },
        { to: '/app/winery/lots', label: d.nav.lots },
        { to: '/app/winery/finance', label: d.nav.finance },
        { to: '/app/winery/deliveries', label: d.nav.deliveries },
        { to: '/app/winery/account', label: d.nav.account },
      ];
    case 'operations':
      return [
        { to: '/app/operations/overview', label: d.nav.overview },
        { to: '/app/operations/participants', label: d.nav.participants },
        { to: '/app/operations/verification', label: d.nav.verification },
        { to: '/app/operations/redemptions', label: d.nav.redemptions },
        { to: '/app/operations/account', label: d.nav.account },
      ];
    default:
      return [];
  }
}

/**
 * The workspace frame. Mode is displayed permanently in the shell rather than
 * only in a welcome dialog, and it is stored separately from the demo persona.
 */
export function AppShell({ role }: { role: Role }) {
  const { d } = useI18n();
  const { mode, actor, ledger } = useEnvironment();
  const link = useModeLink();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  if (!mode) return <EnvironmentGate />;

  const items = navFor(role, d);
  const organisation = actor?.displayLabel ?? ledger.participants['demo-buyer-001'].displayLabel;

  const navList = (
    <nav aria-label={d.a11y.workspaceNavigation} className="flex flex-col gap-0.5">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={link(item.to)}
          end={item.to.endsWith('overview')}
          onClick={() => setMenuOpen(false)}
          className={({ isActive }) =>
            cn(
              'flex min-h-[44px] items-center rounded-[8px] px-3 text-sm font-medium transition-colors duration-[var(--motion-base)]',
              isActive ? 'bg-accent-subtle text-accent' : 'text-fg-secondary hover:bg-page-subtle hover:text-fg',
            )
          }
        >
          {item.label}
        </NavLink>
      ))}
      <Link
        to={link('/app/marketplace')}
        onClick={() => setMenuOpen(false)}
        className="mt-2 flex min-h-[44px] items-center rounded-[8px] border border-line px-3 text-sm font-medium text-fg-secondary hover:text-fg"
      >
        {d.nav.exploreLots}
      </Link>
    </nav>
  );

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <a href="#main" className="skip-link">
        {d.brand.skipToContent}
      </a>
      <ModeBanner mode={mode} label={mode === 'demo' ? d.mode.demoLong : d.mode.testnetLong} />

      <header className="sticky top-0 z-[20] border-b border-line bg-page">
        <div className="flex h-[var(--header-height)] items-center justify-between gap-4 px-4 xl:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={d.a11y.openMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-line-strong xl:hidden"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
                <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
            <Logo to={link(items[0]?.to ?? '/')} />
          </div>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-fg-secondary sm:block">{organisation}</p>
            <LocaleSwitch />
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} title={d.nav.workspace} onClose={() => setMenuOpen(false)} closeLabel={d.nav.closeMenu}>
        <p className="mb-4 text-sm text-fg-secondary">{organisation}</p>
        {navList}
      </Drawer>

      <div className="flex flex-1 gap-8 px-4 py-6 xl:px-8">
        <aside className="hidden w-[248px] shrink-0 xl:block">
          <p className="caption mb-3 px-3">{organisation}</p>
          {navList}
        </aside>
        <main id="main" key={location.pathname} className="min-w-0 flex-1 pb-10">
          <Outlet />
        </main>
      </div>

    </div>
  );
}

/** Detail-page frame: breadcrumb → title → states → content → summary. */
export function WorkspacePage({
  title,
  description,
  breadcrumbs,
  actions,
  aside,
  children,
  status,
}: {
  title: string;
  description?: ReactNode;
  breadcrumbs?: { to?: string; label: string }[];
  actions?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  status?: ReactNode;
}) {
  const { d } = useI18n();
  const link = useModeLink();
  return (
    <div className="mx-auto flex max-w-[1180px] flex-col gap-6">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label={d.a11y.breadcrumb}>
          <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-secondary">
            {breadcrumbs.map((crumb, index) => (
              <li key={index} className="flex items-center gap-1">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {crumb.to ? (
                  <Link to={link(crumb.to)} className="hover:text-fg hover:underline">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-fg">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="h1 outline-none">{title}</h1>
          {description ? <p className="lead mt-2">{description}</p> : null}
          {status ? <div className="mt-3 flex flex-wrap items-center gap-2">{status}</div> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
      </div>

      {aside ? (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
          <div className="flex min-w-0 flex-col gap-6">{children}</div>
          <div className="flex flex-col gap-4">{aside}</div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">{children}</div>
      )}
    </div>
  );
}
