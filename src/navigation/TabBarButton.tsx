/**
 * The press behaviour of a footer tab.
 *
 * ★ What this replaces: nothing — and that was the problem. With no
 *   `tabBarButton` given, React Navigation falls back to its own
 *   `PlatformPressable`, which on Android draws a **borderless** ripple. A
 *   borderless ripple is a circle sized to the touchable's larger dimension
 *   and free to paint outside its bounds, so tapping a tab in a 64px bar
 *   flooded a grey disc up over the screen content and down past the bar's
 *   bottom edge, centred wherever the finger landed. It is the stock Android
 *   affordance behaving exactly as documented, and in a short bar it reads as
 *   a glitch.
 *
 * ★ What it does instead: the tab itself moves. Press in and the icon and
 *   label scale to 0.92 and dim slightly; release and a spring returns them.
 *   The feedback is on the thing being pressed rather than a shape painted
 *   over it, it is bounded by definition, and it looks the same on both
 *   platforms — the bar no longer behaves one way on Android and another on
 *   iOS.
 *
 * ★ Kept fast and small on purpose. 90ms down, a stiff spring back: a farmer
 *   switching tabs should feel the tap, not wait through an animation. The
 *   spring runs on the native driver, so it does not compete with the JS
 *   thread that is at that moment mounting the next tab's screen.
 *
 * ★ `prefers-reduced-motion` has no React Native equivalent, but
 *   `AccessibilityInfo.isReduceMotionEnabled` does. When a farmer has asked
 *   the system for less movement, the scale is skipped and only the opacity
 *   dip remains, so the tap still acknowledges itself.
 */

import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet } from 'react-native';
import type { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';

const PRESSED_SCALE = 0.92;
const PRESSED_OPACITY = 0.6;

export function TabBarButton({
  children,
  onPress,
  onLongPress,
  accessibilityState,
  accessibilityLabel,
  testID,
  style,
}: BottomTabBarButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled().then(v => {
      if (!cancelled) setReduceMotion(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);

  const pressIn = () => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: PRESSED_OPACITY,
        duration: 90,
        useNativeDriver: true,
      }),
      ...(reduceMotion
        ? []
        : [
            Animated.timing(scale, {
              toValue: PRESSED_SCALE,
              duration: 90,
              useNativeDriver: true,
            }),
          ]),
    ]).start();
  };

  const pressOut = () => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 120, useNativeDriver: true }),
      ...(reduceMotion
        ? []
        : [
            Animated.spring(scale, {
              toValue: 1,
              speed: 22,
              bounciness: 6,
              useNativeDriver: true,
            }),
          ]),
    ]).start();
  };

  return (
    <Pressable
      onPress={onPress}
      {...(onLongPress ? { onLongPress } : {})}
      onPressIn={pressIn}
      onPressOut={pressOut}
      // The whole point: no borderless disc painting outside the bar.
      android_ripple={null}
      accessibilityRole="button"
      {...(accessibilityState ? { accessibilityState } : {})}
      {...(accessibilityLabel ? { accessibilityLabel } : {})}
      {...(testID ? { testID } : {})}
      style={[styles.pressable, style]}>
      <Animated.View style={[styles.inner, { opacity, transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: { flex: 1 },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
