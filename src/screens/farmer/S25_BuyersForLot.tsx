/**
 * S25 — the offers standing on one lot, ranked by what they actually pay.
 * Stitch `25_buyers_for_lot_ranked_net_offer_comparison`.
 *
 * ★ What this replaces, and why it had to be a rewrite rather than a restyle:
 *   the old screen ran no query at all. Its three buyers — "Nashik Agro
 *   Exports", "Sahyadri Farms FPO", "Pune Trading Co." — were hardcoded, and
 *   not even in this file: they lived in the i18n dictionaries as
 *   `buyer1_name`, `buyer2_name`, `buyer3_name`, alongside `buyer1_rate`,
 *   `buyer2_net`, "4.9 stars", "188 deals", "99.2% on-time pay", "100%
 *   Escrow". Every farmer in every language met the same three fictional
 *   firms quoting the same fictional prices, and the "Start Sauda" button
 *   navigated to `S30_DealCounterOffer` — a route this navigator has never
 *   registered, so the primary action on the screen did nothing.
 *
 *   That is the failure `CLAUDE.md` §9 calls the one unrecoverable mistake
 *   available to this team: unlabelled synthetic data shown to a government
 *   panel. It is not fixed by translating it.
 *
 * ★ What is on screen now is only what an `OfferDto` carries: the price, the
 *   quantity, the round, when it arrived, when it expires, and the buyer's
 *   note. Offers are ranked by **total value to the farmer** (price × qty),
 *   not by the per-quintal rate — the highest rate here is an offer for half
 *   the lot, and a farmer comparing rates alone would take the smaller
 *   cheque. The rate is shown too, and the partial-offer case is called out
 *   in words rather than left to be inferred from a number.
 *
 * ★ What is deliberately absent: the buyer's name, their rating, their
 *   on-time record, their escrow badge. `OfferDto` has `buyer_id` and no
 *   more. CANON §6.2's `buyers` table really does hold `business_name`,
 *   `tier`, `deals_completed`, `on_time_payment_bps` and
 *   `renegotiation_bps`, but §7.6 exposes none of them and there is no
 *   `GET /buyers/{id}`. Blocker filed (`docs/BLOCKERS.md`).
 *   TODO(akash): render the buyer block when that lands.
 *
 *   Note that `on_time_payment_bps` *defaults to 10000* in the schema. So
 *   the tempting shortcut — show the column, let it default — would have
 *   this screen assert a flawless payment record for a buyer nobody has ever
 *   transacted with. The absence is the honest state.
 *
 * ★ ZERO EMOJIS. ★ Loading, empty, error and data all render.
 */

