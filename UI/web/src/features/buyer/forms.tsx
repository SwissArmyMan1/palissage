import { useState } from 'react';
import type { EntityId, LotRecord, Position } from '@/domain/types';
import { useI18n } from '@/app/i18n-context';
import { useEnvironment } from '@/app/environment-context';
import { useAction } from '@/app/actions';
import { formatMoney, secondarySplit } from '@/domain/money';
import { transferableBottles } from '@/domain/capabilities';
import { validateDeliveryForm, validatePrice, validateQuantity, type DeliveryFormInput } from '@/domain/validators';
import { SESSION_DESTINATION_PREFIX } from '@/adapters/demo/persistence';
import { SAMPLE_DESTINATION } from '@/adapters/demo/fixtures';
import { Button } from '@/components/ui/Button';
import { CheckboxField, ErrorSummary, TextAreaField, TextField } from '@/components/ui/Field';
import { Notice } from '@/components/ui/Feedback';
import { MoneySummary } from '@/components/trade/MoneySummary';
import { QuantityInput } from '@/components/trade/QuantityInput';
import { ActionReview } from '@/components/trade/ActionReview';

/**
 * Resale listing form, shared by the allocation detail and the bottle position.
 * A listing has no expiry of its own — only the buyer's quote is time-bound.
 */
export function ListingForm({
  lot,
  position,
  onDone,
  onCancel,
}: {
  lot: LotRecord;
  position: Position | undefined;
  onDone?: () => void;
  onCancel: () => void;
}) {
  const { d, locale, fmt, formatNumber } = useI18n();
  const { ledger } = useEnvironment();
  const controller = useAction();
  const transferable = transferableBottles(position);
  const [quantity, setQuantity] = useState('1');
  const [price, setPrice] = useState(locale === 'fr' ? '9,20' : '9.20');

  const quantityCheck = validateQuantity('quantity', quantity, { min: 1, max: transferable, step: 1 });
  const priceCheck = validatePrice('price', price, locale, {
    token: 'DEMO_EUR',
    decimals: 18,
    symbol: 'EURe',
    chainId: null,
  });

  const split =
    quantityCheck.ok && priceCheck.ok
      ? secondarySplit(priceCheck.value, quantityCheck.value, ledger.secondaryFeeBps, lot.royaltyBps)
      : undefined;

  const messageFor = (code: string, params?: Record<string, string | number>) =>
    fmt((d.validation[code as keyof typeof d.validation] as string) ?? code, {
      example: locale === 'fr' ? '9,20' : '9.20',
      ...(params ?? {}),
    });

  return (
    <div className="panel flex flex-col gap-5">
      <h3 className="h3">{d.buyer.listForResale}</h3>

      <QuantityInput
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={transferable}
        label={d.lot.quantity}
        unit={d.order.quantityUnit}
        error={quantityCheck.ok ? undefined : messageFor(quantityCheck.errors[0].code, quantityCheck.errors[0].params)}
      />

      <TextField
        label={d.secondary.unitPrice}
        fieldName="price"
        inputMode="decimal"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        error={priceCheck.ok ? undefined : messageFor(priceCheck.errors[0].code, priceCheck.errors[0].params)}
        hint={locale === 'fr' ? 'Exemple : 9,20' : 'Example: 9.20'}
      />

      {split ? (
        <MoneySummary
          rows={[
            { label: d.secondary.gross, value: split.gross, emphasis: true },
            { label: d.secondary.fee, value: split.fee, negative: true },
            { label: d.secondary.royalty, value: split.royalty, negative: true },
            { label: d.secondary.proceeds, value: split.sellerNet, emphasis: true },
          ]}
          footnote={d.secondary.noExpiry}
        />
      ) : null}

      <div className="flex flex-wrap gap-3">
        <Button
          disabled={!split}
          loading={controller.busy}
          onClick={() => {
            if (!quantityCheck.ok || !priceCheck.ok) return;
            void controller.review({
              action: 'list',
              lotId: lot.id,
              quantity: quantityCheck.value,
              pricePerBottle: priceCheck.value,
            });
          }}
        >
          {d.buyer.createListing}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {d.common.cancel}
        </Button>
      </div>

      <ActionReview
        controller={controller}
        title={d.buyer.createListing}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.lot.quantity, value: formatNumber(quantityCheck.ok ? quantityCheck.value : 0) },
          { label: d.secondary.unitPrice, value: priceCheck.ok ? formatMoney(priceCheck.value, locale) : '' },
          { label: d.secondary.gross, value: split ? formatMoney(split.gross, locale) : '' },
          { label: d.secondary.fee, value: split ? formatMoney(split.fee, locale) : '' },
          { label: d.secondary.royalty, value: split ? formatMoney(split.royalty, locale) : '' },
          { label: d.secondary.proceeds, value: split ? formatMoney(split.sellerNet, locale) : '', emphasis: true },
        ]}
        consequences={[d.secondary.noExpiry, d.buyer.secondaryContext]}
        confirmLabel={d.buyer.createListing}
        successBody={d.buyer.secondaryContext}
        onSuccess={() => onDone?.()}
      />
    </div>
  );
}

