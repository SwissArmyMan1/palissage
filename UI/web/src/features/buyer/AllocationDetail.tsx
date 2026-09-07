import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity, positionFor } from '@/app/selectors';
import { formatMoney, subMoney } from '@/domain/money';
import { canPayRemainder, canRequestDelivery, isOverdue, transferableBottles } from '@/domain/capabilities';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { LotTimeline } from '@/components/trade/LotTimeline';
import { ActionReview } from '@/components/trade/ActionReview';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { DeliveryForm, ListingForm } from './forms';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * BUY-03. The record of one primary purchase. Current holdings live on the
 * position screen, so a historical quantity never limits a live balance.
 */
export default function AllocationDetail() {
  const { allocationId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const link = useModeLink();
  const controller = useAction();
  const [panel, setPanel] = useState<'none' | 'listing' | 'delivery'>('none');

  const allocation = allocationId ? ledger.allocations[allocationId] : undefined;
  const offer = allocation ? ledger.offers[allocation.offerId] : undefined;
  const lot = offer ? ledger.lots[offer.lotId] : undefined;
  useFocusHeading(lot?.name ?? d.buyer.allocationDetail);

  if (!allocation || !offer || !lot) return <NotFound entity={d.buyer.allocationDetail} />;
  if (allocation.buyerId !== actorId) {
    return (
      <WorkspacePage title={d.buyer.allocationDetail}>
        <Notice tone="warning" title={d.errors.readOnly.title}>
          {d.reason.NOT_OWNER}
        </Notice>
      </WorkspacePage>
    );
  }

  const due = subMoney(allocation.totalDue, allocation.paidAmount);
  const payCapability = canPayRemainder({ allocation, offer, actorId, markets: ledger.markets, nowIso: ledger.nowIso });
  const overdue = isOverdue(allocation, offer, ledger.nowIso);
  const position = positionFor(ledger, actorId, lot.id);
  const deliveryCapability = canRequestDelivery({ lot, position, buyer: actor, nowIso: ledger.nowIso });
  const history = activityForEntity(ledger, allocation.id, 20);
  const presentation = ledger.presentations[lot.id];

  return (
    <WorkspacePage
      title={lot.name}
      description={`${ledger.producers[lot.producerId]?.displayName} · ${d.lot.identifier} ${allocation.id}`}
      breadcrumbs={[{ to: '/app/buyer/allocations', label: d.buyer.allocations }, { label: allocation.id }]}
      status={
        <>
          <StatusBadge tone={allocation.state === 'Paid' ? 'success' : overdue ? 'warning' : 'accent'}>
            {overdue ? d.status.overdue : d.status.allocation[allocation.state]}
          </StatusBadge>
          <StatusBadge tone="neutral">{d.status.production[lot.production]}</StatusBadge>
        </>
      }
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.buyer.paymentSchedule} />
          <MoneySummary
            rows={[
              { label: d.order.total, value: allocation.totalDue },
              { label: d.buyer.columns.paid, value: allocation.paidAmount },
              { label: d.order.balance, value: due, emphasis: true },
            ]}
            footnote={fmt(d.order.deadline, {
              date: formatDate(offer.fullPaymentDeadline, { withTime: true, withZone: true }),
            })}
          />
          {allocation.state === 'Reserved' ? (
            <>
              <Button
                size="hero"
                fullWidth
                disabled={!payCapability.allowed}
                loading={controller.busy}
                onClick={() => {
                  void controller.review({ action: 'payRemainder', allocationId: allocation.id });
                }}
              >
                {d.buyer.payRemainderDemo}
              </Button>
              {!payCapability.allowed ? (
                <p className="caption">{d.reason[payCapability.reasonCode ?? 'UNKNOWN']}</p>
              ) : (
                <p className="caption">{d.reserve.depositNote}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm text-fg-secondary">{fmt(d.paid.done, { quantity: formatNumber(allocation.quantity) })}</p>
              <ButtonLink to={link(`/app/buyer/positions/${lot.id}`)} fullWidth>
                {d.buyer.viewPosition}
              </ButtonLink>
            </>
          )}
        </div>
      }
    >
      {overdue ? (
        <Notice tone="warning" title={d.status.overdue}>
          {d.reason.DEADLINE_PASSED}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.allocationDetail} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.lot.quantity, value: formatNumber(allocation.quantity) },
              { term: d.price.unit, value: formatMoney(allocation.pricePerBottle, locale) },
              { term: d.buyer.columns.date, value: formatDate(allocation.createdAt, { withTime: true }) },
              { term: d.lot.offerType, value: offer.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard },
              {
                term: d.lot.expectedReadiness,
                value: `${formatDate(presentation?.expectedAvailability?.value)} · ${d.lot.estimated}`,
              },
              { term: d.common.source, value: allocation.origin.kind },
            ]}
          />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.bottleAccounting} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              {
                term: d.buyer.columns.walletQuantity,
                value: formatNumber(position?.walletBottles ?? 0),
              },
              { term: d.buyer.columns.frozen, value: formatNumber(position?.frozenBottles ?? 0) },
              { term: d.buyer.columns.escrow, value: formatNumber(position?.redemptionEscrowBottles ?? 0) },
              { term: d.buyer.columns.transferable, value: formatNumber(transferableBottles(position)) },
            ]}
          />
        </div>
        <p className="caption mt-4">{d.buyer.ownershipNote}</p>
        {allocation.state === 'Paid' ? (
          <div className="mt-5 flex flex-wrap gap-3">
            <Button variant="secondary" onClick={() => setPanel(panel === 'listing' ? 'none' : 'listing')}>
              {d.buyer.listForResale}
            </Button>
            <Button
              variant="secondary"
              disabled={!deliveryCapability.allowed}
              onClick={() => setPanel(panel === 'delivery' ? 'none' : 'delivery')}
            >
              {d.delivery.request}
            </Button>
            <Link to={link(`/app/buyer/positions/${lot.id}`)} className="link self-center text-sm">
              {d.buyer.viewPosition}
            </Link>
          </div>
        ) : null}
        {!deliveryCapability.allowed && allocation.state === 'Paid' ? (
          <p className="caption mt-2">{d.reason[deliveryCapability.reasonCode ?? 'UNKNOWN']}</p>
        ) : null}
      </section>

      {panel === 'listing' ? (
        <ListingForm lot={lot} position={position} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
      ) : null}
      {panel === 'delivery' ? (
        <DeliveryForm lot={lot} position={position} onCancel={() => setPanel('none')} onDone={() => setPanel('none')} />
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.documents} />
        <div className="mt-4">
          <EvidencePanel documents={presentation?.documents ?? []} emptyLabel={d.common.notProvidedSample} />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.recentActivity} />
        <div className="mt-4">
          <LotTimeline
            label={d.buyer.recentActivity}
            events={history.map((item) => ({
              label: fmt(d.activity[item.action], {
                actor: item.actorLabel,
                quantity: item.quantity ? formatNumber(item.quantity) : '',
              }),
              occurredAt: item.occurredAt,
              source: item.receiptId,
              state: 'done',
            }))}
          />
        </div>
      </section>

      <ActionReview
        controller={controller}
        title={d.buyer.payRemainder}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.lot.quantity, value: formatNumber(allocation.quantity) },
          { label: d.order.total, value: formatMoney(allocation.totalDue, locale) },
          { label: d.buyer.columns.paid, value: formatMoney(allocation.paidAmount, locale) },
          { label: d.order.payNow, value: formatMoney(due, locale), emphasis: true },
        ]}
        consequences={[d.buyer.ownershipNote, fmt(d.order.feeIncluded, { rate: `${ledger.primaryFeeBps / 100}%` })]}
        confirmLabel={d.order.payTest}
        successBody={fmt(d.paid.done, { quantity: formatNumber(allocation.quantity) })}
      />
    </WorkspacePage>
  );
}
