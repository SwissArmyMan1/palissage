import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { positionFor } from '@/app/selectors';
import { formatMoney, secondarySplit } from '@/domain/money';
import { canBuyListing, listingAvailable } from '@/domain/capabilities';
import { validateQuantity } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { QuantityInput } from '@/components/trade/QuantityInput';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/** A confirmed quote is valid for ten minutes of simulated time. */
const QUOTE_WINDOW_SECONDS = 600;

/**
 * BUY-06. The listing terms are immutable; the quantity, the live seller
 * balance and the price are all re-read before the review is opened, and a
 * changed price invalidates the quote rather than adjusting it silently.
 */
export default function SecondaryPurchase() {
  const { listingId } = useParams();
  const { d, locale, fmt, formatNumber } = useI18n();
  const { ledger, actor } = useEnvironment();
  const link = useModeLink();
  const navigate = useNavigate();
  const controller = useAction();
  const [quantity, setQuantity] = useState('1');

  const listing = listingId ? ledger.listings[listingId] : undefined;
  const lot = listing ? ledger.lots[listing.lotId] : undefined;
  useFocusHeading(lot ? `${lot.name} · ${d.buyer.buyListing}` : d.errors.notFound.title);

  const sellerPosition = listing ? positionFor(ledger, listing.sellerId, listing.lotId) : undefined;
  const available = listing ? listingAvailable(listing, sellerPosition) : 0;

  const quantityCheck = validateQuantity('quantity', quantity, { min: 1, max: available, step: 1 });
  const split =
    listing && lot && quantityCheck.ok
      ? secondarySplit(listing.pricePerBottle, quantityCheck.value, ledger.secondaryFeeBps, lot.royaltyBps)
      : undefined;

  if (!listing || !lot) return <NotFound entity={d.buyer.secondary} />;

  const capability = canBuyListing({
    listing,
    lot,
    buyer: actor,
    sellerPosition,
    markets: ledger.markets,
    nowIso: ledger.nowIso,
  });
  const staleListing = listing.active && available < listing.quantity;

  return (
    <WorkspacePage
      title={lot.name}
      description={`${d.buyer.columns.seller}: ${ledger.participants[listing.sellerId]?.displayLabel ?? listing.sellerId}`}
      breadcrumbs={[{ to: '/app/buyer/secondary', label: d.buyer.secondary }, { label: listing.id }]}
      status={<StatusBadge tone={listing.active ? 'success' : 'neutral'}>{listing.active ? d.status.listing.active : d.status.listing.cancelled}</StatusBadge>}
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.tx.review} />
          {split ? (
            <MoneySummary
              rows={[
                { label: d.secondary.gross, value: split.gross, emphasis: true },
                { label: d.secondary.fee, value: split.fee, negative: true },
                { label: d.secondary.royalty, value: split.royalty, negative: true },
                { label: d.secondary.proceeds, value: split.sellerNet },
              ]}
              footnote={d.price.exclusions}
            />
          ) : null}
          <Button
            size="hero"
            fullWidth
            disabled={!capability.allowed || !quantityCheck.ok}
            loading={controller.busy}
            onClick={() => {
              if (!quantityCheck.ok) return;
              const deadline = new Date(Date.parse(ledger.nowIso) + QUOTE_WINDOW_SECONDS * 1000).toISOString();
              void controller.review({
                action: 'buy',
                listingId: listing.id,
                quantity: quantityCheck.value,
                maxPricePerBottle: listing.pricePerBottle,
                deadline,
              });
            }}
          >
            {d.buyer.buyListing}
          </Button>
          {!capability.allowed ? <p className="caption">{d.reason[capability.reasonCode ?? 'UNKNOWN']}</p> : null}
          <ButtonLink to={link('/app/buyer/secondary')} variant="ghost" fullWidth>
            {d.common.cancel}
          </ButtonLink>
        </div>
      }
    >
      {staleListing ? (
        <Notice tone="warning" title={d.secondary.unavailable}>
          {d.secondary.unavailableBody}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.viewListing} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.buyer.columns.lot, value: lot.name },
              { term: d.lot.vintage, value: lot.vintage },
              { term: d.secondary.unitPrice, value: formatMoney(listing.pricePerBottle, locale) },
              { term: d.buyer.columns.available, value: formatNumber(available) },
              { term: d.secondary.royalty, value: `${lot.royaltyBps / 100}%` },
              { term: d.secondary.fee, value: `${ledger.secondaryFeeBps / 100}%` },
            ]}
          />
        </div>
        <p className="caption mt-4">{d.secondary.noExpiry}</p>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.steps.terms} />
        <div className="mt-5">
          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            min={1}
            max={available}
            label={d.lot.quantity}
            unit={d.order.quantityUnit}
            error={
              quantityCheck.ok
                ? undefined
                : fmt(d.validation[quantityCheck.errors[0].code as keyof typeof d.validation] as string, {
                    ...(quantityCheck.errors[0].params ?? {}),
                  })
            }
            disabled={!listing.active}
          />
        </div>
      </section>

      <ActionReview
        controller={controller}
        title={d.buyer.buyListing}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.seller, value: ledger.participants[listing.sellerId]?.displayLabel ?? '' },
          { label: d.lot.quantity, value: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) },
          { label: d.secondary.unitPrice, value: formatMoney(listing.pricePerBottle, locale) },
          { label: d.secondary.gross, value: split ? formatMoney(split.gross, locale) : '', emphasis: true },
          { label: d.secondary.fee, value: split ? formatMoney(split.fee, locale) : '' },
          { label: d.secondary.royalty, value: split ? formatMoney(split.royalty, locale) : '' },
          { label: d.secondary.proceeds, value: split ? formatMoney(split.sellerNet, locale) : '' },
        ]}
        consequences={[d.buyer.secondaryContext, d.price.exclusions]}
        confirmLabel={d.buyer.buyListing}
        successBody={d.buyer.secondaryContext}
        onSuccess={() => navigate(link(`/app/buyer/positions/${lot.id}`))}
      />
    </WorkspacePage>
  );
}
