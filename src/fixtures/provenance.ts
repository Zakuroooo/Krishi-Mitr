/**
 * CANON §7.8-shaped fixture for `GET /meta/data-provenance` (S24). Shape
 * transcribed from `docs/handover/FRONTEND_NEEDS_BACKEND.md` §8.
 *
 * Includes one non-AGMARKNET/MSAMB row so the I8 badge has something real to
 * badge, and one SYNTHETIC row with a null `source_url` — the honest case:
 * a null URL is acceptable only when the row still says plainly that it is
 * synthetic.
 */

import type { ProvenanceRes } from '../types/api';

export const fxProvenance: ProvenanceRes = {
  generated_at: '2026-09-06T06:00:00+05:30',
  rows: [
    {
      commodity_id: 'onion',
      commodity_name_mr: 'कांदा',
      market_id: 'mkt_lasalgaon',
      market_name_mr: 'लासलगाव',
      source: 'AGMARKNET',
      row_count: 412,
      first_obs_date: '2025-01-01',
      last_obs_date: '2026-09-05',
      source_url: 'https://agmarknet.gov.in',
    },
    {
      commodity_id: 'onion',
      commodity_name_mr: 'कांदा',
      market_id: 'mkt_pune',
      market_name_mr: 'पुणे',
      source: 'MSAMB',
      row_count: 198,
      first_obs_date: '2025-03-12',
      last_obs_date: '2026-09-04',
      source_url: 'https://msamb.com',
    },
    {
      commodity_id: 'onion',
      commodity_name_mr: 'कांदा',
      market_id: 'mkt_nagpur',
      market_name_mr: 'नागपूर',
      source: 'SYNTHETIC',
      row_count: 30,
      first_obs_date: '2026-08-01',
      last_obs_date: '2026-08-30',
      source_url: null,
    },
  ],
};
