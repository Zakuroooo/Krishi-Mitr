/**
 * S20 — the six-question self-assay. Stitch screen 20
 * (`20_quality_diagnostic_harvest_grading_questions`).
 *
 * ★ This screen carries the grading logic that used to live in
 *   `S13_SelfAssay`. There is now one grading flow, not two: S20 collects
 *   the six CANON §9 answers, `lib/grading.ts` scores them in exactly one
 *   place, and S21 reveals the result. The previous S20 was a visual shell —
 *   four questions, no submit, no navigation forward, and no way for an
 *   answer to reach a grade.
 *
 * ★ CANON §9 + FRONTEND_NEEDS_AI.md §8.2: the photo is evidence, not input.
 *   This screen produces a grade with **no photo at all** — a farmer with a
 *   cracked camera still gets one. There is no camera permission and no
 *   image picker here; that risk belongs to S12.
 *
 * ★ What the Stitch mockup asserts and this screen does not, because none of
 *   it is real: "AI Detected: 75% Medium-Large" and "AI Photo Score: 98%
 *   Clear" (no computer-vision model exists anywhere in this project — the
 *   grade comes from the farmer's own six answers, and badging them as AI
 *   detections would claim a capability we do not have), a "Mandi Price
 *   Protection Guarantee", and an "APMC Board Verified Escrow Protocol"
 *   stamp. In their place is the one thing that is true and worth saying:
 *   answer honestly, because the buyer re-checks at the weighbridge.
 */

import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { getLot, submitAssay } from '../../lib/api';
import { translate, useT } from '../../lib/i18n';
import { formatNumber, toQuintal } from '../../lib/money';
import { computeGrade } from '../../lib/grading';
import { DEFAULT_LOT_ID, USE_FIXTURES } from '../../config';
import { fxLotListed } from '../../fixtures/lots';
import { ErrorState, Skeleton } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { AssayDimension, AssayReq, AssayRes } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S20_QualityDiagnostic'>;

type Rating = 1 | 2 | 3;

interface Answers {
  size_uniform: Rating | null;
  colour_uniform: Rating | null;
  sprouting: Rating | null;
  damage_pct: number | null;
  moisture_feel: Rating | null;
  foreign_matter: Rating | null;
}

const EMPTY_ANSWERS: Answers = {
  size_uniform: null,
  colour_uniform: null,
  sprouting: null,
  damage_pct: null,
  moisture_feel: null,
  foreign_matter: null,
};

const DAMAGE_STEP = 5;
/** Five rating questions plus the damage stepper. */
const TOTAL_QUESTIONS = 6;

/** One row per CANON §9 dimension — dictionary keys, not text. */
const RATING_QUESTIONS: Array<{
  key: keyof Omit<Answers, 'damage_pct'>;
  labelKey: string;
  choices: Array<{ value: Rating; labelKey: string }>;
}> = [
  {
    key: 'size_uniform',
    labelKey: 'assay_q_size_uniform',
    choices: [
      { value: 3, labelKey: 'assay_size_uniform_3' },
      { value: 2, labelKey: 'assay_size_uniform_2' },
      { value: 1, labelKey: 'assay_size_uniform_1' },
    ],
  },
  {
    key: 'colour_uniform',
    labelKey: 'assay_q_colour_uniform',
    choices: [
      { value: 3, labelKey: 'assay_colour_uniform_3' },
      { value: 2, labelKey: 'assay_colour_uniform_2' },
      { value: 1, labelKey: 'assay_colour_uniform_1' },
    ],
  },
  {
    key: 'sprouting',
    labelKey: 'assay_q_sprouting',
    choices: [
      { value: 3, labelKey: 'assay_sprouting_3' },
      { value: 2, labelKey: 'assay_sprouting_2' },
      { value: 1, labelKey: 'assay_sprouting_1' },
    ],
  },
  {
    key: 'moisture_feel',
    labelKey: 'assay_q_moisture_feel',
    choices: [
      { value: 3, labelKey: 'assay_moisture_feel_3' },
      { value: 2, labelKey: 'assay_moisture_feel_2' },
      { value: 1, labelKey: 'assay_moisture_feel_1' },
    ],
  },
  {
    key: 'foreign_matter',
    labelKey: 'assay_q_foreign_matter',
    choices: [
      { value: 3, labelKey: 'assay_foreign_matter_3' },
      { value: 2, labelKey: 'assay_foreign_matter_2' },
      { value: 1, labelKey: 'assay_foreign_matter_1' },
    ],
  },
];

