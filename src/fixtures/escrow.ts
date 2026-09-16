/**
 * CANON §7.7-shaped fixtures for transactions and the escrow event stream
 * (S15, S22, S25). Shapes transcribed from
 * `docs/handover/FRONTEND_NEEDS_BACKEND.md` §7.
 *
 * Money is integer paise. The timeline renders from `events`, never from
 * `TxDto.status` alone — `escrow_events` is append-only (I5).
 */

import type { EscrowEvent, TxDto } from '../types/api';

/** A transaction in the ordinary, undisputed path — currently DISPATCHED. */
export const fxTx: TxDto = {
  id: 'tx_1',
  offer_id: 'offer_2',
  buyer_id: 'buyer_1',
  farmer_id: 'farmer_1',
  pool_id: null,
  qty_kg: 4000,
  price_paise_per_qtl: 200000,
  gross_paise: 8000000,
  deductions_paise: 123000,
  net_paise: 7877000,
  status: 'DISPATCHED',
  created_at: '2026-09-03T12:00:00+05:30',
};

export const fxEscrowEvents: EscrowEvent[] = [
  {
    id: 'evt_1',
    tx_id: 'tx_1',
    from_status: null,
    to_status: 'CREATED',
    actor_user_id: 'buyer_1',
    note: null,
    created_at: '2026-09-03T12:00:00+05:30',
  },
  {
    id: 'evt_2',
    tx_id: 'tx_1',
    from_status: 'CREATED',
    to_status: 'ESCROW_HELD',
    actor_user_id: 'buyer_1',
    note: null,
    created_at: '2026-09-03T12:30:00+05:30',
  },
  {
    id: 'evt_3',
    tx_id: 'tx_1',
    from_status: 'ESCROW_HELD',
    to_status: 'DISPATCHED',
    actor_user_id: 'farmer_1',
    note: null,
    created_at: '2026-09-04T08:00:00+05:30',
  },
];

/**
 * §11's required seed state: a `DISPUTED` transaction with at least three
 * `escrow_events`. Five here — the current status is the last event's
 * `to_status`, so the stream stops at DISPUTED rather than rolling forward.
 */
export const fxTxDisputed: TxDto = {
  id: 'tx_disputed_1',
  offer_id: 'offer_1',
  buyer_id: 'buyer_2',
  farmer_id: null,
  pool_id: 'fpo_1',
  qty_kg: 4500,
  price_paise_per_qtl: 195000,
  gross_paise: 8775000,
  deductions_paise: 140000,
  net_paise: 8635000,
  status: 'DISPUTED',
  created_at: '2026-09-01T10:00:00+05:30',
};

export const fxEscrowEventsDisputed: EscrowEvent[] = [
  {
    id: 'evt_d1',
    tx_id: 'tx_disputed_1',
    from_status: null,
    to_status: 'CREATED',
    actor_user_id: 'buyer_2',
    note: null,
    created_at: '2026-09-01T10:00:00+05:30',
  },
  {
    id: 'evt_d2',
    tx_id: 'tx_disputed_1',
    from_status: 'CREATED',
    to_status: 'ESCROW_HELD',
    actor_user_id: 'buyer_2',
    note: null,
    created_at: '2026-09-01T10:20:00+05:30',
  },
  {
    id: 'evt_d3',
    tx_id: 'tx_disputed_1',
    from_status: 'ESCROW_HELD',
    to_status: 'DISPATCHED',
    actor_user_id: 'farmer_1',
    note: null,
    created_at: '2026-09-02T07:30:00+05:30',
  },
  {
    id: 'evt_d4',
    tx_id: 'tx_disputed_1',
    from_status: 'DISPATCHED',
    to_status: 'DELIVERED',
    actor_user_id: 'buyer_2',
    note: null,
    created_at: '2026-09-03T09:00:00+05:30',
  },
  {
    id: 'evt_d5',
    tx_id: 'tx_disputed_1',
    from_status: 'DELIVERED',
    to_status: 'DISPUTED',
    actor_user_id: 'buyer_2',
    note: 'वजन कमी भरले — तक्रार नोंदवली.',
    created_at: '2026-09-03T15:00:00+05:30',
  },
];
