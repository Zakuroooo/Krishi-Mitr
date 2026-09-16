/**
 * The buyer's first screen — built from the approved Stitch design
 * ("01 Buyer Splash — कृषी मित्र व्यापारी", project 7555855034687361132).
 *
 * ★ Why a buyer splash exists at all. The farmer opens the app knowing what it
 *   is; a trader arriving at a URL or a shared APK does not. This screen
 *   answers three things before asking for anything: what is sold here, who
 *   guarantees the money, and what proof of quality comes with the load.
 *
 * ★ Two lines of the Stitch copy were deliberately not carried over: a "70%
 *   time saving" claim and a "zero disputes" badge. Both are statements about
 *   the world with nothing behind them, and CLAUDE.md §9 names an unverified
 *   number in front of a government panel as the one unrecoverable mistake.
 *   The layout slots stayed; the boasts did not.
 *
 * ★ Every colour comes from `theme/tokens`. The design system is the same
 *   Mandi Tactile Modern the farmer app uses, which is the point: a trader and
 *   a farmer should recognise the same product.
 */

import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Icon } from '../../components/ui/Icon';
import { Logo } from '../../components/ui/Logo';
import { getLocale, setLocale as persistLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { colors, radius, space, touch, type } from '../../theme/tokens';
import type { Locale } from '../../types/api';

const LANGUAGES: Array<{ id: Locale; label: string }> = [
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'en', label: 'English' },
];

/** The three assurances, in the design's order. Icon names are `Icon`'s own. */
const ASSURANCES = [
  { icon: 'handshake', title: 'bs_a1_title', body: 'bs_a1_body', chip: null },
  { icon: 'lock', title: 'bs_a2_title', body: 'bs_a2_body', chip: 'bs_a2_chip' },
  { icon: 'clipboard', title: 'bs_a3_title', body: 'bs_a3_body', chip: 'bs_a3_chip' },
] as const;

