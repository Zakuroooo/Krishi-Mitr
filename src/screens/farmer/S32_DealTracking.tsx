/**
 * S32 — where a deal has actually got to, from the append-only event stream.
 * Stitch `32_deal_tracking_live_escrow_and_logistics`.
 *
 * ★ What this replaced: six invented milestones with invented times ("आज
 *   १२:३९ PM", "थेट GPS"), a hardcoded "₹76,000" held in escrow, a reference
 *   "MS-8492", and a farmer called "Rambhau Patil" at "Lasalgaon" — passed as
 *   literal arguments to the translation function. No query, no transaction
 *   id, no way for any of it to have been true.
 *
 * ★ I5 is the whole design of this screen. `escrow_events` is append-only, so
 *   the timeline is rendered **from the event stream**, never from
 *   `tx.status` and a fixed list of steps. The current status is just the
 *   last event's `to_status`, and every row on screen is a row that exists in
 *   that table. A step this app draws but the ledger does not contain would
 *   be exactly the fabrication the append-only table exists to prevent — and
 *   a judge asking "where did that event come from" is the question CANON
 *   §6.4 is written to be able to answer.
 *
 * ★ Nothing is invented to fill the gaps. There is no GPS trace on an
 *   `EscrowEvent`, no truck, no driver, no ETA: the fields are
 *   `from_status`, `to_status`, `actor_user_id`, `note`, `created_at`. Those
 *   are what render.
 *
 * ★ TODO(akash): `tx_id` arrives on the route because there is no `GET /tx`
 *   and no `tx_id` on `OfferDto` — see `docs/BLOCKERS.md`. Reached without
 *   one, the screen says so rather than fetching a guessed id.
 *
 * ★ ZERO EMOJIS. ★ Loading, empty, error and data all render.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatPaise, formatQuintal } from '../../lib/money';
import { formatDateShort } from '../../lib/dates';
import { getEscrowEvents, getTransaction } from '../../lib/api';
import { USE_FIXTURES } from '../../config';
import { fxEscrowEvents, fxTx } from '../../fixtures/escrow';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import { EscrowMilestones } from '../../components/farmer/EscrowMilestones';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { EscrowEvent, TxDto, TxStatus } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S32_DealTracking'>;

/** One dictionary key per FSM state. A status with no sentence would render
 * its own enum name at a farmer, so the map is exhaustive by type. */
const STATUS_KEY: Record<TxStatus, string> = {
  CREATED: 'tr_status_created',
  ESCROW_HELD: 'tr_status_escrow_held',
  DISPATCHED: 'tr_status_dispatched',
  DELIVERED: 'tr_status_delivered',
  RELEASED: 'tr_status_released',
  DISPUTED: 'tr_status_disputed',
  REFUNDED: 'tr_status_refunded',
  CANCELLED: 'tr_status_cancelled',
};

const STATUS_ICON: Record<TxStatus, Parameters<typeof Icon>[0]['name']> = {
  CREATED: 'handshake',
  ESCROW_HELD: 'lock',
  DISPATCHED: 'truck',
  DELIVERED: 'building',
  RELEASED: 'check-circle',
  DISPUTED: 'info',
  REFUNDED: 'trending-down',
  CANCELLED: 'info',
};

async function fetchTx(txId: string): Promise<TxDto> {
  if (USE_FIXTURES) return fxTx;
  return getTransaction(txId);
}

async function fetchEvents(txId: string): Promise<EscrowEvent[]> {
  if (USE_FIXTURES) return fxEscrowEvents;
  return getEscrowEvents(txId);
}

