import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { redemptionsForBuyer } from '@/app/selectors';
import { WorkspacePage } from '@/components/layout/AppShell';
import { ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge, type BadgeTone } from '@/components/ui/StatusBadge';

const STATE_TONE: Record<string, BadgeTone> = {
  Requested: 'accent',
  Shipped: 'info',
  Completed: 'success',
  Cancelled: 'neutral',
};

/** BUY-07. Delivery requests grouped by their on-chain state. */
export default function BuyerDeliveries() {
  const { d, formatDate, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const filter = params.get('filter') ?? 'all';
  useFocusHeading(d.buyer.deliveries);

  const all = redemptionsForBuyer(ledger, actorId);
  const rows = all.filter((redemption) => {
    if (filter === 'cases') return Boolean(redemption.caseId);
    if (filter === 'all') return true;
    return redemption.state === filter;
  });

  return (
    <WorkspacePage title={d.buyer.deliveries}>
      <div className="flex flex-wrap gap-2">
        {(['all', 'Requested', 'Shipped', 'Completed', 'Cancelled', 'cases'] as const).map((value) => {
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
                : value === 'cases'
                  ? d.buyer.supportCases
                  : d.status.redemption[value]}
            </Link>
          );
        })}
      </div>

      <DataTable
        caption={d.buyer.deliveries}
        rows={rows}
        rowKey={(redemption) => redemption.id}
        mobileTitle={(redemption) => ledger.lots[redemption.lotId]?.name ?? redemption.lotId}
        empty={
          <EmptyState
            title={d.empty.noDeliveries.title}
            body={d.empty.noDeliveries.body}
            action={
              <ButtonLink to={link('/app/buyer/allocations')} variant="secondary">
                {d.empty.noDeliveries.action}
              </ButtonLink>
            }
          />
        }
        columns={[
          {
            key: 'reference',
            header: d.buyer.columns.reference,
            render: (redemption) => (
              <Link to={link(`/app/buyer/deliveries/${redemption.id}`)} className="link font-medium">
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
            key: 'bottles',
            header: d.buyer.columns.bottles,
            numeric: true,
            render: (redemption) => formatNumber(redemption.quantity),
          },
          {
            key: 'winery',
            header: d.buyer.columns.winery,
            render: (redemption) =>
              ledger.producers[ledger.lots[redemption.lotId]?.producerId ?? '']?.displayName ?? '',
          },
          {
            key: 'state',
            header: d.buyer.columns.state,
            render: (redemption) => (
              <span className="flex flex-wrap items-center gap-1.5">
                <StatusBadge tone={STATE_TONE[redemption.state]}>{d.status.redemption[redemption.state]}</StatusBadge>
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
          {
            key: 'action',
            header: d.buyer.columns.action,
            render: (redemption) => (
              <Link to={link(`/app/buyer/deliveries/${redemption.id}`)} className="link text-sm">
                {redemption.state === 'Shipped' ? d.buyer.confirmReceipt : d.buyer.deliveryDetail}
              </Link>
            ),
          },
        ]}
      />
    </WorkspacePage>
  );
}
