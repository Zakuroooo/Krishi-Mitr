/**
 * The Market tab — Stitch screen 09 (`09_market_180_day_history_14_day_
 * forecast_corridor/code.html`), built as the one screen that design
 * actually is: today's benchmark, the 180-day trend, the forecast corridor,
 * and nearby mandis ranked by *net* payout, in one scroll.
 *
 * ★ What this replaces: a four-link menu ("Price history / Forecast /
 *   Nearby markets / How reliable is the model?") that was never a Stitch
 *   screen at all — it was scaffolding invented to reach four separate
 *   pre-Stitch screens.
 *
 *   That menu survived here for a while as a "Go deeper" row at the bottom,
 *   and it was pure duplication: three of the four links led to older,
 *   unstyled screens rendering the *same* query against the *same* fixture
 *   as the history chart, the forecast corridor and the nearby list already
 *   on this page. A farmer scrolling past the trend to find a link back to
 *   the trend is being asked to do the app's navigation for it, so the row
 *   and those three screens are gone. The fourth — the model card — is not
 *   duplicated by anything here, and it keeps a link where it belongs:
 *   directly under the accuracy figures it explains.
 *
 * ★ Every figure on this screen is read from a real response shape, never
 *   from the mockup. The Stitch HTML hardcodes ₹2,050 / 28,400 bags / "84%
 *   Confidence" / "+₹6,200 gain" as design placeholders. Those specific
 *   numbers do not appear here: the benchmark comes from the latest
 *   `PricePoint`, arrivals from `arrivals_qtl`, the corridor from the
 *   forecast's own p10/p50/p90, model quality from `ModelCardSummary`
 *   (MASE and 80% coverage — the two numbers the card actually carries),
 *   and every nearby row from `NearbyMarketRow`'s own gross/transport/
 *   commission/net. A number with no field behind it is not rendered.
 *
 * ★ I8: `source` is badged per series — nothing that is not AGMARKNET/MSAMB
 *   passes as observed mandi data.
 * ★ I16: the corridor's floor (p10) renders at the same size and weight as
 *   its ceiling (p90). Neither is smaller, greyer, or behind a tap.
 * ★ ZERO EMOJIS — every glyph is the shared SVG `Icon`.
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { useQuery } from '@tanstack/react-query';
import { useSelection } from '../../lib/selection';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { formatDateShort } from '../../lib/dates';
import {
  getCommodities,
  getDistricts,
  getForecast,
  getMarkets,
  getNearbyMarkets,
  getPriceSeries,
} from '../../lib/api';
import {
  DEFAULT_COMMODITY_ID,
  DEFAULT_DISTRICT_ID,
  DEFAULT_HORIZON_DAYS,
  DEFAULT_QTY_KG,
  USE_FIXTURES,
} from '../../config';
import { fxSeriesFor } from '../../fixtures/prices';
import { fxForecastFor } from '../../fixtures/forecast';
import { fxNearby } from '../../fixtures/nearby';
import { fxCommodities, fxMarketsFor } from '../../fixtures/reference';
import { fxDistricts } from '../../fixtures/auth';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import { Picker } from '../../components/ui/Picker';
import { ListenButton } from '../../components/ui/ListenButton';
import type { PricesStackParamList } from '../../navigation/FarmerTabs';
import type {
  Commodity,
  DataSource,
  District,
  ForecastRes,
  Market,
  NearbyRes,
  PricePoint,
  PriceSeriesRes,
} from '../../types/api';

type Props = NativeStackScreenProps<PricesStackParamList, 'PricesIndex'>;

/** The four windows the Stitch period selector offers, in days. 1Y is not
 * offered: `getPriceSeries` is called for 180 days, so a 1Y pill would be a
 * control that silently shows 180 days of data under a "1Y" label. */
const PERIODS = [
  { days: 7, labelKey: 'mkt_period_7' },
  { days: 30, labelKey: 'mkt_period_30' },
  { days: 90, labelKey: 'mkt_period_90' },
  { days: 180, labelKey: 'mkt_period_180' },
] as const;

const TRUSTED_SOURCES = new Set<DataSource>(['AGMARKNET', 'MSAMB']);

/**
 * `NearbyMarketRow.name_mr` is Marathi by wire contract — it is a fixed field
 * name, not a localised one, so rendering it directly puts Devanagari on an
 * English screen. Same map `S15_MyLots` already uses: resolve the id through
 * the dictionary, and fall back to the wire field only for a market this app
 * has no name for yet.
 */
const MARKET_NAME_KEY: Record<string, string> = {
  mkt_lasalgaon: 'market_lasalgaon',
  mkt_pune: 'market_pune',
  mkt_nagpur: 'market_nagpur',
};

const CHART_W = 320;
const CHART_H = 132;
const CHART_PAD = 10;

/**
 * ★ These take the picked pair rather than reading a constant. A fixture that
 *   ignores its own arguments is the worst kind: it looks right. `fxSeriesFor`
 *   and `fxForecastFor` return `null` for a mandi that does not trade the
 *   crop, and an empty series is what the real endpoint returns there too, so
 *   the screen's empty branch is exercised in both modes.
 */
