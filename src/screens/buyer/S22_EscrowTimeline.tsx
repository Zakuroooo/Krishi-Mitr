/**
 * S22 — escrow timeline (buyer). Renders `components/EscrowTimeline` against
 * a real `TxDto` + its `EscrowEvent[]`, fetched (or fixture'd) the same way
 * every other screen in this app is — USE_FIXTURES-gated, four states.
 *
 * Was previously five hardcoded steps and a hardcoded #TX-9842 — replaced
 * here because PRANAY.md §1.4 names this exact component as the one S15
 * (farmer) also uses: "tapping a row expands the state timeline using the
 * same component Shreya builds for S22. One component, two call sites, no
 * third screen number." A hardcoded S22 could not be that component.
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { useQuery } from '@tanstack/react-query';

import { getEscrowEvents, getTransaction } from '../../lib/api';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { USE_FIXTURES } from '../../config';
import { fxEscrowEvents, fxTx } from '../../fixtures/escrow';
import { EscrowTimeline } from '../../components/EscrowTimeline';
import { EmptyState, ErrorState, Skeleton } from '../../components/farmer/States';
import type { EscrowEvent, Locale, TxDto } from '../../types/api';

/** No lot-detail/offer-thread flow exists yet to arrive here with a real
 * `tx_id` (S20/S21 gap, same shape as `DEFAULT_LOT_ID` elsewhere) — this is
 * the demo transaction every escrow fixture already agrees on. */
const DEFAULT_TX_ID = 'tx_1';

async function fetchTx(): Promise<{ tx: TxDto; events: EscrowEvent[] }> {
  if (USE_FIXTURES) return { tx: fxTx, events: fxEscrowEvents };
  const [tx, events] = await Promise.all([
    getTransaction(DEFAULT_TX_ID),
    getEscrowEvents(DEFAULT_TX_ID),
  ]);
  return { tx, events };
}

export function S22_EscrowTimeline() {
  const [locale, setLocale] = useState<Locale>('mr');
  React.useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['tx', DEFAULT_TX_ID, 'timeline'],
    queryFn: fetchTx,
  });

  if (isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Skeleton height={300} />
      </ScrollView>
    );
  }

  // P11: `error && !data`, not a bare `error` — the rule the farmer screens
  // (S4/S7/S9/S14/S15/S16/S26) already follow, applied here for consistency.
  // The escrow timeline is beat 10, read off a second device on the same venue
  // wifi; a failed refetch must not replace a timeline the cache is holding.
  // ★ Touched under Pranay's hand (app-lane lead, CLAUDE.md §1) as part of one
  //   sweep, so the two navigators do not diverge on this. Shreya owns the file.
  if (error && !data) {
    return (
      <ErrorState message={translate('escrow_fetch_error', locale)} onRetry={() => refetch()} />
    );
  }

  if (!data) {
    return <EmptyState title={translate('escrow_no_timeline', locale)} />;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{translate('escrow_timeline_header', locale)}</Text>
      <EscrowTimeline tx={data.tx} events={data.events} locale={locale} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20 },
  header: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
});
