/**
 * CANON §7.6-shaped fixture for `GET /demands/{id}/matches` (S19).
 *
 * The two entries are CANON's own example response, with the quantities
 * rewritten to add up against `fxDemand` (8000 kg = 80 qtl) instead of the
 * 10000 kg order CANON's illustration assumes. Everything else — the scores,
 * the grades, the `why_mr` sentences — is transcribed verbatim, so when Akash
 * seeds `matching.py` the screen keeps rendering the same words.
 *
 * Ordered by `score` descending, because CANON says the endpoint is ranked and a
 * screen that re-sorts a ranked list is a screen that hides the ranking.
 */

import type { MatchesRes } from '../types/api';

export const fxMatches: MatchesRes = {
  matches: [
    {
      kind: 'COMBINATION',
      lots: [
        { lot_id: 'pool_3', qty_allocated_kg: 4000 },
        { lot_id: 'lot_7', qty_allocated_kg: 3000 },
        { lot_id: 'lot_9', qty_allocated_kg: 1000 },
      ],
      total_qty_kg: 8000,
      fill_bps: 10000,
      avg_score: 640,
      grade: 'B',
      distance_km: 41,
      score: 0.91,
      why_mr: 'पूर्ण मागणी भरते — एक FPO गट + २ शेतकरी',
      why_en: 'Fills the full order — one FPO batch + 2 farmers',
      // ★ The buyer-facing detail the approved design shows. Sample data, and
      //   the screen says so in words (I8) — these fields are optional on
      //   `MatchDto` precisely because the server does not send them yet.
      lot_ref: 'A-2288',
      farmer_label: 'ज्ञानेश्वर शिंदे',
      village: 'पिंपळगाव',
      asking_paise_per_qtl: 198000,
      market_paise_per_qtl: 199000,
      moisture_pct: 11.4,
      bags: 160,
      pickup_at_farm: false,
      assayed: false,
    },
    {
      kind: 'SINGLE',
      lots: [{ lot_id: 'lot_1', qty_allocated_kg: 4000 }],
      total_qty_kg: 4000,
      // 4000 of 8000 kg — half the order, and the screen says so rather than
      // letting a higher grade imply a better match.
      fill_bps: 5000,
      avg_score: 682,
      grade: 'A',
      distance_km: 34,
      score: 0.87,
      why_mr: 'जवळचे अंतर, ग्रेड A',
      why_en: 'Nearby, grade A',
      lot_ref: 'A-2291',
      farmer_label: 'रामभाऊ पाटील',
      village: 'निफाड',
      asking_paise_per_qtl: 215000,
      market_paise_per_qtl: 205400,
      moisture_pct: 9.2,
      bags: 80,
      pickup_at_farm: true,
      assayed: true,
    },
  ],
};

/** The empty state has to be reachable, not just written. */
export const fxMatchesEmpty: MatchesRes = { matches: [] };
