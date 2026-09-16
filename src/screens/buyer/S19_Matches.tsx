/**
 * S19 — the buyer's match list for one demand. Demo beat 9's setup: this is the
 * screen where a buyer sees that three smallholders together fill an order he
 * would otherwise have given a middleman.
 *
 * ★ Rebuilt to the approved Stitch design ("Buyer Console — जुळणी / Matched
 *   Lots Desk", project 7555855034687361132). What changed is the layout and
 *   the density: a trader's header, a live-auction strip, three counters he can
 *   act on, working filters, and lot cards that show whose crop it is next to
 *   what it costs. What did not change is which numbers are allowed on screen.
 *
 * ★ The rule that shaped every card. CANON §7.6 returns no price and no farmer
 *   on a match — it answers "which lots fill this order". The design shows
 *   both, because that is what a trader decides on. So `MatchDto` gained those
 *   fields as **optional**, the fixture supplies them, and this screen says in
 *   words that they are sample data (I8). When the server starts sending them
 *   the note disappears on its own; when the server omits them the cards
 *   degrade to exactly what they rendered before. Nothing is invented at
 *   runtime, ever. Filed for Akash in docs/BLOCKERS.md.
 *
 * ★ I16 borrowed, deliberately: the farmer's asking price and today's mandi
 *   rate render at the same size, in the same weight, side by side. The
 *   difference between them is the whole decision, and a design that made
 *   either one the hero would be arguing for one side of it.
 *
 * ★ The hero on a bundle is still `fill_bps`, and a bundle that leaves the
 *   order short still says so at the same size as the headline. A partial fill
 *   is outlined in crimson — the one colour this system reserves for risk.
 *
 * ★ Touched under Pranay's hand (app-lane lead, CLAUDE.md §1). Shreya owns the
 *   buyer screens; this is the approved design landing, not a freelance
 *   redesign.
 */

import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Icon } from '../../components/ui/Icon';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import { getDemands, getMatches } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatBps, formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { USE_FIXTURES } from '../../config';
import { fxDemand } from '../../fixtures/demands';
import { fxMatches } from '../../fixtures/matches';
import { colors, radius, space, touch, type } from '../../theme/tokens';
import type { DemandDto, Grade, Locale, MatchDto, MatchesRes } from '../../types/api';

/** The demo's demand. Same pattern as S22's `DEFAULT_TX_ID`. */
const DEFAULT_DEMAND_ID = fxDemand.id;

/** 10000 bps = the whole order (I3). */
const FULL_FILL_BPS = 10000;

/** The distance filter's one step, in km. */
const NEAR_KM = 25;

async function fetchMatches(demandId: string): Promise<MatchesRes> {
  if (USE_FIXTURES) return fxMatches;
  return getMatches(demandId);
}

/**
 * The demand behind the header line and the bid. CANON §7.6 has no
 * `GET /demands/{id}` — only the list — so it is found in the list, and a miss
 * degrades to "no demand line" rather than to an error, because the matches
 * themselves are still readable without it.
 */
async function fetchDemand(demandId: string): Promise<DemandDto | null> {
  const demands = USE_FIXTURES ? [fxDemand] : await getDemands();
  return demands.find(d => d.id === demandId) ?? null;
}

type GradeFilter = 'ALL' | Grade;

