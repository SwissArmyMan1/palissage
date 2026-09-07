import type { Role } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LocaleSwitch } from '@/components/layout/LocaleSwitch';
import { DEMO_STORAGE_KEY } from '@/adapters/demo/persistence';

/**
 * SYS-01 / SYS-02 / SYS-03. Organisation, language, environment and the exact
 * capabilities of this account. No preference is offered that does not work:
 * there are no notification or email settings, because nothing sends them.
 */
export default function Account({ role }: { role: Role }) {
  const { d, formatDate, formatNumber } = useI18n();
  const { ledger, actor, mode, demo, preset, resetDemo } = useEnvironment();
  const title =
    role === 'winery' ? d.winery.account : role === 'operations' ? d.operations.account : d.buyer.account;
  useFocusHeading(title);

  return (
    <WorkspacePage title={title} description={actor?.displayLabel}>
      <section className="panel">
        <SectionHeader as="h3" title={d.field.organisation} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.field.organisation, value: actor?.displayLabel ?? '' },
              { term: d.operations.decision, value: actor ? d.role[actor.role] : '' },
              { term: d.field.country, value: actor?.country ?? '' },
              { term: d.lot.identifier, value: <span className="code">{actor?.wallet}</span> },
              {
                term: d.common.lastUpdated.replace(' {time}', ''),
                value: actor ? formatDate(actor.lastUpdatedAt, { withTime: true }) : '',
              },
              { term: d.common.source, value: actor?.origin.kind ?? '' },
            ]}
          />
        </div>
        <p className="caption mt-4">{d.demo.syntheticNotice}</p>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.account} />
        <ul className="mt-4 flex flex-col gap-3">
          {(actor?.claims ?? []).map((claim) => (
            <li key={claim.topic} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
              <div>
                <p className="font-medium">{claim.topic}</p>
                <p className="caption">
                  {claim.issuerLabel} ·{' '}
                  {claim.expiresAt ? formatDate(claim.expiresAt) : d.common.unknown}
                </p>
              </div>
              <StatusBadge tone={claim.valid ? 'success' : 'warning'}>
                {claim.valid ? d.status.review.accepted : d.reason.ELIGIBILITY_EXPIRED}
              </StatusBadge>
            </li>
          ))}
          {(actor?.claims ?? []).length === 0 ? <p className="text-sm text-fg-secondary">{d.common.none}</p> : null}
        </ul>
      </section>

      {role === 'operations' ? (
        <section className="panel">
          <SectionHeader as="h3" title={d.operations.grants} description={d.operations.grantsNote} />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {Object.entries(actor?.contractGrants ?? {}).map(([key, grant]) => (
              <li key={key} className="flex flex-wrap items-center justify-between gap-3">
                <span className="code">{key}</span>
                <span className="flex items-center gap-2">
                  <StatusBadge tone={grant.allowed ? 'success' : 'neutral'}>
                    {grant.allowed ? d.testnet.observed : d.reason.MISSING_CONTRACT_ROLE}
                  </StatusBadge>
                  <span className="caption">{formatDate(grant.checkedAt)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.nav.language} />
        <div className="mt-4">
          <LocaleSwitch />
        </div>
        <p className="caption mt-3">{d.legal.privacyBody}</p>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.mode.chooseEnvironment} />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <StatusBadge tone={mode === 'testnet' ? 'info' : 'warning'}>
            {mode === 'testnet' ? d.mode.testnetLong : d.mode.demoLong}
          </StatusBadge>
          <StatusBadge tone="neutral">{d.mode.mainnetDisabled}</StatusBadge>
        </div>
        <div className="mt-5">
          <DefinitionList
            items={[
              { term: d.demo.presetActive, value: preset },
              { term: d.demo.snapshot.replace('{date}', ''), value: formatDate(ledger.nowIso, { withTime: true, withZone: true }) },
              {
                term: d.demo.storedLocally.replace('{count} ', ''),
                value: `${formatNumber(demo.storedCommandCount())} · ${DEMO_STORAGE_KEY}`,
              },
            ]}
          />
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => void resetDemo()}>
            {d.demo.reset}
          </Button>
          <ButtonLink to="/demo" variant="ghost">
            {d.demo.presets}
          </ButtonLink>
          <ButtonLink to="/testnet" variant="ghost">
            {d.mode.openTestnet}
          </ButtonLink>
        </div>
        <p className="caption mt-3">{d.demo.resetBody}</p>
      </section>

      <Notice tone="info" title={d.errors.readOnly.title}>
        {d.legal.publisherPending}
      </Notice>
    </WorkspacePage>
  );
}
