/**
 * Locale state.
 *
 * The dictionary is exposed as a typed object rather than string keys, so a
 * missing translation is a compile error instead of an English sentence
 * appearing in the French interface.
 */

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Locale } from '@/domain/types';
import {
  DEMO_TIMEZONE,
  DICTIONARIES,
  I18nContext,
  INTL_LOCALE,
  LOCALE_KEY,
  type I18nValue,
} from './i18n-context';

function readStoredLocale(): Locale {
  try {
    const stored = window.localStorage.getItem(LOCALE_KEY);
    if (stored === 'en' || stored === 'fr') return stored;
    if (typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')) return 'fr';
  } catch {
    /* storage may be unavailable */
  }
  return 'en';
}

export function I18nProvider({ children, initialLocale }: { children: ReactNode; initialLocale?: Locale }) {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale ?? readStoredLocale());

  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.lang = locale;
    try {
      window.localStorage.setItem(LOCALE_KEY, locale);
    } catch {
      /* a blocked storage never breaks the language switch */
    }
  }, [locale]);

  const setLocale = useCallback((next: Locale) => setLocaleState(next), []);

  const value = useMemo<I18nValue>(() => {
    const intlLocale = INTL_LOCALE[locale];
    return {
      locale,
      setLocale,
      d: DICTIONARIES[locale],
      intlLocale,
      fmt: (template, values) =>
        template.replace(/\{(\w+)\}/g, (match, key) => (key in values ? String(values[key]) : match)),
      formatDate: (iso, options) => {
        if (!iso) return DICTIONARIES[locale].common.notProvided;
        const date = new Date(iso);
        if (Number.isNaN(date.getTime())) return DICTIONARIES[locale].common.notProvided;
        const base: Intl.DateTimeFormatOptions = {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
          timeZone: DEMO_TIMEZONE,
        };
        if (options?.withTime) {
          base.hour = '2-digit';
          base.minute = '2-digit';
          base.second = '2-digit';
        }
        if (options?.withZone) base.timeZoneName = 'short';
        return new Intl.DateTimeFormat(intlLocale, base).format(date);
      },
      formatNumber: (value) => new Intl.NumberFormat(intlLocale).format(value),
    };
  }, [locale, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
