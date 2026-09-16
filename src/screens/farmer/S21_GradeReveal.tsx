/**
 * S21 — the grade reveal. Stitch screen 21
 * (`21_your_grade_ai_harvest_quality_score_reveal`).
 *
 * ★ Every number here arrives in `route.params` from S20's own assay
 *   submission: the score, the grade and the weakest dimension are what
 *   `lib/grading.ts` returned for the six answers the farmer just gave. The
 *   previous version of this screen hardcoded a Grade A at 850/1000 with a
 *   fixed four-row "breakdown" (92/95/88/98), which meant it showed the same
 *   celebration no matter what anyone answered — including to a farmer whose
 *   lot actually graded C.
 *
 * ★ The mockup's "Assay Diagnostic Breakdown" invents a per-parameter score
 *   the assay does not produce. What the assay *does* have — and what CANON's
 *   own `AssayRecord` comment says a buyer wants — is the six answers behind
 *   the grade. So the breakdown here is those answers, echoed back verbatim.
 *
 * ★ Not reproduced, for the usual reason: the "Fair Value Engine" price band
 *   with "5 Active Bidders in Niphad" (no field carries a bidder count, and
 *   the price band would be a forecast this screen never fetched), "Hash
 *   #LP94" (nothing is hashed), "Krishi Mitra 100% Escrow Guarantee" and
 *   "Mandi Board Escrow" (no such guarantee), "Top 15% arrivals today" (not
 *   computed anywhere), "Download Grade Certificate (PDF)" (no PDF is
 *   generated), and the "+₹3,200 Gain" from a two-day curing recommendation
 *   that no model in this project makes.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatNumber } from '../../lib/money';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { AssayDimension, Grade } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S21_GradeReveal'>;

/** Grade → the palette it reads in. C is not painted as a failure: it is a
 * real, sellable grade, and a farmer who gets one should not be shown red. */
const GRADE_TONE: Record<Grade, { fg: string; bg: string }> = {
  A: { fg: colors.tertiary, bg: colors.positiveContainer },
  B: { fg: colors.primary, bg: colors.onPrimaryContainer },
  C: { fg: colors.warning, bg: colors.warningContainer },
};

const TIP_KEY: Record<AssayDimension, string> = {
  damage_pct: 'tip_damage_pct',
  sprouting: 'tip_sprouting',
  size_uniform: 'tip_size_uniform',
  colour_uniform: 'tip_colour_uniform',
  moisture_feel: 'tip_moisture_feel',
  foreign_matter: 'tip_foreign_matter',
};

/** The five rating dimensions, with the label for each of the three answers.
 * Same keys S20 asked the questions with, so the echo cannot drift from the
 * question. */
const ANSWER_LABEL: Record<
  Exclude<AssayDimension, 'damage_pct'>,
  { questionKey: string; choices: Record<1 | 2 | 3, string> }
> = {
  size_uniform: {
    questionKey: 'assay_q_size_uniform',
    choices: { 3: 'assay_size_uniform_3', 2: 'assay_size_uniform_2', 1: 'assay_size_uniform_1' },
  },
  colour_uniform: {
    questionKey: 'assay_q_colour_uniform',
    choices: { 3: 'assay_colour_uniform_3', 2: 'assay_colour_uniform_2', 1: 'assay_colour_uniform_1' },
  },
  sprouting: {
    questionKey: 'assay_q_sprouting',
    choices: { 3: 'assay_sprouting_3', 2: 'assay_sprouting_2', 1: 'assay_sprouting_1' },
  },
  moisture_feel: {
    questionKey: 'assay_q_moisture_feel',
    choices: { 3: 'assay_moisture_feel_3', 2: 'assay_moisture_feel_2', 1: 'assay_moisture_feel_1' },
  },
  foreign_matter: {
    questionKey: 'assay_q_foreign_matter',
    choices: { 3: 'assay_foreign_matter_3', 2: 'assay_foreign_matter_2', 1: 'assay_foreign_matter_1' },
  },
};

const ORDER: Array<Exclude<AssayDimension, 'damage_pct'>> = [
  'size_uniform',
  'colour_uniform',
  'sprouting',
  'moisture_feel',
  'foreign_matter',
];