const FICTIONAL: DeliveryFormInput = {
  recipient: SAMPLE_DESTINATION.recipient,
  contact: SAMPLE_DESTINATION.contact,
  email: SAMPLE_DESTINATION.email,
  phone: SAMPLE_DESTINATION.phone,
  country: SAMPLE_DESTINATION.country,
  line1: SAMPLE_DESTINATION.line1,
  line2: '',
  city: SAMPLE_DESTINATION.city,
  postalCode: SAMPLE_DESTINATION.postalCode,
  notes: '',
};

/**
 * Delivery request form. Details typed by hand stay in memory for the session
 * and are never written to storage; the persisted event records an address
 * reference only.
 */
export function DeliveryForm({
  lot,
  position,
  onDone,
  onCancel,
}: {
  lot: LotRecord;
  position: Position | undefined;
  onDone?: (redemptionId: EntityId | undefined) => void;
  onCancel: () => void;
}) {
  const { d, fmt, formatNumber } = useI18n();
  const { demo } = useEnvironment();
  const controller = useAction();
  const transferable = transferableBottles(position);
  const [quantity, setQuantity] = useState(String(Math.min(transferable, 60) || 1));
  const [useFictional, setUseFictional] = useState(true);
  const [form, setForm] = useState<DeliveryFormInput>(FICTIONAL);
  const [errors, setErrors] = useState<{ field: string; message: string }[]>([]);

  const quantityCheck = validateQuantity('quantity', quantity, { min: 1, max: transferable, step: 1 });
  const messageFor = (code: string, params?: Record<string, string | number>) =>
    fmt((d.validation[code as keyof typeof d.validation] as string) ?? code, params ?? {});

  const set = (key: keyof DeliveryFormInput) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submit = () => {
    if (!quantityCheck.ok) return;
    const validation = validateDeliveryForm(form);
    if (!validation.ok) {
      setErrors(
        validation.errors.map((error) => ({
          field: error.field,
          message: `${d.field[error.field as keyof typeof d.field] ?? error.field}: ${messageFor(error.code, error.params)}`,
        })),
      );
      return;
    }
    setErrors([]);
    // A hand-edited address becomes a session-only destination.
    const destinationId = useFictional ? SAMPLE_DESTINATION.id : `${SESSION_DESTINATION_PREFIX}${lot.id}`;
    if (!useFictional) {
      demo.addSessionDestination({
        id: destinationId,
        recipient: form.recipient,
        contact: form.contact,
        email: form.email,
        phone: form.phone,
        country: form.country,
        line1: form.line1,
        line2: form.line2 || undefined,
        city: form.city,
        postalCode: form.postalCode,
      });
    }
    void controller.review({
      action: 'requestRedemption',
      lotId: lot.id,
      quantity: quantityCheck.value,
      destinationId,
    });
  };

  const errorFor = (field: string) =>
    errors.find((error) => error.field === field)?.message.split(': ').slice(1).join(': ');

  return (
    <div className="panel flex flex-col gap-5">
      <h3 className="h3">{d.delivery.request}</h3>

      <QuantityInput
        value={quantity}
        onChange={setQuantity}
        min={1}
        max={transferable}
        label={d.lot.quantity}
        unit={d.order.quantityUnit}
        error={quantityCheck.ok ? undefined : messageFor(quantityCheck.errors[0].code, quantityCheck.errors[0].params)}
      />

      <CheckboxField
        label={d.delivery.useFictional}
        checked={useFictional}
        onChange={(event) => {
          setUseFictional(event.target.checked);
          if (event.target.checked) setForm(FICTIONAL);
        }}
      />

      <ErrorSummary title={d.common.errorSummary} errors={errors} />

      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label={d.field.organisation}
          fieldName="recipient"
          required
          disabled={useFictional}
          value={form.recipient}
          error={errorFor('recipient')}
          onChange={(event) => set('recipient')(event.target.value)}
        />
        <TextField
          label={d.field.contact}
          fieldName="contact"
          required
          disabled={useFictional}
          value={form.contact}
          error={errorFor('contact')}
          onChange={(event) => set('contact')(event.target.value)}
        />
        <TextField
          label={d.field.email}
          fieldName="email"
          type="email"
          required
          disabled={useFictional}
          value={form.email}
          error={errorFor('email')}
          onChange={(event) => set('email')(event.target.value)}
        />
        <TextField
          label={d.field.phone}
          fieldName="phone"
          required
          disabled={useFictional}
          value={form.phone}
          error={errorFor('phone')}
          onChange={(event) => set('phone')(event.target.value)}
        />
        <TextField
          label={d.field.address}
          fieldName="line1"
          required
          disabled={useFictional}
          value={form.line1}
          error={errorFor('line1')}
          onChange={(event) => set('line1')(event.target.value)}
        />
        <TextField
          label={d.field.addressLine2}
          fieldName="line2"
          disabled={useFictional}
          value={form.line2}
          error={errorFor('line2')}
          onChange={(event) => set('line2')(event.target.value)}
        />
        <TextField
          label={d.field.city}
          fieldName="city"
          required
          disabled={useFictional}
          value={form.city}
          error={errorFor('city')}
          onChange={(event) => set('city')(event.target.value)}
        />
        <TextField
          label={d.field.postcode}
          fieldName="postalCode"
          required
          disabled={useFictional}
          value={form.postalCode}
          error={errorFor('postalCode')}
          onChange={(event) => set('postalCode')(event.target.value)}
        />
        <TextField
          label={d.field.country}
          fieldName="country"
          required
          maxLength={2}
          disabled={useFictional}
          value={form.country}
          error={errorFor('country')}
          onChange={(event) => set('country')(event.target.value.toUpperCase())}
        />
      </div>

      <TextAreaField
        label={d.field.notes}
        fieldName="notes"
        optionalLabel={d.common.optional}
        disabled={useFictional}
        value={form.notes}
        error={errorFor('notes')}
        onChange={(event) => set('notes')(event.target.value)}
      />

      <Notice tone="info">{d.delivery.logisticsNote}</Notice>

      <div className="flex flex-wrap gap-3">
        <Button loading={controller.busy} onClick={submit} disabled={!quantityCheck.ok}>
          {d.delivery.request}
        </Button>
        <Button variant="secondary" onClick={onCancel}>
          {d.common.cancel}
        </Button>
      </div>

      <ActionReview
        controller={controller}
        title={d.delivery.request}
        summary={[
          { label: d.buyer.columns.lot, value: lot.name },
          { label: d.lot.quantity, value: formatNumber(quantityCheck.ok ? quantityCheck.value : 0), emphasis: true },
          { label: d.buyer.destination, value: `${form.city}, ${form.country}` },
        ]}
        consequences={[d.delivery.escrow, d.delivery.logisticsNote, d.price.exclusions]}
        confirmLabel={d.delivery.request}
        successBody={d.delivery.escrow}
        onSuccess={(receipt) => onDone?.(receipt?.entityId)}
      />
    </div>
  );
}
