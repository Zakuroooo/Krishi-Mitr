/**
 * The one "today's price" the pre-login screens are allowed to show.
 *
 * ★ Why this file exists: S0 (splash), S1 (language), S2 (phone) and S3
 *   (welcome) each show a teaser price, and each had baked its own literal
 *   into the JSX — ₹2,850–₹3,120 on three of them, ₹3,100 on the fourth,
 *   while every screen after login reads the real series and shows ₹2,050.
 *   A judge who taps through the onboarding and lands on the Market tab saw
 *   the price change by a thousand rupees for no reason. S04_Home already
 *   solved this for itself by reading the real query; these four cannot,
 *   because they run before there is a session.
 *
 * ★ So they read the same fixture the real query resolves to under
 *   `USE_FIXTURES`, rather than a number someone typed. There is exactly one
 *   place to change it, and it cannot drift from what the app shows a moment
 *   later.
 *
 * ★ Deliberately not a network call. These screens run pre-auth and I7 says
 *   the demo makes zero live external calls; a teaser price is not worth a
 *   request that can hang on venue wifi before a farmer has even logged in.
 */

import { fxPriceHistory } from '../fixtures/prices';
import { formatPaise } from './money';
import type { Locale, PricePoint } from '../types/api';

/** The most recent observation in the series every other screen reads. */
function latest(): PricePoint | undefined {
  const points = fxPriceHistory.points;
  return points.length > 0 ? points[points.length - 1] : undefined;
}

/** Today's modal price, formatted — the same figure the Market tab opens on. */
export function demoTodayPrice(locale: Locale): string {
  const point = latest();
  return point ? formatPaise(point.modal_paise_per_qtl, locale) : '';
}

/**
 * Today's low–high band, formatted as a range. The onboarding screens showed
 * a range, and a range is honest here: `min` and `max` are real fields on the
 * same record, not a spread invented to look lively.
 */
export function demoTodayRange(locale: Locale): string {
  const point = latest();
  if (!point) return '';
  return `${formatPaise(point.min_paise_per_qtl, locale)} – ${formatPaise(
    point.max_paise_per_qtl,
    locale,
  )}`;
}
