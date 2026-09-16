/**
 * Makes a screen read itself aloud on arrival — when the farmer has asked for
 * that.
 *
 * ★ Off by default, and that default is the whole story. I first shipped this
 *   on, reasoning that a farmer who cannot read gains nothing from an app that
 *   stays silent until he finds the speaker icon. On the device it was simply
 *   intrusive: the phone started talking the instant a screen appeared, before
 *   anyone had looked at it, and again every time you came back to it.
 *
 *   The setting is still worth having — a farmer who cannot read at all wants
 *   exactly this and should be able to switch it on once. It is his choice,
 *   not our default.
 *
 * ★ Speaks on **focus**, not on mount, and stops on blur. React Navigation
 *   keeps a screen mounted under the one on top of it, so a mount effect would
 *   fire for screens nobody can see, and going back would never re-narrate.
 *
 * ★ Speaks **once per visit**. A screen whose query resolves after focus would
 *   otherwise restart the narration with the fuller text, talking over itself.
 */

import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';

import { speakSmart, stopSpeaking } from './voice';
import { isAutoNarrateOn } from './voiceSettings';
import type { Locale } from '../types/api';

interface Options {
  /**
   * Hold the narration until the screen has something worth saying — pass
   * `false` while a query is still loading, so he hears the real numbers
   * rather than an empty skeleton.
   */
  ready?: boolean;
}

export function useScreenNarration(
  text: string,
  locale: Locale,
  { ready = true }: Options = {},
): void {
  const spokenForThisVisit = useRef(false);
  // Held in a ref so the focus effect does not re-run — and re-narrate — every
  // time the text changes as queries settle.
  const latest = useRef({ text, locale, ready });
  latest.current = { text, locale, ready };

  useFocusEffect(
    useCallback(() => {
      // Nothing to do at all unless he has switched this on.
      if (!isAutoNarrateOn()) return;

      spokenForThisVisit.current = false;
      let cancelled = false;

      const tick = setInterval(() => {
        if (cancelled || spokenForThisVisit.current) return;
        const { text: t, locale: l, ready: r } = latest.current;
        if (!r || t.trim().length === 0) return;
        spokenForThisVisit.current = true;
        void speakSmart(t, l).catch(() => {
          // A screen that cannot speak is not a screen that should show an
          // error. The Listen button is still there to try again.
        });
      }, 250);

      return () => {
        cancelled = true;
        clearInterval(tick);
        // Leaving stops this screen's voice, so it cannot talk over the next.
        void stopSpeaking();
      };
    }, []),
  );

  useEffect(() => () => void stopSpeaking(), []);
}
