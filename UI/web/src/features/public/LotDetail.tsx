import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import {
  activityForEntity,
  escrowedBottles,
  offerForLot,
  passportIdForLot,
  reservedNotMinted,
} from '@/app/selectors';
import { depositAmount, formatMoney, totalDue } from '@/domain/money';
import { offerAvailable, offerState } from '@/domain/capabilities';
import { validateQuantity } from '@/domain/validators';
import { assetUrl } from '@/content/assets';
import { ButtonLink } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { LotTimeline } from '@/components/trade/LotTimeline';
import { productionEvents } from '@/components/trade/production-events';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { QuantityInput } from '@/components/trade/QuantityInput';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * PUB-03 / SYS-08. Everything a professional buyer needs before reserving:
 * the wine, the terms, the evidence and the lot accounting. Viewing never
 * prompts a wallet, and changing the quantity never starts a transaction.
 */
export function LotDetailView({ inWorkspace = false }: { inWorkspace?: boolean }) {
  const { lotId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, mode } = useEnvironment();
  const link = useModeLink();
  const lot = lotId ? ledger.lots[lotId] : undefined;
  useFocusHeading(lot?.name ?? d.errors.lotUnavailable.title);

  const offer = lot ? offerForLot(ledger, lot.id) : undefined;
  const presentation = lot ? ledger.presentations[lot.id] : undefined;
  const producer = lot ? ledger.producers[lot.producerId] : undefined;
  const minOrder = presentation?.minOrderBottles ?? 1;
  const [quantity, setQuantity] = useState(() => String(Math.max(minOrder, 1)));
  const [payment, setPayment] = useState<'full' | 'deposit'>('deposit');

  const available = offer ? offerAvailable(offer) : 0;
  const state = offer ? offerState(offer, ledger.nowIso) : undefined;

  const quantityCheck = validateQuantity('quantity', quantity, { min: minOrder, max: available, step: 1 });
  const history = lot ? activityForEntity(ledger, lot.id, 8) : [];

  if (!lot || !presentation) return <NotFound entity={d.lot.breadcrumb} />;

  const total = offer && quantityCheck.ok ? totalDue(offer.pricePerBottle, quantityCheck.value) : undefined;
  const deposit = total && offer && offer.depositBps > 0 ? depositAmount(total, offer.depositBps) : undefined;
  const payNow = payment === 'deposit' && deposit ? deposit : total;
  const balance = total && payNow ? { ...total, units: (BigInt(total.units) - BigInt(payNow.units)).toString() } : undefined;
  const canReserveHere = state === 'open' && offer;

  const summary = (
    <div className="panel flex flex-col gap-5">
      <div>
        <p className="tabular text-3xl font-semibold">
          {offer ? formatMoney(offer.pricePerBottle, locale) : d.common.notProvided}
        </p>
        <p className="caption mt-1">{d.price.unit}</p>
      </div>

      <DefinitionList
        items={[
          {
            term: d.lot.offerType,
            value: offer?.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard,
          },
          {
            term: d.lot.availability,
            value:
              available > 0
                ? fmt(d.lot.availableBottles, { count: formatNumber(available) })
                : d.lot.soldOut,
          },
          { term: d.lot.production, value: d.status.production[lot.production] },
          {
            term: d.lot.expectedReadiness,
            value: `${formatDate(presentation.expectedAvailability?.value)} · ${d.lot.estimated}`,
          },
        ]}
      />

      {canReserveHere ? (
        <>
          <QuantityInput
            value={quantity}
            onChange={setQuantity}
            min={minOrder}
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
          />

          {offer.depositBps > 0 ? (
            <fieldset className="flex flex-col gap-2">
              <legend className="label mb-1">{d.buyer.paymentChoice}</legend>
              {(['deposit', 'full'] as const).map((option) => (
                <label
                  key={option}
                  className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-[8px] border px-3 py-2 text-sm ${
                    payment === option ? 'border-accent bg-accent-subtle' : 'border-line-strong'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    checked={payment === option}
                    onChange={() => setPayment(option)}
                    className="h-4 w-4 accent-[var(--c-accent)]"
                  />
                  {option === 'deposit' ? d.buyer.payDeposit : d.buyer.payFull}
                </label>
              ))}
            </fieldset>
          ) : null}

          {total && payNow && balance ? (
            <MoneySummary
              rows={[
                { label: d.order.total, value: total },
                { label: d.order.payNow, value: payNow, emphasis: true },
                { label: d.order.balance, value: balance },
              ]}
              footnote={
                <>
                  {fmt(d.order.deadline, { date: formatDate(offer.fullPaymentDeadline, { withTime: true, withZone: true }) })}
                  <br />
                  {fmt(d.order.feeIncluded, { rate: `${ledger.primaryFeeBps / 100}%` })}
                  <br />
                  {d.price.exclusions}
                </>
              }
            />
          ) : null}

          <p className="caption">{d.reserve.depositNote}</p>

          <ButtonLink
            to={link(`/app/buyer/reserve/${offer.id}?quantity=${quantityCheck.ok ? quantityCheck.value : minOrder}&payment=${payment}`)}
            size="hero"
            fullWidth
          >
            {d.lot.reserve}
          </ButtonLink>
          <p className="caption">{mode === 'demo' ? d.home.demoNote : d.mode.testnetLong}</p>
        </>
      ) : (
        <>
          <Notice tone="warning" title={state === 'sold_out' ? d.errors.soldOut.title : d.lot.offerUnavailable}>
            {state === 'sold_out'
              ? d.errors.soldOut.body
              : offer
                ? fmt(d.status.offer.scheduled, { date: formatDate(offer.startTime) })
                : d.errors.lotUnavailable.body}
          </Notice>
          <ButtonLink to={inWorkspace ? link('/app/marketplace') : '/marketplace'} variant="secondary" fullWidth>
            {d.marketplace.title}
          </ButtonLink>
        </>
      )}
    </div>
  );

  return (
    <div className="container-public py-8 md:py-12">
      <nav aria-label={d.a11y.breadcrumb} className="mb-6">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-fg-secondary">
          <li>
            <Link to={inWorkspace ? link('/app/marketplace') : '/marketplace'} className="hover:text-fg hover:underline">
              {d.lot.breadcrumb}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="text-fg">{lot.name}</li>
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone="warning">{d.marketplace.sampleBadge}</StatusBadge>
            <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'neutral'}>{d.status.lot[lot.status]}</StatusBadge>
            <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>
          </div>

          <h1 className="h1 mt-4">{lot.name}</h1>
          <p className="lead mt-2">
            <Link to={`/producers/${lot.producerId}`} className="link">
              {producer?.displayName}
            </Link>
            {' · '}
            {lot.region}, {lot.vintage}
          </p>

          <figure className="mt-8 overflow-hidden rounded-hero bg-page-subtle">
            <img
              src={assetUrl(presentation.imageAssetIds[0])}
              alt={fmt(d.a11y.lotImage, { name: lot.name })}
              width={480}
              height={640}
              className="mx-auto max-h-[420px] w-auto object-contain p-6"
            />
          </figure>
          <p className="caption mt-2">{d.common.illustrativeImage}</p>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.lot.about} />
            <p className="prose-body mt-3 text-fg-secondary">{presentation.description[locale]}</p>
            <div className="mt-6">
              <DefinitionList
                columns={2}
                items={[
                  { term: d.lot.grapes, value: lot.grapes || d.common.notProvidedSample },
                  { term: d.lot.bottleSize, value: `${lot.bottleSizeMl} ml` },
                  { term: d.lot.alcohol, value: presentation.abv?.value ?? d.common.notProvidedSample },
                  { term: d.lot.region, value: `${lot.region}, ${presentation.originCountry ?? 'FR'}` },
                  {
                    term: d.lot.exportScope,
                    value: presentation.tradeTerms.allowedDestinations.join(', '),
                  },
                ]}
              />
              <p className="caption mt-3">{d.lot.exportNote}</p>
              <p className="caption mt-1">{d.price.settlementNote}</p>
            </div>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.lot.documents} />
            <div className="mt-4">
              <EvidencePanel documents={presentation.documents} emptyLabel={d.common.notProvidedSample} />
            </div>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.lot.timeline} />
            <div className="mt-4">
              <LotTimeline label={d.lot.timeline} events={productionEvents(lot.production, d.status.production)} />
            </div>
          </section>

          <section className="mt-10">
            <SectionHeader as="h3" title={d.lot.accounting} />
            <div className="mt-4">
              <DefinitionList
                columns={2}
                items={[
                  { term: d.lot.totalCap, value: formatNumber(lot.totalBottles) },
                  { term: d.lot.reservedNotMinted, value: formatNumber(reservedNotMinted(ledger, lot)) },
                  {
                    term: d.lot.mintedOutstanding,
                    value: formatNumber(Math.max(lot.mintedBottles - lot.redeemedBottles, 0)),
                  },
                  { term: d.lot.escrowed, value: formatNumber(escrowedBottles(ledger, lot.id)) },
                  { term: d.lot.redeemed, value: formatNumber(lot.redeemedBottles) },
                  { term: d.lot.availability, value: formatNumber(available) },
                ]}
              />
            </div>
          </section>

          {history.length > 0 ? (
            <section className="mt-10">
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

          <details className="mt-10 rounded-panel border border-line bg-surface p-5">
            <summary className="cursor-pointer font-medium">{d.lot.technical}</summary>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <div>
                <p className="caption">{d.lot.identifier}</p>
                <p className="code">{lot.id}</p>
              </div>
              <div>
                <p className="caption">{d.lot.contractStatus}</p>
                <p className="code">{lot.status}</p>
              </div>
              {lot.docsHash ? (
                <div>
                  <p className="caption">{d.lot.evidenceAnchor}</p>
                  <p className="code">{lot.docsHash}</p>
                </div>
              ) : null}
              <div>
                <p className="caption">{d.common.source}</p>
                <p className="code">{lot.origin.kind}</p>
              </div>
            </div>
          </details>

          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink to={`/producers/${lot.producerId}`} variant="secondary">
              {d.lot.viewProducer}
            </ButtonLink>
            <ButtonLink to={`/passport/${passportIdForLot(lot.id)}`} variant="ghost">
              {d.passport.title}
            </ButtonLink>
          </div>
        </div>

        <div className="lg:col-span-5 xl:col-span-4">
          <div className="lg:sticky lg:top-[calc(var(--header-height)+24px)]">{summary}</div>
        </div>
      </div>
    </div>
  );
}

export default function PublicLotDetail() {
  return <LotDetailView />;
}
