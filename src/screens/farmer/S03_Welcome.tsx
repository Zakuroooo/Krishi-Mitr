/**
 * S03_Welcome — Screen 07: Welcome / Account Activated confirmation.
 * Matched to Stitch `07_welcome_setup_confirmed_account_activated/screen.png`
 * ★ ZERO EMOJIS  ★ FULL I18N
 */
import React from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, space, radius, touch } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { useAuth } from '../../lib/auth';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { demoTodayPrice } from '../../lib/demoPrice';
import { ListenButton } from '../../components/ui/ListenButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'S3_Welcome'>;
const farmerPortrait = require('../../assets/images/farmer_rambhau.jpg');
const mandiWarehouse = require('../../assets/images/mandi_warehouse.jpg');

export default function S03_Welcome({ navigation }: Props) {
  const { t, locale } = useT();
  // ★ This screen greeted a hardcoded "Rambhau Vithal Patil" — shown to a
  //   farmer who had just typed his own name two screens earlier.
  const { user } = useAuth();

  const FEATURES = [
    { iconName: 'trending-up', titleKey: 'welcome_feat1_title', subKey: 'welcome_feat1_sub', highlightKey: 'welcome_feat1_hl', color: colors.primary },
    { iconName: 'chart-bar', titleKey: 'welcome_feat2_title', subKey: 'welcome_feat2_sub', highlightKey: 'welcome_feat2_hl', color: colors.primaryContainer },
    { iconName: 'shield-check', titleKey: 'welcome_feat3_title', subKey: 'welcome_feat3_sub', highlightKey: 'welcome_feat3_hl', color: colors.tertiary },
  ];

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Top bar */}
        <View style={styles.topBar}>
          <View style={styles.topLeft}>
            <View style={styles.logoBox}>
              <Text style={styles.logoLetter}>म</Text>
            </View>
            <View>
              <Text style={styles.topBrand}>कृषी मित्र</Text>
              <Text style={styles.topSub}>{t('home_market_name')}</Text>
            </View>
          </View>
          <ListenButton text={t('welcome_ticker_label')} />
        </View>

        {/* Verification card */}
        <View style={styles.verifyCard}>
          <View style={styles.verifyIconRow}>
            <View style={styles.verifyIconBg}>
              <Icon name="check-circle" size={32} color={colors.tertiary} />
            </View>
          </View>
          <View style={styles.verifyBadge}>
            <Icon name="check" size={11} color={colors.tertiary} />
            <Text style={styles.verifyBadgeText}>{t('welcome_verified')}</Text>
          </View>
          <Text style={styles.welcomeHeading}>{t('welcome_greeting')}</Text>
          <Text style={styles.welcomeSub}>{t('welcome_sub')}</Text>
        </View>

        {/* Mandi Pass card */}
        <View style={styles.passCard}>
          <View style={styles.passHeader}>
            <View style={styles.passIconBg}>
              <Icon name="clipboard" size={16} color={colors.primary} />
            </View>
            <Text style={styles.passTitle}>{t('welcome_pass_title')}</Text>
            <Text style={styles.passId}>#MS-NSK-49201</Text>
          </View>

          <View style={styles.passProfile}>
            <Image source={farmerPortrait} style={styles.passPhoto} />
            <View style={styles.passInfo}>
              <View style={styles.passNameRow}>
                <Text style={styles.passName} numberOfLines={1}>{user?.name ?? ''}</Text>
                <View style={styles.verifiedDot}><Icon name="check" size={9} color="#fff" /></View>
              </View>
              <View style={styles.passLocRow}>
                <Icon name="map-pin" size={11} color={colors.outline} />
                <Text style={styles.passLoc}>मु. पो. निफाड, ता. निफाड, नाशिक</Text>
              </View>
            </View>
          </View>

          <View style={styles.passMeta}>
            <View style={styles.passMetaItem}>
              <Text style={styles.passMetaLabel}>{t('welcome_primary_crop')}</Text>
              <Text style={styles.passMetaValue}>गावरान लाल कांदा</Text>
              {/* ★ An English gloss under the Marathi name put two languages
                  on a screen that has a language switcher. Removed. */}
            </View>
            <View style={styles.passMetaDivider} />
            <View style={styles.passMetaItem}>
              <Text style={styles.passMetaLabel}>{t('welcome_linked_mandi')}</Text>
              <Text style={styles.passMetaValue}>लासलगाव मुख्य यार्ड</Text>
              <Text style={[styles.passMetaValueEn, { color: colors.primaryContainer }]}>
                {t('welcome_distance')}
              </Text>
            </View>
          </View>

          {/* Warehouse banner */}
          <View style={styles.warehouseBanner}>
            <Image source={mandiWarehouse} style={styles.warehousePhoto} />
            <View style={styles.warehouseOverlay}>
              <Text style={styles.warehouseText}>{t('welcome_storage')}</Text>
              <Text style={styles.warehouseSub}>{t('welcome_storage_sub')}</Text>
            </View>
          </View>
        </View>

        {/* Features */}
        <Text style={styles.featuresTitle}>{t('welcome_features_title')}</Text>
        <View style={styles.featuresList}>
          {FEATURES.map((f, i) => (
            <View key={i} style={styles.featureCard}>
              <View style={[styles.featureIconBg, { backgroundColor: `${f.color}15` }]}>
                <Icon name={f.iconName as any} size={18} color={f.color} />
              </View>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{t(f.titleKey)}</Text>
                <Text style={styles.featureSub}>{t(f.subKey)}</Text>
                <Text style={[styles.featureHl, { color: f.color }]}>{t(f.highlightKey)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Live mandi ticker */}
        <View style={styles.ticker}>
          <View style={styles.tickerLeft}>
            <View style={styles.tickerDot} />
            <Text style={styles.tickerLabel}>{t('welcome_ticker_label')}</Text>
          </View>
          <Text style={styles.tickerPrice}>{demoTodayPrice(locale)}</Text>
          <Text style={styles.tickerUnit}>{t('welcome_ticker_unit')}</Text>
        </View>

        {/* Footer helpline */}
        <View style={styles.helpRow}>
          <Icon name="phone" size={12} color={colors.primary} />
          <Text style={styles.helpText}>{t('welcome_helpline')}</Text>
        </View>
      </ScrollView>

      {/* CTA dock */}
      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => navigation.getParent()?.navigate('FarmerTabs')}>
          <Text style={styles.primaryCtaText}>{t('welcome_cta_dashboard')}</Text>
          <Icon name="arrow-right" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
        {/* ★ Had no onPress at all. It now goes where it says it goes. */}
        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.getParent()?.navigate('FarmerTabs')}>
          <Icon name="plus" size={16} color={colors.primaryContainer} />
          <Text style={styles.secondaryCtaText}>{t('welcome_cta_list_lot')}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 140 },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingTop: space.lg + 8, paddingBottom: space.sm,
  },
  topLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  logoBox: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  logoLetter: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.onPrimary },
  topBrand: { fontFamily: fontFamily.extraBold, fontSize: 14, color: colors.primary },
  topSub: { fontFamily: fontFamily.regular, fontSize: 9, color: colors.onSurfaceVariant, letterSpacing: 0.5 },
  listenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: 'rgba(155,47,0,0.08)', borderWidth: 1, borderColor: 'rgba(155,47,0,0.15)',
  },
  listenText: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primary },
  verifyCard: {
    marginHorizontal: space.md, marginTop: space.md, padding: space.md,
    borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center',
  },
  verifyIconRow: { marginBottom: space.sm },
  verifyIconBg: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.positiveContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.full,
    backgroundColor: colors.positiveContainer, marginBottom: space.sm,
  },
  verifyBadgeText: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.tertiary },
  welcomeHeading: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.primary, textAlign: 'center' },
  welcomeSub: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.onSurface, textAlign: 'center', marginTop: 4 },
  passCard: {
    marginHorizontal: space.md, marginTop: space.md, borderRadius: radius.xl,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden',
  },
  passHeader: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    padding: space.md, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  passIconBg: {
    width: 28, height: 28, borderRadius: 8, backgroundColor: 'rgba(155,47,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  passTitle: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.onSurface, flex: 1 },
  passId: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primaryContainer },
  passProfile: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  passPhoto: { width: 52, height: 52, borderRadius: 26, borderWidth: 2, borderColor: colors.outlineVariant },
  passInfo: { flex: 1 },
  passNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  passName: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.onSurface },
  verifiedDot: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: colors.tertiary,
    alignItems: 'center', justifyContent: 'center',
  },
  passLocRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  passLoc: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.onSurfaceVariant },
  passMeta: {
    flexDirection: 'row', marginHorizontal: space.md, marginBottom: space.md,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden',
  },
  passMetaItem: { flex: 1, padding: space.sm, alignItems: 'center' },
  passMetaDivider: { width: 1, backgroundColor: colors.outlineVariant },
  passMetaLabel: { fontFamily: fontFamily.medium, fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.3 },
  passMetaValue: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.onSurface, marginTop: 2, textAlign: 'center' },
  passMetaValueEn: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.onSurfaceVariant, textAlign: 'center' },
  warehouseBanner: { height: 100, position: 'relative' },
  warehousePhoto: { width: '100%', height: 100 },
  warehouseOverlay: {
    position: 'absolute', bottom: 0, left: 0, right: 0, padding: space.sm,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  warehouseText: { fontFamily: fontFamily.bold, fontSize: 13, color: '#fff' },
  warehouseSub: { fontFamily: fontFamily.regular, fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  featuresTitle: {
    fontFamily: fontFamily.bold, fontSize: 14, color: colors.onSurface,
    paddingHorizontal: space.md, marginTop: space.lg, marginBottom: space.xs,
  },
  featuresList: { paddingHorizontal: space.md, gap: 10 },
  featureCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: space.sm,
    padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  featureIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  featureText: { flex: 1 },
  featureTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.onSurface },
  featureSub: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2, lineHeight: 16 },
  featureHl: { fontFamily: fontFamily.bold, fontSize: 12, marginTop: 4 },
  ticker: {
    flexDirection: 'row', alignItems: 'center', gap: space.xs,
    marginHorizontal: space.md, marginTop: space.md, padding: space.sm,
    borderRadius: radius.md, backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  tickerLeft: { flexDirection: 'row', alignItems: 'center', gap: 5, flex: 1 },
  tickerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.tertiary },
  tickerLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant },
  tickerPrice: { fontFamily: fontFamily.extraBold, fontSize: 20, color: colors.primary },
  tickerUnit: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.onSurfaceVariant },
  helpRow: {
    flexDirection: 'row', alignItems: 'center', gap: 5, justifyContent: 'center',
    marginTop: space.md, marginBottom: space.sm,
  },
  helpText: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.onSurfaceVariant },
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: space.md, paddingBottom: space.xl, paddingTop: space.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    gap: 8,
  },
  primaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: touch.targetHero, backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg, gap: space.sm,
    shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
  },
  primaryCtaText: { fontFamily: fontFamily.extraBold, fontSize: 17, color: colors.onPrimary },
  secondaryCta: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 44,
    borderWidth: 1.5, borderColor: colors.primaryContainer, borderRadius: radius.lg, gap: 6,
  },
  secondaryCtaText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.primaryContainer },
});
