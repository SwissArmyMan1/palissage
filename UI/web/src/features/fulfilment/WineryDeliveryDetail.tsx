import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { canMarkShipped } from '@/domain/capabilities';
import { LIMITS, optionalText } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { SelectField, TextField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LotTimeline, type TimelineEvent } from '@/components/trade/LotTimeline';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * WIN-07. Recording a shipment attaches a document and opens the buyer's next
 * step. It does not prove that wine physically arrived, and it does not burn
 * any bottle balance.
 */
export default function WineryDeliveryDetail() {
  const { redemptionId } = useParams();
  const { d, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId, actor } = useEnvironment();
  const controller = useAction();
  const [carrier, setCarrier] = useState('');
  const [reference, setReference] = useState('');
  const [documentId, setDocumentId] = useState('demo-doc-shipment-001');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const redemption = redemptionId ? ledger.redemptions[redemptionId] : undefined;
  const lot = redemption ? ledger.lots[redemption.lotId] : undefined;
  useFocusHeading(redemption ? `${d.winery.deliveries} ${redemption.id}` : d.errors.notFound.title);

  if (!redemption || !lot) return <NotFound entity={d.winery.deliveries} />;
  if (lot.producerId !== actorId) {
    return (
      <WorkspacePage title={d.winery.deliveries}>
        <Notice tone="warning" title={d.errors.readOnly.title}>
          {d.reason.NOT_OWNER}
        </Notice>
      </WorkspacePage>
    );
  }

  const capability = canMarkShipped({ redemption, lot, actor, nowIso: ledger.nowIso });
  const destination = redemption.destinationRef ? ledger.destinations[redemption.destinationRef] : undefined;
  const disputeCase = redemption.caseId ? ledger.cases[redemption.caseId] : undefined;
  const shipmentDocuments = Object.values(ledger.documents).filter((document) => document.kind === 'shipment_record');

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
    const found: Record<string, string> = {};
    const carrierErrors = optionalText('carrier', carrier, LIMITS.carrier.max);
    const referenceErrors = optionalText('trackingReference', reference, LIMITS.trackingReference.max);
    [...carrierErrors, ...referenceErrors].forEach((error) => {
      found[error.field] = fmt(d.validation[error.code as keyof typeof d.validation] as string, error.params ?? {});
    });
    if (!documentId) found.documents = d.validation.required;
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    void controller.review({
      action: 'markShipped',
      redemptionId: redemption.id,
      documentId,
      carrier: carrier.trim() || undefined,
      reference: reference.trim() || undefined,
    });
  };

  return (
    <WorkspacePage
      title={`${lot.name} · ${formatNumber(redemption.quantity)} ${d.order.quantityUnit}`}
      description={redemption.id}
      breadcrumbs={[{ to: '/app/winery/deliveries', label: d.winery.deliveries }, { label: redemption.id }]}
      status={
        <>
          <StatusBadge tone={redemption.state === 'Completed' ? 'success' : 'accent'}>
            {d.status.redemption[redemption.state]}
          </StatusBadge>
          {disputeCase ? <StatusBadge tone="warning">{d.status.case[disputeCase.state]}</StatusBadge> : null}
        </>
      }
    >
      {disputeCase ? (
        <Notice tone="warning" title={d.status.case[disputeCase.state]}>
          {d.operations.outcomeReturnNote}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.deliveryDetail} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.buyer.columns.lot, value: lot.name },
              { term: d.buyer.columns.bottles, value: formatNumber(redemption.quantity) },
              { term: d.buyer.columns.requested, value: formatDate(redemption.requestedAt, { withTime: true }) },
              {
                term: d.buyer.destination,
                value: destination ? `${destination.recipient} — ${destination.city}, ${destination.country}` : d.common.notProvidedSample,
              },
            ]}
          />
        </div>
        <p className="caption mt-4">{d.delivery.logisticsNote}</p>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.timeline} />
        <div className="mt-4">
          <LotTimeline label={d.lot.timeline} events={events} />
        </div>
      </section>

      {redemption.state === 'Requested' ? (
        <section className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.winery.recordShipment} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={d.field.carrier}
              fieldName="carrier"
              optionalLabel={d.common.optional}
              value={carrier}
              error={errors.carrier}
              onChange={(event) => setCarrier(event.target.value)}
            />
            <TextField
              label={d.field.trackingReference}
              fieldName="trackingReference"
              optionalLabel={d.common.optional}
              value={reference}
              error={errors.trackingReference}
              onChange={(event) => setReference(event.target.value)}
            />
          </div>
          <SelectField
            label={d.buyer.shipmentDocuments}
            required
            fieldName="documents"
            value={documentId}
            error={errors.documents}
            onChange={(event) => setDocumentId(event.target.value)}
          >
            {shipmentDocuments.map((document) => (
              <option key={document.id} value={document.id}>
                {document.label} — {document.id}
              </option>
            ))}
          </SelectField>
          <Notice tone="info">{d.delivery.noTracking}</Notice>
          <div>
            <Button onClick={submit} loading={controller.busy} disabled={!capability.allowed}>
              {d.winery.recordShipment}
            </Button>
            {!capability.allowed ? (
              <p className="caption mt-2">{d.reason[capability.reasonCode ?? 'UNKNOWN']}</p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.shipmentDocuments} />
        <div className="mt-4">
          <EvidencePanel
            documents={redemption.shipmentDocsHash ? [ledger.documents['demo-doc-shipment-001']] : []}
            emptyLabel={d.common.notProvidedSample}
          />
          {redemption.shipmentDocsHash ? (
            <p className="code mt-3 text-fg-secondary">{redemption.shipmentDocsHash}</p>
          ) : null}
        </div>
      </section>

      <ActionReview
        controller={controller}
        title={d.winery.recordShipment}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.bottles, value: formatNumber(redemption.quantity), emphasis: true },
          { label: d.field.carrier, value: carrier || d.common.notProvidedSample },
          { label: d.buyer.shipmentDocuments, value: ledger.documents[documentId]?.label ?? documentId },
        ]}
        consequences={[d.delivery.recorded, d.delivery.confirmBody, d.delivery.noTracking]}
        confirmLabel={d.winery.recordShipment}
        successBody={d.status.redemption.Shipped}
      />
    </WorkspacePage>
  );
}
