/**
 * S13 — loan against stored crop. Stitch screen 13
 * (`13_loan_against_stored_crop_cashflow_bridge`), the full-screen version of
 * the pledge card that sits under the verdict.
 *
 * ★ This is the thesis screen. CLAUDE.md §1: "the binding constraint on
 *   farmer price realisation is not information — it is the ability to wait."
 *   S9 tells a farmer that waiting pays; this is the screen that says how he
 *   affords to.
 *
 * ★ I13 is enforced upstream, not here: the server sends `pledge_quote: null`
 *   when the interest would meet or exceed the expected gain, and `PledgeCard`
 *   returns null so the route out to this screen is never offered. Reaching
 *   it anyway (a deep link, a stale back stack) lands on an explicit "no loan
 *   is offered" state that says *why* — it does not invent a quote to fill
 *   the screen.
 *
 * ★ Every term shown is a field of `PledgeQuote`: loan_paise, ltv_bps,
 *   rate_bps_annual, days, interest_paise, warehouse_id, and the server's own
 *   `disclaimer` string rendered verbatim. The Stitch mockup's "Apply in 2
 *   minutes" button is not reproduced: nothing in this project issues a loan
 *   or files an application, so a button claiming to would be the most
 *   consequential lie in the app — a farmer would wait for money that was
 *   never coming. The screen says plainly where the quote is actually
 *   redeemed instead.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatBps, formatNumber, formatPaise } from '../../lib/money';
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

type Props = NativeStackScreenProps<HomeStackParamList, 'S13_CropLoan'>;

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

export default function S13_CropLoan({ navigation }: Props) {
  const { t, locale } = useT();

  // Same query key as S9 and S10 — the loan on this screen is the loan the
  // verdict offered, never a second quote that could differ from it.
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['ai', 'window', 'recommend', DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_QTY_KG],
    queryFn: fetchVerdict,
  });

  /* ★ A loan is the single most consequential thing on this screen, and it
     had no speaker. The narration reads the amount, the interest, and — the
     comparison I13 exists for — the expected gain beside that interest, so a
     farmer hears whether waiting still pays after borrowing. */
  const narration = (() => {
    if (!data) return t('loan_title');
    const q = data.pledge_quote;
    if (!q) return `${t('loan_no_quote')} ${t('loan_no_quote_sub')}`;
    const g = data.expected_gain_paise;
    const parts = [
      t('loan_narr_amount', {
        amount: formatPaise(q.loan_paise, locale),
        days: formatNumber(q.days, locale),
        interest: formatPaise(q.interest_paise, locale),
      }),
    ];
    if (g !== null) {
      parts.push(
        t('loan_narr_compare', {
          gain: formatPaise(g, locale),
          interest: formatPaise(q.interest_paise, locale),
          surplus: formatPaise(g - q.interest_paise, locale),
        }),
      );
    }
    return parts.join(' ');
  })();

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
        <Text style={styles.eyebrow}>{t('loan_eyebrow')}</Text>
        <Text style={styles.headerTitle}>{t('loan_title')}</Text>
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={150} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  if (error && !data) {
    return <ErrorState message={t('verdict_error')} onRetry={() => refetch()} />;
  }

  if (!data) {
    return <EmptyState title={t('verdict_empty')} />;
  }

  const quote = data.pledge_quote;

  // I13's branch, stated rather than hidden.
  if (quote === null) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <View style={styles.noQuoteCard}>
            <View style={styles.noQuoteIcon}>
              <Icon name="info" size={22} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.noQuoteTitle}>{t('loan_no_quote')}</Text>
            <Text style={styles.noQuoteSub}>{t('loan_no_quote_sub')}</Text>
          </View>
        </View>
      </View>
    );
  }

  const gain = data.expected_gain_paise;
  const surplus = gain !== null ? gain - quote.interest_paise : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── How much ──────────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('loan_hero_label')}</Text>
          <Text style={styles.heroAmount}>{formatPaise(quote.loan_paise, locale)}</Text>
          <Text style={styles.heroSub}>{t('loan_hero_sub')}</Text>
        </View>

        {/* ── The terms ─────────────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('loan_terms_title')}</Text>
        <View style={styles.card}>
          <TermRow label={t('loan_term_ltv')} value={formatBps(quote.ltv_bps, locale)} />
          <TermRow label={t('loan_term_rate')} value={formatBps(quote.rate_bps_annual, locale)} divider />
          <TermRow
            label={t('loan_term_days')}
            value={t('loan_term_days_value', { days: formatNumber(quote.days, locale) })}
            divider
          />
          <TermRow
            label={t('loan_term_interest')}
            value={formatPaise(quote.interest_paise, locale)}
            divider
            emphasis
          />
          <TermRow label={t('loan_term_warehouse')} value={quote.warehouse_id} divider />
        </View>

        {/* ── The trade, as arithmetic ──────────────────────────────── */}
        {gain !== null && surplus !== null ? (
          <>
            <Text style={styles.sectionTitle}>{t('loan_compare_title')}</Text>
            <View style={styles.card}>
              <View style={styles.compareGrid}>
                <View style={styles.compareCol}>
                  <Text style={styles.compareLabel}>{t('loan_compare_cost')}</Text>
                  {/* Same weight on both sides — I16's logic applied to the
                      cost of an option and its benefit. */}
                  <Text style={[styles.compareValue, styles.compareCost]}>
                    {formatPaise(quote.interest_paise, locale)}
                  </Text>
                </View>
                <Text style={styles.compareVs}>{t('pledge_compare_vs')}</Text>
                <View style={styles.compareColRight}>
                  <Text style={styles.compareLabel}>{t('loan_compare_gain')}</Text>
                  <Text style={[styles.compareValue, styles.compareGain]}>
                    + {formatPaise(gain, locale)}
                  </Text>
                </View>
              </View>
              <View style={styles.verdictStrip}>
                <Icon
                  name={surplus > 0 ? 'check-circle' : 'info'}
                  size={16}
                  color={surplus > 0 ? colors.tertiary : colors.warning}
                />
                <Text style={styles.verdictText}>
                  {surplus > 0
                    ? t('loan_compare_verdict_good', { amount: formatPaise(surplus, locale) })
                    : t('loan_compare_verdict_bad')}
                </Text>
              </View>
            </View>
          </>
        ) : null}

        {/* ── Where it is actually redeemed ─────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('loan_how_title')}</Text>
        <View style={styles.card}>
          <Text style={styles.howBody}>{t('loan_how_body')}</Text>
        </View>

        {/* The server's own disclaimer, verbatim. */}
        <Text style={styles.disclaimer}>{quote.disclaimer}</Text>
      </ScrollView>
    </View>
  );
}

