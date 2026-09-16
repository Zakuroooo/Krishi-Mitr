/**
 * The farmer app. Five tabs: Home, Market, My Produce, Talks, Deals. Pranay.
 *
 * ★ Those four names are the Stitch footer, verbatim, and getting there took
 *   two fixes. The fourth slot used to be an "Assistant" tab (the canned
 *   Q&A/FAQ screen, S28) with Deals having no tab at all — reachable only
 *   through Menu → Deals, several taps deep; the FAQ moved to the hamburger
 *   menu (`S34_MenuDrawer`) and Deals took the slot. The middle two were then
 *   still labelled "Prices" and "My Lots", which is what a farmer actually
 *   saw at the bottom of every screen while the design said "Market" and
 *   "My Produce". The route names stay `Prices`/`MyLots` — renaming those
 *   would touch every cross-tab `navigate` call for no user-visible gain.
 *
 * ★ Four, not seven. This is a phone held by someone who may not read fluently, in
 *   a mandi, in sunlight, possibly one-handed. Every tab past the fourth is a tab
 *   nobody presses, and the tab bar shrinks each label to fit.
 *
 * ★ Labels go through `useT()` so a language switch relabels the tab bar without
 *   a remount — no separate SH1 handoff needed.
 *
 * ★ Icons are wired (`./TabIcon`). They are not decoration: with `tabBarIcon`
 *   omitted, React Navigation substitutes its own `MissingIcon`, which renders
 *   U+23F7 — a codepoint the stock Android font has no glyph for, so every tab
 *   showed a tofu box ▯. See the header of `TabIcon.tsx`.
 *
 * ★ `SCREEN_BG` is set here, on the navigator, rather than on sixteen screen
 *   roots. Every colour in `app/src/` is a light-theme colour, and a `root`
 *   style is usually a ScrollView's `contentContainerStyle` — a background
 *   there paints the content, not the empty region below short content. The
 *   navigator's scene container paints the whole scene, once, in one place.
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useT } from '../lib/i18n';
import { tabIcon } from './TabIcon';
import { TabBarButton } from './TabBarButton';
import type { AssayReq, AssayRes, TxDto } from '../types/api';

/** The one background colour for every farmer scene. */
const SCREEN_BG = '#FAF6EE';

/** Applied to all three nested stacks, for the same reason as `sceneStyle` below. */
const STACK_SCREEN_OPTIONS = {
  headerShown: false,
  contentStyle: { backgroundColor: SCREEN_BG },
} as const;

import S04_Home from '../screens/farmer/S04_Home';
import S08_ModelCard from '../screens/farmer/S08_ModelCard';
import S09_Verdict from '../screens/farmer/S09_Verdict';
import S10_CostBreakdown from '../screens/farmer/S10_CostBreakdown';
import S13_CropLoan from '../screens/farmer/S13_CropLoan';
import S38_Notifications from '../screens/farmer/S38_Notifications';
import S14_CounterOffer from '../screens/farmer/S14_CounterOffer';
import S15_MyLots from '../screens/farmer/S15_MyLots';
import S16_PoolSplit from '../screens/farmer/S16_PoolSplit';
import PricesIndex from '../screens/farmer/PricesIndex';
// ★ The post-listing selling journey (list → grade → publish → buyers →
//   bargain → deal done → settled) was built as 11 Stitch-matched screens
//   with zero navigation between them or to anything else — every one was
//   unreachable from a running app, which is why "S12 is built" and "I
//   cannot see anything except Home" were both true at once. Registered
//   here and wired below; S15_MyLots/S14_CounterOffer/
//   S16_PoolSplit stay as the primary, backend-wired path (real getLots(),
//   real self-assay scoring, real offer negotiation) — none of that was
//   replaced, since none of these new screens call a real endpoint yet.
import S17_CameraGuide from '../screens/farmer/S17_CameraGuide';
import S18_PhotoReview from '../screens/farmer/S18_PhotoReview';
import S19_Quantity from '../screens/farmer/S19_Quantity';
import S20_QualityDiagnostic from '../screens/farmer/S20_QualityDiagnostic';
import S21_GradeReveal from '../screens/farmer/S21_GradeReveal';
import S22_PricePublish from '../screens/farmer/S22_PricePublish';
import S23_PublishedRadar from '../screens/farmer/S23_PublishedRadar';
import S24_LotDetail from '../screens/farmer/S24_LotDetail';
import S25_BuyersForLot from '../screens/farmer/S25_BuyersForLot';
import S27_Bargaining from '../screens/farmer/S27_Bargaining';
import S28_CounterOffer from '../screens/farmer/S28_CounterOffer';
import S30_DealDone from '../screens/farmer/S30_DealDone';
import S31_DealsList from '../screens/farmer/S31_DealsList';
import S32_DealTracking from '../screens/farmer/S32_DealTracking';
import S33_Settled from '../screens/farmer/S33_Settled';
import S35_FarmerProfile from '../screens/farmer/S35_FarmerProfile';
import S37_Talks from '../screens/farmer/S37_Talks';

