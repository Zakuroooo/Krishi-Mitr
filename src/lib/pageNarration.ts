/**
 * pageNarration.ts — what a screen *says* when a farmer presses Listen.
 *
 * ★ Why this exists. The Home screen used to narrate by joining six
 *   label-and-value fragments with a full stop:
 *
 *       "Krishi Mitra. Today's rate: ₹2,054. +₹8. Hold.
 *        Expected gain: ₹6,290. Worst case: ₹4,800."
 *
 *   That is a table read aloud. It never says how many days to hold, why the
 *   price is expected to move, what the holding cost covers, or what to press
 *   next — and it is the only way a farmer who cannot read receives any of it.
 *   A man who cannot read the screen was getting strictly less information
 *   than a man who could, from the feature built for him.
 *
 * ★ What replaced it. Full sentences, in the order a person actually explains
 *   something: **where you are → what the price is → what I advise → why →
 *   what you gain → what you risk → what it costs → what to press next.**
 *   Every clause is a dictionary key with placeholders, so Marathi, Hindi and
 *   English are written by translators rather than assembled by grammar rules
 *   that would only ever be right for one of them.
 *
 * ★ Numbers are spoken as words in Marathi (`spokenRupees`, `spokenDays`),
 *   not read as digits. "६२९०" read digit by digit is noise; "सहा हजार दोनशे
 *   नव्वद रुपये" is a quantity. Hindi and English fall back to formatted
 *   numerals, which their TTS voices already read correctly.
 *
 * ★ **The worst case is never optional.** I16 says the downside renders at the
 *   same size as the gain; the same rule holds in the ear. Every builder that
 *   speaks a gain speaks the risk in the next sentence, in the same sentence
 *   shape. There is no code path here that mentions one without the other.
 */

import type { Locale, PricePoint, WindowRes } from '../types/api';
import { devNum, translate } from './i18n';
import { formatPaise, toQuintal } from './money';
import { spokenDays, spokenNumber, spokenRupees } from './mrNumberWords';

/**
 * Money for the ear.
 *
 * Marathi gets words; the other two get the same formatted figure they see on
 * screen, because their voices handle numerals well and a hand-rolled Hindi
 * number speller would be a new source of wrong.
 */
function money(paise: number, locale: Locale): string {
  return locale === 'mr' ? spokenRupees(Math.abs(paise)) : formatPaise(Math.abs(paise), locale);
}

/**
 * Day counts for the ear, same split as `money`.
 *
 * ★ Hindi gets Devanagari numerals rather than ASCII. `formatPaise` already
 *   returns "₹२,०५४" for hi, so a bare "7" in the same sentence mixed two
 *   numeral systems inside one utterance — which reads as a typo on screen and
 *   can shift register in the voice.
 */
function days(n: number, locale: Locale): string {
  if (locale === 'mr') return spokenDays(n);
  return translate('nar_days', locale, { n: devNum(n, locale) });
}

/** Joins the clauses that survived into one utterance. */
function say(parts: Array<string | null>): string {
  return parts.filter((p): p is string => p !== null && p.length > 0).join(' ');
}

export interface HomeNarrationInput {
  /** The farmer's own name, when we know it — the narration opens with it. */
  farmerName?: string | null;
  /** The mandi this screen is showing. */
  marketName: string;
  /** The crop this screen is showing. */
  cropName: string;
  /** Most recent price point, or null while loading. */
  latest: PricePoint | null;
  /** Change against the previous close, in paise. */
  deltaPaise: number;
  /** How many days the price has moved in the same direction. */
  streakDays?: number | null;
  /** The decision engine's verdict, or null when we have none. */
  verdict: WindowRes | null;
  /** The farmer's lot size, so gains are stated on his actual quantity. */
  lotKg?: number | null;
  /** Per-quintal cost of holding, when the verdict carries one. */
  holdCostPaisePerQtl?: number | null;
}

/**
 * The Home screen, spoken.
 *
 * Reads as one continuous explanation rather than a list, and always ends by
 * naming the control the farmer should press next — a farmer who cannot read
 * cannot find a button by its label, so the narration has to hand it to him.
 */
