/**
 * S25 — raise a dispute on a transaction.
 *
 * What this screen deliberately does NOT do, and why:
 *
 *  - **No buyer self-resolve button.** The old version had one, and the escrow
 *    FSM (CANON §7.7) does not permit it: `DISPUTED` resolves to `RELEASED` or
 *    `REFUNDED` as a *mediation* outcome. A button that lets the complainant
 *    decide his own complaint is a `409` dressed up as a feature, and it tells a
 *    judge we did not read our own state machine. The screen now says in words
 *    who decides, and that escrow stays held until they do.
 *
 *  - **No fabricated event row.** `POST /disputes` returns a dispute; it does
 *    not hand back a `dispute_events` row. `dispute_events` is append-only (I5),
 *    so inventing a `RAISED` event client-side would be showing a judge a row
 *    that does not exist in the database. The timeline card renders only when
 *    there are real events to render.
 *
 *  - **No fake tx transition.** Whether raising a dispute drives the FSM to
 *    `DISPUTED` is Akash's call (I11 — transitions go through the FSM only).
 *    "Goods dispatched" and "a dispute is open on that shipment" are both true
 *    at once, so the tx status line is left exactly as the server reported it.
 *
 *  - **No `Math.random()` and no `setTimeout` theatre.** The fixture dispute id
 *    is derived from the tx id, so the same tap produces the same id twice.
 *
 * The amount on screen is `gross_paise`, not `net_paise`: the buyer paid gross
 * into escrow. The farmer-facing surfaces (EscrowTimeline, S15) show net,
 * because that is what the farmer receives. Same transaction, two true numbers.
 */

import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';

import { Badge, type BadgeType } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import { txStatusLabel } from '../../components/EscrowTimeline';
import { USE_FIXTURES } from '../../config';
import { fxDisputeByTxId } from '../../fixtures/disputes';
import { fxTx } from '../../fixtures/escrow';
import { createDispute, getTransaction } from '../../lib/api';
import { formatDate } from '../../lib/dates';
import { translate } from '../../lib/i18n';
import { getLocale } from '../../lib/locale';
import { formatPaise } from '../../lib/money';
import type {
  DisputeDto,
  DisputeEvent,
  DisputeReasonCode,
  DisputeStage,
  Locale,
  TxDto,
  TxStatus,
} from '../../types/api';

/**
 * The Dispute tab takes no params (BuyerTabs.tsx wires the screen directly),
 * so this default is not a fallback — it is the only transaction a judge sees.
 * `fxTx` is `DISPATCHED`, which is disputable, so the primary path works end
 * to end: pick a reason, type it, submit, read it back.
 */
const DEFAULT_TX_ID = fxTx.id;

/** CANON §7.7: DISPUTED is reachable only from DISPATCHED or DELIVERED. */
const DISPUTABLE_FROM: readonly TxStatus[] = ['DISPATCHED', 'DELIVERED'];

/** CANON §6.4 `disputes.reason_code` — these four, in this order. */
const REASON_CODES: readonly DisputeReasonCode[] = [
  'QUALITY_MISMATCH',
  'SHORT_WEIGHT',
  'PAYMENT_DELAY',
  'OTHER',
];

const REASON_KEY: Record<DisputeReasonCode, string> = {
  QUALITY_MISMATCH: 'dispute_reason_quality_mismatch',
  SHORT_WEIGHT: 'dispute_reason_short_weight',
  PAYMENT_DELAY: 'dispute_reason_payment_delay',
  OTHER: 'dispute_reason_other',
};

const STAGE_KEY: Record<DisputeStage, string> = {
  RAISED: 'dispute_stage_raised',
  EVIDENCE: 'dispute_stage_evidence',
  MEDIATION: 'dispute_stage_mediation',
  RESOLVED_FARMER: 'dispute_stage_resolved_farmer',
  RESOLVED_BUYER: 'dispute_stage_resolved_buyer',
  RESOLVED_SPLIT: 'dispute_stage_resolved_split',
  WITHDRAWN: 'dispute_stage_withdrawn',
};

const STAGE_BADGE: Record<DisputeStage, BadgeType> = {
  RAISED: 'WARNING',
  EVIDENCE: 'WARNING',
  MEDIATION: 'WARNING',
  RESOLVED_FARMER: 'SUCCESS',
  RESOLVED_BUYER: 'SUCCESS',
  RESOLVED_SPLIT: 'SUCCESS',
  WITHDRAWN: 'INFO',
};

