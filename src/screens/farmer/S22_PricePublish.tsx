/**
 * S22 — set the asking price and publish. Stitch screen 22
 * (`22_price_publish_fair_market_slider_escrow_listing`).
 *
 * ★ Rebuilt. The previous version had four separate faults a farmer hit at
 *   once:
 *
 *   - **The slider could not be moved.** It was a plain `View` with no touch
 *     handling anywhere; the thumb position was derived from state that only
 *     the ±₹10/₹50 buttons could change, and the default sat at exactly the
 *     midpoint of its range, so it read as painted on. It is now a real
 *     control with a `PanResponder` — drag it, or use the buttons.
 *
 *   - **It overflowed.** Four stepper buttons, a 36px price and a unit label
 *     were in one non-wrapping row. The price now has its own line and the
 *     steppers sit under it, so nothing depends on the device being wide.
 *
 *   - **It rendered two languages at once, always.** Not a stray string: the
 *     design had `priceCardTitle` *and* `priceCardTitleMr` as separate
 *     elements, and the publish button read "Publish Lot to Marketplace ·
 *     माल विक्रीसाठी टाका". A farmer who picked English got English and
 *     Marathi stacked. Every string now resolves in one language.
 *
 *   - **Its numbers were invented.** A hardcoded 850/1000 score, a "Fair
 *     Value Corridor ₹2,050–₹2,150", "7 Verified Traders actively bidding …
 *     within 15 minutes", a "+₹1,800 freight aid", and lot text with the
 *     ellipsis typed into the literal ("Gavran Red Oni…", "Rambhau Pat…").
 *     All gone.
 *
 * ★ What it shows instead is real: the lot from `GET /lots/{id}`, today's
 *   modal/low/high from the same price series the Market tab reads, and the
 *   deduction total from the same window response S9 and S10 read — so the
 *   net on this screen cannot disagree with the net on those.
 *
 * ★ I1: the price is held as integer paise per quintal and only formatted at
 *   the render edge.
 */

import React, { useMemo, useRef, useState } from 'react';
import {
  PanResponder,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { getLot, getPriceSeries, recommendWindow } from '../../lib/api';
import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_GRADE,
  DEFAULT_HORIZON_DAYS,
  DEFAULT_LOT_ID,
  DEFAULT_MARKET_ID,
  DEFAULT_QTY_KG,
  USE_FIXTURES,
} from '../../config';
import { fxLotListed } from '../../fixtures/lots';
import { fxPriceHistory } from '../../fixtures/prices';
import { fxHold } from '../../fixtures/window';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S22_PricePublish'>;

/** ₹10 and ₹50 per quintal, in paise. */
const STEP_SMALL = 1000;
const STEP_LARGE = 5000;

