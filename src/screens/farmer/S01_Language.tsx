/**
 * S01_Language — Screen 02: Language Selection.
 *
 * Pixel-matched to Stitch `02_language_selection_first_open_multilingual_choice/screen.png`.
 *
 * ★ ZERO EMOJIS — all icons are SVG.
 * ★ FULL I18N — every text uses t('key') from the active locale.
 * ★ Selecting a language updates the global i18n context immediately.
 */

import React, { useEffect, useState } from 'react';
import {
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, space, radius, touch } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { translate, useT } from '../../lib/i18n';
import { speakSmart, stopSpeaking } from '../../lib/voice';
import type { Locale } from '../../types/api';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { demoTodayRange } from '../../lib/demoPrice';

type Props = NativeStackScreenProps<AuthStackParamList, 'S1_Language'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface LanguageOption {
  code: Locale;
  nativeName: string;
  englishName: string;
  subKey: string;
  standardKey: string;
  /** The price sentence, with `{range}` filled in at render from the one
   * shared demo price — so the three sample sentences cannot quote a
   * different figure from each other, or from the app after login. */
  exampleText: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'mr',
    nativeName: 'मराठी',
    englishName: 'Marathi',
    subKey: 'lang_marathi_sub',
    standardKey: 'lang_marathi_standard',
    exampleText: 'आजचा कांदा भाव: {range}/क्विंटल',
  },
  {
    code: 'hi',
    nativeName: 'हिन्दी',
    englishName: 'Hindi',
    subKey: 'lang_hindi_sub',
    standardKey: 'lang_hindi_standard',
    exampleText: 'आज का प्याज भाव: {range}/क्विंटल',
  },
  {
    code: 'en',
    nativeName: 'English',
    englishName: 'English',
    subKey: 'lang_english_sub',
    standardKey: 'lang_english_standard',
    exampleText: "Today's onion price: {range}/quintal",
  },
];

