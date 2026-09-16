/**
 * S24 — data provenance. This is the I8 screen, and it is the one screen on
 * which being wrong is unrecoverable: CLAUDE.md §9 lists "unlabelled synthetic
 * data shown to a government panel" as the single mistake this team cannot walk
 * back from.
 *
 * ★ What this screen used to do, and why it had to change:
 *   it fired `api('/meta/data-provenance')` on mount **ungated by
 *   `USE_FIXTURES`** (I7 — "the demo makes zero live external network calls"),
 *   and on failure did `catch { setData(MOCK_PROVENANCE) }` — silently
 *   substituting invented audit totals, one of them pointing at
 *   `https://mandisetu.internal/synthetic-log`, a URL that does not exist. A
 *   provenance screen that fabricates its own provenance when the network is
 *   down is worse than no provenance screen, because it fabricates it
 *   *convincingly*, on stage, to the one audience that would check.
 *
 * ★ Every number here is derived from the rows, not asserted:
 *   the total is `sum(row_count)`, the market and commodity counts are distinct
 *   ids, and each source's share is computed in **bps** (I3) from those same
 *   counts. Nothing on screen is a figure a human typed. A judge can add the
 *   three counts by eye and get the total.
 *
 * ★ I8, made mechanical: `OFFICIAL_SOURCES` is the allowlist, and anything
 *   outside it is badged and carries a written note saying so. A `source_url` of
 *   `null` renders as "no verifiable link — this row is synthetic", never as a
 *   dead tappable link.
 *
 * ★ Touched under Pranay's hand (app-lane lead, CLAUDE.md §1). Shreya owns the
 *   buyer screens; this was an invariant fix, not a redesign.
 */

import React, { useState } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import type { BadgeType } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import { getDataProvenance } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatBps, formatNumber } from '../../lib/money';
import { formatDate } from '../../lib/dates';
import { USE_FIXTURES } from '../../config';
import { fxProvenance } from '../../fixtures/provenance';
import type { DataSource, Locale, ProvenanceRes, ProvenanceRow } from '../../types/api';

/**
 * I8's allowlist, stated once. "The UI badges anything not
 * `AGMARKNET`/`MSAMB`" — so the badge condition is membership here, never a
 * hand-written `!== 'SYNTHETIC'` that would quietly pass `IMPUTED` through as
 * if it were a government feed.
 */
const OFFICIAL_SOURCES: readonly DataSource[] = ['AGMARKNET', 'MSAMB'];

const isOfficial = (source: DataSource): boolean => OFFICIAL_SOURCES.includes(source);

/** `DataSource` and `BadgeType` share all five names — mapped explicitly so
 * adding a sixth source to CANON fails the typecheck here rather than falling
 * through to a neutral grey badge on a synthetic row. */
const SOURCE_BADGE: Record<DataSource, BadgeType> = {
  AGMARKNET: 'AGMARKNET',
  MSAMB: 'MSAMB',
  ARCHIVE: 'ARCHIVE',
  IMPUTED: 'IMPUTED',
  SYNTHETIC: 'SYNTHETIC',
};

const SOURCE_LABEL_KEY: Record<DataSource, string> = {
  AGMARKNET: 'source_agmarknet',
  MSAMB: 'source_msamb',
  ARCHIVE: 'source_archive',
  IMPUTED: 'source_imputed',
  SYNTHETIC: 'source_synthetic',
};

async function fetchProvenance(): Promise<ProvenanceRes> {
  if (USE_FIXTURES) return fxProvenance;
  return getDataProvenance();
}

interface SourceTotal {
  source: DataSource;
  row_count: number;
  /** I3: basis points, floored, derived from `row_count` — never a float
   * percentage carried on the wire. */
  share_bps: number;
}

/** Rows aggregated by source, largest first. */
function totalsBySource(rows: ProvenanceRow[], total: number): SourceTotal[] {
  const counts = new Map<DataSource, number>();
  for (const row of rows) {
    counts.set(row.source, (counts.get(row.source) ?? 0) + row.row_count);
  }
  return [...counts.entries()]
    .map(([source, row_count]) => ({
      source,
      row_count,
      // Integer arithmetic throughout — `Math.floor`, not a rounded float, for
      // the same reason money uses `//`.
      share_bps: total > 0 ? Math.floor((row_count * 10000) / total) : 0,
    }))
    .sort((a, b) => b.row_count - a.row_count);
}

const distinctCount = (rows: ProvenanceRow[], pick: (r: ProvenanceRow) => string): number =>
  new Set(rows.map(pick)).size;