export default function S32_DealTracking({ navigation, route }: Props) {
  const { t, locale } = useT();
  const txId = route.params?.tx_id ?? null;

  const txQuery = useQuery({
    queryKey: ['tx', txId],
    queryFn: () => fetchTx(txId!),
    enabled: txId !== null,
  });
  const eventsQuery = useQuery({
    queryKey: ['tx', txId, 'events'],
    queryFn: () => fetchEvents(txId!),
    enabled: txId !== null,
  });

  const tx = txQuery.data ?? null;
  const events = eventsQuery.data ?? [];
  /** I5: the status is the last event's `to_status`. `tx.status` agrees, and
   *  where it would not, the ledger is the one that is right. */
  const current = events.length > 0 ? events[events.length - 1]!.to_status : tx?.status ?? null;

  const narration = tx
    ? [
        t('tr_narr_status', { status: current ? t(STATUS_KEY[current]) : '' }),
        t('tr_narr_amount', { amount: formatPaise(tx.net_paise, locale) }),
      ].join(' ')
    : t('tr_no_tx_title');

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('back_button')}>
        <Icon name="arrow-left" size={20} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerCenter}>
        <Text style={styles.headerTitle}>{t('tr_title')}</Text>
        {tx ? <Text style={styles.headerSub}>{t('tr_ref', { id: tx.id })}</Text> : null}
      </View>
      <ListenButton text={narration} />
    </View>
  );

  /* Reached with no transaction to read. Not an error — see the file header
     and the blocker: until `GET /tx` exists, the id is only knowable at the
     moment of accepting. Guessing one would 404. */
  if (txId === null) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="info" size={24} color={colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>{t('tr_no_tx_title')}</Text>
          <Text style={styles.emptyBody}>{t('tr_no_tx_body')}</Text>
        </View>
      </View>
    );
  }

  if (txQuery.isLoading || eventsQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={120} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  if (txQuery.error && !tx) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ErrorState message={t('tr_fetch_error')} onRetry={() => txQuery.refetch()} />
      </View>
    );
  }

  if (!tx) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('tr_no_tx_title')}</Text>
        </View>
      </View>
    );
  }

  const isSettled = current === 'RELEASED';

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Where the money is right now ────────────────────────────── */}
        <View style={[styles.heroCard, isSettled && styles.heroCardSettled]}>
          <View style={styles.heroTop}>
            <Icon
              name={current ? STATUS_ICON[current] : 'info'}
              size={18}
              color={colors.onPositiveContainer}
            />
            <Text style={styles.heroStatus}>{current ? t(STATUS_KEY[current]) : ''}</Text>
          </View>
          <Text style={styles.heroValue}>{formatPaise(tx.net_paise, locale)}</Text>
          <Text style={styles.heroSub}>
            {t('tr_hero_sub', {
              rate: formatPaise(tx.price_paise_per_qtl, locale),
              qty: formatQuintal(tx.qty_kg, locale),
            })}
          </Text>
        </View>

        {/* ── Where it is, at a glance ────────────────────────────────
            The ledger below is the record; this is the answer to "what am I
            waiting for", which is what a farmer opens this screen to ask. */}
        {current ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t('dd_progress_title')}</Text>
            <EscrowMilestones status={current} />
          </View>
        ) : null}

        {/* ── The ledger. Every row is a row in `escrow_events` (I5). ─── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tr_timeline_title')}</Text>
          <Text style={styles.cardSub}>{t('tr_timeline_sub')}</Text>

          {events.length === 0 ? (
            <Text style={styles.emptyBody}>{t('tr_timeline_empty')}</Text>
          ) : (
            events.map((e, i) => {
              const last = i === events.length - 1;
              return (
                <View key={e.id} style={styles.eventRow}>
                  <View style={styles.eventRail}>
                    <View style={[styles.eventDot, last && styles.eventDotLast]}>
                      <Icon
                        name={STATUS_ICON[e.to_status]}
                        size={12}
                        color={last ? colors.onPrimary : colors.primary}
                      />
                    </View>
                    {last ? null : <View style={styles.eventLine} />}
                  </View>
                  <View style={styles.eventText}>
                    <Text style={styles.eventTitle}>{t(STATUS_KEY[e.to_status])}</Text>
                    <Text style={styles.eventTime}>
                      {formatDateShort(e.created_at.slice(0, 10), locale, '')}
                    </Text>
                    {e.note?.trim() ? <Text style={styles.eventNote}>{e.note}</Text> : null}
                  </View>
                </View>
              );
            })
          )}
        </View>

        {isSettled ? (
          <TouchableOpacity
            style={styles.cta}
            onPress={() => navigation.navigate('S33_Settled', { tx_id: tx.id })}
            accessibilityRole="button">
            <Text style={styles.ctaText}>{t('tr_settled_cta')}</Text>
            <Icon name="arrow-right" size={18} color={colors.onPrimary} />
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xl + 8,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  heroCard: {
    gap: 2,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  heroCardSettled: { backgroundColor: colors.positiveContainer, borderColor: colors.tertiary },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatus: { ...typography.labelMd, color: colors.onPositiveContainer, flex: 1 },
  heroValue: {
    ...typography.displayLg,
    color: colors.onSurface,
    fontFamily: fontFamily.extraBold,
  },
  heroSub: { ...typography.labelSm, color: colors.onSurfaceVariant },

  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: space.xs,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface },
  cardSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginBottom: space.xs },

  eventRow: { flexDirection: 'row', gap: space.sm },
  eventRail: { alignItems: 'center', width: 26 },
  eventDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventDotLast: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  eventLine: { flex: 1, width: 2, minHeight: 14, backgroundColor: colors.outlineVariant },
  eventText: { flex: 1, minWidth: 0, paddingBottom: space.sm },
  eventTitle: { ...typography.titleMd, color: colors.onSurface },
  eventTime: { ...typography.labelSm, color: colors.onSurfaceVariant },
  eventNote: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    margin: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { ...typography.titleLg, color: colors.onSurface, textAlign: 'center' },
  emptyBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  ctaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
});