export type FarmerTabParamList = {
  Home: undefined;
  Prices: undefined;
  MyLots: undefined;
  Talks: undefined;
  Deals: undefined;
};

/**
 * The Home tab is itself a stack, not a single screen — S4's CTA ("मी विकावे का?")
 * pushes to S9, and a tab switch is the wrong transition for that (it would drop
 * S4 off the back stack entirely; a farmer tapping back from the verdict should
 * return to the price he just saw, not to whichever tab he was on before Home).
 *
 * `S9_Verdict` is the real screen as of P3.
 *
 * S10 sits on this stack rather than getting a tab of its own — it is only ever
 * reached from the verdict's cost row (PRANAY.md §1.7's mockup annotates that row
 * `→ S10`), and back from it must land on the verdict, never on a tab. It takes
 * no params: it reads S9's own query key straight out of the cache, so it holds
 * up on a cold start and in airplane mode. See the header of the screen file.
 *
 * ★ S14 (counter-offer) and S15 (my lots) are NOT registered on this stack —
 *   they live on `MyLotsStackNavigator` below. A screen name only this type
 *   claimed but the navigator never rendered is exactly the "GO_BACK/action
 *   not handled" class of crash: `navigation.navigate('S15_MyLots')` from
 *   here would look up a route this stack has never heard of. S4 reaches
 *   them through `navigation.getParent()` into the `MyLots` tab instead.
 */
export type HomeStackParamList = {
  S4_Home: undefined;
  S9_Verdict: undefined;
  S10_CostBreakdown: undefined;
  /** Stitch 13. Reached from the pledge card on the verdict, which only
   * renders when a quote exists at all (I13) — so this route is only ever
   * offered on the branch where there is something to show. */
  S13_CropLoan: undefined;
  /** Opened from the bell on Home. */
  S38_Notifications: undefined;
};

const HomeStack = createNativeStackNavigator<HomeStackParamList>();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <HomeStack.Screen name="S4_Home" component={S04_Home} />
      <HomeStack.Screen name="S9_Verdict" component={S09_Verdict} />
      {/* Stitch 12 is a bottom sheet over the decision screen, not a page. */}
      <HomeStack.Screen
        name="S10_CostBreakdown"
        component={S10_CostBreakdown}
        options={{ presentation: 'modal' }}
      />
      <HomeStack.Screen name="S13_CropLoan" component={S13_CropLoan} />
      <HomeStack.Screen name="S38_Notifications" component={S38_Notifications} />
    </HomeStack.Navigator>
  );
}

/**
 * The Prices tab is a stack of exactly two screens.
 *
 * ★ It used to hold five. S5 (history), S6 (nearby) and S7 (forecast) were
 *   pre-Stitch screens, each rendering one query on its own page, reached
 *   from a landing menu. `PricesIndex` — the Stitch market screen — renders
 *   all three of those queries itself, so those screens had become second,
 *   unstyled copies of sections a farmer had already scrolled past. They are
 *   deleted rather than left unreachable, because an unreachable screen is
 *   the kind that quietly drifts out of sync with the one people see.
 *
 * ★ S8 (the model card) stays. Nothing on the market screen duplicates it —
 *   it answers "should I believe that fan?", and it is reached from under the
 *   accuracy figures on the forecast card, and from the menu drawer for a
 *   judge who wants it without being walked through a forecast first.
 */
export type PricesStackParamList = {
  PricesIndex: undefined;
  S8_ModelCard: undefined;
};

const PricesStack = createNativeStackNavigator<PricesStackParamList>();