export function S24_DataProvenance() {
  const [locale, setLocale] = useState<Locale>('mr');
  React.useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['meta', 'provenance'],
    queryFn: fetchProvenance,
  });

  const openUrl = (url: string) => {
    Linking.openURL(url).catch(() => {});
  };

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={40} />
        <View style={styles.gap} />
        <Skeleton height={140} />
        <View style={styles.gap} />
        <Skeleton height={120} />
      </ScrollView>
    );
  }

  // P11: `error && !data`. A cached provenance table is the same table it was an
  // hour ago — a failed refetch on venue wifi must not replace it with a retry
  // button mid-demo. What it must never do is replace it with invented numbers,
  // which is what the previous `catch` did.
  if (error && !data) {
    return (
      <ErrorState
        message={translate('provenance_fetch_error', locale)}
        onRetry={() => refetch()}
        locale={locale}
      />
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <View style={[styles.container, styles.content]}>
        <EmptyState title={translate('provenance_empty', locale)} />
      </View>
    );
  }

  const rows = data.rows;
  const total = rows.reduce((sum, r) => sum + r.row_count, 0);
  const bySource = totalsBySource(rows, total);
  const officialRows = rows.filter(r => isOfficial(r.source)).reduce((s, r) => s + r.row_count, 0);
  const flaggedRows = total - officialRows;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{translate('data_provenance', locale)}</Text>

      {/* The sentence a judge should read before any number on this screen. */}
      <Text style={styles.i8Rule}>{translate('provenance_i8_rule', locale)}</Text>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{translate('provenance_total_label', locale)}</Text>
        <Text style={styles.totalNum}>{formatNumber(total, locale)}</Text>
        <Text style={styles.subNote}>
          {translate('provenance_coverage_note', locale, {
            markets: formatNumber(distinctCount(rows, r => r.market_id), locale),
            crops: formatNumber(distinctCount(rows, r => r.commodity_id), locale),
          })}
        </Text>
        <Text style={styles.splitNote}>
          {translate('provenance_official_split', locale, {
            official: formatNumber(officialRows, locale),
            flagged: formatNumber(flaggedRows, locale),
          })}
        </Text>
        <Text style={styles.subNote}>
          {translate('provenance_generated_at', locale, {
            date: formatDate(data.generated_at, locale, translate('date_unknown', locale)),
          })}
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>
        {translate('provenance_source_breakdown_title', locale)}
      </Text>

      {bySource.map(s => (
        <Card key={s.source} style={styles.sourceCard}>
          <View style={styles.sourceHeader}>
            <Badge label={translate(SOURCE_LABEL_KEY[s.source], locale)} type={SOURCE_BADGE[s.source]} />
            <Text style={styles.percentText}>{formatBps(s.share_bps, locale)}</Text>
          </View>
          <Text style={styles.countText}>
            {translate('provenance_count_label', locale)}{' '}
            <Text style={styles.bold}>{formatNumber(s.row_count, locale)}</Text>
          </Text>
          {isOfficial(s.source) ? null : (
            <Text style={styles.unofficialNote}>{translate('provenance_unofficial_note', locale)}</Text>
          )}
        </Card>
      ))}

      <Text style={styles.sectionTitle}>{translate('provenance_market_rows_title', locale)}</Text>

      {rows.map(row => (
        <Card
          key={`${row.commodity_id}:${row.market_id}:${row.source}`}
          style={[styles.sourceCard, isOfficial(row.source) ? styles.rowOfficial : styles.rowFlagged]}>
          <View style={styles.sourceHeader}>
            <Text style={styles.rowTitle}>
              {translate('provenance_row_title', locale, {
                commodity: row.commodity_name_mr,
                market: row.market_name_mr,
              })}
            </Text>
            <Badge label={translate(SOURCE_LABEL_KEY[row.source], locale)} type={SOURCE_BADGE[row.source]} />
          </View>

          <Text style={styles.countText}>
            {translate('provenance_count_label', locale)}{' '}
            <Text style={styles.bold}>{formatNumber(row.row_count, locale)}</Text>
          </Text>

          <Text style={styles.dateText}>
            {translate('provenance_date_range_label', locale, {
              range: translate('provenance_date_range_span', locale, {
                from: formatDate(row.first_obs_date, locale, translate('date_unknown', locale)),
                to: formatDate(row.last_obs_date, locale, translate('date_unknown', locale)),
              }),
            })}
          </Text>

          {/*
            I8's honest case, spelled out in `fixtures/provenance.ts`'s own
            header: a null `source_url` is acceptable *only* when the row still
            says plainly that it is not verifiable. So the null branch renders
            that sentence rather than an inert link the tap would swallow.
          */}
          {row.source_url === null ? (
            <Text style={styles.noUrlText}>{translate('provenance_no_source_url', locale)}</Text>
          ) : (
            <TouchableOpacity
              onPress={() => openUrl(row.source_url as string)}
              accessibilityRole="link"
              accessibilityLabel={translate('live_source_url', locale)}
              style={styles.urlBtn}>
              <Text style={styles.urlText}>{row.source_url}</Text>
            </TouchableOpacity>
          )}
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 32 },
  gap: { height: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  i8Rule: { fontSize: 13, color: '#475569', lineHeight: 20, marginBottom: 16 },
  summaryCard: { padding: 20, backgroundColor: '#1B5E20' },
  summaryLabel: { fontSize: 14, color: '#A5D6A7', fontWeight: '600' },
  totalNum: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginVertical: 4 },
  subNote: { fontSize: 13, color: '#C8E6C9', marginTop: 2 },
  splitNote: { fontSize: 14, color: '#FFFFFF', fontWeight: '700', marginTop: 8 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginVertical: 14 },
  sourceCard: { padding: 16, marginBottom: 12 },
  rowOfficial: {},
  // Same border the Pareto-violation row uses on S16 — one visual language for
  // "this needs reading, not skipping".
  rowFlagged: { borderWidth: 1, borderColor: '#FEB2B2', backgroundColor: '#FFF5F5' },
  sourceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rowTitle: { flex: 1, fontSize: 15, fontWeight: '700', color: '#1E293B', marginRight: 8 },
  percentText: { fontSize: 18, fontWeight: '800', color: '#1E293B' },
  countText: { fontSize: 15, color: '#334155', marginTop: 4 },
  bold: { fontWeight: '700', color: '#1E293B' },
  dateText: { fontSize: 13, color: '#64748B', marginTop: 2 },
  unofficialNote: { fontSize: 13, color: '#C53030', fontWeight: '600', marginTop: 8, lineHeight: 19 },
  noUrlText: { fontSize: 13, color: '#C53030', fontWeight: '600', marginTop: 10, lineHeight: 19 },
  urlBtn: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  urlText: { fontSize: 13, color: '#1565C0', fontWeight: '600' },
});
