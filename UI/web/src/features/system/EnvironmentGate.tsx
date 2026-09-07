import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { ButtonLink } from '@/components/ui/Button';
import { Trellis } from '@/components/layout/Logo';

/**
 * A workspace route reached without an explicit environment never guesses.
 * It asks, keeping the requested destination so the choice continues the
 * journey instead of restarting it.
 */
export function EnvironmentGate() {
  const { d } = useI18n();
  const location = useLocation();
  const target = `${location.pathname}${location.search ? `${location.search}&` : '?'}mode=demo`;

  return (
    <main id="main" className="container-public flex min-h-[100dvh] flex-col items-center justify-center gap-6 py-16">
      <Trellis className="h-12 w-12 text-accent" />
      <h1 className="h1 text-center">{d.mode.chooseEnvironment}</h1>
      <p className="lead text-center">{d.mode.chooseEnvironmentBody}</p>
      <div className="flex flex-wrap justify-center gap-3">
        <ButtonLink to={target}>{d.mode.openDemo}</ButtonLink>
        <ButtonLink to="/testnet" variant="secondary">
          {d.mode.openTestnet}
        </ButtonLink>
      </div>
      <Link to="/" className="link text-sm">
        {d.brand.name}
      </Link>
    </main>
  );
}

export function NotFound({ entity }: { entity?: string }) {
  const { d, fmt } = useI18n();
  return (
    <main id="main" className="container-public flex min-h-[70dvh] flex-col items-start justify-center gap-4 py-16">
      <h1 className="h1">{d.errors.notFound.title}</h1>
      <p className="lead">{fmt(d.errors.notFound.body, { entity: entity ?? 'page' })}</p>
      <div className="flex flex-wrap gap-3">
        <ButtonLink to="/marketplace">{d.marketplace.title}</ButtonLink>
        <ButtonLink to="/" variant="secondary">
          {d.brand.name}
        </ButtonLink>
      </div>
    </main>
  );
}

/** SYS-05: an accessible record the current actor may not act on. */
export function AccessNotice({ title, body, accountPath }: { title: string; body: string; accountPath?: string }) {
  const { d } = useI18n();
  return (
    <div className="rounded-panel border border-warning bg-warning-subtle p-6">
      <h2 className="h3 text-warning">{title}</h2>
      <p className="mt-2 max-w-prose text-sm text-fg">{body}</p>
      {accountPath ? (
        <div className="mt-4">
          <ButtonLink to={accountPath} variant="secondary" size="compact">
            {d.errors.unverifiedBuyer.action}
          </ButtonLink>
        </div>
      ) : null}
    </div>
  );
}