export default function S01_Language({ navigation }: Props) {
  const { t, locale, setLocale } = useT();
  const [selected, setSelected] = useState<Locale>(locale);

  /** Which card is speaking, so its row can offer to stop. */
  const [sampleLocale, setSampleLocale] = useState<Locale | null>(null);

  /**
   * Speaks a card's own example sentence in that card's language.
   *
   * ★ Deliberately `speakSmart`, so a farmer hears Sarvam's voice in the
   *   language he is about to choose rather than the device's stock engine
   *   reading Marathi with an English one — which is the very thing this
   *   screen exists to let him avoid.
   */
  const playSample = async (option: LanguageOption) => {
    if (sampleLocale === option.code) {
      setSampleLocale(null);
      await stopSpeaking();
      return;
    }
    const sentence = `${translate('lang_example_prefix', option.code)} ${option.exampleText.replace(
      '{range}',
      demoTodayRange(option.code),
    )}`;
    setSampleLocale(option.code);
    try {
      await speakSmart(sentence, option.code);
    } catch {
      // Silence is the failure mode here, and the written example is still
      // on screen — an error banner over a voice preview would be louder
      // than the thing it failed to do.
    } finally {
      setSampleLocale(cur => (cur === option.code ? null : cur));
    }
  };

  useEffect(() => {
    return () => {
      void stopSpeaking();
    };
  }, []);

  const handleSelect = (code: Locale) => {
    setSelected(code);
    setLocale(code); // Immediately changes all text in the app
  };

  const handleContinue = () => {
    navigation.navigate('S1b_ValueCarousel');
  };

  const selectedOption = LANGUAGE_OPTIONS.find(o => o.code === selected);
  const continueBtnLabel = t('lang_continue', {
    lang: selectedOption?.nativeName ?? '',
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Ambient glows */}
      <View style={styles.glowTR} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          {/* Back to the splash. The onboarding chain used to be one-way:
              every screen pushed forward and none offered a way back, so a
              farmer who wanted to re-read the intro simply could not. */}
          {navigation.canGoBack() ? (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel={t('back_button')}>
              <Icon name="arrow-left" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          ) : null}
          <View style={styles.stepRow}>
            <View style={styles.stepDot} />
            <View style={[styles.stepDot, styles.stepDotInactive]} />
            <View style={[styles.stepDot, styles.stepDotInactive]} />
            <Text style={styles.stepLabel}>{t('lang_step', { current: '1', total: '3' })}</Text>
          </View>

          <View style={styles.headerIconRow}>
            <View style={styles.headerIconBg}>
              <Icon name="globe" size={28} color={colors.primary} />
            </View>
          </View>

          <Text style={styles.heading}>{t('lang_heading')}</Text>
          <Text style={styles.headingSub}>{t('lang_heading_sub')}</Text>
        </View>

        {/* ── Trust badges row ────────────────────────── */}
        <View style={styles.trustRow}>
          <View style={styles.trustBadge}>
            <Icon name="building" size={12} color={colors.primary} />
            <Text style={styles.trustBadgeText}>{t('lang_apmc_holder')}</Text>
          </View>
          <View style={styles.trustBadge}>
            <Icon name="shield-check" size={12} color={colors.tertiary} />
            <Text style={styles.trustBadgeText}>{t('lang_escrow_safe')}</Text>
          </View>
        </View>

        {/* ── Language cards ───────────────────────────── */}
        <View style={styles.langList}>
          {LANGUAGE_OPTIONS.map((option) => {
            const isSelected = selected === option.code;
            return (
              <TouchableOpacity
                key={option.code}
                style={[styles.langCard, isSelected && styles.langCardActive]}
                onPress={() => handleSelect(option.code)}
                activeOpacity={0.8}>

                {/* Left: language flag + name */}
                <View style={styles.langCardLeft}>
                  <View style={[styles.langIconBg, isSelected && styles.langIconBgActive]}>
                    <Icon
                      name="globe"
                      size={20}
                      color={isSelected ? colors.onPrimary : colors.primary}
                    />
                  </View>
                  <View style={styles.langCardTextBlock}>
                    <Text style={[styles.langNativeName, isSelected && styles.langNativeNameActive]}>
                      {option.nativeName}
                    </Text>
                    <Text style={[styles.langSubName, isSelected && styles.langSubNameActive]}>
                      {t(option.subKey)}
                    </Text>
                  </View>
                </View>

                {/* Right: selected indicator */}
                <View style={styles.langCardRight}>
                  {isSelected ? (
                    <View style={styles.selectedBadge}>
                      <Icon name="check" size={12} color={colors.onTertiary} />
                      <Text style={styles.selectedBadgeText}>{t('lang_selected')}</Text>
                    </View>
                  ) : (
                    <View style={styles.selectCircle} />
                  )}
                </View>

                {/* ── Hear the language before choosing it ─────────────
                    ★ This row was a volume icon and the words "Listen Sample
                      (0:04)" with no handler on it at all — nothing played,
                      and the "0:04" was a duration nothing had measured. It
                      is the first control a farmer meets, and it did nothing.

                    ★ It speaks the same example sentence rendered beneath it,
                      in that card's own language, so what he hears and what
                      he reads are the same string. That is also the honest
                      way to choose a language you cannot read. */}
                <View style={styles.langCardBottom}>
                  <TouchableOpacity
                    style={styles.audioRow}
                    onPress={() => playSample(option)}
                    accessibilityRole="button"
                    accessibilityLabel={t('lang_audio_preview')}>
                    <Icon
                      name={sampleLocale === option.code ? 'x-circle' : 'volume'}
                      size={13}
                      color={colors.primary}
                    />
                    <Text style={styles.audioText}>
                      {sampleLocale === option.code
                        ? t('listening_button')
                        : t('lang_audio_preview')}
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.exampleText}>
                    {t('lang_example_prefix')}{' '}
                    {option.exampleText.replace('{range}', demoTodayRange(option.code))}
                  </Text>
                  <Text style={styles.standardText}>{t(option.standardKey)}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── What the voice actually does ──────────────
            ★ This read "Always keep voice assistance on" beside a mic icon,
              which is the shape of a setting — so it looked like a switch
              that had stopped working. There is no switch: the app speaks
              because every screen carries a Listen button. The card now says
              that, rather than implying a toggle it does not have. */}
        <View style={styles.voiceCard}>
          <View style={styles.voiceIconBg}>
            <Icon name="mic" size={20} color={colors.primary} />
          </View>
          <View style={styles.voiceTextBlock}>
            <Text style={styles.voiceTitle}>{t('lang_voice_title')}</Text>
            <Text style={styles.voiceSub}>{t('lang_voice_sub')}</Text>
          </View>
        </View>

        <Text style={styles.changeAnytime}>{t('lang_change_anytime')}</Text>
      </ScrollView>

      {/* ── Fixed bottom CTA ─────────────────────────── */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={handleContinue}>
          <Text style={styles.ctaText}>{continueBtnLabel}</Text>
          <Icon name="arrow-right" size={20} color={colors.onPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  glowTR: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(194,65,12,0.06)',
  },

  // Header
  header: {
    paddingHorizontal: space.md,
    paddingTop: space.xl + 24,
    paddingBottom: space.lg,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: space.md,
    gap: 6,
  },
  stepDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primaryContainer,
  },
  stepDotInactive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  stepLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginLeft: 4,
  },
  headerIconRow: {
    marginBottom: space.md,
  },
  headerIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    lineHeight: 32,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  headingSub: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    lineHeight: 20,
    color: colors.onSurfaceVariant,
    marginTop: space.xs,
  },

  // Trust row
  trustRow: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    gap: 8,
    marginBottom: space.md,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  trustBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  // Language cards
  langList: {
    paddingHorizontal: space.md,
    gap: 12,
  },
  langCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    padding: space.md,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  langCardActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.onPrimaryContainer,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 4,
  },
  langCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginBottom: space.sm,
  },
  langIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  langIconBgActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primary,
  },
  langCardTextBlock: {
    flex: 1,
  },
  langNativeName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 20,
    color: colors.onSurface,
  },
  langNativeNameActive: {
    color: colors.primary,
  },
  langSubName: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },
  langSubNameActive: {
    color: colors.secondary,
  },
  langCardRight: {
    position: 'absolute',
    top: space.md,
    right: space.md,
  },
  selectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.tertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  selectedBadgeText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.onTertiary,
    letterSpacing: 0.3,
  },
  selectCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
  },
  langCardBottom: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(225,191,181,0.4)',
    paddingTop: space.xs,
    gap: 4,
  },
  audioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  audioText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.primary,
    letterSpacing: 0.2,
  },
  exampleText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    lineHeight: 16,
  },
  standardText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.outline,
  },

  // Voice card
  voiceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: space.md,
    marginTop: space.lg,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    gap: space.sm,
  },
  voiceIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(155,47,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  voiceTextBlock: {
    flex: 1,
  },
  voiceTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
    marginBottom: 2,
  },
  voiceSub: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    lineHeight: 16,
    color: colors.onSurfaceVariant,
  },

  changeAnytime: {
    fontFamily: fontFamily.regular,
    fontSize: 12,
    color: colors.outline,
    textAlign: 'center',
    marginTop: space.md,
    marginHorizontal: space.xxl,
  },

  // Bottom dock
  bottomDock: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: space.md,
    paddingBottom: space.xl,
    paddingTop: space.sm,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 8,
  },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: touch.targetHero,
    backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg,
    gap: space.sm,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
  },
});
