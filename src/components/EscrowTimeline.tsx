/**
 * EscrowTimeline — the FSM rendered as a timeline, from real data.
 *
 * ★ One component, two call sites, no third screen number. PRANAY.md §1.4:
 *   "S15 is the list, and the escrow timeline is a component inside it, not
 *   a separate screen ... tapping a row expands the state timeline using
 *   the same component Shreya builds for S22." S22 (buyer) and S15 (farmer)
 *   both render this component against the same `TxDto` + `EscrowEvent[]`
 *   shape — neither screen owns its own copy of the FSM's steps or labels.
 *
 * ★ CANON §7.7: **the timeline renders from `events`, never from
 *   `TxDto.status` alone.** The current status is the last event's
 *   `to_status` — that is why `escrow_events` is append-only (I5), and why
 *   this component takes `events` as its primary input and only reads
 *   `tx.status`/`tx.net_paise` for the summary card above the steps.
 *
 * ★ The FSM diagram (CANON §7.7):
 *
 *     CREATED ──► ESCROW_HELD ──► DISPATCHED ──► DELIVERED ──► RELEASED
 *        │             │               │             │
 *        └──► CANCELLED└──► REFUNDED   └──► DISPUTED ◄┘
 *                                           │
 *                                           ├──► RELEASED   (resolved for farmer)
 *                                           └──► REFUNDED   (resolved for buyer)
 *
 *   The "happy path" rail below is the five states that diagram's main line
 *   names. `DISPUTED`/`CANCELLED`/`REFUNDED` are real states a transaction
 *   can be in — rendered as their own labelled step appended after the rail,
 *   not silently folded into whichever happy-path step preceded them, since
 *   collapsing "this transaction is disputed" into "delivered" would hide
 *   the one state a farmer or buyer most needs to see clearly.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatPaise } from '../lib/money';
import { devNum, translate } from '../lib/i18n';
import type { EscrowEvent, Locale, TxDto, TxStatus } from '../types/api';

export interface EscrowTimelineProps {
  tx: TxDto;
  events: EscrowEvent[];
  locale?: Locale;
}

/** The happy-path rail, in order. Anything not on it (DISPUTED, CANCELLED,
 * REFUNDED) is rendered as a trailing step instead, per the header comment. */
const RAIL: TxStatus[] = ['CREATED', 'ESCROW_HELD', 'DISPATCHED', 'DELIVERED', 'RELEASED'];

/** Dictionary keys, not text — `translate()` resolves the actual label.
 * Exported so a collapsed row (S15's transaction list, say) can show the
 * same status word this component uses internally, without a second copy
 * of the translation table drifting from this one. */
export const STATUS_LABEL_KEY: Record<TxStatus, string> = {
  CREATED: 'tx_status_created',
  ESCROW_HELD: 'tx_status_escrow_held',
  DISPATCHED: 'tx_status_dispatched',
  DELIVERED: 'tx_status_delivered',
  RELEASED: 'tx_status_released',
  DISPUTED: 'tx_status_disputed',
  REFUNDED: 'tx_status_refunded',
  CANCELLED: 'tx_status_cancelled',
};

export function txStatusLabel(status: TxStatus, locale: Locale): string {
  return translate(STATUS_LABEL_KEY[status], locale);
}

function eventTimeLabel(iso: string, locale: Locale): string {
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return devNum(`${day}/${d.getMonth() + 1} ${hh}:${mm}`, locale);
}

