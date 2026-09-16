/**
 * Providers, in the order they have to be in.
 *
 *   SafeAreaProvider → QueryClientProvider → I18nProvider → SelectionProvider → AuthProvider
 *     → NavigationContainer → RootNavigator
 *
 * `AuthProvider` sits *inside* `QueryClientProvider` because its boot path calls
 * `/auth/me`, and *outside* `NavigationContainer` because `RootNavigator` chooses
 * the navigator from `useAuth()`. Neither of those is swappable.
 */

import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Sound from 'react-native-sound';

import { ApiError } from './src/lib/api';
import { AuthProvider } from './src/lib/auth';
import { I18nProvider } from './src/lib/i18n';
import { SelectionProvider } from './src/lib/selection';
import { hydrateQueryClient, persistQueryClient } from './src/lib/offline';
import { RootNavigator } from './src/navigation/RootNavigator';
import { CACHE_STALE_MS } from './src/config';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_STALE_MS,

      /**
       * ★ Never retry a 4xx.
       *
       *   The default retries three times with backoff. On a 404 — which is what I4
       *   returns for another actor's row, and what an empty result looks like —
       *   that is roughly seven seconds of spinner before the farmer sees the empty
       *   state he was always going to see. On a 400 it is seven seconds before he
       *   sees the validation message. Retry the network, not the answer.
       */
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return failureCount < 2;
      },

      // P11: `lib/offline.ts` hydrates this client from the last dehydrated
      //   snapshot (below, at module scope — before this file's default export
      //   is ever rendered), and re-dehydrates on every cache change after. A
      //   cold start with no network renders the last known values with a
      //   stale banner instead of an error screen — venue wifi fails, and the
      //   app should degrade, not stop.
    },
  },
});

// P11: kicked off here, at module scope, rather than gating `App`'s first
// render on a React state flip. Two reasons, not one:
//
//   1. `hydrate()` writes directly into `queryClient`'s cache and notifies
//      any `useQuery` observer already subscribed to an affected key — a
//      screen that mounts a few milliseconds before this promise resolves
//      still gets the hydrated data the moment it lands, via the same
//      subscription mechanism TanStack Query already uses for every other
//      cache update. A render-blocking gate buys, at most, avoiding one
//      loading frame; it is not required for the data to arrive.
//   2. A gate implemented with `useState`+`useEffect` inside `App` fires a
//      second render after an async boundary. `__tests__/App.test.tsx` calls
//      `renderer.create(<App />)` synchronously with nothing awaited — by
//      the time this promise resolves, Jest has already torn the test's
//      module environment down, and the resulting state update crashes with
//      modules that no longer exist (`Dimensions.get` inside
//      `SafeAreaProvider`, concretely). Hydrating at module scope keeps
//      `App` itself a plain, synchronous, always-fully-mounts component,
//      matching what that test already assumes.
hydrateQueryClient(queryClient).then(() => persistQueryClient(queryClient));

// Without this, `lib/voice.ts`'s clips are silent when the phone is on
// vibrate — which is how a demo phone is always configured. Set once, at
// module scope, for the same reason hydration is: a value that never
// changes per-render has no business living inside the component function.
Sound.setCategory('Playback');

export default function App() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <I18nProvider>
          <SelectionProvider>
            <AuthProvider>
            <NavigationContainer>
              <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
              <RootNavigator />
            </NavigationContainer>
            </AuthProvider>
          </SelectionProvider>
        </I18nProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
