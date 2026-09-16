/**
 * The buyer console — S17–S25 + S27.
 * Shreya. 07_FRONTEND_ARCHITECTURE.md §1.
 *
 * ★ Icons and `SCREEN_BG` added under Pranay's hand (app-lane lead, CLAUDE.md §1)
 *   for the same two reasons as `FarmerTabs`: without `tabBarIcon` React
 *   Navigation renders its own `MissingIcon` (U+23F7, no glyph in the stock
 *   Android font) so all eight tabs showed a tofu box ▯; and a screen `root`
 *   style is usually a ScrollView's `contentContainerStyle`, which does not
 *   paint the region below short content. Both are fixed once, here.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { S18_PostDemand } from '../screens/buyer/S18_PostDemand';
import { S19_Matches } from '../screens/buyer/S19_Matches';
import { S20_LotDetail } from '../screens/buyer/S20_LotDetail';
import { S21_OfferThread } from '../screens/buyer/S21_OfferThread';
import { S22_EscrowTimeline } from '../screens/buyer/S22_EscrowTimeline';
import { S23_BuyerReliability } from '../screens/buyer/S23_BuyerReliability';
import { S24_DataProvenance } from '../screens/buyer/S24_DataProvenance';
import { S25_Dispute } from '../screens/buyer/S25_Dispute';
import { S27_BuyerChat } from '../screens/buyer/S27_BuyerChat';
import { useT } from '../lib/i18n';
import { useAuth } from '../lib/auth';
import { colors, fontFamily } from '../theme/tokens';
import { tabIcon } from './TabIcon';
import { TabBarButton } from './TabBarButton';

/**
 * ★ The buyer console was still wearing the pre-Stitch palette — white scenes,
 *   a blue active tab, slate labels — while the farmer app had moved to the
 *   approved Mandi Tactile Modern system. Two products under one name, and the
 *   buyer half looked like a different, older app.
 *
 *   Every colour here now comes from `theme/tokens`, which is the same file
 *   the farmer screens read and the same palette the Stitch design system
 *   defines. A hex literal in this file is drift, not a local choice.
 */
const SCREEN_BG = colors.background;

export type BuyerTabParamList = {
  PostDemand: undefined;
  Matches: undefined;
  Offers: undefined;
  Deals: undefined;
  Ledger: undefined;
  Provenance: undefined;
  Dispute: undefined;
  Chat: undefined;
};

/**
 * S20_LotDetail existed in this repo, fully built, and nothing ever
 * navigated to it — a dead file. The Matches tab is now a stack, S19
 * initial, so "लॉट तपशील पहा" on a match card has somewhere to go.
 *
 * ★ `lot_id` is a required param, not optional. The first version of this
 *   route took `undefined` and threw the tapped lot's id away, so S20
 *   rendered the same lot whichever match you came from — which was
 *   survivable only because S20 itself had every value hardcoded. Now that
 *   it reads a real `LotDto`, the id is the whole point of the navigation.
 */
export type MatchesStackParamList = {
  S19_Matches: undefined;
  S20_LotDetail: { lot_id: string };
};

const MatchesStack = createNativeStackNavigator<MatchesStackParamList>();

function MatchesStackNavigator() {
  // ★ The Stitch design opens with who the trader is and which yard is live.
  //   Both come from state this navigator already holds — the signed-in user
  //   and the demo market — rather than from anything the screen invents. When
  //   either is missing, S19 omits that row instead of showing a placeholder.
  const { user } = useAuth();
  const { t } = useT();

  return (
    <MatchesStack.Navigator
      initialRouteName="S19_Matches"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SCREEN_BG } }}>
      <MatchesStack.Screen name="S19_Matches">
        {({ navigation }: NativeStackScreenProps<MatchesStackParamList, 'S19_Matches'>) => (
          <S19_Matches
            onViewLot={lotId => navigation.navigate('S20_LotDetail', { lot_id: lotId })}
            // `exactOptionalPropertyTypes` — spread rather than pass undefined.
            {...(user?.name ? { traderName: user.name } : {})}
            marketName={t('home_market_name')}
          />
        )}
      </MatchesStack.Screen>
      <MatchesStack.Screen name="S20_LotDetail">
        {({ route }: NativeStackScreenProps<MatchesStackParamList, 'S20_LotDetail'>) => (
          <S20_LotDetail lotId={route.params.lot_id} />
        )}
      </MatchesStack.Screen>
    </MatchesStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export function BuyerTabs() {
  const { t } = useT();
  return (
    <Tab.Navigator
      // ★ The console opens on the matched lots, not on a blank demand form.
      //   A trader's home is what is for sale right now; posting a new demand
      //   is something he does occasionally. The approved Stitch design draws
      //   जुळणी as the active tab for the same reason — and opening on मागणी
      //   hid every bit of the redesign behind a tab nobody was told to press.
      initialRouteName="Matches"
      screenOptions={{
        headerShown: false,
        // `sceneStyle`, not the v6 `sceneContainerStyle` prop — bottom-tabs v7
        // moved it into `screenOptions` and dropped the old name entirely.
        sceneStyle: { backgroundColor: SCREEN_BG },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.onSurfaceVariant,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: fontFamily.semiBold,
          // Devanagari tab labels clip their matras at the stock line height.
          lineHeight: 15,
        },
        // Same reason as the farmer bar: Android's default borderless ripple
        // paints outside the tab. See `TabBarButton`.
        tabBarButton: props => <TabBarButton {...props} />,
        tabBarStyle: {
          height: 64,
          paddingBottom: 6,
          paddingTop: 6,
          backgroundColor: colors.surface,
          borderTopWidth: 1.5,
          borderTopColor: colors.borderInput,
        },
      }}>
      <Tab.Screen
        name="PostDemand"
        component={S18_PostDemand}
        options={{ title: t('buyer_tab_demands'), tabBarIcon: tabIcon('demand') }}
      />
      <Tab.Screen
        name="Matches"
        component={MatchesStackNavigator}
        options={{ title: t('buyer_tab_matches'), tabBarIcon: tabIcon('matches') }}
      />
      <Tab.Screen
        name="Offers"
        options={{ title: t('buyer_tab_offers'), tabBarIcon: tabIcon('offers') }}>
        {/* The yard name comes from here rather than from inside the screen:
            S21 omits the mandi-rate half of its price strip when it is not
            told which market it is negotiating in, instead of guessing. */}
        {() => <S21_OfferThread marketName={t('home_market_name')} />}
      </Tab.Screen>
      <Tab.Screen
        name="Deals"
        component={S22_EscrowTimeline}
        options={{ title: t('buyer_tab_transactions'), tabBarIcon: tabIcon('deals') }}
      />
      <Tab.Screen
        name="Ledger"
        component={S23_BuyerReliability}
        options={{ title: t('buyer_tab_ledger'), tabBarIcon: tabIcon('ledger') }}
      />
      <Tab.Screen
        name="Provenance"
        component={S24_DataProvenance}
        options={{ title: t('buyer_tab_provenance'), tabBarIcon: tabIcon('provenance') }}
      />
      <Tab.Screen
        name="Dispute"
        component={S25_Dispute}
        options={{ title: t('buyer_tab_dispute'), tabBarIcon: tabIcon('dispute') }}
      />
      <Tab.Screen
        name="Chat"
        component={S27_BuyerChat}
        options={{ title: t('buyer_tab_chat'), tabBarIcon: tabIcon('chat') }}
      />
    </Tab.Navigator>
  );
}