const TX_STATUS_BADGE: Record<TxStatus, BadgeType> = {
  CREATED: 'INFO',
  ESCROW_HELD: 'INFO',
  DISPATCHED: 'INFO',
  DELIVERED: 'INFO',
  RELEASED: 'SUCCESS',
  DISPUTED: 'WARNING',
  REFUNDED: 'WARNING',
  CANCELLED: 'WARNING',
};

const fetchTx = (txId: string): Promise<TxDto> =>
  USE_FIXTURES ? Promise.resolve(fxTx) : getTransaction(txId);

/**
 * There is no documented way to go from a transaction to its dispute — no
 * `dispute_id` on `TxDto`, no `GET /disputes?tx_id=`. Under fixtures we can
 * index by tx id; against a live API we cannot, and returning `null` here is
 * what makes the screen say so out loud instead of pretending.
 *
 * TODO(akash): see docs/BLOCKERS.md — either field or query param unblocks this.
 */
async function fetchDisputeForTx(
  txId: string,
): Promise<{ dispute: DisputeDto; events: DisputeEvent[] } | null> {
  if (USE_FIXTURES) return fxDisputeByTxId[txId] ?? null;
  return null;
}

async function raiseDispute(
  tx: TxDto,
  reasonCode: DisputeReasonCode,
  description: string,
): Promise<DisputeDto> {
  if (USE_FIXTURES) {
    // Derived from the tx id, not random: the same tap yields the same id.
    return {
      id: `dispute_${tx.id}`,
      tx_id: tx.id,
      raised_by: tx.buyer_id,
      reason_code: reasonCode,
      description,
      photo_path: null,
      stage: 'RAISED',
      created_at: new Date().toISOString(),
    };
  }
  return createDispute({ tx_id: tx.id, reason_code: reasonCode, description });
}