export default function S21_GradeReveal({ route, navigation }: Props) {
  const { t, locale } = useT();
  const { result, answers } = route.params;
  const tone = GRADE_TONE[result.grade];

  /** 0..1000 → a bar width. The score is the only figure the assay produces,
   * so it is the only one drawn. */
  const scorePct = Math.max(0, Math.min(100, Math.round((result.score / 1000) * 100)));

  /* ★ The grade is the number that decides what a farmer can ask for, and
     this screen had no speaker. It reads the grade, the score, the weakest
     dimension and its tip — the same four things the cards render, and the
     tip is the actionable half. */
  const narration = [
    t('gr_narr_grade', {
      grade: result.grade,
      score: formatNumber(result.score, locale),
    }),
    t('gr_narr_weakest', {
      dimension:
        result.weakest_dimension === 'damage_pct'
          ? t('assay_damage_question')
          : t(ANSWER_LABEL[result.weakest_dimension].questionKey),
    }),
    t(TIP_KEY[result.weakest_dimension]),
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
        <Text style={styles.headerTitle}>{t('gr_title')}</Text>
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── The grade ─────────────────────────────────────────────── */}
        <View style={[styles.gradeCard, { borderColor: tone.fg }]}>
          <View style={[styles.gradeBadge, { backgroundColor: tone.bg }]}>
            <Text style={[styles.gradeBadgeText, { color: tone.fg }]}>
              {t('grade_label_prefix', { grade: result.grade })}
            </Text>
          </View>

          <View style={styles.scoreRow}>
            <Text style={styles.scoreBig}>{formatNumber(result.score, locale)}</Text>
            <Text style={styles.scoreSuffix}>{t('gr_score_suffix')}</Text>
          </View>

          <View style={styles.scoreTrack}>
            <View style={[styles.scoreFill, { width: `${scorePct}%`, backgroundColor: tone.fg }]} />
          </View>
        </View>

        {/* ── How to do better ──────────────────────────────────────── */}
        <View style={styles.tipCard}>
          <View style={styles.tipHead}>
            <Icon name="zap" size={17} color={colors.primary} />
            <Text style={styles.tipTitle}>{t('gr_tip_title')}</Text>
          </View>
          <View style={styles.weakestRow}>
            <Text style={styles.weakestLabel}>{t('gr_weakest_label')}</Text>
            <Text style={styles.weakestValue}>
              {result.weakest_dimension === 'damage_pct'
                ? t('assay_damage_question')
                : t(ANSWER_LABEL[result.weakest_dimension].questionKey)}
            </Text>
          </View>
          {/* The dictionary tip for the weakest dimension, in the farmer's own
              locale — `tip_mr`/`tip_en` are fixed wire fields with no Hindi,
              so rendering those directly would drop a Hindi farmer into
              Marathi. */}
          <Text style={styles.tipText}>{t(TIP_KEY[result.weakest_dimension])}</Text>
        </View>

        {/* ── The answers behind the grade ──────────────────────────── */}
        <Text style={styles.sectionTitle}>{t('gr_answers_title')}</Text>
        <View style={styles.answersCard}>
          {ORDER.map((dim, i) => {
            const value = answers[dim];
            const isWeakest = result.weakest_dimension === dim;
            return (
              <View key={dim} style={[styles.answerRow, i > 0 && styles.answerRowDivider]}>
                <View style={styles.answerText}>
                  <Text style={styles.answerQuestion}>{t(ANSWER_LABEL[dim].questionKey)}</Text>
                  <Text style={[styles.answerValue, isWeakest && styles.answerValueWeak]}>
                    {t(ANSWER_LABEL[dim].choices[value])}
                  </Text>
                </View>
                {isWeakest ? (
                  <View style={styles.weakChip}>
                    <Icon name="info" size={12} color={colors.warning} />
                  </View>
                ) : null}
              </View>
            );
          })}
          <View style={[styles.answerRow, styles.answerRowDivider]}>
            <View style={styles.answerText}>
              <Text style={styles.answerQuestion}>{t('assay_damage_question')}</Text>
              <Text
                style={[
                  styles.answerValue,
                  result.weakest_dimension === 'damage_pct' && styles.answerValueWeak,
                ]}>
                {t('gr_answer_damage', { pct: formatNumber(answers.damage_pct, locale) })}
              </Text>
            </View>
            {result.weakest_dimension === 'damage_pct' ? (
              <View style={styles.weakChip}>
                <Icon name="info" size={12} color={colors.warning} />
              </View>
            ) : null}
          </View>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.cta}
          onPress={() =>
            navigation.navigate(
              'S22_PricePublish',
              // `lot_id` is optional on both screens; forward it only when
              // this reveal actually carries one, rather than passing an
              // explicit undefined through the param type.
              route.params.lot_id ? { lot_id: route.params.lot_id } : undefined,
            )
          }
          accessibilityRole="button">
          <Text style={styles.ctaText}>{t('gr_cta_publish')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button">
          <Text style={styles.secondaryBtnText}>{t('recheck_button')}</Text>
        </TouchableOpacity>
      </View>
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
  headerTitle: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold, flex: 1 },

  scroll: { padding: space.md, paddingBottom: 150, gap: space.sm },

  gradeCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: space.lg,
  },
  gradeBadge: { borderRadius: radius.full, paddingHorizontal: space.md, paddingVertical: 6 },
  gradeBadgeText: { ...typography.titleLg, fontFamily: fontFamily.extraBold },
  scoreRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: space.sm },
  scoreBig: { fontSize: 48, lineHeight: 54, fontFamily: fontFamily.extraBold, color: colors.onSurface },
  scoreSuffix: { ...typography.titleMd, color: colors.onSurfaceVariant },
  scoreTrack: {
    width: '100%',
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHighest,
    marginTop: space.sm,
    overflow: 'hidden',
  },
  scoreFill: { height: 8, borderRadius: radius.full },

  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  tipHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tipTitle: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  weakestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    marginTop: space.xs,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  weakestLabel: { ...typography.labelSm, color: colors.onSurfaceVariant },
  weakestValue: { ...typography.labelMd, color: colors.onSurface, flex: 1, textAlign: 'right' },
  tipText: { ...typography.bodyMd, color: colors.onSurface, marginTop: space.xs, lineHeight: 21 },

  sectionTitle: { ...typography.titleMd, color: colors.onSurface, marginTop: space.xs },
  answersCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },
  answerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  answerRowDivider: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  answerText: { flex: 1 },
  answerQuestion: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  answerValue: { ...typography.titleMd, color: colors.onSurface, marginTop: 2 },
  answerValueWeak: { color: colors.warning },
  weakChip: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.warningContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: space.xs,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  ctaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  secondaryBtnText: { ...typography.titleMd, color: colors.primary },
});
