import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { activityForEntity } from '@/app/selectors';
import { canReviewParticipant, GRANT, hasGrant } from '@/domain/capabilities';
import { LIMITS, requiredText } from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { RadioGroup, TextAreaField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { ActionReview } from '@/components/trade/ActionReview';
import { NotFound } from '@/features/system/EnvironmentGate';

/**
 * OPS-03. A review decision states its scope. Required checks are never
 * pre-ticked, and a reason is mandatory for anything other than approval.
 */
export default function ParticipantDetail() {
  const { participantId } = useParams();
  const { d, fmt, formatDate } = useI18n();
  const { ledger, actor } = useEnvironment();
  const controller = useAction();
  const [decision, setDecision] = useState<'approve' | 'changes' | 'reject'>('approve');
  const [reason, setReason] = useState('');
  const [checked, setChecked] = useState<boolean[]>(d.operations.checklistItems.map(() => false));
  const [reasonError, setReasonError] = useState<string | undefined>();

  const participant = participantId ? ledger.participants[participantId] : undefined;
  useFocusHeading(participant?.displayLabel ?? d.errors.notFound.title);

  if (!participant) return <NotFound entity={d.operations.participants} />;

  const capability = canReviewParticipant(actor, ledger.nowIso);
  const allChecked = checked.every(Boolean);
  const history = activityForEntity(ledger, participant.id, 12);
  const documents = participant.role === 'winery' ? [ledger.documents['demo-doc-producer-001']].filter(Boolean) : [];

  const submit = () => {
    if (decision !== 'approve') {
      const errors = requiredText('reason', reason, LIMITS.participantReason.min, LIMITS.participantReason.max);
      if (errors.length > 0) {
        setReasonError(fmt(d.validation[errors[0].code as keyof typeof d.validation] as string, errors[0].params ?? {}));
        return;
      }
    }
    setReasonError(undefined);
    void controller.review({
      action: 'reviewParticipant',
      participantId: participant.id,
      decision,
      reason: reason.trim(),
    });
  };

  return (
    <WorkspacePage
      title={participant.displayLabel}
      description={`${d.role[participant.role]} · ${participant.country}`}
      breadcrumbs={[{ to: '/app/operations/participants', label: d.operations.participants }, { label: participant.id }]}
      status={
        <>
          <StatusBadge tone={participant.registryVerified ? 'success' : 'warning'}>
            {d.status.review[participant.reviewState]}
          </StatusBadge>
          <StatusBadge tone="warning">{d.common.demoVerification}</StatusBadge>
        </>
      }
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.operations.decision} />
          <RadioGroup
            legend={d.operations.decision}
            name="decision"
            value={decision}
            onChange={(value) => setDecision(value as typeof decision)}
            options={[
              { value: 'approve', label: d.operations.approve },
              { value: 'changes', label: d.operations.requestChanges },
              { value: 'reject', label: d.operations.reject },
            ]}
          />
          <TextAreaField
            label={d.field.reason}
            fieldName="reason"
            required={decision !== 'approve'}
            optionalLabel={decision === 'approve' ? d.common.optional : undefined}
            value={reason}
            error={reasonError}
            onChange={(event) => setReason(event.target.value)}
          />
          <Button disabled={!capability.allowed || !allChecked} loading={controller.busy} onClick={submit}>
            {d.operations.decision}
          </Button>
          {!capability.allowed ? <p className="caption">{d.reason[capability.reasonCode ?? 'UNKNOWN']}</p> : null}
          {!allChecked ? <p className="caption">{d.operations.checklist}</p> : null}
        </div>
      }
    >
      <Notice tone="warning" title={d.common.demoVerification}>
        {d.faq.verify.a}
      </Notice>

      <section className="panel">
        <SectionHeader as="h3" title={d.field.organisation} />
        <div className="mt-5">
          <DefinitionList
            columns={2}
            items={[
              { term: d.field.organisation, value: participant.displayLabel },
              { term: d.operations.decision, value: d.role[participant.role] },
              { term: d.field.country, value: participant.country },
              { term: d.lot.identifier, value: <span className="code">{participant.wallet}</span> },
              { term: d.common.lastUpdated.replace(' {time}', ''), value: formatDate(participant.lastUpdatedAt, { withTime: true }) },
              { term: d.common.source, value: participant.origin.kind },
            ]}
          />
        </div>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.checklist} />
        <ul className="mt-4 flex flex-col gap-3">
          {participant.claims.map((claim) => (
            <li key={claim.topic} className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-3 last:border-0">
              <div>
                <p className="font-medium">{claim.topic}</p>
                <p className="caption">
                  {claim.issuerLabel} · {claim.issuedAt ? formatDate(claim.issuedAt) : d.common.unknown} →{' '}
                  {claim.expiresAt ? formatDate(claim.expiresAt) : d.common.unknown}
                </p>
              </div>
              <StatusBadge tone={claim.valid ? 'success' : 'warning'}>
                {claim.valid ? d.testnet.observed : d.testnet.missing}
              </StatusBadge>
            </li>
          ))}
          {participant.claims.length === 0 ? <p className="text-sm text-fg-secondary">{d.common.none}</p> : null}
        </ul>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.grants} description={d.operations.grantsNote} />
        <ul className="mt-4 flex flex-col gap-2 text-sm">
          {Object.entries(participant.contractGrants).map(([key, grant]) => (
            <li key={key} className="flex flex-wrap items-center justify-between gap-3">
              <span className="code">{key}</span>
              <StatusBadge tone={grant.allowed ? 'success' : 'neutral'}>
                {grant.allowed ? d.testnet.observed : d.reason.MISSING_CONTRACT_ROLE}
              </StatusBadge>
            </li>
          ))}
          {Object.keys(participant.contractGrants).length === 0 ? (
            <p className="text-fg-secondary">{d.common.none}</p>
          ) : null}
        </ul>
      </section>

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.checklist} />
        <ul className="mt-4 flex flex-col gap-3">
          {d.operations.checklistItems.map((item, index) => (
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
        <SectionHeader as="h3" title={d.field.documents} />
        <div className="mt-4">
          <EvidencePanel documents={documents} emptyLabel={d.common.notProvidedSample} />
        </div>
      </section>

      {history.length > 0 ? (
        <section>
          <SectionHeader as="h3" title={d.winery.tabs.history} />
          <ul className="mt-4 flex flex-col gap-2 text-sm">
            {history.map((item) => (
              <li key={item.id} className="flex flex-wrap justify-between gap-2 border-b border-line pb-2">
                <span>{fmt(d.activity[item.action], { actor: item.actorLabel, quantity: '' })}</span>
                <span className="caption">{formatDate(item.occurredAt)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="panel">
        <SectionHeader as="h3" title={d.operations.enforcement} />
        <p className="mt-3 max-w-prose text-sm text-fg-secondary">{d.operations.enforcementBody}</p>
        <div className="mt-3">
          <StatusBadge tone="neutral">
            {hasGrant(actor, GRANT.tokenEnforcer) ? d.testnet.observed : d.reason.INTEGRATION_UNAVAILABLE}
          </StatusBadge>
        </div>
      </section>

      <ActionReview
        controller={controller}
        title={d.operations.decision}
        summary={[
          { label: d.field.organisation, value: participant.displayLabel },
          {
            label: d.operations.decision,
            value:
              decision === 'approve'
                ? d.operations.approve
                : decision === 'changes'
                  ? d.operations.requestChanges
                  : d.operations.reject,
            emphasis: true,
          },
          { label: d.field.reason, value: reason || d.common.notProvided },
        ]}
        consequences={[d.common.demoVerification, d.faq.verify.a]}
        confirmLabel={d.operations.decision}
        successBody={d.common.demoVerification}
        onSuccess={() => {
          setReason('');
          setChecked(d.operations.checklistItems.map(() => false));
        }}
      />
    </WorkspacePage>
  );
}
