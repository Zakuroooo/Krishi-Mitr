/**
 * CANON §7.6-shaped fixture for `GET/POST /demands` (S14, S18, S19). Shape
 * transcribed from `docs/handover/FRONTEND_NEEDS_BACKEND.md` §6.
 */

import type { DemandDto } from '../types/api';

export const fxDemand: DemandDto = {
  id: 'demand_1',
  buyer_id: 'buyer_1',
  commodity_id: 'onion',
  market_id: 'mkt_pune',
  qty_kg: 8000,
  min_grade: 'B',
  bid_paise_per_qtl: 198000,
  needed_by: '2026-09-20',
  status: 'OPEN',
  source: 'SEEDED',
  created_at: '2026-09-02T09:00:00+05:30',
};
