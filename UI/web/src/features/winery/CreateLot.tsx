import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { LotDraft, ProductionStatus } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment, useFocusHeading, useModeLink } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import {
  LIMITS,
  requiredText,
  validateAbv,
  validateGrapes,
  validateQuantity,
  validateVintage,
  type FieldError,
  type GrapeInput,
} from '@/domain/validators';
import { WorkspacePage } from '@/components/layout/AppShell';
import { Button } from '@/components/ui/Button';
import { ErrorSummary, SelectField, TextField } from '@/components/ui/Field';
import { DefinitionList, Notice, SectionHeader } from '@/components/ui/Feedback';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { EvidencePanel } from '@/components/trade/EvidencePanel';
import { ActionReview } from '@/components/trade/ActionReview';

const STEPS = ['identity', 'quantity', 'evidence', 'review'] as const;
type Step = (typeof STEPS)[number];

const PRODUCTION_OPTIONS: ProductionStatus[] = [
  'Announced',
  'Growing',
  'Harvested',
  'Vinification',
  'Aging',
  'Bottled',
  'ReadyForDelivery',
];

/**
 * WIN-03. Four steps, with everything typed so far preserved when moving back.
 * A local draft and an on-chain Draft status are different things and are
 * labelled separately.
 */
export default function CreateLot() {
  const { d, fmt, formatDate, formatNumber } = useI18n();
  const { ledger, actorId } = useEnvironment();
  const link = useModeLink();
  const navigate = useNavigate();
  const controller = useAction();
  const draftAction = useAction();
  useFocusHeading(d.winery.createLot);

  const [step, setStep] = useState<Step>('identity');
  const [name, setName] = useState('');
  const [vintage, setVintage] = useState(String(new Date(ledger.nowIso).getUTCFullYear()));
  const [region, setRegion] = useState('Occitanie');
  const [country, setCountry] = useState('FR');
  const [grapes, setGrapes] = useState<GrapeInput[]>([{ name: '', percentage: '' }]);
  const [bottleSize, setBottleSize] = useState('750');
  const [abv, setAbv] = useState('');
  const [totalBottles, setTotalBottles] = useState('');
  const [production, setProduction] = useState<ProductionStatus>('Growing');
  const [expectedReady, setExpectedReady] = useState('');
  const [royaltyPercent, setRoyaltyPercent] = useState('2.5');
  const [documentIds, setDocumentIds] = useState<string[]>(['demo-doc-lot-001']);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [savedAt, setSavedAt] = useState<string | undefined>();
  const [draftId] = useState(() => `demo-draft-${Date.now()}`);

  const currentYear = new Date(ledger.nowIso).getUTCFullYear();
  const sampleDocuments = useMemo(
    () => Object.values(ledger.documents).filter((document) => document.kind === 'lot_record' || document.kind === 'producer_declaration'),
    [ledger.documents],
  );

  const messageFor = (error: FieldError) =>
    fmt((d.validation[error.code as keyof typeof d.validation] as string) ?? error.code, {
      example: '13.5',
      ...(error.params ?? {}),
    });

  const validateStep = (target: Step): FieldError[] => {
    const found: FieldError[] = [];
    if (target === 'identity') {
      found.push(...requiredText('name', name, LIMITS.lotName.min, LIMITS.lotName.max));
      const vintageCheck = validateVintage('vintage', vintage, currentYear);
      if (!vintageCheck.ok) found.push(...vintageCheck.errors);
      found.push(...requiredText('region', region, LIMITS.region.min, LIMITS.region.max));
      found.push(...requiredText('country', country, 2, 2));
      const grapeCheck = validateGrapes(grapes);
      if (!grapeCheck.ok) found.push(...grapeCheck.errors);
      const abvCheck = validateAbv('abv', abv, 'en');
      if (!abvCheck.ok) found.push(...abvCheck.errors);
    }
    if (target === 'quantity') {
      const quantityCheck = validateQuantity('totalBottles', totalBottles, {
        min: LIMITS.totalBottles.min,
        max: LIMITS.totalBottles.max,
        step: 1,
      });
      if (!quantityCheck.ok) found.push(...quantityCheck.errors);
      if (expectedReady && Date.parse(expectedReady) < Date.parse(ledger.nowIso)) {
        found.push({ field: 'expectedReady', code: 'endAfterStart' });
      }
      const royalty = Number(royaltyPercent.replace(',', '.'));
      if (!Number.isFinite(royalty) || royalty < 0 || royalty > LIMITS.royaltyBps.max / 100) {
        found.push({ field: 'royalty', code: 'percentageRange' });
      }
    }
    if (target === 'evidence' && documentIds.length === 0) {
      found.push({ field: 'documents', code: 'required' });
    }
    return found;
  };

  const goNext = () => {
    const found = validateStep(step);
    setErrors(found);
    if (found.length > 0) return;
    const index = STEPS.indexOf(step);
    if (index < STEPS.length - 1) setStep(STEPS[index + 1]);
  };

  const buildDraft = (): LotDraft => ({
    id: draftId,
    ownerId: actorId,
    name: name.trim(),
    vintage: Number(vintage),
    region: region.trim(),
    country: country.trim().toUpperCase(),
    grapes: grapes
      .filter((row) => row.name.trim().length > 0)
      .map((row) => ({ name: row.name.trim(), percentage: row.percentage ? Number(row.percentage) : null })),
    bottleSizeMl: Number(bottleSize),
    abv: abv.trim(),
    totalBottles: Number(totalBottles),
    production,
    expectedReadyAt: expectedReady ? new Date(expectedReady).toISOString() : '',
    royaltyBps: Math.round(Number(royaltyPercent.replace(',', '.')) * 100),
    documentIds,
    revision: 1,
    reviewState: 'draft',
    reviewNotes: [],
    savedAt: ledger.nowIso,
  });

  const saveDraft = async () => {
    const ok = await draftAction.review({ action: 'saveLotDraft', draft: buildDraft() });
    if (ok) {
      await draftAction.confirm();
      setSavedAt(ledger.nowIso);
      draftAction.reset();
    }
  };

  const createLot = async () => {
    const found = [...validateStep('identity'), ...validateStep('quantity'), ...validateStep('evidence')];
    setErrors(found);
    if (found.length > 0) return;
    const draft = buildDraft();
    const saved = await draftAction.review({ action: 'saveLotDraft', draft });
    if (!saved) return;
    await draftAction.confirm();
    draftAction.reset();
    void controller.review({ action: 'createLot', draftId: draft.id });
  };

  const summaryErrors = errors.map((error) => ({
    field: error.field,
    message: `${d.field[error.field as keyof typeof d.field] ?? error.field}: ${messageFor(error)}`,
  }));

  const errorFor = (field: string) => {
    const error = errors.find((entry) => entry.field === field);
    return error ? messageFor(error) : undefined;
  };

  return (
    <WorkspacePage
      title={d.winery.createLot}
      breadcrumbs={[{ to: '/app/winery/lots', label: d.winery.lots }, { label: d.winery.createLot }]}
      aside={
        <div className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.winery.wizard.review} />
          <DefinitionList
            items={[
              { term: d.field.wineName, value: name || d.common.notProvided },
              { term: d.field.vintage, value: vintage || d.common.notProvided },
              { term: d.field.region, value: region || d.common.notProvided },
              { term: d.field.quantity, value: totalBottles ? formatNumber(Number(totalBottles)) : d.common.notProvided },
              { term: d.lot.production, value: d.status.production[production] },
              { term: d.field.royalty, value: `${royaltyPercent}%` },
              { term: d.field.documents, value: formatNumber(documentIds.length) },
            ]}
          />
          <Button variant="secondary" onClick={() => void saveDraft()} loading={draftAction.busy}>
            {d.common.saveDraft}
          </Button>
          {savedAt ? (
            <p className="caption">
              {d.common.saved} · {formatDate(savedAt, { withTime: true })}
            </p>
          ) : (
            <p className="caption">{d.winery.wizard.draftNote}</p>
          )}
        </div>
      }
    >
      <ol className="flex flex-wrap gap-2">
        {STEPS.map((entry, index) => (
          <li key={entry}>
            <button
              type="button"
              aria-current={step === entry ? 'step' : undefined}
              onClick={() => setStep(entry)}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm ${
                step === entry ? 'border-accent bg-accent-subtle text-accent' : 'border-line-strong text-fg-secondary'
              }`}
            >
              <span className="tabular">{index + 1}</span>
              {d.winery.wizard[entry]}
            </button>
          </li>
        ))}
      </ol>

      <ErrorSummary title={d.common.errorSummary} errors={summaryErrors} />

      {step === 'identity' ? (
        <section className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.winery.wizard.identity} />
          <TextField
            label={d.field.wineName}
            fieldName="name"
            required
            value={name}
            error={errorFor('name')}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={d.field.vintage}
              fieldName="vintage"
              required
              inputMode="numeric"
              value={vintage}
              error={errorFor('vintage')}
              onChange={(event) => setVintage(event.target.value)}
            />
            <TextField
              label={d.field.region}
              fieldName="region"
              required
              value={region}
              error={errorFor('region')}
              onChange={(event) => setRegion(event.target.value)}
            />
            <TextField
              label={d.field.country}
              fieldName="country"
              required
              maxLength={2}
              value={country}
              error={errorFor('country')}
              onChange={(event) => setCountry(event.target.value.toUpperCase())}
            />
            <SelectField
              label={d.field.bottleSize}
              value={bottleSize}
              onChange={(event) => setBottleSize(event.target.value)}
            >
              {LIMITS.bottleSizesMl.map((size) => (
                <option key={size} value={size}>
                  {size} ml
                </option>
              ))}
            </SelectField>
            <TextField
              label={d.field.alcohol}
              fieldName="abv"
              optionalLabel={d.common.optional}
              inputMode="decimal"
              value={abv}
              error={errorFor('abv')}
              hint={d.common.notProvidedSample}
              onChange={(event) => setAbv(event.target.value)}
            />
          </div>

          <fieldset className="flex flex-col gap-3">
            <legend className="label mb-1">
              {d.field.grapes} <span className="font-normal text-fg-secondary">({d.common.optional})</span>
            </legend>
            {grapes.map((row, index) => (
              <div key={index} className="grid gap-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                <TextField
                  label={d.field.grapeName}
                  fieldName={`grapes.${index}.name`}
                  value={row.name}
                  error={errorFor(`grapes.${index}.name`)}
                  onChange={(event) =>
                    setGrapes((current) => current.map((entry, i) => (i === index ? { ...entry, name: event.target.value } : entry)))
                  }
                />
                <TextField
                  label={d.field.percentage}
                  fieldName={`grapes.${index}.percentage`}
                  inputMode="numeric"
                  value={row.percentage}
                  error={errorFor(`grapes.${index}.percentage`)}
                  onChange={(event) =>
                    setGrapes((current) =>
                      current.map((entry, i) => (i === index ? { ...entry, percentage: event.target.value } : entry)),
                    )
                  }
                />
                <Button
                  variant="secondary"
                  onClick={() => setGrapes((current) => current.filter((_, i) => i !== index))}
                  disabled={grapes.length === 1}
                >
                  {d.common.remove}
                </Button>
              </div>
            ))}
            {errorFor('grapes') ? <p className="text-sm font-medium text-danger">{errorFor('grapes')}</p> : null}
            <div>
              <Button
                variant="secondary"
                size="compact"
                disabled={grapes.length >= LIMITS.grapeRows}
                onClick={() => setGrapes((current) => [...current, { name: '', percentage: '' }])}
              >
                {d.common.add}
              </Button>
            </div>
          </fieldset>
        </section>
      ) : null}

      {step === 'quantity' ? (
        <section className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.winery.wizard.quantity} />
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField
              label={d.field.quantity}
              fieldName="totalBottles"
              required
              inputMode="numeric"
              value={totalBottles}
              error={errorFor('totalBottles')}
              onChange={(event) => setTotalBottles(event.target.value)}
            />
            <SelectField
              label={d.lot.production}
              value={production}
              onChange={(event) => setProduction(event.target.value as ProductionStatus)}
            >
              {PRODUCTION_OPTIONS.map((stage) => (
                <option key={stage} value={stage}>
                  {d.status.production[stage]}
                </option>
              ))}
            </SelectField>
            <TextField
              label={d.field.expectedReady}
              fieldName="expectedReady"
              type="date"
              value={expectedReady}
              error={errorFor('expectedReady')}
              onChange={(event) => setExpectedReady(event.target.value)}
            />
            <TextField
              label={d.field.royalty}
              fieldName="royalty"
              inputMode="decimal"
              value={royaltyPercent}
              error={errorFor('royalty')}
              hint={d.secondary.royalty}
              onChange={(event) => setRoyaltyPercent(event.target.value)}
            />
          </div>
          <Notice tone="info">{d.buyer.secondaryContext}</Notice>
        </section>
      ) : null}

      {step === 'evidence' ? (
        <section className="panel flex flex-col gap-4">
          <SectionHeader as="h3" title={d.winery.wizard.evidence} description={d.common.sampleDocument} />
          <ul className="flex flex-col gap-2">
            {sampleDocuments.map((document) => (
              <li key={document.id}>
                <label className="flex min-h-[48px] items-center gap-3 rounded-[8px] border border-line-strong px-3 text-sm">
                  <input
                    type="checkbox"
                    checked={documentIds.includes(document.id)}
                    onChange={(event) =>
                      setDocumentIds((current) =>
                        event.target.checked
                          ? [...current, document.id]
                          : current.filter((id) => id !== document.id),
                      )
                    }
                    className="h-5 w-5 accent-[var(--c-accent)]"
                  />
                  <span>
                    {document.label}
                    <span className="block text-fg-secondary">{document.id}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
          {errorFor('documents') ? <p className="text-sm font-medium text-danger">{errorFor('documents')}</p> : null}
          <Notice tone="info">{d.common.sampleDocument}</Notice>
        </section>
      ) : null}

      {step === 'review' ? (
        <section className="panel flex flex-col gap-5">
          <SectionHeader as="h3" title={d.winery.wizard.review} />
          <StatusBadge tone="neutral">{d.status.lot.Draft}</StatusBadge>
          <DefinitionList
            columns={2}
            items={[
              { term: d.field.wineName, value: name },
              { term: d.field.vintage, value: vintage },
              { term: d.field.region, value: `${region}, ${country}` },
              { term: d.field.bottleSize, value: `${bottleSize} ml` },
              { term: d.field.alcohol, value: abv || d.common.notProvidedSample },
              { term: d.field.grapes, value: grapes.filter((g) => g.name).map((g) => g.name).join(', ') || d.common.notProvidedSample },
              { term: d.field.quantity, value: totalBottles ? formatNumber(Number(totalBottles)) : '' },
              { term: d.lot.production, value: d.status.production[production] },
              { term: d.field.expectedReady, value: expectedReady ? formatDate(expectedReady) : d.common.notProvidedSample },
              { term: d.field.royalty, value: `${royaltyPercent}%` },
            ]}
          />
          <div>
            <p className="label mb-2">{d.field.documents}</p>
            <EvidencePanel
              documents={documentIds.map((id) => ledger.documents[id]).filter(Boolean)}
              emptyLabel={d.common.notProvidedSample}
            />
          </div>
        </section>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {step !== 'identity' ? (
          <Button variant="secondary" onClick={() => setStep(STEPS[STEPS.indexOf(step) - 1])}>
            {d.winery.wizard.back}
          </Button>
        ) : null}
        {step !== 'review' ? (
          <Button onClick={goNext}>{d.winery.wizard.next}</Button>
        ) : (
          <Button loading={controller.busy} onClick={() => void createLot()}>
            {d.winery.wizard.createDraft}
          </Button>
        )}
        <Button variant="ghost" onClick={() => navigate(link('/app/winery/lots'))}>
          {d.common.cancel}
        </Button>
      </div>

      <ActionReview
        controller={controller}
        title={d.winery.wizard.createDraft}
        summary={[
          { label: d.field.wineName, value: name },
          { label: d.field.vintage, value: vintage },
          { label: d.field.quantity, value: totalBottles ? formatNumber(Number(totalBottles)) : '', emphasis: true },
          { label: d.field.royalty, value: `${royaltyPercent}%` },
          { label: d.field.documents, value: formatNumber(documentIds.length) },
        ]}
        consequences={[d.winery.wizard.draftNote, d.status.review.submitted]}
        confirmLabel={d.winery.wizard.createDraft}
        successBody={d.status.lot.Draft}
        onSuccess={(receipt) => {
          if (receipt?.entityId) navigate(link(`/app/winery/lots/${receipt.entityId}`));
        }}
      />
    </WorkspacePage>
  );
}
