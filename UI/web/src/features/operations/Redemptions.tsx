import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { WorkspacePage } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** OPS-06. Redemptions with their on-chain state and any separate case state. */
export default function Redemptions() {
  const { d, formatDate, formatNumber } = useI18n();
  const { ledger } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  useFocusHeading(d.operations.redemptions);

  const rows = Object.values(ledger.redemptions)
    .filter((redemption) => {
      if (filter === 'cases') return Boolean(redemption.caseId);
      if (filter === 'open') return redemption.state === 'Requested' || redemption.state === 'Shipped';
      return true;
    })
    .sort((a, b) => a.requestedAt.localeCompare(b.requestedAt));

  return (
    <WorkspacePage title={d.operations.redemptions}>
      <div className="flex flex-wrap gap-2">
        {(['all', 'open', 'cases'] as const).map((value) => {
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
              {value === 'all' ? d.common.all : value === 'open' ? d.status.redemption.Requested : d.buyer.supportCases}
            </Link>
          );
        })}
      </div>

      <DataTable
        caption={d.operations.redemptions}
        rows={rows}
        rowKey={(redemption) => redemption.id}
        mobileTitle={(redemption) => redemption.id}
        empty={<EmptyState title={d.empty.noQueue.title} body={d.empty.noQueue.body} />}
        columns={[
          {
            key: 'reference',
            header: d.buyer.columns.reference,
            render: (redemption) => (
              <Link to={link(`/app/operations/redemptions/${redemption.id}`)} className="link font-medium">
                {redemption.id}
              </Link>
            ),
          },
          {
            key: 'lot',
            header: d.buyer.columns.lot,
            render: (redemption) => ledger.lots[redemption.lotId]?.name ?? redemption.lotId,
          },
          {
            key: 'parties',
            header: d.buyer.columns.seller,
            render: (redemption) =>
              `${ledger.participants[redemption.buyerId]?.displayLabel ?? redemption.buyerId} · ${
                ledger.producers[ledger.lots[redemption.lotId]?.producerId ?? '']?.displayName ?? ''
              }`,
          },
          {
            key: 'bottles',
            header: d.buyer.columns.bottles,
            numeric: true,
            render: (redemption) => formatNumber(redemption.quantity),
          },
          {
            key: 'state',
            header: d.buyer.columns.state,
            render: (redemption) => (
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={redemption.state === 'Completed' ? 'success' : 'accent'}>
                  {d.status.redemption[redemption.state]}
                </StatusBadge>
                {redemption.caseId ? (
                  <StatusBadge tone="warning">{d.status.case[ledger.cases[redemption.caseId]?.state ?? 'open']}</StatusBadge>
                ) : null}
              </span>
            ),
          },
          {
            key: 'requested',
            header: d.buyer.columns.requested,
            render: (redemption) => formatDate(redemption.requestedAt),
          },
        ]}
      />
    </WorkspacePage>
  );
}