async function fetchSeries(commodityId: string, marketId: string): Promise<PriceSeriesRes> {
  if (USE_FIXTURES) {
    // No pair, no observations, and therefore no latest observation date —
    // `PriceSeriesRes.latest_obs_date` is a non-null `string` by CANON, so an
    // empty series carries an empty one. The screen branches on `points`.
    return (
      fxSeriesFor(commodityId, marketId) ?? {
        points: [],
        source_summary: {},
        latest_obs_date: '',
      }
    );
  }
  return getPriceSeries(commodityId, marketId, 180);
}

async function fetchForecastRes(
  commodityId: string,
  marketId: string,
): Promise<ForecastRes | null> {
  if (USE_FIXTURES) return fxForecastFor(commodityId, marketId);
  return getForecast(commodityId, marketId, DEFAULT_HORIZON_DAYS);
}

async function fetchCommodities(): Promise<Commodity[]> {
  if (USE_FIXTURES) return fxCommodities;
  return getCommodities();
}

async function fetchDistricts(): Promise<District[]> {
  if (USE_FIXTURES) return fxDistricts;
  return getDistricts();
}

async function fetchMarkets(districtId: string): Promise<Market[]> {
  if (USE_FIXTURES) return fxMarketsFor(districtId);
  return getMarkets(districtId);
}

/** `getNearbyMarkets` is keyed by **district**, not market — the alternatives
 * to Lasalgaon are the other yards in Nashik district, not other rows for the
 * same yard. Same derivation and same query key as S6, so both screens share
 * one cache entry rather than fetching the same list twice. */
async function fetchNearbyRes(commodityId: string, districtId: string): Promise<NearbyRes> {
  if (USE_FIXTURES) return fxNearby;
  return getNearbyMarkets(commodityId, districtId);
}

/** A cubic path through the points, so the trend reads as a curve like the
 * mockup rather than a polyline. Control points are the midpoints — cheap,
 * stable, and it never overshoots the data the way a spline can. */
function smoothPath(pts: Array<{ x: number; y: number }>): string {
  const first = pts[0];
  if (!first) return '';
  if (pts.length === 1) return `M ${first.x},${first.y}`;
  let d = `M ${first.x},${first.y}`;
  for (let i = 1; i < pts.length; i++) {
    const prev = pts[i - 1]!;
    const cur = pts[i]!;
    const mx = (prev.x + cur.x) / 2;
    d += ` Q ${prev.x},${prev.y} ${mx},${(prev.y + cur.y) / 2}`;
    d += ` Q ${cur.x},${cur.y} ${cur.x},${cur.y}`;
  }
  return d;
}

