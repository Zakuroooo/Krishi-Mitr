/**
 * CANON §7.3-shaped fixtures for `GET /prices/series`. Kartik's K4 does not exist
 * yet — same discipline as `fixtures/window.ts` and `fixtures/auth.ts`: every key
 * is transcribed from CANON, nothing invented.
 *
 * ★ The modal price on the latest day agrees with `fixtures/window.ts`'s
 *   `sell_now_net_paise_per_qtl` family of numbers by construction — this is the
 *   same कांदा · लासलगाव demo scenario CANON §7.4's own example uses
 *   (`cmd_onion` / `mkt_lasalgaon`), so a judge who checks S4's price against S9's
 *   "today's price" line sees the same story, not two disagreeing numbers.
 */

import type { DataSource, PricePoint, PriceSeriesRes } from '../types/api';

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD`, `n` days before today. Deterministic-enough for a fixture. */
function dateNDaysAgo(n: number): string {
  const d = new Date(Date.now() - n * DAY_MS);
  return d.toISOString().slice(0, 10);
}

/** The last 14 days' modal price — the exact formula `fxPriceSeries` has always
 * used. `daysAgo` runs 13 (oldest of the 14) down to 0 (today). Both the 14-day
 * fixture and the tail of the 180-day fixture call this, so the two can never
 * quietly disagree about "today's price."
 */
function recentModal(daysAgo: number): number {
  return 195000 + (13 - daysAgo) * 800;
}

function pointAt(daysAgo: number, modal: number, source: DataSource): PricePoint {
  return {
    obs_date: dateNDaysAgo(daysAgo),
    min_paise_per_qtl: modal - 4000,
    max_paise_per_qtl: modal + 6000,
    modal_paise_per_qtl: modal,
    arrivals_qtl: 1200 + (daysAgo % 3) * 150,
    source,
  };
}

/** S4's "today's price" — the last 14 days, all AGMARKNET. */
export const fxPriceSeries: PriceSeriesRes = {
  points: Array.from({ length: 14 }, (_, i) => {
    const daysAgo = 13 - i;
    return pointAt(daysAgo, recentModal(daysAgo), 'AGMARKNET');
  }),
  source_summary: { AGMARKNET: 14 },
  latest_obs_date: dateNDaysAgo(0),
};

/**
 * ★ I8. The same series, but the latest observation is `SYNTHETIC` — for
 *   exercising the source badge's non-trusted path without waiting for real
 *   sparse data to produce one. Not wired to a screen by default; swap
 *   `fxPriceSeries` for this one locally if you need to see the badge fire.
 */
export const fxPriceSeriesSynthetic: PriceSeriesRes = {
  ...fxPriceSeries,
  points: fxPriceSeries.points.map((p, i) =>
    i === fxPriceSeries.points.length - 1 ? { ...p, source: 'SYNTHETIC' as const } : p,
  ),
  source_summary: { AGMARKNET: 13, SYNTHETIC: 1 },
};

/**
 * S5's 180-day history — a real shape, not a straight line.
 *
 * ★ The last 14 days (index 166–179) are `recentModal()` verbatim — identical
 *   to `fxPriceSeries` — so S4 and S9's "today's price" never disagree with
 *   what S5's chart ends on.
 *
 * The earlier 166 days follow a deterministic curve (no `Math.random` — I15's
 * "no randomness for anything security-relevant" doesn't technically cover a
 * chart shape, but there's no reason to make a fixture non-reproducible either):
 * a baseline rising from a pre-harvest price toward the point where the recent
 * 14 days pick up, with a Gaussian-shaped crash overlaid near day 40 — a large
 * onion harvest hitting the market and flooding it, prices recovering over the
 * following months as farmers' stored stock depletes. Real onion markets in
 * Maharashtra move like this; a dead-straight 179-segment diagonal does not,
 * and S5 is the screen that has to look credible to someone who has actually
 * seen an onion price chart before.
 *
 *   base(i)  = START + (RECENT_START − START) × (i / 165)      — rises to
 *              RECENT_START exactly at i = 165, so day 166 (the first of the
 *              "recent 14") continues from it with no visible seam.
 *   dip(i)   = DIP_DEPTH × exp(−(i − DIP_CENTER)² / (2 × DIP_WIDTH²))
 *   modal(i) = round(base(i) − dip(i))
 *
 * `SYNTHETIC` sits at day 42 — two days past the trough, inside the same
 * disrupted post-harvest stretch the dip itself represents, where a mandi
 * genuinely might miss a day's reporting. Not mid-diagonal, where an isolated
 * differently-coloured point would read as a rendering glitch rather than a
 * real gap in the ingest history.
 */
const PRE_RECENT_DAYS = 166; // days 0..165 of the 180-day series
const START = 160000; // pre-harvest baseline, paise/qtl
const RECENT_START = recentModal(13); // = 195000, where day 166 must land
const DIP_CENTER = 40;
const DIP_WIDTH = 18;
const DIP_DEPTH = 35000;

function seasonalModal(i: number): number {
  const base = START + (RECENT_START - START) * (i / (PRE_RECENT_DAYS - 1));
  const dip = DIP_DEPTH * Math.exp(-((i - DIP_CENTER) ** 2) / (2 * DIP_WIDTH ** 2));
  return Math.round(base - dip);
}

export const fxPriceHistory: PriceSeriesRes = {
  points: Array.from({ length: 180 }, (_, i) => {
    const daysAgo = 179 - i;
    const modal = i < PRE_RECENT_DAYS ? seasonalModal(i) : recentModal(daysAgo);
    const source: DataSource = i === 42 ? 'SYNTHETIC' : 'AGMARKNET';
    return pointAt(daysAgo, modal, source);
  }),
  source_summary: { AGMARKNET: 179, SYNTHETIC: 1 },
  latest_obs_date: dateNDaysAgo(0),
};

// ─────────────────────────────────────────────────────────────────────────────
// The picker's series — one per (commodity, market) pair the app offers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * ★ Why this exists: the market screen used to be hardwired to onion at
 *   Lasalgaon. Now that it has a crop picker and a district picker, a farmer
 *   who picks tomato at Pune must not be shown onion's chart under a tomato
 *   heading — a fixture that ignores its own arguments is worse than no
 *   fixture, because it looks right.
 *
 * ★ Onion at Lasalgaon returns `fxPriceHistory` *itself*, untouched. That
 *   series is pinned to `fixtures/window.ts` by construction, so the demo
 *   scenario's numbers stay in agreement across every screen. Everything the
 *   picker adds is built around it, never on top of it.
 *
 * ★ Tomato is deliberately the volatile one. That is the whole reason it is
 *   in scope (`KARTIK.md`: "Tomato is the NO_ADVICE crop. One commodity
 *   cannot demonstrate refusal.") — its swings are what widen the p10–p90
 *   band past the threshold and make the model refuse, which is the one
 *   behaviour a judge will actually try to break.
 */

/** Rupee level each mandi trades onion at, relative to Lasalgaon. Lasalgaon
 * is 1 by definition. Pune and Ahmednagar sit above and below it in the same
 * order `fixtures/nearby.ts` already puts them in, so the picker can never
 * contradict the nearby table on the same screen. */
const MARKET_LEVEL: Record<string, number> = {
  mkt_lasalgaon: 1,
  mkt_pimpalgaon: 0.97,
  mkt_ahmednagar: 0.93,
  mkt_pune: 1.06,
};

/** Tomato trades far below onion per quintal and swings hard week to week —
 * a triangular-wave shape rather than a seasonal curve, because that is what
 * a crop with a seven-day shelf life does when a week's arrivals land. */
const TOMATO_BASE = 118000;
const TOMATO_SWING = 46000;
const TOMATO_PERIOD = 23;

function tomatoModal(i: number): number {
  // Triangle wave in [-1, 1], deterministic — no Math.random in a fixture.
  const phase = ((i % TOMATO_PERIOD) / TOMATO_PERIOD) * 2 - 1;
  const wave = 1 - 2 * Math.abs(phase);
  const drift = (i / 179) * 12000;
  return Math.round(TOMATO_BASE + drift + TOMATO_SWING * wave);
}

/**
 * The series for one (commodity, market) pair, 180 days.
 *
 * Returns `null` for a pair this app carries no data for, and the screen
 * renders its empty state. That is not a gap being papered over: a real mandi
 * genuinely does not trade every crop, `/prices/series` will return an empty
 * series for those, and the screen has to survive it either way.
 */
export function fxSeriesFor(commodityId: string, marketId: string): PriceSeriesRes | null {
  const level = MARKET_LEVEL[marketId];
  if (level === undefined) return null;

  if (commodityId === 'cmd_onion') {
    if (marketId === 'mkt_lasalgaon') return fxPriceHistory;
    return {
      points: fxPriceHistory.points.map(p => ({
        ...p,
        min_paise_per_qtl: Math.round(p.min_paise_per_qtl * level),
        max_paise_per_qtl: Math.round(p.max_paise_per_qtl * level),
        modal_paise_per_qtl: Math.round(p.modal_paise_per_qtl * level),
      })),
      source_summary: { ...fxPriceHistory.source_summary },
      latest_obs_date: fxPriceHistory.latest_obs_date,
    };
  }

  if (commodityId === 'cmd_tomato') {
    // Pimpalgaon is an onion yard. Tomato does not trade there, and the empty
    // state is the honest answer rather than a curve invented to fill a chart.
    if (marketId === 'mkt_pimpalgaon') return null;
    return {
      points: Array.from({ length: 180 }, (_, i) => {
        const daysAgo = 179 - i;
        return pointAt(daysAgo, Math.round(tomatoModal(i) * level), 'AGMARKNET');
      }),
      source_summary: { AGMARKNET: 180 },
      latest_obs_date: dateNDaysAgo(0),
    };
  }

  return null;
}
