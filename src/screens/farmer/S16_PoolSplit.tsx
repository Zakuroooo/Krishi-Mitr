/**
 * S16 — FPO grade-weighted split. Demo beat 10: "three farmers, split by
 * quantity and grade, adding to exactly 100%, and no pool forms if any
 * member would do worse alone."
 *
 * ★ CANON §10, read-only in Phase 1 — "Phase 1 ships this as seeded rows +
 *   one read-only screen. The arithmetic must be genuinely correct in the
 *   seed. The *forming* flow and live consent are Phase 2." This screen does
 *   not let anyone form a pool, consent, or edit a split — it renders one.
 *
 * ★ The Pareto guard (CANON §10): "if any member's pooled share is worth
 *   less than selling their lot alone (vs_solo_paise < 0), the pool does not
 *   form and the UI says why." `!all_consented` plus a negative
 *   `vs_solo_paise` on some member is rendered as a real, named state — not
 *   hidden, not softened — because "a pooling mechanism that can quietly
 *   harm a member is exactly what FPOs are distrusted for" (CANON's own
 *   words).
 *
 * ★ `share_bps` sums to exactly 10000 by construction (CANON §10's rounding
 *   remainder goes to the largest weight) — rendered as a percentage per
 *   member, and the sum is shown too, so "adding to exactly 100%" is
 *   something a judge can check by eye, not just trust.
 */

import React, { useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { getPool } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatBps, formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { USE_FIXTURES } from '../../config';
import { fxPool, fxPoolParetoViolation } from '../../fixtures/pools';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { Locale, PoolDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S16_PoolSplit'>;

const DEFAULT_POOL_ID = 'fpo_1';
const PARETO_DEMO_POOL_ID = 'fpo_2';

async function fetchPool(poolId: string): Promise<PoolDto> {
  if (USE_FIXTURES) {
    return poolId === PARETO_DEMO_POOL_ID ? fxPoolParetoViolation : fxPool;
  }
  return getPool(poolId);
}

const CONSENT_LABEL_KEY: Record<'true' | 'false' | 'null', string> = {
  true: 'consent_agreed',
  false: 'consent_refused',
  null: 'consent_not_asked',
};

function consentLabel(consented: boolean | null, locale: Locale): string {
  return translate(CONSENT_LABEL_KEY[String(consented) as 'true' | 'false' | 'null'], locale);
}

export default function S16_PoolSplit({ route }: Props) {
  const poolId = route.params?.pool_id ?? DEFAULT_POOL_ID;

  const [locale, setLocale] = useState<Locale>('mr');
  useFocusEffect(
    React.useCallback(() => {
      getLocale().then(l => l && setLocale(l));
    }, []),
  );

  const { data: pool, isLoading, error, refetch } = useQuery({
    queryKey: ['pools', poolId],
    queryFn: () => fetchPool(poolId),
  });

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.root}>
        <Skeleton height={300} />
      </ScrollView>
    );
  }

  // P11: `error && !pool`, not a bare `error` — same rule as S4/S7/S9. A pool
  // split is the same rows every time it is read; a failed refetch is no
  // reason to hide a split the cache is still holding.
  if (error && !pool) {
    return <ErrorState message={translate('pool_fetch_error', locale)} onRetry={() => refetch()} />;
  }

  if (!pool || pool.members.length === 0) {
    return <EmptyState title={translate('pool_empty', locale)} />;
  }

  const shareSumBps = pool.members.reduce((sum, m) => sum + m.share_bps, 0);
  const paretoViolators = pool.members.filter(m => m.vs_solo_paise < 0);
  const poolForms = paretoViolators.length === 0;

  return (
    <ScrollView contentContainerStyle={styles.root}>
      {/* ★ `name_mr` is a fixed wire field, not a localised one, so rendering
          it directly put Devanagari inside an English screen. Same rule the
          market and district names already follow: pick by locale. */}
      <Text style={styles.header}>{locale === 'en' ? pool.fpo.name : pool.fpo.name_mr}</Text>
      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLine}>
          {translate('total_qty_line', locale, { qty: formatNumber(toQuintal(pool.total_qty_kg), locale) })}
        </Text>
        <Text style={styles.summaryLine}>
          {translate('avg_score_line', locale, {
            score: formatNumber(pool.avg_score, locale),
            max: formatNumber(1000, locale),
          })}
        </Text>
        <Text style={styles.summaryLine}>
          {translate('total_share_line', locale, {
            share: formatBps(shareSumBps, locale),
            members: formatNumber(pool.members.length, locale),
          })}
        </Text>
      </Card>

      {!poolForms ? (
        <Card style={styles.paretoBanner}>
          <Text style={styles.paretoTitle}>{translate('pool_wont_form_title', locale)}</Text>
          <Text style={styles.paretoBody}>{translate('pool_wont_form_body', locale)}</Text>
        </Card>
      ) : null}

      {pool.members.map(member => {
        const violates = member.vs_solo_paise < 0;
        return (
          <Card
            key={member.lot_id}
            style={violates ? [styles.memberCard, styles.memberCardViolation] : styles.memberCard}>
            <View style={styles.memberHeaderRow}>
              <Text style={styles.memberName}>{member.farmer_name}</Text>
              <Text style={styles.memberShare}>{formatBps(member.share_bps, locale)}</Text>
            </View>
            <Text style={styles.memberLine}>
              {translate('member_qty_score_line', locale, {
                qty: formatNumber(toQuintal(member.qty_kg), locale),
                score: formatNumber(member.score_at_pool, locale),
              })}
            </Text>
            <Text style={styles.memberLine}>
              {translate('member_weight_line', locale, { weight: formatNumber(member.weight, locale) })}
            </Text>
            <Text style={[styles.memberVsSolo, violates && styles.memberVsSoloNegative]}>
              {translate('vs_solo_line', locale, { value: formatPaise(member.vs_solo_paise, locale) })}
              {translate(violates ? 'vs_solo_loss_suffix' : 'vs_solo_gain_suffix', locale)}
            </Text>
            <Text style={styles.memberConsent}>{consentLabel(member.consented, locale)}</Text>
          </Card>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: space.md, paddingBottom: space.xxl, backgroundColor: colors.background },
  header: { ...typography.headlineMd, color: colors.onSurface, fontFamily: fontFamily.extraBold, marginBottom: space.sm },
  summaryCard: { padding: 16, marginBottom: 16 },
  summaryLine: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  paretoBanner: {
    padding: 16,
    marginBottom: 16,
    backgroundColor: colors.criticalContainer,
    borderWidth: 1,
    borderColor: colors.critical,
  },
  paretoTitle: { ...typography.titleLg, color: colors.onCriticalContainer, fontFamily: fontFamily.extraBold },
  paretoBody: { ...typography.bodySm, color: colors.onCriticalContainer, marginTop: 6, lineHeight: 19 },
  memberCard: { padding: 16, marginBottom: 12 },
  memberCardViolation: { borderWidth: 1.5, borderColor: colors.critical },
  memberHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  memberName: { ...typography.titleLg, color: colors.onSurface },
  memberShare: { ...typography.titleLg, color: colors.tertiary, fontFamily: fontFamily.extraBold },
  memberLine: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  memberVsSolo: { ...typography.titleMd, color: colors.tertiary, marginTop: space.xs },
  memberVsSoloNegative: { color: colors.critical },
  memberConsent: { ...typography.labelSm, color: colors.outline, marginTop: 4 },
});
