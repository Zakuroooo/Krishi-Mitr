/**
 * S28 — assistant. P16, cuttable, last on PRANAY.md's own cut order — built
 * anyway since the ask was the whole frontend.
 *
 * ★ "Canned tri-lingual Q&A, retrieval only, no generation" (PRANAY.md §1.3).
 *   Fixed questions, fixed answers — nothing here calls a model.
 *
 * ★ CLAUDE.md §9: "a real generative voice assistant inverts the thesis".
 *   This screen is the honest version: true, checked sentences about how
 *   this app works, never a synthesized answer to an arbitrary question.
 *
 * ★ ZERO EMOJIS  ★ FULL i18n via useT()
 */
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, radius, space, type as typography } from '../../theme/tokens';

import { useT } from '../../lib/i18n';
import { Icon } from '../../components/ui/Icon';

const QAS = [
  { qKey: 'help_q_no_advice', aKey: 'help_a_no_advice' },
  { qKey: 'help_q_worst_case', aKey: 'help_a_worst_case' },
  { qKey: 'help_q_grade', aKey: 'help_a_grade' },
  { qKey: 'help_q_pledge', aKey: 'help_a_pledge' },
  { qKey: 'help_q_escrow', aKey: 'help_a_escrow' },
  { qKey: 'help_q_pool', aKey: 'help_a_pool' },
  { qKey: 'help_q_counter', aKey: 'help_a_counter' },
  { qKey: 'help_q_offline', aKey: 'help_a_offline' },
  { qKey: 'help_q_model_reliable', aKey: 'help_a_model_reliable' },
  { qKey: 'help_q_price_history', aKey: 'help_a_price_history' },
  { qKey: 'help_q_forecast', aKey: 'help_a_forecast' },
  { qKey: 'help_q_nearby', aKey: 'help_a_nearby' },
];

export default function S28_Assistant() {
  const { t } = useT();
  const [openIdx, setOpenIdx] = useState<number | null>(null);

  return (
    <View style={styles.root}>
      <View style={styles.headerBox}>
        <Text style={styles.header}>{t('assistant_header')}</Text>
        <Text style={styles.subheader}>{t('assistant_subheader')}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {QAS.map((qa, i) => {
          const open = openIdx === i;
          return (
            <TouchableOpacity
              key={qa.qKey}
              style={[styles.card, open && styles.cardOpen]}
              onPress={() => setOpenIdx(open ? null : i)}
              activeOpacity={0.8}
              accessibilityRole="button">
              <View style={styles.qRow}>
                <Icon name={open ? 'chevron-down' : 'chevron-right'} size={18} color={open ? colors.primary : colors.outline} />
                <Text style={[styles.question, open && styles.questionOpen]}>{t(qa.qKey)}</Text>
              </View>
              {open ? (
                <View style={styles.answerBox}>
                  <Text style={styles.answer}>{t(qa.aKey)}</Text>
                </View>
              ) : null}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  headerBox: {
    paddingHorizontal: 20,
    paddingTop: 52,
    paddingBottom: 20,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  header: { fontFamily: fontFamily.bold, fontSize: 22, fontWeight: '700', color: colors.onSurface, marginBottom: 4 },
  subheader: { fontFamily: fontFamily.regular, fontSize: 14, color: colors.onSurfaceVariant },
  scroll: { padding: 16, paddingBottom: 40, gap: 8 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    padding: 14,
  },
  cardOpen: {
    borderColor: colors.primary,
    backgroundColor: '#fffaf9',
  },
  qRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  question: {
    flex: 1,
    fontFamily: fontFamily.semiBold,
    fontSize: 15,
    fontWeight: '600',
    color: colors.onSurface,
    lineHeight: 22,
  },
  questionOpen: { color: colors.primary },
  answerBox: {
    marginTop: 12,
    marginLeft: 30,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1e2df',
  },
  answer: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    lineHeight: 22,
  },
});
