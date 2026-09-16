/**
 * Back, for the browser — web only.
 *
 * ★ The phone does not need this and never did: Android has a hardware back
 *   gesture, and every screen that needs one draws its own header arrow. A
 *   browser has neither. A farmer (or a judge) who tapped into the verdict
 *   screen had no way out except the browser's own back button, which — with
 *   navigation held in memory and one URL for the whole app — left the page
 *   entirely. That is the worst possible answer to "go back one screen".
 *
 * ★ So this does two jobs at once:
 *
 *   1. Draws a back control in the top-left whenever there is somewhere to go
 *      back to. It is deliberately large (the app's `targetHero`) and solid
 *      rather than a subtle chevron — the same reasoning as every other touch
 *      target in this app.
 *
 *   2. Teaches the browser's own back button what it means here. Every push
 *      adds a history entry, and a `popstate` pops the navigator instead of
 *      unloading the page. Back now does the expected thing from the keyboard,
 *      the mouse, a trackpad swipe, and an Android browser's system gesture.
 *
 *   When the stack is at its root, the control disappears and history is left
 *   alone, so one more back genuinely leaves the site.
 */

import React, { useEffect, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import type { NavigationContainerRefWithCurrent } from '@react-navigation/native';

import { colors, radius, space, touch, type } from '../../theme/tokens';

/** The one word, in the three languages the app speaks. Not routed through
 *  `useT` because this renders outside the navigator's screens and must never
 *  depend on a provider that a given screen might not have mounted yet. */
const LABEL: Record<string, string> = { mr: 'मागे', hi: 'पीछे', en: 'Back' };

export function WebBackButton({
  navigationRef,
  locale = 'mr',
}: {
  navigationRef: NavigationContainerRefWithCurrent<Record<string, object | undefined>>;
  locale?: string;
}) {
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const sync = () => {
      const possible = navigationRef.isReady() && navigationRef.canGoBack();
      setCanGoBack(possible);

      // Keep exactly one spare history entry while there is somewhere to go
      // back to, so the browser's back lands on `popstate` below rather than
      // on the previous website.
      if (possible && window.history.state?.krishiMitrDepth === undefined) {
        window.history.pushState({ krishiMitrDepth: 1 }, '');
      }
    };

    const onPopState = () => {
      if (navigationRef.isReady() && navigationRef.canGoBack()) {
        navigationRef.goBack();
        // Re-arm: the entry just consumed has to be replaced or the *next*
        // back leaves the site while screens remain on the stack.
        window.history.pushState({ krishiMitrDepth: 1 }, '');
      }
      sync();
    };

    const unsubscribe = navigationRef.addListener('state', sync);
    window.addEventListener('popstate', onPopState);
    sync();

    return () => {
      unsubscribe();
      window.removeEventListener('popstate', onPopState);
    };
  }, [navigationRef]);

  if (Platform.OS !== 'web' || !canGoBack) return null;

  return (
    <View style={styles.dock} pointerEvents="box-none">
      <Pressable
        onPress={() => {
          if (navigationRef.isReady() && navigationRef.canGoBack()) navigationRef.goBack();
        }}
        accessibilityRole="button"
        accessibilityLabel={LABEL[locale] ?? LABEL.mr}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
        <Text style={styles.arrow}>←</Text>
        <Text style={styles.label}>{LABEL[locale] ?? LABEL.mr}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Fixed to the viewport rather than placed in a header: the app has many
  // different headers and some screens have none, and back has to be in the
  // same place on all of them.
  dock: {
    position: 'absolute',
    top: space.sm,
    left: space.sm,
    zIndex: 50,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xs,
    minHeight: touch.targetMin,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderActive,
    // A real shadow: this floats over screen content and needs to read as
    // being above it, not as part of the card underneath.
    shadowColor: '#59413A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 12,
  },
  pressed: { backgroundColor: colors.surfaceContainerLow },
  arrow: { ...type.headlineSm, color: colors.primary },
  label: { ...type.labelLg, color: colors.primary },
});
