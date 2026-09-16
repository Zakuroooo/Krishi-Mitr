/**
 * verdictVoice.ts — the sale-window voice AGENT: turns a `WindowRes` (the
 * decision engine's structured verdict) into natural, spoken Marathi the
 * farmer hears on S9.
 *
 * This is the "what do we say and in what order" layer. `lib/voice.ts` is the
 * "how we make sound" layer; it takes whatever string this returns and speaks
 * it through on-device TTS. Keeping the composition pure (no React, no audio)
 * is what makes it unit-testable against the five fixtures in `fixtures/window.ts`.
 *
 * What a farmer needs to hear, in order:
 *   1. WHAT TO DO  — the action, as a plain instruction.
 *   2. WHAT IT'S WORTH — the expected gain, and (for HOLD) the worst case, so
 *      the advice is a trade the farmer can hear, not a bare order.
 *   3. HOW TO WAIT — the pledge loan terms, when the server says a pledge is
 *      worthwhile (I13: no pledge_quote means no card on screen and no sentence
 *      here either).
 *
 * ★ NO_ADVICE is special: the refusal sentence is locked, verbatim copy from
 *   the decision engine's contract (the same strings `S9` renders in
 *   `explain_mr`). We never rephrase a refusal — paraphrasing "we will not
 *   advise" into something that sounds like advice is the one unforgivable
 *   voice bug this product could ship. See `REFUSAL_MR` below.
 */

import type { Locale, WindowRes, PledgeQuote, RefusalReason } from '../types/api';
import { spokenDays, spokenNumber, spokenRupees } from './mrNumberWords';
import { formatNumber, formatPaise } from './money';
import { translate } from './i18n';

/**
 * Locked Marathi refusal statements. Transcribed from the decision-engine
 * contract (CANON AI architecture); a refusal is rendered verbatim, never
 * recomposed. Keyed by `WindowRes.refusal_reason`.
 */
export const REFUSAL_MR: Record<RefusalReason, string> = {
  BAND_TOO_WIDE:
    'पुढील १४ दिवसांचा अंदाज खूप अनिश्चित आहे. चुकीचा सल्ला देण्यापेक्षा आम्ही सल्ला देत नाही. आजचा भाव पाहून तुम्ही ठरवा.',
  INSUFFICIENT_HISTORY:
    'या बाजारासाठी पुरेशी जुनी माहिती नाही. आम्ही अंदाज देऊ शकत नाही.',
  STALE_DATA:
    'या बाजाराची ताजी माहिती उपलब्ध नाही. जुन्या भावावर सल्ला देणे धोक्याचे आहे.',
  GAIN_BELOW_COST:
    'थांबून मिळणारा फायदा खर्चापेक्षा कमी आहे. थांबण्यात अर्थ नाही.',
};

/** Fallback if a future server sends a reason this map does not know. */
const REFUSAL_FALLBACK = 'सध्या या मालावर सल्ला उपलब्ध नाही.';

/** Whole-lot negative paise -> spoken loss, e.g. -480000 -> 'चार हजार आठशे रुपये तोटा'. */
function spokenLoss(paise: number): string {
  return `${spokenRupees(Math.abs(paise))} तोटा`;
}

/** HOLD: the core "wait and earn" advice, plus the risk when there is one. */
function holdSentence(v: WindowRes): string {
  const days = spokenDays(v.hold_days ?? 0);
  const gain = spokenRupees(v.expected_gain_paise ?? 0);
  let s = `पुढे ${days} थांबा. तुम्हाला ${gain} जास्त मिळू शकतात.`;
  if (v.worst_case_paise !== null && v.worst_case_paise < 0) {
    s += ` वाईट परिस्थितीत ${spokenLoss(v.worst_case_paise)} होऊ शकतो.`;
  }
  return s;
}

function sellNowSentence(v: WindowRes): string {
  // `explain_mr` is the server's own one-line rationale and reads naturally;
  // fall back to a fixed sentence if it is ever missing.
  if (v.explain_mr) return v.explain_mr;
  return 'आजच विका. थांबण्याचा फायदा नाही.';
}

/**
 * ★ Corrected against the live contract. This read `alt.net_paise_per_qtl`
 *   and `alt.name_mr`, neither of which exists on the wire: `AltMarket` is
 *   `{market_id, distance_km, gross_price_paise, net_price_paise}` (backend
 *   `app/schemas/ai.py`). Against the real API both were `undefined`, so the
 *   one sentence in this agent that names another mandi would have spoken
 *   nonsense to the farmer it was meant to redirect.
 *
 *   There is no name on the response at all, so the market is resolved
 *   through the dictionary by `market_id` — the same map the Market screen
 *   uses — and the sentence simply omits the name for a market this app has
 *   no Marathi name for, rather than reading an id aloud.
 */