export function S19_Matches({
  demandId = DEFAULT_DEMAND_ID,
  onSelectOffer,
  onViewLot,
  traderName,
  marketName,
}: {
  demandId?: string;
  onSelectOffer?: (id: string) => void;
  /**
   * S20_LotDetail existed in this repo but nothing ever navigated to it.
   * Optional, so a caller that has not wired navigation yet still renders.
   */
  onViewLot?: (id: string) => void;
  /** Header identity. Omitted rather than faked when the caller has neither. */
  traderName?: string;
  marketName?: string;
}) {
  const [locale, setLocale] = useState<Locale>('mr');
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('ALL');
  const [nearOnly, setNearOnly] = useState(false);

  React.useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(key, locale, params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['demands', demandId, 'matches'],
    queryFn: () => fetchMatches(demandId),
  });

  // Additive — a failed demand lookup must not take the match list down with it.
  const { data: demand } = useQuery({
    queryKey: ['demands', demandId],
    queryFn: () => fetchDemand(demandId),
  });

  const all = useMemo(() => data?.matches ?? [], [data]);

  const visible = useMemo(
    () =>
      all.filter(
        match =>
          (gradeFilter === 'ALL' || match.grade === gradeFilter) &&
          (!nearOnly || match.distance_km <= NEAR_KM),
      ),
    [all, gradeFilter, nearOnly],
  );

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={64} />
        <View style={styles.gap} />
        <Skeleton height={190} />
        <View style={styles.gap} />
        <Skeleton height={190} />
      </ScrollView>
    );
  }

  // P11: `error && !data`. A match list held from an earlier read is still a
  // useful match list; a failed refetch on venue wifi must not replace it with a
  // retry button while a buyer is mid-decision.
  if (error && !data) {
    return (
      <ErrorState message={t('matches_fetch_error')} onRetry={() => refetch()} locale={locale} />
    );
  }

  if (all.length === 0) {
    return (
      <View style={[styles.container, styles.content]}>
        <EmptyState title={t('matches_empty')} />
      </View>
    );
  }

  const totalQtl = all.reduce((sum, m) => sum + toQuintal(m.total_qty_kg), 0);
  // Rendered only when the fixture (or a future server) actually supplies the
  // buyer-facing detail — the note is the honest half of showing it.
  const hasSampleDetail = all.some(m => m.farmer_label !== undefined);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {traderName || marketName ? (
        <View style={styles.traderLine}>
          <Icon name="building" size={15} color={colors.onSurfaceVariant} />
          <Text style={styles.traderText} numberOfLines={1}>
            {traderName && marketName
              ? t('bm_trader_line', { name: traderName, market: marketName })
              : traderName ?? marketName ?? ''}
          </Text>
        </View>
      ) : null}

      {marketName ? (
        <View style={styles.liveStrip}>
          <View style={styles.liveLeft}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText} numberOfLines={1}>
              {t('bm_auction_live', { market: marketName })}
            </Text>
          </View>
          <View style={styles.escrowPill}>
            <Icon name="lock" size={13} color={colors.onPositiveContainer} />
            <Text style={styles.escrowText}>{t('bm_escrow_badge')}</Text>
          </View>
        </View>
      ) : null}

      {/* Three counters, every one of them derived from the rows below. There
          is deliberately no "escrow held" tile: this screen has no transaction
          data, and a figure with nothing behind it is the one thing a trading
          screen must never show. */}
      <View style={styles.tiles}>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>{t('bm_tile_matches')}</Text>
          <Text style={styles.tileValue}>{formatNumber(all.length, locale)}</Text>
        </View>
        <View style={styles.tile}>
          <Text style={styles.tileLabel}>{t('total_qty_label')}</Text>
          <Text style={styles.tileValue}>{formatNumber(totalQtl, locale)}</Text>
        </View>
        {demand ? (
          <View style={styles.tile}>
            <Text style={styles.tileLabel}>{t('matches_your_bid_label')}</Text>
            <Text style={styles.tileValueMoney}>
              {formatPaise(demand.bid_paise_per_qtl, locale)}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Working filters, not decoration: each one narrows the real list. */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}>
        {(['ALL', 'A', 'B', 'C'] as const).map(g => {
          const active = gradeFilter === g;
          return (
            <Pressable
              key={g}
              onPress={() => setGradeFilter(g)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.filterChip, active && styles.filterChipActive]}>
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {g === 'ALL' ? t('bm_filter_all_grades') : t('post_demand_grade_chip', { grade: g })}
              </Text>
            </Pressable>
          );
        })}
        <Pressable
          onPress={() => setNearOnly(v => !v)}
          accessibilityRole="button"
          accessibilityState={{ selected: nearOnly }}
          style={[styles.filterChip, nearOnly && styles.filterChipActive]}>
          <Text style={[styles.filterText, nearOnly && styles.filterTextActive]}>
            {t('bm_filter_within_km', { km: formatNumber(NEAR_KM, locale) })}
          </Text>
        </Pressable>
      </ScrollView>

      {visible.length === 0 ? (
        <View style={styles.filteredEmpty}>
          <EmptyState title={t('matches_empty')} />
        </View>
      ) : (
        visible.map(match => (
          <MatchCard
            key={matchKey(match)}
            match={match}
            demandQtyKg={demand?.qty_kg ?? null}
            locale={locale}
            onSelectOffer={onSelectOffer}
            onViewLot={onViewLot}
          />
        ))
      )}

      {hasSampleDetail ? <Text style={styles.sampleNote}>{t('bm_sample_note')}</Text> : null}
    </ScrollView>
  );
}

