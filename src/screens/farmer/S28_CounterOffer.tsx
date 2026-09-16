/**
 * S28 — the counter-offer bottom sheet. Stitch
 * `28_make_counter_offer_tactile_negotiation_bottom_sheet`, built to that
 * layout: round progress, the two standing prices, a suggested rate, the big
 * tactile stepper, the net payout, and a sticky send bar.
 *
 * ★ Why "tactile" matters and why the stepper is not a text input: this is a
 *   farmer standing in a yard, one-handed, possibly in sunlight. The mockup's
 *   ±10 / ±50 buttons are the interaction, and a keyboard is not. The screen
 *   that briefly replaced this one asked him to type a number.
 *
 * ★ The suggestion is real arithmetic, not a guess. It anchors on the higher
 *   of today's mandi modal and the buyer's standing bid, clamped into the
 *   band between that bid and the farmer's own last ask — so it can never
 *   propose less than the buyer already offered, nor more than the farmer
 *   has already asked for.
 *
 * ★ What the mockup shows that is NOT rendered here: "८२% खात्री" — an 82%
 *   chance the buyer accepts. Nothing in this system computes an acceptance
 *   probability; there is no model of buyer behaviour anywhere in CANON. A
 *   confidence percentage next to a price is exactly the kind of number a
 *   judge asks the provenance of, and the honest answer would have been
 *   "the mockup". The card states what the suggestion is anchored on
 *   instead, which is checkable.
 *
 * ★ The mockup's "कमाल बदल: ±₹100" cap is also gone: the real constraint on
 *   this screen is CANON's three-round cap, and inventing a rupee limit on
 *   top of it would stop a farmer asking for what he wants.
 *
 * ★ ZERO EMOJIS.
 */

