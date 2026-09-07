import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { WorkspacePage } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** OPS-02. The participant queue: organisations, claims and review state. */
export default function Participants() {
  const { d, formatDate } = useI18n();
  const { ledger } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  useFocusHeading(d.operations.participants);

  const rows = Object.values(ledger.participants)
    .filter((participant) => {
      if (filter === 'review') return participant.reviewState === 'submitted';
      if (filter === 'eligible') return participant.registryVerified;
      if (filter === 'expired') {
        return participant.claims.some(
          (claim) => claim.expiresAt && Date.parse(claim.expiresAt) <= Date.parse(ledger.nowIso),
        );
      }
      return true;
    })
    .sort((a, b) => a.displayLabel.localeCompare(b.displayLabel));

  return (
    <WorkspacePage title={d.operations.participants}>
      <div className="flex flex-wrap gap-2">
        {(['all', 'review', 'eligible', 'expired'] as const).map((value) => {
          const next = new URLSearchParams(params);
          next.set('filter', value);
          return (
            <Link
              key={value}
              to={{ search: `?${next.toString()}` }}
              replace
              aria-current={filter === value ? 'true' : undefined}
              className={`inline-flex min-h-[36px] items-center rounded-full border px-3 text-sm ${
                filter === value ? 'border-accent bg-accent-subtle text-accent' : 'border-line-strong'
              }`}
            >
              {value === 'all'
                ? d.common.all
                : value === 'review'
                  ? d.status.review.submitted
                  : value === 'eligible'
                    ? d.status.review.accepted
                    : d.reason.ELIGIBILITY_EXPIRED}
            </Link>
          );
        })}
      </div>

      <DataTable
        caption={d.operations.participants}
        rows={rows}
        rowKey={(participant) => participant.id}
        mobileTitle={(participant) => participant.displayLabel}
        empty={<EmptyState title={d.empty.noQueue.title} body={d.empty.noQueue.body} />}
        columns={[
          {
            key: 'organisation',
            header: d.field.organisation,
            render: (participant) => (
              <Link to={link(`/app/operations/participants/${participant.id}`)} className="link font-medium">
                {participant.displayLabel}
              </Link>
            ),
          },
          { key: 'role', header: d.operations.decision, render: (participant) => d.role[participant.role] },
          { key: 'country', header: d.field.country, render: (participant) => participant.country },
          {
            key: 'claims',
            header: d.operations.checklist,
            render: (participant) => participant.claims.map((claim) => claim.topic).join(', ') || d.common.none,
          },
          {
            key: 'expiry',
            header: d.buyer.columns.deadline,
            render: (participant) => {
              const earliest = participant.claims
                .map((claim) => claim.expiresAt)
                .filter(Boolean)
                .sort()[0];
              return earliest ? formatDate(earliest) : d.common.unknown;
            },
          },
          {
            key: 'state',
            header: d.buyer.columns.state,
            render: (participant) => (
              <StatusBadge
                tone={
                  participant.reviewState === 'accepted'
                    ? 'success'
                    : participant.reviewState === 'submitted'
                      ? 'accent'
                      : 'neutral'
                }
              >
                {d.status.review[participant.reviewState]}
              </StatusBadge>
            ),
          },
          {
            key: 'updated',
            header: d.common.lastUpdated.replace(' {time}', ''),
            render: (participant) => formatDate(participant.lastUpdatedAt),
          },
        ]}
      />
    </WorkspacePage>
  );
}
