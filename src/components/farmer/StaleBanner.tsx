/**
 * StaleBanner — P11. Renders nothing when the data on screen is fresh;
 * renders its age in Marathi, with the actual clock time, when it is not.
 *
 * ★ Age is the only signal, on purpose — no NetInfo, no connectivity check.
 *   `offline.ts`'s cache has no way to know whether the network is actually
 *   down; it only knows how old what is currently rendered is. That is also
 *   the more honest thing to tell a farmer: "this is from 11:40" is true
 *   whether the phone is offline or the server was just slow.
 *
 * ★ Additive only. Every screen that uses this still renders its own
 *   loading/empty/error states first — this only ever appears inside the
 *   "data" branch, next to data that is actually on screen.
 *
 * ★ BUG FIXED: staleness is a function of wall-clock time, but the first draft
 *   read `Date.now()` during render with nothing to schedule a re-render. React
 *   does not re-render because a clock moved, so a screen left open — which is
 *   *exactly* the airplane-mode demo beat — kept showing no banner indefinitely,
 *   until some unrelated state change happened to repaint it. The banner would
 *   have looked correct in every test that mounts with already-old data, and
 *   silently absent on the one path that matters. Hence the ticker below.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { CACHE_STALE_MS } from '../../config';
import { devNum, translate } from '../../lib/i18n';
import type { Locale } from '../../types/api';

export interface StaleBannerProps {
  /** `dataUpdatedAt` straight off a `useQuery` result — 0 means no
   * successful fetch has landed yet, which is not this component's job to
   * describe (that is the screen's loading/empty state). */
  dataUpdatedAt: number;
  locale?: Locale;
}

function formatClockMr(epochMs: number, locale: Locale): string {
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return devNum(`${hh}:${mm}`, locale);
}

/**
 * How often the clock is re-read. Deliberately much finer than
 * `CACHE_STALE_MS` (5 min) — the banner should appear within half a minute of
 * the data going stale, not up to five minutes late. The work per tick is one
 * subtraction and, in the common case, a bail-out before any re-render.
 */
const TICK_MS = 30_000;

export function StaleBanner({ dataUpdatedAt, locale = 'mr' }: StaleBannerProps) {
  // ★ Hooks run unconditionally, before every early return. The stale flag is
  //   state rather than a value computed in render, because it is time that
  //   changes here, not props — nothing else would ever trigger the repaint.
  const [isStale, setIsStale] = useState(
    () => dataUpdatedAt > 0 && Date.now() - dataUpdatedAt >= CACHE_STALE_MS,
  );

  useEffect(() => {
    if (dataUpdatedAt <= 0) {
      setIsStale(false);
      return;
    }

    // A successful refetch moves `dataUpdatedAt` forward, which lands here and
    // clears the banner — this effect is the un-stale path as well as the
    // stale one, so a reconnect mid-demo takes the banner back off screen.
    const check = () => Date.now() - dataUpdatedAt >= CACHE_STALE_MS;

    if (check()) {
      setIsStale(true);
      // Nothing left to watch for: the rendered text is the *timestamp*, not
      // the age, so it never changes once shown. No timer, no idle wakeups.
      return;
    }

    setIsStale(false);
    const id = setInterval(() => {
      if (check()) setIsStale(true);
    }, TICK_MS);
    return () => clearInterval(id);
  }, [dataUpdatedAt]);

  if (dataUpdatedAt <= 0) return null;
  if (!isStale) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        {translate('stale_banner_text', locale, { time: formatClockMr(dataUpdatedAt, locale) })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
    color: '#92400E',
    textAlign: 'center',
  },
});
