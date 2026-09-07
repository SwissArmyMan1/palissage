/**
 * Runtime validation for every command and form payload.
 *
 * Validators return error *codes*; the copy for each code lives in the locale
 * dictionaries, so no English string is ever produced here.
 */

import type { Locale, Money, ProductionStatus } from './types';
import { parseAmount, units } from './money';

export type FieldError = { field: string; code: string; params?: Record<string, string | number> };
export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

export const LIMITS = {
  lotName: { min: 3, max: 120 },
  region: { min: 2, max: 100 },
  grapeName: { min: 2, max: 60 },
  grapeRows: 10,
  organisation: { min: 2, max: 120 },
  contact: { min: 2, max: 100 },
  email: 254,
  phone: { min: 5, max: 30 },
  addressLine1: { min: 3, max: 200 },
  addressLine2: 200,
  city: { min: 2, max: 100 },
  postalCode: { min: 1, max: 20 },
  notes: 500,
  message: 2000,
  reason: { min: 10, max: 2000 },
  participantReason: { min: 10, max: 1000 },
  caseDescription: { min: 10, max: 2000 },
  website: 500,
  description: 1000,
  carrier: { min: 2, max: 100 },
  trackingReference: { min: 2, max: 100 },
  documents: 5,
  bottleSizesMl: [375, 500, 750, 1500, 3000],
  abv: { min: 0, max: 25, step: 0.1 },
  royaltyBps: { min: 0, max: 1000 },
  depositBps: { min: 0, max: 9999 },
  totalBottles: { min: 1, max: 4_294_967_295 },
} as const;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const INTEGER_RE = /^\d+$/;

export function requiredText(field: string, value: string, min: number, max: number): FieldError[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) return [{ field, code: 'required' }];
  if (trimmed.length < min) return [{ field, code: 'tooShort', params: { min } }];
  if (trimmed.length > max) return [{ field, code: 'tooLong', params: { max } }];
  return [];
}

export function optionalText(field: string, value: string, max: number): FieldError[] {
  if (value.trim().length === 0) return [];
  if (value.trim().length > max) return [{ field, code: 'tooLong', params: { max } }];
  return [];
}

export function validateEmail(field: string, value: string, required = true): FieldError[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) return required ? [{ field, code: 'required' }] : [];
  if (trimmed.length > LIMITS.email) return [{ field, code: 'tooLong', params: { max: LIMITS.email } }];
  if (!EMAIL_RE.test(trimmed)) return [{ field, code: 'email' }];
  return [];
}

export function validateHttpsUrl(field: string, value: string): FieldError[] {
  const trimmed = value.trim();
  if (trimmed.length === 0) return [];
  if (trimmed.length > LIMITS.website) return [{ field, code: 'tooLong', params: { max: LIMITS.website } }];
  try {
    const url = new URL(trimmed);
    if (url.protocol !== 'https:') return [{ field, code: 'https' }];
  } catch {
    return [{ field, code: 'url' }];
  }
  return [];
}

export type QuantityRules = { min: number; max: number; step: number };

/**
 * Whole bottles only. Out-of-range and off-step values are reported, never
 * silently rounded to the nearest allowed quantity.
 */
export function validateQuantity(field: string, raw: string, rules: QuantityRules): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, errors: [{ field, code: 'required' }] };
  if (!INTEGER_RE.test(trimmed)) return { ok: false, errors: [{ field, code: 'wholeNumber' }] };
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value)) return { ok: false, errors: [{ field, code: 'wholeNumber' }] };
  if (rules.max <= 0) return { ok: false, errors: [{ field, code: 'noneAvailable' }] };
  if (value < rules.min || value > rules.max) {
    return { ok: false, errors: [{ field, code: 'quantityRange', params: { min: rules.min, max: rules.max } }] };
  }
  if (rules.step > 1 && (value - rules.min) % rules.step !== 0) {
    return { ok: false, errors: [{ field, code: 'quantityStep', params: { step: rules.step } }] };
  }
  return { ok: true, value };
}

export function validatePrice(
  field: string,
  raw: string,
  locale: Locale,
  asset: Pick<Money, 'token' | 'decimals' | 'symbol' | 'chainId'>,
): ValidationResult<Money> {
  const parsed = parseAmount(raw, asset.decimals, locale);
  if (!parsed.ok) {
    const code = parsed.code === 'empty' ? 'required' : parsed.code === 'precision' ? 'pricePrecision' : 'priceFormat';
    return { ok: false, errors: [{ field, code, params: { decimals: asset.decimals } }] };
  }
  if (parsed.units <= 0n) return { ok: false, errors: [{ field, code: 'pricePositive' }] };
  return {
    ok: true,
    value: {
      units: parsed.units.toString(),
      token: asset.token,
      decimals: asset.decimals,
      symbol: asset.symbol,
      chainId: asset.chainId,
    },
  };
}

