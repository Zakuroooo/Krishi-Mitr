/**
 * S27 — live sauda negotiation. Stitch
 * `27_bargaining_live_sauda_negotiation`, built to that layout.
 *
 * ★ Why this file exists again. I deleted it earlier this session because
 *   its buyer was a string typed into the JSX — `Pune Trading Co` — and its
 *   prices were i18n literals. That was the right thing to be alarmed about
 *   and the wrong thing to do about it: the fabricated **data** was the
 *   problem, not the Stitch **design**. What replaced it was a plain list
 *   that matched nothing in the design system. This is the Stitch screen,
 *   with every number coming off `GET /offers/{id}/thread`.
 *
 * ★ The audit trail is the point of the screen and it is genuinely real:
 *   the thread endpoint returns the whole counter chain oldest-first, each
 *   round carrying its price, its initiator and its note. Rendering that is
 *   rendering the negotiation, not a picture of one.
 *
 * ★ What the mockup has that the contract does not: the buyer's name, his
 *   distance, and "98.4% On-Time". `OfferDto` carries `buyer_id` and nothing
 *   else, and there is no `GET /buyers/{id}` (blocker filed). The header
 *   keeps its shape and states the buyer the way the contract knows him
 *   rather than inventing a firm — and `on_time_payment_bps` *defaults to
 *   10000* in the schema, so showing that column would assert a perfect
 *   payment record for a buyer nobody has transacted with.
 *   TODO(akash): fill the header block when that endpoint lands.
 *
 * ★ The mockup's decision matrix compares the offer to a "farmgate
 *   baseline" nothing in this system computes. The comparison here is to
 *   today's mandi modal, which is a real observation, and it is labelled as
 *   that.
 *
 * ★ ZERO EMOJIS. ★ Loading, empty, error and data all render.
 */

import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { noteText } from '../../lib/offerNote';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise } from '../../lib/money';
import { formatTimeShort } from '../../lib/dates';
import { acceptOffer, getLots, getOfferThread, getPriceSeries, rejectOffer } from '../../lib/api';
import { DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, USE_FIXTURES } from '../../config';
import { fxOfferThread, fxThreadFor } from '../../fixtures/offers';
import { fxMyLots } from '../../fixtures/lots';
import { fxTx } from '../../fixtures/escrow';
import { fxPriceHistory } from '../../fixtures/prices';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { LotDto, OfferDto, PriceSeriesRes } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S27_Bargaining'>;

/** CANON §7.6 caps a negotiation at three rounds; past it the server returns
 * 409 MAX_ROUNDS. The screen reads the cap rather than discovering it. */
const MAX_ROUND = 3;

async function fetchThread(offerId: string): Promise<OfferDto[]> {
  if (USE_FIXTURES) return fxThreadFor(offerId);
  return getOfferThread(offerId);
}

async function fetchLots(): Promise<LotDto[]> {
  if (USE_FIXTURES) return fxMyLots;
  return getLots();
}

async function fetchSeries(): Promise<PriceSeriesRes> {
  if (USE_FIXTURES) return fxPriceHistory;
  return getPriceSeries(DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, 180);
}

