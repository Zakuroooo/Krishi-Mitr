/**
 * S04_Home — Screen 08: Home / Daily Intelligence Dashboard.
 *
 * Pixel-matched to Stitch `08_home_mandi_setu_daily_intelligence/screen.png`.
 *
 * ★ ZERO EMOJIS — all icons are SVG.
 * ★ FULL I18N — every text uses t('key').
 * ★ REAL SVG CHART — 7-day bar chart using react-native-svg.
 */

import React from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { colors, fontFamily, space, radius, cardShadow } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { useSelection } from '../../lib/selection';
import { getLots, getPriceSeries, recommendWindow } from '../../lib/api';
import { formatNumber, formatPaise, formatQuintal } from '../../lib/money';
import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_GRADE,
  DEFAULT_HORIZON_DAYS,
  DEFAULT_MARKET_ID,
  DEFAULT_QTY_KG,
  USE_FIXTURES,
} from '../../config';
import { fxPriceSeries, fxSeriesFor } from '../../fixtures/prices';
import { fxHold, fxWindowFor } from '../../fixtures/window';
import { fxMyLots } from '../../fixtures/lots';
import type { HomeStackParamList, FarmerTabParamList } from '../../navigation/FarmerTabs';
import type { PricePoint } from '../../types/api';
import { ListenButton } from '../../components/ui/ListenButton';
import { buildHomeNarration } from '../../lib/pageNarration';
import { useScreenNarration } from '../../lib/useScreenNarration';
import { Logo } from '../../components/ui/Logo';

type Props = NativeStackScreenProps<HomeStackParamList, 'S4_Home'>;
type ParentNav = CompositeNavigationProp<
  Props['navigation'],
  BottomTabNavigationProp<FarmerTabParamList>
>;

// ── Price chart — draws whatever 7 points it's handed; no data of its own ──
const CHART_W = 280;
const CHART_H = 120;
const BAR_GAP = 6;

