/**
 * CANON §7.5-shaped fixtures for lots and the S13 self-assay. Akash's routes do
 * not exist in this repo — build against these until they do (CLAUDE.md §0).
 *
 * Shapes are transcribed from `docs/handover/FRONTEND_NEEDS_BACKEND.md` §5,
 * itself derived from the `lots` / `grade_assays` DDL in CANON §6.4. Money is
 * integer paise, quantity is integer kg — there is nothing to convert here
 * because neither DTO carries money; `qty_kg` is the only quantity field.
 */

import type { AssayRecord, AssayReq, AssayRes, LotDto } from '../types/api';

/** S15's ungraded state — a lot before S13 has run. Four-value LotGrade, not the
 * three-value Grade — collapsing them is the exact bug the handover doc flags. */
export const fxLotUngraded: LotDto = {
  id: 'lot_ungraded_1',
  farmer_id: 'farmer_1',
  commodity_id: 'onion',
  market_id: 'mkt_lasalgaon',
  qty_kg: 4000,
  grade: 'UNGRADED',
  harvest_date: '2026-08-28',
  photo_path: null,
  status: 'DRAFT',
  created_at: '2026-09-01T06:00:00+05:30',
};

/** S12's no-photo path — `photo_path` is optional on create and the flow must
 * succeed without it. This lot has been assayed (grade 'A') and listed. */
export const fxLotListed: LotDto = {
  id: 'lot_listed_1',
  farmer_id: 'farmer_1',
  commodity_id: 'onion',
  market_id: 'mkt_lasalgaon',
  qty_kg: 4000,
  grade: 'A',
  harvest_date: '2026-08-28',
  photo_path: null,
  status: 'LISTED',
  created_at: '2026-09-01T06:00:00+05:30',
};

/**
 * S15's third row — a graded, lower-grade lot, and deliberately not a multiple
 * of 100 kg. `2050 kg` must render as `२० क्विंटल` (floor), never `२१`
 * (round) — `toQuintal` floors per I2, and this is the case that would catch
 * a screen that rounded instead.
 */
export const fxLotGradeC: LotDto = {
  id: 'lot_c_1',
  farmer_id: 'farmer_1',
  commodity_id: 'onion',
  market_id: 'mkt_lasalgaon',
  qty_kg: 2050,
  grade: 'C',
  harvest_date: '2026-08-20',
  photo_path: null,
  status: 'LISTED',
  created_at: '2026-08-20T07:00:00+05:30',
};

/** S15's data state: one of each grade this farmer can see — ungraded (S13
 * has not run), graded A, graded C — plus the floor-quantity case above. */
export const fxMyLots: LotDto[] = [fxLotUngraded, fxLotListed, fxLotGradeC];

/**
 * S15's empty state: zero lots. CLAUDE.md §9 — "every screen needs a real
 * empty state" — and this is the fixture that makes S15's empty branch
 * something rendered and checked, not just written and assumed. Swap
 * `fxMyLots` for this one in S15's `fetchLots()` to see it locally; it is
 * not wired in by default because the demo scenario has lots to show.
 */
export const fxMyLotsEmpty: LotDto[] = [];

/** S13's six-question request. All 1|2|3 dims at their middle value, damage
 * at 15% — the exact case Task C's pinning test also uses. */
export const fxAssayReq: AssayReq = {
  size_uniform: 2,
  colour_uniform: 2,
  sprouting: 2,
  damage_pct: 15,
  moisture_feel: 2,
  foreign_matter: 2,
};

/** The response CANON §7.5 + §9 fully specify. `weakest_dimension` is never
 * null (Q7 in the handover doc flags this as unresolved even at score=1000 —
 * this fixture is not that edge case, so it stays uncontroversial here). */
export const fxAssayRes: AssayRes = {
  score: 588,
  grade: 'B',
  weakest_dimension: 'damage_pct',
  tip_mr: 'नुकसान झालेले दाणे वेगळे केल्यास ग्रेड सुधारू शकतो.',
  tip_en: 'Sorting out damaged grains could improve the grade.',
};

/**
 * The stored `grade_assays` rows behind the graded lots above — what S20 shows a
 * buyer so a grade is auditable rather than asserted.
 *
 * ★ Every `score`, `grade` and `weakest_dimension` here was computed from the
 *   six answers on the same row by CANON §9's formula, not chosen to look good,
 *   and each agrees with its lot's own `grade` field. A fixture whose grade
 *   disagreed with its own answers would teach the screen to render an
 *   impossible state — and would be exactly the kind of number that survives
 *   into a slide.
 *
 *   lot_listed_1: 3/3/3, 5% damage, 3/2 → 938 → A, weakest `foreign_matter`
 *   lot_c_1:      1/2/2, 35% damage, 2/1 → 388 → C, weakest `size_uniform`
 *
 * `lot_ungraded_1` is deliberately absent: S13 has not run on it, so no row
 * exists, and S20's "grade not checked yet" branch has to be reachable.
 */
export const fxAssayRecords: Record<string, AssayRecord> = {
  lot_listed_1: {
    lot_id: 'lot_listed_1',
    size_uniform: 3,
    colour_uniform: 3,
    sprouting: 3,
    damage_pct: 5,
    moisture_feel: 3,
    foreign_matter: 2,
    score: 938,
    grade: 'A',
    weakest_dimension: 'foreign_matter',
    photo_path: null,
    created_at: '2026-09-01T06:30:00+05:30',
  },
  lot_c_1: {
    lot_id: 'lot_c_1',
    size_uniform: 1,
    colour_uniform: 2,
    sprouting: 2,
    damage_pct: 35,
    moisture_feel: 2,
    foreign_matter: 1,
    score: 388,
    grade: 'C',
    weakest_dimension: 'size_uniform',
    photo_path: null,
    created_at: '2026-08-20T07:30:00+05:30',
  },
};
