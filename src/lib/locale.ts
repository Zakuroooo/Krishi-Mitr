/**
 * Persisted locale choice. S1 writes it once; nothing else needs to touch it until
 * Shreya's real `context/LocaleContext` (SH1) exists.
 *
 * ★ Ownership note, same shape as the one already on `lib/auth.tsx`:
 *   `07_FRONTEND_ARCHITECTURE.md` §1 lists `context/LocaleContext` under Shreya, but
 *   S1 (mine) needs somewhere to persist the choice before that file exists, and
 *   `AuthStack` (mine) needs to read it to decide whether to skip S1 on a later
 *   launch. A two-function AsyncStorage wrapper is not worth a blocker on its own —
 *   this note is the blocker. Delete this file and re-point the two call sites at
 *   her context when SH1 lands.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Locale } from '../types/api';

const LOCALE_KEY = 'app.locale';

/** `null` means S1 has never run — the caller decides what that implies. */
export async function getLocale(): Promise<Locale | null> {
  const v = await AsyncStorage.getItem(LOCALE_KEY);
  return v === 'mr' || v === 'hi' || v === 'en' ? v : null;
}

export async function setLocale(locale: Locale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_KEY, locale);
}
