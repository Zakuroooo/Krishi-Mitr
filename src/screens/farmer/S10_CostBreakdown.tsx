/**
 * S10 — the itemised cost sheet. Stitch screen 12
 * (`12_cost_breakdown_itemized_deductions_sheet`), which is a bottom sheet
 * over the decision screen; it is registered with `presentation: 'modal'` so
 * it arrives the way the design says it does.
 *
 * ★ It reads the **same `queryKey` as S9**, deliberately. The costs shown
 *   here are the costs that produced the gain on the verdict — not a second
 *   fetch that could disagree with it. Reached from S9's "open itemised cost
 *   sheet" row, so the cache is always warm; on a cold start it fetches the
 *   same key and both screens still agree.
 *
 * ★ `whenHolding` marks the two lines that only exist because the lot is
 *   being held (storage, spoilage). On a SELL_NOW verdict they are still
 *   rendered — a zero that is explained beats a row that silently vanishes —
 *   but they carry the "only while holding" tag so the farmer can see which
 *   part of the deduction he avoids by selling today.
 *
 * ★ Three things in the mockup are not reproduced: a "Middleman Cut ~₹280/q"
 *   comparison (no field anywhere carries a middleman rate — it is a made-up
 *   number used to flatter the product), a "Direct Escrow Mandi Settlement
 *   Guarantee" stamp (no such guarantee exists), and "Download Itemized PDF
 *   Receipt / Tax Invoice" (nothing in this app generates a PDF or a tax
 *   invoice). Named specifics like "Shriram Warehouse Niphad, ₹2.55/bag/day"
 *   are likewise replaced with descriptions that are true of the fee itself.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { recommendWindow } from '../../lib/api';
import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_GRADE,
  DEFAULT_HORIZON_DAYS,
  DEFAULT_MARKET_ID,
  DEFAULT_QTY_KG,
  USE_FIXTURES,
} from '../../config';
import { fxHold } from '../../fixtures/window';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import type { HomeStackParamList } from '../../navigation/FarmerTabs';
import type { WindowCosts } from '../../types/api';

type Props = NativeStackScreenProps<HomeStackParamList, 'S10_CostBreakdown'>;

const LINES: Array<{
  key: keyof Omit<WindowCosts, 'total_paise_per_qtl'>;
  labelKey: string;
  descKey: string;
  icon: Parameters<typeof Icon>[0]['name'];
  whenHolding: boolean;
}> = [
  { key: 'transport_paise_per_qtl', labelKey: 'cost_transport', descKey: 'cb_desc_transport', icon: 'truck', whenHolding: false },
  { key: 'commission_paise_per_qtl', labelKey: 'cost_commission', descKey: 'cb_desc_commission', icon: 'handshake', whenHolding: false },
  { key: 'storage_paise_per_qtl', labelKey: 'cost_storage', descKey: 'cb_desc_storage', icon: 'box', whenHolding: true },
  { key: 'spoilage_paise_per_qtl', labelKey: 'cost_spoilage', descKey: 'cb_desc_spoilage', icon: 'leaf', whenHolding: true },
  { key: 'loading_paise_per_qtl', labelKey: 'cost_loading', descKey: 'cb_desc_loading', icon: 'scale', whenHolding: false },
];

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

export default function S10_CostBreakdown({ navigation }: Props) {
  const { t, locale } = useT();
  const qtyQtl = toQuintal(DEFAULT_QTY_KG);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai', 'window', 'recommend', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_QTY_KG],
    queryFn: fetchVerdict,
  });

  const close = () => navigation.canGoBack() && navigation.goBack();

  /* ★ Reads every deduction line and then the total — the whole point of
     this sheet is that nothing is hidden, and a farmer who cannot read the
     table should hear the same list rather than a summary of it. */
  const narration = data
    ? [
        t('cb_narr_total', {
          perQtl: formatPaise(data.costs.total_paise_per_qtl, locale),
          qty: formatNumber(qtyQtl, locale),
          total: formatPaise(data.costs.total_paise_per_qtl * qtyQtl, locale),
        }),
        ...LINES.filter(
          l => !l.whenHolding || (data.hold_days !== null && data.hold_days > 0),
        )
          .filter(l => data.costs[l.key] > 0)
          .map(l =>
            t('cb_narr_line', {
              label: t(l.labelKey),
              amount: formatPaise(data.costs[l.key], locale),
            }),
          ),
      ].join(' ')
    : t('cb_title');

  const sheetHeader = (
    <>
      <View style={styles.grabberRow}>
        <View style={styles.grabber} />
      </View>
      <View style={styles.headerRow}>
        <View style={styles.headerText}>
          <Text style={styles.title}>{t('cb_title')}</Text>
          {data ? (
            <Text style={styles.subtitle}>
              {data.hold_days !== null && data.hold_days > 0
                ? t('cb_subtitle', {
                    qty: formatNumber(qtyQtl, locale),
                    days: formatNumber(data.hold_days, locale),
                  })
                : t('cb_subtitle_no_hold', { qty: formatNumber(qtyQtl, locale) })}
            </Text>
          ) : null}
        </View>
        <ListenButton text={narration} />
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={close}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="x-circle" size={20} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
      </View>
    </>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} />
        {sheetHeader}
        <ScrollView contentContainerStyle={styles.scroll}>
          <Skeleton height={160} />
          <View style={{ height: space.sm }} />
          <Skeleton height={280} />
        </ScrollView>
      </View>
    );
  }

  if (error && !data) {
    return <ErrorState message={t('cost_breakdown_error')} onRetry={() => refetch()} />;
  }

  if (!data) {
    return <EmptyState title={t('cost_breakdown_empty')} />;
  }

  const totalPerQtl = data.costs.total_paise_per_qtl;
  const lotTotal = totalPerQtl * qtyQtl;
  const isHolding = data.hold_days !== null && data.hold_days > 0;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLowest} />
      {sheetHeader}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Total deductions hero ─────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroLeft}>
              <View style={styles.heroEyebrowRow}>
                <Icon name="clipboard" size={14} color={colors.primary} />
                <Text style={styles.heroEyebrow}>{t('cb_total_eyebrow')}</Text>
              </View>
              <View style={styles.heroPriceRow}>
                <Text style={styles.heroNumeral}>{formatPaise(totalPerQtl, locale)}</Text>
                <Text style={styles.heroPerQtl}>{t('vd_per_quintal')}</Text>
              </View>
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroRightLabel}>
                {t('cb_lot_total_label', { qty: formatNumber(qtyQtl, locale) })}
              </Text>
              <Text style={styles.heroRightValue}>{formatPaise(lotTotal, locale)}</Text>
              <Text style={styles.heroRightNote}>
                {t('cb_lot_total_note', {
                  qty: formatNumber(qtyQtl, locale),
                  perQtl: formatPaise(totalPerQtl, locale),
                })}
              </Text>
            </View>
          </View>

          {/* What survives the deductions. The gain is already net of every
              line below — `cost_breakdown_footnote` states that contract, and
              this is the same number the verdict shows, not a recomputation. */}
          {data.expected_gain_paise !== null ? (
            <View style={styles.netStrip}>
              <View style={styles.netStripHead}>
                <Icon name="trending-up" size={15} color={colors.tertiary} />
                <Text style={styles.netStripLabel}>{t('cb_net_gain_label')}</Text>
              </View>
              <Text style={styles.netStripValue}>
                + {formatPaise(data.expected_gain_paise, locale)}
              </Text>
            </View>
          ) : null}
        </View>

        {/* ── Itemised ledger ───────────────────────────────────────── */}
        <View style={styles.ledgerHead}>
          <View style={styles.ledgerHeadLeft}>
            <Icon name="check-circle" size={17} color={colors.primary} />
            <Text style={styles.ledgerTitle}>
              {t('cb_items_title', { n: formatNumber(LINES.length, locale) })}
            </Text>
          </View>
          <Text style={styles.ledgerAllInclusive}>{t('cb_all_inclusive')}</Text>
        </View>

        <View style={styles.ledgerCard}>
          {LINES.map((line, i) => {
            const perQtl = data.costs[line.key];
            return (
              <View key={line.key} style={[styles.itemRow, i > 0 && styles.itemRowDivider]}>
                <View style={styles.itemIconBox}>
                  <Icon name={line.icon} size={17} color={colors.primary} />
                </View>
                <View style={styles.itemText}>
                  <View style={styles.itemTitleRow}>
                    <Text style={styles.itemTitle}>{t(line.labelKey)}</Text>
                    {line.whenHolding && isHolding ? (
                      <View style={styles.holdTag}>
                        <Text style={styles.holdTagText}>{t('cb_only_when_holding')}</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.itemDesc}>{t(line.descKey)}</Text>
                </View>
                <View style={styles.itemAmounts}>
                  <Text style={styles.itemPerQtl}>{formatPaise(perQtl, locale)}</Text>
                  <Text style={styles.itemLotTotal}>
                    {t('cb_lot_total_suffix', { amount: formatPaise(perQtl * qtyQtl, locale) })}
                  </Text>
                </View>
              </View>
            );
          })}

          <View style={[styles.itemRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>{t('cost_total')}</Text>
            <View style={styles.itemAmounts}>
              <Text style={styles.totalPerQtl}>{formatPaise(totalPerQtl, locale)}</Text>
              <Text style={styles.itemLotTotal}>
                {t('cb_lot_total_suffix', { amount: formatPaise(lotTotal, locale) })}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.footnote}>{t('cost_breakdown_footnote')}</Text>

        <TouchableOpacity style={styles.doneBtn} onPress={close} accessibilityRole="button">
          <Text style={styles.doneBtnText}>{t('cb_done_cta')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surfaceContainerLowest },

  grabberRow: { alignItems: 'center', paddingTop: space.sm, paddingBottom: space.xs },
  grabber: { width: 48, height: 6, borderRadius: radius.full, backgroundColor: colors.outlineVariant },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceContainer,
  },
  headerText: { flex: 1 },
  title: { ...typography.headlineSm, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  subtitle: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 2, fontFamily: fontFamily.medium },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    padding: space.md,
  },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  heroLeft: { flex: 1 },
  heroEyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  heroEyebrow: { ...typography.labelSm, color: colors.primary, textTransform: 'uppercase', flex: 1 },
  heroPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4 },
  heroNumeral: { ...typography.numeralHero, color: colors.onSurface },
  heroPerQtl: { ...typography.titleMd, color: colors.onSurfaceVariant },
  heroRight: { alignItems: 'flex-end' },
  heroRightLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  heroRightValue: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold, marginTop: 2 },
  heroRightNote: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium },

  netStrip: {
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.sm,
  },
  netStripHead: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  netStripLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1 },
  netStripValue: {
    ...typography.headlineSm,
    color: colors.tertiary,
    fontFamily: fontFamily.bold,
    marginTop: 2,
  },

  ledgerHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    paddingHorizontal: 2,
  },
  ledgerHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  ledgerTitle: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  ledgerAllInclusive: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  ledgerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.sm },
  itemRowDivider: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemText: { flex: 1 },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  itemTitle: { ...typography.titleMd, color: colors.onSurface },
  holdTag: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  holdTagText: { ...typography.labelSm, fontSize: 10, color: colors.onSurfaceVariant },
  itemDesc: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 17 },
  itemAmounts: { alignItems: 'flex-end' },
  itemPerQtl: { ...typography.titleMd, color: colors.onSurface },
  itemLotTotal: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium, marginTop: 2 },

  totalRow: {
    borderTopWidth: 1.5,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
  },
  totalLabel: { ...typography.titleLg, color: colors.onSurface, flex: 1 },
  totalPerQtl: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold },

  footnote: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },

  doneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.md,
    marginTop: space.xs,
  },
  doneBtnText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
});