export function validateVintage(field: string, raw: string, currentYear: number): ValidationResult<number> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: false, errors: [{ field, code: 'required' }] };
  if (!INTEGER_RE.test(trimmed)) return { ok: false, errors: [{ field, code: 'wholeNumber' }] };
  const value = Number(trimmed);
  const max = currentYear + 2;
  if (value < 1900 || value > max) {
    return { ok: false, errors: [{ field, code: 'vintageRange', params: { min: 1900, max } }] };
  }
  return { ok: true, value };
}

export function validateAbv(field: string, raw: string, locale: Locale): ValidationResult<string> {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return { ok: true, value: '' };
  const separator = locale === 'fr' ? ',' : '.';
  const normalised = trimmed.split(separator).join('.');
  if (!/^\d+(\.\d)?$/.test(normalised)) return { ok: false, errors: [{ field, code: 'abvFormat' }] };
  const value = Number(normalised);
  if (value < LIMITS.abv.min || value > LIMITS.abv.max) {
    return { ok: false, errors: [{ field, code: 'abvRange', params: { min: LIMITS.abv.min, max: LIMITS.abv.max } }] };
  }
  return { ok: true, value: normalised };
}

export type GrapeInput = { name: string; percentage: string };

export function validateGrapes(rows: GrapeInput[]): ValidationResult<{ name: string; percentage: number | null }[]> {
  const errors: FieldError[] = [];
  const filled = rows.filter((row) => row.name.trim().length > 0 || row.percentage.trim().length > 0);
  if (filled.length > LIMITS.grapeRows) {
    errors.push({ field: 'grapes', code: 'tooManyRows', params: { max: LIMITS.grapeRows } });
  }
  const parsed = filled.map((row, index) => {
    errors.push(...requiredText(`grapes.${index}.name`, row.name, LIMITS.grapeName.min, LIMITS.grapeName.max));
    let percentage: number | null = null;
    const rawPercentage = row.percentage.trim();
    if (rawPercentage.length > 0) {
      if (!INTEGER_RE.test(rawPercentage)) {
        errors.push({ field: `grapes.${index}.percentage`, code: 'wholeNumber' });
      } else {
        percentage = Number(rawPercentage);
        if (percentage < 0 || percentage > 100) {
          errors.push({ field: `grapes.${index}.percentage`, code: 'percentageRange' });
        }
      }
    }
    return { name: row.name.trim(), percentage };
  });
  const allHavePercentage = parsed.length > 0 && parsed.every((row) => row.percentage !== null);
  if (allHavePercentage) {
    const sum = parsed.reduce((total, row) => total + (row.percentage ?? 0), 0);
    if (sum !== 100) errors.push({ field: 'grapes', code: 'percentageSum', params: { sum } });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: parsed };
}

export type DeliveryFormInput = {
  recipient: string;
  contact: string;
  email: string;
  phone: string;
  country: string;
  line1: string;
  line2: string;
  city: string;
  postalCode: string;
  notes: string;
};

export function validateDeliveryForm(input: DeliveryFormInput): ValidationResult<DeliveryFormInput> {
  const errors: FieldError[] = [
    ...requiredText('recipient', input.recipient, LIMITS.organisation.min, LIMITS.organisation.max),
    ...requiredText('contact', input.contact, LIMITS.contact.min, LIMITS.contact.max),
    ...validateEmail('email', input.email),
    ...requiredText('phone', input.phone, LIMITS.phone.min, LIMITS.phone.max),
    ...requiredText('country', input.country, 2, 2),
    ...requiredText('line1', input.line1, LIMITS.addressLine1.min, LIMITS.addressLine1.max),
    ...optionalText('line2', input.line2, LIMITS.addressLine2),
    ...requiredText('city', input.city, LIMITS.city.min, LIMITS.city.max),
    ...requiredText('postalCode', input.postalCode, LIMITS.postalCode.min, LIMITS.postalCode.max),
    ...optionalText('notes', input.notes, LIMITS.notes),
  ];
  // Postal-code shape follows the destination country's policy, so a French
  // five-digit rule is never applied to every country.
  if (input.country.trim().toUpperCase() === 'FR' && input.postalCode.trim().length > 0) {
    if (!/^\d{5}$/.test(input.postalCode.trim())) errors.push({ field: 'postalCode', code: 'postalCodeFr' });
  }
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input };
}

