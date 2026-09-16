/**
 * S9's hero card — Stitch screen 11 (`11_should_i_sell_core_decision_engine`).
 * Pure and presentational on purpose: the screen fetches, this component only
 * renders `WindowRes`, which is what makes I16 a thing a unit test can assert
 * instead of only a thing a human screenshots (`VerdictCard.test.tsx`).
 *
 * ★ Every number here comes from `00_CANON.md` §7.4. There is no
 *   `best_case_paise`, no `best_day`, no `confidence_bps`, no `costs_paise`,
 *   no `model_version`, no `source_summary` on this response — six fields an
 *   earlier draft of this screen's spec invented, and none of them are read
 *   here.
 *
 * ★ I16, by construction, not by convention: `expected_gain_paise` and
 *   `worst_case_paise` both render through the single `styles.bigNumber` style
 *   object. There is exactly one font-size declaration for both — changing one
 *   changes the other, because there is only one to change. The Stitch mockup
 *   lays them out as two symmetrical side-by-side cards; that symmetry is the
 *   design expressing the same invariant the style object enforces.
 *
 * ★ Three things in the Stitch mockup are deliberately NOT reproduced, because
 *   nothing behind them is real:
 *   - "Confidence: 91%". `WindowRes.confidence` is a three-value enum
 *     (LOW/MEDIUM/HIGH), and CANON says so explicitly — a percentage here
 *     would be a number this system never computed. The enum is rendered.
 *   - "84% historical accuracy over 180 mandi cycles". Replaced with the two
 *     figures the model card actually carries: MASE against the seasonal-naive
 *     baseline, and observed 80%-band coverage.
 *   - "Protected by Maharashtra Mandi Settlement Board". There is no such
 *     endorsement; a government guarantee is not something a hackathon app
 *     gets to assert on a farmer's decision screen.
 *   - "Lock In Hold Strategy" is likewise absent: no endpoint persists a hold
 *     decision, so a button claiming to lock one in would be a lie. The honest
 *     line `vd_no_hold_persist` says what is actually true instead.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../ui/Icon';
import { formatBps, formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { useT } from '../../lib/i18n';
import { buildVerdictNarrationFor } from '../../lib/verdictVoice';
import { ListenButton } from '../ui/ListenButton';
import { NO_ADVICE_BAND_THRESHOLD_BPS } from '../../config';
import { SourceBadge } from './SourceBadge';
import type { Confidence, Locale, WindowAction, WindowRes } from '../../types/api';

const ACTION_KEY: Record<Exclude<WindowAction, 'NO_ADVICE'>, string> = {
  SELL_NOW: 'action_sell_now',
  SELL_ELSEWHERE: 'action_sell_elsewhere',
  HOLD: 'action_hold',
  SPLIT: 'action_split',
};

// t('high'|'medium'|'low') replaces this now — kept only as the Confidence -> key
// lookup, not as the rendered text itself.
const CONFIDENCE_KEY: Record<Confidence, 'high' | 'medium' | 'low'> = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
};

/**
 * `onSeeCosts` is optional and the component stays presentational either way —
 * it takes a callback, not a `navigation` object. That is what keeps this file
 * renderable by `VerdictCard.test.tsx` with no navigation container around it,
 * and it is why the prop is a callback rather than this component importing
 * `useNavigation` itself.
 */
export function VerdictCard({
  data,
  qtyKg,
  locale,
  onSeeCosts,
}: {
  data: WindowRes;
  qtyKg: number;
  locale: Locale;
  onSeeCosts?: () => void;
}) {
  const { t } = useT();
  /* ★ The verdict's own speaker used to live here — its own `useState`, its
     own handler, and its own `disabled={speaking}` bug. It is the shared
     `ListenButton` now, so the stop-and-replay behaviour, the Sarvam
     preference and the on-device fallback are defined once for the whole app
     rather than drifting between two copies. */

  return (
    <View style={styles.wrap}>
      {/* ── Verdict hero ──────────────────────────────────────────── */}
      <View style={styles.heroCard}>
        <View style={styles.heroTopRow}>
          <View style={styles.recommendedBadge}>
            <Icon name="star" size={12} color={colors.primary} />
            <Text style={styles.recommendedBadgeText}>{t('vd_recommended_badge')}</Text>
          </View>
          <SourceBadge source={data.data_source} locale={locale} />
        </View>

        {data.action === 'NO_ADVICE' ? (
          <Refusal data={data} locale={locale} />
        ) : (
          <Verdict data={data} qtyKg={qtyKg} locale={locale} />
        )}
      </View>

      {/* ── Deductions, itemised inline (Stitch 11 §4) ─────────────── */}
      <View style={styles.card}>
        <View style={styles.deductionsHead}>
          <View style={styles.deductionsHeadText}>
            <Text style={styles.cardTitle}>{t('vd_deductions_title')}</Text>
            <Text style={styles.cardSub}>{t('vd_deductions_sub')}</Text>
          </View>
          <View style={styles.deductionsTotalBox}>
            <Text style={styles.deductionsTotal}>
              {formatPaise(data.costs.total_paise_per_qtl, locale)}
            </Text>
            <Text style={styles.cardSub}>{t('vd_per_quintal')}</Text>
          </View>
        </View>

        <CostLines costs={data.costs} locale={locale} />

        {/* The route out to S10. `verdict-costs-toggle` keeps its name from the
            pre-Stitch build so the suite that guards these five lines still
            finds it; it is now the itemised-sheet button rather than a
            show/hide toggle, because Stitch 11 shows the fees on arrival —
            a farmer should not have to tap to discover what is deducted. */}
        {onSeeCosts ? (
          <TouchableOpacity
            testID="verdict-costs-toggle"
            style={styles.costSheetBtn}
            onPress={onSeeCosts}
            accessibilityRole="button">
            <Text testID="verdict-costs-detail" style={styles.costSheetBtnText}>
              {t('vd_open_cost_sheet')}
            </Text>
            <Icon name="chevron-right" size={18} color={colors.primary} />
          </TouchableOpacity>
        ) : (
          <View testID="verdict-costs-toggle" />
        )}
      </View>

      {/* ── Listen ─────────────────────────────────────────────────── */}
      <View style={styles.voiceRow}>
        <ListenButton text={buildVerdictNarrationFor(data, locale)} />
      </View>
    </View>
  );
}