export function BuyerSplash({
  onSignIn,
  onSeeRates,
  lotsAvailable,
}: {
  onSignIn: () => void;
  onSeeRates?: () => void;
  /** Rendered only when a real count is known — never a placeholder number. */
  lotsAvailable?: number;
}) {
  const [locale, setLocaleState] = useState<Locale>('mr');

  useEffect(() => {
    getLocale().then(l => l && setLocaleState(l));
  }, []);

  const t = (key: string, params?: Record<string, string | number>) =>
    translate(key, locale, params);

  const chooseLanguage = (next: Locale) => {
    setLocaleState(next);
    void persistLocale(next);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      {/* The network strip: who licenses this marketplace, and is it open now. */}
      <View style={styles.networkStrip}>
        <View style={styles.networkLeft}>
          <Icon name="shield" size={16} color={colors.positiveSolid} />
          <Text style={styles.networkText} numberOfLines={2}>
            {t('bs_network_line')}
          </Text>
        </View>
        <View style={styles.livePill}>
          <View style={styles.liveDot} />
          <Text style={styles.liveText}>{t('bs_mandi_live')}</Text>
        </View>
      </View>

      <View style={styles.langRow}>
        {LANGUAGES.map(language => {
          const active = language.id === locale;
          return (
            <Pressable
              key={language.id}
              onPress={() => chooseLanguage(language.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.langChip, active && styles.langChipActive]}>
              <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                {language.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.brandRow}>
        <Logo size={52} />
        <View style={styles.brandText}>
          <View style={styles.brandLine}>
            <Text style={styles.brandName}>{t('app_name')}</Text>
            <View style={styles.rolePill}>
              <Text style={styles.rolePillText}>{t('root_buyer_console_title')}</Text>
            </View>
          </View>
          <Text style={styles.tagline}>{t('bs_tagline')}</Text>
        </View>
      </View>

      <Text style={styles.sub}>{t('bs_sub')}</Text>

      {/* The yard card. The design puts a photograph here; this build has no
          licensed photograph of Lasalgaon yard, and an unlabelled stock image
          of somewhere else would be exactly the kind of decoration that reads
          as evidence. A drawn panel says the same thing and claims nothing. */}
      <View style={styles.yardCard}>
        <View style={styles.yardIcon}>
          <Icon name="building" size={28} color={colors.onPrimary} />
        </View>
        <View style={styles.yardBody}>
          <Text style={styles.yardTitle}>{t('bs_yard')}</Text>
          {lotsAvailable === undefined ? null : (
            <Text style={styles.yardMeta}>{t('bs_lots_available', { n: lotsAvailable })}</Text>
          )}
          <View style={styles.apmcChip}>
            <Icon name="shield" size={13} color={colors.onSurfaceVariant} />
            <Text style={styles.apmcText}>{t('bs_apmc_protected')}</Text>
          </View>
        </View>
      </View>

      <View style={styles.assuranceHeader}>
        <Text style={styles.assuranceTitle}>{t('bs_assurances_title')}</Text>
        <Text style={styles.assuranceCount}>{t('bs_assurances_count')}</Text>
      </View>

      {ASSURANCES.map(item => (
        <View key={item.title} style={styles.assurance}>
          <View style={styles.assuranceIcon}>
            <Icon name={item.icon} size={20} color={colors.primary} />
          </View>
          <View style={styles.assuranceBody}>
            <View style={styles.assuranceTitleRow}>
              <Text style={styles.assuranceItemTitle}>{t(item.title)}</Text>
              {item.chip ? (
                <View style={styles.assuranceChip}>
                  <Text style={styles.assuranceChipText}>{t(item.chip)}</Text>
                </View>
              ) : null}
            </View>
            <Text style={styles.assuranceText}>{t(item.body)}</Text>
          </View>
        </View>
      ))}

      {/* The action dock. Primary is ochre and full width at the hero touch
          size, per the design system's own button spec. */}
      <Pressable
        onPress={onSignIn}
        accessibilityRole="button"
        style={({ pressed }) => [styles.primaryBtn, pressed && styles.primaryBtnPressed]}>
        <Icon name="lock" size={18} color={colors.onPrimary} />
        <Text style={styles.primaryBtnText}>{t('bs_cta_login')}</Text>
      </Pressable>

      {onSeeRates ? (
        <Pressable
          onPress={onSeeRates}
          accessibilityRole="button"
          style={({ pressed }) => [styles.secondaryBtn, pressed && styles.secondaryBtnPressed]}>
          <Icon name="tag" size={18} color={colors.primary} />
          <Text style={styles.secondaryBtnText}>{t('bs_cta_rates')}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.licenceNote}>{t('bs_licence_note')}</Text>

      <View style={styles.footer}>
        <Text style={styles.footerText}>{t('app_name')}</Text>
        <View style={styles.footerDot} />
        <Text style={styles.footerText}>{t('bs_footer_node')}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: { padding: space.md, paddingBottom: space.xxl, maxWidth: 720, width: '100%', alignSelf: 'center' },

  networkStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.xs,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.md,
    paddingHorizontal: space.sm,
    paddingVertical: space.xs,
  },
  networkLeft: { flexDirection: 'row', alignItems: 'center', gap: space.xxs + 2, flex: 1 },
  networkText: { ...type.labelMd, color: colors.onSurfaceVariant, flex: 1 },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.full,
    paddingHorizontal: space.xs,
    paddingVertical: 3,
  },
  liveDot: { width: 7, height: 7, borderRadius: radius.full, backgroundColor: colors.positiveSolid },
  liveText: { ...type.labelSm, color: colors.onPositiveContainer },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs, marginTop: space.md },
  langChip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
  },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { ...type.labelMd, color: colors.onSurfaceVariant },
  langChipTextActive: { color: colors.onPrimary },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.lg },
  brandText: { flex: 1 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: space.xs },
  brandName: { ...type.headlineLg, color: colors.primary },
  rolePill: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  rolePillText: { ...type.labelSm, color: colors.onPrimary },
  tagline: { ...type.bodyMd, color: colors.onSurfaceVariant, marginTop: 2 },
  sub: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: space.xs },

  yardCard: {
    flexDirection: 'row',
    gap: space.sm,
    marginTop: space.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.lg,
    padding: space.md,
  },
  yardIcon: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  yardBody: { flex: 1 },
  yardTitle: { ...type.titleLg, color: colors.onSurface },
  yardMeta: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 2 },
  apmcChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xxs,
    alignSelf: 'flex-start',
    marginTop: space.xs,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 3,
  },
  apmcText: { ...type.labelSm, color: colors.onSurfaceVariant },

  assuranceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.xl,
    marginBottom: space.sm,
  },
  assuranceTitle: { ...type.titleLg, color: colors.onSurface },
  assuranceCount: { ...type.labelMd, color: colors.onSurfaceVariant },

  assurance: {
    flexDirection: 'row',
    gap: space.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
    borderRadius: radius.md,
    padding: space.md,
    marginBottom: space.xs,
  },
  assuranceIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  assuranceBody: { flex: 1 },
  assuranceTitleRow: { flexDirection: 'row', alignItems: 'center', gap: space.xs, flexWrap: 'wrap' },
  assuranceItemTitle: { ...type.titleMd, color: colors.onSurface },
  assuranceChip: {
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.sm,
    paddingHorizontal: space.xs,
    paddingVertical: 2,
  },
  assuranceChipText: { ...type.labelSm, color: colors.onPositiveContainer },
  assuranceText: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: 3 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
    marginTop: space.xl,
  },
  primaryBtnPressed: { backgroundColor: colors.primary },
  primaryBtnText: { ...type.titleLg, color: colors.onPrimary },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginTop: space.xs,
  },
  secondaryBtnPressed: { backgroundColor: colors.surfaceContainerLow },
  secondaryBtnText: { ...type.titleMd, color: colors.primary },

  licenceNote: {
    ...type.labelMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginTop: space.sm,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    marginTop: space.lg,
  },
  footerText: { ...type.labelSm, color: colors.outline },
  footerDot: { width: 4, height: 4, borderRadius: radius.full, backgroundColor: colors.outline },
});

export default BuyerSplash;
