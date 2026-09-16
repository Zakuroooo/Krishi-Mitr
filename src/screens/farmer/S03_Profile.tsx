/**
 * S03_Profile — the details screen, rebuilt to the new Stitch design
 * (`stitch_mandi_setu_farmer_app_ux (1)`).
 *
 * ★ One voice input, at the top, that fills the whole form. The previous
 *   build ran a slot-by-slot conversation (ask name, wait, ask district,
 *   wait) and *also* put a separate mic inside the name field — two voice
 *   affordances for the same job. Now a farmer says "Rambhau Patil, Nashik
 *   district, Niphad village" once and all three fields fill;
 *   `lib/parseFarmerDetails` does the parsing and declines to guess anything
 *   it cannot identify, so a mis-heard district is left blank rather than
 *   silently putting a lot in the wrong mandi.
 *
 * ★ The registered mobile number is not on this screen. It was collected two
 *   screens ago and verified by OTP; asking again — or displaying it behind
 *   an "OTP Verified" badge — is a field the farmer has already filled.
 *
 * ★ Three things in the new mockup are deliberately not reproduced:
 *   - "As per Aadhaar" under the name field. **I9**: no Aadhaar, ever — not
 *     as a number, not as a hint, not as a label implying we check one. It
 *     is the single hardest rule in this repo and a label is enough to break
 *     it.
 *   - The "APMC KYC" badge in the header. No KYC is performed and no APMC
 *     has certified this app.
 *   - "Direct Mandi Board escrow linked" under the privacy note. Escrow is
 *     real; a Mandi Board link is not.
 *   The privacy line that remains says only what is true: the details are
 *   used to match lots and pay the farmer, and are not sold.
 */

import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { ListenButton } from '../../components/ui/ListenButton';
import { VoiceMic } from '../../components/ui/VoiceMic';
import { ApiError, getDistricts, register } from '../../lib/api';
import { clearPendingAuth, getPendingAuth, useAuth } from '../../lib/auth';
import { useT } from '../../lib/i18n';
import { parseFarmerDetails } from '../../lib/parseFarmerDetails';
import { USE_FIXTURES } from '../../config';
import { fxAuthRegistered, fxDistricts } from '../../fixtures/auth';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import type { District } from '../../types/api';

type Props = NativeStackScreenProps<AuthStackParamList, 'S3_Profile'>;

/** What the voice card is doing right now. */
type VoiceState = 'idle' | 'parsing' | 'filled' | 'failed';

