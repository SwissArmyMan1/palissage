import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { DisputeCase } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity, passportIdForLot } from '@/app/selectors';
import { canCancelRedemption, canConfirmDelivery } from '@/domain/capabilities';
import { LIMITS, requiredText } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button, ButtonLink } from '@/components/ui/Button';
import { CheckboxField, SelectField, TextAreaField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LotTimeline, type TimelineEvent } from '@/components/trade/LotTimeline';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * BUY-08. Requested → Shipped → Completed, with the delivery destination kept
 * private, the escrow explained, and an issue report that is an off-chain case
 * rather than a fifth contract state.
 */
export default function BuyerDeliveryDetail() {
  const { redemptionId } = useParams();
  const { d, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const confirmAction = useAction();
  const cancelAction = useAction();
  const caseAction = useAction();
  const [confirmed, setConfirmed] = useState(false);
  const [caseOpen, setCaseOpen] = useState(false);
  const [category, setCategory] = useState<DisputeCase['category']>('missing');
  const [description, setDescription] = useState('');
  const [descriptionError, setDescriptionError] = useState<string | undefined>();

  const redemption = redemptionId ? ledger.redemptions[redemptionId] : undefined;
  const lot = redemption ? ledger.lots[redemption.lotId] : undefined;
  useFocusHeading(redemption ? `${d.buyer.deliveryDetail} ${redemption.id}` : d.errors.notFound.title);

  if (!redemption || !lot) return <NotFound entity={d.buyer.deliveries} />;
  if (redemption.buyerId !== actorId) {
    return (
      <WorkspacePage title={d.buyer.deliveryDetail}>
        <Notice tone="warning" title={d.errors.readOnly.title}>
          {d.reason.NOT_OWNER}
        </Notice>
      </WorkspacePage>
    );
  }

  const destination = redemption.destinationRef ? ledger.destinations[redemption.destinationRef] : undefined;
  const disputeCase = redemption.caseId ? ledger.cases[redemption.caseId] : undefined;
  const confirmCapability = canConfirmDelivery({ redemption, actorId, nowIso: ledger.nowIso });
  const cancelCapability = canCancelRedemption({ redemption, actorId, openCase: disputeCase, nowIso: ledger.nowIso });
  const shipmentDocuments = redemption.shipmentDocsHash ? [ledger.documents['demo-doc-shipment-001']] : [];

  const events: TimelineEvent[] = [
    { label: d.status.redemption.Requested, occurredAt: redemption.requestedAt, state: 'done' },
    {
      label: d.status.redemption.Shipped,
      occurredAt: redemption.shippedAt,
      state: redemption.shippedAt ? 'done' : redemption.state === 'Cancelled' ? 'skipped' : 'future',
    },
    {
      label: d.status.redemption.Completed,
      occurredAt: redemption.completedAt,
      state: redemption.completedAt ? 'done' : redemption.state === 'Cancelled' ? 'skipped' : 'future',
    },
  ];
  if (redemption.state === 'Cancelled') {
    events.push({ label: d.status.redemption.Cancelled, occurredAt: redemption.cancelledAt, state: 'done' });
  }

  const submitCase = () => {
    const errors = requiredText('description', description, LIMITS.caseDescription.min, LIMITS.caseDescription.max);
    if (errors.length > 0) {
      setDescriptionError(fmt(d.validation[errors[0].code as keyof typeof d.validation] as string, errors[0].params ?? {}));
      return;
    }
    setDescriptionError(undefined);
    void caseAction.review({
      action: 'reportDeliveryProblem',
      redemptionId: redemption.id,
      category,
      description,
    });
  };

  return (
    <WorkspacePage
      title={`${lot.name} · ${formatNumber(redemption.quantity)} ${d.order.quantityUnit}`}
      description={redemption.id}
      breadcrumbs={[{ to: '/app/buyer/deliveries', label: d.buyer.deliveries }, { label: redemption.id }]}
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
          <SectionHeader as="h3" title={d.buyer.columns.action} />
          {redemption.state === 'Shipped' ? (
            <>
              <CheckboxField
                label={d.delivery.confirmCheckbox}
                checked={confirmed}
                onChange={(event) => setConfirmed(event.target.checked)}
              />
              <Button
                fullWidth
                disabled={!confirmCapability.allowed || !confirmed}
                loading={confirmAction.busy}
                onClick={() => {
                  void confirmAction.review({ action: 'confirmDelivery', redemptionId: redemption.id });
                }}
              >
                {d.delivery.confirm}
              </Button>
              <p className="caption">{d.delivery.confirmBody}</p>
            </>
          ) : null}

          {redemption.state === 'Requested' ? (
            <>
              <Button
                variant="secondary"
                fullWidth
                disabled={!cancelCapability.allowed}
                loading={cancelAction.busy}
                onClick={() => {
                  void cancelAction.review({ action: 'cancelRedemption', redemptionId: redemption.id });
                }}
              >
                {d.buyer.cancelRequest}
              </Button>
              <p className="caption">{d.delivery.tokenReturn}</p>
              {!cancelCapability.allowed ? (
                <p className="caption">{d.reason[cancelCapability.reasonCode ?? 'UNKNOWN']}</p>
              ) : null}
            </>
          ) : null}

          {redemption.state === 'Requested' || redemption.state === 'Shipped' ? (
            <Button variant="ghost" fullWidth onClick={() => setCaseOpen((value) => !value)}>
              {d.delivery.problem}
            </Button>
          ) : null}

          {redemption.state === 'Completed' ? (
            <ButtonLink to={`/passport/${passportIdForLot(lot.id)}`} variant="secondary" fullWidth>
              {d.passport.title}
            </ButtonLink>
          ) : null}
        </div>
      }
    >
      {disputeCase ? (
        <Notice tone="warning" title={d.status.case[disputeCase.state]}>
          {disputeCase.resolutionNote ?? d.operations.outcomeReturnNote}
        </Notice>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.deliveryDetail} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.buyer.columns.lot, value: <Link to={link(`/app/buyer/positions/${lot.id}`)} className="link">{lot.name}</Link> },
              { term: d.buyer.columns.bottles, value: formatNumber(redemption.quantity) },
              { term: d.buyer.columns.requested, value: formatDate(redemption.requestedAt, { withTime: true }) },
              {
                term: d.buyer.columns.winery,
                value: ledger.producers[lot.producerId]?.displayName ?? lot.producerId,
              },
              { term: d.field.carrier, value: redemption.carrier ?? d.delivery.noTracking },
              { term: d.field.trackingReference, value: redemption.trackingReference ?? d.common.notProvidedSample },
            ]}
          />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.buyer.destination} />
        <div className="mt-4 text-sm">
          {destination ? (
            <address className="not-italic leading-6 text-fg-secondary">
              {destination.recipient}
              <br />
              {destination.contact}
              <br />
              {destination.line1}
              {destination.line2 ? (
                <>
                  <br />
                  {destination.line2}
                </>
              ) : null}
              <br />
              {destination.postalCode} {destination.city}, {destination.country}
            </address>
          ) : (
            <p className="text-fg-secondary">{d.common.notProvidedSample}</p>
          )}
          <p className="caption mt-3">{d.delivery.logisticsNote}</p>
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
          <EvidencePanel documents={shipmentDocuments.filter(Boolean)} emptyLabel={d.common.notProvidedSample} />
          {redemption.shipmentDocsHash ? (
            <p className="code mt-3 text-fg-secondary">{redemption.shipmentDocsHash}</p>
          ) : null}
        </div>
      </section>

      {caseOpen ? (
        <section className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.delivery.problem} />
          <SelectField
            label={d.buyer.supportCases}
            value={category}
            onChange={(event) => setCategory(event.target.value as DisputeCase['category'])}
          >
            <option value="missing">{d.delivery.categories.missing}</option>
            <option value="damaged">{d.delivery.categories.damaged}</option>
            <option value="documentation">{d.delivery.categories.documentation}</option>
            <option value="other">{d.delivery.categories.other}</option>
          </SelectField>
          <TextAreaField
            label={d.delivery.description}
            required
            fieldName="description"
            value={description}
            error={descriptionError}
            onChange={(event) => setDescription(event.target.value)}
          />
          <div className="flex flex-wrap gap-3">
            <Button loading={caseAction.busy} onClick={submitCase}>
              {d.delivery.problem}
            </Button>
            <Button variant="secondary" onClick={() => setCaseOpen(false)}>
              {d.common.cancel}
            </Button>
          </div>
          <p className="caption">{d.operations.outcomeReturnNote}</p>
        </section>
      ) : null}

      {activityForEntity(ledger, redemption.id, 12).length > 0 ? (
        <section>
          <SectionHeader as="h3" title={d.buyer.recentActivity} />
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
      ) : null}

      <ActionReview
        controller={confirmAction}
        title={d.delivery.confirm}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.bottles, value: formatNumber(redemption.quantity), emphasis: true },
          { label: d.buyer.destination, value: destination ? `${destination.city}, ${destination.country}` : '' },
        ]}
        consequences={[d.delivery.confirmBody]}
        confirmLabel={d.delivery.confirm}
        successBody={d.status.redemption.Completed}
      />

      <ActionReview
        controller={cancelAction}
        title={d.buyer.cancelRequest}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.bottles, value: formatNumber(redemption.quantity), emphasis: true },
        ]}
        consequences={[d.delivery.tokenReturn, d.operations.outcomeReturnNote]}
        confirmLabel={d.buyer.cancelRequest}
        successBody={d.delivery.tokenReturn}
        destructive
      />

      <ActionReview
        controller={caseAction}
        title={d.delivery.problem}
        summary={[
          { label: d.buyer.columns.reference, value: redemption.id },
          { label: d.buyer.supportCases, value: d.delivery.categories[category] },
        ]}
        consequences={[d.operations.outcomeReturnNote]}
        confirmLabel={d.delivery.problem}
        successBody={d.status.case.open}
        onSuccess={() => setCaseOpen(false)}
      />
    </WorkspacePage>
  );
}
