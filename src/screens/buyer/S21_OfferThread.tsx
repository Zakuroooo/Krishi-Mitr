import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatNumber } from '../../lib/money';
import type { Locale } from '../../types/api';
import { colors } from '../../theme/tokens';

interface OfferRound {
  sender: 'BUYER' | 'FARMER';
  price: number;
  qty: number;
  time: string;
  round: number;
}

const MAX_ROUNDS = 3;

export function S21_OfferThread() {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const [rounds, setRounds] = useState<OfferRound[]>([
    { sender: 'BUYER', price: 1900, qty: 100, time: 'सकाळी १०:१५', round: 1 },
    { sender: 'FARMER', price: 2000, qty: 100, time: 'सकाळी १०:३०', round: 2 },
  ]);
  const [newPrice, setNewPrice] = useState('1960');
  const [submitting, setSubmitting] = useState(false);

  const currentRound = rounds.length + 1;
  const isMaxRounds = currentRound > MAX_ROUNDS;

  const handleSendCounter = () => {
    if (!newPrice) return;
    setSubmitting(true);
    setTimeout(() => {
      setRounds(prev => [
        ...prev,
        {
          sender: 'BUYER',
          price: parseInt(newPrice, 10),
          qty: 100,
          time: translate('time_just_now', locale),
          round: currentRound,
        },
      ]);
      setSubmitting(false);
    }, 500);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.header}>{translate('offer_thread_header', locale)}</Text>

      <Card style={styles.summaryCard}>
        <Text style={styles.summaryTitle}>
          {translate('offer_summary_title', locale, {
            commodity: translate('commodity_onion', locale),
            qty: formatNumber(100, locale),
          })}
        </Text>
        <Text style={styles.summarySub}>
          {translate('offer_summary_sub', locale, { location: 'नाशिक क्लस्टर', grade: 'A' })}
        </Text>
      </Card>

      <Text style={styles.sectionHeader}>
        {translate('offer_history_title', locale, { max: formatNumber(MAX_ROUNDS, locale) })}
      </Text>

      {rounds.map((r, i) => (
        <Card key={i} style={[styles.roundCard, r.sender === 'BUYER' ? styles.buyerCard : styles.farmerCard]}>
          <View style={styles.roundHeader}>
            <Text style={styles.senderLabel}>
              {r.sender === 'BUYER'
                ? translate('sender_buyer_you', locale)
                : translate('sender_farmer_name', locale, { name: 'रामभाऊ पाटील' })}
            </Text>
            <Badge
              label={translate('round_badge', locale, {
                round: formatNumber(r.round, locale),
                max: formatNumber(MAX_ROUNDS, locale),
              })}
              type="INFO"
            />
          </View>
          <Text style={styles.offerPrice}>
            ₹{formatNumber(r.price, locale)} {translate('per_quintal_suffix', locale)}
          </Text>
          <Text style={styles.timeText}>{r.time}</Text>
        </Card>
      ))}

      {!isMaxRounds ? (
        <Card style={styles.inputCard}>
          <Text style={styles.inputLabel}>{translate('counter_offer_label', locale)}</Text>
          <TextInput
            style={styles.input}
            value={newPrice}
            onChangeText={setNewPrice}
            keyboardType="number-pad"
          />
          <Button
            title={translate('counter_offer_send', locale, {
              round: formatNumber(currentRound, locale),
              max: formatNumber(MAX_ROUNDS, locale),
            })}
            onPress={handleSendCounter}
            loading={submitting}
            style={styles.btn}
          />
        </Card>
      ) : (
        <Card style={styles.maxCard}>
          <Text style={styles.maxText}>
            {translate('max_rounds_reached', locale, { max: formatNumber(MAX_ROUNDS, locale) })}
          </Text>
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  header: { fontSize: 20, fontWeight: '700', color: colors.onSurface, marginBottom: 16 },
  summaryCard: { padding: 16, backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderField },
  summaryTitle: { fontSize: 18, fontWeight: '700', color: colors.primary },
  summarySub: { fontSize: 14, color: colors.primary, marginTop: 4 },
  sectionHeader: { fontSize: 15, fontWeight: '700', color: colors.onSurfaceVariant, marginVertical: 12 },
  roundCard: { padding: 16, marginBottom: 12 },
  buyerCard: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.borderField },
  farmerCard: { backgroundColor: colors.positiveContainer, borderColor: colors.positiveContainer },
  roundHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  senderLabel: { fontSize: 14, fontWeight: '700', color: colors.onSurfaceVariant },
  offerPrice: { fontSize: 22, fontWeight: '800', color: colors.onSurface },
  timeText: { fontSize: 12, color: colors.onSurfaceVariant, marginTop: 4 },
  inputCard: { padding: 18, marginTop: 12 },
  inputLabel: { fontSize: 15, fontWeight: '600', color: colors.onSurfaceVariant, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: colors.borderField, borderRadius: 10, padding: 12, fontSize: 18, backgroundColor: colors.surface, marginBottom: 14 },
  btn: { marginTop: 4 },
  maxCard: { padding: 16, backgroundColor: colors.warningContainer, borderColor: colors.warningContainer, marginTop: 12 },
  maxText: { color: colors.warning, fontWeight: '600', fontSize: 14 },
});
