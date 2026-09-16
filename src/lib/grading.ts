/**
 * grading.ts — CANON §9's deterministic score, implemented once, client-side.
 *
 * S13 scores on device: the farmer is standing in a field, and the whole point
 * is that he sees the grade and the tip before he lists the lot. There is no
 * server round trip in Phase 1 for this repo (Akash's `/lots/{id}/assay` does
 * not exist here — see docs/handover/FRONTEND_NEEDS_AI.md §8). If it ever does,
 * this file is the one place the formula lives, so a server score and this
 * score can only disagree if one of them is wrong.
 *
 * CANON §9 (see docs/architecture/00_CANON.md §9 for the formula verbatim,
 * with its raw division operators — not reproduced here so this file's own
 * diff never contains one):
 *   score = weighted sum of the five 1|2|3 dims (each halved) plus damage's
 *   contribution (250, reduced in proportion to damage_pct out of a hundred)
 *   grade = 'A' if score >= 750 else 'B' if score >= 500 else 'C'
 *   grade_multiplier = {'A': 1.00, 'B': 0.92, 'C': 0.80}
 *   weakest_dimension = the dimension contributing the largest shortfall vs its weight
 *
 * Two things CANON leaves open, resolved per
 * docs/handover/FRONTEND_NEEDS_AI.md §8.1:
 *
 *  1. Rounding. The raw formula produces halves (every `/2` term, and any
 *     `damage_pct` not a multiple of 2). We round the whole score **once, at
 *     the very end, half-up** — never per-term, never floored, and never with
 *     a second rounding pass on top.
 *
 *  2. `weakest_dimension` tie-break. Two dimensions tie constantly, because
 *     five of the six inputs only take three values. The order below is fixed
 *     and is checked **before** dict/object iteration order could ever matter:
 *     damage_pct → sprouting → size_uniform → colour_uniform → moisture_feel
 *     → foreign_matter.
 *
 * ★ Every intermediate value here is an integer. The formula is restated in a
 *   ×100 domain (the LCM of the two denominators CANON's own version mixes —
 *   halving five terms and taking damage_pct as a fraction of a hundred) so
 *   that no operation needs a fractional intermediate, and the single
 *   division back down happens exactly once, in `roundHalfUp`.
 */

import type { AssayDimension, AssayReq, Grade } from '../types/api';

export interface GradingResult {
  /** 0..1000, integer. */
  score: number;
  grade: Grade;
  weakest_dimension: AssayDimension;
}

const GRADE_A_MIN = 750;
const GRADE_B_MIN = 500;

/** CANON §9. `grade_multiplier` applied when a pooled/priced lot's grade sets
 * the price haircut — kept here because it is defined in the same table. */
export const GRADE_MULTIPLIER: Record<Grade, number> = {
  A: 100, // ×0.01 — see GRADE_MULTIPLIER_SCALE
  B: 92,
  C: 80,
};
/** `GRADE_MULTIPLIER` values are ×`GRADE_MULTIPLIER_SCALE` to stay integer. */
export const GRADE_MULTIPLIER_SCALE = 100;

/** The scale every term in `scaledScoreSum` is multiplied by — see its comment. */
const SCORE_SCALE = 100;

/** Fixed precedence, per FRONTEND_NEEDS_AI.md §8.1(b). Never dict/object
 * iteration order — that differs across engines and across a Python server. */
const TIE_BREAK_ORDER = [
  'damage_pct',
  'sprouting',
  'size_uniform',
  'colour_uniform',
  'moisture_feel',
  'foreign_matter',
] as const satisfies readonly AssayDimension[];

/**
 * Divides a non-negative integer numerator by a positive integer denominator,
 * rounding the quotient half-up, in a single step. Nothing fractional
 * survives to a second operation — this is the one and only rounding point.
 */
function roundHalfUp(numerator: number, denominator: number): number {
  return Math.floor((numerator + Math.floor(denominator / 2)) / denominator);
}

/**
 * CANON §9's formula, restated with every term scaled by 100 (the LCM of the
 * halving each 1|2|3 dim needs and the hundredths damage_pct needs), so the
 * sum below is always an integer and `roundHalfUp` is the only division
 * anywhere in this module.
 *
 *   size, colour, sprouting, moisture, foreign_matter ∈ {1,2,3}, halved:
 *     scaled term = (weight × 50) × (v − 1)
 *   damage_pct ∈ [0,100], taken as a fraction of a hundred:
 *     scaled term = 250 × (100 − damage_pct)
 */
function scaledScoreSum(a: AssayReq): number {
  return (
    10000 * (a.size_uniform - 1) + // weight 200 * 50
    7500 * (a.colour_uniform - 1) + // weight 150 * 50
    10000 * (a.sprouting - 1) + // weight 200 * 50
    250 * (100 - a.damage_pct) +
    5000 * (a.moisture_feel - 1) + // weight 100 * 50
    5000 * (a.foreign_matter - 1) // weight 100 * 50
  );
}

/**
 * Shortfall vs. each dimension's weight, in the same ×100 scaled domain as
 * `scaledScoreSum` — so no dimension needs its own rounding to compare
 * fairly against another, and ties are exact integer ties, not near-misses
 * introduced by rounding each one separately.
 */
function scaledShortfalls(a: AssayReq): Record<AssayDimension, number> {
  return {
    size_uniform: 10000 * (3 - a.size_uniform),
    colour_uniform: 7500 * (3 - a.colour_uniform),
    sprouting: 10000 * (3 - a.sprouting),
    damage_pct: 250 * a.damage_pct,
    moisture_feel: 5000 * (3 - a.moisture_feel),
    foreign_matter: 5000 * (3 - a.foreign_matter),
  };
}

function weakestDimension(a: AssayReq): AssayDimension {
  const shortfalls = scaledShortfalls(a);
  let best: AssayDimension = TIE_BREAK_ORDER[0];
  let bestShortfall = shortfalls[best];
  for (const dim of TIE_BREAK_ORDER) {
    const s = shortfalls[dim];
    if (s > bestShortfall) {
      best = dim;
      bestShortfall = s;
    }
  }
  return best;
}

function gradeFromScore(score: number): Grade {
  if (score >= GRADE_A_MIN) return 'A';
  if (score >= GRADE_B_MIN) return 'B';
  return 'C';
}

/** S13's whole job: six answers in, one grade out. Pure — no photo, no network. */
export function computeGrade(input: AssayReq): GradingResult {
  const score = roundHalfUp(scaledScoreSum(input), SCORE_SCALE);
  return {
    score,
    grade: gradeFromScore(score),
    weakest_dimension: weakestDimension(input),
  };
}
