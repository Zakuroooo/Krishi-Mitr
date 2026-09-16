/**
 * The placeholder every unbuilt route points at, so the navigator is complete from
 * P0 and each screen replaces one line instead of appearing out of nowhere.
 *
 * It says which screen is coming, in Marathi, because a tab that opens onto a blank
 * white view during a rehearsal is indistinguishable from a crash.
 */

import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { getLocale } from '../lib/locale';
import { translate } from '../lib/i18n';
import type { Locale } from '../types/api';

export function Soon({ label }: { label: string }) {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  return (
    <View style={styles.root}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.sub}>{translate('coming_soon', locale)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  label: { fontSize: 20, marginBottom: 8 },
  sub: { fontSize: 16, color: '#666' },
});
