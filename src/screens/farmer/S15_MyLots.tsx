/**
 * S15 — My Lots. The list P9's other screens have been missing an entry point
 * from: S12 creates a lot and S13 scores one, but until now neither could be
 * reached except by going through the other first, and a farmer with lots
 * already on file had nowhere to see them.
 *
 * ★ CLAUDE.md §9: "Judges click the second thing. Every screen needs a real
 *   empty state." A farmer with zero lots gets Marathi text and the same
 *   create button as the header, not a blank list.
 *
 * ★ I2: `LotDto.qty_kg` is stored in kg and **displayed in quintals**, floored
 *   via `formatQuintal` — never a raw kg number on screen, and a part
 *   quintal is shown rather than quietly floored away.
 *
 * ★ `LotDto.grade` is `LotGrade` (four values, including `UNGRADED`), not
 *   `Grade` (three). An ungraded lot must read as "not yet assessed", not
 *   render blank or be mistaken for a low grade — collapsing the two is the
 *   exact bug `types/api.ts` warns about.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { getLots } from '../../lib/api';
import { translate } from '../../lib/i18n';
import { formatDate } from '../../lib/dates';
import { formatNumber, formatQuintal } from '../../lib/money';
import { FIXTURE_LOTS_EMPTY, USE_FIXTURES } from '../../config';
import { fxMyLots, fxMyLotsEmpty } from '../../fixtures/lots';
import { fxPool } from '../../fixtures/pools';
import { ListenButton } from '../../components/ui/ListenButton';
import { Badge } from '../../components/ui/Badge';
import type { BadgeType } from '../../components/ui/Badge';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { LotDto, LotGrade, LotStatus, Locale } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S15_MyLots'>;

/**
 * Same values `S13_SelfAssay`'s `GRADE_BADGE` uses for `A`/`B`/`C`, plus
 * `UNGRADED`, which `Grade` (S13's three-value type) has no slot for at all.
 * Not imported from S13 — this task's diff is scoped to this file,
 * `FarmerTabs.tsx` and `fixtures/lots.ts` only — so the three shared values
 * are restated here rather than adding an export to a file outside that
 * scope. If S13 ever changes its palette, change it here too.
 */
const GRADE_BADGE: Record<LotGrade, BadgeType> = {
  A: 'GRADE_A',
  B: 'GRADE_B',
  C: 'GRADE_C',
  UNGRADED: 'INFO',
};

const GRADE_LABEL_KEY: Record<LotGrade, string> = {
  A: 'lot_grade_a',
  B: 'lot_grade_b',
  C: 'lot_grade_c',
  UNGRADED: 'lot_grade_ungraded',
};

/** Every `LotStatus` value — dictionary keys, not text. S15 is a
 * farmer-facing screen and none of these nine values may reach the screen
 * untranslated in whatever locale is selected. */
const STATUS_LABEL_KEY: Record<LotStatus, string> = {
  DRAFT: 'lot_status_draft',
  LISTED: 'lot_status_listed',
  POOLED: 'lot_status_pooled',
  OFFERED: 'lot_status_offered',
  COMMITTED: 'lot_status_committed',
  IN_TRANSIT: 'lot_status_in_transit',
  DELIVERED: 'lot_status_delivered',
  SETTLED: 'lot_status_settled',
  CANCELLED: 'lot_status_cancelled',
};

/**
 * No commodity/market picker or reference-data screen exists yet (same gap
 * `S04_Home` notes for its own hardcoded commodity/market label). This
 * repo's fixtures use both `'onion'`/`'cmd_onion'` for the same commodity
 * across different commits — both map here rather than one of them
 * rendering blank. Dictionary keys, not text, so this respects locale too.
 */
const COMMODITY_NAME_KEY: Record<string, string> = {
  onion: 'demo_commodity_name',
  cmd_onion: 'demo_commodity_name',
};
const MARKET_NAME_KEY: Record<string, string> = {
  mkt_lasalgaon: 'market_lasalgaon',
  mkt_pune: 'market_pune',
  mkt_nagpur: 'market_nagpur',
};

/** A mandi gunny bag is 50 kg, so quintals map to bags at 2:1. Derived, not
 * a stored field — `LotDto` carries kilograms and nothing else. */
const KG_PER_BAG = 50;

/** Stitch 15's three benefit rows. Copy lives in the dictionaries; this is
 * only the order and the icon for each. */
