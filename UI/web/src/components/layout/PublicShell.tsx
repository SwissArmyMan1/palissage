import { useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment } from '@/app/environment-context';
import { Logo, Trellis } from './Logo';
import { ButtonLink } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Dialog';
import { LocaleSwitch } from './LocaleSwitch';
import { cn } from '@/lib/cn';

const SECTIONS = [
  { key: 'forWineries', href: '/#for-wineries' },
  { key: 'forBuyers', href: '/#for-buyers' },
  { key: 'howItWorks', href: '/#how-it-works' },
] as const;

export function PublicShell() {
  const { d } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const onLanding = location.pathname === '/';

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page">
      <a href="#main" className="skip-link">
        {d.brand.skipToContent}
      </a>

      <header className="sticky top-0 z-[20] border-b border-line bg-page">
        <div className="container-public flex h-[var(--header-height)] items-center justify-between gap-6">
          <Logo />
          <nav aria-label={d.a11y.mainNavigation} className="hidden items-center gap-1 lg:flex">
            {SECTIONS.map((section) => (
              <a
                key={section.key}
                href={onLanding ? section.href.replace('/', '') : section.href}
                className="rounded-[8px] px-3 py-2 text-sm font-medium text-fg-secondary transition-colors duration-[var(--motion-base)] hover:text-fg"
              >
                {d.nav[section.key]}
              </a>
            ))}
            <NavLink
              to="/pilot"
              className={({ isActive }) =>
                cn(
                  'rounded-[8px] px-3 py-2 text-sm font-medium transition-colors duration-[var(--motion-base)]',
                  isActive ? 'text-accent' : 'text-fg-secondary hover:text-fg',
                )
              }
            >
              {d.nav.pilot}
            </NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden sm:block">
              <LocaleSwitch />
            </div>
            <ButtonLink to="/demo" size="compact" className="hidden sm:inline-flex">
              {d.nav.exploreDemo}
            </ButtonLink>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              aria-label={d.a11y.openMenu}
              className="inline-flex h-11 w-11 items-center justify-center rounded-[8px] border border-line-strong lg:hidden"
            >
              <svg width="18" height="14" viewBox="0 0 18 14" aria-hidden="true">
                <path d="M0 1h18M0 7h18M0 13h18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <Drawer open={menuOpen} title={d.nav.menu} onClose={() => setMenuOpen(false)} closeLabel={d.nav.closeMenu}>
        <nav aria-label={d.a11y.mainNavigation} className="flex flex-col gap-1">
          {SECTIONS.map((section) => (
            <a
              key={section.key}
              href={section.href}
              onClick={() => setMenuOpen(false)}
              className="rounded-[8px] px-3 py-3 text-base font-medium hover:bg-page-subtle"
            >
              {d.nav[section.key]}
            </a>
          ))}
          <Link to="/pilot" onClick={() => setMenuOpen(false)} className="rounded-[8px] px-3 py-3 text-base font-medium hover:bg-page-subtle">
            {d.nav.pilot}
          </Link>
          <Link to="/marketplace" onClick={() => setMenuOpen(false)} className="rounded-[8px] px-3 py-3 text-base font-medium hover:bg-page-subtle">
            {d.nav.exploreLots}
          </Link>
        </nav>
        <div className="mt-6 flex flex-col gap-4">
          <LocaleSwitch />
          <ButtonLink to="/demo" onClick={() => setMenuOpen(false)} fullWidth>
            {d.nav.exploreDemo}
          </ButtonLink>
        </div>
      </Drawer>

      <main id="main" className="flex-1">
        <Outlet />
      </main>

      <PublicFooter />
    </div>
  );
}

export function PublicFooter() {
  const { d, fmt, formatDate } = useI18n();
  const { ledger } = useEnvironment();
  const links = [
    { to: '/pilot', label: d.footer.pilot },
    { to: '/testnet', label: d.footer.testnet },
    { to: '/legal/prototype', label: d.footer.prototype },
    { to: '/legal/privacy', label: d.footer.privacy },
    { to: '/legal/credits', label: d.footer.credits },
  ];
  return (
    <footer className="border-t border-line bg-page-subtle">
      <div className="container-public grid gap-8 py-12 md:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="flex items-center gap-2.5">
            <Trellis className="h-7 w-7 text-accent" />
            <span className="font-serif text-lg">Palissage</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-fg-secondary">{d.footer.purpose}</p>
        </div>
        <nav aria-label="Footer" className="flex flex-col gap-2">
          {links.map((link) => (
            <Link key={link.to} to={link.to} className="text-sm text-fg-secondary hover:text-fg">
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="container-public flex flex-col gap-2 border-t border-line py-6 text-xs text-fg-secondary">
        <p>{d.footer.notice}</p>
        {d.footer.health ? <p>{d.footer.health}</p> : null}
        <p>{fmt(d.demo.snapshot, { date: formatDate(ledger.nowIso) })}</p>
      </div>
    </footer>
  );
}