export type PilotFormInput = {
  organisation: string;
  contact: string;
  email: string;
  role: string;
  country: string;
  website: string;
  message: string;
};

export function validatePilotForm(input: PilotFormInput): ValidationResult<PilotFormInput> {
  const errors: FieldError[] = [
    ...requiredText('organisation', input.organisation, LIMITS.organisation.min, LIMITS.organisation.max),
    ...requiredText('contact', input.contact, LIMITS.contact.min, LIMITS.contact.max),
    ...validateEmail('email', input.email),
    ...requiredText('role', input.role, 1, 40),
    ...requiredText('country', input.country, 2, 2),
    ...validateHttpsUrl('website', input.website),
    ...optionalText('message', input.message, LIMITS.message),
  ];
  return errors.length > 0 ? { ok: false, errors } : { ok: true, value: input };
}

export type OfferFormInput = {
  kind: 'Standard' | 'EnPrimeur';
  quantity: string;
  price: string;
  startTime: string;
  endTime: string;
  depositEnabled: boolean;
  depositBps: string;
  fullPaymentDeadline: string;
};

export type OfferFormValue = {
  kind: 'Standard' | 'EnPrimeur';
  quantity: number;
  price: Money;
  startTime: string;
  endTime: string;
  depositBps: number;
  fullPaymentDeadline: string;
};

export function validateOfferForm(
  input: OfferFormInput,
  context: {
    locale: Locale;
    asset: Pick<Money, 'token' | 'decimals' | 'symbol' | 'chainId'>;
    offerableBottles: number;
    production: ProductionStatus;
  },
): ValidationResult<OfferFormValue> {
  const errors: FieldError[] = [];
  const quantity = validateQuantity('quantity', input.quantity, {
    min: 1,
    max: context.offerableBottles,
    step: 1,
  });
  if (!quantity.ok) errors.push(...quantity.errors);
  const price = validatePrice('price', input.price, context.locale, context.asset);
  if (!price.ok) errors.push(...price.errors);

  const start = Date.parse(input.startTime);
  const end = Date.parse(input.endTime);
  const deadline = Date.parse(input.fullPaymentDeadline);
  if (!Number.isFinite(start)) errors.push({ field: 'startTime', code: 'required' });
  if (!Number.isFinite(end)) errors.push({ field: 'endTime', code: 'required' });
  if (Number.isFinite(start) && Number.isFinite(end) && end <= start) {
    errors.push({ field: 'endTime', code: 'endAfterStart' });
  }
  if (!Number.isFinite(deadline)) {
    errors.push({ field: 'fullPaymentDeadline', code: 'required' });
  } else if (Number.isFinite(end) && deadline < end) {
    errors.push({ field: 'fullPaymentDeadline', code: 'deadlineAfterEnd' });
  }

  let depositBps = 0;
  if (input.depositEnabled) {
    const raw = input.depositBps.trim();
    if (!INTEGER_RE.test(raw)) {
      errors.push({ field: 'depositBps', code: 'wholeNumber' });
    } else {
      depositBps = Number(raw);
      if (depositBps < 1 || depositBps > LIMITS.depositBps.max) {
        errors.push({ field: 'depositBps', code: 'depositRange' });
      }
    }
  }
  // En Primeur only exists strictly before Bottled.
  if (input.kind === 'EnPrimeur' && (context.production === 'Bottled' || context.production === 'ReadyForDelivery')) {
    errors.push({ field: 'kind', code: 'enPrimeurProduction' });
  }
  if (errors.length > 0 || !quantity.ok || !price.ok) return { ok: false, errors };

  // Guard against a deposit that floors to zero on a very small unit price.
  const depositUnits = (units(price.value) * BigInt(quantity.value) * BigInt(depositBps)) / 10_000n;
  if (depositBps > 0 && depositUnits === 0n) {
    return { ok: false, errors: [{ field: 'depositBps', code: 'depositBelowPrecision' }] };
  }

  return {
    ok: true,
    value: {
      kind: input.kind,
      quantity: quantity.value,
      price: price.value,
      startTime: new Date(start).toISOString(),
      endTime: new Date(end).toISOString(),
      depositBps,
      fullPaymentDeadline: new Date(deadline).toISOString(),
    },
  };
}

export function firstErrorField(errors: FieldError[]): string | undefined {
  return errors[0]?.field;
}
