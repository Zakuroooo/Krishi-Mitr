/**
 * The role branch. One place, no route guards. Pranay + Shreya.
 *
 * ★ The bar above the tabs is the first thing on screen on every single screen,
 *   so it is the app's title bar, not a debug readout. It used to render
 *   "🌾 शेतकरी ॲप (Farmer App)" plus a red "🚪 बाहेर पडा (Sign Out)" — three
 *   emoji, two languages at once, and the most destructive action in the app
 *   styled as the loudest thing on it. All three of those were wrong:
 *
 *   - **Emoji.** Every one is a font gamble on a cheap Android device, and this
 *     bar is the worst possible place to lose that gamble. Removed here and in
 *     the three dictionaries.
 *   - **Two languages.** The app is Marathi-first with a language switcher; a
 *     parenthetical English gloss on top of the Marathi says we did not trust
 *     our own localisation. The role now shows once, in the active locale.
 *   - **Red sign-out.** Red is the colour this app uses for the worst case in a
 *     forecast (I16). Spending it on a chrome button trains a farmer to ignore
 *     it in the one place it matters. It is now the quietest thing in the bar.
 *
 *   What is left: the product name, the active role as a tinted pill, and the
 *   farmer's own name. A judge should read this bar once and never again.
 */

import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useAuth } from '../lib/auth';
import { useT } from '../lib/i18n';
import { AuthStack } from './AuthStack';
import { BuyerTabs } from './BuyerTabs';
import { FarmerTabs } from './FarmerTabs';
import S34_MenuDrawer from '../screens/farmer/S34_MenuDrawer';
import S28_Assistant from '../screens/farmer/S28_Assistant';
import S36_LanguageSwitcher from '../screens/farmer/S36_LanguageSwitcher';

function Splash() {
  return (
    <View style={styles.splash}>
      <ActivityIndicator size="large" color="#1B5E20" />
    </View>
  );
}

// ★ The hamburger menu on Home (☰) needs somewhere above the tab navigator
//   to push to — a screen inside `HomeStackNavigator` would only be reachable
//   from Home, but the menu has to open from any tab. This one-screen stack
//   wraps the whole tab bar so `S4_Home` can reach "Menu" with two
//   `getParent()` hops (out of its own stack, out of the tab navigator) and
//   land on a sibling of the tabs, not a child of one.
export type FarmerRootStackParamList = {
  FarmerTabs: undefined;
  Menu: undefined;
  Assistant: undefined;
  LanguageSwitcher: undefined;
};
const FarmerRootStack = createNativeStackNavigator<FarmerRootStackParamList>();

function FarmerRoot() {
  return (
    <FarmerRootStack.Navigator screenOptions={{ headerShown: false }}>
      <FarmerRootStack.Screen name="FarmerTabs" component={FarmerTabs} />
      <FarmerRootStack.Screen
        name="Menu"
        component={S34_MenuDrawer}
        options={{ animation: 'slide_from_left' }}
      />
      {/* ★ Was the 4th tab; Deals took that slot (see FarmerTabs.tsx header).
          Still reachable, one tap from the menu instead. Needs its own
          header — this screen has no back affordance of its own (it never
          needed one as a tab root, where the tab bar is the way back), and
          the stack's own `headerShown: false` above would otherwise strand
          a farmer here with no way out. */}
      <FarmerRootStack.Screen
        name="Assistant"
        component={S28_Assistant}
        options={{ headerShown: true, title: '' }}
      />
      {/* Stitch 36. Built, fully translated, and reachable from nothing until
          now — the menu's three inline chips were the only way to change
          language, and they carry none of this screen's per-language voice
          and preview detail. */}
      <FarmerRootStack.Screen name="LanguageSwitcher" component={S36_LanguageSwitcher} />
    </FarmerRootStack.Navigator>
  );
}

export function RootNavigator() {
  const { status, user, signOut } = useAuth();
  const { t } = useT();

  if (status === 'loading') return <Splash />;

  if (!user) return <AuthStack />;

  const isFarmer = user.role === 'FARMER';

  // ★ The farmer side no longer renders this global chrome bar at all — it
  //   was a second "Krishi Mitra" brand header stacked on top of each
  //   screen's own header (S4_Home already shows who's signed in), and its
  //   Sign Out button was the app's most destructive action rendered as
  //   permanently-visible top-bar chrome. Sign out now lives at the bottom
  //   of the hamburger menu (`S34_MenuDrawer`), one deliberate tap away
  //   instead of one careless one. The buyer console keeps this bar for now
  //   — its screens have not been through the same menu redesign yet.
  if (isFarmer) {
    return (
      <View style={styles.container}>
        <FarmerRoot />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={styles.identity}>
          <Text style={styles.appName} numberOfLines={1}>
            {t('app_name')}
          </Text>
          <View style={[styles.rolePill, styles.rolePillBuyer]}>
            <Text style={[styles.rolePillText, styles.roleTextBuyer]}>
              {t('root_buyer_console_title')}
            </Text>
          </View>
        </View>

        {/* `numberOfLines` because a farmer's name is untrusted-length input and
            this row must never wrap into two — it is above every screen. */}
        <View style={styles.actions}>
          <Text style={styles.userName} numberOfLines={1}>
            {user.name}
          </Text>
          <TouchableOpacity
            onPress={signOut}
            style={styles.logoutBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={t('root_sign_out')}>
            <Text style={styles.logoutBtnText}>{t('root_sign_out')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.navContainer}>
        <BuyerTabs />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  splash: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  container: { flex: 1, width: '100%', height: '100%', backgroundColor: '#FFFFFF' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E2E8F0',
  },
  identity: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  appName: { fontSize: 17, fontWeight: '800', color: '#1B5E20', letterSpacing: 0.2 },
  rolePill: { marginLeft: 8, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  rolePillFarmer: { backgroundColor: '#E8F5E9' },
  rolePillBuyer: { backgroundColor: '#E3F2FD' },
  rolePillText: { fontSize: 11, fontWeight: '700' },
  roleTextFarmer: { color: '#1B5E20' },
  roleTextBuyer: { color: '#1565C0' },
  actions: { flexDirection: 'row', alignItems: 'center', marginLeft: 12, flexShrink: 0 },
  userName: { fontSize: 12, fontWeight: '600', color: '#475569', maxWidth: 96, marginRight: 8 },
  logoutBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  logoutBtnText: { fontSize: 12, fontWeight: '600', color: '#64748B' },
  navContainer: { flex: 1 },
});