function Verdict({ data, qtyKg, locale }: { data: WindowRes; qtyKg: number; locale: Locale }) {
  const { t } = useT();
  const qtyQtl = toQuintal(qtyKg);

  /** Per-quintal move behind the whole-lot figure, so the two hero numbers each
   * carry the rate that produced them — Stitch's "+₹157/Qtl rise" and "Max
   * −₹120/Qtl dip" subtitles. Derived, not invented: the lot total divided by
   * the lot size. Hidden when the quantity is unknown rather than dividing by
   * zero into a fake rate. */
  const perQtl = (whole: number | null) =>
    whole !== null && qtyQtl > 0 ? Math.round(whole / qtyQtl) : null;
  const gainPerQtl = perQtl(data.expected_gain_paise);
  const worstPerQtl = perQtl(data.worst_case_paise);

  return (
    <>
      <Text style={styles.action}>
        {t(ACTION_KEY[data.action as Exclude<WindowAction, 'NO_ADVICE'>])}
      </Text>
      {data.hold_days !== null && data.hold_days > 0 ? (
        <Text style={styles.holdDays}>
          {t('vd_hold_until', { days: formatNumber(data.hold_days, locale) })}
        </Text>
      ) : null}

      <Text style={styles.basisLine}>
        {t('vd_basis_line_ungraded', { qty: formatNumber(qtyQtl, locale) })}
      </Text>

      <View style={styles.confidenceRow}>
        <Text style={styles.confidenceLabel}>{t('confidence')}</Text>
        <Text style={styles.confidenceValue}>{t(CONFIDENCE_KEY[data.confidence])}</Text>
      </View>

      {/* ── Financial impact: two symmetrical cards (I16) ──────────── */}
      <Text style={styles.matrixTitle}>{t('vd_matrix_title')}</Text>
      <View style={styles.matrixGrid}>
        <View style={styles.matrixCard}>
          <View style={styles.matrixHead}>
            <View style={styles.matrixIconGain}>
              <Icon name="trending-up" size={14} color={colors.tertiary} />
            </View>
            <Text style={styles.matrixLabel}>{t('expected_gain')}</Text>
          </View>
          {/* ★ I16 — `styles.bigNumber` is shared with the worst case below. */}
          <Text testID="verdict-gain" style={[styles.bigNumber, styles.gain]}>
            {data.expected_gain_paise !== null
              ? `+ ${formatPaise(data.expected_gain_paise, locale)}`
              : '—'}
          </Text>
          {gainPerQtl !== null ? (
            <Text style={styles.matrixFoot}>
              {t('vd_per_qtl_rise', { amount: formatPaise(gainPerQtl, locale) })}
            </Text>
          ) : null}
        </View>

        <View style={styles.matrixCard}>
          <View style={styles.matrixHead}>
            <View style={styles.matrixIconRisk}>
              <Icon name="trending-down" size={14} color={colors.critical} />
            </View>
            <Text style={styles.matrixLabel}>{t('worst_case')}</Text>
          </View>
          <Text testID="verdict-worst-case" style={[styles.bigNumber, styles.worst]}>
            {data.worst_case_paise !== null ? formatPaise(data.worst_case_paise, locale) : '—'}
          </Text>
          {worstPerQtl !== null ? (
            <Text style={styles.matrixFootRisk}>
              {t('vd_per_qtl_dip', { amount: formatPaise(Math.abs(worstPerQtl), locale) })}
            </Text>
          ) : null}
        </View>
      </View>

      {/* The model's measured record — not the mockup's "84% accuracy". */}
      <View style={styles.accuracyNote}>
        <Icon name="check-circle" size={16} color={colors.outline} />
        <Text style={styles.accuracyText}>
          {t('vd_accuracy_note', {
            mase: data.model_card.mase.toFixed(2),
            coverage: formatNumber(Math.round(data.model_card.coverage_80_bps / 100), locale),
          })}
        </Text>
      </View>
    </>
  );
}

