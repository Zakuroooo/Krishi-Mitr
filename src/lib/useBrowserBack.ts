/**
 * Makes the browser's own back button pop a screen instead of leaving the site.
 *
 * ★ There is no visible control here, deliberately. A floating back button was
 *   tried and removed: most screens already draw their own header arrow, so a
 *   second one sat on top of the first and read as debris stuck to the page.
 *   What was worth keeping is the invisible half — teaching the browser what
 *   "back" means in an app whose navigation lives in memory at a single URL.
 *
 * ★ How it works. While the navigator has somewhere to go back to, one spare
 *   history entry is kept ahead of the page. The browser's back consumes that
 *   entry, `popstate` fires, the navigator pops one screen, and the entry is
 *   re-armed for the next press. When the stack reaches its root the entry is
 *   not replaced, so one more back genuinely leaves the site — which is what a
 *   person at the first screen means by it.
 *
 * On the phone this does nothing at all: `Platform.OS` is not `web`, and
 * Android's own back gesture is already wired to the navigator.
 */

import { useEffect } from 'react';
import { Platform } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

/** Marks the entries this hook pushed, so it never pops one it did not make. */
const MARKER = 'krishiMitrBack';

export function useBrowserBack(
  navigationRef: NavigationContainerRefWithCurrent<Record<string, object | undefined>>,
): void {
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    const arm = () => {
      if (!navigationRef.isReady() || !navigationRef.canGoBack()) return;
      if (window.history.state?.[MARKER]) return;
      window.history.pushState({ [MARKER]: true }, '');
    };

    const onPopState = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        // Re-arm immediately: without this the *next* back press leaves the
        // site while screens are still stacked behind it.
        window.history.pushState({ [MARKER]: true }, '');
      }
    };

    const unsubscribe = navigationRef.addListener('state', arm);
    window.addEventListener('popstate', onPopState);
    arm();

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', onPopState);
    };
  }, [navigationRef]);
}
