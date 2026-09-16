/**
 * CANON-shaped fixtures for the hero endpoint.
 *
 * These exist so the app can be built, run and demoed before `POST /ai/window/recommend`
 * exists. Nobody waits for a person; you wait for a contract, and the contract is
 * `docs/architecture/00_CANON.md` §7.4.
 *
 * ★ Every value here is transcribed from CANON. **If a key is not in CANON §7.4, it
 *   does not go in this file.** Six invented fields were caught before H0 — a screen
 *   built on an invented fixture renders perfectly in every rehearsal and breaks the
 *   first time it touches the real endpoint.
 *
 * The arithmetic identities are asserted in `__tests__/window.test.ts`, because a
 * 100× unit error is the likeliest bug in the entire project and a comment does not
 * catch it.
 */

import type { WindowRes } from '../types/api';

/** The canonical demo lot: 4000 kg of onion at Lasalgaon = 40 quintals. */
export const DEMO_QTY_KG = 4000;
export const DEMO_QTY_QTL = 40;

/**
 * Beat 8. HOLD, eleven days.
 *
 *   expected_gain_paise = (209650 − 193925) × 40 =  629000  = ₹6,290
 *   worst_case_paise    = (181925 − 193925) × 40 = −480000  = −₹4,800
 *
 * ₹6,290 on four tonnes is an 8.1% move. ₹62,900 — which several documents carried
 * before H0 — would be an 81% onion move in eleven days, in front of a panel that
 * knows onion prices from memory.
 */
export const fxHold: WindowRes = {
  action: 'HOLD',
  hold_days: 11,
  confidence: 'MEDIUM',
  band_width_bps: 2140,

  sell_now_net_paise_per_qtl: 193925,
  hold_p50_net_paise_per_qtl: 209650,
  hold_p10_net_paise_per_qtl: 181925,

  expected_gain_paise: 629000,
  worst_case_paise: -480000,

  costs: {
    transport_paise_per_qtl: 8000,
    commission_paise_per_qtl: 3075,
    storage_paise_per_qtl: 1650,
    spoilage_paise_per_qtl: 2310,
    loading_paise_per_qtl: 500,
    total_paise_per_qtl: 15535,
  },

  alt_market: null,

  pledge_quote: {
    loan_paise: 3400000, // ₹34,000
    ltv_bps: 7000,
    rate_bps_annual: 900,
    days: 11,
    // TODO(nilesh): CANON §7.4's example prints 92200 here. CANON §8's own formula
    //   interest = loan * rate_bps * days // (10000 * 365)
    //            = 3400000 * 900 * 11 // 3650000
    //            = 9221
    // gives ₹92, not ₹922 — a 10× slip in the example, same class as the ₹62,900 bug.
    // Using the formula's answer, since the formula is the thing that ships. Blocker filed.
    interest_paise: 9221,
    warehouse_id: 'wh_niphad',
    is_worthwhile: true, // 629000 > 9221 — comfortably, so beat 9 survives either way
    disclaimer: 'Indicative simulation — not a lender quote',
  },

  refusal_reason: null,
  model_card: { mase: 0.71, coverage_80_bps: 7840 },
  explain_mr: '११ दिवस थांबल्यास सरासरी ₹६,२९० जास्त मिळू शकतात.',
  explain_en: 'Holding 11 days could earn ₹6,290 more on average.',
  data_source: 'AGMARKNET',
};

/**
 * ★ I6. The refusal, and it is written at the same time as `fxHold`, not later.
 *
 * This is one of the two invariants a judge will actually test — they will ask what
 * happens when the model is wrong. The answer has to be demonstrable on a device, not
 * describable on a slide.
 *
 * Note the shape: same keys, nulls where the forecast would be, **and `costs` still
 * populated** — we know what transport costs even when we do not know the price.
 * `hold_days` is null; `sell_now_net_paise_per_qtl` is not, because today's price is
 * an observation and refusing to forecast is not refusing to inform.
 *
 * This is a 200. It is not an error. It must not route through `ErrorState`, must not
 * show a retry button, and TanStack Query must not treat it as a failure.
 */
export const fxNoAdvice: WindowRes = {
  action: 'NO_ADVICE',
  hold_days: null,
  confidence: 'LOW',
  band_width_bps: 5820, // 58% against a 35% threshold — that is why it refuses

  sell_now_net_paise_per_qtl: 193925,
  hold_p50_net_paise_per_qtl: null,
  hold_p10_net_paise_per_qtl: null,

  expected_gain_paise: null,
  worst_case_paise: null,

  costs: {
    transport_paise_per_qtl: 8000,
    commission_paise_per_qtl: 3075,
    storage_paise_per_qtl: 1650,
    spoilage_paise_per_qtl: 2310,
    loading_paise_per_qtl: 500,
    total_paise_per_qtl: 15535,
  },

  alt_market: null,
  pledge_quote: null,

  refusal_reason: 'BAND_TOO_WIDE',
  model_card: { mase: 0.71, coverage_80_bps: 7840 },
  explain_mr: 'पुढील १४ दिवसांचा अंदाज खूप अनिश्चित आहे. आम्ही सल्ला देणार नाही.',
  explain_en: 'The 14-day range is too uncertain here. We will not advise.',
  data_source: 'AGMARKNET',
};

