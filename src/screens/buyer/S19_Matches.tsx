/**
 * S19 — the buyer's match list for one demand. Demo beat 9's setup: this is the
 * screen where a buyer sees that three smallholders together fill an order he
 * would otherwise have given a middleman.
 *
 * ★ What this screen used to do, and why it had to change:
 *   it carried a `MATCHES` module constant with a field `avgPrice: 1950` —
 *   **rupees, in a field that does not end `_paise`** — rendered as
 *   `₹{formatNumber(m.avgPrice)}`, a hand-composed rupee symbol bypassing
 *   `formatPaise`. That is I1 broken twice over in one line. It also had no
 *   query, so no loading, empty or error state, and it invented farmer names and
 *   districts that no endpoint returns.
 *
 * ★ It is now `GET /demands/{id}/matches` (CANON §7.6), and the contract decides
 *   what renders. Two things CANON deliberately does **not** return, and how this
 *   screen handles each rather than filling them in:
 *
 *   - **No price on a match.** A match answers "which lots fill this order"; the
 *     price is the buyer's own `bid_paise_per_qtl` until an offer is made. So the
 *     bid appears once, at the top, labelled as the buyer's own — not repeated
 *     per card, which would read as each bundle having its own quote.
 *   - **No farmer name or village on a lot row**, only `lot_id` and
 *     `qty_allocated_kg`. Inventing them is the I8 class of mistake — fabricated
 *     data rendered as if it were real — so the rows show an index, the id, and
 *     the allocation. See the TODO below.
 *
 * ★ The hero number is `fill_bps`, not a price. Every match here is against the
 *   same bid, so the figure that actually separates them is how much of the order
 *   each one fills — and a bundle that fills half says so in words, next to the
 *   percentage, at the same size. Same rule as I16: the shortfall does not get to
 *   be smaller than the headline.
 *
 * TODO(akash): `GET /demands/{id}/matches` returns bare `lot_id`s, and
 *   `GET /lots/{id}` is actor-scoped (I4) so a buyer cannot resolve them. The
 *   buyer sees ids where he wants "रामभाऊ पाटील, निफाड". Either the match rows
 *   need a `farmer_label`/`village` pair the seed can fill, or §7.6 needs a
 *   buyer-visible lot summary. Raised in docs/BLOCKERS.md.
 *
 * ★ Touched under Pranay's hand (app-lane lead, CLAUDE.md §1). Shreya owns the
 *   buyer screens; this was an invariant fix, not a redesign.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import { getDemands, getMatches } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatBps, formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { USE_FIXTURES } from '../../config';
import { fxDemand } from '../../fixtures/demands';
import { fxMatches } from '../../fixtures/matches';
import type { DemandDto, Locale, MatchDto, MatchesRes } from '../../types/api';

/** The demo's demand. Same pattern as S22's `DEFAULT_TX_ID`. */
const DEFAULT_DEMAND_ID = fxDemand.id;

/** 10000 bps = the whole order (I3). */
const FULL_FILL_BPS = 10000;

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

