/**
 * Locale context and formatting contract.
 *
 * Split from the provider component so that the hook and its types can be
 * imported without pulling a component into the same module.
 */

import { createContext, useContext } from 'react';
import type { Locale } from '@/domain/types';
import { en, type Dictionary } from '@/content/en';
import { fr } from '@/content/fr';

export const DICTIONARIES: Record<Locale, Dictionary> = { en, fr };
export const LOCALE_KEY = 'palissage.locale';
export const INTL_LOCALE: Record<Locale, string> = { en: 'en-GB', fr: 'fr-FR' };
export const DEMO_TIMEZONE = 'Europe/Paris';

export type I18nValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  d: Dictionary;
  /** Replaces `{name}` placeholders. Values are formatted by the caller. */
  fmt: (template: string, values: Record<string, string | number>) => string;
  formatDate: (iso: string | undefined, options?: { withTime?: boolean; withZone?: boolean }) => string;
  formatNumber: (value: number) => string;
  intlLocale: string;
};

export const I18nContext = createContext<I18nValue | undefined>(undefined);

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside I18nProvider');
  return value;
}