/** Stable across reorders without an `id` the contract does not give us. */
const matchKey = (match: MatchDto): string =>
  `${match.kind}:${match.lots.map(l => l.lot_id).join('+')}`;

function MatchCard({
  match,
  demandQtyKg,
  locale,
  onSelectOffer,
  onViewLot,
}: {
  match: MatchDto;
  demandQtyKg: number | null;
  locale: Locale;
  // `exactOptionalPropertyTypes` is on, and these are forwarded straight from
  // props that may genuinely be `undefined`.
  onSelectOffer?: ((id: string) => void) | undefined;
  onViewLot?: ((id: string) => void) | undefined;
}) {
  const t = (key: string, params?: Record<string, string | number>) =>
    translate(key, locale, params);

  const isPartial = match.fill_bps < FULL_FILL_BPS;
  const shortfallKg = demandQtyKg === null ? null : Math.max(0, demandQtyKg - match.total_qty_kg);
  const qtl = toQuintal(match.total_qty_kg);
  const firstLot = match.lots[0];

  const asking = match.asking_paise_per_qtl;
  const marketRate = match.market_paise_per_qtl;
  const diff = asking !== undefined && marketRate !== undefined ? asking - marketRate : null;

  return (
    <View style={[styles.card, isPartial && styles.cardPartial]}>
      {/* Card head — the lot's identity and whether its grade was measured. */}
      <View style={styles.cardHead}>
        <View style={styles.cardHeadLeft}>
          <View style={styles.refChip}>
            <Text style={styles.refText}>
              {t('bm_lot_ref', { ref: match.lot_ref ?? firstLot?.lot_id ?? '—' })}
            </Text>
          </View>
          <Badge
            label={
              match.kind === 'COMBINATION'
                ? t('matches_combination_bundle', { n: formatNumber(match.lots.length, locale) })
                : t('matches_single_lot')
            }
            type={match.kind === 'COMBINATION' ? 'INFO' : 'SUCCESS'}
          />
        </View>
        <View style={styles.cardHeadRight}>
          {match.assayed ? (
            <View style={styles.assayChip}>
              <Icon name="check" size={12} color={colors.onPositiveContainer} />
              <Text style={styles.assayText}>{t('bm_verified_assay')}</Text>
            </View>
          ) : null}
          <Badge label={t('post_demand_grade_chip', { grade: match.grade })} type={`GRADE_${match.grade}`} />
        </View>
      </View>

      {/* Who and where. Renders only from fields that actually arrived. */}
      {match.farmer_label ? (
        <View style={styles.farmerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{match.farmer_label.slice(0, 1)}</Text>
          </View>
          <View style={styles.farmerBody}>
            <Text style={styles.farmerName} numberOfLines={1}>
              {match.farmer_label}
            </Text>
            <Text style={styles.farmerMeta} numberOfLines={1}>
              {match.village
                ? t('bm_farmer_distance', {
                    village: match.village,
                    km: formatNumber(match.distance_km, locale),
                  })
                : t('distance_km_line', { distance: formatNumber(match.distance_km, locale) })}
            </Text>
          </View>
        </View>
      ) : (
        <Text style={styles.metaText}>
          {t('distance_km_line', { distance: formatNumber(match.distance_km, locale) })}
        </Text>
      )}

      <View style={styles.qtyRow}>
        <Icon name="box" size={16} color={colors.onSurfaceVariant} />
        <Text style={styles.qtyText}>
          {match.bags !== undefined
            ? t('bm_qty_bags', {
                qty: formatNumber(qtl, locale),
                bags: formatNumber(match.bags, locale),
              })
            : t('total_qty_line', { qty: formatNumber(qtl, locale) })}
        </Text>
        {match.moisture_pct !== undefined ? (
          <View style={styles.moistureChip}>
            <Text style={styles.moistureText}>
              {t('bm_moisture', { pct: formatNumber(match.moisture_pct, locale) })}
            </Text>
          </View>
        ) : null}
      </View>

      {/*
        The decision, and the reason this screen exists. Both figures are the
        same size and the same weight; only the label distinguishes them. I16's
        rule, applied to the buyer's side of the same trade.
      */}
      {asking !== undefined && marketRate !== undefined ? (
        <View style={styles.priceBlock}>
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>{t('bm_asking')}</Text>
            <Text style={styles.priceValue}>{formatPaise(asking, locale)}</Text>
            <Text style={styles.priceSub}>
              {t('bm_total_value', {
                total: formatPaise(Math.round(asking * qtl), locale),
              })}
            </Text>
          </View>
          <View style={styles.priceDivider} />
          <View style={styles.priceCell}>
            <Text style={styles.priceLabel}>{t('bm_market_rate')}</Text>
            <Text style={styles.priceValue}>{formatPaise(marketRate, locale)}</Text>
            {diff === null || diff === 0 ? null : (
              <Text style={[styles.priceSub, diff > 0 ? styles.diffAbove : styles.diffBelow]}>
                {diff > 0
                  ? t('bm_diff_above', { diff: formatPaise(diff, locale) })
                  : t('bm_diff_below', { diff: formatPaise(-diff, locale) })}
              </Text>
            )}
          </View>
        </View>
      ) : null}

      {/* The hero on a bundle is still how much of the order it fills. */}
      <View style={styles.fillRow}>
        <Text style={styles.fillNum}>{formatBps(match.fill_bps, locale)}</Text>
        <Text style={styles.fillLabel}>{t('matches_fill_label')}</Text>
      </View>

      {isPartial && shortfallKg !== null && shortfallKg > 0 ? (
        <Text style={styles.shortfallNote}>
          {t('matches_partial_fill_note', { qty: formatNumber(toQuintal(shortfallKg), locale) })}
        </Text>
      ) : null}

      {match.pickup_at_farm ? (
        <View style={styles.pickupRow}>
          <Icon name="truck" size={15} color={colors.positiveSolid} />
          <Text style={styles.pickupText}>{t('bm_pickup')}</Text>
        </View>
      ) : null}

      {/*
        CANON §7.6: "`score` must decompose. The UI shows the `why_*` sentence.
        'Because the algorithm said so' is not an answer a judge accepts." So the
        sentence renders and the raw 0.91 does not.
      */}
      <Text style={styles.reasonText}>{locale === 'en' ? match.why_en : match.why_mr}</Text>

      <View style={styles.actions}>
        {onViewLot && match.lots.length === 1 && firstLot ? (
          <Pressable
            onPress={() => onViewLot(firstLot.lot_id)}
            accessibilityRole="button"
            style={({ pressed }) => [styles.secondaryAction, pressed && styles.actionPressed]}>
            <Icon name="eye" size={17} color={colors.primary} />
            <Text style={styles.secondaryActionText}>{t('bm_view_detail')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={() => onSelectOffer?.(matchKey(match))}
          accessibilityRole="button"
          style={({ pressed }) => [styles.primaryAction, pressed && styles.primaryActionPressed]}>
          <Icon name="tag" size={17} color={colors.onPrimary} />
          <Text style={styles.primaryActionText}>{t('bm_make_offer')}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.md, paddingBottom: space.xxl },
  gap: { height: space.sm },

  traderLine: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2 },
  traderText: { ...type.labelMd, color: colors.onSurfaceVariant, flex: 1 },

  liveStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    marginTop: space.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  liveLeft: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flex: 1 },
  liveDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.positiveSolid },
  liveText: { ...type.titleMd, color: colors.onSurface, flex: 1 },
  escrowPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.full,
    paddingHorizontal: space.xs,
    paddingVertical: 3,
  },
  escrowText: { ...type.labelSm, color: colors.onPositiveContainer },

  tiles: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  tile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs + 2,
  },
  tileLabel: { ...type.labelSm, color: colors.onSurfaceVariant },
  tileValue: { ...type.numeralData, color: colors.onSurface, marginTop: 2 },
  tileValueMoney: { ...type.titleLg, color: colors.primary, marginTop: 2 },

  filterRow: { gap: space.xs, paddingVertical: space.sm, paddingRight: space.md },
  filterChip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
    minHeight: 38,
    justifyContent: 'center',
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { ...type.labelMd, color: colors.onSurfaceVariant },
  filterTextActive: { color: colors.onPrimary },
  filteredEmpty: { paddingVertical: space.lg },

  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: space.md,
    marginBottom: space.sm,
  },
  // A bundle that leaves the order short is outlined, not hidden — same visual
  // language S16 uses for the pool that must not form.
  cardPartial: { borderWidth: 1.5, borderColor: colors.criticalSolid },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    paddingBottom: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderCard,
  },
  cardHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexShrink: 1 },
  cardHeadRight: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  refChip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  refText: { ...type.labelSm, color: colors.onSurfaceVariant },
  assayChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  assayText: { ...type.labelSm, color: colors.onPositiveContainer },

  farmerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    padding: space.xs,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { ...type.titleMd, color: colors.primary },
  farmerBody: { flex: 1 },
  farmerName: { ...type.titleMd, color: colors.onSurface },
  farmerMeta: { ...type.bodySm, color: colors.onSurfaceVariant },

  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.sm, flexWrap: 'wrap' },
  qtyText: { ...type.titleMd, color: colors.onSurface },
  metaText: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: space.xs },
  moistureChip: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  moistureText: { ...type.labelSm, color: colors.onSurfaceVariant },

  priceBlock: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingVertical: space.xs,
  },
  priceCell: { flex: 1, alignItems: 'center', paddingHorizontal: space.xs },
  priceDivider: { width: 1, backgroundColor: colors.borderCard },
  priceLabel: { ...type.labelSm, color: colors.onSurfaceVariant, textAlign: 'center' },
  // ★ Identical for both figures. This is the I16 rule: the two numbers a
  //   decision sits between must be the same size, or the design has chosen
  //   for the reader.
  priceValue: { ...type.numeralData, color: colors.onSurface, marginTop: 2 },
  priceSub: { ...type.labelSm, color: colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  diffAbove: { color: colors.criticalSolid },
  diffBelow: { color: colors.positiveSolid },

  fillRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.sm },
  fillNum: { ...type.numeralHero, color: colors.positiveSolid },
  fillLabel: { ...type.bodyLg, color: colors.onSurfaceVariant },
  shortfallNote: { ...type.bodyLg, color: colors.criticalSolid, marginTop: space.xxs },

  pickupRow: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, marginTop: space.xs },
  pickupText: { ...type.bodySm, color: colors.positiveSolid },

  reasonText: {
    ...type.bodySm,
    color: colors.onPositiveContainer,
    marginTop: space.sm,
    backgroundColor: colors.positiveContainer,
    padding: space.xs + 2,
    borderRadius: radius.md,
  },

  actions: { flexDirection: 'row', gap: space.xs, marginTop: space.sm },
  secondaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs + 2,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  secondaryActionText: { ...type.titleMd, color: colors.primary },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xxs + 2,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  primaryActionPressed: { backgroundColor: colors.primary },
  actionPressed: { backgroundColor: colors.surfaceContainerLow },
  primaryActionText: { ...type.titleMd, color: colors.onPrimary },

  sampleNote: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: space.sm,
  },
});
