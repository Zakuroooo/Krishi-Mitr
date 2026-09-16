/**
 * How an offer's note gets onto the screen.
 *
 * ★ A buyer's note is free text he typed. It renders exactly as written and
 *   is never translated: running the other party's own words through a
 *   dictionary would change what he actually said, and a negotiation record
 *   that does that is worse than one with no notes at all.
 *
 * ★ The demo notes are a different case, and they were a real bug. The
 *   fixtures wrote them as literal Marathi, so a farmer who had chosen
 *   English or Hindi found Devanagari sitting inside an otherwise
 *   single-language talks list — the app breaking its own language rule with
 *   content it had written itself. They are dictionary keys now, and this is
 *   the one place that tells the two cases apart.
 *
 * ★ The check is a closed set, not a pattern. Matching "looks like a key"
 *   would mean a buyer who typed `hold_advice` into his note had it silently
 *   replaced by a UI string.
 */

import type { TFn } from './i18n';

export const DEMO_NOTE_RAISED_FOR_TRANSPORT = 'demo_note_raised_for_transport';
export const DEMO_NOTE_TRUCK_TOMORROW = 'demo_note_truck_tomorrow';

const DEMO_NOTES: ReadonlySet<string> = new Set([
  DEMO_NOTE_RAISED_FOR_TRANSPORT,
  DEMO_NOTE_TRUCK_TOMORROW,
]);

/**
 * The note as it should appear, or `null` when there is nothing to show.
 * Callers render their own "no message" placeholder so each screen keeps its
 * own wording for the empty case.
 */
export function noteText(note: string | null | undefined, t: TFn): string | null {
  if (note === null || note === undefined) return null;
  const trimmed = note.trim();
  if (trimmed.length === 0) return null;
  return DEMO_NOTES.has(trimmed) ? t(trimmed) : trimmed;
}
