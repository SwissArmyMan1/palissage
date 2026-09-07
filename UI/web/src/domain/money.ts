/**
 * Integer money for the Palissage UI.
 *
 * Every formula here mirrors the contract arithmetic recorded in
 * specifications/ui-mvp/04-data-contracts-and-states.md §6. No float is used
 * anywhere in the calculation path; `Number` never touches a monetary value.
 */

import type { Locale, Money, UnitString } from './types';

export const BPS = 10_000n;

export const DEMO_TOKEN: Pick<Money, 'token' | 'decimals' | 'symbol' | 'chainId'> = {
  token: 'DEMO_EUR',
  decimals: 18,
  symbol: 'EURe',
  chainId: null,
};

const UNITS_RE = /^\d+$/;

export function isUnitString(value: string): value is UnitString {
  return UNITS_RE.test(value);
}

export function units(money: Money): bigint {
  if (!isUnitString(money.units)) {
    throw new Error(`Invalid base-unit string: ${money.units}`);
  }
  return BigInt(money.units);
}

export function money(value: bigint, like: Pick<Money, 'token' | 'decimals' | 'symbol' | 'chainId'> = DEMO_TOKEN): Money {
  if (value < 0n) throw new Error('Money cannot be negative');
  // `like` is often a full Money, so the asset fields are copied one by one:
  // spreading it would put the template's own amount back over `value`.
  return { units: value.toString(), token: like.token, decimals: like.decimals, symbol: like.symbol, chainId: like.chainId };
}

export function zero(like: Pick<Money, 'token' | 'decimals' | 'symbol' | 'chainId'> = DEMO_TOKEN): Money {
  return money(0n, like);
}

function assertSameAsset(a: Money, b: Money) {
  if (a.token !== b.token || a.decimals !== b.decimals || a.chainId !== b.chainId) {
    throw new Error('Refusing to combine amounts from different payment assets');
  }
}

export function addMoney(a: Money, b: Money): Money {
  assertSameAsset(a, b);
  return money(units(a) + units(b), a);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameAsset(a, b);
  const result = units(a) - units(b);
  return money(result < 0n ? 0n : result, a);
}

export function maxMoney(a: Money, b: Money): Money {
  assertSameAsset(a, b);
  return units(a) >= units(b) ? a : b;
}

export function cmpMoney(a: Money, b: Money): -1 | 0 | 1 {
  assertSameAsset(a, b);
  const x = units(a);
  const y = units(b);
  return x < y ? -1 : x > y ? 1 : 0;
}

export function isZero(a: Money): boolean {
  return units(a) === 0n;
}

export function floorDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new Error('Divisor must be positive');
  return a / b;
}

export function ceilDiv(a: bigint, b: bigint): bigint {
  if (b <= 0n) throw new Error('Divisor must be positive');
  return (a + b - 1n) / b;
}

/** `T = q * p` — total primary amount due for `quantity` bottles. */
export function totalDue(pricePerBottle: Money, quantity: number): Money {
  return money(units(pricePerBottle) * BigInt(quantity), pricePerBottle);
}

/** `D = floor(T * depositBps / B)`. depositBps === 0 disables the deposit path. */
export function depositAmount(total: Money, depositBps: number): Money {
  return money(floorDiv(units(total) * BigInt(depositBps), BPS), total);
}

/** Remaining balance on a partly-paid allocation. */
export function remainingBalance(total: Money, paid: Money): Money {
  return subMoney(total, paid);
}

/** `floor(gross * primaryFeeBps / B)` — withheld from the winery payout. */
export function primaryFee(gross: Money, primaryFeeBps: number): Money {
  return money(floorDiv(units(gross) * BigInt(primaryFeeBps), BPS), gross);
}

/** What the winery actually receives: buyers never pay `T + fee`. */
export function wineryProceeds(gross: Money, primaryFeeBps: number): Money {
  return subMoney(gross, primaryFee(gross, primaryFeeBps));
}

/** `entitled = floor(settledFunds * releasedBps / B)`. */
export function entitledGross(settledFunds: Money, releasedBps: number): Money {
  return money(floorDiv(units(settledFunds) * BigInt(releasedBps), BPS), settledFunds);
}

/** `gross = max(entitled - withdrawnGross, 0)`. */
export function withdrawableGross(settledFunds: Money, releasedBps: number, withdrawnGross: Money): Money {
  return subMoney(entitledGross(settledFunds, releasedBps), withdrawnGross);
}

/** `A = settledFunds === 0 ? 0 : ceil(withdrawnGross * paidAmount / settledFunds)`. */
export function defaultAlreadyPaidShare(withdrawnGross: Money, paidAmount: Money, settledFunds: Money): Money {
  const settled = units(settledFunds);
  if (settled === 0n) return zero(settledFunds);
  return money(ceilDiv(units(withdrawnGross) * units(paidAmount), settled), settledFunds);
}

export type SecondarySplit = {
  gross: Money;
  fee: Money;
  royalty: Money;
  sellerNet: Money;
};

/**
 * `S = q * p`; `F = floor(S * secondaryFeeBps / B)`; `R = floor(S * royaltyBps / B)`.
 * Fee and royalty come out of `S` — they are never added on top of the buyer total.
 */
export function secondarySplit(
  pricePerBottle: Money,
  quantity: number,
  secondaryFeeBps: number,
  royaltyBps: number,
): SecondarySplit {
  const gross = totalDue(pricePerBottle, quantity);
  const grossUnits = units(gross);
  const fee = money(floorDiv(grossUnits * BigInt(secondaryFeeBps), BPS), gross);
  const royalty = money(floorDiv(grossUnits * BigInt(royaltyBps), BPS), gross);
  const sellerNet = money(grossUnits - units(fee) - units(royalty), gross);
  return { gross, fee, royalty, sellerNet };
}