/** §8.2 — the improvement tip, named per `weakest_dimension`. */
const TIP_KEY: Record<AssayDimension, string> = {
  damage_pct: 'tip_damage_pct',
  sprouting: 'tip_sprouting',
  size_uniform: 'tip_size_uniform',
  colour_uniform: 'tip_colour_uniform',
  moisture_feel: 'tip_moisture_feel',
  foreign_matter: 'tip_foreign_matter',
};

async function fetchLot(lotId: string) {
  if (USE_FIXTURES) return fxLotListed;
  return getLot(lotId);
}

/**
 * `POST /lots/{id}/assay` — CANON §7.5. Under `USE_FIXTURES` the response is
 * built the same way it would be graded server-side: `lib/grading.ts`'s
 * formula, plus the tip text for the weakest dimension.
 */
async function persistAssay(lotId: string, body: AssayReq): Promise<AssayRes> {
  if (USE_FIXTURES) {
    const graded = computeGrade(body);
    return {
      score: graded.score,
      grade: graded.grade,
      weakest_dimension: graded.weakest_dimension,
      // `AssayRes.tip_mr`/`tip_en` are fixed wire-shape fields (CANON §7.5),
      // not UI text — always Marathi and always English respectively,
      // regardless of the app's selected display locale.
      tip_mr: translate(TIP_KEY[graded.weakest_dimension], 'mr'),
      tip_en: translate(TIP_KEY[graded.weakest_dimension], 'en'),
    };
  }
  return submitAssay(lotId, body);
}