export default function S03_Profile({ navigation }: Props) {
  const { t, locale } = useT();
  const { signIn } = useAuth();

  const [name, setName] = useState('');
  const [village, setVillage] = useState('');
  const [districtId, setDistrictId] = useState<string | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [districtsLoading, setDistrictsLoading] = useState(true);

  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [heard, setHeard] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = getPendingAuth();

  useEffect(() => {
    let cancelled = false;
    (USE_FIXTURES ? Promise.resolve(fxDistricts) : getDistricts())
      .then(list => {
        if (cancelled) return;
        setDistricts(list);
        setDistrictId(prev => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {
        // The picker still renders with whatever is cached; a farmer can
        // type his name while this retries in the background.
      })
      .finally(() => {
        if (!cancelled) setDistrictsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** One utterance -> all three fields. */
  const onTranscript = (text: string) => {
    setHeard(text);
    setVoiceState('parsing');
    const parsed = parseFarmerDetails(text, districts);
    let filledAnything = false;
    if (parsed.name) {
      setName(parsed.name);
      filledAnything = true;
    }
    if (parsed.districtId) {
      setDistrictId(parsed.districtId);
      filledAnything = true;
    }
    if (parsed.village) {
      setVillage(parsed.village);
      filledAnything = true;
    }
    setVoiceState(filledAnything ? 'filled' : 'failed');
  };

  const clearAll = () => {
    setName('');
    setVillage('');
    setDistrictId(districts[0]?.id ?? null);
    setHeard(null);
    setVoiceState('idle');
    setError(null);
  };

  const canSubmit = name.trim().length > 0 && districtId !== null && !submitting;

  const onSubmit = async () => {
    if (!canSubmit || !pending) return;
    setSubmitting(true);
    setError(null);
    try {
      const trimmedVillage = village.trim();
      // ★ The fixture path used to return `fxAuthRegistered` verbatim, which
      //   threw away everything the farmer had just typed — he entered his own
      //   name, district and village, and every screen afterwards greeted the
      //   fixture's name instead. Carry his details onto the fixture response
      //   so the demo shows the person actually using it.
      const res = USE_FIXTURES
        ? {
            ...fxAuthRegistered,
            user: {
              ...fxAuthRegistered.user,
              name: name.trim() || fxAuthRegistered.user.name,
              phone: pending.phone,
              role: pending.role,
              locale,
              district_id: districtId!,
            },
          }
        : await register({
            phone: pending.phone,
            code: pending.code,
            name: name.trim(),
            role: pending.role,
            locale,
            district_id: districtId!,
            // Omit the key entirely when empty rather than sending an
            // explicit undefined — `village` is nullable on the server.
            ...(trimmedVillage ? { village: trimmedVillage } : {}),
          });
      clearPendingAuth();
      await signIn(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t('network_error_generic'));
      setSubmitting(false);
    }
  };

  const selected = districts.find(d => d.id === districtId) ?? null;
  const districtLabel = selected ? (locale === 'mr' ? selected.name_mr : selected.name) : '';

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      {/* ── Header ─────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.step}>{t('fd_step', { n: '3', total: '3' })}</Text>
          <Text style={styles.title}>{t('fd_title')}</Text>
        </View>
      </View>
      <View style={styles.progressTrack}>
        <View style={styles.progressFill} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {/* ── Audio guide ─────────────────────────────────────────── */}
        <View style={styles.audioCard}>
          <View style={styles.audioIcon}>
            <Icon name="volume" size={18} color={colors.onPrimary} />
          </View>
          <View style={styles.audioText}>
            <Text style={styles.audioTitle}>{t('fd_audio_title')}</Text>
            <Text style={styles.audioSub}>{t('fd_audio_sub')}</Text>
          </View>
          <ListenButton text={`${t('fd_title')}. ${t('fd_hint')} ${t('fd_speak_sub')}`} />
        </View>

        <View style={styles.hintRow}>
          <Icon name="info" size={14} color={colors.primary} />
          <Text style={styles.hintText}>{t('fd_hint')}</Text>
        </View>

        {/* ── Speak to fill ───────────────────────────────────────── */}
        <View style={styles.speakCard}>
          <View style={styles.speakHead}>
            <View style={styles.fastestChip}>
              <Text style={styles.fastestChipText}>{t('fd_fastest')}</Text>
            </View>
          </View>
          <Text style={styles.speakTitle}>{t('fd_speak_title')}</Text>
          <Text style={styles.speakSub}>{t('fd_speak_sub')}</Text>

          <View style={styles.exampleBox}>
            <Icon name="volume" size={15} color={colors.onSurfaceVariant} />
            <Text style={styles.exampleText}>{t('fd_speak_example')}</Text>
          </View>

          <VoiceMic locale={locale} onTranscript={onTranscript} />

          {voiceState === 'filled' && heard ? (
            <View style={styles.detectedBox}>
              <Icon name="check-circle" size={15} color={colors.tertiary} />
              <View style={styles.detectedText}>
                <Text style={styles.detectedLabel}>{t('fd_detected')}</Text>
                <Text style={styles.detectedValue}>{heard}</Text>
              </View>
            </View>
          ) : null}

          {voiceState === 'failed' ? (
            <View style={styles.failedBox}>
              <Icon name="info" size={15} color={colors.warning} />
              <Text style={styles.failedText}>{t('fd_not_understood')}</Text>
            </View>
          ) : null}
        </View>

        {/* ── Name ────────────────────────────────────────────────── */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>
            {t('fd_name_label')} <Text style={styles.required}>*</Text>
          </Text>
          {/* No mic here: the one at the top fills this field. Two mics for
              one job is what the previous build had. */}
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder={t('fd_name_placeholder')}
            placeholderTextColor={colors.outline}
            autoCorrect={false}
          />
        </View>

        {/* ── District ────────────────────────────────────────────── */}
        <View style={styles.fieldCard}>
          <Text style={styles.fieldLabel}>
            {t('fd_district_label')} <Text style={styles.required}>*</Text>
          </Text>
          {districtsLoading ? (
            <ActivityIndicator color={colors.primary} style={styles.districtLoading} />
          ) : (
            <>
              <View style={styles.selectedDistrict}>
                <Text style={styles.selectedDistrictText}>{districtLabel}</Text>
              </View>
              <Text style={styles.nearbyLabel}>{t('fd_district_nearby')}</Text>
              <View style={styles.chipRow}>
                {districts.map(d => {
                  const active = d.id === districtId;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, active && styles.chipActive]}
                      onPress={() => setDistrictId(d.id)}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: active }}>
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {locale === 'mr' ? d.name_mr : d.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {/* ── Village ─────────────────────────────────────────────── */}
        <View style={styles.fieldCard}>
          <View style={styles.fieldLabelRow}>
            <Text style={styles.fieldLabel}>{t('fd_village_label')}</Text>
            <Text style={styles.optional}>{t('fd_village_optional')}</Text>
          </View>
          <TextInput
            style={styles.input}
            value={village}
            onChangeText={setVillage}
            placeholder={t('fd_village_placeholder')}
            placeholderTextColor={colors.outline}
            autoCorrect={false}
          />
        </View>

        {/* ── Privacy, stated honestly ────────────────────────────── */}
        <View style={styles.privacyCard}>
          <View style={styles.privacyIcon}>
            <Icon name="lock" size={16} color={colors.tertiary} />
          </View>
          <View style={styles.privacyText}>
            <Text style={styles.privacyTitle}>{t('fd_privacy_title')}</Text>
            <Text style={styles.privacyBody}>{t('fd_privacy_body')}</Text>
          </View>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {!canSubmit && !submitting ? (
          <Text style={styles.requiredNote}>{t('fd_required')}</Text>
        ) : null}
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={[styles.cta, !canSubmit && styles.ctaDisabled]}
          onPress={onSubmit}
          disabled={!canSubmit}
          accessibilityRole="button">
          {submitting ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <>
              <Text style={styles.ctaText}>{t('fd_submit')}</Text>
              <Icon name="arrow-right" size={18} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.clearBtn} onPress={clearAll} accessibilityRole="button">
          <Icon name="refresh" size={14} color={colors.onSurfaceVariant} />
          <Text style={styles.clearText}>{t('fd_clear')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingTop: space.xl + 8,
    paddingBottom: space.xs,
    backgroundColor: colors.surface,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  step: { ...typography.labelSm, color: colors.primary, textTransform: 'uppercase' },
  title: { ...typography.headlineSm, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  progressTrack: { height: 4, backgroundColor: colors.outlineVariant },
  progressFill: { height: 4, width: '100%', backgroundColor: colors.primary },

  scroll: { padding: space.md, paddingBottom: 190, gap: space.sm },

  audioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    padding: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  audioIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioText: { flex: 1 },
  audioTitle: { ...typography.titleMd, color: colors.onSurface },
  audioSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  hintRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 6, paddingHorizontal: 2 },
  hintText: { ...typography.bodySm, color: colors.primary, flex: 1, lineHeight: 18 },

  speakCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    borderColor: colors.primaryContainer,
    backgroundColor: colors.surface,
    padding: space.md,
    gap: 6,
  },
  speakHead: { flexDirection: 'row', alignItems: 'center' },
  fastestChip: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.onPrimaryContainer,
  },
  fastestChipText: { ...typography.labelSm, color: colors.primary },
  speakTitle: { ...typography.titleLg, color: colors.onSurface },
  speakSub: { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 18 },
  exampleBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    marginTop: 2,
  },
  exampleText: { ...typography.bodySm, color: colors.onSurfaceVariant, flex: 1, fontStyle: 'italic' },

  detectedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.positiveContainer,
    marginTop: 4,
  },
  detectedText: { flex: 1 },
  detectedLabel: { ...typography.labelSm, color: colors.onPositiveContainer, textTransform: 'uppercase' },
  detectedValue: { ...typography.bodyMd, color: colors.onPositiveContainer, marginTop: 2 },
  failedBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningContainer,
    marginTop: 4,
  },
  failedText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },

  fieldCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    backgroundColor: colors.surface,
    padding: space.md,
  },
  fieldLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fieldLabel: { ...typography.titleMd, color: colors.onSurface },
  required: { color: colors.critical },
  optional: { ...typography.labelSm, color: colors.outline, fontFamily: fontFamily.medium },
  input: {
    marginTop: space.xs,
    minHeight: touch.targetMin,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderField,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: space.sm,
    ...typography.bodyLg,
    color: colors.onSurface,
  },

  districtLoading: { marginTop: space.sm, alignSelf: 'flex-start' },
  selectedDistrict: {
    marginTop: space.xs,
    minHeight: touch.targetMin,
    justifyContent: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderField,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: space.sm,
  },
  selectedDistrictText: { ...typography.bodyLg, color: colors.onSurface },
  nearbyLabel: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.medium,
    marginTop: space.xs,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  chip: {
    paddingHorizontal: space.sm,
    paddingVertical: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...typography.labelMd, color: colors.onSurfaceVariant },
  chipTextActive: { color: colors.onPrimary },

  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.positiveContainer,
  },
  privacyIcon: {
    width: 34,
    height: 34,
    borderRadius: radius.md,
    backgroundColor: 'rgba(4,120,87,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyText: { flex: 1 },
  privacyTitle: { ...typography.titleMd, color: colors.onPositiveContainer },
  privacyBody: {
    ...typography.bodySm,
    color: colors.onPositiveContainer,
    marginTop: 2,
    lineHeight: 18,
  },

  errorText: { ...typography.bodySm, color: colors.critical, textAlign: 'center' },
  requiredNote: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },

  dock: {
    padding: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: space.xs,
  },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  ctaDisabled: { backgroundColor: colors.surfaceContainerHighest },
  ctaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: space.xs,
  },
  clearText: { ...typography.titleMd, color: colors.onSurfaceVariant },
});
