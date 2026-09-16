/**
 * S24 — one lot, with its offers on it. Stitch screen 24
 * (`24_lot_detail_inspection_buyer_pool_view`).
 *
 * ★ Rebuilt for depth as much as for content. Reaching a buyer's offer used
 *   to take four screens — lot → buyers list → buyer profile → bargaining —
 *   which is a long way to walk to answer "what is anyone offering me?". The
 *   offers now sit on the lot itself, each with its rate, its quantity, what
 *   it comes to in total and how it compares to the asking price, and
 *   "Respond" goes straight to the counter-offer screen. The ranked buyer
 *   list and the buyer profile still exist for a farmer who wants to compare
 *   or check someone out; they are no longer on the path to simply seeing
 *   an offer.
 *
 * ★ Removed, all of it invented: "Lot #LP-403" and "Rambhau Patil · Niphad"
 *   as literals, "GRADE A · 850/1000 Score", "AI Assayed · 3 Angles",
 *   "AI Lab Assay Parameters", "Certificate #LP94–VERIFIED", "Download
 *   Official APMC Digital Assay PDF" (nothing generates a PDF), a "Top Bid
 *   ₹1,910" and three named trading companies with bids attached, a fixed
 *   "₹83,400 in Hand", and a "Corridor: ₹2,050 – ₹2,150". The lot, the
 *   grade, the weight and every offer figure now come from the real
 *   `LotDto` and `OfferDto`.
 *
 * ★ Every string resolves in one language. The old screen mixed them on the
 *   same line — "Active · चालू", "View All 3 Bids & Start Sauda (खरेदीदार पहा
 *   व सौदा सुरू करा)" — regardless of what the farmer had chosen.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, formatQuintal, quintalValuePaise, toQuintal } from '../../lib/money';
import { getLot } from '../../lib/api';
import { DEFAULT_LOT_ID, USE_FIXTURES } from '../../config';
import { fxLotListed } from '../../fixtures/lots';
import { fxIncomingOffer, fxIncomingOfferLastRound } from '../../fixtures/offers';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { OfferDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S24_LotDetail'>;

const KG_PER_BAG = 50;

async function fetchLot(lotId: string) {
  if (USE_FIXTURES) return fxLotListed;
  return getLot(lotId);
}

/** Offers a buyer has put to this farmer and that are still open. Same
 * fixture pair S15 reads; `GET /offers` is actor-scoped both directions, so
 * the real path filters that one list rather than adding an endpoint. */
async function fetchOffers(): Promise<OfferDto[]> {
  if (USE_FIXTURES) return [fxIncomingOffer, fxIncomingOfferLastRound];
  return [];
}

