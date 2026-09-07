import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { reviewQueues } from '@/app/selectors';
import { GRANT, hasGrant } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** OPS-01. Actionable queues with clickable counts, plus the real permissions. */
export default function OperationsOverview() {
  const { d, formatNumber } = useI18n();
  const { ledger, actor } = useEnvironment();
  const link = useModeLink();
  useFocusHeading(d.operations.overview);

  const queues = reviewQueues(ledger);
  const tiles = [
    { label: d.operations.queues.participants, count: queues.participants.length, to: '/app/operations/participants?filter=review' },
    { label: d.operations.queues.lots, count: queues.lots.length, to: '/app/operations/verification?tab=lots' },
    { label: d.operations.queues.milestones, count: queues.milestones.length, to: '/app/operations/verification?tab=milestones' },
    { label: d.operations.queues.cases, count: queues.cases.length, to: '/app/operations/redemptions?filter=cases' },
  ];

  const grants = [
    { key: GRANT.gatewayAdmin, label: d.operations.approve },
    { key: GRANT.tokenVerifier, label: d.operations.recordReview },
    { key: GRANT.primaryVerifier, label: d.operations.confirmMilestone },
    { key: GRANT.redemptionVerifier, label: d.operations.resolveCase },
    { key: GRANT.tokenEnforcer, label: d.operations.enforcement },
  ];

  return (
    <WorkspacePage title={d.operations.overview} description={actor?.displayLabel}>
      <Notice tone="warning" title={d.operations.banner}>
        {d.demo.syntheticNotice}
      </Notice>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map((tile) => (
          <ButtonLink
            key={tile.label}
            to={link(tile.to)}
            variant="secondary"
            className="!h-auto flex-col items-start gap-1 !px-5 !py-5 text-left"
          >
            <span className="numeric tabular">{formatNumber(tile.count)}</span>
            <span className="text-sm font-normal text-fg-secondary">{tile.label}</span>
          </ButtonLink>
        ))}
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.grants} description={d.operations.grantsNote} />
        <ul className="mt-5 flex flex-col gap-3">
          {grants.map((grant) => (
            <li key={grant.key} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
              <div className="min-w-0">
                <p className="font-medium">{grant.label}</p>
                <p className="code text-fg-secondary">{grant.key}</p>
              </div>
              <StatusBadge tone={hasGrant(actor, grant.key) ? 'success' : 'neutral'}>
                {hasGrant(actor, grant.key) ? d.testnet.observed : d.reason.MISSING_CONTRACT_ROLE}
              </StatusBadge>
            </li>
          ))}
        </ul>
        <p className="caption mt-4">
          {d.common.lastUpdated.replace('{time}', actor?.contractGrants[GRANT.gatewayAdmin]?.checkedAt ?? '')}
        </p>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.enforcement} />
        <p className="mt-3 max-w-prose text-sm text-fg-secondary">{d.operations.enforcementBody}</p>
        <div className="mt-4">
          <StatusBadge tone="neutral">{d.errors.readOnly.title}</StatusBadge>
        </div>
      </section>
    </WorkspacePage>
  );
}