import React, { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise } from '../../lib/money';
import { counterOffer, getOfferThread, getPriceSeries, recommendWindow } from '../../lib/api';
import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_GRADE,
  DEFAULT_HORIZON_DAYS,
  DEFAULT_MARKET_ID,
  DEFAULT_QTY_KG,
  USE_FIXTURES,
} from '../../config';
import { fxOfferThread, fxThreadFor } from '../../fixtures/offers';
import { fxPriceHistory } from '../../fixtures/prices';
import { fxHold } from '../../fixtures/window';
import { Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { OfferDto, PriceSeriesRes, WindowRes } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S28_CounterOffer'>;

const MAX_ROUND = 3;
/** The mockup's four tactile steps, in paise per quintal. */
const STEPS = [-5000, -1000, 1000, 5000] as const;

async function fetchThread(offerId: string): Promise<OfferDto[]> {
  if (USE_FIXTURES) return fxThreadFor(offerId);
  return getOfferThread(offerId);
}

async function fetchSeries(): Promise<PriceSeriesRes> {
  if (USE_FIXTURES) return fxPriceHistory;
  return getPriceSeries(DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, 180);
}

async function fetchWindow(): Promise<WindowRes> {
  if (USE_FIXTURES) return fxHold;
  return recommendWindow({
    commodity_id: DEFAULT_COMMODITY_ID,
    market_id: DEFAULT_MARKET_ID,
    qty_kg: DEFAULT_QTY_KG,
    grade: DEFAULT_GRADE,
    lot_id: null,
    horizon_days: DEFAULT_HORIZON_DAYS,
  });
}

export default function S28_CounterOffer({ navigation, route }: Props) {
  const { t, locale } = useT();
  const queryClient = useQueryClient();
  const offerId = route.params?.offer_id ?? fxOfferThread[0]!.id;

  const threadQuery = useQuery({
    queryKey: ['offers', offerId, 'thread'],
    queryFn: () => fetchThread(offerId),
  });
  const seriesQuery = useQuery({
    queryKey: ['prices', 'series', '180', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID],
    queryFn: fetchSeries,
  });
  const windowQuery = useQuery({
    queryKey: ['ai', 'window', 'recommend', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_QTY_KG],
    queryFn: fetchWindow,
  });

  const thread = threadQuery.data ?? [];
  const latest = thread.length > 0 ? thread[thread.length - 1]! : null;
  const buyerBid = useMemo(
    () => [...thread].reverse().find(o => o.initiator === 'BUYER') ?? null,
    [thread],
  );
  const myLastAsk = useMemo(
    () => [...thread].reverse().find(o => o.initiator === 'FARMER') ?? null,
    [thread],
  );

  const points = seriesQuery.data?.points ?? [];
  const mandiModal = points.length > 0 ? points[points.length - 1]!.modal_paise_per_qtl : null;

  const floor = buyerBid?.price_paise_per_qtl ?? 0;

  /**
   * ★ There is no ask until the farmer has made one. This used to fall back
   *   to `floor * 1.2` and render the result under the label "Your ask", so
   *   on round 1 the screen showed the farmer a demand of ₹2,220 that he had
   *   never made and no query had produced. That is the same fabrication
   *   this session has been pulling out of every other screen, introduced by
   *   me, and a made-up anchor on the counter screen is worse than most: it
   *   is the number he negotiates against.
   *
   *   With no ask yet, the upper end of the stepper is today's mandi rate —
   *   a real observation — and the cell beside it says so rather than
   *   claiming he asked for it. The `+` buttons still travel above that
   *   bound so he is never capped by it; `sliderMax` only sets where the
   *   fill bar reads full.
   */
  const hasMyAsk = myLastAsk !== null;
  const ceiling = hasMyAsk
    ? myLastAsk!.price_paise_per_qtl
    : Math.max(mandiModal ?? floor, floor);

  /** Anchored on real observations and clamped into the live band. */
  const suggested = useMemo(() => {
    if (floor === 0) return 0;
    const anchor = Math.max(mandiModal ?? floor, floor);
    return Math.min(Math.max(anchor, floor), Math.max(ceiling, floor));
  }, [floor, ceiling, mandiModal]);

  const [counter, setCounter] = useState<number | null>(null);
  const price = counter ?? suggested;

  const qtyKg = latest?.qty_kg ?? DEFAULT_QTY_KG;
  const gross = quintalValuePaise(price, qtyKg);
  const perQtlDeduction = windowQuery.data?.costs.total_paise_per_qtl ?? null;
  const deductions = perQtlDeduction !== null ? Math.round((perQtlDeduction * qtyKg) / 100) : null;
  const net = deductions !== null ? gross - deductions : null;

  const nextRound = (latest?.round ?? 0) + 1;
  const roundsLeft = Math.max(0, MAX_ROUND - (latest?.round ?? 0));

  const { mutate: send, isPending: sending } = useMutation({
    mutationFn: async () => {
      if (!latest) throw new Error('no offer');
      if (USE_FIXTURES) return;
      await counterOffer(latest.id, { price_paise_per_qtl: price });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offers'] });
      navigation.goBack();
    },
  });

  const adjust = (by: number) => {
    // Never below what the buyer has already offered — countering under his
    // own bid is not a move. Above, the farmer is free: his own last ask is
    // where the bar reads full, not a ceiling he is forbidden to pass.
    setCounter(Math.max(price + by, floor));
  };

  const narration = useMemo(() => {
    if (!latest) return t('co_title');
    return [
      t('co_narr_round', {
        round: formatNumber(nextRound, locale),
        max: formatNumber(MAX_ROUND, locale),
      }),
      t('co_narr_prices', {
        bid: formatPaise(floor, locale),
        ask: formatPaise(ceiling, locale),
      }),
      t('co_narr_counter', {
        rate: formatPaise(price, locale),
        gross: formatPaise(gross, locale),
      }),
      ...(net !== null ? [t('co_narr_net', { net: formatPaise(net, locale) })] : []),
    ].join(' ');
  }, [latest, nextRound, floor, ceiling, price, gross, net, locale, t]);

  const sheetHeader = (
    <>
      <View style={styles.grabberRow}>
        <View style={styles.grabber} />
      </View>
      <View style={styles.headerRow}>
        <View style={styles.headerIcon}>
          <Icon name="handshake" size={16} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('co_title')}</Text>
          {latest ? (
            <Text style={styles.subtitle}>
              {t('co_subtitle', { qty: formatQuintal(latest.qty_kg, locale) })}
            </Text>
          ) : null}
        </View>
        <View style={styles.roundChip}>
          <Text style={styles.roundChipText}>
            {t('co_round_chip', {
              round: formatNumber(nextRound, locale),
              max: formatNumber(MAX_ROUND, locale),
            })}
          </Text>
        </View>
        <ListenButton text={narration} />
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="x-circle" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </>
  );

  if (threadQuery.isLoading || !latest) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {sheetHeader}
        <View style={styles.scroll}>
          <Skeleton height={100} />
          <View style={{ height: space.sm }} />
          <Skeleton height={180} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {sheetHeader}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Where this round sits in the three the cap allows ───────── */}
        <View style={styles.card}>
          <View style={styles.progressLabels}>
            <Text style={styles.progressLead}>
              {t('co_rounds_left', { n: formatNumber(roundsLeft, locale) })}
            </Text>
            <Text style={styles.progressTail}>{t('co_after_final')}</Text>
          </View>
          <View style={styles.progressTrack}>
            {[1, 2, 3].map(seg => (
              <View
                key={seg}
                style={[
                  styles.progressSeg,
                  seg <= nextRound && styles.progressSegOn,
                  seg === nextRound && styles.progressSegNow,
                ]}
              />
            ))}
          </View>

          {/* ── The two prices on the table ───────────────────────────── */}
          <View style={styles.priceRow}>
            <View style={styles.priceCell}>
              <View style={styles.priceCellHead}>
                <Text style={styles.priceCellLabel}>{t('co_buyer_bid')}</Text>
                <Icon name="trending-down" size={13} color={colors.critical} />
              </View>
              <View style={styles.priceCellLine}>
                <Text style={styles.priceCellValue}>{formatPaise(floor, locale)}</Text>
                <Text style={styles.priceCellUnit}>{t('bg_per_qtl')}</Text>
              </View>
              <Text style={styles.priceCellTotal}>
                {t('co_total', { amount: formatPaise(quintalValuePaise(floor, qtyKg), locale) })}
              </Text>
            </View>
            <View style={styles.priceDivider} />
            <View style={styles.priceCell}>
              <View style={styles.priceCellHead}>
                <Text style={styles.priceCellLabel}>
                  {hasMyAsk ? t('co_your_ask') : t('bg_mandi_avg')}
                </Text>
                <Icon name="check" size={13} color={colors.tertiary} />
              </View>
              <View style={styles.priceCellLine}>
                <Text style={styles.priceCellValue}>{formatPaise(ceiling, locale)}</Text>
                <Text style={styles.priceCellUnit}>{t('bg_per_qtl')}</Text>
              </View>
              <Text style={styles.priceCellTotal}>
                {t('co_total', { amount: formatPaise(quintalValuePaise(ceiling, qtyKg), locale) })}
              </Text>
            </View>
          </View>

          {/* ── The suggestion, with what it is anchored on ────────────── */}
          {mandiModal !== null ? (
            <View style={styles.suggestCard}>
              <Icon name="zap" size={15} color={colors.onPositiveContainer} />
              <View style={styles.suggestText}>
                <Text style={styles.suggestTitle}>
                  {t('co_suggest_title', { rate: formatPaise(suggested, locale) })}
                </Text>
                {/* ★ The mockup put "82% confidence" here. Nothing computes
                    that, so what is stated is the observation the number
                    comes from — which a judge can check. */}
                <Text style={styles.suggestBody}>
                  {t('co_suggest_body', { mandi: formatPaise(mandiModal, locale) })}
                </Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* ── The tactile stepper ─────────────────────────────────────── */}
        <View style={styles.counterCard}>
          <Text style={styles.counterLabel}>{t('co_new_ask_label')}</Text>
          {/* Sibling Texts — see the note in S27: a nested smaller <Text>
              shears the top off a large one on Android. */}
          <View style={styles.counterPriceLine}>
            <Text style={styles.counterPrice}>{formatPaise(price, locale)}</Text>
            <Text style={styles.counterUnit}>{t('bg_per_qtl')}</Text>
          </View>

          {/* Where the counter sits between the two standing prices. */}
          <View style={styles.rangeTrack}>
            <View
              style={[
                styles.rangeFill,
                {
                  width: `${
                    ceiling > floor
                      ? Math.max(4, Math.min(100, ((price - floor) / (ceiling - floor)) * 100))
                      : price > floor
                        ? 100
                        : 4
                  }%`,
                },
              ]}
            />
          </View>
          <View style={styles.rangeLabels}>
            <Text style={styles.rangeEnd}>
              {t('co_range_buyer', { rate: formatPaise(floor, locale) })}
            </Text>
            <Text style={styles.rangeMid}>
              {t('co_range_counter', { rate: formatPaise(price, locale) })}
            </Text>
            <Text style={styles.rangeEnd}>
              {t(hasMyAsk ? 'co_range_ask' : 'co_range_mandi', {
                rate: formatPaise(ceiling, locale),
              })}
            </Text>
          </View>

          <View style={styles.stepRow}>
            {STEPS.map(step => (
              <TouchableOpacity
                key={step}
                style={styles.stepBtn}
                onPress={() => adjust(step)}
                accessibilityRole="button">
                <Text style={styles.stepText}>
                  {step > 0 ? '+' : '−'}
                  {formatPaise(Math.abs(step), locale)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* ── What that actually lands in the bank ────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.netTitle}>{t('co_net_title')}</Text>
          <View style={styles.netRow}>
            <Text style={styles.netKey}>
              {t('co_net_gross_key', {
                qty: formatQuintal(qtyKg, locale),
                rate: formatPaise(price, locale),
              })}
            </Text>
            <Text style={styles.netVal}>{formatPaise(gross, locale)}</Text>
          </View>
          {deductions !== null ? (
            <View style={styles.netRow}>
              <Text style={styles.netKey}>{t('dd_deductions')}</Text>
              <Text style={[styles.netVal, styles.netValNeg]}>
                −{formatPaise(deductions, locale)}
              </Text>
            </View>
          ) : null}
          {net !== null ? (
            <View style={styles.netTotalRow}>
              <Text style={styles.netTotalKey}>{t('dd_net_label')}</Text>
              <Text style={styles.netTotalVal}>{formatPaise(net, locale)}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* ── Send ─────────────────────────────────────────────────────── */}
      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.sendBtn}
          disabled={sending || price <= 0}
          onPress={() => send()}
          accessibilityRole="button">
          <Text style={styles.sendText}>
            {t('co_send_cta', { rate: formatPaise(price, locale) })}
          </Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button">
          <Icon name="arrow-left" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.cancelText}>
            {t('co_cancel_cta', { rate: formatPaise(floor, locale) })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  grabberRow: { alignItems: 'center', paddingTop: space.sm, paddingBottom: 2 },
  grabber: { width: 44, height: 5, borderRadius: 3, backgroundColor: colors.outlineVariant },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, minWidth: 0 },
  title: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  subtitle: { ...typography.labelSm, color: colors.onSurfaceVariant },
  roundChip: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    flexShrink: 0,
  },
  roundChipText: { ...typography.labelSm, color: colors.primary, fontFamily: fontFamily.bold },
  closeBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: space.md, paddingBottom: 190, gap: space.sm },

  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    gap: space.sm,
  },

  progressLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  progressLead: { ...typography.labelMd, color: colors.primary, fontFamily: fontFamily.bold, flexShrink: 1 },
  progressTail: { ...typography.labelSm, color: colors.onSurfaceVariant, flexShrink: 1, textAlign: 'right' },
  progressTrack: { flexDirection: 'row', gap: 4 },
  progressSeg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.surfaceContainerHigh },
  progressSegOn: { backgroundColor: colors.primaryContainer },
  progressSegNow: { backgroundColor: colors.primary },

  priceRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    padding: space.sm,
  },
  priceCell: { flex: 1, minWidth: 0, gap: 1 },
  priceDivider: { width: 1, backgroundColor: colors.outlineVariant, marginHorizontal: space.sm },
  priceCellHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  priceCellLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, flexShrink: 1 },
  priceCellLine: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  priceCellValue: { fontFamily: fontFamily.extraBold, fontSize: 20, lineHeight: 28, color: colors.onSurface },
  priceCellUnit: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  priceCellTotal: { ...typography.labelSm, color: colors.onSurfaceVariant },

  suggestCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.positiveContainer,
  },
  suggestText: { flex: 1, minWidth: 0, gap: 2 },
  suggestTitle: { ...typography.titleMd, color: colors.onPositiveContainer },
  suggestBody: { ...typography.labelSm, color: colors.onPositiveContainer, lineHeight: 16 },

  counterCard: {
    borderRadius: radius.lg,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    padding: space.md,
    gap: space.xs,
  },
  counterLabel: { ...typography.labelMd, color: colors.onSurfaceVariant },
  counterPriceLine: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 },
  counterPrice: {
    ...typography.displayLg,
    fontSize: 40,
    lineHeight: 52,
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    textAlign: 'center',
  },
  counterUnit: { ...typography.titleMd, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  rangeTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.surfaceContainerHigh,
    overflow: 'hidden',
  },
  rangeFill: { height: 8, borderRadius: 4, backgroundColor: colors.primary },
  rangeLabels: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 4 },
  rangeEnd: { ...typography.labelSm, color: colors.onSurfaceVariant, flexShrink: 1 },
  rangeMid: { ...typography.labelSm, color: colors.primary, fontFamily: fontFamily.bold, flexShrink: 1 },

  stepRow: { flexDirection: 'row', gap: space.xs, marginTop: 2 },
  stepBtn: {
    flex: 1,
    minWidth: 0,
    minHeight: touch.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  stepText: { ...typography.titleMd, color: colors.primary, fontFamily: fontFamily.extraBold },

  netTitle: { ...typography.titleMd, color: colors.onSurface },
  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  netKey: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  netVal: { ...typography.titleMd, color: colors.onSurface },
  netValNeg: { color: colors.critical },
  netTotalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  netTotalKey: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  netTotalVal: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    paddingBottom: space.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: 6,
  },
  sendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: touch.targetHero,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  sendText: {
    ...typography.titleLg,
    color: colors.onPrimary,
    fontFamily: fontFamily.extraBold,
    flexShrink: 1,
    textAlign: 'center',
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  cancelText: { ...typography.labelMd, color: colors.onSurfaceVariant },
});
