import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity, reviewForLot } from '@/app/selectors';
import { formatMoney } from '@/domain/money';
import { canConfirmMilestone, canVerifyLot, GRANT, hasGrant } from '@/domain/capabilities';
import { LIMITS, requiredText } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { RadioGroup, TextAreaField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { LotTimeline } from '@/components/trade/LotTimeline';
import { productionEvents } from '@/components/trade/production-events';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * OPS-05. Evidence on the left, the decision on the right. "Verify lot" needs
 * the token verifier role and complete evidence; a milestone confirmation is a
 * separate action against a different contract role.
 */
export default function VerificationDetail() {
  const { lotId } = useParams();
  const { d, locale, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actor } = useEnvironment();
  const verifyAction = useAction();
  const changesAction = useAction();
  const milestoneAction = useAction();
  const [params] = useSearchParams();
  const [decision, setDecision] = useState<'verify' | 'changes'>('verify');
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [checked, setChecked] = useState<boolean[]>(d.operations.lotChecklist.map(() => false));

  const lot = lotId ? ledger.lots[lotId] : undefined;
  useFocusHeading(lot ? `${lot.name} · ${d.operations.verificationDetail}` : d.errors.notFound.title);

  if (!lot) return <NotFound entity={d.operations.verification} />;

  const requestedReviewId = params.get('review');
  const lotReview = requestedReviewId ? ledger.reviews[requestedReviewId] : reviewForLot(ledger, lot.id);
  const milestoneReviews = Object.values(ledger.reviews).filter(
    (review) => review.kind === 'milestone' && review.lotId === lot.id && review.state === 'submitted',
  );
  const presentation = ledger.presentations[lot.id];
  const documents = (lotReview?.documentIds ?? []).map((id) => ledger.documents[id]).filter(Boolean);
  const allChecked = checked.every(Boolean);

  const verifyCapability = canVerifyLot({
    lot,
    actor,
    evidenceComplete: documents.length > 0,
    nowIso: ledger.nowIso,
  });

  const submitDecision = () => {
    if (!lotReview) return;
    if (decision === 'changes') {
      const errors = requiredText('reason', reason, LIMITS.reason.min, LIMITS.reason.max);
      if (errors.length > 0) {
        setReasonError(fmt(d.validation[errors[0].code as keyof typeof d.validation] as string, errors[0].params ?? {}));
        return;
      }
      setReasonError(undefined);
      void changesAction.review({ action: 'requestLotChanges', reviewId: lotReview.id, reason: reason.trim() });
      return;
    }
    void verifyAction.review({ action: 'verifyLot', reviewId: lotReview.id });
  };

  return (
    <WorkspacePage
      title={lot.name}
      description={`${ledger.producers[lot.producerId]?.displayName} · ${lot.vintage}`}
      breadcrumbs={[{ to: '/app/operations/verification', label: d.operations.verification }, { label: lot.id }]}
      status={
        <>
          <StatusBadge tone={lot.status === 'Verified' ? 'success' : 'neutral'}>{d.status.lot[lot.status]}</StatusBadge>
          {lotReview ? <StatusBadge tone="accent">{d.status.review[lotReview.state]}</StatusBadge> : null}
        </>
      }
      aside={
        lotReview && lotReview.state === 'submitted' ? (
          <div className="panel flex flex-col gap-4">
            <SectionHeader as="h3" title={d.operations.decision} />
            <RadioGroup
              legend={d.operations.decision}
              name="lot-decision"
              value={decision}
              onChange={(value) => setDecision(value as typeof decision)}
              options={[
                { value: 'verify', label: d.operations.recordReview },
                { value: 'changes', label: d.operations.requestChanges },
              ]}
            />
            {decision === 'changes' ? (
              <TextAreaField
                label={d.field.reason}
                fieldName="reason"
                required
                value={reason}
                error={reasonError}
                onChange={(event) => setReason(event.target.value)}
              />
            ) : null}
            <Button
              disabled={decision === 'verify' && (!verifyCapability.allowed || !allChecked)}
              loading={verifyAction.busy || changesAction.busy}
              onClick={submitDecision}
            >
              {decision === 'verify' ? d.operations.recordReview : d.operations.requestChanges}
            </Button>
            {decision === 'verify' && !verifyCapability.allowed ? (
              <p className="caption">{d.reason[verifyCapability.reasonCode ?? 'UNKNOWN']}</p>
            ) : null}
            {decision === 'verify' && !allChecked ? <p className="caption">{d.operations.checklist}</p> : null}
          </div>
        ) : (
          <div className="panel">
            <SectionHeader as="h3" title={d.operations.decision} />
            <p className="mt-3 text-sm text-fg-secondary">
              {lotReview ? d.status.review[lotReview.state] : d.empty.noQueue.body}
            </p>
          </div>
        )
      }
    >
      <Notice tone="warning" title={d.common.demoVerification}>
        {d.faq.verify.a}
      </Notice>

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.about} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.buyer.columns.producer, value: ledger.producers[lot.producerId]?.displayName ?? '' },
              { term: d.lot.totalCap, value: formatNumber(lot.totalBottles) },
              { term: d.field.bottleSize, value: `${lot.bottleSizeMl} ml` },
              { term: d.field.royalty, value: `${lot.royaltyBps / 100}%` },
              { term: d.lot.production, value: d.status.production[lot.production] },
              { term: d.lot.contractStatus, value: lot.status },
              { term: d.buyer.columns.reference, value: lotReview ? `${lotReview.id} · r${lotReview.revision}` : d.common.none },
              { term: d.buyer.columns.date, value: lotReview ? formatDate(lotReview.submittedAt, { withTime: true }) : '' },
            ]}
          />
        </div>
        {lot.docsHash ? (
          <div className="mt-6">
            <p className="caption">{d.lot.evidenceAnchor}</p>
            <p className="code mt-1">{lot.docsHash}</p>
          </div>
        ) : null}
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.field.documents} />
        <div className="mt-4">
          <EvidencePanel
            documents={documents.length > 0 ? documents : (presentation?.documents ?? [])}
            emptyLabel={d.common.notProvidedSample}
          />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.checklist} />
        <ul className="mt-4 flex flex-col gap-3">
          {d.operations.lotChecklist.map((item, index) => (
            <li key={item}>
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={checked[index]}
                  onChange={(event) =>
                    setChecked((current) => current.map((value, i) => (i === index ? event.target.checked : value)))
                  }
                  className="mt-0.5 h-5 w-5 accent-[var(--c-accent)]"
                />
                {item}
              </label>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.lot.timeline} />
        <div className="mt-4">
          <LotTimeline label={d.lot.timeline} events={productionEvents(lot.production, d.status.production)} />
        </div>
      </section>

      {milestoneReviews.length > 0 ? (
        <section className="panel">
          <SectionHeader as="h3" title={d.operations.tabs.milestones} />
          <ul className="mt-4 flex flex-col gap-3">
            {milestoneReviews.map((review) => {
              const settlement = review.offerId ? ledger.settlements[review.offerId] : undefined;
              const milestone = settlement?.milestones[review.milestoneIndex ?? -1];
              const capability = canConfirmMilestone({
                milestone,
                actor,
                evidenceComplete: review.documentIds.length > 0,
                nowIso: ledger.nowIso,
              });
              return (
                <li key={review.id} className="panel-flush flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{milestone?.description}</p>
                      <p className="caption">
                        {review.offerId} · {milestone ? `${milestone.bps / 100}%` : ''}
                      </p>
                    </div>
                    <StatusBadge tone="accent">{d.status.review[review.state]}</StatusBadge>
                  </div>
                  {settlement ? (
                    <p className="text-sm text-fg-secondary">
                      {d.winery.fundsReceived}: {formatMoney(settlement.settledFunds, locale)}
                    </p>
                  ) : null}
                  <EvidencePanel
                    documents={review.documentIds.map((id) => ledger.documents[id]).filter(Boolean)}
                    emptyLabel={d.common.notProvidedSample}
                  />
                  <div>
                    <Button
                      size="compact"
                      disabled={!capability.allowed}
                      loading={milestoneAction.busy}
                      onClick={() => {
                        void milestoneAction.review({ action: 'confirmMilestone', reviewId: review.id });
                      }}
                    >
                      {d.operations.confirmMilestone}
                    </Button>
                    {!capability.allowed ? (
                      <p className="caption mt-2">{d.reason[capability.reasonCode ?? 'UNKNOWN']}</p>
                    ) : (
                      <p className="caption mt-2">{d.faq.escrow.a}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.grants} />
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {[GRANT.tokenVerifier, GRANT.primaryVerifier].map((grant) => (
            <li key={grant} className="flex flex-wrap items-center justify-between gap-3">
              <span className="code">{grant}</span>
              <StatusBadge tone={hasGrant(actor, grant) ? 'success' : 'neutral'}>
                {hasGrant(actor, grant) ? d.testnet.observed : d.reason.MISSING_CONTRACT_ROLE}
              </StatusBadge>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <SectionHeader as="h3" title={d.winery.tabs.history} />
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {activityForEntity(ledger, lot.id, 12).map((item) => (
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
        controller={verifyAction}
        title={d.operations.recordReview}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.buyer.columns.reference, value: lotReview ? `${lotReview.id} · r${lotReview.revision}` : '' },
          { label: d.field.documents, value: formatNumber(documents.length) },
        ]}
        consequences={[d.faq.verify.a, d.lot.evidenceAnchor]}
        confirmLabel={d.operations.recordReview}
        successBody={d.status.lot.Verified}
        onSuccess={() => setChecked(d.operations.lotChecklist.map(() => false))}
      />

      <ActionReview
        controller={changesAction}
        title={d.operations.requestChanges}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.field.reason, value: reason },
        ]}
        consequences={[d.status.review.needs_changes]}
        confirmLabel={d.operations.requestChanges}
        successBody={d.status.review.needs_changes}
        onSuccess={() => setReason('')}
      />

      <ActionReview
        controller={milestoneAction}
        title={d.operations.confirmMilestone}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.winery.milestones, value: d.winery.milestoneReleased, emphasis: true },
        ]}
        consequences={[d.faq.escrow.a]}
        confirmLabel={d.operations.confirmMilestone}
        successBody={d.winery.milestoneReleased}
      />
    </WorkspacePage>
  );
}
