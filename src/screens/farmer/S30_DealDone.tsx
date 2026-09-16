/**
 * S30 — the deal you just agreed to. Stitch
 * `30_deal_done_confetti_celebration_sauda_locked`.
 *
 * ★ What this screen used to assert, none of it from a deal: a four-step
 *   timeline with baked-in timestamps ("आज १२:३९ PM", "उद्या सकाळी १०:००"),
 *   a "₹75,400" payout, and a reference number. It ran no query and took no
 *   params — it could not have known any of it. The steps were shown with two
 *   of them already ticked.
 *
 * ★ Every figure here is off the `TxDto` the accept returned. That object
 *   arrives on the route rather than being fetched, and the reason is worth
 *   stating: `POST /offers/{id}/accept` is the **only** place a transaction
 *   id is ever visible to this app. CANON §7.7 has `GET /tx/{id}` and no
 *   `GET /tx`, and `OfferDto` carries no `tx_id`, so an id dropped at the
 *   moment of accepting is an id the farmer can never navigate back to.
 *   Blocker filed. TODO(akash): fetch by id once `GET /tx` exists.
 *
 * ★ The status shown is `tx.status`, and the four-step progress is derived
 *   from it against CANON's own FSM order — not a fixed list with the first
 *   two ticked. A step is complete when the transaction has actually reached
 *   it.
 *
 * ★ No confetti. The old screen drew seven coloured dots to celebrate; what
 *   a farmer needs at this moment is the number he agreed to and what happens
 *   next, both of which are now on screen and both of which are real.
 *
 * ★ ZERO EMOJIS.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { EscrowMilestones } from '../../components/farmer/EscrowMilestones';
import { ListenButton } from '../../components/ui/ListenButton';
import { useT } from '../../lib/i18n';
import { formatPaise, formatQuintal } from '../../lib/money';
import { formatDateShort } from '../../lib/dates';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S30_DealDone'>;

export default function S30_DealDone({ navigation, route }: Props) {
  const { t, locale } = useT();
  const tx = route.params.tx;

  const qty = formatQuintal(tx.qty_kg, locale);

  const narration = [
    t('dd_narr_agreed', {
      rate: formatPaise(tx.price_paise_per_qtl, locale),
      qty,
    }),
    t('dd_narr_net', {
      gross: formatPaise(tx.gross_paise, locale),
      deductions: formatPaise(tx.deductions_paise, locale),
      net: formatPaise(tx.net_paise, locale),
    }),
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{t('dd_title')}</Text>
          <Text style={styles.headerSub}>
            {t('dd_agreed_on', {
              date: formatDateShort(tx.created_at.slice(0, 10), locale, ''),
            })}
          </Text>
        </View>
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── What was agreed ─────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <Text style={styles.heroLabel}>{t('dd_net_label')}</Text>
          <Text style={styles.heroValue}>{formatPaise(tx.net_paise, locale)}</Text>
          <Text style={styles.heroSub}>
            {t('dd_rate_and_qty', { rate: formatPaise(tx.price_paise_per_qtl, locale), qty })}
          </Text>
        </View>

        {/* ── How the net was reached. Both halves at one size: a farmer
             should not have to hunt for the deduction. ────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dd_breakdown_title')}</Text>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('dd_gross')}</Text>
            <Text style={styles.rowVal}>{formatPaise(tx.gross_paise, locale)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('dd_deductions')}</Text>
            <Text style={[styles.rowVal, styles.rowValNeg]}>
              −{formatPaise(tx.deductions_paise, locale)}
            </Text>
          </View>
          <View style={styles.rowTotal}>
            <Text style={styles.rowTotalKey}>{t('dd_net_label')}</Text>
            <Text style={styles.rowTotalVal}>{formatPaise(tx.net_paise, locale)}</Text>
          </View>
        </View>

        {/* ── Where the deal has actually got to ──────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('dd_progress_title')}</Text>
          {/* One progress model for the whole flow — the same strip the
              deals list and the tracking screen render. */}
          <EscrowMilestones status={tx.status} />
          <Text style={styles.statusNote}>{t('dd_status_note')}</Text>
        </View>

        <TouchableOpacity
          style={styles.cta}
          onPress={() => navigation.navigate('S32_DealTracking', { tx_id: tx.id })}
          accessibilityRole="button">
          <Text style={styles.ctaText}>{t('dd_track_cta')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: space.sm,
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
  headerCenter: { flex: 1, minWidth: 0 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: space.xxl, gap: space.sm },

  heroCard: {
    alignItems: 'center',
    gap: 2,
    padding: space.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: colors.tertiary,
  },
  heroLabel: { ...typography.labelMd, color: colors.onPositiveContainer },
  heroValue: {
    ...typography.displayLg,
    color: colors.onPositiveContainer,
    fontFamily: fontFamily.extraBold,
  },
  heroSub: { ...typography.labelSm, color: colors.onPositiveContainer },

  card: {
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    gap: space.xs,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface },

  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  rowKey: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  rowVal: { ...typography.titleMd, color: colors.onSurface },
  rowValNeg: { color: colors.critical },
  rowTotal: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    marginTop: 2,
    paddingTop: space.xs,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  rowTotalKey: { ...typography.titleMd, color: colors.onSurface, flex: 1 },
  rowTotalVal: { ...typography.titleLg, color: colors.primary, fontFamily: fontFamily.extraBold },

  stageRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  stageDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageDotDone: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  stageText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  stageTextDone: { color: colors.onSurface, fontFamily: fontFamily.bold },
  stageLine: { width: 0 },
  statusNote: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    marginTop: 2,
    lineHeight: 16,
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
});
