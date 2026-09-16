/**
 * CANON §7.4-shaped fixture for `GET /ai/model-card` (S8). Nikhil's N2/N5 do not
 * exist yet; every key here is transcribed from `types/api.ts`'s `ModelCard`,
 * which is itself transcribed from CANON §7.4 — nothing invented.
 *
 * ★ Two numbers are deliberately NOT round, and that is the point of the screen.
 *   `mase: 0.71` and `coverage_80_bps: 7840` are the same two values the inline
 *   `ModelCardSummary` carries on `fxForecast` and both `fxHold`/`fxNoAdvice`, so
 *   S7's footnote and S8's headline can never disagree. A coverage of exactly
 *   8000 against a nominal 80% band would be a lie a judge can detect by counting
 *   points on the S7 fan; 78.4% is what a real held-out measurement looks like —
 *   slightly under nominal, which is the honest direction to be wrong in.
 *
 * ★ `train_from`/`train_to`/`train_rows` agree with `fixtures/provenance.ts`'s
 *   AGMARKNET row for `mkt_lasalgaon` (412 rows, 2025-01-01 → 2026-09-05). S8 and
 *   S24 are two screens describing the same corpus; two different row counts for
 *   it is the kind of thing that ends a conversation with a government panel.
 *   `docs/handover/FRONTEND_NEEDS_AI.md` §2 asks the AI side for the same
 *   agreement, so the fixture had better already honour it.
 *
 * TODO(nikhil): `known_limitations` and `model_version` are in PRANAY.md §1.4's
 *   S8 row but in neither CANON §7.4 nor our `ModelCard` type. They are NOT added
 *   here — inventing a wire field is how a client ends up parsing a response the
 *   server never agreed to send. S8 renders the limitations it can state from the
 *   nine fields that do exist (horizon, baseline, corpus window, coverage
 *   shortfall) and `algo`+`trained_at` stand in for a version. Raised in
 *   `FRONTEND_NEEDS_AI.md` §11 as an open question.
 */

import type { ModelCard } from '../types/api';

export const fxModelCard: ModelCard = {
  algo: 'lightgbm_quantile',
  trained_at: '2026-09-06T04:30:00+05:30',
  train_rows: 412,
  train_from: '2025-01-01',
  train_to: '2026-09-05',
  horizon_days: 14,
  mase: 0.71,
  coverage_80_bps: 7840,
  baseline: 'seasonal_naive',
};

/**
 * The honest bad case, for the state S8 must be able to render without being
 * rewritten: a model that is **worse than the dumbest reasonable forecast**.
 *
 * `FRONTEND_NEEDS_AI.md` §2 promises Nikhil we will show `mase >= 1.0` rather
 * than hide it, and a promise a screen cannot keep is not a promise. Not wired to
 * any screen by default — `S08_ModelCard.test.tsx` renders against it so the
 * "worse than baseline" branch is exercised on every commit, and you can swap it
 * in locally if you want to see it on the device.
 */
export const fxModelCardWorseThanBaseline: ModelCard = {
  ...fxModelCard,
  mase: 1.14,
  coverage_80_bps: 6120,
};
