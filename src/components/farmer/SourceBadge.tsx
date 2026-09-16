/**
 * I8 — every price shown carries its source, and anything that is not AGMARKNET
 * or MSAMB is badged as such. This is not decoration: showing an unlabelled
 * synthetic number to a government panel is "the one unrecoverable mistake
 * available to this team" (`CLAUDE.md` §9).
 *
 * Labels for `ARCHIVE` ("संग्रहित माहिती") and `SYNTHETIC` ("कृत्रिम माहिती") are
 * from `07_FRONTEND_ARCHITECTURE.md` §5. `IMPUTED` has no label specified
 * anywhere in the docs — "अंदाजित माहिती" (estimated data) is my own choice,
 * styled the same as SYNTHETIC since both mean "not a direct observation."
 * Change it if Shreya's copy pass disagrees.
 *
 * A trusted source still renders a badge (PRANAY.md §1.6's own S9 mockup shows
 * `[AGMARKNET]` plainly, not hidden) — the difference is styling, not presence.
 */

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { translate } from '../../lib/i18n';
import type { DataSource, Locale } from '../../types/api';

// Exported — `components/charts/PriceHistory.tsx` shares this exact mapping for
// its per-segment coloring and legend, so the two never quietly disagree about
// which sources count as trusted or what color/label represents which one.
export const TRUSTED: ReadonlySet<DataSource> = new Set(['AGMARKNET', 'MSAMB']);

/** Dictionary keys, not text — `translate()` resolves the actual label in the
 * caller's locale. Exported so `PriceHistory`'s legend uses the same keys. */
export const UNTRUSTED_LABEL_KEY: Record<Exclude<DataSource, 'AGMARKNET' | 'MSAMB'>, string> = {
  ARCHIVE: 'source_archive',
  SYNTHETIC: 'source_synthetic',
  IMPUTED: 'source_imputed',
};

export const SOURCE_COLOR: Record<DataSource, string> = {
  AGMARKNET: '#1B5E20',
  MSAMB: '#1B5E20',
  ARCHIVE: '#E65100',
  SYNTHETIC: '#E65100',
  IMPUTED: '#E65100',
};

export function untrustedSourceLabel(source: Exclude<DataSource, 'AGMARKNET' | 'MSAMB'>, locale: Locale): string {
  return translate(UNTRUSTED_LABEL_KEY[source], locale);
}

export function SourceBadge({ source, locale }: { source: DataSource; locale: Locale }) {
  const isTrusted = TRUSTED.has(source);
  const label = isTrusted
    ? source
    : untrustedSourceLabel(source as Exclude<DataSource, 'AGMARKNET' | 'MSAMB'>, locale);

  return (
    <View style={[styles.badge, isTrusted ? styles.trusted : styles.untrusted]}>
      <Text style={[styles.label, isTrusted ? styles.labelTrusted : styles.labelUntrusted]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  trusted: { backgroundColor: '#E8F5E9' },
  untrusted: { backgroundColor: '#FFF3E0' },
  label: { fontSize: 12, fontWeight: '700' },
  labelTrusted: { color: '#1B5E20' },
  labelUntrusted: { color: '#E65100' },
});