export default function S24_LotDetail({ route, navigation }: Props) {
  const { t, locale } = useT();
  const lotId = route.params?.lot_id ?? DEFAULT_LOT_ID;
  const askingPaise = route.params?.asking_paise ?? null;

  const lotQuery = useQuery({ queryKey: ['lots', lotId], queryFn: () => fetchLot(lotId) });
  const offersQuery = useQuery({ queryKey: ['offers', 'awaitingResponse'], queryFn: fetchOffers });

  if (lotQuery.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        <View style={styles.scroll}>
          <Skeleton height={120} />
          <View style={{ height: space.sm }} />
          <Skeleton height={200} />
        </View>
      </View>
    );
  }

  if (lotQuery.error && !lotQuery.data) {
    return <ErrorState message={t('lots_fetch_error')} onRetry={() => lotQuery.refetch()} />;
  }

  const lot = lotQuery.data;
  if (!lot) return <ErrorState message={t('lots_fetch_error')} onRetry={() => lotQuery.refetch()} />;

  const qtl = toQuintal(lot.qty_kg);
  const bags = Math.floor(lot.qty_kg / KG_PER_BAG);
  const offers = offersQuery.data ?? [];

  /* ★ Reads the lot and every offer standing on it — quantity, grade,
     status, then each buyer's rate and what it comes to for the whole
     lot. */
  const narration = [
    t('ld_narr_lot', {
      qty: formatQuintal(lot.qty_kg, locale),
      grade: t(`lot_grade_${lot.grade.toLowerCase()}`),
      status: t(`lot_status_${lot.status.toLowerCase()}`),
    }),
    ...(askingPaise !== null
      ? [t('ld_narr_asking', { rate: formatPaise(askingPaise, locale) })]
      : []),
    offers.length === 0
      ? t('bfl_empty_title')
      : offers
          .map(o =>
            t('ld_narr_offer', {
              rate: formatPaise(o.price_paise_per_qtl, locale),
              total: formatPaise(quintalValuePaise(o.price_paise_per_qtl, o.qty_kg), locale),
            }),
          )
          .join(' '),
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
          <Text style={styles.headerTitle}>{t('ld_title')}</Text>
          <Text style={styles.headerSub}>{t(`lot_status_${lot.status.toLowerCase()}`)}</Text>
        </View>
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── The lot ───────────────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.rowSplit}>
            <View style={styles.rowSplitCol}>
              <Text style={styles.metaLabel}>{t('ld_weight_label')}</Text>
              <Text style={styles.metaValue}>
                {t('ld_weight_value', { qty: formatNumber(qtl, locale) })}
              </Text>
              <Text style={styles.metaSub}>
                {t('ld_bags_value', { bags: formatNumber(bags, locale) })}
              </Text>
            </View>
            <View style={styles.rowSplitCol}>
              <Text style={styles.metaLabel}>{t('ld_grade_label')}</Text>
              <Text style={styles.metaValue}>{lot.grade}</Text>
            </View>
          </View>

          <View style={styles.askRow}>
            <Text style={styles.metaLabel}>{t('ld_ask_label')}</Text>
            {askingPaise !== null ? (
              <Text style={styles.askValue}>{formatPaise(askingPaise, locale)}</Text>
            ) : (
              <TouchableOpacity
                onPress={() => navigation.navigate('S22_PricePublish', { lot_id: lotId })}
                accessibilityRole="button">
                <Text style={styles.askLink}>{t('ld_set_price')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Offers, right here ────────────────────────────────────── */}
        <View style={styles.offersHead}>
          <Text style={styles.sectionTitle}>{t('ld_offers_title')}</Text>
          {offers.length > 0 ? (
            <View style={styles.countChip}>
              <Text style={styles.countChipText}>
                {t('ld_offers_count', { count: formatNumber(offers.length, locale) })}
              </Text>
            </View>
          ) : null}
        </View>

        {offers.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.emptyText}>{t('ld_offers_empty')}</Text>
          </View>
        ) : (
          offers.map(offer => {
            const offerQtl = toQuintal(offer.qty_kg);
            const total = offer.price_paise_per_qtl * offerQtl;
            const vsAsk = askingPaise !== null ? offer.price_paise_per_qtl - askingPaise : null;
            return (
              <View key={offer.id} style={styles.offerCard}>
                <View style={styles.offerTopRow}>
                  <Text style={styles.offerRate}>
                    {t('ld_offer_rate', {
                      rate: formatPaise(offer.price_paise_per_qtl, locale),
                    })}
                  </Text>
                  <View style={styles.roundChip}>
                    <Text style={styles.roundChipText}>
                      {t('ld_offer_round', { round: formatNumber(offer.round, locale) })}
                    </Text>
                  </View>
                </View>

                <Text style={styles.offerQty}>
                  {t('ld_offer_qty', { qty: formatNumber(offerQtl, locale) })} ·{' '}
                  {t('ld_offer_total', { amount: formatPaise(total, locale) })}
                </Text>

                {vsAsk !== null && vsAsk !== 0 ? (
                  <Text style={[styles.offerVsAsk, vsAsk > 0 ? styles.vsUp : styles.vsDown]}>
                    {vsAsk > 0
                      ? t('ld_offer_vs_ask_up', { amount: formatPaise(vsAsk, locale) })
                      : t('ld_offer_vs_ask_down', { amount: formatPaise(Math.abs(vsAsk), locale) })}
                  </Text>
                ) : null}

                <TouchableOpacity
                  style={styles.respondBtn}
                  onPress={() => navigation.navigate('S14_CounterOffer', { offer_id: offer.id })}
                  accessibilityRole="button">
                  <Text style={styles.respondBtnText}>{t('ld_offer_respond')}</Text>
                  <Icon name="arrow-right" size={16} color={colors.onPrimary} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* ── Escrow, said plainly ──────────────────────────────────── */}
        <View style={styles.escrowCard}>
          <View style={styles.escrowIcon}>
            <Icon name="lock" size={18} color={colors.tertiary} />
          </View>
          {/* `flex: 1` on the text column — the old version let a long escrow
              sentence push its own card wider than the screen. */}
          <View style={styles.escrowText}>
            <Text style={styles.escrowTitle}>{t('ld_escrow_title')}</Text>
            <Text style={styles.escrowBody}>{t('ld_escrow_body')}</Text>
          </View>
        </View>
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

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  rowSplit: { flexDirection: 'row', gap: space.sm },
  rowSplitCol: { flex: 1 },
  metaLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  metaValue: { ...typography.titleLg, color: colors.onSurface, marginTop: 2 },
  metaSub: { ...typography.bodySm, color: colors.onSurfaceVariant },

  askRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  askValue: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },
  askLink: { ...typography.labelMd, color: colors.primary },

  offersHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    marginTop: space.xs,
  },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  countChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
  },
  countChipText: { ...typography.labelSm, color: colors.onPrimary },
  emptyText: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 19 },

  offerCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  offerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
  },
  offerRate: {
    ...typography.headlineSm,
    color: colors.onSurface,
    fontFamily: fontFamily.extraBold,
    flexShrink: 1,
  },
  roundChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  roundChipText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  offerQty: { ...typography.bodySm, color: colors.onSurfaceVariant, marginTop: 4 },
  offerVsAsk: { ...typography.labelMd, marginTop: 6 },
  vsUp: { color: colors.tertiary },
  vsDown: { color: colors.critical },

  respondBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    marginTop: space.sm,
  },
  respondBtnText: { ...typography.titleMd, color: colors.onPrimary },

  escrowCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  escrowIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.md,
    backgroundColor: 'rgba(4,120,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  escrowText: { flex: 1 },
  escrowTitle: { ...typography.titleMd, color: colors.onPositiveContainer },
  escrowBody: {
    ...typography.bodySm,
    color: colors.onPositiveContainer,
    marginTop: 3,
    lineHeight: 19,
  },
});