import React, { useMemo } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { noteText } from '../../lib/offerNote';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise, toQuintal } from '../../lib/money';
import { formatDateShort } from '../../lib/dates';
import { getLots, getOffers } from '../../lib/api';
import { DEFAULT_LOT_ID, USE_FIXTURES } from '../../config';
import { fxMyOffers } from '../../fixtures/offers';
import { fxMyLots } from '../../fixtures/lots';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { LotDto, OfferDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S25_BuyersForLot'>;

async function fetchOffers(): Promise<OfferDto[]> {
  if (USE_FIXTURES) return fxMyOffers;
  return getOffers();
}

async function fetchLots(): Promise<LotDto[]> {
  if (USE_FIXTURES) return fxMyLots;
  return getLots();
}

/** What this offer is worth in total, in paise. The ranking key.
 *
 * ★ Computed from `qty_kg`, not from `toQuintal(qty_kg)`. Flooring the weight
 *   before multiplying loses up to 99 kg of it — on a 4,050 kg offer at
 *   ₹1,950/qtl that is ₹975 the farmer would never see on screen, and it
 *   would silently change the *ranking* whenever two offers were close. */
function offerValuePaise(o: OfferDto): number {
  return quintalValuePaise(o.price_paise_per_qtl, o.qty_kg);
}

export default function S25_BuyersForLot({ navigation, route }: Props) {
  const { t, locale } = useT();

  /* ★ The screen took no params at all — "buyers for lot" with no lot. It
     now takes one, and falls back to the demo lot the rest of the app
     agrees on rather than guessing. */
  const lotId = route.params?.lot_id ?? DEFAULT_LOT_ID;

  const offersQuery = useQuery({ queryKey: ['offers', 'talks'], queryFn: fetchOffers });
  const lotsQuery = useQuery({ queryKey: ['lots'], queryFn: fetchLots });

  const lot = (lotsQuery.data ?? []).find(l => l.id === lotId) ?? null;

  /** Live offers on *this* lot, best total first. */
  const offers = useMemo(() => {
    const all = offersQuery.data ?? [];
    return all
      .filter(o => o.status === 'OPEN' && o.lots.some(l => l.lot_id === lotId))
      .sort((a, b) => offerValuePaise(b) - offerValuePaise(a));
  }, [offersQuery.data, lotId]);

  const lotQuintals = lot ? formatQuintal(lot.qty_kg, locale) : null;
  const best = offers[0] ?? null;

  const narration = useMemo(() => {
    if (offers.length === 0) return t('bfl_empty_title');
    const parts = [
      t('bfl_narr_count', { n: formatNumber(offers.length, locale) }),
      ...offers.map((o, i) =>
        t('bfl_narr_offer', {
          n: formatNumber(i + 1, locale),
          rate: formatPaise(o.price_paise_per_qtl, locale),
          qty: formatQuintal(o.qty_kg, locale),
          total: formatPaise(offerValuePaise(o), locale),
        }),
      ),
    ];
    return parts.join(' ');
  }, [offers, locale, t]);

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
        <Text style={styles.headerTitle}>{t('bfl_title')}</Text>
        <Text style={styles.headerSub}>
          {t('bfl_subtitle', { n: formatNumber(offers.length, locale) })}
        </Text>
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (offersQuery.isLoading || lotsQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={110} />
          <View style={{ height: space.sm }} />
          <Skeleton height={190} />
        </View>
      </View>
    );
  }

  if (offersQuery.error && !offersQuery.data) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <ErrorState message={t('offers_fetch_error')} onRetry={() => offersQuery.refetch()} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── The lot these offers are for ─────────────────────────────
            Every field read off the real LotDto. The old band showed
            "LOT #LP-403", "Gavran Red Onion", "Asking: ₹2,100/Qtl" and
            "Grade A (850/1000)" — four literals, none of them from a lot. */}
        {lot ? (
          <View style={styles.lotBand}>
            <View style={styles.lotIcon}>
              <Icon name="leaf" size={18} color={colors.primary} />
            </View>
            <View style={styles.lotBandInfo}>
              <Text style={styles.lotBandId}>
                {t('bfl_lot_qty', { qty: lotQuintals ?? '' })}
              </Text>
              <Text style={styles.lotBandSub}>
                {t('bfl_lot_listed_on', {
                  date: formatDateShort(lot.created_at.slice(0, 10), locale, ''),
                })}
              </Text>
            </View>
            <View style={styles.gradeBadge}>
              <Text style={styles.gradeText}>{t(`lot_grade_${lot.grade.toLowerCase()}`)}</Text>
            </View>
          </View>
        ) : null}

        {offers.length === 0 ? (
          <View style={styles.emptyCard}>
            <View style={styles.emptyIcon}>
              <Icon name="handshake" size={26} color={colors.outline} />
            </View>
            <Text style={styles.emptyTitle}>{t('bfl_empty_title')}</Text>
            <Text style={styles.emptyBody}>{t('bfl_empty_body')}</Text>
          </View>
        ) : null}

        {offers.map((o, i) => {
          const isBest = o.id === best?.id;
          const qtl = formatQuintal(o.qty_kg, locale);
          const total = offerValuePaise(o);
          /* An offer for less than the whole lot is not comparable on rate
             alone, and this is the screen where that mistake costs money. */
          const isPartial = lot !== null && o.qty_kg < lot.qty_kg;
          const behindBest = best ? total - offerValuePaise(best) : 0;

          return (
            <View key={o.id} style={[styles.card, isBest && styles.cardBest]}>
              <View style={[styles.rankRow, isBest && styles.rankRowBest]}>
                <View style={styles.rankBadge}>
                  <Text style={styles.rankNum}>{formatNumber(i + 1, locale)}</Text>
                </View>
                <Text style={[styles.rankLabel, isBest && styles.rankLabelBest]}>
                  {isBest ? t('bfl_rank_best') : t('bfl_rank_n', { n: formatNumber(i + 1, locale) })}
                </Text>
                <Text style={styles.rankDate}>
                  {formatDateShort(o.created_at.slice(0, 10), locale, '')}
                </Text>
              </View>

              {/* The buyer, as the contract knows him. No name, no stars, no
                  on-time percentage — see the header of this file. */}
              <View style={styles.buyerRow}>
                <View style={styles.buyerAvatar}>
                  <Icon name="building" size={16} color={colors.primary} />
                </View>
                <View style={styles.buyerText}>
                  <Text style={styles.buyerName}>{t('chat_from_buyer')}</Text>
                  <Text style={styles.buyerMeta}>
                    {t('chat_round', { round: formatNumber(o.round, locale) })}
                  </Text>
                </View>
              </View>

              <View style={styles.figures}>
                <View style={styles.figureCol}>
                  <Text style={styles.figureLabel}>{t('bfl_rate_label')}</Text>
                  <Text style={styles.figureRate}>
                    {formatPaise(o.price_paise_per_qtl, locale)}
                  </Text>
                  <Text style={styles.figureUnit}>{t('mkt_per_qtl')}</Text>
                </View>
                <View style={styles.figureDivider} />
                <View style={styles.figureCol}>
                  <Text style={styles.figureLabel}>{t('bfl_total_label')}</Text>
                  <Text style={[styles.figureRate, styles.figureTotal]}>
                    {formatPaise(total, locale)}
                  </Text>
                  <Text style={styles.figureUnit}>
                    {t('bfl_for_qty', { qty: qtl })}
                  </Text>
                </View>
              </View>

              {isPartial ? (
                <View style={styles.partialBanner}>
                  <Icon name="info" size={14} color={colors.onSurfaceVariant} />
                  <Text style={styles.partialText}>
                    {t('bfl_partial_note', {
                      qty: qtl,
                      lot: lotQuintals ?? '',
                    })}
                  </Text>
                </View>
              ) : null}

              {!isBest && behindBest < 0 ? (
                <View style={styles.behindBanner}>
                  <Icon name="trending-down" size={14} color={colors.critical} />
                  <Text style={styles.behindText}>
                    {t('bfl_behind_best', { amount: formatPaise(Math.abs(behindBest), locale) })}
                  </Text>
                </View>
              ) : null}

              {(() => {
                const n = noteText(o.note, t);
                return n ? <Text style={styles.note}>{n}</Text> : null;
              })()}

              {o.expires_at ? (
                <Text style={styles.expires}>
                  {t('bfl_expires', {
                    date: formatDateShort(o.expires_at.slice(0, 10), locale, ''),
                  })}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[styles.cta, isBest && styles.ctaBest]}
                /* Was `navigate('S30_DealCounterOffer')` — a route no
                   navigator registers, so the button did nothing. This one
                   opens the real thread for this offer. */
                onPress={() => navigation.navigate('S27_Bargaining', { offer_id: o.id })}
                accessibilityRole="button">
                <Text style={[styles.ctaText, isBest && styles.ctaTextBest]}>
                  {t('bfl_open_talk')}
                </Text>
                <Icon
                  name="arrow-right"
                  size={16}
                  color={isBest ? colors.onPrimary : colors.primary}
                />
              </TouchableOpacity>
            </View>
          );
        })}

        {offers.length > 0 ? (
          <View style={styles.footerNote}>
            <Icon name="info" size={14} color={colors.onSurfaceVariant} />
            <Text style={styles.footerNoteText}>{t('bfl_footer_note')}</Text>
          </View>
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

  lotBand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  lotIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lotBandInfo: { flex: 1, minWidth: 0 },
  lotBandId: { ...typography.titleMd, color: colors.onSurface },
  lotBandSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 1 },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  gradeText: { ...typography.labelMd, color: colors.onSurface },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
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

  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    gap: space.xs,
  },
  cardBest: { borderWidth: 2, borderColor: colors.primaryContainer },

  rankRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  rankRowBest: {},
  rankBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNum: { ...typography.labelSm, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  rankLabel: { flex: 1, ...typography.labelMd, color: colors.onSurfaceVariant },
  rankLabelBest: { color: colors.primary, fontFamily: fontFamily.extraBold },
  rankDate: { ...typography.labelSm, color: colors.onSurfaceVariant },

  buyerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  buyerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buyerText: { flex: 1, minWidth: 0 },
  buyerName: { ...typography.titleMd, color: colors.onSurface },
  buyerMeta: { ...typography.labelSm, color: colors.onSurfaceVariant },

  figures: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    paddingVertical: space.sm,
  },
  figureCol: { flex: 1, minWidth: 0, alignItems: 'center', gap: 1 },
  figureDivider: { width: 1, backgroundColor: colors.outlineVariant },
  figureLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  /* I16's habit, applied here too: the total and the rate render at the same
     size, so neither reads as the footnote of the other. */
  figureRate: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  figureTotal: { color: colors.primary },
  figureUnit: { ...typography.labelSm, color: colors.onSurfaceVariant },

  partialBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHigh,
  },
  partialText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 16 },

  behindBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: space.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.criticalContainer,
  },
  behindText: { ...typography.labelSm, color: colors.onCriticalContainer, flex: 1 },

  note: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
  expires: { ...typography.labelSm, color: colors.onSurfaceVariant },

  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    marginTop: 2,
  },
  ctaBest: { backgroundColor: colors.primaryContainer },
  ctaText: { ...typography.titleMd, color: colors.primary },
  ctaTextBest: { color: colors.onPrimary, fontFamily: fontFamily.extraBold },

  footerNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
  },
  footerNoteText: { ...typography.labelSm, color: colors.onSurfaceVariant, flex: 1, lineHeight: 17 },
});
