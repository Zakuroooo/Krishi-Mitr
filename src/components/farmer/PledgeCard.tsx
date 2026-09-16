/**
 * S11 — the pledge card. P12, P1 priority.
 *
 * ★ This is the screen that answers the thesis. The whole product argues that the
 *   binding constraint is not information but **the ability to wait** — this card
 *   is the only surface that does something about it. A farmer who now believes
 *   holding pays ₹6,290 still cannot hold if he needs cash on Tuesday. This says:
 *   borrow against the lot, pay ₹92 of interest, keep the ₹6,290.
 *
 * ★ I13, and why this is a *component* rather than a route: "absent entirely if
 *   not worthwhile" is a rendering property, and the cheapest way to guarantee it
 *   is to have nothing to render. `pledge_quote` arrives on the window response;
 *   when the server decides the loan is not worth it, it sends `null`, this
 *   component returns `null`, and there is no card, no empty state, and no
 *   "unavailable" placeholder for a judge to interrogate. A separate screen would
 *   have needed a navigation entry that exists whether or not the card does —
 *   i.e. a route to nowhere on the branch the invariant is about.
 *
 *   Note the comparison against `expected_gain_paise` is rendered but never
 *   *evaluated* here. `is_worthwhile` is the server's decision (CANON §8), and
 *   re-deriving it client-side would create a second implementation that could
 *   disagree with the one that actually gated the response. We show the farmer the
 *   two numbers the server compared. We do not second-guess the comparison.
 *
 * ★ CANON §8 rule 2 — "Every surface says 'Indicative simulation — not a lender
 *   quote.'" `disclaimer` comes off the wire and is rendered verbatim, in the same
 *   card, not in a footer a screenshot might crop. This is a simulation shown to a
 *   government panel; the label is the feature.
 *
 * ★ CANON §8 rule 3 — the LTV and rate shown are whatever the server sent. They
 *   are illustrative until Kartik has read WDRA's published terms and recorded the
 *   source URL. Hence `illustrative` on the rate line: TODO(kartik) to drop that
 *   qualifier once the terms are sourced, and not before.
 *
 * ★ I1/I3 — `loan_paise` and `interest_paise` are integer paise straight to
 *   `formatPaise`; `ltv_bps` and `rate_bps_annual` go through `formatBps`. There is
 *   no arithmetic in this file at all beyond one subtraction of two integers.
 */

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatBps, formatNumber, formatPaise } from '../../lib/money';
import { useT } from '../../lib/i18n';
import type { Locale, PledgeQuote } from '../../types/api';

export interface PledgeCardProps {
  /** Straight off `WindowRes.pledge_quote`. `null` is the I13 path — render nothing. */
  quote: PledgeQuote | null;
  /**
   * `WindowRes.expected_gain_paise`, for the side-by-side. Nullable because a
   * `NO_ADVICE` response nulls it — and on that branch the server sends
   * `pledge_quote: null` too, so the pair is never half-present in practice.
   */
  expectedGainPaise: number | null;
  locale: Locale;
  /**
   * Route out to Stitch 13, the full loan screen. A callback rather than a
   * `navigation` object, for the same reason `VerdictCard.onSeeCosts` is:
   * this component stays presentational and its suite can render it with no
   * navigation container. Absent in tests, so the link simply is not offered.
   */
  onSeeLoanDetails?: () => void;
}

export function PledgeCard({ quote, expectedGainPaise, locale, onSeeLoanDetails }: PledgeCardProps) {
  const { t } = useT();
  // I13. Not a conditional inside a card — the absence of the card itself.
  if (quote === null) return null;

  return (
    <View style={styles.card} testID="pledge-card">
      <Text style={styles.eyebrow}>{t('pledge_eyebrow')}</Text>
      <Text style={styles.title}>{t('pledge_loan_heading')}</Text>

      <Text style={styles.loanLabel}>{t('pledge_loan_label')}</Text>
      <Text testID="pledge-loan" style={styles.loanValue}>
        {formatPaise(quote.loan_paise, locale)}
      </Text>

      <View style={styles.rows}>
        <Row
          label={t('pledge_days_interest', { days: formatNumber(quote.days, locale) })}
          value={formatPaise(quote.interest_paise, locale)}
          testID="pledge-interest"
        />
        <Row label={t('pledge_ltv_label')} value={formatBps(quote.ltv_bps, locale)} />
        <Row label={t('pledge_rate_label')} value={formatBps(quote.rate_bps_annual, locale)} />
      </View>

      {/*
        ★ The ethics beat, made arithmetic. Interest next to gain, at comparable
          weight, so the farmer is looking at the trade and not at a loan offer.
          This is also I16's spirit applied to a second pair of numbers: the cost
          of the option renders beside its benefit, not underneath it in grey.
      */}
      {expectedGainPaise !== null ? (
        <View style={styles.compare}>
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>{t('pledge_compare_gain_label')}</Text>
            <Text testID="pledge-compare-gain" style={[styles.compareValue, styles.gain]}>
              + {formatPaise(expectedGainPaise, locale)}
            </Text>
          </View>
          <Text style={styles.compareVs}>{t('pledge_compare_vs')}</Text>
          <View style={styles.compareCol}>
            <Text style={styles.compareLabel}>{t('interest')}</Text>
            <Text testID="pledge-compare-interest" style={[styles.compareValue, styles.cost]}>
              − {formatPaise(quote.interest_paise, locale)}
            </Text>
          </View>
        </View>
      ) : null}

      <Text style={styles.warehouse}>
        {t('pledge_warehouse_label')}: {quote.warehouse_id}
      </Text>

      {/* CANON §8 rule 2. Verbatim from the server, inside the card. */}
      <Text testID="pledge-disclaimer" style={styles.disclaimer}>
        {quote.disclaimer}
      </Text>

      {onSeeLoanDetails ? (
        <TouchableOpacity
          testID="pledge-see-details"
          style={styles.detailsLink}
          onPress={onSeeLoanDetails}
          accessibilityRole="button">
          <Text style={styles.detailsLinkText}>{t('loan_see_details')}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function Row({ label, value, testID }: { label: string; value: string; testID?: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text testID={testID} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const GREEN = '#1B5E20';
const RED = '#C62828';

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  eyebrow: { fontSize: 13, color: '#666', fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '800', color: '#212121', marginTop: 2 },

  loanLabel: { fontSize: 14, color: '#666', marginTop: 16 },
  loanValue: { fontSize: 28, fontWeight: '800', color: GREEN, marginTop: 2 },

  rows: { marginTop: 16 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  rowLabel: { fontSize: 14, color: '#555', flexShrink: 1, paddingRight: 12 },
  rowValue: { fontSize: 14, color: '#333', fontWeight: '600' },

  compare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#EEE',
    marginTop: 12,
    paddingTop: 16,
  },
  compareCol: { flex: 1 },
  compareLabel: { fontSize: 13, color: '#666' },
  // ★ One style object for both sides of the trade — same size, same weight.
  compareValue: { fontSize: 18, fontWeight: '800', marginTop: 2 },
  gain: { color: GREEN },
  cost: { color: RED },
  compareVs: { fontSize: 13, color: '#999', paddingHorizontal: 8 },

  warehouse: { fontSize: 13, color: '#666', marginTop: 16 },
  disclaimer: { fontSize: 12, color: '#8A6D3B', marginTop: 8, fontStyle: 'italic' },
  detailsLink: { marginTop: 12, paddingVertical: 8 },
  detailsLinkText: { fontSize: 15, fontWeight: '700', color: '#9B2F00' },
});
