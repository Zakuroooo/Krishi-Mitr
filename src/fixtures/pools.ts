/**
 * CANON §7.5-shaped fixtures for `GET /pools/{id}` (S16, FPO grade-weighted
 * split). Shapes transcribed from `docs/handover/FRONTEND_NEEDS_BACKEND.md` §5.
 *
 * Money is integer paise (`vs_solo_paise`), quantity is integer kg, shares are
 * integer bps. `weight` is `qty_kg * grade_multiplier` and is itself unitless —
 * it is exposed so the split maths is auditable, not because it is a quantity.
 */

import type { PoolDto } from '../types/api';

/**
 * §11's required seed state: every member's `share_bps` sums to **exactly**
 * 10000, and `all_consented` is true. Grade multipliers per CANON §9:
 * A=1.00, B=0.92, C=0.80.
 *
 *   weights: 2000*1.00=2000, 1500*0.92=1380, 1000*0.80=800  → total 4180
 *   share_bps: 2000/4180, 1380/4180, 800/4180 rounded to sum to 10000 exactly
 *   (4785 + 3301 + 1914 = 10000)
 */
export const fxPool: PoolDto = {
  fpo: { id: 'fpo_1', name: 'Lasalgaon FPO', name_mr: 'लासलगाव एफपीओ' },
  total_qty_kg: 4500,
  avg_score: 712,
  members: [
    {
      lot_id: 'lot_pool_a',
      farmer_id: 'farmer_1',
      farmer_name: 'रमेश पाटील',
      qty_kg: 2000,
      score_at_pool: 780,
      weight: 2000,
      share_bps: 4785,
      vs_solo_paise: 18500,
      consented: true,
    },
    {
      lot_id: 'lot_pool_b',
      farmer_id: 'farmer_2',
      farmer_name: 'सुनीता जाधव',
      qty_kg: 1500,
      score_at_pool: 640,
      weight: 1380,
      share_bps: 3301,
      vs_solo_paise: 9200,
      consented: true,
    },
    {
      lot_id: 'lot_pool_c',
      farmer_id: 'farmer_3',
      farmer_name: 'विजय शिंदे',
      qty_kg: 1000,
      score_at_pool: 510,
      weight: 800,
      share_bps: 1914,
      vs_solo_paise: 4100,
      consented: true,
    },
  ],
  all_consented: true,
};

/**
 * §11's Pareto-guard seed state: `farmer_3`'s `vs_solo_paise` is negative — this
 * pool must not form (CANON §10). S16's honest state is "this pool does not
 * form, and here is who it would have hurt", not hiding the row.
 */
export const fxPoolParetoViolation: PoolDto = {
  fpo: { id: 'fpo_2', name: 'Niphad FPO', name_mr: 'निफाड एफपीओ' },
  total_qty_kg: 3200,
  avg_score: 655,
  members: [
    {
      lot_id: 'lot_pareto_a',
      farmer_id: 'farmer_4',
      farmer_name: 'अनिल कदम',
      qty_kg: 2200,
      score_at_pool: 720,
      weight: 2200,
      share_bps: 7857,
      vs_solo_paise: 6500,
      consented: true,
    },
    {
      lot_id: 'lot_pareto_b',
      farmer_id: 'farmer_5',
      farmer_name: 'महेश गायकवाड',
      qty_kg: 1000,
      score_at_pool: 480,
      weight: 600,
      share_bps: 2143,
      vs_solo_paise: -3200,
      consented: false,
    },
  ],
  all_consented: false,
};
