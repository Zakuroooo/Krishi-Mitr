/**
 * The date render edge. Pranay.
 *
 * Same role `money.ts` plays for paise: a `date` stays an ISO `YYYY-MM-DD`
 * string everywhere in `app/src/` and becomes human-readable in exactly one
 * place, here, at the moment it is put on screen.
 *
 * ★ Why this file exists: `S15_MyLots` was rendering `devNum(lot.harvest_date)`,
 *   which turns `2026-08-28` into `२०२६-०८-२८` — Devanagari digits arranged in
 *   ISO order. That is a wire format wearing a costume. No farmer reads a date
 *   that way in any language.
 *
 * ★ Why the string is parsed by hand instead of `new Date(iso)`: `new Date()` on
 *   a bare `YYYY-MM-DD` parses it as **UTC midnight**, then `getDate()` reads it
 *   back in local time. India is UTC+5:30 so we get lucky, but the same code on
 *   a machine behind UTC silently shows the previous day — and the CI box, a
 *   judge's laptop, and a rebuilt APK are all machines whose timezone we do not
 *   control. A harvest date is a calendar date, not an instant; it has no
 *   timezone, so it must never be routed through one.
 */

import { devNum, translate } from './i18n';
import type { Locale } from '../types/api';

/** `month_1` … `month_12`, so the caller cannot construct an off-by-one key. */
const MONTH_KEYS = [
  'month_1', 'month_2', 'month_3', 'month_4', 'month_5', 'month_6',
  'month_7', 'month_8', 'month_9', 'month_10', 'month_11', 'month_12',
] as const;

type YMD = { year: number; month: number; day: number };

/**
 * Splits a `YYYY-MM-DD` (optionally with a `T…` time part, which is discarded —
 * a calendar date is all we want). Returns `null` for anything else, so a
 * malformed value from the wire degrades to the caller's fallback instead of
 * rendering `NaN` on a farmer's screen.
 */
function parseIsoDate(iso: string): YMD | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  // `noUncheckedIndexedAccess` — the regex guarantees all three groups, but the
  // honest way to say so is a guard, not a `!`.
  if (y === undefined || m === undefined || d === undefined) return null;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/**
 * `2026-08-28` → `२८ ऑगस्ट २०२६` (mr/hi) or `28 August 2026` (en).
 *
 * Day-month-year in all three locales: it is the order every Indian form, ration
 * card and mandi receipt already uses, so it is the order a farmer reads without
 * having to think about which number is which.
 *
 * Returns `fallback` when `iso` is null, empty, or not a date we can parse.
 */
export function formatDate(
  iso: string | null | undefined,
  locale: Locale = 'mr',
  fallback = '',
): string {
  if (!iso) return fallback;
  const parsed = parseIsoDate(iso);
  if (!parsed) return fallback;
  const monthKey = MONTH_KEYS[parsed.month - 1];
  if (monthKey === undefined) return fallback;
  const month = translate(monthKey, locale);
  return `${devNum(parsed.day, locale)} ${month} ${devNum(parsed.year, locale)}`;
}

/**
 * The same date without the year — for a list of lots harvested this season,
 * where four rows repeating `२०२६` is noise. `2026-08-28` → `२८ ऑगस्ट`.
 */
export function formatDateShort(
  iso: string | null | undefined,
  locale: Locale = 'mr',
  fallback = '',
): string {
  if (!iso) return fallback;
  const parsed = parseIsoDate(iso);
  if (!parsed) return fallback;
  const monthKey = MONTH_KEYS[parsed.month - 1];
  if (monthKey === undefined) return fallback;
  return `${devNum(parsed.day, locale)} ${translate(monthKey, locale)}`;
}

/**
 * The clock time off an ISO timestamp — `2026-09-03T10:14:00+05:30` → `१०:१४`.
 *
 * ★ 24-hour, deliberately. The Stitch mockup writes "10:14 AM", but "AM" is
 *   an English token and this app renders one language at a time; a Marathi
 *   negotiation history reading "१०:१४ AM" is the same mixed-script defect
 *   the rest of the dictionary was cleaned of. A mandi runs on a 24-hour
 *   clock anyway.
 *
 * ★ Parsed off the string rather than through `Date`, for the same reason
 *   `parseIsoDate` is: `new Date(iso)` shifts a `+05:30` timestamp into the
 *   device's timezone, so a round struck at 10:14 in Lasalgaon would render
 *   as a different time on a phone set to another zone. The offset in the
 *   string is the mandi's own clock and is what the farmer means.
 */
export function formatTimeShort(
  iso: string | null | undefined,
  locale: Locale = 'mr',
  fallback = '',
): string {
  if (!iso) return fallback;
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return fallback;
  const hh = m[1]!;
  const mm = m[2]!;
  return locale === 'en' ? `${hh}:${mm}` : `${devNum(Number(hh), locale)}:${devNum(Number(mm), locale)}`;
}

/**
 * How long is left before `iso`, as "५ तास २४ मिनिटे" / "5h 24m".
 *
 * ★ Returns `null` once the moment has passed, rather than a negative or a
 *   cheerful "0 minutes left". An expired offer is a different state from an
 *   expiring one, and the caller has to say so in its own words.
 *
 * ★ Unlike the date helpers above this one *does* go through `Date`, and has
 *   to: a remaining duration is the difference between two instants, so the
 *   device clock is the right reference and the timezone in the string is
 *   handled correctly by the parser.
 */
export function formatTimeRemaining(
  iso: string | null | undefined,
  locale: Locale = 'mr',
  t?: (key: string, vars?: Record<string, string | number>) => string,
): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;

  const totalMinutes = Math.floor(ms / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  // Without a translator the caller gets a compact machine form; screens pass
  // `t` so the units read in the farmer's own language.
  if (!t) return `${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m`;

  if (days > 0) {
    return t('time_left_days', { days: devNum(days, locale), hours: devNum(hours, locale) });
  }
  if (hours > 0) {
    return t('time_left_hours', { hours: devNum(hours, locale), minutes: devNum(minutes, locale) });
  }
  return t('time_left_minutes', { minutes: devNum(minutes, locale) });
}
