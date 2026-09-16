/**
 * S34_MenuDrawer — the hamburger menu: profile, produce, language, and
 * sign out at the bottom.
 *
 * ★ Rewritten from the original Stitch-matched draft, which packed this
 *   screen with invented specifics no backend anywhere has: a fabricated
 *   Mandi ID card number, a bank account and RTGS branch, a landholding
 *   figure, an FPO membership number, a "Warehouse Receipt Loan" with a
 *   made-up available amount, tax-invoice/Form-13 receipts, a biometric
 *   toggle wired to nothing, and a support helpline with no real number
 *   behind it. Per explicit product direction: only what the backend and
 *   AI repos actually have stays on this screen.
 *
 * ★ What's real and kept: the signed-in farmer's own name and phone
 *   (`useAuth()`), a link to My Lots (`S15_MyLots`, a real screen), a link
 *   to the model reliability card (`S08_ModelCard`, a real screen backed
 *   by `GET /ai/model-card`), the language switcher (`useT().setLocale`,
 *   which actually re-renders the whole app in the chosen language), and
 *   sign out (`useAuth().signOut`).
 *
 * ★ ZERO EMOJIS — every icon is the shared SVG `Icon` component.
 */
import React from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import type { FarmerRootStackParamList } from '../../navigation/RootNavigator';
import type { Locale } from '../../types/api';

type Props = NativeStackScreenProps<FarmerRootStackParamList, 'Menu'>;

const LANGUAGES: { code: Locale; label: string }[] = [
  { code: 'mr', label: 'मराठी' },
  { code: 'hi', label: 'हिंदी' },
  { code: 'en', label: 'English' },
];