export function EscrowTimeline({ tx, events, locale = 'mr' }: EscrowTimelineProps) {
  // The event whose `to_status` matches each rail step — undefined for a
  // step the transaction has not reached yet. Off-rail events (DISPUTED and
  // its resolution) are collected separately and appended after the rail.
  const eventByStatus = new Map<TxStatus, EscrowEvent>();
  const offRail: EscrowEvent[] = [];
  for (const e of events) {
    if (RAIL.includes(e.to_status) && !eventByStatus.has(e.to_status)) {
      eventByStatus.set(e.to_status, e);
    } else if (!RAIL.includes(e.to_status)) {
      offRail.push(e);
    }
  }

  const lastEvent = events.length > 0 ? events[events.length - 1] : undefined;
  const currentStatus = lastEvent ? lastEvent.to_status : tx.status;
  const railReachedIndex = RAIL.indexOf(currentStatus);

  return (
    <View>
      <View style={styles.txCard}>
        <View style={styles.row}>
          <Text style={styles.txId}>
            {translate('tx_id_label', locale)}: #{tx.id}
          </Text>
          <Text style={styles.statusBadgeText}>{txStatusLabel(currentStatus, locale)}</Text>
        </View>
        <Text style={styles.txAmount}>
          {translate('tx_net_amount_label', locale)}: {formatPaise(tx.net_paise, locale)}
        </Text>
      </View>

      <View style={styles.timeline}>
        {RAIL.map((state, i) => {
          const event = eventByStatus.get(state);
          // Reached if there is an event for it, OR the FSM has already
          // passed this rail position (covers a DISPUTED tx that skipped
          // straight from DELIVERED without RELEASED's own event existing).
          const completed = Boolean(event) || (railReachedIndex >= 0 && i < railReachedIndex);
          const active = railReachedIndex === i;
          return (
            <View key={state} style={styles.stepRow}>
              <View style={styles.indicatorCol}>
                <View style={[styles.dot, completed && styles.dotCompleted, active && styles.dotActive]}>
                  <Text style={styles.dotIcon}>{completed ? '✓' : i + 1}</Text>
                </View>
                <View style={[styles.line, completed && styles.lineCompleted]} />
              </View>
              <View style={styles.contentCol}>
                <Text style={[styles.stepLabel, active && styles.activeText]}>
                  {txStatusLabel(state, locale)}
                </Text>
                {event?.note ? <Text style={styles.stepDesc}>{event.note}</Text> : null}
                {event ? (
                  <Text style={styles.timeText}>{eventTimeLabel(event.created_at, locale)}</Text>
                ) : null}
              </View>
            </View>
          );
        })}

        {offRail.map((event, i) => (
          <View key={event.id} style={styles.stepRow}>
            <View style={styles.indicatorCol}>
              <View style={[styles.dot, styles.dotOffRail]}>
                <Text style={styles.dotIcon}>!</Text>
              </View>
              {i < offRail.length - 1 ? <View style={styles.line} /> : null}
            </View>
            <View style={styles.contentCol}>
              <Text style={[styles.stepLabel, styles.offRailText]}>
                {txStatusLabel(event.to_status, locale)}
              </Text>
              {event.note ? <Text style={styles.stepDesc}>{event.note}</Text> : null}
              <Text style={styles.timeText}>{eventTimeLabel(event.created_at, locale)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  txCard: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' },
  txId: { fontSize: 14, fontWeight: '700', color: '#1E293B' },
  statusBadgeText: { fontSize: 12, fontWeight: '700', color: '#E65100' },
  txAmount: { fontSize: 16, fontWeight: '800', color: '#1B5E20' },
  timeline: { paddingLeft: 8 },
  stepRow: { flexDirection: 'row', marginBottom: 16 },
  indicatorCol: { alignItems: 'center', width: 32 },
  dot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotCompleted: { backgroundColor: '#2E7D32' },
  dotActive: { backgroundColor: '#E65100', borderWidth: 2, borderColor: '#FFF8E1' },
  dotOffRail: { backgroundColor: '#C53030' },
  dotIcon: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  line: { width: 2, flex: 1, backgroundColor: '#E2E8F0', marginTop: 4, minHeight: 8 },
  lineCompleted: { backgroundColor: '#81C784' },
  contentCol: { flex: 1, paddingLeft: 12 },
  stepLabel: { fontSize: 15, fontWeight: '700', color: '#334155' },
  activeText: { color: '#E65100' },
  offRailText: { color: '#C53030' },
  stepDesc: { fontSize: 13, color: '#64748B', marginTop: 2 },
  timeText: { fontSize: 11, color: '#94A3B8', marginTop: 3 },
});