export default function PricesIndex({ navigation }: Props) {
  const { t, locale } = useT();
  const { user } = useAuth();
  const [periodDays, setPeriodDays] = useState<number>(180);

  /**
   * ★ What the pickers replaced: this screen read `DEFAULT_COMMODITY_ID` and
   *   `DEFAULT_MARKET_ID` out of `config.ts` — every farmer in Maharashtra was
   *   shown onion at Lasalgaon, and a farmer in Ahmednagar growing tomato had
   *   no control anywhere in the app to say so. The TODO in `config.ts` asked
   *   for exactly this and guessed it would come from `district_id`; that is
   *   the default here, not the whole answer, because the mandi a farmer sells
   *   at is a choice and his district is only where he starts from.
   */
  // ★ Crop, district and mandi now live in the shared selection rather than
  //   this screen's own state. They used to be local `useState`, so picking
  //   tomato here moved this screen's chart and left Home advising about
  //   onion — the two screens disagreeing about what the farmer had asked.
  const selection = useSelection();
  const commodityId = selection.commodityId;
  const districtId = selection.districtId;
  const pickedMarketId = selection.marketId;

  const commodities = useQuery({ queryKey: ['ref', 'commodities'], queryFn: fetchCommodities });
  const districts = useQuery({ queryKey: ['ref', 'districts'], queryFn: fetchDistricts });
  const markets = useQuery({
    queryKey: ['ref', 'markets', districtId],
    queryFn: () => fetchMarkets(districtId),
  });

  const marketList = markets.data ?? [];
  /** A mandi picked in another district is not a valid selection here, so the
   * first mandi of the current district takes over rather than the screen
   * querying a market/district pair that does not exist. */
  const marketId =
    pickedMarketId && marketList.some(m => m.id === pickedMarketId)
      ? pickedMarketId
      : marketList[0]?.id ?? null;

  // ★ When the district changes, `setDistrict` clears the mandi; the first one
  //   of the new district then becomes the answer above. Writing it back keeps
  //   Home asking about the same mandi this screen is showing, instead of
  //   falling back to the demo default.
  useEffect(() => {
    if (marketId && marketId !== selection.marketId) selection.setMarket(marketId);
  }, [marketId, selection]);

  const series = useQuery({
    queryKey: ['prices', 'series', '180', commodityId, marketId],
    queryFn: () => fetchSeries(commodityId, marketId!),
    enabled: marketId !== null,
  });
  const forecast = useQuery({
    queryKey: ['ai', 'forecast', commodityId, marketId, DEFAULT_HORIZON_DAYS],
    queryFn: () => fetchForecastRes(commodityId, marketId!),
    enabled: marketId !== null,
  });
  const nearby = useQuery({
    queryKey: ['prices', 'nearby', commodityId, districtId],
    queryFn: () => fetchNearbyRes(commodityId, districtId),
  });

  const localName = (o: { name: string; name_mr: string }) =>
    locale === 'mr' ? o.name_mr : o.name;

  const commodityOptions = (commodities.data ?? []).map(c => ({
    id: c.id,
    label: localName(c),
  }));
  const districtOptions = (districts.data ?? []).map(d => ({
    id: d.id,
    label: localName(d),
  }));
  const marketOptions = marketList.map(m => ({ id: m.id, label: localName(m) }));

  const activeMarket = marketList.find(m => m.id === marketId) ?? null;
  const activeCommodity = (commodities.data ?? []).find(c => c.id === commodityId) ?? null;

  const points = series.data?.points ?? [];

  /** The window the period pills select, taken off the end of the series.
   * Fewer records than the window is not an error — it renders what exists. */
  const windowPoints = useMemo(
    () => (points.length > periodDays ? points.slice(points.length - periodDays) : points),
    [points, periodDays],
  );

  const latest = points.length > 0 ? points[points.length - 1] : undefined;
  const previous = points.length > 1 ? points[points.length - 2] : undefined;

  /** Day-on-day move, in paise. Rendered only when there are two records to
   * compare — a "+0" on a single-record series would be a claim, not a fact. */
  const delta =
    latest && previous ? latest.modal_paise_per_qtl - previous.modal_paise_per_qtl : null;
  const deltaBps =
    latest && previous && previous.modal_paise_per_qtl > 0
      ? Math.round((delta! / previous.modal_paise_per_qtl) * 10000)
      : null;

  /** The peak of the selected window, for the context banner under the chart. */
  const peak = useMemo(() => {
    let best: PricePoint | undefined;
    for (const p of windowPoints) {
      if (!best || p.modal_paise_per_qtl > best.modal_paise_per_qtl) best = p;
    }
    return best;
  }, [windowPoints]);

  const fPoints = forecast.data?.points ?? [];
  /** The best expected day in the corridor — the highest p50, which is what
   * "when should I sell" actually means on this data. */
  const bestDay = useMemo(() => {
    let best: (typeof fPoints)[number] | undefined;
    for (const p of fPoints) {
      if (!best || p.p50_paise_per_qtl > best.p50_paise_per_qtl) best = p;
    }
    return best;
  }, [fPoints]);

  const floorPaise = fPoints.length > 0 ? Math.min(...fPoints.map(p => p.p10_paise_per_qtl)) : null;
  const ceilingPaise = fPoints.length > 0 ? Math.max(...fPoints.map(p => p.p90_paise_per_qtl)) : null;

  const lotQuintals = toQuintal(DEFAULT_QTY_KG);

  /**
   * ★ The header and the pickers render in *every* state, which is why they
   *   are lifted out rather than living inside the data branch. A farmer who
   *   picks a crop his mandi does not trade would otherwise land on a bare
   *   error screen with no control on it — the one screen from which he
   *   cannot pick anything else, reachable in two taps. The pickers are the
   *   way out of the empty state, so they have to be *in* it.
   *
   * ★ The title is the mandi the numbers actually come from, and the
   *   subtitle is that series' own `latest_obs_date`. It used to read
   *   "Lasalgaon APMC · Market Pulse · Live Yard" on every device in
   *   Maharashtra: the mandi was hardcoded, and "Live" was a claim about
   *   AGMARKNET data that arrives once a day.
   */
  /**
   * ★ What the speaker reads: the whole screen, in the order it is laid out —
   *   which crop at which mandi, today's rate and how it moved, the forecast
   *   corridor with **both** its floor and its ceiling, and the best-paying
   *   nearby yard. Every value is the same variable the card beside it
   *   renders, so the voice can never describe a number that is not on
   *   screen.
   *
   * ★ I16 holds aloud. The corridor's floor is spoken in the same breath as
   *   its ceiling; a narration that read out only the upside would be the
   *   same failure as rendering the worst case in smaller type.
   */
  const narration = (() => {
    const parts: string[] = [];
    const where = t('mkt_narr_where', {
      crop: activeCommodity ? localName(activeCommodity) : '',
      market: activeMarket ? localName(activeMarket) : '',
    });
    parts.push(where);
    if (latest) {
      parts.push(t('mkt_narr_today', { price: formatPaise(latest.modal_paise_per_qtl, locale) }));
      if (delta !== null && delta !== 0) {
        parts.push(
          t(delta > 0 ? 'mkt_narr_up' : 'mkt_narr_down', {
            amount: formatPaise(Math.abs(delta), locale),
          }),
        );
      }
    }
    if (floorPaise !== null && ceilingPaise !== null) {
      parts.push(
        t('mkt_narr_corridor', {
          n: formatNumber(fPoints.length, locale),
          floor: formatPaise(floorPaise, locale),
          ceiling: formatPaise(ceilingPaise, locale),
        }),
      );
    }
    const bestNearby = nearby.data?.rows[0];
    if (bestNearby) {
      parts.push(
        t('mkt_narr_best_nearby', {
          market: t(MARKET_NAME_KEY[bestNearby.market_id] ?? '') || bestNearby.name_mr,
          net: formatPaise(bestNearby.net_paise_per_qtl, locale),
        }),
      );
    }
    return parts.join(' ');
  })();

  const chrome = (
    <>
      <View style={styles.header}>
        <View style={styles.headerIconRing}>
          <Icon name="trending-up" size={18} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>
            {activeMarket ? localName(activeMarket) : t('mkt_pick_market')}
          </Text>
          <Text style={styles.headerSub}>
            {series.data?.latest_obs_date
              ? t('mkt_as_of', {
                  date: formatDateShort(series.data.latest_obs_date, locale, ''),
                })
              : activeCommodity
                ? localName(activeCommodity)
                : ''}
          </Text>
        </View>
        <ListenButton text={narration} />
      </View>

      <View style={styles.pickerRow}>
        <Picker
          label={t('mkt_pick_crop')}
          icon="leaf"
          options={commodityOptions}
          selectedId={commodityId}
          onSelect={selection.setCommodity}
        />
        <Picker
          label={t('mkt_pick_district')}
          icon="map-pin"
          options={districtOptions}
          selectedId={districtId}
          // `setDistrict` clears the mandi itself — it belongs to the old
          // district, and the new district's first yard takes over above.
          onSelect={selection.setDistrict}
        />
      </View>

      {/* Only a real choice gets a control. A district with one yard states
          it in the header instead of offering a dropdown of one. */}
      {marketOptions.length > 1 ? (
        <View style={styles.pickerRow}>
          <Picker
            label={t('mkt_pick_mandi')}
            icon="building"
            options={marketOptions}
            selectedId={marketId}
            onSelect={selection.setMarket}
          />
        </View>
      ) : null}
    </>
  );

  // ── Four states ───────────────────────────────────────────────────────
  if (series.isLoading || markets.isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {chrome}
        <ScrollView contentContainerStyle={styles.scroll}>
          <Skeleton height={120} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
          <View style={{ height: space.sm }} />
          <Skeleton height={200} />
        </ScrollView>
      </View>
    );
  }

  if (series.error && !series.data) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {chrome}
        <ErrorState message={t('mkt_error')} onRetry={() => series.refetch()} />
      </View>
    );
  }

  if (!latest) {
    /* Not an error. A mandi that does not trade this crop is a fact about
       the market, and the answer is to say so and leave the pickers up. */
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {chrome}
        <View style={styles.emptyCard}>
          <View style={styles.emptyIcon}>
            <Icon name="info" size={24} color={colors.outline} />
          </View>
          <Text style={styles.emptyTitle}>
            {t('mkt_no_pair_title', {
              crop: activeCommodity ? localName(activeCommodity) : '',
              market: activeMarket ? localName(activeMarket) : '',
            })}
          </Text>
          <Text style={styles.emptyBody}>{t('mkt_no_pair_body')}</Text>
        </View>
      </View>
    );
  }

  const sourceIsTrusted = TRUSTED_SOURCES.has(latest.source);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {chrome}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Today's benchmark ─────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.benchmarkRow}>
            <View style={styles.benchmarkLeft}>
              <Text style={styles.labelSm}>{t('mkt_benchmark_label')}</Text>
              <View style={styles.benchmarkPriceRow}>
                <Text style={styles.heroNumeral}>
                  {formatPaise(latest.modal_paise_per_qtl, locale)}
                </Text>
                <Text style={styles.perQtl}>{t('mkt_per_qtl')}</Text>
              </View>
            </View>
            {delta !== null && deltaBps !== null ? (
              <View style={[styles.deltaChip, delta < 0 && styles.deltaChipDown]}>
                <Icon
                  name={delta < 0 ? 'trending-down' : 'trending-up'}
                  size={14}
                  color={delta < 0 ? colors.critical : colors.tertiary}
                />
                <Text style={[styles.deltaChipText, delta < 0 && styles.deltaChipTextDown]}>
                  {delta < 0 ? '' : '+'}
                  {formatPaise(delta, locale)} ({formatNumber(Math.round(deltaBps / 100), locale)}%)
                </Text>
              </View>
            ) : null}
          </View>

          <View style={styles.arrivalsRow}>
            <View style={styles.arrivalsLeft}>
              <Icon name="truck" size={16} color={colors.primary} />
              {/* ★ `arrivals_qtl` is quintals, and it now says quintals. It
                  used to render as "1200 Bags" — the same number relabelled
                  into a unit it is not. A bag of onion is roughly 50 kg, so
                  1,200 quintals is nearer 2,400 bags: the screen was off by
                  a factor of two on the one figure a trader would check by
                  eye. I2 — store kg, display quintals, and never rename a
                  unit at the render edge. */}
              <Text style={styles.arrivalsValue}>
                {t('mkt_arrivals_value', { count: formatNumber(latest.arrivals_qtl, locale) })}
              </Text>
            </View>
            {/* I8 — the provenance badge. `source` is shown as-is when it is
                a trusted feed, and called out when it is not. */}
            <View style={[styles.sourceBadge, !sourceIsTrusted && styles.sourceBadgeUntrusted]}>
              <Text
                style={[styles.sourceBadgeText, !sourceIsTrusted && styles.sourceBadgeTextUntrusted]}>
                {latest.source}
              </Text>
            </View>
          </View>

          {/* Day-range meter — min / modal / max, all three from the same record */}
          <View style={styles.rangeBox}>
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeLabel}>
                {t('mkt_range_low')}:{' '}
                <Text style={styles.rangeValue}>{formatPaise(latest.min_paise_per_qtl, locale)}</Text>
              </Text>
              <Text style={styles.rangeLabel}>
                {t('mkt_range_avg')}:{' '}
                <Text style={styles.rangeValuePrimary}>
                  {formatPaise(latest.modal_paise_per_qtl, locale)}
                </Text>
              </Text>
              <Text style={styles.rangeLabel}>
                {t('mkt_range_high')}:{' '}
                <Text style={styles.rangeValueHigh}>
                  {formatPaise(latest.max_paise_per_qtl, locale)}
                </Text>
              </Text>
            </View>
            <View style={styles.rangeTrack}>
              <View style={styles.rangeFill} />
              <View
                style={[
                  styles.rangePin,
                  {
                    left: `${
                      latest.max_paise_per_qtl > latest.min_paise_per_qtl
                        ? Math.round(
                            ((latest.modal_paise_per_qtl - latest.min_paise_per_qtl) /
                              (latest.max_paise_per_qtl - latest.min_paise_per_qtl)) *
                              100,
                          )
                        : 50
                    }%`,
                  },
                ]}
              />
            </View>
            <View style={styles.rangeFootRow}>
              <Text style={styles.rangeFoot}>{t('mkt_range_foot_min')}</Text>
              <Text style={styles.rangeFoot}>{t('mkt_range_foot_mid')}</Text>
              <Text style={styles.rangeFoot}>{t('mkt_range_foot_max')}</Text>
            </View>
          </View>
        </View>

        {/* ── Historical trend ──────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.cardHeadRow}>
            <View style={styles.cardHeadText}>
              <Text style={styles.cardTitle}>{t('mkt_history_title')}</Text>
              {/* Was the literal string "Nashik APMC Onion Cycle" — wrong the
                  moment either picker moves, and it named a district while
                  the chart plots a mandi. */}
              <Text style={styles.labelSm}>
                {t('mkt_history_sub', {
                  crop: activeCommodity ? localName(activeCommodity) : '',
                  market: activeMarket ? localName(activeMarket) : '',
                })}
              </Text>
            </View>
            <Icon name="chart-bar" size={20} color={colors.onSurfaceVariant} />
          </View>

          <View style={styles.pillRow}>
            {PERIODS.map(p => {
              const active = p.days === periodDays;
              return (
                <TouchableOpacity
                  key={p.days}
                  style={[styles.pill, active && styles.pillActive]}
                  onPress={() => setPeriodDays(p.days)}
                  accessibilityRole="button">
                  <Text style={[styles.pillText, active && styles.pillTextActive]}>
                    {t(p.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <HistoryChart points={windowPoints} />

          <View style={styles.axisRow}>
            {windowPoints.length > 1 ? (
              <>
                <Text style={styles.axisLabel}>
                  {formatDateShort(windowPoints[0]!.obs_date, locale, '')}
                </Text>
                <Text style={styles.axisLabelNow}>
                  {formatDateShort(windowPoints[windowPoints.length - 1]!.obs_date, locale, '')}
                </Text>
              </>
            ) : null}
          </View>

          <View style={styles.contextBanner}>
            <Icon name="clock" size={16} color={colors.primary} />
            <Text style={styles.contextText}>
              {windowPoints.length > 1 && peak
                ? t('mkt_history_context', {
                    peak: formatPaise(peak.modal_paise_per_qtl, locale),
                    date: formatDateShort(peak.obs_date, locale, ''),
                  })
                : t('mkt_history_short')}
            </Text>
          </View>
        </View>

        {/* ── Forecast corridor ─────────────────────────────────────── */}
        {forecast.data && fPoints.length > 0 && floorPaise !== null && ceilingPaise !== null ? (
          <View style={styles.forecastCard}>
            <View style={styles.cardHeadRow}>
              <View style={styles.cardHeadText}>
                <View style={styles.forecastTitleRow}>
                  <Icon name="zap" size={18} color={colors.primaryContainer} />
                  <Text style={styles.cardTitle}>
                    {t('mkt_forecast_title', { days: formatNumber(fPoints.length, locale) })}
                  </Text>
                </View>
                <Text style={styles.labelSm}>{t('mkt_forecast_sub')}</Text>
              </View>
            </View>

            <View style={styles.corridorBox}>
              <View style={styles.corridorHeadRow}>
                <Text style={styles.corridorHeadText}>
                  {t('mkt_corridor_today', {
                    price: formatPaise(latest.modal_paise_per_qtl, locale),
                  })}
                </Text>
                <Text style={styles.corridorHeadTextStrong}>{t('mkt_corridor_peak')}</Text>
                <Text style={styles.corridorHeadText}>
                  {t('mkt_corridor_exit', { n: formatNumber(fPoints.length, locale) })}
                </Text>
              </View>

              <ForecastCorridor
                p10={fPoints.map(p => p.p10_paise_per_qtl)}
                p50={fPoints.map(p => p.p50_paise_per_qtl)}
                p90={fPoints.map(p => p.p90_paise_per_qtl)}
              />

              {/* I16 — floor and ceiling at identical size and weight. */}
              <View style={styles.bandRow}>
                <Text style={styles.bandFloor}>
                  {t('mkt_floor_label', { price: formatPaise(floorPaise, locale) })}
                </Text>
                <Text style={styles.bandCeiling}>
                  {t('mkt_ceiling_label', { price: formatPaise(ceilingPaise, locale) })}
                </Text>
              </View>

              {bestDay ? (
                <View style={styles.bestDayRow}>
                  <View style={styles.bestDayDot} />
                  <Text style={styles.bestDayLabel}>{t('mkt_optimal_sell')}</Text>
                  <Text style={styles.bestDayValue}>
                    {t('mkt_optimal_value', {
                      date: formatDateShort(bestDay.target_date, locale, ''),
                      price: formatPaise(bestDay.p50_paise_per_qtl, locale),
                    })}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.forecastNote}>
              {t('mkt_forecast_accuracy', {
                mase: forecast.data.model_card.mase.toFixed(2),
                coverage: formatNumber(
                  Math.round(forecast.data.model_card.coverage_80_bps / 100),
                  locale,
                ),
              })}
            </Text>

            <TouchableOpacity
              style={styles.auditLink}
              onPress={() => navigation.navigate('S8_ModelCard')}
              accessibilityRole="button">
              <Text style={styles.auditLinkText}>{t('mkt_audit_link')}</Text>
              <Icon name="arrow-right" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* ── Nearby mandis, ranked by net ──────────────────────────── */}
        {nearby.data && nearby.data.rows.length > 0 ? (
          <View style={styles.nearbySection}>
            <View style={styles.nearbyHeadRow}>
              <Text style={styles.cardTitle}>{t('mkt_nearby_title')}</Text>
              <View style={styles.lotBadge}>
                <Text style={styles.lotBadgeText}>
                  {t('mkt_nearby_lot_badge', { qty: formatNumber(lotQuintals, locale) })}
                </Text>
              </View>
            </View>
            <Text style={styles.labelSm}>{t('mkt_nearby_sub')}</Text>

            {nearby.data.rows.map((row, i) => {
              const best = nearby.data!.rows[0]!;
              const deductions =
                row.gross_paise_per_qtl - row.net_paise_per_qtl;
              const lotTotal = row.net_paise_per_qtl * lotQuintals;
              const behindBest =
                (row.net_paise_per_qtl - best.net_paise_per_qtl) * lotQuintals;
              const isBest = i === 0;
              return (
                <View
                  key={row.market_id}
                  style={[styles.nearbyCard, isBest && styles.nearbyCardBest]}>
                  {isBest ? (
                    <View style={styles.rankRibbon}>
                      <Icon name="check-circle" size={12} color={colors.onTertiary} />
                      <Text style={styles.rankRibbonText}>{t('mkt_rank_best')}</Text>
                    </View>
                  ) : null}

                  <View style={styles.nearbyTopRow}>
                    <View style={styles.nearbyIdentity}>
                      <View style={styles.nearbyNameRow}>
                        <Text style={styles.nearbyName}>
                          {MARKET_NAME_KEY[row.market_id]
                            ? t(MARKET_NAME_KEY[row.market_id]!)
                            : row.name_mr}
                        </Text>
                        {!isBest ? (
                          <View style={styles.rankChip}>
                            <Text style={styles.rankChipText}>
                              {t('mkt_rank_n', { n: formatNumber(i + 1, locale) })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <Text style={styles.labelSm}>
                        {t('mkt_km_away', { km: formatNumber(row.distance_km, locale) })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.netGrid}>
                    <View style={styles.netCol}>
                      <Text style={styles.labelSm}>{t('mkt_gross_rate')}</Text>
                      <Text style={styles.netGross}>
                        {formatPaise(row.gross_paise_per_qtl, locale)}
                      </Text>
                      <Text style={styles.deductionLine}>
                        {t('mkt_deductions_line', { amount: formatPaise(deductions, locale) })}
                      </Text>
                    </View>
                    <View style={styles.netColRight}>
                      <Text style={styles.netLabel}>{t('mkt_net_in_bank')}</Text>
                      <Text style={styles.netValue}>
                        {formatPaise(row.net_paise_per_qtl, locale)}
                      </Text>
                      <Text style={styles.netTotal}>
                        {t('mkt_total_for_lot', { amount: formatPaise(lotTotal, locale) })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.costRow}>
                    <Text style={styles.costItem}>
                      {t('mkt_cost_freight', {
                        amount: formatPaise(row.transport_paise_per_qtl, locale),
                      })}
                    </Text>
                    <Text style={styles.costDot}>·</Text>
                    <Text style={styles.costItem}>
                      {t('mkt_cost_adat', {
                        amount: formatPaise(row.commission_paise_per_qtl, locale),
                      })}
                    </Text>
                  </View>

                  {!isBest && behindBest < 0 ? (
                    <View style={styles.behindBanner}>
                      <Icon name="trending-down" size={14} color={colors.critical} />
                      <Text style={styles.behindText}>
                        {t('mkt_lower_payout', {
                          amount: formatPaise(Math.abs(behindBest), locale),
                        })}
                      </Text>
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        ) : null}

      </ScrollView>
    </View>
  );
}

/** The 180-day trend, drawn in the Stitch palette: terracotta line over a
 * fading area, with the latest observation dotted in verified-emerald. */
function HistoryChart({ points }: { points: PricePoint[] }) {
  if (points.length < 2) {
    return <View style={styles.chartEmpty} />;
  }
  const values = points.map(p => p.modal_paise_per_qtl);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const stepX = (CHART_W - CHART_PAD * 2) / (points.length - 1);
  const coords = values.map((v, i) => ({
    x: CHART_PAD + i * stepX,
    y: CHART_H - CHART_PAD - ((v - min) / range) * (CHART_H - CHART_PAD * 2),
  }));
  const line = smoothPath(coords);
  const last = coords[coords.length - 1]!;
  const area = `${line} L ${last.x},${CHART_H} L ${coords[0]!.x},${CHART_H} Z`;

  return (
    <View style={styles.chartBox}>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <Defs>
          <LinearGradient id="mktArea" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={colors.primaryContainer} stopOpacity="0.30" />
            <Stop offset="1" stopColor={colors.primaryContainer} stopOpacity="0" />
          </LinearGradient>
        </Defs>
        <Path d={area} fill="url(#mktArea)" />
        <Path
          d={line}
          fill="none"
          stroke={colors.primaryContainer}
          strokeWidth={3}
          strokeLinecap="round"
        />
        <Circle cx={last.x} cy={last.y} r={5} fill={colors.tertiary} stroke="#FFFFFF" strokeWidth={2.5} />
      </Svg>
    </View>
  );
}

/** p10–p90 as a filled corridor with the p50 path through it. The two dashed
 * edges are the same weight as each other — I16 applies to the drawing, not
 * only to the text. */
function ForecastCorridor({ p10, p50, p90 }: { p10: number[]; p50: number[]; p90: number[] }) {
  const n = p50.length;
  if (n < 2 || p10.length !== n || p90.length !== n) {
    return <View style={styles.chartEmpty} />;
  }
  const all = [...p10, ...p50, ...p90];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const stepX = (CHART_W - CHART_PAD * 2) / (n - 1);
  const xy = (arr: number[]) =>
    arr.map((v, i) => ({
      x: CHART_PAD + i * stepX,
      y: CHART_H - CHART_PAD - ((v - min) / range) * (CHART_H - CHART_PAD * 2),
    }));

  const hi = xy(p90);
  const lo = xy(p10);
  const mid = xy(p50);
  const band =
    `M ${hi.map(p => `${p.x},${p.y}`).join(' L ')} ` +
    `L ${[...lo].reverse().map(p => `${p.x},${p.y}`).join(' L ')} Z`;

  return (
    <View style={styles.chartBox}>
      <Svg width="100%" height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
        <Path d={band} fill={colors.primaryContainer} fillOpacity={0.14} />
        <Path
          d={smoothPath(hi)}
          fill="none"
          stroke={colors.tertiary}
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
        <Path
          d={smoothPath(lo)}
          fill="none"
          stroke={colors.critical}
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />
        <Path
          d={smoothPath(mid)}
          fill="none"
          stroke={colors.primaryContainer}
          strokeWidth={3.5}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    paddingHorizontal: space.md,
    paddingTop: space.xl + 8,
    paddingBottom: space.xs,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  headerIconRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.titleLg, color: colors.primary },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  /* `minWidth: 0` on the Picker itself is what keeps a long Marathi mandi
     name from pushing its neighbour off the row. */
  pickerRow: {
    flexDirection: 'row',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.sm,
  },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  emptyCard: {
    alignItems: 'center',
    gap: 8,
    margin: space.md,
    padding: space.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  emptyIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
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
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  cardHeadRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeadText: { flex: 1 },
  cardTitle: { ...typography.headlineSm, color: colors.onSurface },
  labelSm: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  benchmarkRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  benchmarkLeft: { flex: 1 },
  benchmarkPriceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginTop: 2 },
  heroNumeral: { ...typography.numeralHero, color: colors.onSurface },
  perQtl: { ...typography.labelLg, color: colors.onSurfaceVariant },
  deltaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deltaChipDown: { backgroundColor: colors.criticalContainer },
  deltaChipText: { ...typography.labelMd, color: colors.tertiary },
  deltaChipTextDown: { color: colors.critical },

  arrivalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  arrivalsLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  arrivalsValue: { ...typography.labelMd, color: colors.onSurface },
  sourceBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  sourceBadgeUntrusted: { backgroundColor: colors.warningContainer },
  sourceBadgeText: { ...typography.labelSm, color: colors.tertiary },
  sourceBadgeTextUntrusted: { color: colors.warning },

  rangeBox: {
    marginTop: space.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.sm,
  },
  rangeLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rangeLabel: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  rangeValue: { fontFamily: fontFamily.bold, color: colors.onSurface },
  rangeValuePrimary: { fontFamily: fontFamily.bold, color: colors.primary },
  rangeValueHigh: { fontFamily: fontFamily.bold, color: colors.tertiary },
  rangeTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
    overflow: 'visible',
    justifyContent: 'center',
  },
  rangeFill: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    opacity: 0.35,
  },
  rangePin: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.onSurface,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    marginLeft: -7,
  },
  rangeFootRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 },
  rangeFoot: { ...typography.labelSm, fontSize: 10, color: colors.outline, fontFamily: fontFamily.medium },

  pillRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 4,
    marginTop: space.sm,
  },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: radius.sm },
  pillActive: { backgroundColor: colors.primary },
  pillText: { ...typography.labelSm, color: colors.onSurfaceVariant },
  pillTextActive: { color: colors.onPrimary },

  chartBox: {
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    paddingVertical: space.xs,
  },
  chartEmpty: { height: CHART_H, marginTop: space.sm },
  axisRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  axisLabel: { ...typography.labelSm, fontSize: 10, color: colors.outline, fontFamily: fontFamily.medium },
  axisLabelNow: { ...typography.labelSm, fontSize: 10, color: colors.onSurface },

  contextBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 10,
  },
  contextText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },

  forecastCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    padding: space.md,
  },
  forecastTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  corridorBox: {
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.sm,
  },
  corridorHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  corridorHeadText: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  corridorHeadTextStrong: { ...typography.labelSm, color: colors.primary },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: space.xs },
  // I16 — same fontSize, same family, on both.
  bandFloor: { ...typography.labelSm, color: colors.critical },
  bandCeiling: { ...typography.labelSm, color: colors.tertiary },
  bestDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.xs,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: space.xs,
  },
  bestDayDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tertiary },
  bestDayLabel: { ...typography.labelSm, color: colors.onSurface, flex: 1 },
  bestDayValue: { ...typography.labelMd, color: colors.tertiary },
  forecastNote: { ...typography.bodySm, fontSize: 11, color: colors.onSurfaceVariant, marginTop: space.xs },
  auditLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  auditLinkText: { ...typography.labelMd, color: colors.primary, flex: 1 },

  nearbySection: { gap: space.xs },
  nearbyHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.xs },
  lotBadge: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  lotBadgeText: { ...typography.labelSm, color: colors.primary },
  nearbyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    marginTop: space.xs,
    overflow: 'hidden',
  },
  nearbyCardBest: { borderWidth: 2, borderColor: colors.tertiary },
  rankRibbon: {
    position: 'absolute',
    top: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.tertiary,
    paddingHorizontal: space.sm,
    paddingVertical: 3,
    borderBottomLeftRadius: radius.md,
  },
  rankRibbonText: { ...typography.labelSm, color: colors.onTertiary },
  nearbyTopRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  nearbyIdentity: { flex: 1 },
  nearbyNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nearbyName: { ...typography.titleLg, color: colors.onSurface },
  rankChip: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  rankChipText: { ...typography.labelSm, fontSize: 10, color: colors.onSurfaceVariant },

  netGrid: {
    flexDirection: 'row',
    gap: space.xs,
    marginTop: space.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    padding: 10,
  },
  netCol: { flex: 1 },
  netColRight: {
    flex: 1,
    borderLeftWidth: 1,
    borderLeftColor: colors.outlineVariant,
    paddingLeft: space.sm,
  },
  netGross: { ...typography.titleLg, color: colors.onSurface },
  deductionLine: { ...typography.labelSm, fontSize: 11, color: colors.critical, marginTop: 2 },
  netLabel: { ...typography.labelSm, color: colors.tertiary },
  netValue: { ...typography.numeralData, color: colors.tertiary },
  netTotal: { ...typography.labelSm, color: colors.onSurface, marginTop: 2 },

  costRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: space.xs, paddingHorizontal: 2 },
  costItem: { ...typography.labelSm, fontSize: 11, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  costDot: { ...typography.labelSm, fontSize: 11, color: colors.outline },

  behindBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: space.xs,
    backgroundColor: colors.criticalContainer,
    borderRadius: radius.md,
    padding: space.xs,
  },
  behindText: { ...typography.labelSm, color: colors.onCriticalContainer, flex: 1 },
});
