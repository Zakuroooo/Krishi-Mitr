/**
 * S8 — the model card. PRANAY.md §1.4 calls it P1; internally it is the honesty
 * screen, and it is the one screen whose entire job is to make the app less
 * impressive than it looks.
 *
 * ★ Why a farmer-facing screen at all, when the audience is really a judge:
 *   because I6 ("the model may refuse") is only credible if the model's accuracy
 *   is *stated somewhere a user can reach*, not just described in a pitch. S9 can
 *   say "we will not advise"; S8 is where the claim behind that — "we know how
 *   good we are, to two decimal places, against a named baseline" — is written
 *   down. A judge asking "how do you know your forecast is any good?" should be
 *   answered by a tap, not by a slide.
 *
 * ★ The screen renders the server's numbers and **never grades them**. `mase` is
 *   printed as it arrives; the verdict line ("better than the baseline" /
 *   "worse") is a comparison against 1.0, which is the definition of MASE and not
 *   a policy this screen invents. When `mase >= 1.0` it says so, at the same size
 *   and in the same place — `FRONTEND_NEEDS_AI.md` §2 promises Nikhil we will show
 *   that rather than hide it, and the `fxModelCardWorseThanBaseline` fixture makes
 *   the promise testable instead of aspirational.
 *
 * ★ Coverage is the number that catches a liar, so it is rendered against its
 *   nominal. `७८% (लक्ष्य ८०%)` invites the arithmetic; a bare `७८%` does not.
 *   A hardcoded 8000 would be detectable by counting points on the S7 fan, which
 *   is exactly why we ask for a measured value and print the target beside it.
 *
 * ★ No `Date.now()` at render time. The relative age ("trained N days ago") is
 *   derived in a `useMemo` keyed on `trained_at`, and the **absolute** date is the
 *   primary rendering — see `StaleBanner`'s header for the bug this avoids: a
 *   clock-derived string with nothing scheduling a re-render is a string that
 *   silently stops being true on a screen left open. Days is a coarse enough unit
 *   that a ticker would be theatre, so the absolute date carries the truth and
 *   the age is the convenience.
 *
 * TODO(nikhil): PRANAY.md §1.4's S8 row asks for `known_limitations` and
 *   `model_version`. Neither is in CANON §7.4 nor in our `ModelCard` type, so
 *   neither is invented here. The limitations block below is assembled from the
 *   nine fields that *do* exist — horizon, baseline, corpus window, coverage
 *   shortfall — and `algo` + `trained_at` stand in for a version, which is
 *   arguably more useful than a semver anyway. Open question in
 *   `FRONTEND_NEEDS_AI.md` §11.
 */

