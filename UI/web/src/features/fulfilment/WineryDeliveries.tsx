import { Link } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { redemptionsForWinery } from '@/app/selectors';
import { WorkspacePage } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/** WIN-06. Delivery requests to act on, oldest first. */
export default function WineryDeliveries() {
  const { d, formatDate, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  useFocusHeading(d.winery.deliveries);

  const rows = redemptionsForWinery(ledger, actorId);

  return (
    <WorkspacePage title={d.winery.deliveries}>
      <DataTable
        caption={d.winery.deliveries}
        rows={rows}
        rowKey={(redemption) => redemption.id}
        mobileTitle={(redemption) => ledger.lots[redemption.lotId]?.name ?? redemption.lotId}
        empty={<EmptyState title={d.empty.noDeliveries.title} body={d.empty.noDeliveries.body} />}
        columns={[
          {
            key: 'reference',
            header: d.buyer.columns.reference,
            render: (redemption) => (
              <Link to={link(`/app/winery/deliveries/${redemption.id}`)} className="link font-medium">
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
          {
            key: 'action',
            header: d.buyer.columns.action,
            render: (redemption) => (
              <Link to={link(`/app/winery/deliveries/${redemption.id}`)} className="link text-sm">
                {redemption.state === 'Requested' ? d.winery.recordShipment : d.buyer.deliveryDetail}
              </Link>
            ),
          },
        ]}
      />
    </WorkspacePage>
  );
}
