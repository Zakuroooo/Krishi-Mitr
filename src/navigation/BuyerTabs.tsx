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
import { tabIcon } from './TabIcon';
import { TabBarButton } from './TabBarButton';

/** The one background colour for every buyer scene. Matches `FarmerTabs`. */
const SCREEN_BG = '#FFFFFF';

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
  return (
    <MatchesStack.Navigator
      initialRouteName="S19_Matches"
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: SCREEN_BG } }}>
      <MatchesStack.Screen name="S19_Matches">
        {({ navigation }: NativeStackScreenProps<MatchesStackParamList, 'S19_Matches'>) => (
          <S19_Matches onViewLot={lotId => navigation.navigate('S20_LotDetail', { lot_id: lotId })} />
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
      screenOptions={{
        headerShown: false,
        // `sceneStyle`, not the v6 `sceneContainerStyle` prop — bottom-tabs v7
        // moved it into `screenOptions` and dropped the old name entirely.
        sceneStyle: { backgroundColor: SCREEN_BG },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#64748B',
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        // Same reason as the farmer bar: Android's default borderless ripple
        // paints outside the tab. See `TabBarButton`.
        tabBarButton: props => <TabBarButton {...props} />,
        tabBarStyle: { height: 60, paddingBottom: 4, paddingTop: 4 },
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
        component={S21_OfferThread}
        options={{ title: t('buyer_tab_offers'), tabBarIcon: tabIcon('offers') }}
      />
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
