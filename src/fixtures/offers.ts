/**
 * CANON §7.6-shaped fixture for `GET/POST /offers` (S14, S19, S21). Shape
 * transcribed from `docs/handover/FRONTEND_NEEDS_BACKEND.md` §6.
 */

import type { OfferDto } from '../types/api';
import {
  DEMO_NOTE_RAISED_FOR_TRANSPORT,
  DEMO_NOTE_TRUCK_TOMORROW,
} from '../lib/offerNote';

export const fxIncomingOffer: OfferDto = {
  id: 'offer_1',
  demand_id: 'demand_1',
  buyer_id: 'buyer_1',
  farmer_id: 'farmer_1',
  pool_id: null,
  price_paise_per_qtl: 185000,
  qty_kg: 4000,
  round: 1,
  parent_offer_id: null,
  initiator: 'BUYER',
  status: 'OPEN',
  expires_at: '2026-09-08T18:00:00+05:30',
  created_at: '2026-09-03T09:00:00+05:30',
  lots: [{ lot_id: 'lot_listed_1', qty_allocated_kg: 4000 }],
  note: null,
};

/**
 * Round 3 — the last round before the counter cap. S14 must disable its
 * counter button here, per `round`, rather than letting the farmer type a
 * price and hitting the server's 409 MAX_ROUNDS.
 */
export const fxIncomingOfferLastRound: OfferDto = {
  ...fxIncomingOffer,
  id: 'offer_3',
  price_paise_per_qtl: 193000,
  round: 3,
  parent_offer_id: 'offer_2',
  initiator: 'BUYER',
  created_at: '2026-09-04T10:00:00+05:30',
};

/** Round 2 of a negotiation — farmer countered the buyer's opening bid. */
export const fxOffer: OfferDto = {
  id: 'offer_2',
  demand_id: 'demand_1',
  buyer_id: 'buyer_1',
  farmer_id: 'farmer_1',
  pool_id: null,
  price_paise_per_qtl: 200000,
  qty_kg: 4000,
  round: 2,
  parent_offer_id: 'offer_1',
  initiator: 'FARMER',
  status: 'OPEN',
  expires_at: '2026-09-08T18:00:00+05:30',
  created_at: '2026-09-03T11:15:00+05:30',
  lots: [{ lot_id: 'lot_listed_1', qty_allocated_kg: 4000 }],
  note: DEMO_NOTE_RAISED_FOR_TRANSPORT,
};

/**
 * Two more buyers bidding on the same lot, so "who wants my produce" has
 * something to rank.
 *
 * ★ Why these are only offers and carry no buyer names: `OfferDto` has
 *   `buyer_id` and nothing else about the buyer. CANON §6.2's `buyers` table
 *   does have `business_name`, `tier`, `deals_completed`,
 *   `on_time_payment_bps` and `renegotiation_bps` — but §7.6 exposes none of
 *   it, and there is no `GET /buyers/{id}`. Blocker filed.
 *
 *   The screen that ranks these used to fill the gap with three invented
 *   companies — "Nashik Agro Exports", "Sahyadri Farms FPO", "Pune Trading
 *   Co." — with invented star ratings and on-time percentages, hardcoded as
 *   i18n strings so every farmer in every language met the same three
 *   fictional firms. Inventing them here instead would move the same lie one
 *   directory over. A fixture may stand in for an endpoint that exists on
 *   paper; it may not stand in for a field the contract does not have.
 *
 * ★ The prices differ meaningfully rather than by a rupee, because the
 *   screen's job is to make the best offer obvious at a glance to someone
 *   who may not read the numbers fluently.
 */
export const fxLotOffers: OfferDto[] = [
  fxIncomingOffer,
  {
    ...fxIncomingOffer,
    id: 'offer_b2_1',
    buyer_id: 'buyer_2',
    price_paise_per_qtl: 191000,
    qty_kg: 4000,
    round: 1,
    parent_offer_id: null,
    created_at: '2026-09-03T12:40:00+05:30',
    lots: [{ lot_id: 'lot_listed_1', qty_allocated_kg: 4000 }],
    note: DEMO_NOTE_TRUCK_TOMORROW,
  },
  {
    ...fxIncomingOffer,
    id: 'offer_b3_1',
    buyer_id: 'buyer_3',
    // Partial: wants half the lot. The screen has to say so — an offer for
    // 20 quintals at a high rate is not comparable to one for all 40, and a
    // farmer reading only the per-quintal number would pick wrong.
    price_paise_per_qtl: 196000,
    qty_kg: 2000,
    round: 1,
    parent_offer_id: null,
    created_at: '2026-09-04T08:10:00+05:30',
    lots: [{ lot_id: 'lot_listed_1', qty_allocated_kg: 2000 }],
    note: null,
  },
];

/**
 * Every offer this farmer has, open and settled — what `GET /offers` returns
 * for him, actor-scoped.
 *
 * ★ Why one list rather than a per-screen one: Talks, the Deals tab, the
 *   notifications screen and the buyers-for-a-lot screen all read
 *   `queryKey: ['offers', 'talks']`, which is correct — it is one query. But
 *   they had each been handing TanStack Query a *different* fetcher under
 *   that one key, so whichever screen mounted first populated the cache and
 *   the others silently rendered its data. The Deals tab showed "no deals
 *   agreed yet" whenever Talks had loaded before it, which is exactly the
 *   sort of bug that only appears in one navigation order.
 */
export const fxMyOffers: OfferDto[] = [
  { ...fxOffer, id: 'offer_accepted_1', status: 'ACCEPTED' },
  ...fxLotOffers,
];

/**
 * One negotiation, oldest round first — the shape `GET /offers/{id}/thread`
 * returns, and what the bargaining screen renders as its audit trail.
 *
 * ★ Built from the three offer fixtures that already exist rather than new
 *   numbers, so the thread and the inbox can never tell different stories
 *   about the same offer: buyer opens at ₹1,850, farmer counters at ₹2,000,
 *   buyer closes at ₹1,930 on the last round the cap allows.
 */
export const fxOfferThread: OfferDto[] = [
  fxIncomingOffer,
  fxOffer,
  fxIncomingOfferLastRound,
];

/**
 * The thread as it stood when `offerId` was the newest round.
 *
 * ★ Why this is not just `fxOfferThread`: the flat list returns all three
 *   rounds whatever you ask for, so opening the round-1 offer from Talks
 *   showed a negotiation already at round 3 — with the counter button
 *   disabled, which put the counter-offer sheet out of reach entirely. A
 *   fixture that ignores its argument had made a whole screen unreachable.
 *
 * ★ Truncating at the requested offer is also what the real endpoint does:
 *   `GET /offers/{id}/thread` returns the chain that offer belongs to, and
 *   rounds struck after it did not exist when it was the live one.
 */
export function fxThreadFor(offerId: string): OfferDto[] {
  const idx = fxOfferThread.findIndex(o => o.id === offerId);
  if (idx === -1) return fxOfferThread;
  return fxOfferThread.slice(0, idx + 1);
}
