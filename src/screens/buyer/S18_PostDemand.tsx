import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatNumber } from '../../lib/money';
import type { Locale } from '../../types/api';

export function S18_PostDemand({ onDemandCreated }: { onDemandCreated?: () => void }) {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const [commodity, setCommodity] = useState<'ONION' | 'SOYBEAN'>('ONION');
  const [quantity, setQuantity] = useState('100');
  const [grade, setGrade] = useState<'A' | 'B' | 'C'>('A');
  const [priceCeiling, setPriceCeiling] = useState('2000');
  const [date, setDate] = useState(translate('post_demand_default_date', locale));
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = () => {
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSuccess(true);
      if (onDemandCreated) onDemandCreated();
    }, 600);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{translate('post_demand_title', locale)}</Text>

      {success ? (
        <Card style={styles.successCard}>
          <Text style={styles.successTitle}>{translate('post_demand_success_title', locale)}</Text>
          <Text style={styles.successText}>
            {translate('post_demand_success_text', locale, {
              qty: formatNumber(Number(quantity) || 0, locale),
            })}
          </Text>
          <Button
            title={translate('post_demand_view_matches', locale)}
            onPress={() => setSuccess(false)}
            style={styles.btn}
          />
        </Card>
      ) : (
        <Card style={styles.formCard}>
          <Text style={styles.label}>{translate('post_demand_commodity_label', locale)}</Text>
          <View style={styles.row}>
            <TouchableOpacity
              onPress={() => setCommodity('ONION')}
              style={[styles.chip, commodity === 'ONION' && styles.chipActive]}>
              <Text style={[styles.chipText, commodity === 'ONION' && styles.chipTextActive]}>
                {translate('commodity_onion', locale)}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setCommodity('SOYBEAN')}
              style={[styles.chip, commodity === 'SOYBEAN' && styles.chipActive]}>
              <Text style={[styles.chipText, commodity === 'SOYBEAN' && styles.chipTextActive]}>
                {translate('commodity_soybean', locale)}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>{translate('post_demand_qty_label', locale)}</Text>
          <TextInput
            style={styles.input}
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>{translate('post_demand_grade_label', locale)}</Text>
          <View style={styles.row}>
            {(['A', 'B', 'C'] as const).map(g => (
              <TouchableOpacity
                key={g}
                onPress={() => setGrade(g)}
                style={[styles.gradeChip, grade === g && styles.gradeChipActive]}>
                <Text style={[styles.gradeText, grade === g && styles.gradeTextActive]}>
                  {translate('post_demand_grade_chip', locale, { grade: g })}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>{translate('post_demand_price_ceiling_label', locale)}</Text>
          <TextInput
            style={styles.input}
            value={priceCeiling}
            onChangeText={setPriceCeiling}
            keyboardType="number-pad"
          />

          <Text style={styles.label}>{translate('post_demand_deadline_label', locale)}</Text>
          <TextInput style={styles.input} value={date} onChangeText={setDate} />

          <Button
            title={translate('post_demand_submit', locale)}
            onPress={handleSubmit}
            loading={submitting}
            style={styles.submitBtn}
          />
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAF9' },
  content: { padding: 20 },
  title: { fontSize: 22, fontWeight: '700', color: '#1E293B', marginBottom: 16 },
  formCard: { padding: 20 },
  label: { fontSize: 15, fontWeight: '600', color: '#475569', marginTop: 12, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#FFF',
  },
  row: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  chip: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
  },
  chipActive: { borderColor: '#1B5E20', backgroundColor: '#E8F5E9' },
  chipText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  chipTextActive: { color: '#1B5E20' },
  gradeChip: {
    flex: 1,
    padding: 12,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    alignItems: 'center',
  },
  gradeChipActive: { borderColor: '#1565C0', backgroundColor: '#E3F2FD' },
  gradeText: { fontSize: 14, color: '#64748B', fontWeight: '600' },
  gradeTextActive: { color: '#1565C0' },
  submitBtn: { marginTop: 24 },
  successCard: { padding: 24, backgroundColor: '#E8F5E9', borderColor: '#81C784' },
  successTitle: { fontSize: 20, fontWeight: '700', color: '#1B5E20', marginBottom: 8 },
  successText: { fontSize: 15, color: '#2E7D32', marginBottom: 16 },
  btn: { marginTop: 8 },
});
