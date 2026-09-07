import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity } from '@/app/selectors';
import { canResolveRedemption, GRANT, hasGrant } from '@/domain/capabilities';
import { LIMITS, requiredText } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { RadioGroup, TextAreaField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { LotTimeline, type TimelineEvent } from '@/components/trade/LotTimeline';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * OPS-07. Only genuinely permitted outcomes are offered. "Return tokenised
 * bottles" is exactly that: no monetary refund is implied anywhere.
 */
export default function RedemptionCase() {
  const { redemptionId } = useParams();
  const { d, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actor } = useEnvironment();
  const controller = useAction();
  const [outcome, setOutcome] = useState<'delivery' | 'return'>('return');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();

  const redemption = redemptionId ? ledger.redemptions[redemptionId] : undefined;
  const lot = redemption ? ledger.lots[redemption.lotId] : undefined;
  useFocusHeading(redemption ? `${d.operations.redemptionDetail} ${redemption.id}` : d.errors.notFound.title);

  if (!redemption || !lot) return <NotFound entity={d.operations.redemptions} />;

  const disputeCase = redemption.caseId ? ledger.cases[redemption.caseId] : undefined;
  const capability = canResolveRedemption({ redemption, actor, nowIso: ledger.nowIso });
  const destination = redemption.destinationRef ? ledger.destinations[redemption.destinationRef] : undefined;

  const events: TimelineEvent[] = [
    { label: d.status.redemption.Requested, occurredAt: redemption.requestedAt, state: 'done' },
    {
      label: d.status.redemption.Shipped,
      occurredAt: redemption.shippedAt,
      state: redemption.shippedAt ? 'done' : 'future',
    },
    {
      label: d.status.redemption.Completed,
      occurredAt: redemption.completedAt,
      state: redemption.completedAt ? 'done' : 'future',
    },
  ];

  const submit = () => {
    const errors = requiredText('reason', reason, LIMITS.reason.min, LIMITS.reason.max);
    if (errors.length > 0) {
      setReasonError(fmt(d.validation[errors[0].code as keyof typeof d.validation] as string, errors[0].params ?? {}));
      return;
    }
    setReasonError(undefined);
    if (disputeCase) {
      void controller.review({ action: 'resolveCase', caseId: disputeCase.id, outcome, reason: reason.trim() });
    } else {
      void controller.review({ action: 'refundRedemption', redemptionId: redemption.id, reason: reason.trim() });
    }
  };

  return (
    <WorkspacePage
      title={`${lot.name} · ${formatNumber(redemption.quantity)} ${d.order.quantityUnit}`}
      description={redemption.id}
      breadcrumbs={[{ to: '/app/operations/redemptions', label: d.operations.redemptions }, { label: redemption.id }]}
      status={
        <>
          <StatusBadge tone={redemption.state === 'Completed' ? 'success' : 'accent'}>
            {d.status.redemption[redemption.state]}
          </StatusBadge>
          {disputeCase ? <StatusBadge tone="warning">{d.status.case[disputeCase.state]}</StatusBadge> : null}
        </>
      }
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.operations.resolveCase} />
          <RadioGroup
            legend={d.operations.decision}
            name="outcome"
            value={outcome}
            onChange={(value) => setOutcome(value as typeof outcome)}
            options={[
              { value: 'delivery', label: d.operations.outcomeDelivery, description: d.delivery.confirmBody },
              { value: 'return', label: d.operations.outcomeReturn, description: d.operations.outcomeReturnNote },
            ]}
          />
          <TextAreaField
            label={d.field.reason}
            fieldName="reason"
            required
            value={reason}
            error={reasonError}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button disabled={!capability.allowed} loading={controller.busy} onClick={submit}>
            {d.operations.resolveCase}
          </Button>
          {!capability.allowed ? <p className="caption">{d.reason[capability.reasonCode ?? 'UNKNOWN']}</p> : null}
          <p className="caption">{d.operations.outcomeReturnNote}</p>
        </div>
      }
    >
      {disputeCase ? (
        <Notice tone="warning" title={d.status.case[disputeCase.state]}>
          {disputeCase.reason}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.redemptionDetail} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.buyer.columns.lot, value: lot.name },
              { term: d.buyer.columns.bottles, value: formatNumber(redemption.quantity) },
              {
                term: d.field.organisation,
                value: ledger.participants[redemption.buyerId]?.displayLabel ?? redemption.buyerId,
              },
              {
                term: d.buyer.columns.winery,
                value: ledger.producers[lot.producerId]?.displayName ?? lot.producerId,
              },
              { term: d.buyer.columns.requested, value: formatDate(redemption.requestedAt, { withTime: true }) },
              {
                term: d.buyer.destination,
                value: destination ? `${destination.city}, ${destination.country}` : d.common.notProvidedSample,
              },
            ]}
          />
        </div>
        <div className="mt-6 flex flex-col gap-2">
          <div>
            <p className="caption">{d.lot.evidenceAnchor}</p>
            <p className="code mt-1">{redemption.deliveryDataHash}</p>
          </div>
          {redemption.shipmentDocsHash ? (
            <div>
              <p className="caption">{d.buyer.shipmentDocuments}</p>
              <p className="code mt-1">{redemption.shipmentDocsHash}</p>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.timeline} />
        <div className="mt-4">
          <LotTimeline label={d.lot.timeline} events={events} />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.shipmentDocuments} />
        <div className="mt-4">
          <EvidencePanel
            documents={redemption.shipmentDocsHash ? [ledger.documents['demo-doc-shipment-001']] : []}
            emptyLabel={d.common.notProvidedSample}
          />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.grants} />
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          <li className="flex flex-wrap items-center justify-between gap-3">
            <span className="code">{GRANT.redemptionVerifier}</span>
            <StatusBadge tone={hasGrant(actor, GRANT.redemptionVerifier) ? 'success' : 'neutral'}>
              {hasGrant(actor, GRANT.redemptionVerifier) ? d.testnet.observed : d.reason.MISSING_CONTRACT_ROLE}
            </StatusBadge>
          </li>
        </ul>
        <p className="caption mt-4">{d.operations.enforcementBody}</p>
      </section>

      <section>
        <SectionHeader as="h3" title={d.winery.tabs.history} />
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {activityForEntity(ledger, redemption.id, 12).map((item) => (
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

      <ActionReview
        controller={controller}
        title={d.operations.resolveCase}
        summary={[
          { label: d.buyer.columns.reference, value: redemption.id },
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.bottles, value: formatNumber(redemption.quantity), emphasis: true },
          {
            label: d.operations.decision,
            value: outcome === 'delivery' ? d.operations.outcomeDelivery : d.operations.outcomeReturn,
          },
          { label: d.field.reason, value: reason },
        ]}
        consequences={[
          outcome === 'delivery' ? d.delivery.confirmBody : d.operations.outcomeReturnNote,
          d.faq.refund.a,
        ]}
        confirmLabel={d.operations.resolveCase}
        successBody={outcome === 'delivery' ? d.status.redemption.Completed : d.delivery.tokenReturn}
        destructive={outcome === 'return'}
        onSuccess={() => setReason('')}
      />
    </WorkspacePage>
  );
}