import React, { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';

import { getModelCard } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { devNum, translate } from '../../lib/i18n';
import { formatBps, formatNumber } from '../../lib/money';
import { DEFAULT_COMMODITY_ID, USE_FIXTURES } from '../../config';
import { fxModelCard } from '../../fixtures/modelCard';
import { StaleBanner } from '../../components/farmer/StaleBanner';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import type { Locale, ModelCard } from '../../types/api';

/**
 * The nominal the 80% band is *supposed* to hit. Named, because the interesting
 * number on this screen is the gap between this and `coverage_80_bps` — not
 * either one alone.
 */
const NOMINAL_COVERAGE_BPS = 8000;

const DAY_MS = 24 * 60 * 60 * 1000;

async function fetchModelCard() {
  return USE_FIXTURES ? fxModelCard : getModelCard(DEFAULT_COMMODITY_ID);
}

/** `2026-09-05` -> `५ सप्टेंबर २०२५`-style. One name table per locale, since
 * Hindi and Marathi share Devanagari digits but NOT the same month words
 * ("सप्टेंबर" is Marathi; Hindi's word for September is "सितंबर") — a single
 * shared table would have quietly given every Hindi reader Marathi month
 * names, the exact "mixing" bug this pass exists to remove. */
const MONTHS_MR = [
  'जानेवारी', 'फेब्रुवारी', 'मार्च', 'एप्रिल', 'मे', 'जून',
  'जुलै', 'ऑगस्ट', 'सप्टेंबर', 'ऑक्टोबर', 'नोव्हेंबर', 'डिसेंबर',
];
const MONTHS_HI = [
  'जनवरी', 'फरवरी', 'मार्च', 'अप्रैल', 'मई', 'जून',
  'जुलाई', 'अगस्त', 'सितंबर', 'अक्तूबर', 'नवंबर', 'दिसंबर',
];
const MONTHS_EN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const MONTHS_BY_LOCALE: Record<Locale, string[]> = { mr: MONTHS_MR, hi: MONTHS_HI, en: MONTHS_EN };

/**
 * ISO date -> a readable date. Parses the `YYYY-MM-DD` prefix by string rather
 * than via `new Date()`, because `trained_at` carries an offset (+05:30) and
 * letting the device timezone shift it could print yesterday's date to a farmer
 * in a different zone — a model card that disagrees with itself by a day is a
 * small thing that reads as sloppiness on the one screen about rigour.
 */
function formatIsoDate(iso: string, locale: Locale): string {
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  const months = MONTHS_BY_LOCALE[locale];
  const monthName = months[m - 1] ?? '';
  if (locale === 'en') return `${d} ${monthName} ${y}`;
  return `${devNum(d, locale)} ${monthName} ${devNum(y, locale)}`;
}

/** A labelled row. Value is always the server's string, never a derived one. */
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

export default function S08_ModelCard() {
  const [locale, setLocale] = useState<Locale>('mr');
  useFocusEffect(
    useCallback(() => {
      getLocale().then(l => l && setLocale(l));
    }, []),
  );

  const { data, dataUpdatedAt, isLoading, error, refetch } = useQuery({
    queryKey: ['ai', 'model-card', DEFAULT_COMMODITY_ID],
    queryFn: fetchModelCard,
  });

  // Keyed on the timestamp, not read at render — see the header note.
  const trainedDaysAgo = useMemo(() => {
    if (!data) return null;
    const t = Date.parse(data.trained_at);
    if (Number.isNaN(t)) return null;
    return Math.max(0, Math.floor((Date.now() - t) / DAY_MS));
  }, [data]);

  if (isLoading) {
    return (
      <ScrollView contentContainerStyle={styles.root}>
        <Skeleton height={360} />
      </ScrollView>
    );
  }

  // Same rule as S9/S10 (P11): an errored background refetch must not shadow a
  // card the hydrated cache still holds.
  if (error && !data) {
    return (
      <ErrorState
        message={translate('model_card_error', locale)}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data) {
    return <EmptyState title={translate('model_card_empty', locale)} />;
  }

  const card: ModelCard = data;
  const beatsBaseline = card.mase < 1;
  const coverageShortfall = NOMINAL_COVERAGE_BPS - card.coverage_80_bps;

  return (
    <ScrollView contentContainerStyle={styles.root}>
      <StaleBanner dataUpdatedAt={dataUpdatedAt} locale={locale} />

      <Text style={styles.title}>{translate('model_card_title', locale)}</Text>
      <Text style={styles.subtitle}>
        {translate('model_card_subtitle', locale, {
          commodity: translate('demo_commodity_name', locale),
          days: formatNumber(card.horizon_days, locale),
        })}
      </Text>

      {/*
        MASE first, because it is the only number on this screen that answers
        "should I believe the forecast at all". The verdict word sits at the same
        size as the number so the bad case cannot be made quieter than the good
        one — the I16 instinct, applied to a claim about ourselves.
      */}
      <View style={styles.heroCard}>
        <Text style={styles.heroLabel}>{translate('mase_hero_label', locale)}</Text>
        <Text
          testID="mase-value"
          style={[styles.heroValue, { color: beatsBaseline ? GREEN : RED }]}>
          {devNum(card.mase.toFixed(2), locale)}
        </Text>
        <Text
          testID="mase-verdict"
          style={[styles.heroVerdict, { color: beatsBaseline ? GREEN : RED }]}>
          {translate(beatsBaseline ? 'mase_verdict_better' : 'mase_verdict_worse', locale)}
        </Text>
        <Text style={styles.heroNote}>
          {translate(beatsBaseline ? 'mase_note_better' : 'mase_note_worse', locale)}
        </Text>
      </View>

      {/*
        Coverage, printed against its nominal. The gap is the honest bit: an 80%
        band that actually contains 78.4% of outcomes is slightly optimistic, and
        saying so beside the number is cheaper than being caught.
      */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{translate('coverage_card_title', locale)}</Text>
        <Row
          label={translate('coverage_row_label', locale)}
          value={translate('coverage_value_with_target', locale, {
            coverage: formatBps(card.coverage_80_bps, locale),
            target: formatBps(NOMINAL_COVERAGE_BPS, locale),
          })}
          testID="coverage-value"
        />
        <Text testID="coverage-note" style={styles.cardNote}>
          {translate(coverageShortfall > 0 ? 'coverage_note_under' : 'coverage_note_ok', locale, {
            n: formatNumber(Math.round(card.coverage_80_bps / 1000), locale),
          })}
        </Text>
      </View>

      {/* Provenance. Same corpus S24 describes; the row count must agree. */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{translate('corpus_card_title', locale)}</Text>
        <Row label={translate('method_label', locale)} value={card.algo} testID="algo-value" />
        <Row
          label={translate('baseline_label', locale)}
          value={
            card.baseline === 'seasonal_naive'
              ? translate('baseline_seasonal_naive', locale)
              : card.baseline
          }
          testID="baseline-value"
        />
        <Row
          label={translate('train_rows_label', locale)}
          value={translate('train_rows_value', locale, { n: formatNumber(card.train_rows, locale) })}
          testID="train-rows-value"
        />
        <Row
          label={translate('train_window_label', locale)}
          value={`${formatIsoDate(card.train_from, locale)} — ${formatIsoDate(card.train_to, locale)}`}
          testID="train-window-value"
        />
        <Row
          label={translate('trained_at_label', locale)}
          value={
            trainedDaysAgo === null
              ? formatIsoDate(card.trained_at, locale)
              : `${formatIsoDate(card.trained_at, locale)} (${
                  trainedDaysAgo === 0
                    ? translate('trained_today', locale)
                    : translate('trained_days_ago', locale, { n: formatNumber(trainedDaysAgo, locale) })
                })`
          }
          testID="trained-at-value"
        />
      </View>

      {/*
        The limitations. Assembled from fields that exist rather than from a
        `known_limitations` array the backend has never agreed to send — see the
        TODO in the header. Each line is a statement this response can actually
        support, which is the only kind worth putting on the honesty screen.
      */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{translate('limitations_card_title', locale)}</Text>
        {[
          translate('limitation_horizon', locale, { days: formatNumber(card.horizon_days, locale) }),
          translate('limitation_corpus_scope', locale),
          translate('limitation_shocks', locale),
          coverageShortfall > 0
            ? translate('limitation_coverage_narrow', locale, {
                gap: formatBps(coverageShortfall, locale),
              })
            : translate('limitation_coverage_ok', locale),
          translate('limitation_refusal', locale),
        ].map((line, i) => (
          <View key={i} style={styles.bulletRow}>
            <Text style={styles.bullet}>·</Text>
            <Text testID={`limitation-${i}`} style={styles.bulletText}>
              {line}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const GREEN = colors.tertiary;
const RED = colors.critical;
const styles = StyleSheet.create({
  root: { padding: space.md, paddingBottom: space.xxl, backgroundColor: colors.background },

  title: { ...typography.headlineMd, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    marginBottom: space.md,
  },

  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    padding: space.lg,
    alignItems: 'center',
  },
  heroLabel: { ...typography.labelMd, color: colors.onSurfaceVariant, textAlign: 'center' },
  heroValue: { fontSize: 44, lineHeight: 50, fontFamily: fontFamily.extraBold, marginTop: 4 },
  // Deliberately the same size in both branches — see the hero comment.
  heroVerdict: {
    fontSize: 17,
    lineHeight: 23,
    fontFamily: fontFamily.bold,
    marginTop: 4,
    textAlign: 'center',
  },
  heroNote: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
    marginTop: 10,
    textAlign: 'center',
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
    marginTop: space.sm,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: 8 },
  cardNote: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 19,
    marginTop: 8,
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  rowLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flexShrink: 1,
    paddingRight: space.sm,
  },
  rowValue: { ...typography.titleMd, color: colors.onSurface, flexShrink: 1, textAlign: 'right' },

  bulletRow: { flexDirection: 'row', marginTop: 8, gap: 4 },
  bullet: { ...typography.bodySm, color: colors.outline, width: 14 },
  bulletText: { ...typography.bodySm, color: colors.onSurface, lineHeight: 20, flex: 1 },
});
