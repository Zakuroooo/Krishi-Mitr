import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatNumber } from '../../lib/money';
import type { Locale } from '../../types/api';

interface LedgerBlock {
  index: number;
  statusKey: string;
  timestamp: string;
  prevHash: string;
  currHash: string;
}

const LEDGER: LedgerBlock[] = [
  {
    index: 1,
    statusKey: 'ledger_status_created',
    timestamp: '२०२६-०९-०५ १०:३०:००',
    prevHash: '0000000000000000000000000000000000000000000000000000000000000000',
    currHash: 'a8f5f167f44f4964e6c998dee827110c5a3d76e4c706d9e0d16d123d9b4b0e51',
  },
  {
    index: 2,
    statusKey: 'ledger_status_escrow_held',
    timestamp: '२०२६-०९-०५ ११:००:००',
    prevHash: 'a8f5f167f44f4964e6c998dee827110c5a3d76e4c706d9e0d16d123d9b4b0e51',
    currHash: 'c7d9e11a2f64a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
  },
  {
    index: 3,
    statusKey: 'ledger_status_dispatched',
    timestamp: '२०२६-०९-०६ ०८:००:००',
    prevHash: 'c7d9e11a2f64a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0',
    currHash: 'e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c7d9e11a2f64a5b6c7d8e9f0a1b2c3d4',
  },
];

export function S23_BuyerReliability() {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{translate('reliability_header', locale)}</Text>

      <Card style={styles.scoreCard}>
        <View style={styles.row}>
          <Text style={styles.scoreTitle}>{translate('credit_score_title', locale)}</Text>
          <Badge label={translate('chain_valid_badge', locale, { pct: formatNumber(98, locale) })} type="SUCCESS" />
        </View>
        <Text style={styles.scoreNum}>
          {translate('credit_score_out_of', locale, { score: formatNumber(98, locale), max: formatNumber(100, locale) })}
        </Text>
        <Text style={styles.scoreSub}>
          {translate('escrow_ontime_line', locale, {
            pct: formatNumber(100, locale),
            success: formatNumber(24, locale),
            total: formatNumber(24, locale),
          })}
        </Text>
      </Card>

      <Text style={styles.sectionTitle}>{translate('hash_chain_title', locale)}</Text>

      {LEDGER.map(b => (
        <Card key={b.index} style={styles.blockCard}>
          <View style={styles.blockHeader}>
            <Text style={styles.blockIndex}>
              {translate('block_label', locale, { index: formatNumber(b.index, locale) })}
            </Text>
            <Text style={styles.blockTime}>{b.timestamp}</Text>
          </View>
          <Text style={styles.blockAction}>{translate(b.statusKey, locale)}</Text>
          <Text style={styles.hashLabel}>{translate('prev_hash_label', locale)}</Text>
          <Text style={styles.hashText} numberOfLines={1} ellipsizeMode="middle">{b.prevHash}</Text>
          <Text style={styles.hashLabel}>{translate('curr_hash_label', locale)}</Text>
          <Text style={styles.hashText} numberOfLines={1} ellipsizeMode="middle">{b.currHash}</Text>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20 },
  header: { fontSize: 20, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  scoreCard: { padding: 20, backgroundColor: '#1B5E20' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  scoreTitle: { fontSize: 14, color: '#A5D6A7', fontWeight: '600' },
  scoreNum: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginVertical: 6 },
  scoreSub: { fontSize: 13, color: '#C8E6C9' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#475569', marginVertical: 14 },
  blockCard: { padding: 16, marginBottom: 12 },
  blockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  blockIndex: { fontSize: 14, fontWeight: '700', color: '#1565C0' },
  blockTime: { fontSize: 12, color: '#64748B' },
  blockAction: { fontSize: 15, fontWeight: '700', color: '#1E293B', marginBottom: 8 },
  hashLabel: { fontSize: 11, fontWeight: '700', color: '#94A3B8', marginTop: 4 },
  hashText: { fontSize: 11, fontFamily: 'monospace', color: '#475569', backgroundColor: '#F1F5F9', padding: 4, borderRadius: 4 },
});