const FEATURES: Array<{
  titleKey: string;
  subKey: string;
  badgeKey: string;
  icon: Parameters<typeof Icon>[0]['name'];
}> = [
  { titleKey: 'produce_feat1_title', subKey: 'produce_feat1_sub', badgeKey: 'produce_feat1_badge', icon: 'handshake' },
  { titleKey: 'produce_feat2_title', subKey: 'produce_feat2_sub', badgeKey: 'produce_feat2_badge', icon: 'clipboard' },
  { titleKey: 'produce_feat3_title', subKey: 'produce_feat3_sub', badgeKey: 'produce_feat3_badge', icon: 'shield-check' },
];

async function fetchLots(): Promise<LotDto[]> {
  if (USE_FIXTURES) return FIXTURE_LOTS_EMPTY ? fxMyLotsEmpty : fxMyLots;
  return getLots();
}

/**
 * TODO(akash): no "list my pools" endpoint, only `GET /pools/{id}`.
 * Fixtures stand in until one exists.
 */
async function fetchMyPools() {
  if (USE_FIXTURES) return [fxPool];
  return [];
}

function commodityMarketLabel(lot: LotDto, locale: Locale): string {
  const commodityKey = COMMODITY_NAME_KEY[lot.commodity_id];
  const marketKey = MARKET_NAME_KEY[lot.market_id];
  const commodity = commodityKey ? translate(commodityKey, locale) : lot.commodity_id;
  const market = marketKey ? translate(marketKey, locale) : lot.market_id;
  return `${commodity} · ${market}`;
}

function harvestDateLabel(lot: LotDto, locale: Locale): string {
  // `formatDate` (lib/dates.ts), not `devNum` — `devNum` only translates the
  // digits, so `2026-08-28` came out as `२०२६-०८-२८`: ISO order in Devanagari
  // numerals, which is a wire format in costume and not a date anyone reads.
  return formatDate(lot.harvest_date, locale, translate('harvest_date_missing', locale));
}