export default function S27_Bargaining({ navigation, route }: Props) {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const offerId = route.params?.offer_id ?? fxOfferThread[0]!.id;

  const threadQuery = useQuery({
    queryKey: ['offers', offerId, 'thread'],
    queryFn: () => fetchThread(offerId),
  });
  const lotsQuery = useQuery({ queryKey: ['lots'], queryFn: fetchLots });
  const seriesQuery = useQuery({
    queryKey: ['prices', 'series', '180', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID],
    queryFn: fetchSeries,
  });

  const thread = threadQuery.data ?? [];
  /** Oldest first by contract, so the last entry is the live one. */
  const latest = thread.length > 0 ? thread[thread.length - 1]! : null;
  /** The farmer's own most recent ask, which is what "Asking Price" means. */
  const myLastAsk = useMemo(
    () => [...thread].reverse().find(o => o.initiator === 'FARMER') ?? null,
    [thread],
  );

  const lotId = latest?.lots[0]?.lot_id ?? null;
  const lot = (lotsQuery.data ?? []).find(l => l.id === lotId) ?? null;

  const points = seriesQuery.data?.points ?? [];
  const mandiModal = points.length > 0 ? points[points.length - 1]!.modal_paise_per_qtl : null;

  /** Waiting on the farmer only when the buyer moved last and it is open. */
  const awaitingFarmer = latest !== null && latest.initiator === 'BUYER' && latest.status === 'OPEN';
  const atLastRound = (latest?.round ?? 0) >= MAX_ROUND;

  const { mutate: act, isPending: acting } = useMutation({
    mutationFn: async (action: 'accept' | 'reject') => {
      if (!latest) throw new Error('no offer');
      if (action === 'reject') {
        if (!USE_FIXTURES) await rejectOffer(latest.id);
        return null;
      }
      return USE_FIXTURES
        ? { ...fxTx, offer_id: latest.id, qty_kg: latest.qty_kg }
        : await acceptOffer(latest.id);
    },
    onSuccess: tx => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      if (tx) navigation.navigate('S30_DealDone', { tx });
      else navigation.goBack();
    },
  });

  const narration = useMemo(() => {
    if (!latest) return t('bg_title');
    const parts = [
      t('bg_narr_round', {
        round: formatNumber(latest.round, locale),
        max: formatNumber(MAX_ROUND, locale),
      }),
      t('bg_narr_offer', {
        rate: formatPaise(latest.price_paise_per_qtl, locale),
        total: formatPaise(quintalValuePaise(latest.price_paise_per_qtl, latest.qty_kg), locale),
        qty: formatQuintal(latest.qty_kg, locale),
      }),
    ];
    if (mandiModal !== null) {
      const diff = latest.price_paise_per_qtl - mandiModal;
      parts.push(
        t(diff >= 0 ? 'bg_narr_vs_mandi_above' : 'bg_narr_vs_mandi_below', {
          mandi: formatPaise(mandiModal, locale),
          diff: formatPaise(Math.abs(diff), locale),
        }),
      );
    }
    if (atLastRound) parts.push(t('bg_narr_last_round'));
    return parts.join(' ');
  }, [latest, mandiModal, atLastRound, locale, t]);

  // ── Header, present in every state ────────────────────────────────────
  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('back_button')}>
        <Icon name="arrow-left" size={20} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        {/* The mockup's "Pune Trading Co · 45km away · 98.4% On-Time" —
            the layout, with what the contract actually knows in it. */}
        <Text style={styles.headerTitle}>{t('chat_from_buyer')}</Text>
        <Text style={styles.headerSub}>{t('bg_header_sub')}</Text>
      </View>
      {latest ? (
        <View style={[styles.roundChip, atLastRound && styles.roundChipFinal]}>
          <Text style={[styles.roundChipText, atLastRound && styles.roundChipTextFinal]}>
            {atLastRound
              ? t('bg_round_final', { round: formatNumber(latest.round, locale) })
              : t('bg_round_of', {
                  round: formatNumber(latest.round, locale),
                  max: formatNumber(MAX_ROUND, locale),
                })}
          </Text>
        </View>
      ) : null}
      <ListenButton text={narration} />
    </View>
  );

  if (threadQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={90} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  if (threadQuery.error && thread.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ErrorState message={t('offers_fetch_error')} onRetry={() => threadQuery.refetch()} />
      </View>
    );
  }

  if (!latest) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('bg_empty_title')}</Text>
          <Text style={styles.emptyBody}>{t('bg_empty_body')}</Text>
        </View>
      </View>
    );
  }

  const latestTotal = quintalValuePaise(latest.price_paise_per_qtl, latest.qty_kg);
  const vsMandi = mandiModal !== null ? latest.price_paise_per_qtl - mandiModal : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── The lot under negotiation ───────────────────────────────── */}
        <View style={styles.lotBand}>
          <View style={styles.lotIcon}>
            <Icon name="box" size={16} color={colors.primary} />
          </View>
          <View style={styles.lotText}>
            <Text style={styles.lotTitle}>
              {t('bg_lot_line', {
                qty: formatQuintal(latest.qty_kg, locale),
                grade: lot ? t(`lot_grade_${lot.grade.toLowerCase()}`) : '',
              })}
            </Text>
            <Text style={styles.lotSub}>{t('home_market_name')}</Text>
          </View>
        </View>

        {/* ── Your ask against today's mandi ──────────────────────────── */}
        <View style={styles.statRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('bg_your_ask')}</Text>
            {/* Sibling Texts, same reason as the rate rows below: a nested
                smaller <Text> takes over the line metrics on Android and
                shears the top off the number. */}
            <View style={styles.statLine}>
              <Text style={styles.statValue}>
                {myLastAsk ? formatPaise(myLastAsk.price_paise_per_qtl, locale) : '—'}
              </Text>
              <Text style={styles.statUnit}>{t('bg_per_qtl')}</Text>
            </View>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('bg_mandi_avg')}</Text>
            <View style={styles.statLine}>
              <Text style={[styles.statValue, styles.statValueMandi]}>
                {mandiModal !== null ? formatPaise(mandiModal, locale) : '—'}
              </Text>
              <Text style={styles.statUnit}>{t('bg_per_qtl')}</Text>
            </View>
          </View>
        </View>

        {/* ── The audit trail. Every row is a real round. ─────────────── */}
        <View style={styles.trailHead}>
          <Icon name="message-circle" size={16} color={colors.onSurfaceVariant} />
          <Text style={styles.trailHeadText}>{t('bg_audit_title')}</Text>
        </View>

        {thread.map(round => {
          const mine = round.initiator === 'FARMER';
          const isLatest = round.id === latest.id;
          const live = isLatest && awaitingFarmer;
          const note = noteText(round.note, t);
          return (
            <View key={round.id} style={[styles.roundCard, live && styles.roundCardLive]}>
              {live ? (
                <View style={styles.awaitRibbon}>
                  <Icon name="zap" size={12} color={colors.onPrimary} />
                  <Text style={styles.awaitRibbonText}>{t('bg_awaiting_you')}</Text>
                </View>
              ) : null}

              <View style={styles.roundTop}>
                <View style={[styles.avatar, mine && styles.avatarMine]}>
                  <Icon
                    name={mine ? 'leaf' : 'building'}
                    size={14}
                    color={mine ? colors.onPrimary : colors.primary}
                  />
                </View>
                <View style={styles.roundWho}>
                  <Text style={styles.roundName}>
                    {mine ? t('chat_from_you') : t('chat_from_buyer')}
                  </Text>
                  <Text style={styles.roundMeta}>
                    {t('bg_round_n', { round: formatNumber(round.round, locale) })} ·{' '}
                    {formatTimeShort(round.created_at, locale)}
                  </Text>
                </View>
                <View style={styles.statusChip}>
                  <Text style={styles.statusChipText}>
                    {t(mine ? 'bg_tag_farmer_counter' : 'bg_tag_buyer_bid')}
                  </Text>
                </View>
              </View>

              <View style={styles.roundFigures}>
                <View style={styles.roundFigureCol}>
                  <Text style={styles.roundFigureLabel}>{t('bg_rate_label')}</Text>
                  {/* ★ Two sibling Texts, not one with a nested unit. On
                      Android a <Text> that wraps a smaller nested <Text>
                      takes its line metrics from the nested one, and a 22px
                      price inside an 11px unit had its top half sheared off
                      on device. Baseline-aligned in a row instead. */}
                  <View style={styles.rateLine}>
                    <Text style={[styles.roundRate, mine && styles.roundRateMine]}>
                      {formatPaise(round.price_paise_per_qtl, locale)}
                    </Text>
                    <Text style={styles.roundRateUnit}>{t('bg_per_qtl')}</Text>
                  </View>
                </View>
                <View style={styles.roundFigureColRight}>
                  <Text style={styles.roundFigureLabel}>{t('bg_lot_total_label')}</Text>
                  <Text style={styles.roundTotal}>
                    {formatPaise(quintalValuePaise(round.price_paise_per_qtl, round.qty_kg), locale)}
                  </Text>
                </View>
              </View>

              {note ? (
                <View style={styles.noteBox}>
                  <Icon name="message-circle" size={13} color={colors.onSurfaceVariant} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ) : null}
            </View>
          );
        })}

        {/* ── What accepting is worth ─────────────────────────────────── */}
        <View style={styles.matrixCard}>
          <View style={styles.matrixHead}>
            <Icon name="clipboard" size={15} color={colors.onSurface} />
            <Text style={styles.matrixTitle}>{t('bg_matrix_title')}</Text>
          </View>

          <View style={styles.matrixRow}>
            <View style={styles.matrixCell}>
              <Text style={styles.matrixCellLabel}>{t('bg_matrix_payout')}</Text>
              <Text style={styles.matrixCellValue}>{formatPaise(latestTotal, locale)}</Text>
              <Text style={styles.matrixCellNote}>
                {t('bg_matrix_payout_note', {
                  qty: formatQuintal(latest.qty_kg, locale),
                  rate: formatPaise(latest.price_paise_per_qtl, locale),
                })}
              </Text>
            </View>
            {/* ★ Against today's mandi modal — a real observation — not the
                mockup's "farmgate baseline", which nothing computes.
                ★ The tint follows the sign. It was green unconditionally, so
                an offer *below* today's rate rendered "−₹204" in red on a
                success-green card — the colour saying the opposite of the
                number, on the one comparison a farmer uses to decide. */}
            {vsMandi !== null ? (
              <View
                style={[
                  styles.matrixCell,
                  vsMandi >= 0 ? styles.matrixCellGain : styles.matrixCellLoss,
                ]}>
                <Text style={styles.matrixCellLabel}>{t('bg_matrix_vs_mandi')}</Text>
                <Text
                  style={[
                    styles.matrixCellValue,
                    vsMandi >= 0 ? styles.matrixGain : styles.matrixLoss,
                  ]}>
                  {vsMandi >= 0 ? '+' : '−'}
                  {formatPaise(Math.abs(vsMandi), locale)}
                </Text>
                <Text style={styles.matrixCellNote}>
                  {t('bg_matrix_vs_mandi_note', {
                    mandi: formatPaise(mandiModal!, locale),
                  })}
                </Text>
              </View>
            ) : null}
          </View>

          <Text style={styles.matrixFoot}>{t('bg_matrix_escrow_note')}</Text>
        </View>
      </ScrollView>

      {/* ── The three moves CANON allows ──────────────────────────────── */}
      {awaitingFarmer ? (
        <View style={styles.dock}>
          <TouchableOpacity
            style={styles.acceptBtn}
            disabled={acting}
            onPress={() => act('accept')}
            accessibilityRole="button">
            <Icon name="check-circle" size={18} color={colors.onPrimary} />
            <Text style={styles.acceptText}>
              {t('bg_accept_cta', {
                rate: formatPaise(latest.price_paise_per_qtl, locale),
                total: formatPaise(latestTotal, locale),
              })}
            </Text>
          </TouchableOpacity>

          {/* Disabled from `round`, not by letting the server 409 after the
              farmer has typed a price. */}
          <TouchableOpacity
            style={[styles.counterBtn, atLastRound && styles.counterBtnDisabled]}
            disabled={atLastRound || acting}
            onPress={() => navigation.navigate('S28_CounterOffer', { offer_id: latest.id })}
            accessibilityRole="button">
            <Icon
              name="edit"
              size={16}
              color={atLastRound ? colors.outline : colors.primary}
            />
            <Text style={[styles.counterText, atLastRound && styles.counterTextDisabled]}>
              {atLastRound ? t('bg_counter_spent') : t('bg_counter_cta')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.declineBtn}
            disabled={acting}
            onPress={() => act('reject')}
            accessibilityRole="button">
            <Text style={styles.declineText}>{t('bg_decline_cta')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.dock}>
          <Text style={styles.waitingLine}>{t('chat_awaiting_them')}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
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
  headerText: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  roundChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  roundChipFinal: { backgroundColor: colors.criticalContainer },
  roundChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  roundChipTextFinal: { color: colors.onCriticalContainer, fontFamily: fontFamily.bold },

  /* Clears the three-button dock, which is taller than it looks. */
  scroll: { padding: space.md, paddingBottom: 200, gap: space.sm },

  lotBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  lotIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotText: { flex: 1, minWidth: 0 },
  lotTitle: { ...typography.titleMd, color: colors.onSurface },
  lotSub: { ...typography.labelSm, color: colors.onSurfaceVariant },

  statRow: { flexDirection: 'row', gap: space.sm },
  statCard: {
    flex: 1,
    minWidth: 0,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 2 },
  statValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    lineHeight: 26,
    color: colors.primary,
  },
  statValueMandi: { color: colors.tertiary },
  statUnit: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  trailHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs },
  trailHeadText: { ...typography.labelMd, color: colors.onSurfaceVariant, flex: 1 },

  roundCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    gap: space.xs,
    overflow: 'hidden',
  },
  roundCardLive: { borderWidth: 2, borderColor: colors.primaryContainer },
  awaitRibbon: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginTop: -space.md,
    marginRight: -space.md,
    marginBottom: 2,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  awaitRibbonText: { ...typography.labelSm, color: colors.onPrimary, fontFamily: fontFamily.bold },

  roundTop: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarMine: { backgroundColor: colors.primaryContainer },
  roundWho: { flex: 1, minWidth: 0 },
  roundName: { ...typography.titleMd, color: colors.onSurface },
  roundMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },
  statusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  statusChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },

  roundFigures: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginTop: 2,
    justifyContent: 'space-between',
    gap: space.sm,
  },
  roundFigureCol: { flex: 1, minWidth: 0 },
  roundFigureColRight: { alignItems: 'flex-end' },
  roundFigureLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  /* ★ Explicit lineHeight. `headlineLg` sets 28 for a 22px face, which is
     tight enough that Devanagari ascenders and the ₹ glyph clipped into the
     label above them on device. */
  roundRate: {
    fontFamily: fontFamily.extraBold,
    fontSize: 22,
    lineHeight: 32,
    color: colors.onSurface,
  },
  roundRateMine: { color: colors.primary },
  rateLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  roundRateUnit: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  roundTotal: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },

  noteBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: space.sm,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
  },
  noteText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 18 },

  matrixCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    gap: space.sm,
    marginTop: space.xs,
  },
  matrixHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  matrixTitle: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  matrixRow: { flexDirection: 'row', gap: space.sm },
  matrixCell: {
    flex: 1,
    minWidth: 0,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    gap: 1,
  },
  matrixCellGain: { backgroundColor: colors.positiveContainer },
  matrixCellLoss: { backgroundColor: colors.criticalContainer },
  matrixCellLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  /* I16's habit: the two figures render at one size, so neither reads as
     the footnote of the other. */
  matrixCellValue: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  matrixGain: { color: colors.onPositiveContainer },
  matrixLoss: { color: colors.onCriticalContainer },
  matrixCellNote: { ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 15 },
  matrixFoot: { ...typography.labelSm, color: colors.onSurfaceVariant, lineHeight: 16 },

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
  emptyTitle: { ...typography.titleLg, color: colors.onSurface, textAlign: 'center' },
  emptyBody: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 19,
  },

  /* ★ Trimmed. Three stacked full-height buttons took roughly a third of
     the screen, which pushed the offer history — the thing the farmer came
     to read — behind them. The accept button stays the biggest target
     because it is the primary action; the other two step down. */
  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: space.xs,
  },
  acceptBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touch.targetMin,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  acceptText: {
    ...typography.titleMd,
    color: colors.onPrimary,
    fontFamily: fontFamily.extraBold,
    flexShrink: 1,
    textAlign: 'center',
  },
  counterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 42,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  counterBtnDisabled: { borderColor: colors.outlineVariant },
  counterText: { ...typography.labelMd, color: colors.primary },
  counterTextDisabled: { color: colors.outline },
  declineBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  declineText: { ...typography.labelSm, color: colors.critical },
  waitingLine: { ...typography.labelMd, color: colors.onSurfaceVariant, textAlign: 'center' },
});
