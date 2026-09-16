/**
 * The landing page — web only.
 *
 * On a phone the app opens straight into the splash, because the person
 * holding it installed it on purpose and is a farmer. A URL has no such
 * context: it is opened by farmers, by traders, and this month mostly by
 * judges. So the first screen answers "what is this and which side am I on?"
 * and then hands over to the exact flow the phone runs.
 *
 * ★ Two doors, not a menu. Farmer goes to the splash and the real onboarding
 *   (language → phone → OTP → profile). Buyer signs straight into the buyer
 *   console with the fixture account, because a trader evaluating the product
 *   should not have to invent a phone number to see the console.
 *
 * ★ Its own locale state, deliberately. This screen's copy is the one thing
 *   in the app the dictionaries do not carry (it does not exist on the
 *   phone), and the app's real language choice belongs to S1, one screen
 *   later, where it is saved. Picking a language here only changes the words
 *   below it.
 */

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Logo } from '../../components/ui/Logo';
import { SpeakingFace } from '../../components/ui/SpeakingFace';
import { Icon } from '../../components/ui/Icon';
import { useAuth } from '../../lib/auth';
import { fxAuthRegisteredBuyer } from '../../fixtures/auth';
import { colors, radius, space, touch, type } from '../../theme/tokens';
import type { Locale } from '../../types/api';

const COPY: Record<Locale, {
  tagline: string;
  promise: string;
  farmerTitle: string;
  farmerSub: string;
  buyerTitle: string;
  buyerSub: string;
  pointsTitle: string;
  points: string[];
  note: string;
}> = {
  mr: {
    tagline: 'आज विकू की थांबू?',
    promise: 'खरा बाजारभाव, स्पष्ट सल्ला — आणि फायदा किती तसाच तोटा किती, दोन्ही एकाच आकारात.',
    farmerTitle: 'मी शेतकरी आहे',
    farmerSub: 'भाव बघा, सल्ला ऐका, लॉट विका',
    buyerTitle: 'मी खरेदीदार आहे',
    buyerSub: 'लॉट बघा, मागणी टाका, सौदा करा',
    pointsTitle: 'हे ॲप काय करते',
    points: [
      'आजचा खरा भाव — वाहतूक व हमाली वजा करून',
      'थांबल्यास किती मिळेल आणि किती गमावू शकता, दोन्ही',
      'खात्री नसेल तेव्हा ॲप स्पष्ट सांगते — सल्ला नाही',
      'प्रत्येक पान मराठीत वाचून दाखवते; वाचता येत नसेल तरी चालते',
    ],
    note: 'हे प्रात्यक्षिक आहे. आकडे नमुना आहेत.',
  },
  hi: {
    tagline: 'आज बेचूं या रुकूं?',
    promise: 'असली मंडी भाव, साफ सलाह — और फायदा कितना, नुकसान कितना, दोनों एक ही आकार में.',
    farmerTitle: 'मैं किसान हूँ',
    farmerSub: 'भाव देखें, सलाह सुनें, लॉट बेचें',
    buyerTitle: 'मैं खरीदार हूँ',
    buyerSub: 'लॉट देखें, मांग डालें, सौदा करें',
    pointsTitle: 'यह ऐप क्या करता है',
    points: [
      'आज का असली भाव — भाड़ा और हमाली घटाकर',
      'रुकने पर कितना मिलेगा और कितना जा सकता है, दोनों',
      'जब भरोसा न हो तो ऐप साफ कहता है — सलाह नहीं',
      'हर पन्ना बोलकर सुनाता है; पढ़ना न आता हो तब भी चलेगा',
    ],
    note: 'यह डेमो है. आंकड़े नमूना हैं.',
  },
  en: {
    tagline: 'Sell today, or wait?',
    promise:
      'Real mandi prices, a plain answer — and the worst case shown at the same size as the gain.',
    farmerTitle: 'I am a farmer',
    farmerSub: 'See prices, hear the advice, sell a lot',
    buyerTitle: 'I am a buyer',
    buyerSub: 'Browse lots, post demand, close a deal',
    pointsTitle: 'What this app does',
    points: [
      "Today's real price, after transport and handling are taken out",
      'What waiting could earn you — and what it could cost you',
      'When the model is not sure, it says so instead of guessing',
      'Every screen reads itself aloud, so reading is never required',
    ],
    note: 'This is a demo. The figures are sample data.',
  },
};

const LANGUAGES: Array<{ id: Locale; label: string }> = [
  { id: 'mr', label: 'मराठी' },
  { id: 'hi', label: 'हिंदी' },
  { id: 'en', label: 'English' },
];