function TermRow({
  label,
  value,
  divider,
  emphasis,
}: {
  label: string;
  value: string;
  divider?: boolean;
  emphasis?: boolean;
}) {
  return (
    <View style={[styles.termRow, divider && styles.termRowDivider]}>
      <Text style={styles.termLabel}>{label}</Text>
      <Text style={[styles.termValue, emphasis && styles.termValueEmphasis]}>{value}</Text>
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
  eyebrow: { ...typography.labelSm, color: colors.secondary, textTransform: 'uppercase' },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    padding: space.lg,
    alignItems: 'center',
  },
  heroLabel: { ...typography.labelMd, color: colors.onSurfaceVariant },
  heroAmount: {
    fontSize: 40,
    lineHeight: 46,
    fontFamily: fontFamily.extraBold,
    color: colors.secondary,
    marginTop: 4,
  },
  heroSub: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4, textAlign: 'center' },

  sectionTitle: { ...typography.titleMd, color: colors.onSurface, marginTop: space.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },

  termRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    padding: space.sm,
  },
  termRowDivider: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  termLabel: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  termValue: { ...typography.titleMd, color: colors.onSurface },
  termValueEmphasis: { color: colors.critical },

  compareGrid: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  compareCol: { flex: 1 },
  compareColRight: { flex: 1, alignItems: 'flex-end' },
  compareLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  compareValue: { ...typography.headlineSm, fontFamily: fontFamily.extraBold, marginTop: 3 },
  compareCost: { color: colors.critical },
  compareGain: { color: colors.tertiary },
  compareVs: { ...typography.labelSm, color: colors.outline },
  verdictStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLow,
  },
  verdictText: { ...typography.bodySm, color: colors.onSurface, flex: 1, lineHeight: 18 },

  howBody: { ...typography.bodyMd, color: colors.onSurface, padding: space.md, lineHeight: 21 },
  disclaimer: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    lineHeight: 16,
    marginTop: space.xs,
  },

  noQuoteCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.lg,
    gap: 6,
  },
  noQuoteIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  noQuoteTitle: { ...typography.titleLg, color: colors.onSurface, textAlign: 'center' },
  noQuoteSub: { ...typography.bodySm, color: colors.onSurfaceVariant, textAlign: 'center', lineHeight: 19 },
});
