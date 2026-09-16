/**
 * CANON §7.3-shaped fixture for `GET /prices/nearby`. Kartik's K6 does not exist
 * yet. The Lasalgaon and Pune rows are transcribed verbatim from CANON's own
 * worked example; Nagpur is added so the fixture actually demonstrates the
 * thing this endpoint exists to show.
 *
 * ★ CANON's two-row example alone does not demonstrate a reordering — Pune
 *   happens to win on both gross (218000 > 205000) *and* net (195730 > 193925),
 *   so two rows sorted either way land in the same order. PLAN.md's own
 *   acceptance bar for K6 is "at least one case where net-order ≠ gross-order,"
 *   and PRANAY.md's P7 is "the reordering is visible to the eye" — neither holds
 *   with just the two given rows. Nagpur (high gross, crippling transport
 *   because it is genuinely far) is engineered to drop from #1 by gross to last
 *   by net:
 *
 *     gross:  Nagpur 225000 > Pune 218000 > Lasalgaon 205000
 *     net:    Pune   195730 > Lasalgaon 193925 > Nagpur 186625
 *
 *   Net = gross − transport − commission, the same two-subtraction arithmetic
 *   CANON's own worked example uses (205000 − 8000 − 3075 = 193925 — checked by
 *   hand). `NearbyMarketRow` has no separate `loading` field to subtract.
 */

import type { NearbyRes } from '../types/api';

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date(Date.now() - 0 * DAY_MS).toISOString().slice(0, 10);

export const fxNearby: NearbyRes = {
  as_of_date: today,
  sorted_by: 'net_paise_per_qtl',
  rows: [
    {
      market_id: 'mkt_pune',
      name_mr: 'पुणे',
      gross_paise_per_qtl: 218000,
      transport_paise_per_qtl: 19000,
      commission_paise_per_qtl: 3270,
      net_paise_per_qtl: 195730,
      distance_km: 168,
      source: 'AGMARKNET',
    },
    {
      market_id: 'mkt_lasalgaon',
      name_mr: 'लासलगाव',
      gross_paise_per_qtl: 205000,
      transport_paise_per_qtl: 8000,
      commission_paise_per_qtl: 3075,
      net_paise_per_qtl: 193925,
      distance_km: 34,
      source: 'AGMARKNET',
    },
    {
      market_id: 'mkt_nagpur',
      name_mr: 'नागपूर',
      gross_paise_per_qtl: 225000,
      transport_paise_per_qtl: 35000,
      commission_paise_per_qtl: 3375,
      net_paise_per_qtl: 186625,
      distance_km: 310,
      source: 'AGMARKNET',
    },
  ],
};