function PricesStackNavigator() {
  return (
    <PricesStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <PricesStack.Screen name="PricesIndex" component={PricesIndex} />
      <PricesStack.Screen name="S8_ModelCard" component={S08_ModelCard} />
    </PricesStack.Navigator>
  );
}

/**
 * The MyLots tab is a stack, same shape as HomeStack/PricesStack. S15 (P12)
 * is the initial route — the list a farmer with existing lots actually lands
 * on — with S12 (P9b) reached from its header button to create a new one,
 * and S13 (P9a) reached from tapping a row to score one.
 */
export type MyLotsStackParamList = {
  S15_MyLots: undefined;
  /**
   * `lot_id` is optional so the assay stays reachable directly (e.g. from a
   * deep link) without a lot created in this session — it falls back to
   * `DEFAULT_LOT_ID`. Both S12 (just created) and S15 (tapped from the list)
   * navigate here with the real id of the lot in question.
   */
  /** Stitch 17 -> 18 -> 19: photograph, review, quantity. The three of them
   * replace the single S12 form; S19 owns the `createLot` call that used to
   * live there and hands the new lot straight to the assay. */
  S17_CameraGuide: undefined;
  S18_PhotoReview: { photoUri: string };
  S19_Quantity: { photoUri: string | null } | undefined;
  S20_QualityDiagnostic: { lot_id?: string } | undefined;
  /**
   * S21 is a pure reveal: it renders what S20's own submission returned and
   * fetches nothing. `answers` rides along so the screen can echo the six
   * answers behind the grade — CANON's `AssayRecord` header notes that
   * `AssayRes` throws them away, and that a grade nobody can audit is the
   * same non-answer CANON rejects for match scores.
   */
  S21_GradeReveal: { result: AssayRes; answers: AssayReq; lot_id?: string };
  /** `offer_id` optional for the same reason as S13's `lot_id` — falls back
   * to the fixture incoming offer. S15's offers-awaiting-response section
   * navigates here with the real id. */
  S14_CounterOffer: { offer_id?: string } | undefined;
  /** `pool_id` optional, same shape again — falls back to the fixture pool. */
  S16_PoolSplit: { pool_id?: string } | undefined;
  /** P15, cuttable — reached from a transaction row in S15. No params: it
   * reads the one demo transaction thread every chat fixture already
   * agrees on, same fixture-first pattern as S10 reading S9's cache key. */

  /** ★ The Stitch-matched selling journey, reachable but still visual-only:
   *  none of these call a real endpoint (no assay submission, no real buyer
   *  list, no real offer/escrow transitions) — they're wired for tap-through
   *  review, not yet backed by the API. See the import comment above. */
  S22_PricePublish: { lot_id?: string } | undefined;
  S23_PublishedRadar: { lot_id?: string; asking_paise?: number } | undefined;
  S24_LotDetail: { lot_id?: string; asking_paise?: number } | undefined;
  /* ★ These took no params at all, which is how they ended up rendering
     hardcoded buyers and prices: a screen that is never told *which* offer
     it is about has nothing to render but literals. The id is what lets
     them read real data.

     ★ Three that used to sit here are gone — S26 (buyer profile), S27
     (bargaining) and S28 (counter offer). S27 and S28 were a second and
     third copy of a negotiation screen this app already has: S14 is the
     real one, wired to `getOfferThread`, `acceptOffer`, `rejectOffer` and
     `counterOffer`, with the counter button disabled on round 3 from the
     offer itself rather than by catching the server's 409.

     ★ S27 and S28 are back, and the earlier deletion was the wrong call.
     Their hardcoded buyers and module-level `const BUYER_BID = 1850` were
     the problem; their Stitch design was not, and what replaced them
     matched nothing in the design system. They are rebuilt to the mockups
     and driven by `GET /offers/{id}/thread` plus the real accept, reject
     and counter endpoints.

     ★ S26 (buyer profile) stays gone, for a different reason: there is no
     `GET /buyers/{id}` at all (blocker filed), so the only versions of that
     screen that can exist are an empty page or an invented firm. */
  S25_BuyersForLot: { lot_id?: string } | undefined;
  S27_Bargaining: { offer_id?: string } | undefined;
  S28_CounterOffer: { offer_id?: string } | undefined;
  /** ★ The transaction rides in on the route rather than being fetched.
   *  `POST /offers/{id}/accept` returns the `TxDto` and that is the only
   *  place its id is ever visible — §7.7 has `GET /tx/{id}` but no `GET /tx`
   *  and no `tx_id` on `OfferDto` (blocker filed). Passing the object keeps
   *  the deal reachable from the moment it exists. */
  S30_DealDone: { tx: TxDto };
  S31_DealsList: undefined;
  S32_DealTracking: { tx_id?: string } | undefined;
  S33_Settled: { tx_id?: string } | undefined;
  S35_FarmerProfile: undefined;
};

