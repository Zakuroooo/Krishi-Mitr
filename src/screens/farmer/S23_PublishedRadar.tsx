/**
 * S23 — the lot is published. Stitch screen 23
 * (`23_published_real_time_buyer_matching_radar`).
 *
 * ★ Rebuilt, and deliberately much smaller than the mockup. The previous
 *   version was a live-telemetry dashboard for telemetry that does not
 *   exist: an animated buyer-matching radar with pins at named cities, a
 *   "Verified Range within 60 km", a "Qualified Leads" count, a "First Bid
 *   Est." timer, an auto-refreshing "Live Inbound Signals" feed, and an
 *   "INSTANT ALERT SETTINGS" block offering WhatsApp alerts to a hardcoded
 *   phone number (+9182204343) and "Audio Phone Call on Urgent Counter-Offer".
 *   Nothing in this project sends an SMS, places a call, or tracks a buyer's
 *   position, so every one of those was a promise the app cannot keep — and
 *   a farmer who leaves the screen expecting a call would simply never get
 *   one. Removed on explicit direction, with the alert feature named as
 *   coming soon rather than silently dropped.
 *
 * ★ Also removed: "Buyer funds are locked in Mandi Board bank escrow", a
 *   hardcoded Grade A (850/1000), and a fixed "Asking ₹2,100 · Est. Net
 *   ₹83,400" that ignored whatever the farmer actually set on S22.
 *
 * ★ What is left is what is true after publishing: the lot, the price the
 *   farmer chose, how long offers stay open, what happens next, and the two
 *   places to go. Every string resolves in one language — the mockup rendered
 *   English and Marathi simultaneously on almost every line.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { formatNumber, formatPaise, toQuintal } from '../../lib/money';
import { getLot } from '../../lib/api';
import { DEFAULT_LOT_ID, USE_FIXTURES } from '../../config';
import { fxLotListed } from '../../fixtures/lots';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S23_PublishedRadar'>;

async function fetchLot(lotId: string) {
  if (USE_FIXTURES) return fxLotListed;
  return getLot(lotId);
}

const NEXT_STEPS = ['pub_next_1', 'pub_next_2', 'pub_next_3'];

export default function S23_PublishedRadar({ route, navigation }: Props) {
  const { t, locale } = useT();
  const lotId = route.params?.lot_id ?? DEFAULT_LOT_ID;
  const askingPaise = route.params?.asking_paise ?? null;

  const { data: lot } = useQuery({ queryKey: ['lots', lotId], queryFn: () => fetchLot(lotId) });
  const qtl = lot ? toQuintal(lot.qty_kg) : null;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Confirmation ──────────────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={styles.tickCircle}>
            <Icon name="check-circle" size={34} color={colors.tertiary} />
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{t('pub_badge')}</Text>
          </View>
          <Text style={styles.title}>{t('pub_title')}</Text>
          <Text style={styles.subtitle}>{t('pub_sub')}</Text>
        </View>

        {/* ── The lot, as published ─────────────────────────────────── */}
        <View style={styles.card}>
          {qtl !== null && lot ? (
            <Text style={styles.lotLine}>
              {t('pub_lot_line', { qty: formatNumber(qtl, locale), grade: lot.grade })}
            </Text>
          ) : null}

          {askingPaise !== null ? (
            <View style={styles.row}>
              <Text style={styles.rowKey}>{t('pub_asking_label')}</Text>
              <Text style={styles.rowValueStrong}>{formatPaise(askingPaise, locale)}</Text>
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.rowKey}>{t('pub_window_label')}</Text>
            <Text style={styles.rowValue}>{t('pub_window_value')}</Text>
          </View>
        </View>

        {/* ── What happens next ─────────────────────────────────────── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('pub_next_title')}</Text>
          {NEXT_STEPS.map((key, i) => (
            <View key={key} style={styles.stepRow}>
              <View style={styles.stepNum}>
                <Text style={styles.stepNumText}>{formatNumber(i + 1, locale)}</Text>
              </View>
              <Text style={styles.stepText}>{t(key)}</Text>
            </View>
          ))}
        </View>

        {/* The one alert promise, marked honestly rather than offered. */}
        <View style={styles.soonRow}>
          <Icon name="bell" size={14} color={colors.outline} />
          <Text style={styles.soonText}>{t('pub_alerts_soon')}</Text>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => navigation.navigate('S25_BuyersForLot')}
          accessibilityRole="button">
          <Text style={styles.primaryBtnText}>{t('pub_view_buyers')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('S15_MyLots')}
          accessibilityRole="button">
          <Text style={styles.secondaryBtnText}>{t('pub_my_produce')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { padding: space.md, paddingTop: space.xxl, paddingBottom: 170, gap: space.sm },

  heroCard: { alignItems: 'center', paddingVertical: space.lg, gap: 6 },
  tickCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.positiveContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.xs,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
  },
  badgeText: { ...typography.labelSm, color: colors.onPositiveContainer, textTransform: 'uppercase' },
  title: {
    ...typography.displayLg,
    color: colors.onSurface,
    textAlign: 'center',
    marginTop: 2,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 21,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  cardTitle: { ...typography.titleMd, color: colors.onSurface, marginBottom: space.xs },
  lotLine: { ...typography.titleMd, color: colors.onSurface, marginBottom: space.xs },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.sm,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  rowKey: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1 },
  rowValue: { ...typography.titleMd, color: colors.onSurface },
  rowValueStrong: {
    ...typography.titleLg,
    color: colors.primary,
    fontFamily: fontFamily.extraBold,
  },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: space.sm, marginTop: space.xs },
  stepNum: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumText: { ...typography.labelSm, color: colors.primary },
  stepText: { ...typography.bodySm, color: colors.onSurface, flex: 1, lineHeight: 19 },

  soonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: space.xs,
  },
  soonText: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium },

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
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: space.sm,
  },
  primaryBtnText: {
    ...typography.titleLg,
    color: colors.onPrimary,
    fontFamily: fontFamily.extraBold,
    flexShrink: 1,
  },
  secondaryBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.sm },
  secondaryBtnText: { ...typography.titleMd, color: colors.primary },
});
