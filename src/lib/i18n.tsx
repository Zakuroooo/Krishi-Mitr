import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import mr from '../i18n/mr.json';
import en from '../i18n/en.json';
import hi from '../i18n/hi.json';
import { getLocale as getPersistedLocale, setLocale as persistLocale } from './locale';
import type { Locale } from '../types/api';

const DICTS: Record<Locale, Record<string, string>> = { mr, hi, en };

const DEV_DIGITS = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

/**
 * Converts Latin digits (0-9) to Devanagari numerals (०-९) for Marathi and Hindi.
 */
export function devNum(n: number | string, locale: Locale = 'mr'): string {
  const str = String(n);
  if (locale === 'en') return str;
  // `noUncheckedIndexedAccess` types DEV_DIGITS[i] as string | undefined; the
  // regex only ever matches 0-9 so this can't actually miss, but the honest way
  // to satisfy the type is a fallback, not a `!`.
  return str.replace(/\d/g, d => DEV_DIGITS[+d] ?? d);
}

/**
 * Plain-function lookup, for the handful of places that need a translated
 * string outside a component's render (a module-level map keyed by
 * `DataSource`, say) and so cannot call the `useT()` hook. Same dictionary,
 * same fallback rules as `t()` itself — this is not a second translation
 * system, just the same one usable without a component.
 */
export function translate(
  key: string,
  locale: Locale = 'mr',
  vars?: Record<string, string | number>,
): string {
  const dict = DICTS[locale] ?? DICTS.mr;
  let text = dict[key] ?? `⟨${key}⟩`;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
}

export type TFn = (key: string, vars?: Record<string, string | number>) => string;

interface I18nContextValue {
  t: TFn;
  locale: Locale;
  setLocale: (locale: Locale) => void;
  devNum: (n: number | string) => string;
}

const defaultT: TFn = (key, vars) => {
  let text = mr[key as keyof typeof mr] || `⟨${key}⟩`;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }
  return text;
};

const defaultContextValue: I18nContextValue = {
  t: defaultT,
  locale: 'mr',
  setLocale: () => {},
  devNum: n => devNum(n, 'mr'),
};

const I18nContext = createContext<I18nContextValue>(defaultContextValue);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('mr'); // Marathi is the DEFAULT until S1 has run

  // ★ BUG FIXED: this context's `locale` was write-only from S1's side — S1
  //   called `lib/locale.ts`'s `setLocale` (AsyncStorage) directly, never this
  //   context's, so `t()` stayed on 'mr' for the entire app session no matter
  //   what a farmer picked. Every screen's own `getLocale()`-on-mount pattern
  //   for number formatting was unaffected (it never read this context), but
  //   any component using `useT()`'s `t` for text — `VerdictCard`, `PledgeCard`
  //   — silently ignored the language picker.
  //
  //   Two halves to the fix: read the persisted value once at boot (below),
  //   and make `setLocale` (exposed below) the one function that both updates
  //   this context *and* persists — see `S01_Language.tsx`, which now calls
  //   this instead of `lib/locale.ts`'s export directly.
  useEffect(() => {
    let cancelled = false;
    getPersistedLocale().then(l => {
      if (!cancelled && l) setLocaleState(l);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    persistLocale(l).catch(() => {
      // Best-effort persistence — the in-memory context already has the
      // right value for this session; a failed AsyncStorage write means the
      // next cold start re-asks, not that this session is wrong.
    });
  }, []);

  const t = useCallback<TFn>(
    (key, vars) => {
      const dict = DICTS[locale] || DICTS.mr;
      let text = dict[key] ?? `⟨${key}⟩`;

      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
        }
      }

      return text;
    },
    [locale],
  );

  const formatDevNum = useCallback((n: number | string) => devNum(n, locale), [locale]);

  return (
    <I18nContext.Provider value={{ t, locale, setLocale, devNum: formatDevNum }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useT(): I18nContextValue {
  const ctx = useContext(I18nContext);
  return ctx || defaultContextValue;
}