/**
 * ★ Deals is its own tab, not a hamburger-menu-only screen. It used to be
 *   reachable only via the menu, pushing on top of whatever the MyLots tab's
 *   own stack already had piled up from a prior sell-flow run — the exact
 *   "why did going to My Deals open ten unrelated back-presses" bug. This
 *   stack is its own tab with its own independent history, starting fresh
 *   at S31 every time the tab is pressed, same shape as Home/Prices/MyLots.
 *
 *   S31/S32/S33 stay registered on MyLotsStack too (deliberately, not a
 *   mistake) for the in-flow "just closed a deal" path — S29's confirm
 *   button and S30's celebration screen still push straight into a
 *   MyLots-stack copy of S31/S32 rather than jumping tabs, so completing a
 *   sale reads as one continuous flow, not a tab switch. Same components,
 *   two stack instances, each with the history that makes sense for how it
 *   was reached.
 */
export type DealsStackParamList = {
  S31_DealsList: undefined;
  S32_DealTracking: undefined;
  S33_Settled: undefined;
};

const DealsStack = createNativeStackNavigator<DealsStackParamList>();

function DealsStackNavigator() {
  return (
    <DealsStack.Navigator initialRouteName="S31_DealsList" screenOptions={STACK_SCREEN_OPTIONS}>
      <DealsStack.Screen name="S31_DealsList" component={S31_DealsList} />
      <DealsStack.Screen name="S32_DealTracking" component={S32_DealTracking} />
      <DealsStack.Screen name="S33_Settled" component={S33_Settled} />
    </DealsStack.Navigator>
  );
}

/**
 * Talks is its own tab and its own stack: the inbox, and the counter-offer
 * screen it opens into. `S14_CounterOffer` is registered here as well as on
 * MyLots — same component, two stack instances, each keeping the history that
 * makes sense for how it was reached. Answering an offer from the inbox
 * should return to the inbox, not into the middle of the selling flow.
 */
export type TalksStackParamList = {
  S37_Talks: undefined;
  S14_CounterOffer: { offer_id?: string } | undefined;
  /** The Stitch negotiation pair, registered here too — tapping a talk opens
   *  the bargaining screen, and its counter button opens the sheet, without
   *  either one leaving the Talks tab. */
  S27_Bargaining: { offer_id?: string } | undefined;
  S28_CounterOffer: { offer_id?: string } | undefined;
  /** ★ Accepting an offer from Talks lands on S30, and S30's "keep watching
   *  this deal" pushes to S32, which pushes to S33. All three have to exist
   *  on *this* stack: registering only S30 meant that button looked up a
   *  route the Talks navigator had never heard of and React Navigation threw
   *  over the screen. A screen reachable from a stack must be registered on
   *  that stack, not merely somewhere in the app. */
  S30_DealDone: { tx: TxDto };
  S32_DealTracking: { tx_id?: string } | undefined;
  S33_Settled: { tx_id?: string } | undefined;
};

const TalksStack = createNativeStackNavigator<TalksStackParamList>();

function TalksStackNavigator() {
  return (
    <TalksStack.Navigator screenOptions={STACK_SCREEN_OPTIONS}>
      <TalksStack.Screen name="S37_Talks" component={S37_Talks} />
      <TalksStack.Screen name="S14_CounterOffer" component={S14_CounterOffer} />
      <TalksStack.Screen name="S27_Bargaining" component={S27_Bargaining} />
      <TalksStack.Screen
        name="S28_CounterOffer"
        component={S28_CounterOffer}
        options={{ presentation: 'modal' }}
      />
      <TalksStack.Screen name="S30_DealDone" component={S30_DealDone} />
      <TalksStack.Screen name="S32_DealTracking" component={S32_DealTracking} />
      <TalksStack.Screen name="S33_Settled" component={S33_Settled} />
    </TalksStack.Navigator>
  );
}