async function fetchLot(lotId: string) {
  if (USE_FIXTURES) return fxLotListed;
  return getLot(lotId);
}
async function fetchSeries() {
  if (USE_FIXTURES) return fxPriceHistory;
  return getPriceSeries(DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, 180);
}
async function fetchVerdict() {
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

export default function S22_PricePublish({ route, navigation }: Props) {
  const { t, locale } = useT();
  const lotId = route.params?.lot_id ?? DEFAULT_LOT_ID;

  const lotQuery = useQuery({ queryKey: ['lots', lotId], queryFn: () => fetchLot(lotId) });
  const seriesQuery = useQuery({
    queryKey: ['prices', 'series', '180', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID],
    queryFn: fetchSeries,
  });
  // Same key as S9/S10, so the deduction total here is the one they show.
  const windowQuery = useQuery({
    queryKey: ['ai', 'window', 'recommend', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_QTY_KG],
    queryFn: fetchVerdict,
  });

  const points = seriesQuery.data?.points ?? [];
  const today = points.length > 0 ? points[points.length - 1] : undefined;

  /** The slider spans today's observed low–high, widened by 10% each way so a
   * farmer can still ask above the high — it is his price, not a cap. */
  const bounds = useMemo(() => {
    if (!today) return null;
    const pad = Math.round((today.max_paise_per_qtl - today.min_paise_per_qtl) * 0.1) || 5000;
    return { min: Math.max(0, today.min_paise_per_qtl - pad), max: today.max_paise_per_qtl + pad };
  }, [today]);

  const [askingPaise, setAskingPaise] = useState<number | null>(null);
  const asking = askingPaise ?? today?.modal_paise_per_qtl ?? null;

  const [dispatchMode, setDispatchMode] = useState<'farmgate' | 'yard'>('farmgate');
  const [splitAllowed, setSplitAllowed] = useState(false);

  const [trackWidth, setTrackWidth] = useState(0);
  const trackWidthRef = useRef(0);
  const boundsRef = useRef(bounds);
  boundsRef.current = bounds;

  /** The drag itself. Position on the track maps linearly onto the range, and
   * is rounded to whole rupees so the number under the thumb is one a farmer
   * would actually say out loud. */
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: e => setFromX(e.nativeEvent.locationX),
        onPanResponderMove: (e, gesture) => {
          const w = trackWidthRef.current;
          if (w <= 0) return;
          // `moveX` is screen-relative; locationX only holds for the grant.
          setFromX(Math.max(0, Math.min(w, gesture.moveX - trackLeftRef.current)));
        },
      }),
    // setFromX and the refs are stable for the life of the screen.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const trackLeftRef = useRef(0);

  function setFromX(x: number) {
    const w = trackWidthRef.current;
    const b = boundsRef.current;
    if (w <= 0 || !b) return;
    const ratio = Math.max(0, Math.min(1, x / w));
    const raw = b.min + ratio * (b.max - b.min);
    setAskingPaise(Math.round(raw / 100) * 100); // whole rupees
  }

  const nudge = (deltaPaise: number) => {
    const b = boundsRef.current;
    setAskingPaise(prev => {
      const base = prev ?? today?.modal_paise_per_qtl ?? 0;
      const next = base + deltaPaise;
      if (!b) return next;
      return Math.max(b.min, Math.min(b.max, next));
    });
  };

  if (lotQuery.isLoading || seriesQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.scroll}>
          <Skeleton height={90} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  if ((lotQuery.error && !lotQuery.data) || !today || !bounds || asking === null) {
    return (
      <ErrorState
        message={t('lots_fetch_error')}
        onRetry={() => {
          void lotQuery.refetch();
          void seriesQuery.refetch();
        }}
      />
    );
  }

  const lot = lotQuery.data;
  const qtl = lot ? toQuintal(lot.qty_kg) : toQuintal(DEFAULT_QTY_KG);
  const gross = asking * qtl;
  const perQtlDeduction = windowQuery.data?.costs.total_paise_per_qtl ?? null;
  const deductions = perQtlDeduction !== null ? perQtlDeduction * qtl : null;
  const net = deductions !== null ? gross - deductions : null;

  const pct = ((asking - bounds.min) / (bounds.max - bounds.min)) * 100;
  const modal = today.modal_paise_per_qtl;
  const diff = asking - modal;

  const rangeState =
    asking > today.max_paise_per_qtl
      ? 'above'
      : asking < today.min_paise_per_qtl
        ? 'below'
        : 'in';

  /* ★ The screen where a farmer sets his own asking price, and it had no
     speaker. It reads back what he has set, what the whole lot comes to,
     what the deductions leave him, and how his ask sits against today's
     mandi range — which is the judgement the screen exists to support. */
  const narration = [
    t('pp_narr_ask', {
      rate: formatPaise(asking, locale),
      qty: formatNumber(qtl, locale),
      gross: formatPaise(gross, locale),
    }),
    ...(net !== null
      ? [t('pp_narr_net', { net: formatPaise(net, locale) })]
      : []),
    t(
      rangeState === 'above'
        ? 'pp_narr_above'
        : rangeState === 'below'
          ? 'pp_narr_below'
          : 'pp_narr_in',
      { modal: formatPaise(modal, locale), diff: formatPaise(Math.abs(diff), locale) },
    ),
  ].join(' ');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('pp_title')}</Text>
          <Text style={styles.headerSub}>
            {t('pp_subtitle', {
              qty: formatNumber(qtl, locale),
              grade: lot?.grade ?? '—',
            })}
          </Text>
        </View>
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Asking price ──────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t('pp_asking_label')}</Text>

          {/* The price gets its own line — nothing shares a row with it. */}
          <Text style={styles.priceValue} numberOfLines={1} adjustsFontSizeToFit>
            {formatPaise(asking, locale)}
          </Text>

          <View
            style={styles.trackWrap}
            onLayout={e => {
              const { width, x } = e.nativeEvent.layout;
              setTrackWidth(width);
              trackWidthRef.current = width;
              trackLeftRef.current = x + space.md;
            }}
            {...panResponder.panHandlers}>
            <View style={styles.track}>
              {/* Today's observed low–high, marked on the track it belongs to. */}
              <View
                style={[
                  styles.rangeBand,
                  {
                    left: `${((today.min_paise_per_qtl - bounds.min) / (bounds.max - bounds.min)) * 100}%`,
                    width: `${((today.max_paise_per_qtl - today.min_paise_per_qtl) / (bounds.max - bounds.min)) * 100}%`,
                  },
                ]}
              />
              <View style={[styles.trackFill, { width: `${pct}%` }]} />
            </View>
            {trackWidth > 0 ? (
              <View style={[styles.thumb, { left: (pct / 100) * trackWidth - 13 }]} />
            ) : null}
          </View>

          <Text style={styles.sliderHint}>{t('pp_slider_hint')}</Text>

          {/* Steppers, on their own row, evenly split — cannot overflow. */}
          <View style={styles.stepperRow}>
            <TouchableOpacity style={styles.stepBtn} onPress={() => nudge(-STEP_LARGE)}>
              <Text style={styles.stepBtnText}>−{formatPaise(STEP_LARGE, locale)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => nudge(-STEP_SMALL)}>
              <Text style={styles.stepBtnText}>−{formatPaise(STEP_SMALL, locale)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => nudge(STEP_SMALL)}>
              <Text style={styles.stepBtnText}>+{formatPaise(STEP_SMALL, locale)}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.stepBtn} onPress={() => nudge(STEP_LARGE)}>
              <Text style={styles.stepBtnText}>+{formatPaise(STEP_LARGE, locale)}</Text>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.rangeChip,
              rangeState === 'in' ? styles.rangeChipIn : styles.rangeChipOut,
            ]}>
            <Icon
              name={rangeState === 'in' ? 'check-circle' : 'info'}
              size={13}
              color={rangeState === 'in' ? colors.tertiary : colors.warning}
            />
            <Text
              style={[
                styles.rangeChipText,
                { color: rangeState === 'in' ? colors.tertiary : colors.warning },
              ]}>
              {rangeState === 'in'
                ? t('pp_in_range')
                : rangeState === 'above'
                  ? t('pp_above_range')
                  : t('pp_below_range')}
            </Text>
          </View>

          <Text style={styles.rangeLabel}>
            {t('pp_range_label', {
              low: formatPaise(today.min_paise_per_qtl, locale),
              high: formatPaise(today.max_paise_per_qtl, locale),
            })}
          </Text>

          {/* Two benchmarks, not three invented ones. */}
          <View style={styles.benchRow}>
            <View style={styles.benchItem}>
              <Text style={styles.benchKey}>{t('pp_bench_modal')}</Text>
              <Text style={styles.benchVal}>{formatPaise(modal, locale)}</Text>
            </View>
            <View style={[styles.benchItem, styles.benchItemActive]}>
              <Text style={[styles.benchKey, { color: colors.primary }]}>{t('pp_bench_yours')}</Text>
              <Text style={[styles.benchVal, { color: colors.primary }]}>
                {diff === 0
                  ? t('pp_bench_diff_same')
                  : diff > 0
                    ? t('pp_bench_diff_up', { amount: formatPaise(diff, locale) })
                    : t('pp_bench_diff_down', { amount: formatPaise(Math.abs(diff), locale) })}
              </Text>
            </View>
          </View>
        </View>

        {/* ── What you clear ────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('pp_payout_title')}</Text>

          <View style={styles.payoutRow}>
            <Text style={styles.payoutKey}>
              {t('pp_gross_row', {
                qty: formatNumber(qtl, locale),
                rate: formatPaise(asking, locale),
              })}
            </Text>
            <Text style={styles.payoutVal}>{formatPaise(gross, locale)}</Text>
          </View>

          {deductions !== null && perQtlDeduction !== null ? (
            <View style={styles.payoutRow}>
              <Text style={styles.payoutKey}>
                {t('pp_deductions_row', { perQtl: formatPaise(perQtlDeduction, locale) })}
              </Text>
              <Text style={[styles.payoutVal, { color: colors.critical }]}>
                −{formatPaise(deductions, locale)}
              </Text>
            </View>
          ) : null}

          {net !== null ? (
            <View style={styles.netBox}>
              <Text style={styles.netLabel}>{t('pp_net_label')}</Text>
              <Text style={styles.netValue}>{formatPaise(net, locale)}</Text>
            </View>
          ) : null}

          <View style={styles.escrowNote}>
            <Icon name="lock" size={14} color={colors.tertiary} />
            <Text style={styles.escrowNoteText}>{t('pp_escrow_note')}</Text>
          </View>
        </View>

        {/* ── Logistics ─────────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('pp_logistics_title')}</Text>

          {(
            [
              { id: 'farmgate', title: 'pp_dispatch_farmgate', sub: 'pp_dispatch_farmgate_sub', rec: true },
              { id: 'yard', title: 'pp_dispatch_apmc', sub: 'pp_dispatch_apmc_sub', rec: false },
            ] as const
          ).map(opt => {
            const active = dispatchMode === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => setDispatchMode(opt.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}>
                <View style={[styles.radio, active && styles.radioActive]}>
                  {active ? <View style={styles.radioFill} /> : null}
                </View>
                <View style={styles.optionText}>
                  <View style={styles.optionTitleRow}>
                    <Text style={[styles.optionTitle, active && styles.optionTitleActive]}>
                      {t(opt.title)}
                    </Text>
                    {opt.rec ? (
                      <View style={styles.recBadge}>
                        <Text style={styles.recBadgeText}>{t('pp_recommended')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.optionSub}>{t(opt.sub)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Split + window ────────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('pp_split_title')}</Text>
          <View style={styles.splitRow}>
            {(
              [
                { allow: false, key: 'pp_split_full' },
                { allow: true, key: 'pp_split_allow' },
              ] as const
            ).map(opt => {
              const active = splitAllowed === opt.allow;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[styles.splitBtn, active && styles.splitBtnActive]}
                  onPress={() => setSplitAllowed(opt.allow)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioFill} /> : null}
                  </View>
                  <Text style={[styles.splitText, active && styles.splitTextActive]}>
                    {t(opt.key)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.windowRow}>
            <Icon name="clock" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.windowLabel}>{t('pp_window_label')}</Text>
            <Text style={styles.windowValue}>{t('pp_window_value')}</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.publishBtn}
          onPress={() =>
            navigation.navigate('S23_PublishedRadar', {
              ...(route.params?.lot_id ? { lot_id: route.params.lot_id } : {}),
              asking_paise: asking,
            })
          }
          accessibilityRole="button">
          <Icon name="check-circle" size={18} color={colors.onPrimary} />
          <Text style={styles.publishBtnText} numberOfLines={1}>
            {t('pp_publish_cta')}
          </Text>
        </TouchableOpacity>
        <Text style={styles.draftNote}>{t('pp_draft_note')}</Text>
      </View>
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
    paddingBottom: space.xs,
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
  headerText: { flex: 1 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: 160, gap: space.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  cardLabel: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: space.xs },

  priceValue: {
    fontSize: 44,
    lineHeight: 52,
    fontFamily: fontFamily.extraBold,
    color: colors.primary,
    letterSpacing: -1,
    marginTop: 2,
  },

  trackWrap: { height: 34, justifyContent: 'center', marginTop: space.xs },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'hidden',
  },
  rangeBand: { position: 'absolute', top: 0, height: 10, backgroundColor: colors.positiveContainer },
  trackFill: { height: 10, backgroundColor: colors.primaryContainer, borderRadius: radius.full },
  thumb: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.surface,
  },
  sliderHint: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    marginTop: 2,
  },

  stepperRow: { flexDirection: 'row', gap: 6, marginTop: space.sm },
  stepBtn: {
    flex: 1,
    minHeight: touch.targetMin,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingHorizontal: 2,
  },
  stepBtnText: { ...typography.labelMd, color: colors.onSurface },

  rangeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    marginTop: space.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
  },
  rangeChipIn: { backgroundColor: colors.positiveContainer },
  rangeChipOut: { backgroundColor: colors.warningContainer },
  rangeChipText: { ...typography.labelSm },
  rangeLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 6,
  },

  benchRow: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  benchItem: {
    flex: 1,
    padding: space.xs,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  benchItemActive: { borderColor: colors.primaryContainer, backgroundColor: colors.onPrimaryContainer },
  benchKey: { ...typography.labelSm, fontSize: 10, color: colors.onSurfaceVariant },
  benchVal: { ...typography.labelMd, color: colors.onSurface, marginTop: 2 },

  payoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 7,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  payoutKey: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  payoutVal: { ...typography.titleMd, color: colors.onSurface },

  netBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.xs,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.positiveContainer,
  },
  netLabel: { ...typography.titleMd, color: colors.onPositiveContainer, flex: 1 },
  netValue: {
    ...typography.headlineSm,
    color: colors.tertiary,
    fontFamily: fontFamily.extraBold,
  },

  escrowNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  escrowNoteText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 18 },

  option: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    marginTop: space.xs,
  },
  optionActive: { borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.onPrimaryContainer },
  optionText: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  optionTitle: { ...typography.titleMd, color: colors.onSurface, flexShrink: 1 },
  optionTitleActive: { color: colors.primary },
  optionSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 18 },
  recBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
  },
  recBadgeText: { ...typography.labelSm, fontSize: 10, color: colors.onPrimary },

  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  radioActive: { borderColor: colors.primary },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  splitRow: { flexDirection: 'row', gap: space.xs },
  splitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    minHeight: touch.targetMin,
  },
  splitBtnActive: { borderWidth: 2, borderColor: colors.primaryContainer, backgroundColor: colors.onPrimaryContainer },
  splitText: { ...typography.labelMd, color: colors.onSurfaceVariant, flex: 1 },
  splitTextActive: { color: colors.primary },

  windowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  windowLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  windowValue: { ...typography.labelMd, color: colors.onSurface },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: 6,
  },
  publishBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: space.sm,
  },
  publishBtnText: {
    ...typography.titleLg,
    color: colors.onPrimary,
    fontFamily: fontFamily.extraBold,
    flexShrink: 1,
  },
  draftNote: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },
});
