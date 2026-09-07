import { Link, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { listingsFor, openListings, positionFor, positionsFor } from '@/app/selectors';
import { formatMoney } from '@/domain/money';
import { listingAvailable } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { Tabs } from '@/components/ui/Tabs';
import { EmptyState, Notice } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ActionReview } from '@/components/trade/ActionReview';

/** BUY-05. Browsing other holders' listings, and managing your own. */
export default function Secondary() {
  const { d, locale, fmt, formatNumber, formatDate } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const controller = useAction();
  const [params] = useSearchParams();
  const tab = params.get('tab') ?? 'browse';
  useFocusHeading(d.buyer.secondary);

  const listings = openListings(ledger);
  const mine = listingsFor(ledger, actorId);
  const eligibleHoldings = positionsFor(ledger, actorId).filter((position) => position.walletBottles > 0);

  return (
    <WorkspacePage title={d.buyer.secondary} description={d.buyer.secondaryContext}>
      {ledger.markets.secondaryPaused ? (
        <Notice tone="warning" title={d.reason.MARKET_PAUSED}>
          {d.errors.readOnly.body}
        </Notice>
      ) : null}

      <Tabs
        label={d.buyer.secondary}
        activeId={tab}
        items={[
          { id: 'browse', label: d.buyer.secondaryTabs.browse, count: listings.length },
          { id: 'mine', label: d.buyer.secondaryTabs.mine, count: mine.length },
        ]}
      />

      {tab === 'browse' ? (
        <DataTable
          caption={d.buyer.secondaryTabs.browse}
          rows={listings}
          rowKey={(listing) => listing.id}
          mobileTitle={(listing) => ledger.lots[listing.lotId]?.name ?? listing.lotId}
          empty={
            <EmptyState
              title={d.empty.noListings.title}
              body={d.empty.noListings.body}
              action={<ButtonLink to={link('/app/marketplace')} variant="secondary">{d.nav.exploreLots}</ButtonLink>}
            />
          }
          columns={[
            {
              key: 'lot',
              header: d.buyer.columns.lot,
              render: (listing) => (
                <Link to={link(`/app/buyer/secondary/${listing.id}`)} className="link font-medium">
                  {ledger.lots[listing.lotId]?.name ?? listing.lotId}
                </Link>
              ),
            },
            {
              key: 'seller',
              header: d.buyer.columns.seller,
              render: (listing) => ledger.participants[listing.sellerId]?.displayLabel ?? listing.sellerId,
            },
            {
              key: 'price',
              header: d.buyer.columns.price,
              numeric: true,
              render: (listing) => formatMoney(listing.pricePerBottle, locale),
            },
            {
              key: 'available',
              header: d.buyer.columns.available,
              numeric: true,
              render: (listing) =>
                formatNumber(listingAvailable(listing, positionFor(ledger, listing.sellerId, listing.lotId))),
            },
            {
              key: 'royalty',
              header: d.buyer.columns.royalty,
              numeric: true,
              render: (listing) => `${(ledger.lots[listing.lotId]?.royaltyBps ?? 0) / 100}%`,
            },
            {
              key: 'action',
              header: d.buyer.columns.action,
              render: (listing) =>
                listing.sellerId === actorId ? (
                  <span className="caption">{d.reason.SELF_TRADE}</span>
                ) : (
                  <Link to={link(`/app/buyer/secondary/${listing.id}`)} className="link text-sm">
                    {d.buyer.viewListing}
                  </Link>
                ),
            },
          ]}
        />
      ) : null}

      {tab === 'mine' ? (
        <>
          <DataTable
            caption={d.buyer.secondaryTabs.mine}
            rows={mine}
            rowKey={(listing) => listing.id}
            mobileTitle={(listing) => ledger.lots[listing.lotId]?.name ?? listing.lotId}
            empty={
              <EmptyState
                title={d.empty.noListings.title}
                body={d.empty.noListings.body}
                action={
                  eligibleHoldings.length > 0 ? (
                    <ButtonLink to={link(`/app/buyer/positions/${eligibleHoldings[0].lotId}`)} variant="secondary">
                      {d.empty.noListings.action}
                    </ButtonLink>
                  ) : (
                    <ButtonLink to={link('/app/marketplace')} variant="secondary">
                      {d.nav.exploreLots}
                    </ButtonLink>
                  )
                }
              />
            }
            columns={[
              {
                key: 'lot',
                header: d.buyer.columns.lot,
                render: (listing) => (
                  <Link to={link(`/app/buyer/positions/${listing.lotId}`)} className="link font-medium">
                    {ledger.lots[listing.lotId]?.name ?? listing.lotId}
                  </Link>
                ),
              },
              {
                key: 'quantity',
                header: d.buyer.columns.remaining,
                numeric: true,
                render: (listing) =>
                  fmt(d.secondary.listingRemaining, { remaining: listing.quantity, initial: listing.initialQuantity }),
              },
              {
                key: 'price',
                header: d.buyer.columns.price,
                numeric: true,
                render: (listing) => formatMoney(listing.pricePerBottle, locale),
              },
              { key: 'date', header: d.buyer.columns.date, render: (listing) => formatDate(listing.createdAt) },
              {
                key: 'state',
                header: d.buyer.columns.state,
                render: (listing) => {
                  const live = listingAvailable(listing, positionFor(ledger, listing.sellerId, listing.lotId));
                  if (!listing.active) {
                    return (
                      <StatusBadge tone="neutral">
                        {listing.closedReason === 'sold' ? d.status.listing.sold : d.status.listing.cancelled}
                      </StatusBadge>
                    );
                  }
                  return live < listing.quantity ? (
                    <StatusBadge tone="warning">{d.status.listing.unavailable}</StatusBadge>
                  ) : (
                    <StatusBadge tone="success">{d.status.listing.active}</StatusBadge>
                  );
                },
              },
              {
                key: 'action',
                header: d.buyer.columns.action,
                render: (listing) =>
                  listing.active ? (
                    <Button
                      size="compact"
                      variant="secondary"
                      onClick={() => {
                        void controller.review({ action: 'cancelListing', listingId: listing.id });
                      }}
                    >
                      {d.buyer.cancelListing}
                    </Button>
                  ) : (
                    <span className="caption">{formatDate(listing.closedAt)}</span>
                  ),
              },
            ]}
          />
          <p className="caption">{d.secondary.noExpiry}</p>
        </>
      ) : null}

      <ActionReview
        controller={controller}
        title={d.buyer.cancelListing}
        summary={[{ label: d.buyer.secondaryTabs.mine, value: controller.state.prepared?.command.args && 'listingId' in controller.state.prepared.command.args ? controller.state.prepared.command.args.listingId : '' }]}
        consequences={[d.delivery.tokenReturn, d.secondary.noExpiry]}
        confirmLabel={d.buyer.cancelListing}
        successBody={d.status.listing.cancelled}
        destructive
      />
    </WorkspacePage>
  );
}