const MARKET_NAME_KEY_MR: Record<string, string> = {
  mkt_lasalgaon: 'market_lasalgaon',
  mkt_pune: 'market_pune',
  mkt_nagpur: 'market_nagpur',
};

function sellElsewhereSentence(v: WindowRes): string {
  const alt = v.alt_market;
  if (!alt) return 'जवळच्या दुसऱ्या बाजारात विका, तिथे जास्त भाव मिळेल.';
  const net = spokenRupees(alt.net_price_paise);
  const distance = spokenNumber(alt.distance_km);
  const nameKey = MARKET_NAME_KEY_MR[alt.market_id];
  const named = nameKey ? ` — ${translate(nameKey, 'mr')}` : '';
  return `जवळच्या दुसऱ्या बाजारात विका${named}. तिथे खर्च वजा जाता प्रति क्विंटल ${net} मिळतील. अंतर ${distance} किलोमीटर आहे.`;
}

function splitSentence(v: WindowRes): string {
  const days = spokenDays(v.hold_days ?? 0);
  return `अर्धा माल आजच विका, अर्धा ${days} थांबवा.`;
}

function refusalSentence(v: WindowRes): string {
  const reason = v.refusal_reason;
  return (reason && REFUSAL_MR[reason]) || REFUSAL_FALLBACK;
}

/** Pledge quote -> "how to wait without selling": loan, days, interest. */
function pledgeSentence(quote: PledgeQuote): string {
  const loan = spokenRupees(quote.loan_paise);
  const interest = spokenRupees(quote.interest_paise);
  const days = spokenDays(quote.days);
  return `तुम्हाला ${loan} चे तारण कर्ज मिळेल. ${days} चे व्याज ${interest} आहे.`;
}

/**
 * The agent's full spoken narration for one `WindowRes`. One or two natural
 * Marathi sentences — action + worth, then pledge when the server sent one.
 */
export function buildVerdictNarration(v: WindowRes): string {
  let main: string;
  switch (v.action) {
    case 'HOLD':
      main = holdSentence(v);
      break;
    case 'SELL_NOW':
      main = sellNowSentence(v);
      break;
    case 'SELL_ELSEWHERE':
      main = sellElsewhereSentence(v);
      break;
    case 'SPLIT':
      main = splitSentence(v);
      break;
    case 'NO_ADVICE':
    default:
      main = refusalSentence(v);
      break;
  }

  // I13 — no pledge_quote on the wire means no pledge card on screen, so no
  // pledge sentence in the narration either. The two never disagree.
  if (v.pledge_quote) {
    return `${main} ${pledgeSentence(v.pledge_quote)}`;
  }
  return main;
}

/**
 * The narration in whichever language the farmer chose.
 *
 * ★ Everything above composes Marathi, which was correct when Marathi was the
 *   only voice. It is not correct now: a farmer who picks English on S1 and
 *   opens the price decision hears Marathi, which is the bug reported from
 *   the device. Marathi keeps its hand-written prose — it is the default and
 *   it reads well. Hindi and English are composed from the same dictionary
 *   the screen itself renders from, so the voice cannot say something the
 *   screen does not.
 *
 * ★ I16 holds in the voice too: the worst case is spoken in the same breath
 *   as the gain, never dropped for brevity.
 */
export function buildVerdictNarrationFor(v: WindowRes, locale: Locale): string {
  if (locale === 'mr') return buildVerdictNarration(v);

  const parts: string[] = [];

  if (v.action === 'NO_ADVICE') {
    parts.push(translate('no_advice_label', locale));
    if (v.explain_en) parts.push(v.explain_en);
    return parts.join('. ');
  }

  const ACTION_KEY: Record<Exclude<WindowRes['action'], 'NO_ADVICE'>, string> = {
    SELL_NOW: 'action_sell_now',
    SELL_ELSEWHERE: 'action_sell_elsewhere',
    HOLD: 'action_hold',
    SPLIT: 'action_split',
  };
  parts.push(translate(ACTION_KEY[v.action], locale));

  if (v.hold_days !== null && v.hold_days > 0) {
    parts.push(`${formatNumber(v.hold_days, locale)} ${translate('days_suffix', locale)}`);
  }

  if (v.expected_gain_paise !== null) {
    parts.push(
      `${translate('expected_gain', locale)}: ${formatPaise(v.expected_gain_paise, locale)}`,
    );
  }
  if (v.worst_case_paise !== null) {
    parts.push(`${translate('worst_case', locale)}: ${formatPaise(v.worst_case_paise, locale)}`);
  }

  return `${parts.join('. ')}.`;
}
