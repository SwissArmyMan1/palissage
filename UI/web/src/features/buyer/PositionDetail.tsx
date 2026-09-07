import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { activityForEntity, listingsFor, positionFor, tradesForLot } from '@/app/selectors';
import { formatMoney } from '@/domain/money';
import { canListForResale, canRequestDelivery, transferableBottles } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { DeliveryForm, ListingForm } from './forms';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * BUY-09. The live balance for one lot: primary purchases and secondary
 * acquisitions combine into one holding, while their receipts stay separate.
 */
export default function PositionDetail() {
  const { lotId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  const [panel, setPanel] = useState<'none' | 'listing' | 'delivery'>('none');

  const lot = lotId ? ledger.lots[lotId] : undefined;
  useFocusHeading(lot ? `${lot.name} · ${d.buyer.position}` : d.errors.notFound.title);

  if (!lot) return <NotFound entity={d.buyer.position} />;

  const position = positionFor(ledger, actorId, lot.id);
  const transferable = transferableBottles(position);
  const listCapability = canListForResale({ lot, position, seller: actor, markets: ledger.markets, nowIso: ledger.nowIso });
  const deliveryCapability = canRequestDelivery({ lot, position, buyer: actor, nowIso: ledger.nowIso });
  const trades = tradesForLot(ledger, lot.id).filter((trade) => trade.buyerId === actorId || trade.sellerId === actorId);
  const myListings = listingsFor(ledger, actorId).filter((listing) => listing.lotId === lot.id);
  const allocations = Object.values(ledger.allocations).filter(
    (allocation) => allocation.buyerId === actorId && ledger.offers[allocation.offerId]?.lotId === lot.id,
  );
  const history = activityForEntity(ledger, lot.id, 12);
  const presentation = ledger.presentations[lot.id];

  return (
    <WorkspacePage
      title={lot.name}
      description={`${ledger.producers[lot.producerId]?.displayName} · ${lot.region}, ${lot.vintage}`}
      breadcrumbs={[{ to: '/app/buyer/allocations?tab=balances', label: d.buyer.allocations }, { label: d.buyer.position }]}
      status={
        <>
          <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>
          <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'warning'}>{d.status.lot[lot.status]}</StatusBadge>
        </>
      }
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.buyer.bottleAccounting} />
          <DefinitionList
            items={[
              { term: d.buyer.columns.walletQuantity, value: formatNumber(position?.walletBottles ?? 0) },
              { term: d.buyer.columns.frozen, value: formatNumber(position?.frozenBottles ?? 0) },
              { term: d.buyer.columns.escrow, value: formatNumber(position?.redemptionEscrowBottles ?? 0) },
              { term: d.buyer.columns.transferable, value: formatNumber(transferable) },
            ]}
          />
          <Button
            fullWidth
            disabled={!deliveryCapability.allowed}
            onClick={() => setPanel(panel === 'delivery' ? 'none' : 'delivery')}
          >
            {d.delivery.request}
          </Button>
          {!deliveryCapability.allowed ? (
            <p className="caption">{d.reason[deliveryCapability.reasonCode ?? 'UNKNOWN']}</p>
          ) : null}
          <Button
            variant="secondary"
            fullWidth
            disabled={!listCapability.allowed}
            onClick={() => setPanel(panel === 'listing' ? 'none' : 'listing')}
          >
            {d.buyer.listForResale}
          </Button>
          {!listCapability.allowed ? (
            <p className="caption">{d.reason[listCapability.reasonCode ?? 'UNKNOWN']}</p>
          ) : null}
          <ButtonLink to={link(`/app/lots/${lot.id}`)} variant="ghost" fullWidth>
            {d.lot.about}
          </ButtonLink>
        </div>
      }
    >
      {position && position.frozenBottles > 0 ? (
        <Notice tone="warning" title={d.errors.frozen.title}>
          {d.errors.frozen.body}
        </Notice>
      ) : null}

      {panel === 'listing' ? (
        <ListingForm lot={lot} position={position} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
      ) : null}
      {panel === 'delivery' ? (
        <DeliveryForm lot={lot} position={position} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
      ) : null}

      <section>
        <SectionHeader as="h3" title={d.buyer.acquisitions} />
        <div className="mt-4">
          <DataTable
            caption={d.buyer.acquisitions}
            rows={[
              ...allocations.map((allocation) => ({
                id: allocation.id,
                date: allocation.createdAt,
                source: d.buyer.tabs.reservations,
                quantity: allocation.quantity,
                amount: formatMoney(allocation.paidAmount, locale),
                to: `/app/buyer/allocations/${allocation.id}`,
                detail: d.status.allocation[allocation.state],
              })),
              ...trades.map((trade) => ({
                id: trade.id,
                date: trade.occurredAt,
                source: d.buyer.secondary,
                quantity: trade.quantity,
                amount: formatMoney(trade.buyerId === actorId ? trade.gross : trade.sellerNet, locale),
                to: `/app/buyer/secondary`,
                detail: `${d.secondary.royalty} ${formatMoney(trade.royalty, locale)}`,
              })),
            ].sort((a, b) => b.date.localeCompare(a.date))}
            rowKey={(row) => row.id}
            mobileTitle={(row) => row.source}
            columns={[
              { key: 'date', header: d.buyer.columns.date, render: (row) => formatDate(row.date) },
              { key: 'source', header: d.buyer.columns.source, render: (row) => row.source },
              { key: 'quantity', header: d.buyer.columns.bottles, numeric: true, render: (row) => formatNumber(row.quantity) },
              { key: 'amount', header: d.order.total, numeric: true, render: (row) => row.amount },
              {
                key: 'detail',
                header: d.buyer.columns.state,
                render: (row) => (
                  <Link to={link(row.to)} className="link text-sm">
                    {row.detail}
                  </Link>
                ),
              },
            ]}
          />
        </div>
      </section>

      {myListings.length > 0 ? (
        <section>
          <SectionHeader as="h3" title={d.buyer.secondaryTabs.mine} />
          <div className="mt-4">
            <DataTable
              caption={d.buyer.secondaryTabs.mine}
              rows={myListings}
              rowKey={(listing) => listing.id}
              mobileTitle={(listing) => listing.id}
              columns={[
                { key: 'id', header: d.buyer.columns.reference, render: (listing) => listing.id },
                {
                  key: 'quantity',
                  header: d.buyer.columns.remaining,
                  numeric: true,
                  render: (listing) => fmt(d.secondary.listingRemaining, { remaining: listing.quantity, initial: listing.initialQuantity }),
                },
                {
                  key: 'price',
                  header: d.buyer.columns.price,
                  numeric: true,
                  render: (listing) => formatMoney(listing.pricePerBottle, locale),
                },
                {
                  key: 'state',
                  header: d.buyer.columns.state,
                  render: (listing) => (
                    <StatusBadge tone={listing.active ? 'success' : 'neutral'}>
                      {listing.active
                        ? d.status.listing.active
                        : listing.closedReason === 'sold'
                          ? d.status.listing.sold
                          : d.status.listing.cancelled}
                    </StatusBadge>
                  ),
                },
              ]}
            />
          </div>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.documents} />
        <div className="mt-4">
          <EvidencePanel
            documents={(presentation?.documents ?? []).filter((document) => document.visibility === 'public')}
            emptyLabel={d.common.notProvidedSample}
          />
        </div>
      </section>

      {history.length > 0 ? (
        <section>
          <SectionHeader as="h3" title={d.buyer.recentActivity} />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                <span>
                  {fmt(d.activity[item.action], {
                    actor: item.actorLabel,
                    quantity: item.quantity ? formatNumber(item.quantity) : '',
                  })}
                </span>
                <span className="caption">{formatDate(item.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </WorkspacePage>
  );
}
