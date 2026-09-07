import { useState } from 'react';
import type { LotRecord } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { formatMoney } from '@/domain/money';
import { validateOfferForm, type OfferFormInput } from '@/domain/validators';
import { Button } from '@/components/ui/Button';
import { CheckboxField, ErrorSummary, SelectField, TextField } from '@/components/ui/Field';
import { Notice, SectionHeader } from '@/components/ui/Feedback';
import { ActionReview } from '@/components/trade/ActionReview';

const DEMO_ASSET = { token: 'DEMO_EUR' as const, decimals: 18, symbol: 'EURe', chainId: null };

/**
 * WIN-04 offer form. The release schedule is set before the first reservation
 * and every field is validated against the rules the contract enforces.
 */
export function OfferEditor({
  lot,
  offerableBottles,
  onDone,
  onCancel,
}: {
  lot: LotRecord;
  offerableBottles: number;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { d, locale, fmt, formatNumber } = useI18n();
  const { ledger } = useEnvironment();
  const controller = useAction();

  const [form, setForm] = useState<OfferFormInput>({
    kind: lot.production === 'Bottled' || lot.production === 'ReadyForDelivery' ? 'Standard' : 'EnPrimeur',
    quantity: String(offerableBottles),
    price: locale === 'fr' ? '8,40' : '8.40',
    startTime: ledger.nowIso.slice(0, 16),
    endTime: '',
    depositEnabled: true,
    depositBps: '3000',
    fullPaymentDeadline: '',
  });
  const [errors, setErrors] = useState<{ field: string; code: string; params?: Record<string, string | number> }[]>([]);

  const set = (key: keyof OfferFormInput) => (value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const messageFor = (code: string, params?: Record<string, string | number>) =>
    fmt((d.validation[code as keyof typeof d.validation] as string) ?? code, {
      example: locale === 'fr' ? '8,40' : '8.40',
      ...(params ?? {}),
    });

  const errorFor = (field: string) => {
    const error = errors.find((entry) => entry.field === field);
    return error ? messageFor(error.code, error.params) : undefined;
  };

  const validated = validateOfferForm(form, {
    locale,
    asset: DEMO_ASSET,
    offerableBottles,
    production: lot.production,
  });

  const submit = () => {
    if (!validated.ok) {
      setErrors(validated.errors);
      return;
    }
    setErrors([]);
    void controller.review({
      action: 'createOffer',
      lotId: lot.id,
      kind: validated.value.kind,
      quantity: validated.value.quantity,
      pricePerBottle: validated.value.price,
      startTime: validated.value.startTime,
      endTime: validated.value.endTime,
      depositBps: validated.value.depositBps,
      fullPaymentDeadline: validated.value.fullPaymentDeadline,
      milestones: [{ bps: 10_000, description: 'Full release on delivery readiness' }],
    });
  };

  return (
    <section className="panel flex flex-col gap-5">
      <SectionHeader as="h3" title={d.winery.createOffer} />

      <ErrorSummary
        title={d.common.errorSummary}
        errors={errors.map((error) => ({
          field: error.field,
          message: `${d.field[error.field as keyof typeof d.field] ?? error.field}: ${messageFor(error.code, error.params)}`,
        }))}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          label={d.field.offerType}
          fieldName="kind"
          value={form.kind}
          error={errorFor('kind')}
          onChange={(event) => set('kind')(event.target.value)}
        >
          <option value="Standard">{d.lot.standard}</option>
          <option value="EnPrimeur">{d.lot.enPrimeur}</option>
        </SelectField>
        <TextField
          label={d.field.quantity}
          fieldName="quantity"
          required
          inputMode="numeric"
          value={form.quantity}
          error={errorFor('quantity')}
          hint={fmt(d.winery.offerable, { count: formatNumber(offerableBottles) })}
          onChange={(event) => set('quantity')(event.target.value)}
        />
        <TextField
          label={d.field.price}
          fieldName="price"
          required
          inputMode="decimal"
          value={form.price}
          error={errorFor('price')}
          onChange={(event) => set('price')(event.target.value)}
        />
        <TextField
          label={d.field.saleStart}
          fieldName="startTime"
          required
          type="datetime-local"
          value={form.startTime}
          error={errorFor('startTime')}
          onChange={(event) => set('startTime')(event.target.value)}
        />
        <TextField
          label={d.field.saleEnd}
          fieldName="endTime"
          required
          type="datetime-local"
          value={form.endTime}
          error={errorFor('endTime')}
          onChange={(event) => set('endTime')(event.target.value)}
        />
        <TextField
          label={d.field.paymentDeadline}
          fieldName="fullPaymentDeadline"
          required
          type="datetime-local"
          value={form.fullPaymentDeadline}
          error={errorFor('fullPaymentDeadline')}
          onChange={(event) => set('fullPaymentDeadline')(event.target.value)}
        />
      </div>

      <CheckboxField
        label={d.field.deposit}
        checked={form.depositEnabled}
        onChange={(event) => set('depositEnabled')(event.target.checked)}
      />
      {form.depositEnabled ? (
        <TextField
          label={d.field.deposit}
          fieldName="depositBps"
          inputMode="numeric"
          value={form.depositBps}
          error={errorFor('depositBps')}
          hint="3000 = 30%"
          onChange={(event) => set('depositBps')(event.target.value)}
        />
      ) : null}

      <Notice tone="info">{d.faq.escrow.a}</Notice>

      <div className="flex flex-wrap gap-3">
        <Button onClick={submit} loading={controller.busy}>
          {d.winery.publishOffer}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {d.common.cancel}
        </Button>
      </div>

      <ActionReview
        controller={controller}
        title={d.winery.publishOffer}
        summary={[
          { label: d.field.wineName, value: lot.name },
          { label: d.field.offerType, value: form.kind === 'EnPrimeur' ? d.lot.enPrimeur : d.lot.standard },
          { label: d.field.quantity, value: validated.ok ? formatNumber(validated.value.quantity) : form.quantity },
          { label: d.field.price, value: validated.ok ? formatMoney(validated.value.price, locale) : form.price, emphasis: true },
          { label: d.field.deposit, value: form.depositEnabled ? `${Number(form.depositBps) / 100}%` : d.common.none },
        ]}
        consequences={[d.faq.deposit.a, d.faq.escrow.a]}
        confirmLabel={d.winery.publishOffer}
        successBody={d.status.offer.open}
        onSuccess={onDone}
      />
    </section>
  );
}
