/**
 * CANON §7.2-shaped fixtures for `GET /ref/commodities` and
 * `GET /ref/markets?district_id=`. Kartik's K5 does not exist yet.
 *
 * ★ There are two commodities, and that is not a placeholder — it is the
 *   scope. `docs/roles/KARTIK.md` §"Commodities": *"2 — onion + tomato.
 *   Tomato is the NO_ADVICE crop. One commodity cannot demonstrate refusal."*
 *   The crop picker on the market screen therefore offers two crops, not a
 *   long menu of vegetables. A dropdown listing twenty crops the model has
 *   never seen would be a list of promises the forecast cannot keep, and the
 *   farmer would find that out only after asking one of them.
 *
 * ★ Markets are per district because a district does not identify a price
 *   series — `/prices/series` is keyed by mandi. Nashik has two, so the
 *   picker has something real to disambiguate rather than a single option
 *   dressed up as a choice.
 *
 * ★ `storable_days` and `spoilage` are why the two crops behave differently
 *   downstream: onion keeps for months and can be held, tomato cannot. The
 *   decision engine reads that, and it is the reason waiting is a real option
 *   for one crop and not the other.
 */

import type { Commodity, Market } from '../types/api';

export const fxCommodities: Commodity[] = [
  { id: 'cmd_onion', name: 'Onion', name_mr: 'कांदा', storable_days: 150 },
  { id: 'cmd_tomato', name: 'Tomato', name_mr: 'टोमॅटो', storable_days: 7 },
];

/**
 * Keyed by district. Lasalgaon is the demo mandi — Asia's largest onion
 * market, and a name a Maharashtra judge recognises.
 */
export const fxMarketsByDistrict: Record<string, Market[]> = {
  dist_nashik: [
    {
      id: 'mkt_lasalgaon',
      name: 'Lasalgaon',
      name_mr: 'लासलगाव',
      district_id: 'dist_nashik',
      lat: 20.1428,
      lon: 74.2394,
    },
    {
      id: 'mkt_pimpalgaon',
      name: 'Pimpalgaon Baswant',
      name_mr: 'पिंपळगाव बसवंत',
      district_id: 'dist_nashik',
      lat: 20.1697,
      lon: 73.9819,
    },
  ],
  dist_ahmednagar: [
    {
      id: 'mkt_ahmednagar',
      name: 'Ahmednagar',
      name_mr: 'अहमदनगर',
      district_id: 'dist_ahmednagar',
      lat: 19.0948,
      lon: 74.748,
    },
  ],
  dist_pune: [
    {
      id: 'mkt_pune',
      name: 'Pune',
      name_mr: 'पुणे',
      district_id: 'dist_pune',
      lat: 18.5204,
      lon: 73.8567,
    },
  ],
};

export function fxMarketsFor(districtId: string): Market[] {
  return fxMarketsByDistrict[districtId] ?? [];
}
