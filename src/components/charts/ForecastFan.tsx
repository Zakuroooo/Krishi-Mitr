/**
 * S7's forecast fan. Hand-rolled `react-native-svg`, per `12_STACK.md` §3.1 —
 * no `victory-native`, one dependency instead of three.
 *
 * ★ Two hard rules, both from PRANAY.md §2.7:
 *
 *   1. Never render p50 without its p10–p90 band. `p10`/`p50`/`p90` are all
 *      required props — there is no way to call this component with only a
 *      line, by construction of the type, not by convention. The runtime guard
 *      below (mismatched lengths → render nothing) covers the one case types
 *      cannot: a malformed response where the arrays exist but disagree in
 *      length.
 *
 *   2. The source badge is part of the chart, not next to it — except this
 *      chart does not draw one. CANON §7.4's `ForecastRes` has no `source`
 *      field at all; a forecast is a model output, not an observed price row.
 *      Blocker filed to Nilesh/Nikhil (see `fixtures/forecast.ts`).
 *
 * The band path is `M <p90 left-to-right> L <p10 right-to-left> Z` — p90 draws
 * the top edge, p10 (reversed) draws the bottom edge back to the start, closing
 * a polygon. The reversal happens on the *coordinate strings*, each of which
 * already has the correct x for its own day index baked in — reversing the
 * *values* first (as a naive reading of the shape might suggest) would pair
 * each value with the wrong day's x position once flipped.
 *
 * ★ Axes. This chart used to print two bare rupee figures under the plot — the
 *   min at the left, the max at the right — which reads as if price rises from
 *   left to right. It does not: those are the *vertical* extremes, and the
 *   horizontal axis is time. So a judge looking at beat 3 saw a shaded shape
 *   with four unexplained numbers around it.
 *
 *   Now: price is labelled on the y axis (max at the top, min at the bottom,
 *   where they actually are), time on the x axis (`आज` → `+N दिवसांनंतर`), and
 *   the band and the median line each carry one line of plain Marathi saying
 *   what they mean. The p10–p90 legend is the sentence that makes **I16**
 *   legible on a chart: a farmer must be able to see that the shaded region is
 *   the range he might actually get, not decoration around the line.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line, Path, Polyline } from 'react-native-svg';

import { formatPaise } from '../../lib/money';
import { devNum, translate } from '../../lib/i18n';
import type { Locale } from '../../types/api';

type Props = {
  p10: number[];
  p50: number[];
  p90: number[];
  locale: Locale;
};

const WIDTH = 320;
const HEIGHT = 180;
const PAD = 16;
const GREEN = '#2E7D32';

export function ForecastFan({ p10, p50, p90, locale }: Props) {
  const n = p50.length;
  if (n === 0 || p10.length !== n || p90.length !== n) return null;

  const all = [...p10, ...p50, ...p90];
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;

  const xStep = n > 1 ? (WIDTH - PAD * 2) / (n - 1) : 0;
  const xFor = (i: number) => PAD + i * xStep;
  const yFor = (v: number) => HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);
  const coordsFor = (arr: number[]) => arr.map((v, i) => `${xFor(i)},${yFor(v)}`);

  const bandPath = `M ${coordsFor(p90).join(' ')} L ${coordsFor(p10).reverse().join(' ')} Z`;
  const p50Points = coordsFor(p50).join(' ');
  const baselineY = yFor(min);

  return (
    <View>
      <Text style={styles.axisTitle}>{translate('chart_axis_price', locale)}</Text>

      {/* The y labels sit outside the SVG rather than as <SvgText>: they are the
          only text here and RN's own <Text> renders Devanagari with the system
          font shaping, which `react-native-svg` does not reliably match. */}
      <View style={styles.plotRow}>
        <View style={styles.yAxis}>
          <Text style={styles.axisLabel} numberOfLines={1}>
            {formatPaise(max, locale)}
          </Text>
          <Text style={styles.axisLabel} numberOfLines={1}>
            {formatPaise(min, locale)}
          </Text>
        </View>

        <View style={styles.plot}>
          <Svg width="100%" height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <Line
              x1={PAD}
              y1={baselineY}
              x2={WIDTH - PAD}
              y2={baselineY}
              stroke="#DDD"
              strokeWidth={1}
            />
            <Path d={bandPath} fill={GREEN} fillOpacity={0.18} />
            <Polyline points={p50Points} stroke={GREEN} strokeWidth={2} fill="none" />
          </Svg>

          <View style={styles.xAxis}>
            <Text style={styles.axisLabel}>{translate('chart_axis_today', locale)}</Text>
            <Text style={styles.axisLabel}>
              {translate('chart_axis_days_ahead', locale, { days: devNum(n, locale) })}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={styles.legendBand} />
          <Text style={styles.legendLabel}>{translate('chart_band_legend', locale)}</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={styles.legendLine} />
          <Text style={styles.legendLabel}>{translate('chart_median_legend', locale)}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  plotRow: { flexDirection: 'row', alignItems: 'stretch' },
  // `height: HEIGHT` with space-between puts the max label level with the top of
  // the plot and the min level with the bottom, which is the point of moving
  // them off the horizontal row they used to share.
  yAxis: { height: HEIGHT, justifyContent: 'space-between', marginRight: 6, alignItems: 'flex-end' },
  plot: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisLabel: { fontSize: 11, color: '#888' },
  legend: { marginTop: 10, gap: 6 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendBand: { width: 16, height: 10, borderRadius: 2, backgroundColor: 'rgba(46,125,50,0.18)' },
  legendLine: { width: 16, height: 2, borderRadius: 1, backgroundColor: GREEN },
  legendLabel: { flex: 1, fontSize: 11, color: '#555', lineHeight: 15 },
});
