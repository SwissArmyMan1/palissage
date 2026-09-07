import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { allocationsFor, positionsFor, tradesForAccount } from '@/app/selectors';
import { formatMoney, subMoney } from '@/domain/money';
import { isOverdue, transferableBottles } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';

/**
 * BUY-02. Reservations, current balances and history are separate tabs: a
 * purchase record and a live holding are different things and never merge.
 */
export default function Allocations() {
  const { d, locale, formatDate, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'reservations';
  const filter = params.get('filter') ?? 'all';
  useFocusHeading(d.buyer.allocations);

  const allocations = allocationsFor(ledger, actorId).filter((allocation) => {
    if (filter === 'due') return allocation.state === 'Reserved';
    if (filter === 'paid') return allocation.state === 'Paid';
    if (filter === 'closed') return allocation.state === 'Cancelled' || allocation.state === 'Defaulted';
    return true;
  });
  const positions = positionsFor(ledger, actorId);
  const trades = tradesForAccount(ledger, actorId);

  return (
    <WorkspacePage
      title={d.buyer.allocations}
      actions={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.nav.exploreLots}</ButtonLink>}
    >
      <Tabs
        label={d.buyer.allocations}
        activeId={tab}
        items={[
          { id: 'reservations', label: d.buyer.tabs.reservations, count: allocationsFor(ledger, actorId).length },
          { id: 'balances', label: d.buyer.tabs.balances, count: positions.length },
          { id: 'history', label: d.buyer.tabs.history },
        ]}
      />

      {tab === 'reservations' ? (
        <>
          <div className="flex flex-wrap gap-2">
            {(['all', 'due', 'paid', 'closed'] as const).map((value) => {
              const next = new URLSearchParams(params);
              next.set('tab', 'reservations');
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
                  {d.buyer.filters[value]}
                </Link>
              );
            })}
          </div>

          <DataTable
            caption={d.buyer.tabs.reservations}
            rows={allocations}
            rowKey={(allocation) => allocation.id}
            mobileTitle={(allocation) => ledger.lots[ledger.offers[allocation.offerId]?.lotId]?.name ?? allocation.id}
            empty={
              <EmptyState
                title={d.empty.noAllocations.title}
                body={d.empty.noAllocations.body}
                action={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.empty.noAllocations.action}</ButtonLink>}
              />
            }
            columns={[
              {
                key: 'lot',
                header: d.buyer.columns.lot,
                render: (allocation) => {
                  const lot = ledger.lots[ledger.offers[allocation.offerId]?.lotId];
                  return (
                    <Link to={link(`/app/buyer/allocations/${allocation.id}`)} className="link font-medium">
                      {lot?.name ?? allocation.offerId}
                    </Link>
                  );
                },
              },
              {
                key: 'producer',
                header: d.buyer.columns.producer,
                render: (allocation) => {
                  const lot = ledger.lots[ledger.offers[allocation.offerId]?.lotId];
                  return ledger.producers[lot?.producerId ?? '']?.displayName ?? '';
                },
              },
              {
                key: 'quantity',
                header: d.buyer.columns.quantity,
                numeric: true,
                render: (allocation) => formatNumber(allocation.quantity),
              },
              {
                key: 'paid',
                header: d.buyer.columns.paid,
                numeric: true,
                render: (allocation) =>
                  `${formatMoney(allocation.paidAmount, locale)} / ${formatMoney(allocation.totalDue, locale)}`,
              },
              {
                key: 'due',
                header: d.buyer.columns.due,
                numeric: true,
                render: (allocation) => formatMoney(subMoney(allocation.totalDue, allocation.paidAmount), locale),
              },
              {
                key: 'deadline',
                header: d.buyer.columns.deadline,
                render: (allocation) => {
                  const offer = ledger.offers[allocation.offerId];
                  return offer ? formatDate(offer.fullPaymentDeadline, { withTime: true }) : d.common.notProvided;
                },
              },
              {
                key: 'state',
                header: d.buyer.columns.state,
                render: (allocation) => {
                  const offer = ledger.offers[allocation.offerId];
                  const overdue = offer ? isOverdue(allocation, offer, ledger.nowIso) : false;
                  return (
                    <StatusBadge
                      tone={
                        allocation.state === 'Paid'
                          ? 'success'
                          : overdue
                            ? 'warning'
                            : allocation.state === 'Reserved'
                              ? 'accent'
                              : 'neutral'
                      }
                    >
                      {overdue ? d.status.overdue : d.status.allocation[allocation.state]}
                    </StatusBadge>
                  );
                },
              },
              {
                key: 'action',
                header: d.buyer.columns.action,
                render: (allocation) => (
                  <Link to={link(`/app/buyer/allocations/${allocation.id}`)} className="link text-sm">
                    {allocation.state === 'Reserved' ? d.buyer.payRemainder : d.buyer.viewAllocation}
                  </Link>
                ),
              },
            ]}
          />
        </>
      ) : null}

      {tab === 'balances' ? (
        <DataTable
          caption={d.buyer.tabs.balances}
          rows={positions}
          rowKey={(position) => position.lotId}
          mobileTitle={(position) => ledger.lots[position.lotId]?.name ?? position.lotId}
          empty={
            <EmptyState
              title={d.empty.noAllocations.title}
              body={d.empty.noAllocations.body}
              action={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.empty.noAllocations.action}</ButtonLink>}
            />
          }
          columns={[
            {
              key: 'lot',
              header: d.buyer.columns.lot,
              render: (position) => (
                <Link to={link(`/app/buyer/positions/${position.lotId}`)} className="link font-medium">
                  {ledger.lots[position.lotId]?.name ?? position.lotId}
                </Link>
              ),
            },
            {
              key: 'wallet',
              header: d.buyer.columns.walletQuantity,
              numeric: true,
              render: (position) => formatNumber(position.walletBottles),
            },
            {
              key: 'frozen',
              header: d.buyer.columns.frozen,
              numeric: true,
              render: (position) => formatNumber(position.frozenBottles),
            },
            {
              key: 'escrow',
              header: d.buyer.columns.escrow,
              numeric: true,
              render: (position) => formatNumber(position.redemptionEscrowBottles),
            },
            {
              key: 'transferable',
              header: d.buyer.columns.transferable,
              numeric: true,
              render: (position) => formatNumber(transferableBottles(position)),
            },
            {
              key: 'action',
              header: d.buyer.columns.action,
              render: (position) => (
                <Link to={link(`/app/buyer/positions/${position.lotId}`)} className="link text-sm">
                  {d.buyer.viewPosition}
                </Link>
              ),
            },
          ]}
        />
      ) : null}

      {tab === 'history' ? (
        <DataTable
          caption={d.buyer.tabs.history}
          rows={[
            ...allocationsFor(ledger, actorId).map((allocation) => ({
              id: allocation.id,
              date: allocation.createdAt,
              label: ledger.lots[ledger.offers[allocation.offerId]?.lotId]?.name ?? allocation.offerId,
              quantity: allocation.quantity,
              amount: formatMoney(allocation.paidAmount, locale),
              source: d.buyer.tabs.reservations,
              to: `/app/buyer/allocations/${allocation.id}`,
            })),
            ...trades.map((trade) => ({
              id: trade.id,
              date: trade.occurredAt,
              label: ledger.lots[trade.lotId]?.name ?? trade.lotId,
              quantity: trade.quantity,
              amount: formatMoney(trade.buyerId === actorId ? trade.gross : trade.sellerNet, locale),
              source: d.buyer.secondary,
              to: `/app/buyer/positions/${trade.lotId}`,
            })),
          ].sort((a, b) => b.date.localeCompare(a.date))}
          rowKey={(row) => row.id}
          mobileTitle={(row) => row.label}
          empty={<EmptyState title={d.empty.noActivity.title} body={d.empty.noActivity.body} />}
          columns={[
            { key: 'date', header: d.buyer.columns.date, render: (row) => formatDate(row.date) },
            {
              key: 'label',
              header: d.buyer.columns.lot,
              render: (row) => (
                <Link to={link(row.to)} className="link">
                  {row.label}
                </Link>
              ),
            },
            { key: 'quantity', header: d.buyer.columns.bottles, numeric: true, render: (row) => formatNumber(row.quantity) },
            { key: 'amount', header: d.order.total, numeric: true, render: (row) => row.amount },
            { key: 'source', header: d.buyer.columns.source, render: (row) => row.source },
          ]}
        />
      ) : null}
    </WorkspacePage>
  );
}