export function S19_Matches({
  demandId = DEFAULT_DEMAND_ID,
  onSelectOffer,
  onViewLot,
}: {
  demandId?: string;
  onSelectOffer?: (id: string) => void;
  /**
   * S20_LotDetail existed in this repo but nothing ever navigated to it.
   * Optional, so a caller that has not wired navigation yet still renders.
   */
  onViewLot?: (id: string) => void;
}) {
  const [locale, setLocale] = useState<Locale>('mr');
  React.useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['demands', demandId, 'matches'],
    queryFn: () => fetchMatches(demandId),
  });

  // Additive — a failed demand lookup must not take the match list down with it.
  const { data: demand } = useQuery({
    queryKey: ['demands', demandId],
    queryFn: () => fetchDemand(demandId),
  });

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={32} />
        <View style={styles.gap} />
        <Skeleton height={160} />
        <View style={styles.gap} />
        <Skeleton height={160} />
      </ScrollView>
    );
  }

  // P11: `error && !data`. A match list held from an earlier read is still a
  // useful match list; a failed refetch on venue wifi must not replace it with a
  // retry button while a buyer is mid-decision.
  if (error && !data) {
    return (
      <ErrorState
        message={translate('matches_fetch_error', locale)}
        onRetry={() => refetch()}
        locale={locale}
      />
    );
  }

  if (!data || data.matches.length === 0) {
    return (
      <View style={[styles.container, styles.content]}>
        <EmptyState title={translate('matches_empty', locale)} />
      </View>
    );
  }

  const demandQtl = demand ? toQuintal(demand.qty_kg) : null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>
        {translate('matches_header', locale, {
          qty: formatNumber(demandQtl ?? 0, locale),
        })}
      </Text>

      {demand === null || demand === undefined ? null : (
        <Card style={styles.demandCard}>
          <Text style={styles.demandLine}>
            {translate('matches_demand_line', locale, {
              qty: formatNumber(toQuintal(demand.qty_kg), locale),
              grade: demand.min_grade,
            })}
          </Text>
          {/*
            I1: the only rupee figure on this screen, and it comes out of
            `formatPaise` — never a hand-composed `₹`. Stated once, because it is
            the buyer's own bid and not a per-bundle quote.
          */}
          <Text style={styles.bidLine}>
            {translate('matches_your_bid_label', locale)}{' '}
            <Text style={styles.bidValue}>
              {formatPaise(demand.bid_paise_per_qtl, locale)}
              {translate('per_quintal_suffix', locale)}
            </Text>
          </Text>
        </Card>
      )}

      {data.matches.map(match => (
        <MatchCard
          key={matchKey(match)}
          match={match}
          demandQtyKg={demand?.qty_kg ?? null}
          locale={locale}
          onSelectOffer={onSelectOffer}
          onViewLot={onViewLot}
        />
      ))}
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
  const isPartial = match.fill_bps < FULL_FILL_BPS;
  const shortfallKg =
    demandQtyKg === null ? null : Math.max(0, demandQtyKg - match.total_qty_kg);

  return (
    <Card style={[styles.matchCard, isPartial ? styles.matchCardPartial : styles.matchCardFull]}>
      <View style={styles.cardHeader}>
        <Badge
          label={
            match.kind === 'COMBINATION'
              ? translate('matches_combination_bundle', locale, {
                  n: formatNumber(match.lots.length, locale),
                })
              : translate('matches_single_lot', locale)
          }
          type={match.kind === 'COMBINATION' ? 'INFO' : 'SUCCESS'}
        />
        <Badge
          label={translate('post_demand_grade_chip', locale, { grade: match.grade })}
          type={`GRADE_${match.grade}`}
        />
      </View>

      {/* The hero, and the reason it is the hero is in this file's header. */}
      <Text style={styles.fillNum}>{formatBps(match.fill_bps, locale)}</Text>
      <Text style={styles.fillLabel}>{translate('matches_fill_label', locale)}</Text>

      {/*
        I16's rule borrowed: if this bundle leaves the order short, that sentence
        renders at the same size and weight as the fill label above it — not in a
        smaller grey line a buyer scrolls past.
      */}
      {isPartial && shortfallKg !== null && shortfallKg > 0 ? (
        <Text style={styles.shortfallNote}>
          {translate('matches_partial_fill_note', locale, {
            qty: formatNumber(toQuintal(shortfallKg), locale),
          })}
        </Text>
      ) : null}

      <Text style={styles.qtyText}>
        {translate('total_qty_line', locale, {
          qty: formatNumber(toQuintal(match.total_qty_kg), locale),
        })}
      </Text>
      <Text style={styles.metaText}>
        {translate('score_label', locale, {
          score: formatNumber(match.avg_score, locale),
          max: formatNumber(1000, locale),
        })}
      </Text>
      <Text style={styles.metaText}>
        {translate('distance_km_line', locale, {
          distance: formatNumber(match.distance_km, locale),
        })}
      </Text>

      <View style={styles.divider} />

      <Text style={styles.sectionLabel}>{translate('matches_lots_included', locale)}</Text>
      {match.lots.map((lot, i) => (
        <View key={lot.lot_id} style={styles.lotRow}>
          <Text style={styles.lotLabel}>
            {translate('matches_lot_index', locale, { n: formatNumber(i + 1, locale) })}
            {' · '}
            <Text style={styles.lotId}>{lot.lot_id}</Text>
          </Text>
          <Text style={styles.lotQty}>
            {translate('qtl_abbrev', locale, {
              qty: formatNumber(toQuintal(lot.qty_allocated_kg), locale),
            })}
          </Text>
        </View>
      ))}

      {/*
        CANON §7.6: "`score` must decompose. The UI shows the `why_*` sentence.
        'Because the algorithm said so' is not an answer a judge accepts." So the
        sentence renders and the raw 0.91 does not.
      */}
      <Text style={styles.reasonText}>{locale === 'en' ? match.why_en : match.why_mr}</Text>

      {onViewLot && match.lots.length === 1 ? (
        <Button
          title={translate('matches_view_lot_detail', locale)}
          variant="secondary"
          onPress={() => onViewLot(match.lots[0]!.lot_id)}
          style={styles.actionBtn}
        />
      ) : null}
      <Button
        title={translate('matches_make_offer', locale)}
        onPress={() => onSelectOffer?.(matchKey(match))}
        style={styles.actionBtn}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20, paddingBottom: 32 },
  gap: { height: 12 },
  header: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 12 },
  demandCard: { padding: 16, marginBottom: 16, backgroundColor: '#E8F0FE' },
  demandLine: { fontSize: 15, color: '#1E293B', fontWeight: '600' },
  bidLine: { fontSize: 15, color: '#334155', marginTop: 6 },
  bidValue: { fontSize: 17, fontWeight: '800', color: '#1565C0' },
  matchCard: { padding: 18, marginBottom: 16 },
  matchCardFull: {},
  // A bundle that leaves the order short is outlined, not hidden — same visual
  // language S16 uses for the pool that must not form.
  matchCardPartial: { borderWidth: 1, borderColor: '#FEB2B2' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  fillNum: { fontSize: 30, fontWeight: '800', color: '#1B5E20' },
  fillLabel: { fontSize: 15, color: '#475569', fontWeight: '600', marginTop: 2 },
  shortfallNote: { fontSize: 15, color: '#C53030', fontWeight: '600', marginTop: 8, lineHeight: 21 },
  qtyText: { fontSize: 15, color: '#334155', fontWeight: '600', marginTop: 10 },
  metaText: { fontSize: 14, color: '#64748B', marginTop: 2 },
  divider: { height: 1, backgroundColor: '#E2E8F0', marginVertical: 12 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: '#64748B', marginBottom: 6 },
  lotRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  lotLabel: { flex: 1, fontSize: 14, color: '#1E293B', marginRight: 8 },
  lotId: { fontSize: 13, color: '#64748B' },
  lotQty: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  reasonText: {
    fontSize: 14,
    color: '#2E7D32',
    marginTop: 12,
    backgroundColor: '#F1F8E9',
    padding: 10,
    borderRadius: 6,
    lineHeight: 20,
  },
  actionBtn: { marginTop: 12 },
});
