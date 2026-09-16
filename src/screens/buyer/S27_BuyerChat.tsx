import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { getLocale } from '../../lib/locale';
import { translate } from '../../lib/i18n';
import { formatNumber } from '../../lib/money';
import type { Locale } from '../../types/api';
import { colors } from '../../theme/tokens';

interface Message {
  id: string;
  sender: 'BUYER' | 'FARMER';
  text: string;
  time: string;
}

export function S27_BuyerChat() {
  const [locale, setLocale] = useState<Locale>('mr');
  useEffect(() => {
    getLocale().then(l => l && setLocale(l));
  }, []);

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', sender: 'FARMER', text: 'नमस्कार व्यापारी साहेब, कांदा प्रत A दर्जाचा आहे.', time: '१०:३०' },
    { id: '2', sender: 'BUYER', text: 'होय, मी फोटो आणि ग्रेड पाहिली. १९६० दर मंजूर आहे का?', time: '१०:३२' },
  ]);
  const [input, setInput] = useState('');

  const handleSend = () => {
    if (!input.trim()) return;
    setMessages(prev => [
      ...prev,
      { id: String(Date.now()), sender: 'BUYER', text: input.trim(), time: translate('time_just_now', locale) },
    ]);
    setInput('');
  };

  return (
    <View style={styles.container}>
      <Card style={styles.headerCard}>
        <Text style={styles.chatTitle}>
          {translate('buyer_chat_farmer_header', locale, { name: 'रामभाऊ पाटील', district: 'नाशिक' })}
        </Text>
        <Text style={styles.chatSub}>
          {translate('buyer_chat_lot_sub', locale, {
            id: 'LOT-401',
            commodity: translate('commodity_onion', locale),
            qty: formatNumber(100, locale),
          })}
        </Text>
      </Card>

      <ScrollView style={styles.msgList} contentContainerStyle={styles.msgContent}>
        {messages.map(m => (
          <View
            key={m.id}
            style={[styles.bubble, m.sender === 'BUYER' ? styles.buyerBubble : styles.farmerBubble]}>
            <Text style={[styles.msgText, m.sender === 'BUYER' ? styles.buyerMsgText : styles.farmerMsgText]}>
              {m.text}
            </Text>
            <Text style={styles.timeText}>{m.time}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.inputBar}>
        <TextInput
          style={styles.textInput}
          value={input}
          onChangeText={setInput}
          placeholder={translate('message_placeholder', locale)}
        />
        <Button
          title={translate('send_message_button', locale)}
          onPress={handleSend}
          variant="primary"
          style={styles.sendBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerCard: { margin: 16, padding: 14, borderRadius: 12 },
  chatTitle: { fontSize: 16, fontWeight: '700', color: colors.onSurface },
  chatSub: { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  msgList: { flex: 1, paddingHorizontal: 16 },
  msgContent: { paddingBottom: 16 },
  bubble: { maxWidth: '80%', padding: 12, borderRadius: 12, marginBottom: 10 },
  buyerBubble: { alignSelf: 'flex-end', backgroundColor: colors.primary },
  farmerBubble: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.borderCard },
  msgText: { fontSize: 15, lineHeight: 22 },
  buyerMsgText: { color: colors.surface },
  farmerMsgText: { color: colors.onSurface },
  timeText: { fontSize: 11, color: colors.outline, marginTop: 4, alignSelf: 'flex-end' },
  inputBar: { flexDirection: 'row', padding: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.borderCard, gap: 8 },
  textInput: { flex: 1, borderWidth: 1, borderColor: colors.borderField, borderRadius: 10, paddingHorizontal: 12, fontSize: 16 },
  sendBtn: { minHeight: 48, paddingHorizontal: 16 },
});
