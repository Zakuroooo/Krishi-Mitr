/**
 * A face speaking into a phone, with sound waves that move while listening.
 *
 * ★ Why a face and not a microphone glyph. A microphone icon is a convention
 *   you have to have learned — it depicts a studio object most farmers have
 *   never held, and it says nothing about what to *do*. A person holding a
 *   phone to their mouth with sound coming out of it is not a convention; it
 *   is a picture of the action. Nobody needs to be taught it.
 *
 * ★ The waves animate only while `listening`, which is the second job: a
 *   farmer who has tapped once needs to know the app is hearing him, and that
 *   he should keep talking. A static icon cannot say that, and "recording…"
 *   in text cannot say it to someone who does not read.
 *
 * ★ Hand-drawn SVG rather than a Lottie file: `react-native-svg` is already
 *   here, the whole thing is a dozen shapes, and a JSON animation asset would
 *   be a new dependency and a new thing to keep in sync with the palette.
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import Svg, { Circle, Path, Rect, G } from 'react-native-svg';

import { colors } from '../../theme/tokens';

const AnimatedG = Animated.createAnimatedComponent(G);

interface Props {
  /** Drives the wave animation. Idle shows the same face, waves at rest. */
  listening?: boolean;
  size?: number;
}

export function SpeakingFace({ listening = false, size = 72 }: Props) {
  // Three waves, staggered, so the arcs ripple outward rather than pulsing as
  // one block — that reads as sound travelling, not as a blinking light.
  const waves = useRef([new Animated.Value(0.35), new Animated.Value(0.35), new Animated.Value(0.35)]).current;

  useEffect(() => {
    if (!listening) {
      waves.forEach(w => w.setValue(0.35));
      return;
    }
    const loops = waves.map((w, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(w, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(w, {
            toValue: 0.35,
            duration: 520,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
      ),
    );
    loops.forEach(l => l.start());
    return () => loops.forEach(l => l.stop());
  }, [listening, waves]);

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size} viewBox="0 0 72 72">
        {/* Head — a simple profile facing right, toward the phone. */}
        <Circle cx={26} cy={26} r={13} fill={colors.primaryContainer} />
        {/* Shoulders, so it reads as a person rather than a floating head. */}
        <Path
          d="M8 62 Q8 44 26 44 Q44 44 44 62 Z"
          fill={colors.primaryContainer}
          opacity={0.85}
        />
        {/* The open mouth — the cue that he is talking, not just present. */}
        <Circle cx={33} cy={30} r={3.4} fill={colors.onPrimary} />

        {/* The phone, held to the mouth. */}
        <Rect x={45} y={20} width={13} height={23} rx={3} fill={colors.onSurface} />
        <Rect x={46.6} y={22.6} width={9.8} height={16} rx={1.5} fill={colors.surfaceBright} />
        <Circle cx={51.5} cy={40.4} r={1.1} fill={colors.surfaceBright} />

        {/* Sound travelling from mouth to phone. */}
        {/* Mapping the array rather than indexing it: `noUncheckedIndexedAccess`
            types `waves[i]` as possibly undefined, which `AnimatedG` will not
            accept for `opacity`. */}
        {waves.map((wave, i) => (
          <AnimatedG key={i} opacity={wave}>
            <Path
              d={`M${38 + i * 3} ${30 - 4 - i * 2.5} Q${41 + i * 3} 30 ${38 + i * 3} ${30 + 4 + i * 2.5}`}
              stroke={colors.primary}
              strokeWidth={2.2}
              strokeLinecap="round"
              fill="none"
            />
          </AnimatedG>
        ))}
      </Svg>
    </View>
  );
}