const MyLotsStack = createNativeStackNavigator<MyLotsStackParamList>();

function MyLotsStackNavigator() {
  return (
    <MyLotsStack.Navigator initialRouteName="S15_MyLots" screenOptions={STACK_SCREEN_OPTIONS}>
      <MyLotsStack.Screen name="S15_MyLots" component={S15_MyLots} />
      <MyLotsStack.Screen name="S17_CameraGuide" component={S17_CameraGuide} />
      <MyLotsStack.Screen name="S18_PhotoReview" component={S18_PhotoReview} />
      <MyLotsStack.Screen name="S19_Quantity" component={S19_Quantity} />
      <MyLotsStack.Screen name="S20_QualityDiagnostic" component={S20_QualityDiagnostic} />
      <MyLotsStack.Screen name="S21_GradeReveal" component={S21_GradeReveal} />
      <MyLotsStack.Screen name="S14_CounterOffer" component={S14_CounterOffer} />
      <MyLotsStack.Screen name="S16_PoolSplit" component={S16_PoolSplit} />
      <MyLotsStack.Screen name="S22_PricePublish" component={S22_PricePublish} />
      <MyLotsStack.Screen name="S23_PublishedRadar" component={S23_PublishedRadar} />
      <MyLotsStack.Screen name="S24_LotDetail" component={S24_LotDetail} />
      <MyLotsStack.Screen name="S25_BuyersForLot" component={S25_BuyersForLot} />
      <MyLotsStack.Screen name="S27_Bargaining" component={S27_Bargaining} />
      {/* Stitch 28 is a bottom sheet over the bargaining screen, not a page. */}
      <MyLotsStack.Screen
        name="S28_CounterOffer"
        component={S28_CounterOffer}
        options={{ presentation: 'modal' }}
      />
      <MyLotsStack.Screen name="S30_DealDone" component={S30_DealDone} />
      <MyLotsStack.Screen name="S31_DealsList" component={S31_DealsList} />
      <MyLotsStack.Screen name="S32_DealTracking" component={S32_DealTracking} />
      <MyLotsStack.Screen name="S33_Settled" component={S33_Settled} />
      <MyLotsStack.Screen name="S35_FarmerProfile" component={S35_FarmerProfile} />
    </MyLotsStack.Navigator>
  );
}

const Tab = createBottomTabNavigator<FarmerTabParamList>();

export function FarmerTabs() {
  const { t } = useT();
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        // `sceneStyle`, not the v6 `sceneContainerStyle` prop — bottom-tabs v7
        // moved it into `screenOptions` and dropped the old name entirely.
        sceneStyle: { backgroundColor: SCREEN_BG },
        tabBarActiveTintColor: '#C2410C',
        tabBarInactiveTintColor: '#8D7168',
        tabBarLabelStyle: { fontSize: 12, fontFamily: 'PlusJakartaSans-SemiBold' },
        // Without this, Android draws a borderless ripple that paints outside
        // the 64px bar. See `TabBarButton`.
        tabBarButton: props => <TabBarButton {...props} />,
        tabBarStyle: {
          height: 64,
          paddingBottom: 8,
          paddingTop: 8,
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#EADEC7',
        },
      }}>
      <Tab.Screen
        name="Home"
        component={HomeStackNavigator}
        options={{ title: t('tab_home'), tabBarIcon: tabIcon('home') }}
      />
      <Tab.Screen
        name="Prices"
        component={PricesStackNavigator}
        options={{ title: t('tab_market'), tabBarIcon: tabIcon('prices') }}
      />
      <Tab.Screen
        name="MyLots"
        component={MyLotsStackNavigator}
        options={{ title: t('tab_my_produce'), tabBarIcon: tabIcon('lots') }}
      />
      <Tab.Screen
        name="Talks"
        component={TalksStackNavigator}
        options={{ title: t('tab_chat'), tabBarIcon: tabIcon('chat') }}
      />
      <Tab.Screen
        name="Deals"
        component={DealsStackNavigator}
        options={{ title: t('tab_deals'), tabBarIcon: tabIcon('deals') }}
      />
    </Tab.Navigator>
  );
}
