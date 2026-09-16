/**
 * S5's 180-day price history. Hand-rolled `react-native-svg`, per `12_STACK.md`
 * §3.1 — no charting library.
 *
 * ★ I8, and per PRANAY.md §2.7 rule 2 the badge is "part of the chart, not next
 *   to it" — here that means the LINE ITSELF is drawn as one `<Line>` segment
 *   per consecutive pair of points, each stroked in its own source's color
 *   (`SourceBadge`'s `SOURCE_COLOR`, shared so the two components never
 *   disagree), plus a compact legend directly beneath the SVG naming only the
 *   sources actually present in this series — not all five, and not hidden in
 *   a separate part of the screen.
 *
 * A segment between two points of different sources is colored by the *later*
 * point's source — the segment represents the observation it leads into. This
 * is a real judgment call with no single obviously-correct answer; documented
 * here rather than silently picked.
 *
 * ★ Axes. This chart used to print the min at the bottom-left and the max at the
 *   bottom-right of one horizontal row, which reads as "price went up from left
 *   to right" — but those are the *vertical* extremes and the horizontal axis is
 *   time. Now price is labelled on the y axis where it actually is, and the two
 *   ends of the x axis carry the first and last `obs_date`, so a farmer can see
 *   that this is six months and not six days.
 *
 *   Nothing was added *inside* the `<Svg>`. Gridlines would have been the
 *   obvious way to draw an axis, and they are deliberately not here: every
 *   `<Line>` in this chart is a data segment stroked by its source's colour
 *   (I8), and `PriceHistory.test.tsx` asserts exactly that — one `<Line>` per
 *   consecutive pair, and exactly two distinct strokes for the mixed-source
 *   fixture. A decorative `<Line>` would quietly break both, so the axis is
 *   built from RN `<Text>` around the SVG instead. The chart keeps the property
 *   that a coloured line in it always means a provenance claim.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Line } from 'react-native-svg';

import { formatDateShort } from '../../lib/dates';
import { translate } from '../../lib/i18n';
import { formatPaise } from '../../lib/money';
import { SOURCE_COLOR, TRUSTED, untrustedSourceLabel } from '../farmer/SourceBadge';
import type { DataSource, Locale, PricePoint } from '../../types/api';

type Props = {
  points: PricePoint[];
  locale: Locale;
};

const WIDTH = 320;
const HEIGHT = 160;
const PAD = 12;

function legendLabel(source: DataSource, locale: Locale): string {
  return TRUSTED.has(source)
    ? source
    : untrustedSourceLabel(source as Exclude<DataSource, 'AGMARKNET' | 'MSAMB'>, locale);
}

export function PriceHistory({ points, locale }: Props) {
  if (points.length < 2) return null;

  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return null;

  const values = points.map(p => p.modal_paise_per_qtl);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const xStep = (WIDTH - PAD * 2) / (points.length - 1);
  const xFor = (i: number) => PAD + i * xStep;
  const yFor = (v: number) => HEIGHT - PAD - ((v - min) / range) * (HEIGHT - PAD * 2);

  const sourcesPresent = Array.from(new Set(points.map(p => p.source)));

  return (
    <View>
      <Text style={styles.axisTitle}>{translate('chart_axis_price', locale)}</Text>

      <View style={styles.plotRow}>
        {/* `height: HEIGHT` + space-between puts max level with the top of the
            plot and min level with the bottom, which is where they are. */}
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
            {points.slice(1).map((point, idx) => {
              const prev = points[idx];
              if (!prev) return null;
              return (
                <Line
                  key={point.obs_date}
                  x1={xFor(idx)}
                  y1={yFor(prev.modal_paise_per_qtl)}
                  x2={xFor(idx + 1)}
                  y2={yFor(point.modal_paise_per_qtl)}
                  stroke={SOURCE_COLOR[point.source]}
                  strokeWidth={2}
                />
              );
            })}
          </Svg>

          <View style={styles.xAxis}>
            <Text style={styles.axisLabel}>{formatDateShort(first.obs_date, locale)}</Text>
            <Text style={styles.axisLabel}>{formatDateShort(last.obs_date, locale)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.legendRow}>
        {sourcesPresent.map(source => (
          <View key={source} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: SOURCE_COLOR[source] }]} />
            <Text style={styles.legendLabel}>{legendLabel(source, locale)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  axisTitle: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 4 },
  plotRow: { flexDirection: 'row', alignItems: 'stretch' },
  yAxis: { height: HEIGHT, justifyContent: 'space-between', marginRight: 6, alignItems: 'flex-end' },
  plot: { flex: 1 },
  xAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 2 },
  axisLabel: { fontSize: 11, color: '#888' },
  legendRow: { flexDirection: 'row', gap: 16, marginTop: 10, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendLabel: { fontSize: 12, color: '#555' },
});
