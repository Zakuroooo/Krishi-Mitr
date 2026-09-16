/**
 * URL for every screen — web only.
 *
 * ★ Why this exists. The phone app keeps its navigation in memory, which is
 *   right for a phone and wrong for a browser: the whole product sat at "/",
 *   a refresh threw you back to the landing page, nothing could be linked to,
 *   and the browser's back button left the site instead of going back one
 *   screen. This maps the navigator's route names onto paths, and React
 *   Navigation then keeps the URL, the history stack and the back button in
 *   step by itself — replacing the `useBrowserBack` hack that did a worse job
 *   of half of it.
 *
 * ★ Paths are named for what a person would expect to see, not for the screen
 *   ids: `/app/home/verdict`, not `/S9_Verdict`. The ids are ours; the URL is
 *   the user's, and a judge should be able to read one out loud.
 *
 * ★ `Deals` appears twice — once inside the farmer's tabs and once as a buyer
 *   tab. That is safe: the role branch in `RootNavigator` means only one of
 *   the two navigators is ever mounted, so only one of the two mappings is
 *   ever live.
 */

import { Platform } from 'react-native';
import type { LinkingOptions } from '@react-navigation/native';

const config = {
  screens: {
    // ── Signed out ────────────────────────────────────────────────────────
    Web_Landing: '',
    Buyer_Splash: 'trader',
    S0_Splash: 'start',
    S1_Language: 'language',
    S1b_ValueCarousel: 'why',
    S2_Phone: 'phone',
    S3_OTP: 'otp',
    S3_Profile: 'profile',
    S3_Welcome: 'welcome',

    // ── Farmer, signed in ─────────────────────────────────────────────────
    FarmerTabs: {
      path: 'app',
      screens: {
        Home: {
          path: 'home',
          screens: {
            S4_Home: '',
            S9_Verdict: 'verdict',
            S10_CostBreakdown: 'costs',
            S13_CropLoan: 'loan',
            S38_Notifications: 'alerts',
          },
        },
        Prices: {
          path: 'prices',
          screens: { PricesIndex: '', S8_ModelCard: 'model' },
        },
        MyLots: { path: 'lots', screens: { S15_MyLots: '' } },
        Talks: { path: 'talks', screens: { S37_Talks: '' } },
        Deals: {
          path: 'deals',
          screens: { S31_DealsList: '', S32_DealTracking: 'tracking', S33_Settled: 'settled' },
        },
      },
    },
    Menu: 'menu',
    Assistant: 'assistant',
    LanguageSwitcher: 'settings/language',

    // ── Buyer, signed in ──────────────────────────────────────────────────
    PostDemand: 'trader/demand',
    Matches: {
      path: 'trader/matches',
      screens: { S19_Matches: '', S20_LotDetail: 'lot/:lot_id' },
    },
    Offers: 'trader/offers',
    Deals: 'trader/deals',
    Ledger: 'trader/ledger',
    Provenance: 'trader/transparency',
    Dispute: 'trader/dispute',
    Chat: 'trader/chat',
  },
} as const;

/**
 * `undefined` off the web, so the phone build is untouched if this file ever
 * travels back to the mobile repo with the rest of `src/`.
 */
export const webLinking: LinkingOptions<Record<string, object | undefined>> | undefined =
  Platform.OS === 'web'
    ? ({
        prefixes: [],
        config,
      } as unknown as LinkingOptions<Record<string, object | undefined>>)
    : undefined;
