/**
 * The value carousel — Stitch screen 03 (`03_value_carousel_why_mandi_setu`),
 * between language selection and the phone number.
 *
 * ★ Named `S01b` rather than `S03`: three screens in this repo already carry
 *   the `S03_` prefix (OTP, Profile, Welcome) from the pre-Stitch numbering,
 *   and adding a fourth would make the prefix mean nothing. This sits between
 *   S01_Language and S02_Phone, and the filename says so.
 *
 * ★ The mockup fills its first card with a worked example — "+₹१८० ते २५०"
 *   expected gain, "-२.४%" storage risk. Those are not rendered here. This
 *   screen runs before login, before a district, before a commodity: there is
 *   no lot to forecast and no request that could have produced those figures.
 *   A farmer's first impression of this product must not be a number it made
 *   up, so each card describes what the app does and shows him the real
 *   figures once he has a lot.
 *
 * ★ The mockup also sets every label bilingually ("खऱ्या भावाची हमी • Fair
 *   Price Intelligence"). Every string here resolves in the one language the
 *   farmer picked on the previous screen.
 */

import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import type { AuthStackParamList } from '../../navigation/AuthStack';

type Props = NativeStackScreenProps<AuthStackParamList, 'S1b_ValueCarousel'>;

const VALUES: Array<{
  titleKey: string;
  bodyKey: string;
  tagKey: string;
  icon: Parameters<typeof Icon>[0]['name'];
}> = [
  { titleKey: 'vc_1_title', bodyKey: 'vc_1_body', tagKey: 'vc_1_tag', icon: 'trending-up' },
  { titleKey: 'vc_2_title', bodyKey: 'vc_2_body', tagKey: 'vc_2_tag', icon: 'handshake' },
  { titleKey: 'vc_3_title', bodyKey: 'vc_3_body', tagKey: 'vc_3_tag', icon: 'lock' },
];

export default function S01b_ValueCarousel({ navigation }: Props) {
  const { t, locale } = useT();

  const narration = t('nar_scr_value');
  const goToPhone = () => navigation.navigate('S2_Phone');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.step}>{t('vc_step', { n: '2', total: '3' })}</Text>
        <TouchableOpacity onPress={goToPhone} accessibilityRole="button" style={styles.skipBtn}>
          <Text style={styles.skipText}>{t('vc_skip')}</Text>
        </TouchableOpacity>
        {/* ★ This screen had no speaker at all. */}
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{t('vc_title')}</Text>

        {VALUES.map((v, i) => (
          <View key={v.titleKey} style={styles.card}>
            <View style={styles.cardHead}>
              <View style={styles.cardIconBox}>
                <Icon name={v.icon} size={20} color={colors.primary} />
              </View>
              <Text style={styles.cardIndex}>{i + 1}</Text>
            </View>
            <Text style={styles.cardTitle}>{t(v.titleKey)}</Text>
            <Text style={styles.cardBody}>{t(v.bodyKey)}</Text>
            <View style={styles.cardTag}>
              <Text style={styles.cardTagText}>{t(v.tagKey)}</Text>
            </View>
          </View>
        ))}

        {/* I6, stated up front. The refusal is the product, so it is a promise
            made before login rather than a surprise on the verdict screen. */}
        <View style={styles.refusalCard}>
          <View style={styles.refusalHead}>
            <Icon name="shield-check" size={18} color={colors.tertiary} />
            <Text style={styles.refusalTitle}>{t('vc_refusal_title')}</Text>
          </View>
          <Text style={styles.refusalBody}>{t('vc_refusal_body')}</Text>
        </View>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity style={styles.cta} onPress={goToPhone} accessibilityRole="button">
          <Text style={styles.ctaText}>{t('vc_next')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.loginBtn} onPress={goToPhone} accessibilityRole="button">
          <Text style={styles.loginText}>{t('vc_login')}</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: space.md,
    paddingTop: space.xl + 8,
    paddingBottom: space.xs,
  },
  step: { flex: 1, ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtn: { paddingHorizontal: space.xs, paddingVertical: 6 },
  skipText: { ...typography.labelMd, color: colors.primary },

  scroll: { padding: space.md, paddingBottom: 190, gap: space.sm },
  title: {
    ...typography.displayLg,
    color: colors.onSurface,
    marginBottom: space.xs,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.md,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: space.xs,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardIndex: { ...typography.headlineMd, color: colors.outlineVariant, fontFamily: fontFamily.extraBold },
  cardTitle: { ...typography.titleLg, color: colors.onSurface },
  cardBody: { ...typography.bodyMd, color: colors.onSurfaceVariant, marginTop: 4, lineHeight: 21 },
  cardTag: {
    alignSelf: 'flex-start',
    marginTop: space.sm,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
  },
  cardTagText: { ...typography.labelSm, color: colors.primary },

  refusalCard: {
    backgroundColor: colors.positiveContainer,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.tertiary,
    padding: space.md,
  },
  refusalHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  refusalTitle: { ...typography.titleMd, color: colors.onPositiveContainer, flex: 1 },
  refusalBody: {
    ...typography.bodySm,
    color: colors.onPositiveContainer,
    marginTop: 6,
    lineHeight: 19,
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
  loginBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xs },
  loginText: { ...typography.titleMd, color: colors.primary },
});