export default function S20_QualityDiagnostic({ route, navigation }: Props) {
  const { t, locale } = useT();
  const lotId = route.params?.lot_id ?? DEFAULT_LOT_ID;

  const { data: lot, isLoading, error, refetch } = useQuery({
    queryKey: ['lots', lotId],
    queryFn: () => fetchLot(lotId),
  });

  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);

  const { mutate: submit, isPending: submitting, isError: submitFailed } = useMutation({
    mutationFn: (body: AssayReq) => persistAssay(lotId, body),
    onSuccess: (result, body) => {
      navigation.navigate('S21_GradeReveal', { result, answers: body, lot_id: lotId });
    },
  });

  const answeredCount = Object.values(answers).filter(v => v !== null).length;
  const allAnswered = answeredCount === TOTAL_QUESTIONS;

  const setRating = (key: keyof Omit<Answers, 'damage_pct'>, value: Rating) =>
    setAnswers(prev => ({ ...prev, [key]: value }));

  const adjustDamage = (delta: number) =>
    setAnswers(prev => {
      const current = prev.damage_pct ?? 0;
      return { ...prev, damage_pct: Math.min(100, Math.max(0, current + delta)) };
    });

  const buildAssayReq = (): AssayReq | null => {
    const { size_uniform, colour_uniform, sprouting, moisture_feel, foreign_matter, damage_pct } =
      answers;
    if (
      size_uniform === null ||
      colour_uniform === null ||
      sprouting === null ||
      moisture_feel === null ||
      foreign_matter === null ||
      damage_pct === null
    ) {
      return null;
    }
    return { size_uniform, colour_uniform, sprouting, damage_pct, moisture_feel, foreign_matter };
  };

  const onSubmit = () => {
    const body = buildAssayReq();
    if (body) submit(body);
  };

  /* ★ Six questions a farmer has to answer to get a grade, on a screen with
     no speaker at all — the one place in the app where reading is genuinely
     the task. The narration reads each question with its three choices, in
     order, so someone who cannot read the page can still answer it. */
  const narration = [
    t('qd_title'),
    ...RATING_QUESTIONS.map((q, i) =>
      [
        t('qd_narr_question', { n: formatNumber(i + 1, locale), question: t(q.labelKey) }),
        q.choices.map(c => t(c.labelKey)).join(', '),
      ].join(' '),
    ),
    t('qd_narr_question', {
      n: formatNumber(RATING_QUESTIONS.length + 1, locale),
      question: t('assay_damage_question'),
    }),
  ].join(' ');

  const header = (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.canGoBack() && navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('back_button')}>
        <Icon name="arrow-left" size={20} color={colors.onSurface} />
      </TouchableOpacity>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{t('qd_title')}</Text>
        {lot ? (
          <Text style={styles.headerSub}>
            {t('qd_subtitle', {
              qty: formatNumber(toQuintal(lot.qty_kg), locale),
              commodity: t('demo_commodity_name'),
            })}
          </Text>
        ) : null}
      </View>
      <ListenButton text={narration} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.root}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
        {header}
        <View style={styles.scroll}>
          <Skeleton height={120} />
          <View style={{ height: space.sm }} />
          <Skeleton height={220} />
        </View>
      </View>
    );
  }

  if (error && !lot) {
    return <ErrorState message={t('self_assay_error')} onRetry={() => refetch()} />;
  }

  if (submitFailed) {
    return <ErrorState message={t('self_assay_save_error')} onRetry={onSubmit} />;
  }

  const progress = Math.round((answeredCount / TOTAL_QUESTIONS) * 100);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />
      {header}

      {/* Progress — real: how many of the six are answered, nothing else. */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressLabel}>{t('qd_progress_label')}</Text>
        <Text style={styles.progressCount}>
          {t('qd_answered', {
            done: formatNumber(answeredCount, locale),
            total: formatNumber(TOTAL_QUESTIONS, locale),
          })}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.introText}>{t('self_assay_subheader')}</Text>

        {RATING_QUESTIONS.map((q, qi) => (
          <View key={q.key} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionNum}>{formatNumber(qi + 1, locale)}</Text>
              <Text style={styles.sectionTitle}>{t(q.labelKey)}</Text>
            </View>
            {q.choices.map(c => {
              const active = answers[q.key] === c.value;
              return (
                <TouchableOpacity
                  key={c.value}
                  style={[styles.optionCard, active && styles.optionCardActive]}
                  onPress={() => setRating(q.key, c.value)}
                  activeOpacity={0.85}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}>
                  <View style={[styles.radio, active && styles.radioActive]}>
                    {active ? <View style={styles.radioFill} /> : null}
                  </View>
                  <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                    {t(c.labelKey)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}

        {/* Damage — a stepper, not a rating. */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionNum}>{formatNumber(TOTAL_QUESTIONS, locale)}</Text>
            <Text style={styles.sectionTitle}>{t('assay_damage_question')}</Text>
          </View>
          <View style={styles.stepperRow}>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjustDamage(-DAMAGE_STEP)}
              accessibilityRole="button">
              <Text style={styles.stepperBtnText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.stepperValue}>
              {formatNumber(answers.damage_pct ?? 0, locale)}%
            </Text>
            <TouchableOpacity
              style={styles.stepperBtn}
              onPress={() => adjustDamage(DAMAGE_STEP)}
              accessibilityRole="button">
              <Text style={styles.stepperBtnText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* The honest replacement for the mockup's guarantee stamps. */}
        <View style={styles.honestNote}>
          <Icon name="shield-check" size={17} color={colors.primary} />
          <Text style={styles.honestNoteText}>{t('qd_honest_note')}</Text>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={[styles.cta, (!allAnswered || submitting) && styles.ctaDisabled]}
          onPress={onSubmit}
          disabled={!allAnswered || submitting}
          accessibilityRole="button">
          <Text style={styles.ctaText}>
            {allAnswered
              ? t('qd_cta')
              : t('qd_cta_incomplete', { total: formatNumber(TOTAL_QUESTIONS, locale) })}
          </Text>
          {allAnswered ? <Icon name="arrow-right" size={18} color={colors.onPrimary} /> : null}
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
  headerTitle: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  progressTrack: { height: 5, backgroundColor: colors.outlineVariant },
  progressFill: { height: 5, backgroundColor: colors.primary },
  progressLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  progressLabel: { ...typography.labelSm, color: colors.primary },
  progressCount: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: 140, gap: space.sm },
  introText: { ...typography.bodySm, color: colors.onSurfaceVariant },

  section: { gap: 6 },
  sectionHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: space.xs, marginTop: space.xs },
  sectionNum: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
    minWidth: 22,
  },
  sectionTitle: { ...typography.titleMd, color: colors.onSurface, flex: 1 },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
    minHeight: touch.targetMin,
  },
  optionCardActive: {
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.onPrimaryContainer,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioActive: { borderColor: colors.primary },
  radioFill: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  optionLabel: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },
  optionLabelActive: { color: colors.primary, fontFamily: fontFamily.semiBold },

  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.lg,
    paddingVertical: space.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  stepperBtn: {
    width: touch.targetMin,
    height: touch.targetMin,
    borderRadius: touch.targetMin / 2,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperBtnText: { fontSize: 24, fontFamily: fontFamily.bold, color: colors.primary },
  stepperValue: {
    ...typography.headlineMd,
    color: colors.onSurface,
    minWidth: 78,
    textAlign: 'center',
  },

  honestNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  honestNoteText: { ...typography.bodySm, color: colors.onSurface, flex: 1, lineHeight: 18 },

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
  ctaDisabled: { backgroundColor: colors.surfaceContainerHighest },
  ctaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
});