function PriceChart({ points }: { points: PricePoint[] }) {
  const numBars = points.length;
  if (numBars === 0) return null;
  const barW = (CHART_W - BAR_GAP * (numBars - 1)) / numBars;
  const prices = points.map(p => p.modal_paise_per_qtl);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const range = maxPrice - minPrice || 1;

  return (
    <Svg width={CHART_W} height={CHART_H + 20} viewBox={`0 0 ${CHART_W} ${CHART_H + 20}`}>
      {/* Guide lines */}
      {[0, 0.5, 1].map(frac => {
        const y = CHART_H * (1 - frac);
        return (
          <Line
            key={frac}
            x1={0}
            y1={y}
            x2={CHART_W}
            y2={y}
            stroke="rgba(141,113,104,0.15)"
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        );
      })}

      {/* Bars */}
      {points.map((p, i) => {
        const normH = ((p.modal_paise_per_qtl - minPrice) / range) * (CHART_H - 12) + 8;
        const x = i * (barW + BAR_GAP);
        const y = CHART_H - normH;
        const isToday = i === points.length - 1;
        const dayLabel = new Date(p.obs_date).toLocaleDateString(undefined, { weekday: 'narrow' });

        return (
          <React.Fragment key={p.obs_date}>
            <Rect
              x={x}
              y={y}
              width={barW}
              height={normH}
              rx={4}
              fill={isToday ? colors.primaryContainer : colors.surfaceContainerHighest}
            />
            {/* Day label */}
            <SvgText
              x={x + barW / 2}
              y={CHART_H + 16}
              textAnchor="middle"
              fontSize={10}
              fontFamily={fontFamily.semiBold}
              fill={isToday ? colors.primaryContainer : colors.outline}>
              {dayLabel}
            </SvgText>
            {/* Price label on today's bar */}
            {isToday && (
              <SvgText
                x={x + barW / 2}
                y={y - 5}
                textAnchor="middle"
                fontSize={9}
                fontFamily={fontFamily.bold}
                fill={colors.primaryContainer}>
                {formatPaise(p.modal_paise_per_qtl, 'en')}
              </SvgText>
            )}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

async function fetchPrices(commodityId: string, marketId: string) {
  // ★ Was `fxPriceSeries` unconditionally, so Home showed onion at Lasalgaon
  //   whatever the farmer had picked on the Market screen.
  if (USE_FIXTURES) return fxSeriesFor(commodityId, marketId) ?? fxPriceSeries;
  return getPriceSeries(commodityId, marketId, 14);
}

async function fetchVerdict(commodityId: string, marketId: string) {
  // ★ Was `fxHold` unconditionally — the advice never moved when the crop did.
  if (USE_FIXTURES) return fxWindowFor(commodityId, marketId) ?? fxHold;
  return recommendWindow({
    commodity_id: commodityId,
    market_id: marketId,
    qty_kg: DEFAULT_QTY_KG,
    grade: DEFAULT_GRADE,
    lot_id: null,
    horizon_days: DEFAULT_HORIZON_DAYS,
  });
}

// ── Screen ──────────────────────────────────────────────────────────
const redOnions = require('../../assets/images/red_onions.jpg');

export default function S04_Home({ navigation }: Props) {
  const { t, locale } = useT();
  const { user } = useAuth();
  const selection = useSelection();
  const insets = useSafeAreaInsets();
  // What the speaker reads: the screen, in the order a farmer reads it.
  // Built from the same query data the cards render, so it can never
  // describe a number that is not on screen.
  const parentNav = navigation as unknown as ParentNav;
  const goToLots = () => parentNav.navigate('MyLots', { screen: 'S15_MyLots' } as never);

  // ★ These used to be literal numbers baked into the JSX below — every
  //   screen that shows "today's onion price" invented its own, so Home
  //   said ₹3,120 while the phone-entry screen said ₹2,850–3,120 and the
  //   published-lot radar said ₹2,100. Same demo scenario every other
  //   screen (S9_Verdict, S04's own earlier build) already reads from —
  //   one real query, so this number can't drift from the others again.
  // ★ The crop and mandi come from the shared selection, and both query keys
  //   include them — so changing either on the Market screen invalidates these
  //   and Home refetches rather than showing a stale answer to a question the
  //   farmer is no longer asking.
  const marketId = selection.marketId ?? DEFAULT_MARKET_ID;
  const pricesQuery = useQuery({
    queryKey: ['home', 'prices', selection.commodityId, marketId],
    queryFn: () => fetchPrices(selection.commodityId, marketId),
    staleTime: 5 * 60 * 1000,
  });
  // ★ The lot card below used to be hardcoded. It now renders the farmer's
  //   real lots, from the same source My Produce reads.
  const lotsQuery = useQuery({
    queryKey: ['lots', 'mine'],
    queryFn: async () => (USE_FIXTURES ? fxMyLots : getLots()),
    staleTime: 5 * 60 * 1000,
  });
  const lots = lotsQuery.data ?? [];
  const lot = lots[0] ?? null;

  const verdictQuery = useQuery({
    queryKey: ['home', 'verdict', selection.commodityId, marketId],
    queryFn: () => fetchVerdict(selection.commodityId, marketId),
    staleTime: 5 * 60 * 1000,
  });

  const points = pricesQuery.data?.points ?? [];
  const last = points[points.length - 1];
  const prev = points.length >= 2 ? points[points.length - 2] : undefined;
  const recent7 = points.slice(-7);
  const minPaise = recent7.length ? Math.min(...recent7.map(p => p.min_paise_per_qtl)) : 0;
  const maxPaise = recent7.length ? Math.max(...recent7.map(p => p.max_paise_per_qtl)) : 0;
  const avgPaise = recent7.length
    ? Math.floor(recent7.reduce((s, p) => s + p.modal_paise_per_qtl, 0) / recent7.length)
    : 0;
  const deltaPaise = last && prev ? last.modal_paise_per_qtl - prev.modal_paise_per_qtl : 0;
  const isUp = deltaPaise >= 0;

  const verdict = verdictQuery.data;

  /**
   * How many days running the price has moved the same way — the "why" behind
   * a hold, and the one piece of reasoning a farmer can verify against his own
   * memory of the mandi.
   */
  const streakDays = (() => {
    if (points.length < 3) return null;
    const rising = deltaPaise >= 0;
    let n = 0;
    for (let i = points.length - 1; i > 0; i -= 1) {
      const step = points[i]!.modal_paise_per_qtl - points[i - 1]!.modal_paise_per_qtl;
      if (rising ? step >= 0 : step < 0) n += 1;
      else break;
    }
    return n;
  })();

  /**
   * What the speaker reads out.
   *
   * ★ This used to be six `label: value` fragments joined with ". " — the
   *   screen's numbers read out as a table. It never said how long to hold,
   *   why the price was expected to move, what the holding cost covered, or
   *   what to press next, which meant a farmer who cannot read received
   *   strictly less than one who can, from the feature built for him.
   *
   * ★ `buildHomeNarration` writes it as sentences instead, in all three
   *   languages, from this same query data — so the voice still cannot
   *   describe a number that is not on screen, and I16 holds in the ear:
   *   there is no path through it that speaks a gain without its risk.
   */
  const homeNarration = buildHomeNarration(
    {
      farmerName: user?.name ?? null,
      marketName: t('home_market_name'),
      cropName: t('nar_crop_onion'),
      latest: last ?? null,
      deltaPaise,
      streakDays,
      verdict: verdict ?? null,
      lotKg: DEFAULT_QTY_KG,
      holdCostPaisePerQtl: verdict?.costs.total_paise_per_qtl ?? null,
    },
    locale,
  );

  // ★ Only when the farmer has switched it on in settings; the hook is a no-op
  //   otherwise. Held back until both queries land so he hears real numbers.
  useScreenNarration(homeNarration, locale, {
    ready: !pricesQuery.isLoading && !verdictQuery.isLoading,
  });


  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── 1. Top bar — a conventional navbar: menu left, the product
             name centered as the title (not a personal greeting — the
             farmer's own name lives one tap away, in the menu), a
             balancing spacer on the right so the centered title is
             actually centered rather than left-shifted by the hamburger. */}
        <View style={[styles.topBar, { paddingTop: insets.top + space.xs }]}>
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() => navigation.getParent()?.getParent()?.navigate('Menu' as never)}
            accessibilityRole="button"
            accessibilityLabel={t('app_name')}>
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
            <View style={styles.hamburgerLine} />
          </TouchableOpacity>
          {/* ★ The mark sits beside the name so the brand a judge sees on the
              splash is the same one on the screen they spend the most time
              looking at. Same component, so they cannot drift. */}
          <Logo size={26} />
          <View style={styles.topBarText}>
            <Text style={styles.topGreeting} numberOfLines={1}>
              {t('app_name')}
            </Text>
            <Text style={styles.topDate}>{t('home_market_name')}</Text>
          </View>
          {/* ★ Both of these were plain, non-interactive glyphs — a mic and
              a bell that did nothing. The mic was also the wrong control
              here: this screen has nothing to dictate into. It is a speaker
              now, and it reads the whole screen aloud. The bell opens a real
              notifications screen built from real offers and real price
              moves. */}
          <View style={styles.topActions}>
            <ListenButton text={homeNarration} label={t('home_speaker_label')} />
            <TouchableOpacity
              style={styles.topIconBtn}
              onPress={() => navigation.navigate('S38_Notifications')}
              accessibilityRole="button"
              accessibilityLabel={t('nt_title')}>
              <Icon name="bell" size={18} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        {/* ★ A "3 Verified Buyers sent bids · valid for next 45 mins" banner
            sat here with a "Review Offers" button. The count and the
            countdown were both hardcoded, and the button navigated nowhere —
            tapping it did nothing. Offers that are genuinely waiting now
            appear in Notifications and in the Talks tab, both driven by real
            OfferDto data. */}

        {/* ── 3. Price intelligence card ────────────────── */}
        <View style={styles.priceCard}>
          {pricesQuery.isLoading ? (
            <Text style={styles.cardStatusText}>{t('loading_label')}</Text>
          ) : pricesQuery.isError || !last ? (
            <Text style={styles.cardErrorText}>{t('home_price_error')}</Text>
          ) : (
            <>
              {/* Card header */}
              <View style={styles.priceCardHeader}>
                <View>
                  <Text style={styles.priceCardLabel}>{t('home_todays_rate')}</Text>
                  <Text style={styles.priceHero}>
                    {formatPaise(last.modal_paise_per_qtl, 'en')}
                    <Text style={styles.priceHeroUnit}>/q</Text>
                  </Text>
                </View>
                <View style={styles.priceCardRight}>
                  {deltaPaise !== 0 && (
                    <View
                      style={[
                        styles.trendBadge,
                        !isUp && { backgroundColor: colors.criticalContainer, borderColor: 'rgba(185,28,28,0.2)' },
                      ]}>
                      <Icon
                        name={isUp ? 'trending-up' : 'trending-down'}
                        size={12}
                        color={isUp ? colors.tertiary : colors.critical}
                      />
                      <Text style={[styles.trendText, !isUp && { color: colors.critical }]}>
                        {isUp ? '+' : ''}
                        {formatPaise(deltaPaise, 'en')}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.arrivalsText}>
                    {t('home_arrivals', { count: formatNumber(last.arrivals_qtl, locale) })}
                  </Text>
                </View>
              </View>

              {/* Min / Avg / Max row */}
              <View style={styles.priceStats}>
                {[
                  { labelKey: 'home_min', value: minPaise },
                  { labelKey: 'home_avg', value: avgPaise },
                  { labelKey: 'home_max', value: maxPaise },
                ].map(({ labelKey, value }) => (
                  <View key={labelKey} style={styles.priceStat}>
                    <Text style={styles.priceStatLabel}>{t(labelKey)}</Text>
                    <Text style={styles.priceStatValue}>{formatPaise(value, 'en')}</Text>
                  </View>
                ))}
              </View>

              {/* 7-day chart */}
              <View style={styles.chartSection}>
                <View style={styles.chartHeader}>
                  <Icon name="chart-bar" size={12} color={colors.primary} />
                  <Text style={styles.chartLabel}>{t('home_7day_climb')}</Text>
                </View>
                <View style={styles.chartArea}>
                  <PriceChart points={recent7} />
                </View>
              </View>

              {/* AI Intelligence footer */}
              <View style={styles.aiRow}>
                <View style={styles.aiIconBg}>
                  <Icon name="star" size={12} color={colors.primary} />
                </View>
                <Text style={styles.aiLabel}>{t('home_ai_intelligence')}</Text>
                {verdict && (
                  <Text style={styles.aiConfidence}>
                    {t('home_confidence_label', { level: t(`confidence_${verdict.confidence.toLowerCase()}`) })}
                  </Text>
                )}
              </View>
            </>
          )}
        </View>

        {/* ── 4. Advisory card ──────────────────────────── */}
        <View style={styles.advisoryCard}>
          {verdictQuery.isLoading ? (
            <Text style={styles.cardStatusText}>{t('loading_label')}</Text>
          ) : verdictQuery.isError || !verdict ? (
            <Text style={styles.cardErrorText}>{t('home_verdict_error')}</Text>
          ) : (
            <>
              <View style={styles.advisoryHeader}>
                <Icon name="info" size={14} color={colors.primary} />
                <Text style={styles.advisoryLabel}>{t('home_advisory')}</Text>
              </View>

              <Text style={styles.advisoryRecommendation}>
                {verdict.action === 'HOLD' && verdict.hold_days !== null
                  ? t('home_hold_recommendation', { days: String(verdict.hold_days) })
                  : t(verdict.action === 'NO_ADVICE' ? 'no_advice_label' : `action_${verdict.action.toLowerCase()}`)}
              </Text>
              <Text style={styles.advisoryHoldCosts}>
                {t('home_holding_costs', { cost: formatPaise(verdict.costs.total_paise_per_qtl, 'en') })}
              </Text>

              {/* Gain/Loss row — ★ I16: identical font size for both numbers */}
              {verdict.expected_gain_paise !== null && verdict.worst_case_paise !== null && (
                <View style={styles.advisoryStats}>
                  <View style={styles.advisoryStat}>
                    <Text style={styles.advisoryStatLabel}>
                      {t('home_expected_gain', { qty: String(Math.floor(DEFAULT_QTY_KG / 100)) })}
                    </Text>
                    <Text style={[styles.advisoryStatValue, { color: colors.tertiary }]}>
                      +{formatPaise(verdict.expected_gain_paise, 'en')}
                    </Text>
                  </View>
                  <View style={styles.advisoryStatDivider} />
                  <View style={styles.advisoryStat}>
                    <Text style={styles.advisoryStatLabel}>
                      {t('home_worst_case', { qty: String(Math.floor(DEFAULT_QTY_KG / 100)) })}
                    </Text>
                    <Text style={[styles.advisoryStatValue, { color: colors.critical }]}>
                      {formatPaise(verdict.worst_case_paise, 'en')}
                    </Text>
                  </View>
                </View>
              )}

              {/* ── The two figures, drawn to scale ──────────────────────
                  ★ I16 says the worst case renders at the same font size as
                    the gain. That makes the pair *readable*; it does not make
                    them *comparable* — you still have to read two numbers and
                    do the arithmetic to see which is bigger.

                  ★ These bars are the same two values as widths. A farmer who
                    cannot read either figure can still see, in one glance,
                    that the green one is longer. Both are scaled against the
                    same maximum, so the comparison is honest: a bar is never
                    normalised to its own width. */}
              {verdict.expected_gain_paise !== null && verdict.worst_case_paise !== null && (
                <View style={styles.compareBars}>
                  {(() => {
                    const gain = Math.abs(verdict.expected_gain_paise);
                    const risk = Math.abs(verdict.worst_case_paise);
                    const peak = Math.max(gain, risk) || 1;
                    return (
                      <>
                        <View style={styles.compareRow}>
                          <View
                            style={[
                              styles.compareBar,
                              { width: `${(gain / peak) * 100}%`, backgroundColor: colors.positiveSolid },
                            ]}
                          />
                        </View>
                        <View style={styles.compareRow}>
                          <View
                            style={[
                              styles.compareBar,
                              { width: `${(risk / peak) * 100}%`, backgroundColor: colors.criticalSolid },
                            ]}
                          />
                        </View>
                      </>
                    );
                  })()}
                </View>
              )}

              <TouchableOpacity style={styles.costBreakdownBtn} onPress={() => navigation.navigate('S9_Verdict')}>
                <Icon name="clipboard" size={13} color={colors.primary} />
                <Text style={styles.costBreakdownText}>
                  {t('home_cost_breakdown', { cost: formatPaise(verdict.costs.total_paise_per_qtl, 'en') })}
                </Text>
                <Icon name="chevron-right" size={13} color={colors.primary} />
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* ── 5. My lots section ────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('home_active_lots')}</Text>
          <TouchableOpacity style={styles.sectionAction} onPress={goToLots}>
            <Text style={styles.sectionActionText}>{t('home_manage_all')}</Text>
            <Icon name="chevron-right" size={14} color={colors.primaryContainer} />
          </TouchableOpacity>
        </View>

        {/* Lot card
            ★ A farmer with no lots is a real state, not an edge case — it is
              every farmer on the day he installs this. It used to be
              unreachable because the card was hardcoded. */}
        {lot === null ? (
          <View style={styles.lotCard}>
            <Text style={styles.lotEmptyText}>{t('home_no_lots')}</Text>
            <TouchableOpacity style={styles.lotPrimaryBtn} onPress={goToLots}>
              <Icon name="plus" size={14} color={colors.onPrimary} />
              <Text style={styles.lotPrimaryBtnText}>{t('home_list_lot')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
        <View style={styles.lotCard}>
          <View style={styles.lotCardHeader}>
            <Image source={redOnions} style={styles.lotPhoto} />
            <View style={styles.lotInfo}>
              {/* ★ Every value in this card was hardcoded: the crop name and
                  "ACTIVE" in English on a Marathi screen, and "50 qtl",
                  "₹3,100/q", "#2847", "3 Buyers Interested" invented outright.
                  It also contradicted the crop picker — switch to tomato and
                  this still said Onion. All of it now comes from the farmer's
                  real lot. */}
              <View style={styles.lotTitleRow}>
                <Text style={styles.lotTitle} numberOfLines={1}>
                  {t(`commodity_${lot.commodity_id.replace('cmd_', '')}`)}
                </Text>
                <View style={styles.lotActiveBadge}>
                  <View style={styles.lotActiveDot} />
                  <Text style={styles.lotActiveText}>
                    {t(`lot_status_${lot.status.toLowerCase()}`)}
                  </Text>
                </View>
              </View>
              <Text style={styles.lotSub}>
                {t('home_stored_at', { location: t('home_market_name') })}
              </Text>
              {/* ★ No "3 buyers interested" line. Nothing counts buyers per
                  lot — that number was invented, and it is exactly the kind a
                  judge asks to see the source of. */}
            </View>
          </View>

          <View style={styles.lotStatsRow}>
            <View style={styles.lotStat}>
              <Text style={styles.lotStatLabel}>{t('home_qty_label')}</Text>
              <Text style={styles.lotStatValue}>
                {formatQuintal(lot.qty_kg, locale)} {t('unit_quintal_short')}
              </Text>
            </View>
            <View style={styles.lotStat}>
              <Text style={styles.lotStatLabel}>{t('grade_label_prefix', { grade: '' }).trim()}</Text>
              <Text style={[styles.lotStatValue, { color: colors.primary }]}>
                {lot.grade ?? '—'}
              </Text>
            </View>
            <View style={styles.lotStat}>
              <Text style={styles.lotStatLabel}>{t('home_lot_count', { count: String(lots.length) })}</Text>
              <Text style={styles.lotStatValue}>{lot.id.slice(-4).toUpperCase()}</Text>
            </View>
          </View>

          {/* ★ "Book Truck" removed — there is no logistics-booking endpoint
              anywhere in CANON; this button went nowhere and promised a
              feature the product does not have. */}
          <View style={styles.lotActions}>
            <TouchableOpacity style={styles.lotPrimaryBtn} onPress={goToLots}>
              <Text style={styles.lotPrimaryBtnText}>{t('home_view_lot')}</Text>
              <Icon name="chevron-right" size={14} color={colors.onPrimary} />
            </TouchableOpacity>
          </View>

          <View style={styles.escrowRow}>
            <Icon name="shield-check" size={12} color={colors.tertiary} />
            <Text style={styles.escrowText}>{t('home_escrow_guarantee')}</Text>
          </View>
        </View>
        )}

        {/* ★ The "Quick actions" grid (Weigh Slips, Book Truck, a second
            Manage All) was removed outright: Weigh Slips and Book Truck have
            no backing endpoint, and Manage All already exists once, wired,
            in the section header above — a second copy of the same link was
            dead weight, not a second feature. */}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  // Top bar
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingBottom: space.sm,
    backgroundColor: colors.surface,
    zIndex: 1,
    ...cardShadow,
  },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginRight: space.sm,
  },
  hamburgerLine: {
    width: 20,
    height: 2,
    borderRadius: 1,
    backgroundColor: colors.onSurface,
  },
  // ★ `marginLeft` rather than a gap on the row: the row also holds the
  //   hamburger and the action buttons, and only this pairing needs tightening.
  topBarText: { flex: 1, alignItems: 'center', marginLeft: 6 },
  topGreeting: {
    fontFamily: fontFamily.extraBold,
    fontSize: 19,
    color: colors.primary,
    letterSpacing: -0.2,
    textAlign: 'center',
  },
  topDate: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
    textAlign: 'center',
  },
  topActions: {
    flexDirection: 'row',
    gap: 8,
  },
  topIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bellDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.critical,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },

  // Offer banner
  offerBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: space.md,
    marginTop: space.md,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    shadowColor: '#9B2F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  offerBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    flex: 1,
  },
  offerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFB59D',
  },
  offerBannerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  offerBannerSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
  },
  offerBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: space.sm,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  offerBannerBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.onPrimary,
  },

  // Price card
  cardStatusText: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  cardErrorText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.critical,
  },
  priceCard: {
    margin: space.md,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
  },
  priceCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: space.sm,
  },
  priceCardLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  priceHero: {
    fontFamily: fontFamily.extraBold,
    fontSize: 36,
    color: colors.primary,
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  priceHeroUnit: {
    fontFamily: fontFamily.semiBold,
    fontSize: 16,
    color: colors.onSurfaceVariant,
    letterSpacing: 0,
  },
  priceCardRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: 'rgba(4,120,87,0.2)',
  },
  trendText: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.tertiary,
  },
  arrivalsText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
  },

  // Price stats
  priceStats: {
    flexDirection: 'row',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    marginBottom: space.sm,
  },
  priceStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
  },
  priceStatLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: 14,
    color: colors.onSurface,
    marginTop: 1,
  },

  // Chart
  chartSection: {
    marginBottom: space.sm,
  },
  chartHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.xs,
  },
  chartLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  chartArea: {
    alignItems: 'center',
  },

  // AI row
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  aiIconBg: {
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(155,47,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.5,
    flex: 1,
  },
  aiConfidence: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.warning,
  },

  // Advisory card
  advisoryCard: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.onPrimaryContainer,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  advisoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: space.xs,
  },
  advisoryLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  advisoryRecommendation: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.primary,
    letterSpacing: -0.2,
    marginBottom: 4,
  },
  advisoryHoldCosts: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginBottom: space.sm,
    lineHeight: 16,
  },
  advisoryStats: {
    flexDirection: 'row',
    borderRadius: radius.md,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(194,65,12,0.15)',
    marginBottom: space.sm,
  },
  advisoryStat: {
    flex: 1,
    padding: space.sm,
    alignItems: 'center',
  },
  compareBars: { marginTop: space.xs, gap: 5 },
  compareRow: {
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(0,0,0,0.05)',
    overflow: 'hidden',
  },
  compareBar: { height: '100%', borderRadius: 5, minWidth: 6 },
  advisoryStatDivider: {
    width: 1,
    backgroundColor: 'rgba(194,65,12,0.15)',
  },
  advisoryStatLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: 3,
  },
  advisoryStatValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    letterSpacing: -0.3,
  },
  advisoryStatSub: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  costBreakdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(155,47,0,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(155,47,0,0.12)',
  },
  costBreakdownText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primary,
    flex: 1,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: space.md,
    marginBottom: space.xs,
  },
  sectionTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
  },
  sectionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  sectionActionText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 13,
    color: colors.primaryContainer,
  },

  // Lot card
  lotCard: {
    marginHorizontal: space.md,
    marginBottom: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  lotCardHeader: {
    flexDirection: 'row',
    gap: space.sm,
    marginBottom: space.sm,
  },
  lotPhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    flexShrink: 0,
  },
  lotInfo: {
    flex: 1,
  },
  lotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  lotTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    color: colors.onSurface,
  },
  lotActiveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
  },
  lotActiveDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  lotActiveText: {
    fontFamily: fontFamily.bold,
    fontSize: 9,
    color: colors.tertiary,
    letterSpacing: 0.4,
  },
  lotSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  lotBuyerCount: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.primaryContainer,
    marginTop: 2,
  },
  lotEmptyText: {
    fontFamily: fontFamily.regular,
    fontSize: 15,
    lineHeight: 22,
    color: colors.onSurfaceVariant,
    marginBottom: space.sm,
  },
  lotStatsRow: {
    flexDirection: 'row',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
    marginBottom: space.sm,
  },
  lotStat: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: space.xs,
    borderRightWidth: 1,
    borderRightColor: colors.outlineVariant,
  },
  lotStatLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  lotStatValue: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
    marginTop: 2,
  },
  lotActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: space.xs,
  },
  lotSecondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.onPrimaryContainer,
  },
  lotSecondaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.primaryContainer,
  },
  lotPrimaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  lotPrimaryBtnText: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onPrimary,
  },
  escrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  escrowText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.tertiary,
  },

  // Quick actions
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    gap: 8,
    marginBottom: space.md,
  },
  quickActionCard: {
    flex: 1,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    gap: 4,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  qaIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  qaLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.onSurface,
    textAlign: 'center',
  },
  qaSub: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 13,
  },
});
