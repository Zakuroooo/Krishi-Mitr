/**
 * CANON §6.4-shaped fixtures for `disputes` and `dispute_events`. Akash's
 * `POST /disputes` and `GET /disputes/{id}` do not exist in this repo — S25
 * builds against these until they do (CLAUDE.md §0).
 *
 * ★ These rows are not free-standing. `fixtures/escrow.ts` already seeds a
 *   disputed transaction, and its escrow stream ends on a real event:
 *
 *     evt_d5  DELIVERED → DISPUTED  actor buyer_2  2026-09-03T15:00:00+05:30
 *             note: "वजन कमी भरले — तक्रार नोंदवली."
 *
 *   So the dispute below is *that* dispute: same tx, same actor, same instant,
 *   and `reason_code: 'SHORT_WEIGHT'` because "वजन कमी भरले" is short weight and
 *   nothing else. A judge who reads the escrow timeline on S22 and the dispute
 *   on S25 sees two streams that agree. Two fixtures that disagreed about who
 *   complained, when, or why would be worse than one — it would look like a
 *   data bug in a product whose entire pitch is an auditable record.
 *
 * The tx id is written out rather than imported: no fixture file in this repo
 * imports another, and the coupling is documented here instead.
 */

import type { DisputeDto, DisputeEvent, DisputeRes } from '../types/api';

/**
 * The seeded dispute, sitting at `MEDIATION` — past `RAISED`, past `EVIDENCE`,
 * not resolved. Deliberately unresolved: the honest state of a dispute in a
 * Phase-1 product with no mediator tooling is "a human is looking at it", and
 * a fixture that showed a tidy `RESOLVED_SPLIT` would be claiming a mediation
 * capability we have not built.
 *
 * `raised_by` is a buyer, and the buyer is the actor S25 runs as. That is the
 * point of the screen: he can see his own complaint and its stage, and he can
 * do nothing to resolve it.
 */
export const fxDispute: DisputeDto = {
  id: 'dispute_1',
  tx_id: 'tx_disputed_1',
  raised_by: 'buyer_2',
  reason_code: 'SHORT_WEIGHT',
  description: 'वजन कमी भरले — ४५ क्विंटलपैकी ४२ क्विंटल मिळाले.',
  photo_path: null,
  stage: 'MEDIATION',
  created_at: '2026-09-03T15:00:00+05:30',
};

/**
 * Append-only (I5) — three rows, one per stage the dispute has passed through,
 * oldest first. Nothing here is an `UPDATE` of anything above it.
 *
 * `dspevt_3` has `actor_user_id: null`, which is legal (`references users(id)`
 * is nullable in CANON §6.4) and means the platform acted rather than a person
 * — assigning a mediator is not something either party does.
 *
 * The dates are one day apart so the rendered timeline reads as a sequence
 * rather than three stamps on the same afternoon.
 */
export const fxDisputeEvents: DisputeEvent[] = [
  {
    id: 'dspevt_1',
    dispute_id: 'dispute_1',
    stage: 'RAISED',
    actor_user_id: 'buyer_2',
    note: 'वजन कमी भरले — तक्रार नोंदवली.',
    created_at: '2026-09-03T15:00:00+05:30',
  },
  {
    id: 'dspevt_2',
    dispute_id: 'dispute_1',
    stage: 'EVIDENCE',
    actor_user_id: 'farmer_1',
    note: 'काट्याची पावती जोडली.',
    created_at: '2026-09-04T11:00:00+05:30',
  },
  {
    id: 'dspevt_3',
    dispute_id: 'dispute_1',
    stage: 'MEDIATION',
    actor_user_id: null,
    note: 'FPO मध्यस्थ नेमला. दोन्ही बाजू ऐकल्या जातील.',
    created_at: '2026-09-05T10:00:00+05:30',
  },
];

/** What `GET /disputes/{id}` returns for `dispute_1`. */
export const fxDisputeRes: DisputeRes = {
  dispute: fxDispute,
  events: fxDisputeEvents,
};

/**
 * ★ This map stands in for a lookup the contract does not have. CANON §7.7 has
 *   `GET /disputes/{id}` and no way to go from a transaction to its dispute —
 *   no `?tx_id=` filter, no `dispute_id` on `TxDto`. Under fixtures we can
 *   resolve it locally; against a live API S25 cannot, and says so rather than
 *   inventing an id. See the `TODO(akash)` on `getDispute` in `lib/api.ts`.
 *
 * `tx_1` is deliberately absent. It is `DISPATCHED` with no complaint against
 * it, which is what makes S25's raise form reachable — the screen's primary
 * path needs a transaction that *can* be disputed and has not been.
 */
export const fxDisputeByTxId: Record<string, DisputeRes> = {
  tx_disputed_1: fxDisputeRes,
};