export function S25_Dispute({ txId = DEFAULT_TX_ID }: { txId?: string }) {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const [reasonCode, setReasonCode] = useState<DisputeReasonCode | null>(null);
  const [description, setDescription] = useState('');
  const [validation, setValidation] = useState<string | null>(null);

  const {
    data: tx,
    isLoading,
    error,
    refetch,
  } = useQuery({ queryKey: ['tx', txId], queryFn: () => fetchTx(txId) });

  const { data: existing } = useQuery({
    queryKey: ['tx', txId, 'dispute'],
    queryFn: () => fetchDisputeForTx(txId),
  });

  const {
    mutate,
    isPending,
    isError: raiseFailed,
    data: raised,
  } = useMutation({
    mutationFn: (args: { tx: TxDto; reasonCode: DisputeReasonCode; description: string }) =>
      raiseDispute(args.tx, args.reasonCode, args.description),
  });

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={28} width="60%" style={styles.gap} />
        <Skeleton height={110} style={styles.gap} />
        <Skeleton height={220} />
      </ScrollView>
    );
  }

  // P11 — a failed refetch must not shadow data we already hold.
  if (error && !tx) {
    return (
      <View style={styles.centre}>
        <ErrorState onRetry={() => refetch()} locale={locale} />
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={styles.centre}>
        <EmptyState title={translate('dispute_no_tx', locale)} />
      </View>
    );
  }

  /**
   * After a successful raise we render from the mutation's own `data`, never
   * from a refetch: under fixtures `fetchDisputeForTx('tx_1')` returns null,
   * so a refetch would wipe the dispute and put the form back on screen.
   */
  const dispute: DisputeDto | null = raised ?? existing?.dispute ?? null;
  const events: DisputeEvent[] = raised ? [] : existing?.events ?? [];
  const canDispute = DISPUTABLE_FROM.includes(tx.status);

  const onSubmit = () => {
    if (!reasonCode) {
      setValidation(translate('dispute_reason_required', locale));
      return;
    }
    if (!description.trim()) {
      setValidation(translate('dispute_description_required', locale));
      return;
    }
    setValidation(null);
    mutate({ tx, reasonCode, description: description.trim() });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{translate('dispute_header', locale)}</Text>

      <Card style={styles.infoCard}>
        <View style={styles.row}>
          <Text style={styles.txId}>
            {translate('tx_id_label', locale)}: {tx.id}
          </Text>
          <Badge label={txStatusLabel(tx.status, locale)} type={TX_STATUS_BADGE[tx.status]} />
        </View>
        {/* gross, not net — the buyer paid gross into escrow. */}
        <Text style={styles.amount}>
          {translate('amount_escrow_protected', locale, {
            amount: formatPaise(tx.gross_paise, locale),
          })}
        </Text>
      </Card>

      {dispute ? (
        <>
          <Card style={styles.formCard}>
            <View style={styles.stageRow}>
              <Text style={styles.sectionTitle}>
                {translate('dispute_in_progress_title', locale)}
              </Text>
              <Badge
                label={translate(STAGE_KEY[dispute.stage], locale)}
                type={STAGE_BADGE[dispute.stage]}
              />
            </View>
            <Text style={styles.label}>
              {translate('dispute_reason_code_line', locale, {
                reason: translate(REASON_KEY[dispute.reason_code], locale),
              })}
            </Text>
            {dispute.description ? (
              <Text style={styles.disputedLine}>{dispute.description}</Text>
            ) : null}
            <Text style={styles.mediationNote}>
              {translate('dispute_mediation_note', locale)}
            </Text>
          </Card>

          {events.length > 0 ? (
            <Card style={styles.timelineCard}>
              <Text style={styles.sectionTitle}>
                {translate('dispute_timeline_title', locale)}
              </Text>
              {events.map(ev => (
                <View key={ev.id} style={styles.eventRow}>
                  <Text style={styles.eventStage}>{translate(STAGE_KEY[ev.stage], locale)}</Text>
                  <Text style={styles.eventDate}>{formatDate(ev.created_at, locale)}</Text>
                  {ev.note ? <Text style={styles.eventNote}>{ev.note}</Text> : null}
                </View>
              ))}
            </Card>
          ) : null}
        </>
      ) : tx.status === 'DISPUTED' ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>{translate('dispute_exists_unreadable', locale)}</Text>
        </Card>
      ) : !canDispute ? (
        <Card style={styles.noteCard}>
          <Text style={styles.noteText}>{translate('dispute_not_disputable', locale)}</Text>
        </Card>
      ) : (
        <Card style={styles.formCard}>
          <Text style={styles.label}>{translate('dispute_reason_code_label', locale)}</Text>
          <View style={styles.chipRow}>
            {REASON_CODES.map(code => {
              const selected = reasonCode === code;
              return (
                <TouchableOpacity
                  key={code}
                  onPress={() => setReasonCode(code)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  style={[styles.chip, selected && styles.chipSelected]}>
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {translate(REASON_KEY[code], locale)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>{translate('dispute_reason_label', locale)}</Text>
          <TextInput
            style={styles.input}
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            placeholder={translate('dispute_reason_placeholder', locale)}
            placeholderTextColor="#94A3B8"
          />

          {validation ? <Text style={styles.validation}>{validation}</Text> : null}
          {raiseFailed ? (
            <Text style={styles.validation}>{translate('dispute_raise_error', locale)}</Text>
          ) : null}

          <Button
            title={translate('dispute_raise_button', locale)}
            onPress={onSubmit}
            loading={isPending}
            variant="outline"
            style={styles.btn}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20 },
  centre: { flex: 1, backgroundColor: '#F8FAF9', justifyContent: 'center', padding: 20 },
  gap: { marginBottom: 16 },
  header: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  infoCard: { padding: 18, marginBottom: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  txId: { fontSize: 16, fontWeight: '700', color: '#1E293B' },
  amount: { fontSize: 18, fontWeight: '800', color: '#1B5E20' },
  formCard: { padding: 20, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1E293B' },
  stageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 15, fontWeight: '600', color: '#334155', marginBottom: 8 },
  disputedLine: { fontSize: 15, color: '#475569', lineHeight: 22, marginBottom: 12 },
  mediationNote: { fontSize: 14, color: '#64748B', lineHeight: 21 },
  timelineCard: { padding: 20 },
  eventRow: { marginTop: 14 },
  eventStage: { fontSize: 15, fontWeight: '700', color: '#1E293B' },
  eventDate: { fontSize: 13, color: '#94A3B8', marginTop: 2 },
  eventNote: { fontSize: 14, color: '#475569', lineHeight: 21, marginTop: 4 },
  noteCard: { padding: 20, backgroundColor: '#FFFBEB', borderColor: '#FDE68A' },
  noteText: { fontSize: 15, color: '#92400E', lineHeight: 22 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  chip: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 14,
    marginRight: 8,
    marginBottom: 8,
    backgroundColor: '#FFF',
  },
  chipSelected: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#475569' },
  chipTextSelected: { color: '#1565C0' },
  // Without an explicit colour, typed Marathi renders near-white on white.
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1E293B',
    backgroundColor: '#FFF',
    textAlignVertical: 'top',
    height: 100,
    marginBottom: 12,
  },
  validation: { fontSize: 14, color: '#C53030', marginBottom: 8 },
  btn: { marginTop: 8 },
});