export default function S34_MenuDrawer({ navigation }: Props) {
  const { user, signOut } = useAuth();
  const { t, locale } = useT();

  const narration = t('nar_scr_menu');


  // ★ Closing the menu with `navigate` used to just push the target screen on
  //   top of whatever the MyLots tab's stack already had piled up (the whole
  //   create-lot → grade → publish → bargain → deal chain, since a tab's
  //   nested stack keeps its history across tab switches). That is why "My
  //   Deal" from the menu could open into a long chain of unrelated back
  //   presses. `reset` on the root stack instead throws away that leftover
  //   history and lands on exactly [My Lots, target] — closing the menu and
  //   giving a clean two-deep stack in one move.
  const goToTab = (tab: 'Home' | 'Prices' | 'MyLots' | 'Deals', screen: string) => {
    const action = CommonActions.reset({
      index: 0,
      routes: [
        {
          name: 'FarmerTabs',
          state: {
            routes: [
              {
                name: tab,
                state:
                  tab === 'MyLots' && screen !== 'S15_MyLots'
                    ? { index: 1, routes: [{ name: 'S15_MyLots' }, { name: screen }] }
                    : { index: 0, routes: [{ name: screen }] },
              },
            ],
          },
        },
      ],
    });
    navigation.dispatch(action as never);
  };

  const goToMyLots = () => goToTab('MyLots', 'S15_MyLots');
  const goToModelCard = () => goToTab('Prices', 'S8_ModelCard');
  const goToProfile = () => goToTab('MyLots', 'S35_FarmerProfile');
  const goToAssistant = () => navigation.navigate('Assistant');

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="x-circle" size={22} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('app_name')}</Text>
        {/* ★ Was an empty spacer. Now the menu can read its own options out,
            which matters here more than most screens: this is where a farmer
            goes when he is lost. */}
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Profile — tap through to full details */}
        <TouchableOpacity style={styles.profileCard} onPress={goToProfile} activeOpacity={0.7}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{(user?.name?.trim()?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {user?.name ?? ''}
            </Text>
            <Text style={styles.profilePhone}>{user?.phone ?? ''}</Text>
          </View>
          <Icon name="chevron-right" size={16} color={colors.outline} />
        </TouchableOpacity>

        {/* Produce — listing and grading */}
        <Text style={styles.sectionLabel}>{t('tab_my_lots')}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuRow} onPress={goToMyLots}>
            <View style={styles.menuIconBg}>
              <Icon name="box" size={16} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{t('my_lots_header')}</Text>
            <Icon name="chevron-right" size={16} color={colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Data & AI. Deals used to have its own menu section here — it is
            now its own bottom tab (see FarmerTabs.tsx), so a menu entry for
            it would just be a second, stale path to the same place. */}
        <Text style={styles.sectionLabel}>{t('model_card_title')}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity style={styles.menuRow} onPress={goToModelCard}>
            <View style={[styles.menuIconBg, { backgroundColor: colors.positiveContainer }]}>
              <Icon name="trending-up" size={16} color={colors.tertiary} />
            </View>
            <Text style={styles.menuTitle}>{t('model_card_title')}</Text>
            <Icon name="chevron-right" size={16} color={colors.outline} />
          </TouchableOpacity>
          <View style={styles.menuDivider} />
          <TouchableOpacity style={styles.menuRow} onPress={goToAssistant}>
            <View style={[styles.menuIconBg, { backgroundColor: colors.positiveContainer }]}>
              <Icon name="message-circle" size={16} color={colors.tertiary} />
            </View>
            <Text style={styles.menuTitle}>{t('tab_assistant')}</Text>
            <Icon name="chevron-right" size={16} color={colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Language. One selector, not two — the three inline chips and a
            row opening the same choice as a full screen were both here, so
            the menu offered the language picker twice in the same card. The
            full screen wins: it carries the per-language voice and preview
            detail the chips have no room for, and the active language is
            already shown here as its value. */}
        <Text style={styles.sectionLabel}>{t('select_language')}</Text>
        <View style={styles.menuCard}>
          <TouchableOpacity
            style={styles.menuRow}
            onPress={() => navigation.navigate('LanguageSwitcher')}
            accessibilityRole="button">
            <View style={styles.menuIconBg}>
              <Icon name="globe" size={16} color={colors.primary} />
            </View>
            <Text style={styles.menuTitle}>{t('select_language')}</Text>
            <Text style={styles.menuValue}>
              {LANGUAGES.find(l => l.code === locale)?.label ?? ''}
            </Text>
            <Icon name="chevron-right" size={16} color={colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Sign out — bottom of the menu, deliberately, not top-bar chrome */}
        <TouchableOpacity style={styles.logoutBtn} onPress={signOut}>
          <Text style={styles.logoutText}>{t('root_sign_out')}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingTop: space.xl + 8, paddingBottom: space.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  closeBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.primary },
  scroll: { paddingBottom: space.xxl },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    margin: space.md, padding: space.md,
    borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  avatarCircle: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fontFamily.extraBold, fontSize: 22, color: colors.primary },
  profileInfo: { flex: 1 },
  profileName: { fontFamily: fontFamily.extraBold, fontSize: 17, color: colors.onSurface },
  profilePhone: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 2 },

  sectionLabel: {
    fontFamily: fontFamily.bold, fontSize: 11, color: colors.onSurfaceVariant,
    paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.xs,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  menuCard: {
    marginHorizontal: space.md, borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden',
  },
  menuRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  menuIconBg: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(155,47,0,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  menuTitle: { flex: 1, fontFamily: fontFamily.bold, fontSize: 14, color: colors.onSurface },
  menuValue: { fontFamily: fontFamily.medium, fontSize: 13, color: colors.onSurfaceVariant },
  menuDivider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: 52 },

  langRow: { flexDirection: 'row', gap: space.xs, padding: space.md },
  langChip: {
    flex: 1, alignItems: 'center', paddingVertical: 10,
    borderRadius: radius.md, backgroundColor: colors.surfaceContainerHigh,
  },
  langChipActive: { backgroundColor: colors.primary },
  langChipText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.onSurfaceVariant },
  langChipTextActive: { color: colors.onPrimary },

  logoutBtn: {
    alignItems: 'center', justifyContent: 'center',
    marginHorizontal: space.md, marginTop: space.xl, paddingVertical: space.sm,
    borderRadius: radius.lg, borderWidth: 1, borderColor: 'rgba(220,38,38,0.25)',
    backgroundColor: 'rgba(220,38,38,0.05)',
  },
  logoutText: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.critical },
});