export default function Landing() {
  const navigation = useNavigation<{ navigate: (screen: string) => void }>();
  const { signIn } = useAuth();
  const [locale, setLocale] = useState<Locale>('mr');
  const copy = COPY[locale];

  const enterAsBuyer = () => {
    // The buyer console is behind the same auth gate as the farmer app; the
    // fixture account is how the phone build reaches it too.
    void signIn(fxAuthRegisteredBuyer);
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <View style={styles.langRow}>
        {LANGUAGES.map(language => {
          const active = language.id === locale;
          return (
            <Pressable
              key={language.id}
              onPress={() => setLocale(language.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              style={[styles.langChip, active && styles.langChipActive]}>
              <Text style={[styles.langChipText, active && styles.langChipTextActive]}>
                {language.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.hero}>
        <Logo size={72} />
        <Text style={styles.brand}>Krishi Mitr</Text>
        <Text style={styles.tagline}>{copy.tagline}</Text>
        <Text style={styles.promise}>{copy.promise}</Text>
      </View>

      <View style={styles.doors}>
        <Pressable
          onPress={() => navigation.navigate('S0_Splash')}
          accessibilityRole="button"
          accessibilityLabel={copy.farmerTitle}
          style={({ pressed }) => [styles.door, styles.doorFarmer, pressed && styles.doorPressed]}>
          <View style={styles.doorIcon}>
            <SpeakingFace size={56} />
          </View>
          <Text style={styles.doorTitle}>{copy.farmerTitle}</Text>
          <Text style={styles.doorSub}>{copy.farmerSub}</Text>
          <View style={styles.doorCta}>
            <Text style={styles.doorCtaText}>→</Text>
          </View>
        </Pressable>

        <Pressable
          onPress={enterAsBuyer}
          accessibilityRole="button"
          accessibilityLabel={copy.buyerTitle}
          style={({ pressed }) => [styles.door, styles.doorBuyer, pressed && styles.doorPressed]}>
          <View style={styles.doorIcon}>
            <Icon name="box" size={44} color={colors.tertiary} />
          </View>
          <Text style={styles.doorTitle}>{copy.buyerTitle}</Text>
          <Text style={styles.doorSub}>{copy.buyerSub}</Text>
          <View style={[styles.doorCta, styles.doorCtaBuyer]}>
            <Text style={styles.doorCtaText}>→</Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.points}>
        <Text style={styles.pointsTitle}>{copy.pointsTitle}</Text>
        {copy.points.map(point => (
          <View key={point} style={styles.pointRow}>
            <View style={styles.bullet} />
            <Text style={styles.pointText}>{point}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.note}>{copy.note}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  content: {
    paddingHorizontal: space.lg,
    paddingTop: space.lg,
    paddingBottom: space.xxl,
    maxWidth: 940,
    width: '100%',
    alignSelf: 'center',
  },

  langRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: space.xs },
  langChip: {
    paddingHorizontal: space.sm,
    paddingVertical: space.xxs + 2,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.borderField,
    backgroundColor: colors.surface,
  },
  langChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  langChipText: { ...type.labelMd, color: colors.onSurfaceVariant },
  langChipTextActive: { color: colors.onPrimary },

  hero: { alignItems: 'center', paddingTop: space.lg, paddingBottom: space.xl },
  brand: { ...type.displayLg, color: colors.primary, marginTop: space.sm },
  tagline: { ...type.headlineMd, color: colors.onSurface, marginTop: space.xs, textAlign: 'center' },
  promise: {
    ...type.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: space.sm,
    textAlign: 'center',
    maxWidth: 560,
  },

  doors: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'center' },
  door: {
    flexGrow: 1,
    flexBasis: 280,
    minHeight: 208,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: space.lg,
    alignItems: 'flex-start',
  },
  doorFarmer: { borderColor: colors.borderActive },
  doorBuyer: { borderColor: colors.tertiaryContainer },
  doorPressed: { backgroundColor: colors.surfaceContainerLow },
  doorIcon: { height: 60, justifyContent: 'center' },
  doorTitle: { ...type.headlineSm, color: colors.onSurface, marginTop: space.sm },
  doorSub: { ...type.bodySm, color: colors.onSurfaceVariant, marginTop: space.xxs },
  doorCta: {
    marginTop: space.md,
    minHeight: touch.targetMin,
    minWidth: touch.targetMin,
    paddingHorizontal: space.lg,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doorCtaBuyer: { backgroundColor: colors.tertiary },
  doorCtaText: { ...type.headlineSm, color: colors.onPrimary },

  points: {
    marginTop: space.xl,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    padding: space.lg,
  },
  pointsTitle: { ...type.titleLg, color: colors.onSurface, marginBottom: space.sm },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: space.xs },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
    marginTop: 8,
    marginRight: space.sm,
  },
  pointText: { ...type.bodySm, color: colors.onSurfaceVariant, flex: 1 },

  note: {
    ...type.labelMd,
    color: colors.outline,
    textAlign: 'center',
    marginTop: space.lg,
  },
});