/**
 * The only fixture that populates `alt_market`, which is the field CANON never
 * defines in its populated form. It exists so the gap is visible in the type checker
 * rather than discovered on stage. See the TODO(nilesh) in `types/api.ts`.
 *
 * Pune pays more gross but costs more to reach; the net still wins by ₹1,805/qtl.
 * The numbers come from CANON §7.3's `/prices/nearby` example, so the two screens
 * agree with each other.
 */
export const fxSellElsewhere: WindowRes = {
  ...fxHold,
  action: 'SELL_ELSEWHERE',
  hold_days: 0,
  confidence: 'HIGH',
  band_width_bps: 1180,
  hold_p50_net_paise_per_qtl: null,
  hold_p10_net_paise_per_qtl: null,
  expected_gain_paise: (195730 - 193925) * DEMO_QTY_QTL, // 72200 = ₹722
  worst_case_paise: 0,
  alt_market: {
    market_id: 'mkt_pune',
    distance_km: 168,
    gross_price_paise: 203730,
    net_price_paise: 195730,
  },
  pledge_quote: null,
  explain_mr: 'पुण्यात नेल्यास खर्च वजा जाता ₹७२२ जास्त मिळतील.',
  explain_en: 'Taking it to Pune nets ₹722 more after costs.',
};

/**
 * SELL_NOW. The model has no better option to offer — no other market beats this
 * one net, and holding is not expected to pay. There is nothing to hold against,
 * so `hold_p50/p10_net` are null the same way `fxSellElsewhere` leaves them null,
 * and both money fields are zero: this action is not claiming an incremental
 * upside over some alternative, it is saying the alternative is not there.
 */
export const fxSellNow: WindowRes = {
  ...fxHold,
  action: 'SELL_NOW',
  hold_days: 0,
  confidence: 'HIGH',
  band_width_bps: 950,
  hold_p50_net_paise_per_qtl: null,
  hold_p10_net_paise_per_qtl: null,
  expected_gain_paise: 0,
  worst_case_paise: 0,
  alt_market: null,
  pledge_quote: null,
  explain_mr: 'सध्याची किंमत हीच सर्वोत्तम आहे. आताच विका.',
  explain_en: 'The current price is the best available. Sell today.',
};

/**
 * SPLIT. NILESH.md §... calls this "sell part now for liquidity, hold part —
 * when the gain is real but the risk is material." The numbers are built to
 * show exactly that: the expected gain is real and positive, but the worst case
 * is *larger in magnitude* than the gain — the downside outweighs the upside,
 * which is the actual reason a hedge (sell half, hold half) beats an all-in bet
 * either way.
 *
 *   expected_gain_paise = (201925 − 193925) × 40 =  320000  = ₹3,200
 *   worst_case_paise    = (178925 − 193925) × 40 = −600000  = −₹6,000
 *
 * Costs are the same market/logistics numbers as `fxHold` — costs come from
 * transport and handling, not from which verdict the model reaches, so reusing
 * them is realistic, not lazy.
 */
export const fxSplit: WindowRes = {
  ...fxHold,
  action: 'SPLIT',
  hold_days: 9,
  confidence: 'MEDIUM',
  band_width_bps: 2800,
  hold_p50_net_paise_per_qtl: 201925,
  hold_p10_net_paise_per_qtl: 178925,
  expected_gain_paise: (201925 - 193925) * DEMO_QTY_QTL,
  worst_case_paise: (178925 - 193925) * DEMO_QTY_QTL,
  alt_market: null,
  pledge_quote: null,
  explain_mr: 'अर्धा माल आताच विका, उरलेला ९ दिवस थांबवा — जोखीम मध्यम आहे.',
  explain_en: 'Sell half now, hold the rest for 9 days — the risk is moderate.',
};

/**
 * The verdict for whichever crop and mandi the farmer has picked.
 *
 * ★ Why this exists: Home asked for `fxHold` unconditionally, so changing the
 *   crop on the Market screen moved the price, the chart and the forecast —
 *   and left the *advice* saying "hold onion for 11 days". A judge who
 *   switches to tomato and sees the onion recommendation unchanged has found
 *   the seam in about four seconds, and everything else on the screen stops
 *   being believable.
 *
 * ★ Tomato returns `NO_ADVICE` rather than a different number, and that is the
 *   honest answer rather than a convenient one: `fxSeriesFor('cmd_tomato', …)`
 *   swings hard enough that the p10–p90 band genuinely exceeds the refusal
 *   threshold. The demo's best moment and the correct behaviour happen to be
 *   the same thing (I6).
 *
 * ★ A mandi we hold no series for returns `null`, matching `fxSeriesFor` — the
 *   screen then renders its empty state rather than advice about a market it
 *   knows nothing about.
 */
export function fxWindowFor(commodityId: string, marketId: string): WindowRes | null {
  if (commodityId === 'cmd_tomato') return fxNoAdvice;

  if (commodityId === 'cmd_onion') {
    // Away from Lasalgaon the freight changes the arithmetic: the nearer mandi
    // pays less gross but nets more, which is the SELL_ELSEWHERE case.
    if (marketId !== 'mkt_lasalgaon') return fxSellElsewhere;
    return fxHold;
  }

  return null;
}