/* ------------------------------------------------------------------ */
/* Parsing and formatting                                              */
/* ------------------------------------------------------------------ */

const SEPARATOR_CACHE = new Map<Locale, { group: string; decimal: string }>();

function separators(locale: Locale) {
  const cached = SEPARATOR_CACHE.get(locale);
  if (cached) return cached;
  const intlLocale = locale === 'fr' ? 'fr-FR' : 'en-GB';
  const parts = new Intl.NumberFormat(intlLocale).formatToParts(1234567.8);
  const value = {
    group: parts.find((p) => p.type === 'group')?.value ?? ',',
    decimal: parts.find((p) => p.type === 'decimal')?.value ?? '.',
  };
  SEPARATOR_CACHE.set(locale, value);
  return value;
}

/** Splits base units into `{ integer, fraction }` decimal strings, no rounding. */
export function toDecimalParts(value: bigint, decimals: number): { integer: string; fraction: string } {
  const digits = value.toString().padStart(decimals + 1, '0');
  const cut = digits.length - decimals;
  return { integer: digits.slice(0, cut), fraction: decimals === 0 ? '' : digits.slice(cut) };
}

function groupInteger(integer: string, group: string): string {
  let out = '';
  for (let i = 0; i < integer.length; i += 1) {
    if (i > 0 && (integer.length - i) % 3 === 0) out += group;
    out += integer[i];
  }
  return out;
}

export type FormatOptions = {
  /** Digits shown after the separator. Defaults to 2. */
  fractionDigits?: number;
  /** Show every non-zero digit up to `decimals` instead of truncating. */
  exact?: boolean;
  /** Prepend the `€` sign. Base-unit exact views use the token symbol instead. */
  withSymbol?: boolean;
};

/**
 * Formats base units for display. Truncates (never rounds up) so that a
 * displayed amount is always ≤ the amount actually charged; `exact` shows the
 * full precision required by the secondary split.
 */
export function formatUnits(value: bigint, decimals: number, locale: Locale, options: FormatOptions = {}): string {
  const { integer, fraction } = toDecimalParts(value, decimals);
  const { group, decimal } = separators(locale);
  let shown: string;
  if (options.exact) {
    shown = fraction.replace(/0+$/, '');
    if (shown.length < 2) shown = fraction.slice(0, 2);
  } else {
    shown = fraction.slice(0, options.fractionDigits ?? 2);
  }
  const grouped = groupInteger(integer, group);
  return shown.length > 0 ? `${grouped}${decimal}${shown}` : grouped;
}

/** Display form of a `Money`, e.g. `€1,008.00` / `1 008,00 €`. */
export function formatMoney(value: Money, locale: Locale, options: FormatOptions = {}): string {
  const digits = formatUnits(units(value), value.decimals, locale, options);
  if (options.withSymbol === false) return digits;
  return locale === 'fr' ? `${digits} €` : `€${digits}`;
}

/** Exact settlement precision, e.g. `220.800 EURe` — used in expanded breakdowns. */
export function formatExact(value: Money, locale: Locale, minFractionDigits = 3): string {
  const { integer, fraction } = toDecimalParts(units(value), value.decimals);
  const { group, decimal } = separators(locale);
  let shown = fraction.replace(/0+$/, '');
  if (shown.length < minFractionDigits) shown = fraction.slice(0, minFractionDigits);
  return `${groupInteger(integer, group)}${decimal}${shown} ${value.symbol}`;
}

export type ParseResult =
  | { ok: true; units: bigint }
  | { ok: false; code: 'empty' | 'format' | 'precision' | 'negative' };

/**
 * Parses a locale-specific decimal input into base units.
 * EN accepts `8.40`, FR accepts `8,40`. Thousands separators and mixed
 * notation are rejected rather than guessed.
 */
export function parseAmount(input: string, decimals: number, locale: Locale): ParseResult {
  const raw = input.trim();
  if (raw.length === 0) return { ok: false, code: 'empty' };
  if (raw.startsWith('-')) return { ok: false, code: 'negative' };
  const separator = locale === 'fr' ? ',' : '.';
  const foreign = locale === 'fr' ? '.' : ',';
  if (raw.includes(foreign) || /\s/.test(raw)) return { ok: false, code: 'format' };
  const parts = raw.split(separator);
  if (parts.length > 2) return { ok: false, code: 'format' };
  const [integer, fraction = ''] = parts;
  if (!/^\d+$/.test(integer)) return { ok: false, code: 'format' };
  if (fraction.length > 0 && !/^\d+$/.test(fraction)) return { ok: false, code: 'format' };
  if (fraction.length > decimals) return { ok: false, code: 'precision' };
  return { ok: true, units: BigInt(integer + fraction.padEnd(decimals, '0')) };
}

/** Renders base units back into the plain input form (`8.40` / `8,40`). */
export function toInputValue(value: Money, locale: Locale, fractionDigits = 2): string {
  const { integer, fraction } = toDecimalParts(units(value), value.decimals);
  const separator = locale === 'fr' ? ',' : '.';
  const shown = fraction.slice(0, fractionDigits);
  return shown.length > 0 ? `${integer}${separator}${shown}` : integer;
}

export function bpsToPercent(bps: number, locale: Locale): string {
  const whole = Math.trunc(bps / 100);
  const rest = bps % 100;
  const separator = locale === 'fr' ? ',' : '.';
  const digits = rest === 0 ? `${whole}` : `${whole}${separator}${String(rest).padStart(2, '0').replace(/0$/, '')}`;
  return locale === 'fr' ? `${digits} %` : `${digits}%`;
}