export function buildHomeNarration(input: HomeNarrationInput, locale: Locale): string {
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(key, locale, vars);

  const {
    farmerName,
    marketName,
    cropName,
    latest,
    deltaPaise,
    streakDays,
    verdict,
    lotKg,
    holdCostPaisePerQtl,
  } = input;

  // 1. Where he is.
  const greeting = farmerName
    ? t('nar_greeting_named', { name: farmerName })
    : t('nar_greeting');

  // 2. What the price is. Without this there is nothing to advise about, so a
  //    missing price short-circuits the whole narration rather than producing
  //    advice with no number attached to it.
  if (!latest) {
    return say([greeting, t('nar_home_no_price', { market: marketName })]);
  }

  const rate = t('nar_home_rate', {
    crop: cropName,
    market: marketName,
    price: money(latest.modal_paise_per_qtl, locale),
  });

  // 3. Which way it is moving, and for how long — the "why" behind a hold.
  const movement =
    deltaPaise === 0
      ? null
      : t(deltaPaise > 0 ? 'nar_home_up' : 'nar_home_down', {
          amount: money(deltaPaise, locale),
        });

  const streak =
    streakDays && streakDays >= 2
      ? t(deltaPaise > 0 ? 'nar_home_streak_up' : 'nar_home_streak_down', {
          days: days(streakDays, locale),
        })
      : null;

  // 4. The advice itself.
  const advice = verdict ? adviceClauses(verdict, locale, lotKg, holdCostPaisePerQtl) : [];

  // 5. What to do next.
  const next = verdict
    ? verdict.action === 'NO_ADVICE'
      ? t('nar_home_next_no_advice')
      : t('nar_home_next')
    : null;

  return say([greeting, rate, movement, streak, ...advice, next]);
}

/**
 * The verdict, as sentences.
 *
 * Split out because the Verdict screen speaks the same reasoning at more
 * length, and the two must never disagree about what the app is advising.
 */
export function adviceClauses(
  v: WindowRes,
  locale: Locale,
  lotKg?: number | null,
  holdCostPaisePerQtl?: number | null,
): string[] {
  const t = (key: string, vars?: Record<string, string | number>) =>
    translate(key, locale, vars);

  // ★ A refusal is never paraphrased into something that sounds like advice.
  //   The reason is stated and the narration stops — no gain, no risk, no
  //   "but you could". See verdictVoice.ts for the same rule on S9.
  if (v.action === 'NO_ADVICE') {
    return [t('nar_advice_none'), v.refusal_reason ? t(`nar_refusal_${v.refusal_reason}`) : null].filter(
      (s): s is string => s !== null,
    );
  }

  const out: string[] = [];

  // What to do, as an instruction rather than a label.
  if (v.action === 'HOLD' && v.hold_days) {
    out.push(t('nar_advice_hold', { days: days(v.hold_days, locale) }));
  } else if (v.action === 'SELL_NOW') {
    out.push(t('nar_advice_sell_now'));
  } else if (v.action === 'SELL_ELSEWHERE') {
    out.push(t('nar_advice_sell_elsewhere'));
  } else if (v.action === 'SPLIT') {
    out.push(t('nar_advice_split'));
  }

  // Why — the part the old narration had no sentence for at all.
  //
  // ★ `explain_mr` is deliberately *not* used here even in Marathi. It is the
  //   card's on-screen copy and it restates the gain ("११ दिवस थांबल्यास
  //   सरासरी ₹६,२९० जास्त"), so injecting it made the narration say the same
  //   number twice — once in digits and once in words, a few seconds apart.
  //   S9 still renders it; this layer writes its own reasoning.
  out.push(t('nar_advice_why'));

  // ★ Gain and risk, always together. `lotKg` turns a per-quintal figure into
  //   the farmer's own money, which is the only version he can act on.
  //
  //   The quantity is spoken as words in Marathi like every other number in
  //   the utterance — a bare "40" among spelled-out figures is read by the
  //   TTS voice in a different register and lands as a different kind of fact.
  const qtlNum = lotKg ? toQuintal(lotKg) : null;
  const qtl =
    qtlNum === null ? null : locale === 'mr' ? spokenNumber(qtlNum) : devNum(qtlNum, locale);
  if (v.expected_gain_paise != null) {
    out.push(
      qtl
        ? t('nar_advice_gain_lot', { amount: money(v.expected_gain_paise, locale), qtl })
        : t('nar_advice_gain', { amount: money(v.expected_gain_paise, locale) }),
    );
  }
  if (v.worst_case_paise != null) {
    out.push(t('nar_advice_risk', { amount: money(v.worst_case_paise, locale) }));
  }

  // What holding costs, and that it is already netted out — otherwise a farmer
  // reasonably assumes the gain is before expenses.
  if (v.action === 'HOLD' && holdCostPaisePerQtl) {
    out.push(t('nar_advice_cost', { amount: money(holdCostPaisePerQtl, locale) }));
  }

  return out;
}
