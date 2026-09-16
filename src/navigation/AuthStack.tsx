/**
 * The signed-out stack: Splash → Language → Phone → OTP → Profile → Welcome.
 */

import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';


import Landing from '../screens/web/Landing';
import BuyerSplash from '../screens/buyer/BuyerSplash';
import { useAuth } from '../lib/auth';
import { fxAuthRegisteredBuyer } from '../fixtures/auth';
import S00_Splash from '../screens/farmer/S00_Splash';
import S01_Language from '../screens/farmer/S01_Language';
import S01b_ValueCarousel from '../screens/farmer/S01b_ValueCarousel';
import S02_Phone from '../screens/farmer/S02_Phone';
import S03_OTP from '../screens/farmer/S03_OTP';
import S03_Profile from '../screens/farmer/S03_Profile';
import S03_Welcome from '../screens/farmer/S03_Welcome';

export type AuthStackParamList = {
  /** Web only — a URL has no "I installed this on purpose" context, so the
   * first screen asks farmer or buyer and then hands over to the phone flow
   * unchanged. See `screens/web/Landing.tsx`. */
  Web_Landing: undefined;
  /** The trader's own first screen — the approved Stitch buyer splash. */
  Buyer_Splash: undefined;
  S0_Splash: undefined;
  S1_Language: undefined;
  /** Stitch 03 — "why Krishi Mitr", between the language choice and the
   * phone number. `S1b` because three screens already carry the `S03_`
   * prefix from the pre-Stitch numbering. */
  S1b_ValueCarousel: undefined;
  S2_Phone: undefined;
  S3_OTP: undefined;
  S3_Profile: undefined;
  S3_Welcome: undefined;
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * The buyer splash, wired to the one thing it asks for. Signing in with the
 * fixture buyer is how the phone build reaches the console too — there is no
 * separate trader login yet, and inventing one on this screen would be a
 * promise the backend cannot keep.
 */
function BuyerSplashRoute() {
  const { signIn } = useAuth();
  return <BuyerSplash onSignIn={() => void signIn(fxAuthRegisteredBuyer)} />;
}

export function AuthStack() {
  return (
    <Stack.Navigator
      // ★ Always the splash, even for a returning farmer who has already
      //   picked a language.
      //
      //   This used to be `hasLocale ? 'S2_Phone' : 'S0_Splash'`, which broke
      //   two things at once and neither of them looked like a routing bug:
      //
      //   - **Back did nothing on the phone screen.** `initialRouteName` does
      //     not push the screens before it; it *starts* the stack there. So
      //     S2_Phone was the bottom of the stack, `goBack()` had no frame to
      //     pop, and React Navigation logged "GO_BACK was not handled".
      //   - **Splash became unreachable forever.** Once a locale was saved,
      //     nothing could route back to a screen the stack never contained —
      //     including us, when we wanted to demo it.
      //
      //   The branch it was making still has to happen; it just belongs on the
      //   splash's own button, where it is a navigation choice rather than a
      //   stack root. `S00_Splash` reads `hasLocale` and sends a returning
      //   farmer straight to the phone screen — one extra tap for him, a real
      //   back stack for everyone.
      // ★ On the web the landing page sits *below* the splash in the stack,
      //   so the splash's own back gesture returns here rather than dead-ending
      //   — the same reason the splash itself is the root on the phone.
      initialRouteName="Web_Landing"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Web_Landing" component={Landing} />
      <Stack.Screen name="Buyer_Splash" component={BuyerSplashRoute} />
      <Stack.Screen name="S0_Splash" component={S00_Splash} />
      <Stack.Screen name="S1_Language" component={S01_Language} />
      <Stack.Screen name="S1b_ValueCarousel" component={S01b_ValueCarousel} />
      <Stack.Screen name="S2_Phone" component={S02_Phone} />
      <Stack.Screen name="S3_OTP" component={S03_OTP} />
      <Stack.Screen name="S3_Profile" component={S03_Profile} />
      <Stack.Screen name="S3_Welcome" component={S03_Welcome} />
    </Stack.Navigator>
  );
}
