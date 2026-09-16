/**
 * The "listen" control that sits in the corner of most screens.
 *
 * ★ Why this exists: ten screens rendered a speaker icon in a
 *   `TouchableOpacity` with no `onPress` at all. Tapping it did nothing, on
 *   the screens where hearing the number out loud matters most — the offer
 *   list, the deal confirmation, the settlement receipt. For a farmer who
 *   does not read fluently that is not a missing nicety, it is the screen
 *   failing at its job. One component now owns the behaviour, so a dead
 *   speaker button cannot come back by copy-paste.
 *
 * ★ It speaks through the device's own TTS (`lib/voice.ts`), which works
 *   offline — I7, and a farmer in a mandi with no signal still gets the
 *   number read to him.
 *
 *   For the verdict specifically, `speakSaleWindow()` prefers Sarvam's
 *   human-grade Marathi over on-device TTS — the backend team wired that
 *   (narrate -> base64 WAV -> cache file -> player, with `react-native-fs`),
 *   and it falls back to on-device TTS whenever the server is unreachable, so
 *   the verdict is never silent. This button speaks its own screen's text and
 *   uses the on-device path directly; the Sarvam path is worth extending here
 *   once the other screens have narration sentences worth synthesizing.
 */

import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';

import { colors, fontFamily, radius, touch } from '../../theme/tokens';
import { Icon } from './Icon';
import { useT } from '../../lib/i18n';
import {
  currentSpeechGeneration,
  prefetchNarration,
  speakSmart,
  stopSpeaking,
  subscribeSpeech,
} from '../../lib/voice';

export function ListenButton({
  text,
  label,
  large = false,
}: {
  text: string;
  label?: string;
  /** A bigger target and bigger text. For the first speaker a farmer meets,
   *  which has to be findable without being looked for. */
  large?: boolean;
}) {
  const { t, locale } = useT();
  const [speaking, setSpeaking] = useState(false);

  /**
   * ★ A toggle, not a replay.
   *
   *   The button used to start playback with no way to stop it. It showed
   *   "Playing…" and a second tap restarted from the top — so a farmer who
   *   had heard enough, or who tapped it by accident on a long narration,
   *   had to sit through the whole thing or leave the screen. Worse, on the
   *   Sarvam path leaving the screen did not help either: `stopSpeaking()`
   *   only reached the on-device TTS engine, and the clip kept playing.
   *
   *   Now: tapping while it speaks stops it immediately and the label goes
   *   back to "Listen". Tapping again starts from the first word.
   *
   * ★ `stoppedRef` guards the stale-finally race. The in-flight `speakSmart`
   *   resolves shortly after a stop, and its `finally` would otherwise clear
   *   the flag on a *newer* utterance the farmer had already started.
   */
  const runIdRef = useRef(0);
  /** The speech generation this button owns while it is the one talking. */
  const genRef = useRef<number | null>(null);

  const onPress = async () => {
    if (text.trim().length === 0) return;

    if (speaking) {
      runIdRef.current += 1;
      setSpeaking(false);
      await stopSpeaking();
      return;
    }

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;
    setSpeaking(true);
    // Claimed after `speakSmart` bumps the generation, below.
    genRef.current = null;
    try {
      // Sarvam's voice where the server is reachable, the device's own TTS
      // where it is not — and always in the language the farmer chose.
      // `speakSmart` stops whatever was playing first, which moves the
      // generation; claim the new one so we can tell when someone supersedes us.
      const started = speakSmart(text, locale);
      genRef.current = currentSpeechGeneration();
      await started;
    } catch {
      // A farmer who taps listen and hears nothing has lost a nice-to-have,
      // not the screen. An error banner over a TTS glitch would outrank the
      // content it was meant to read.
    } finally {
      // Only the run that is still current may clear the flag.
      if (runIdRef.current === runId) {
        genRef.current = null;
        setSpeaking(false);
      }
    }
  };

  /**
   * ★ Warm the first chunk as soon as the button knows what it would say, so
   *   a tap plays immediately instead of waiting on synthesis.
   *
   * ★ The 1.5s debounce is not arbitrary. At 700ms the warm-up fired before
   *   the signed-in farmer's name had hydrated from AsyncStorage, so it cached
   *   a narration whose greeting differed by one word from the one the tap
   *   asked for — a cache miss, and the whole optimisation wasted. The delay
   *   has to outlast the slowest thing that can still change the wording.
   */
  useEffect(() => {
    if (text.trim().length === 0) return;
    const id = setTimeout(() => void prefetchNarration(text, locale), 1500);
    return () => clearTimeout(id);
  }, [text, locale]);

  /**
   * ★ Someone else started talking — another button, or a screen tearing down.
   *   Without this the button that *was* playing keeps showing "Playing…"
   *   indefinitely, because its own run id still matches while the audio it
   *   started was silenced by a different component.
   */
  useEffect(
    () =>
      subscribeSpeech(() => {
        if (genRef.current !== null && currentSpeechGeneration() !== genRef.current) {
          genRef.current = null;
          runIdRef.current += 1;
          setSpeaking(false);
        }
      }),
    [],
  );

  /* Leaving the screen mid-sentence should not leave a voice behind. */
  useEffect(() => {
    return () => {
      runIdRef.current += 1;
      void stopSpeaking();
    };
  }, []);

  return (
    <TouchableOpacity
      style={[styles.btn, large && styles.btnLarge, speaking && styles.btnActive]}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: speaking }}
      accessibilityLabel={speaking ? t('listen_stop_a11y') : (label ?? t('listen_button'))}>
      {/* ★ A speaker when idle, a stop square when speaking — never
          `volume-off`. A crossed-out speaker means *muted*, which was the
          one thing it did not mean: there was sound, and tapping did not
          mute it. The icon now says what the tap will do. */}
      <Icon
        name={speaking ? 'x-circle' : 'volume'}
        size={large ? 20 : 14}
        color={speaking ? colors.onPrimary : colors.primary}
      />
      <Text style={[styles.label, large && styles.labelLarge, speaking && styles.labelActive]}>
        {speaking ? t('listening_button') : t('splash_listen')}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    flexShrink: 0,
  },
  // ★ Comfortably past the 56dp touch floor, with a brand-tinted ground so it
  //   reads as the primary affordance on the screen rather than chrome.
  btnLarge: {
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 14,
    minHeight: touch.targetMin,
    backgroundColor: colors.onPrimaryContainer,
    borderColor: colors.primary,
    borderWidth: 1.5,
  },
  btnActive: { backgroundColor: colors.primaryContainer, borderColor: colors.primaryContainer },
  label: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primary },
  labelLarge: { fontSize: 16 },
  labelActive: { color: colors.onPrimary },
});