export default function S15_MyLots({ navigation }: Props) {
  const { t, locale } = useT();

  const { data: lots, isLoading, error, refetch } = useQuery({
    queryKey: ['lots'],
    queryFn: fetchLots,
  });

  const { data: myPools } = useQuery({
    queryKey: ['pools', 'mine'],
    queryFn: fetchMyPools,
  });

  const goCreateLot = () => navigation.navigate('S17_CameraGuide');

  /* ★ The speaker reads the screen: how many lots and how much produce in
     total, then each lot with its grade, then how many buyers are waiting on
     a reply. Every value comes from the same query the card renders. */
  const narration = (() => {
    const list = lots ?? [];
    if (list.length === 0) return t('mp_empty_title');
    const kg = list.reduce((sum, l) => sum + l.qty_kg, 0);
    const parts = [
      t('mp_narr_summary', {
        n: formatNumber(list.length, locale),
        qty: formatQuintal(kg, locale),
      }),
      ...list.map(l =>
        t('mp_narr_lot', {
          qty: formatQuintal(l.qty_kg, locale),
          grade: t(`lot_grade_${l.grade.toLowerCase()}`),
        }),
      ),
    ];
    /* No offer count here any more — offers belong to Talks, and a
       narration that mentioned them would send a farmer looking for a
       section this screen no longer has. */
    return parts.join(' ');
  })();

  const header = (
    <View style={styles.topBar}>
      <View style={styles.topBarIcon}>
        <Icon name="box" size={18} color={colors.primary} />
      </View>
      <View style={styles.topBarText}>
        <Text style={styles.topBarTitle}>{t('mp_title')}</Text>
        <Text style={styles.topBarSub}>{t('produce_empty_cycle')}</Text>
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scrollContent}>
          <Skeleton height={96} />
          <View style={{ height: space.sm }} />
          <Skeleton height={140} />
          <View style={{ height: space.sm }} />
          <Skeleton height={140} />
        </View>
      </View>
    );
  }

  // P11: `error && !lots`, not a bare `error` — same rule as S4/S7/S9. A
  // farmer's own lot list is the screen he lands on; a failed background
  // refetch must not replace lots the cache is still holding with a retry
  // button. The empty state below still handles a genuinely empty list.
  if (error && !lots) {
    return <ErrorState message={t('lots_fetch_error')} onRetry={() => refetch()} />;
  }

  // ── Stitch 15: the empty state is a real screen, not a shrug ─────────
  if (!lots || lots.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <Text style={styles.emptyHeading}>{t('produce_empty_heading')}</Text>
          <Text style={styles.emptySub}>{t('lots_empty_description')}</Text>

          <View style={styles.whyHeadRow}>
            <Text style={styles.sectionTitle}>{t('produce_why_title')}</Text>
            <Text style={styles.whyFarmer}>{t('produce_why_farmer')}</Text>
          </View>

          {FEATURES.map(f => (
            <View key={f.titleKey} style={styles.featureCard}>
              <View style={styles.featureIconBox}>
                <Icon name={f.icon} size={20} color={colors.primary} />
              </View>
              <View style={styles.featureText}>
                <View style={styles.featureTitleRow}>
                  <Text style={styles.featureTitle}>{t(f.titleKey)}</Text>
                  <View style={styles.featureBadge}>
                    <Text style={styles.featureBadgeText}>{t(f.badgeKey)}</Text>
                  </View>
                </View>
                <Text style={styles.featureSub}>{t(f.subKey)}</Text>
              </View>
            </View>
          ))}

          <View style={styles.helpCard}>
            <View style={styles.helpIconBox}>
              <Icon name="info" size={17} color={colors.primary} />
            </View>
            <View style={styles.featureText}>
              <Text style={styles.helpTitle}>{t('produce_help_title')}</Text>
              <Text style={styles.featureSub}>{t('produce_help_sub')}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.heroCta} onPress={goCreateLot} accessibilityRole="button">
            <View style={styles.heroCtaPlus}>
              <Icon name="plus" size={18} color={colors.onPrimary} />
            </View>
            <View style={styles.heroCtaText}>
              <Text style={styles.heroCtaTitle}>{t('produce_cta_list')}</Text>
              <Text style={styles.heroCtaSub}>{t('produce_cta_sub')}</Text>
            </View>
            <Icon name="arrow-right" size={20} color={colors.onPrimary} />
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ── Stitch 16: the active state ─────────────────────────────────────
  // Both stats are summed from the lots actually on screen. The mockup's
  // "Estimated Realization ₹1,34,500" is not here: `LotDto` carries no asking
  // price and no offer, so a rupee total for this list would be a number this
  // app invented. Quantity it does know, so quantity is what it shows.
  const totalKg = lots.reduce((sum, l) => sum + l.qty_kg, 0);
  /* ★ Not `toQuintal`. Flooring here put "100 qtl" beside "201 bags of
     50 kg" from the same 10,050 kg — both numbers correct, the pair
     nonsense. `formatQuintal` says 100.5 and the two agree again. */
  const totalQtl = formatQuintal(totalKg, locale);
  const bags = Math.floor(totalKg / KG_PER_BAG);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.summaryLabel}>{t('mp_summary_label')}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('mp_stat_lots')}</Text>
            <Text style={styles.statValue}>{formatNumber(lots.length, locale)}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>{t('mp_stat_quantity')}</Text>
            <Text style={styles.statValue}>
              {t('mp_qtl_unit', { qty: totalQtl })}
            </Text>
            <Text style={styles.statSub}>{t('mp_bags_note', { bags: formatNumber(bags, locale) })}</Text>
          </View>
        </View>

        {lots.map(item => (
          <TouchableOpacity
            key={item.id}
            style={styles.lotCard}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('S20_QualityDiagnostic', { lot_id: item.id })}>
            <View style={styles.lotCardHead}>
              <View style={styles.lotRefChip}>
                <Text style={styles.lotRefChipText}>{t('mp_lot_ref', { id: item.id })}</Text>
              </View>
              <View style={styles.lotStatusChip}>
                <Text style={styles.lotStatusChipText}>{t(STATUS_LABEL_KEY[item.status])}</Text>
              </View>
            </View>

            <View style={styles.lotBody}>
              <View style={styles.lotBodyText}>
                <Text style={styles.lotTitle}>{commodityMarketLabel(item, locale)}</Text>
                <Text style={styles.lotMeta}>
                  {t('qty_label_value', { qty: formatQuintal(item.qty_kg, locale) })}
                </Text>
                <Text style={styles.lotMeta}>
                  {t('mp_harvest', { date: harvestDateLabel(item, locale) })}
                </Text>
              </View>
              <View style={styles.lotGradeCol}>
                <Badge
                  label={t(GRADE_LABEL_KEY[item.grade])}
                  type={GRADE_BADGE[item.grade]}
                />
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <TouchableOpacity style={styles.addLotCard} onPress={goCreateLot} accessibilityRole="button">
          <View style={styles.addLotIconBox}>
            <Icon name="plus" size={20} color={colors.primary} />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.addLotTitle}>{t('mp_add_another')}</Text>
            <Text style={styles.featureSub}>{t('mp_add_another_sub')}</Text>
          </View>
          <Icon name="chevron-right" size={18} color={colors.outline} />
        </TouchableOpacity>

        {/* ★ "Offers waiting on you" and "My transactions" used to sit here.
            Both are gone, and the reason is the flow rather than the space:
            an offer is a negotiation and lives in Talks, a transaction is a
            deal and lives in Deals — each already has a footer tab of its
            own. Repeating them at the bottom of My Produce gave a farmer
            three doors to the same room and no way to tell which one was
            current. My Produce is the lots. */}

        {myPools && myPools.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>{t('mp_pools_header')}</Text>
            {myPools.map(pool => (
              <TouchableOpacity
                key={pool.fpo.id}
                style={styles.rowCard}
                onPress={() => navigation.navigate('S16_PoolSplit', { pool_id: pool.fpo.id })}>
                <View style={styles.featureText}>
                  {/* ★ `name_mr` is a fixed wire field, not a localised one, so rendering
                      it directly put Devanagari inside an English screen. Same rule the
                      market and district names already follow: pick by locale. */}
                  <Text style={styles.rowCardTitle}>{locale === 'en' ? pool.fpo.name : pool.fpo.name_mr}</Text>
                  <Text style={styles.lotMeta}>
                    {t('pool_summary_line', {
                      qty: formatQuintal(pool.total_qty_kg, locale),
                      members: formatNumber(pool.members.length, locale),
                    })}
                  </Text>
                </View>
                <Text style={styles.rowCardAction}>{t('view_share_link')}</Text>
              </TouchableOpacity>
            ))}
          </>
        ) : null}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  topBar: {
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
  topBarIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarText: { flex: 1 },
  topBarTitle: { ...typography.titleLg, color: colors.onSurface },
  topBarSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scrollContent: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  emptyHeading: { ...typography.displayLg, color: colors.onSurface },
  emptySub: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: -4 },

  whyHeadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xs,
  },
  sectionTitle: { ...typography.titleLg, color: colors.onSurface, marginTop: space.xs },
  whyFarmer: { ...typography.labelSm, color: colors.primaryContainer },

  featureCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  featureIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: { flex: 1 },
  featureTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 },
  featureTitle: { ...typography.titleMd, color: colors.onSurface },
  featureBadge: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  featureBadgeText: { ...typography.labelSm, fontSize: 10, color: colors.onSurfaceVariant },
  featureSub: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },

  helpCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  helpIconBox: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpTitle: { ...typography.titleMd, color: colors.onSurface },

  heroCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.targetHero,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    marginTop: space.xs,
  },
  heroCtaPlus: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: { flex: 1 },
  heroCtaTitle: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
  heroCtaSub: { ...typography.labelSm, color: 'rgba(255,255,255,0.8)', fontFamily: fontFamily.medium },

  summaryLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, textTransform: 'uppercase' },
  statsRow: { flexDirection: 'row', gap: space.xs },
  statCard: {
    flex: 1,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  statLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  statValue: { ...typography.headlineMd, color: colors.onSurface, marginTop: 2 },
  statSub: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium, marginTop: 2 },

  lotCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },
  lotCardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  lotRefChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  lotRefChipText: { ...typography.labelSm, color: colors.onPrimary },
  lotStatusChip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.full,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  lotStatusChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  lotBody: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, padding: space.sm },
  lotBodyText: { flex: 1 },
  lotTitle: { ...typography.titleMd, color: colors.onSurface },
  lotMeta: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  lotGradeCol: { alignItems: 'flex-end' },

  addLotCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  addLotIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addLotTitle: { ...typography.titleMd, color: colors.primary },

  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  rowCardColumn: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  rowCardTitle: { ...typography.titleMd, color: colors.onSurface },
  rowCardAction: { ...typography.labelMd, color: colors.primary },
  txHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  txToggleHint: { ...typography.labelSm, color: colors.primary, marginTop: 6 },
  txExpanded: { marginTop: space.sm },
});