/**
 * I6. Rendered with the same card chrome as `Verdict` — a refusal that looks
 * like an error state reads as a bug; one that looks deliberate reads as
 * integrity. `explain_mr` is rendered verbatim, never composed client-side
 * (PRANAY.md §1.7).
 */
function Refusal({ data, locale }: { data: WindowRes; locale: Locale }) {
  const { t } = useT();
  return (
    <>
      <Text style={styles.action}>{t('no_advice_label')}</Text>
      <Text style={styles.explain}>{data.explain_mr}</Text>
      <Text style={styles.meta}>
        {t('band_width_label')}: {formatBps(data.band_width_bps, locale)} ({t('band_limit_label')}:{' '}
        {formatBps(NO_ADVICE_BAND_THRESHOLD_BPS, locale)})
      </Text>
      <Text style={styles.todayPrice}>
        {t('today_price_label')}: {formatPaise(data.sell_now_net_paise_per_qtl, locale)}
        {t('per_quintal_suffix')}
      </Text>
    </>
  );
}

function CostLines({ costs, locale }: { costs: WindowRes['costs']; locale: Locale }) {
  const { t } = useT();
  const rows: Array<[string, number, Parameters<typeof Icon>[0]['name']]> = [
    [t('cost_transport'), costs.transport_paise_per_qtl, 'truck'],
    [t('cost_commission'), costs.commission_paise_per_qtl, 'handshake'],
    [t('cost_storage'), costs.storage_paise_per_qtl, 'box'],
    [t('cost_spoilage'), costs.spoilage_paise_per_qtl, 'leaf'],
    [t('cost_loading'), costs.loading_paise_per_qtl, 'scale'],
  ];
  return (
    <View style={styles.costLines}>
      {rows.map(([label, paise, icon]) => (
        <View key={label} style={styles.costRow}>
          <View style={styles.costLabelRow}>
            <Icon name={icon} size={15} color={colors.outline} />
            <Text style={styles.costLabel}>{label}</Text>
          </View>
          <Text style={styles.costValue}>{formatPaise(paise, locale)}</Text>
        </View>
      ))}
      <View style={[styles.costRow, styles.costTotalRow]}>
        <Text style={styles.costTotalLabel}>{t('cost_total')}</Text>
        <Text style={styles.costTotalValue}>{formatPaise(costs.total_paise_per_qtl, locale)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
    gap: space.xs,
  },
  recommendedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.onPrimaryContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  recommendedBadgeText: { ...typography.labelSm, color: colors.primary },

  action: { ...typography.displayLg, color: colors.onSurface, marginTop: space.xs },
  holdDays: { ...typography.titleMd, color: colors.onSurfaceVariant, marginTop: 2 },
  basisLine: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 6,
    fontFamily: fontFamily.medium,
  },

  confidenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  confidenceLabel: { ...typography.labelMd, color: colors.onSurfaceVariant },
  confidenceValue: { ...typography.labelLg, color: colors.onSurface },

  matrixTitle: {
    ...typography.labelLg,
    color: colors.onSurface,
    marginTop: space.md,
    marginBottom: space.xs,
    textTransform: 'uppercase',
  },
  matrixGrid: { flexDirection: 'row', gap: space.xs },
  matrixCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.sm,
  },
  matrixHead: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  matrixIconGain: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.positiveContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixIconRisk: {
    width: 24,
    height: 24,
    borderRadius: radius.sm,
    backgroundColor: colors.criticalContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  matrixLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, flex: 1 },

  // ★ I16 — the one style both numbers share. Do not fork this into two.
  bigNumber: { fontSize: 28, fontFamily: fontFamily.extraBold, letterSpacing: -0.4 },
  gain: { color: colors.positive },
  worst: { color: colors.critical },

  matrixFoot: {
    ...typography.labelSm,
    color: colors.tertiary,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  matrixFootRisk: {
    ...typography.labelSm,
    color: colors.critical,
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },

  accuracyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: 10,
  },
  accuracyText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 17 },

  meta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: space.md },
  explain: { ...typography.bodyLg, color: colors.onSurface, marginTop: space.sm },
  todayPrice: { ...typography.titleMd, color: colors.onSurface, marginTop: space.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface },
  cardSub: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium },
  deductionsHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  deductionsHeadText: { flex: 1 },
  deductionsTotalBox: { alignItems: 'flex-end' },
  deductionsTotal: { ...typography.numeralData, color: colors.primary },

  costLines: { marginTop: space.xs },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  costLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  costLabel: { ...typography.bodySm, color: colors.onSurfaceVariant },
  costValue: { ...typography.labelMd, color: colors.onSurface },
  costTotalRow: {
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    marginTop: 4,
    paddingTop: space.xs,
  },
  costTotalLabel: { ...typography.titleMd, color: colors.onSurface },
  costTotalValue: { ...typography.titleMd, color: colors.onSurface },

  costSheetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  costSheetBtnText: { ...typography.labelMd, color: colors.primary },

  voiceRow: { alignItems: 'center', paddingVertical: space.xs },
});
