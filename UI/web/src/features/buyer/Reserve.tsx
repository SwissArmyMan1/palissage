import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { depositAmount, formatMoney, subMoney, totalDue } from '@/domain/money';
import { canReserve, offerAvailable, offerState } from '@/domain/capabilities';
import { validateQuantity } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CheckboxField, RadioGroup } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { QuantityInput } from '@/components/trade/QuantityInput';
import { ActionResult, ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * BUY-04. A real route, not an opaque modal: Terms → Review → Result, with the
 * selection carried in the URL so a deep link and a refresh both work.
 */
export default function Reserve() {
  const { offerId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actor, mode } = useEnvironment();
  const link = useModeLink();
  const navigate = useNavigate();
  const controller = useAction();
  const [params] = useSearchParams();

  const offer = offerId ? ledger.offers[offerId] : undefined;
  const lot = offer ? ledger.lots[offer.lotId] : undefined;
  const presentation = lot ? ledger.presentations[lot.id] : undefined;
  const minOrder = presentation?.minOrderBottles ?? 1;
  const available = offer ? offerAvailable(offer) : 0;

  const [quantity, setQuantity] = useState(() => params.get('quantity') ?? String(minOrder));
  const [payment, setPayment] = useState<'full' | 'deposit'>(() =>
    params.get('payment') === 'full' ? 'full' : 'deposit',
  );
  const [acknowledged, setAcknowledged] = useState(false);
  const [showAckError, setShowAckError] = useState(false);
  const [receiptId, setReceiptId] = useState<string | undefined>();
  const [allocationId, setAllocationId] = useState<string | undefined>();

  useFocusHeading(d.buyer.reserveTitle);

  const quantityCheck = validateQuantity('quantity', quantity, { min: minOrder, max: available, step: 1 });

  if (!offer || !lot) return <NotFound entity={d.lot.breadcrumb} />;

  const capability = canReserve({ offer, lot, buyer: actor, markets: ledger.markets, nowIso: ledger.nowIso });
  const state = offerState(offer, ledger.nowIso);
  const depositAvailable = offer.depositBps > 0;
  const effectivePayment = depositAvailable ? payment : 'full';

  const total = quantityCheck.ok ? totalDue(offer.pricePerBottle, quantityCheck.value) : undefined;
  const deposit = total && depositAvailable ? depositAmount(total, offer.depositBps) : undefined;
  const payNow = effectivePayment === 'deposit' && deposit ? deposit : total;
  const balance = total && payNow ? subMoney(total, payNow) : undefined;

  const quantityError = quantityCheck.ok
    ? undefined
    : fmt(d.validation[quantityCheck.errors[0].code as keyof typeof d.validation] as string, {
        ...(quantityCheck.errors[0].params ?? {}),
      });

  const canSubmit = capability.allowed && quantityCheck.ok && acknowledged;

  const openReview = () => {
    if (!acknowledged) {
      setShowAckError(true);
      return;
    }
    if (!quantityCheck.ok || !capability.allowed) return;
    void controller.review({
      action: 'reserve',
      offerId: offer.id,
      quantity: quantityCheck.value,
      payment: effectivePayment,
    });
  };

  if (receiptId && allocationId) {
    return (
      <WorkspacePage
        title={d.buyer.reserveTitle}
        breadcrumbs={[
          { to: '/app/buyer/allocations', label: d.buyer.allocations },
          { label: d.buyer.steps.result },
        ]}
      >
        <ActionResult
          reference={ledger.receipts[receiptId]?.reference}
          title={
            effectivePayment === 'deposit'
              ? fmt(d.reserve.done, { quantity: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) })
              : fmt(d.paid.done, { quantity: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) })
          }
          body={effectivePayment === 'deposit' ? d.reserve.depositNote : d.buyer.ownershipNote}
          action={
            <div className="flex flex-wrap gap-3">
              <ButtonLink to={link(`/app/buyer/allocations/${allocationId}`)}>{d.buyer.viewAllocation}</ButtonLink>
              <ButtonLink to={link('/app/buyer/overview')} variant="secondary">
                {d.buyer.overview}
              </ButtonLink>
            </div>
          }
        />
      </WorkspacePage>
    );
  }

  return (
    <WorkspacePage
      title={d.buyer.reserveTitle}
      breadcrumbs={[
        { to: `/app/lots/${lot.id}`, label: lot.name },
        { label: d.buyer.reserveTitle },
      ]}
      status={
        <>
          <StatusBadge tone={mode === 'demo' ? 'warning' : 'info'}>
            {mode === 'demo' ? d.mode.demo : d.mode.testnet}
          </StatusBadge>
          <StatusBadge tone="neutral">{offer.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard}</StatusBadge>
        </>
      }
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.tx.review} />
          {total && payNow && balance ? (
            <MoneySummary
              rows={[
                { label: `${formatNumber(quantityCheck.ok ? quantityCheck.value : 0)} × ${formatMoney(offer.pricePerBottle, locale)}`, value: total },
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
          ) : (
            <p className="text-sm text-fg-secondary">{quantityError}</p>
          )}

          <Button size="hero" fullWidth disabled={!capability.allowed || !quantityCheck.ok} onClick={openReview} loading={controller.busy}>
            {mode === 'demo'
              ? effectivePayment === 'deposit'
                ? d.order.reserveDemo
                : d.order.reserveDemo
              : fmt(d.order.reserveTest, { quantity: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) })}
          </Button>
          {!canSubmit && capability.allowed && quantityCheck.ok ? (
            <p className="caption">{d.buyer.acknowledge}</p>
          ) : null}
          <ButtonLink to={link(`/app/lots/${lot.id}`)} variant="ghost" fullWidth>
            {d.common.back}
          </ButtonLink>
        </div>
      }
    >
      {!capability.allowed ? (
        <Notice tone="warning" title={d.errors.readOnly.title}>
          {d.reason[capability.reasonCode ?? 'UNKNOWN']}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={lot.name} description={`${ledger.producers[lot.producerId]?.displayName} · ${lot.region}, ${lot.vintage}`} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.price.unit, value: formatMoney(offer.pricePerBottle, locale) },
              { term: d.lot.availability, value: fmt(d.lot.availableBottles, { count: formatNumber(available) }) },
              { term: d.lot.offerCloses, value: formatDate(offer.endTime, { withTime: true, withZone: true }) },
              { term: d.lot.paymentDeadline, value: formatDate(offer.fullPaymentDeadline, { withTime: true, withZone: true }) },
              { term: d.lot.expectedReadiness, value: `${formatDate(presentation?.expectedAvailability?.value)} · ${d.lot.estimated}` },
              { term: d.lot.production, value: d.status.production[lot.production] },
            ]}
          />
        </div>
      </section>

      <section className="panel flex flex-col gap-6">
        <SectionHeader as="h3" title={d.buyer.steps.terms} />

        <QuantityInput
          value={quantity}
          onChange={setQuantity}
          min={minOrder}
          max={available}
          label={d.lot.quantity}
          unit={d.order.quantityUnit}
          error={quantityError}
          disabled={state !== 'open'}
        />

        {depositAvailable ? (
          <RadioGroup
            legend={d.buyer.paymentChoice}
            name="payment"
            value={effectivePayment}
            onChange={(value) => setPayment(value as 'full' | 'deposit')}
            options={[
              {
                value: 'deposit',
                label: d.buyer.payDeposit,
                description: deposit ? `${formatMoney(deposit, locale)} · ${d.order.deposit}` : undefined,
              },
              {
                value: 'full',
                label: d.buyer.payFull,
                description: total ? `${formatMoney(total, locale)} · ${d.order.total}` : undefined,
              },
            ]}
          />
        ) : null}

        <CheckboxField
          label={d.buyer.acknowledge}
          checked={acknowledged}
          error={showAckError && !acknowledged ? d.validation.required : undefined}
          onChange={(event) => {
            setAcknowledged(event.target.checked);
            setShowAckError(false);
          }}
        />

        <div className="rounded-[8px] bg-page-subtle p-4 text-sm text-fg-secondary">
          <p>{d.reserve.depositNote}</p>
          <p className="mt-2">{d.price.exclusions}</p>
        </div>
      </section>

      <ActionReview
        controller={controller}
        title={d.buyer.reserveTitle}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.field.organisation, value: actor?.displayLabel ?? '' },
          { label: d.lot.quantity, value: formatNumber(quantityCheck.ok ? quantityCheck.value : 0), emphasis: false },
          { label: d.price.unit, value: formatMoney(offer.pricePerBottle, locale) },
          { label: d.order.total, value: total ? formatMoney(total, locale) : '' },
          { label: d.order.payNow, value: payNow ? formatMoney(payNow, locale) : '', emphasis: true },
          { label: d.order.balance, value: balance ? formatMoney(balance, locale) : '' },
          {
            label: d.lot.paymentDeadline,
            value: formatDate(offer.fullPaymentDeadline, { withTime: true, withZone: true }),
          },
        ]}
        consequences={[
          effectivePayment === 'deposit' ? d.reserve.depositNote : d.buyer.ownershipNote,
          fmt(d.order.feeIncluded, { rate: `${ledger.primaryFeeBps / 100}%` }),
          d.price.exclusions,
        ]}
        confirmLabel={effectivePayment === 'deposit' ? d.order.reserveDemo : d.order.reserveTest}
        successBody={
          effectivePayment === 'deposit'
            ? fmt(d.reserve.done, { quantity: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) })
            : fmt(d.paid.done, { quantity: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) })
        }
        onSuccess={(receipt) => {
          if (receipt?.entityId) {
            setAllocationId(receipt.entityId);
            setReceiptId(receipt.id);
          } else {
            navigate(link('/app/buyer/allocations'));
          }
        }}
      />
    </WorkspacePage>
  );
}
