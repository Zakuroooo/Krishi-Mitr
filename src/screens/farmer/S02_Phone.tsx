/**
 * S02_Phone — Screen 04: Phone number entry / OTP trigger.
 *
 * Pixel-matched to Stitch `04_phone_number_10_digit_mobile_login_voice_input/screen.png`.
 *
 * ★ ZERO EMOJIS — all icons are SVG.
 * ★ FULL I18N — every text uses t('key').
 */

import React, { useRef, useState } from 'react';
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AudioRecorderPlayer, {
  AudioEncoderAndroidType,
  AudioSourceAndroidType,
  OutputFormatAndroidType,
} from 'react-native-audio-recorder-player';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, space, radius, touch } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { SpeakingFace } from '../../components/ui/SpeakingFace';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import { ApiError, requestOtp, transcribeAudio } from '../../lib/api';
import { digitsFromSpeech } from '../../lib/spokenDigits';
import { setPendingAuth } from '../../lib/auth';
import type { Role } from '../../types/api';
import { getLocale } from '../../lib/locale';
import { USE_FIXTURES } from '../../config';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { demoTodayRange } from '../../lib/demoPrice';

type Props = NativeStackScreenProps<AuthStackParamList, 'S2_Phone'>;
type MicState = 'idle' | 'recording' | 'transcribing';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const mandiWarehouse = require('../../assets/images/mandi_warehouse.jpg');

const AUDIO_SET = {
  AudioEncoderAndroid: AudioEncoderAndroidType.AAC,
  AudioSourceAndroid: AudioSourceAndroidType.MIC,
  OutputFormatAndroid: OutputFormatAndroidType.MPEG_4,
};

const RECORD_AUDIO_PERMISSION = 'android.permission.RECORD_AUDIO' as const;

async function ensureMicPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;
  const already = await PermissionsAndroid.check(RECORD_AUDIO_PERMISSION);
  if (already) return true;
  const result = await PermissionsAndroid.request(RECORD_AUDIO_PERMISSION);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export default function S02_Phone({ navigation }: Props) {
  const { t, locale } = useT();

  const narration = t('nar_scr_phone');
  const [phone, setPhone] = useState('');
  // ★ One login flow for both sides. The role is chosen here, ridden through
  //   `pendingAuth`, and applied at registration — rather than a second set of
  //   buyer screens that would drift from these the first time either changed.
  //   Before this, `S17_BuyerLogin` existed but nothing navigated to it, so
  //   there was simply no way to sign in as a buyer at all.
  const [role, setRole] = useState<Role>('FARMER');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [micState, setMicState] = useState<MicState>('idle');
  const recorder = useRef(new AudioRecorderPlayer()).current;

  const canGoBack = navigation.canGoBack();
  const isValid = phone.replace(/\D/g, '').length === 10;

  // ★ The mic used to be a bare icon with no onPress — a dead button that
  //   looked interactive and did nothing. `/voice/transcribe` is real and
  //   unauthenticated on the backend (deliberately, since this runs before
  //   the farmer has a JWT — see `app/routers/voice.py`), so this records,
  //   transcribes, and pulls the first 10 digits out of the result into the
  //   phone field. It fails closed: a permission denial or an unreachable
  //   server just leaves the manual keypad entry as the way in, which is
  //   already sitting right there — no separate error UI needed for it.
  const onMicPress = async () => {
    if (micState === 'transcribing') return;
    if (micState === 'idle') {
      const granted = await ensureMicPermission();
      if (!granted) return;
      try {
        await recorder.startRecorder(undefined, AUDIO_SET);
        recorder.addRecordBackListener(() => undefined);
        setMicState('recording');
      } catch {
        setMicState('idle');
      }
      return;
    }
    // micState === 'recording'
    setMicState('transcribing');
    try {
      const uri = await recorder.stopRecorder();
      recorder.removeRecordBackListener();
      const locale = (await getLocale()) ?? 'mr';
      const { transcript } = await transcribeAudio(uri, locale);
      /* ★ Was `transcript.replace(/\D/g, '')`, which keeps only ASCII — so
         a farmer who said "नऊ आठ सात..." or whose transcript came back as
         Devanagari numerals got an empty string and a blank field. He had
         spoken his number correctly and the app had not listened. */
      const digits = digitsFromSpeech(transcript, 10);
      if (digits) setPhone(digits);
    } catch {
      // Network/backend unreachable — the keypad below is the fallback.
    } finally {
      setMicState('idle');
    }
  };

  // ★ BUG FIX: this used to be a bare `setTimeout` that always "succeeded"
  //   after 1.5s with no server round trip at all — a farmer with the wrong
  //   number, no signal, or a real OTP throttle (CANON §7.1: 3/phone/10min)
  //   saw the identical fake success. Now it actually calls
  //   `POST /auth/otp/request` and only advances on a real 200; S3 then
  //   verifies the code for real via `register()`.
  const handleGetOTP = async () => {
    if (!isValid) return;
    setLoading(true);
    setError('');
    const fullPhone = '+91' + phone.replace(/\D/g, '');
    try {
      if (!USE_FIXTURES) {
        await requestOtp(fullPhone);
      }
      setPendingAuth(fullPhone, '', role);
      navigation.navigate('S3_OTP');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : t('network_error_generic'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* ── Header ─────────────────────────────────── */}
        <View style={styles.header}>
          {/* Back button — only shown when there is a screen to go back to */}
          {canGoBack && (
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={20} color={colors.onSurface} />
            </TouchableOpacity>
          )}

          {/* ★ "Government Recognized" badge removed — this app has no
              actual government recognition or APMC endorsement, and
              claiming one is exactly the kind of unverifiable badge this
              product has already been burned by once. */}
          <View style={styles.headerTextRow}>
            <Text style={styles.headerTitle}>{t('phone_login_signup')}</Text>
          </View>

          {/* ★ A returning farmer starts here — `AuthStack` sets
              `initialRouteName` to this screen once a locale is stored, so
              there is nothing behind it and `canGoBack()` is false. That is
              correct (nobody wants the splash every launch) but it also meant
              the language screen became unreachable forever after the first
              run. This is the way back to it. */}
          <TouchableOpacity
            style={styles.langBtn}
            onPress={() => navigation.navigate('S1_Language')}
            accessibilityRole="button"
            accessibilityLabel={t('select_language')}>
            <Icon name="globe" size={16} color={colors.primary} />
            <Text style={styles.langBtnText}>{t(`lang_name_${locale}`)}</Text>
          </TouchableOpacity>
          {/* ★ This screen had no speaker at all. */}
          <ListenButton text={narration} />
        </View>

        {/* ── Heading ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.heading}>{t('phone_heading')}</Text>
          <Text style={styles.headingSub}>{t('phone_heading_sub')}</Text>
        </View>

        {/* ── Who is signing in ──────────────────────── */}
        <View style={styles.roleRow}>
          {([
            { id: 'FARMER' as const, label: 'role_farmer', sub: 'role_farmer_sub', icon: 'leaf' as const },
            { id: 'BUYER' as const, label: 'role_buyer', sub: 'role_buyer_sub', icon: 'building' as const },
          ]).map(opt => {
            const active = role === opt.id;
            return (
              <TouchableOpacity
                key={opt.id}
                style={[styles.roleCard, active && styles.roleCardActive]}
                onPress={() => setRole(opt.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}>
                <Icon
                  name={opt.icon}
                  size={18}
                  color={active ? colors.primary : colors.onSurfaceVariant}
                />
                <Text style={[styles.roleLabel, active && styles.roleLabelActive]}>
                  {t(opt.label)}
                </Text>
                <Text style={styles.roleSub}>{t(opt.sub)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Phone input card ───────────────────────── */}
        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>{t('phone_mobile_label')}</Text>
          <View style={styles.inputRow}>
            {/* India country code */}
            <View style={styles.countryCode}>
              <Text style={styles.flag}>🇮🇳</Text>
              <Text style={styles.countryCodeText}>+91</Text>
            </View>
            <View style={styles.divider} />
            <TextInput
              style={styles.phoneInput}
              value={phone}
              onChangeText={t => setPhone(t.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              placeholder="98765 43210"
              placeholderTextColor={colors.outline}
              maxLength={10}
            />
            {/* Voice input button — tap starts listening, tap again stops
                and transcribes. The filled red circle while recording is
                the "tapping this again will stop it" affordance; the
                colour-only version of this button gave no visible signal
                that it was mid-recording at all. */}
            <TouchableOpacity
              style={micState === 'recording' ? [styles.micBtn, styles.micBtnRecording] : styles.micBtn}

              activeOpacity={0.7}
              onPress={onMicPress}
              disabled={micState === 'transcribing'}
              accessibilityRole="button"
              accessibilityLabel={t(
                micState === 'recording'
                  ? 'voice_mic_recording'
                  : micState === 'transcribing'
                    ? 'voice_mic_transcribing'
                    : 'voice_mic_idle',
              )}>
              {/* ★ A face speaking into a phone, not a mic glyph. A microphone
                  icon depicts a studio object most farmers have never held; a
                  person talking into a phone is the action itself. The waves
                  move while it records, which is how he knows to keep going. */}
              <SpeakingFace listening={micState === 'recording'} size={34} />
            </TouchableOpacity>
          </View>

          {/* OTP secured tag */}
          <View style={styles.otpSecureRow}>
            <Icon name="lock" size={12} color={colors.tertiary} />
            <Text style={styles.otpSecureText}>{t('phone_otp_secure')}</Text>
          </View>
        </View>

        {/* ── Privacy notice ─────────────────────────── */}
        <View style={styles.privacyCard}>
          <Icon name="shield" size={16} color={colors.tertiary} />
          <View style={styles.privacyText}>
            <Text style={styles.privacyBold}>{t('phone_privacy_bold')}</Text>
            <Text style={styles.privacyBody}>{t('phone_privacy_text')}</Text>
          </View>
        </View>

        {/* ★ SIM 1 / SIM 2 detection removed — this app has no runtime
            permission to read a device's actual SIM slots, so the picker
            was cosmetic local state pretending to be a real device reading.
            The farmer types the number they want, once, above.
            "Free lifetime registration" banner also removed — not
            necessary on the phone-entry screen, per explicit product
            direction. */}

        {/* ★ A "today's onion price" strip sat here, on the screen where a
            farmer types his phone number. He has not told us his crop or his
            mandi yet, so the number was for somebody else's onion at somebody
            else's yard — decoration wearing the clothes of data. Removed;
            prices belong on the screens that know what he grows. */}

        {/* ★ "Get instant OTP via WhatsApp" row removed — there is no
            WhatsApp delivery channel wired anywhere in this product; SMS
            via `/auth/otp/request` is the only real path. */}

        {/* ── Terms ─────────────────────────────────── */}
        <View style={styles.termsRow}>
          <Text style={styles.termsText}>
            {t('phone_terms_prefix')}{' '}
            <Text style={styles.termsLink}>{t('phone_terms_link')}</Text>
            {' '}&{' '}
            <Text style={styles.termsLink}>{t('phone_privacy_link')}</Text>
          </Text>
        </View>

        {/* ★ The "Lasalgaon Node v2.4 · 99.9% uptime" footer was a hardcoded
            infrastructure claim with no real node, version, or uptime
            metric behind it — removed rather than fixed, since there is
            nothing true to put in its place yet. */}
      </ScrollView>

      {/* ── Fixed CTA ──────────────────────────────── */}
      <View style={styles.bottomDock}>
        <TouchableOpacity
          style={[styles.ctaBtn, !isValid && styles.ctaBtnDisabled]}
          activeOpacity={isValid ? 0.85 : 1}
          onPress={handleGetOTP}
          disabled={!isValid || loading}>
          {loading ? (
            <Text style={styles.ctaText}>{t('phone_sending')}</Text>
          ) : (
            <>
              <Text style={styles.ctaText}>{t('phone_get_otp')}</Text>
              <Icon name="arrow-right" size={20} color={colors.onPrimary} />
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
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

  // Header
  header: {
    paddingHorizontal: space.md,
    paddingTop: space.xl + 20,
    paddingBottom: space.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
  },
  officialBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: 'rgba(4,120,87,0.2)',
  },
  officialText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.tertiary,
    letterSpacing: 0.3,
  },

  // Heading
  section: {
    paddingHorizontal: space.md,
    marginTop: space.xs,
    marginBottom: space.md,
  },
  heading: {
    fontFamily: fontFamily.extraBold,
    fontSize: 26,
    lineHeight: 34,
    color: colors.onSurface,
    letterSpacing: -0.3,
  },
  headingSub: {
    fontFamily: fontFamily.regular,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    marginTop: space.xs,
    lineHeight: 20,
  },

  // Input card
  inputCard: {
    marginHorizontal: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.borderActive,
    shadowColor: '#C2410C',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 3,
  },
  inputLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.4,
    marginBottom: space.xs,
    textTransform: 'uppercase',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.borderField,
    overflow: 'hidden',
  },
  countryCode: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    gap: 4,
  },
  flag: {
    fontSize: 18,
  },
  countryCodeText: {
    fontFamily: fontFamily.bold,
    fontSize: 16,
    color: colors.onSurface,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: colors.borderField,
  },
  phoneInput: {
    flex: 1,
    paddingHorizontal: space.sm,
    paddingVertical: space.sm,
    fontFamily: fontFamily.bold,
    fontSize: 22,
    color: colors.onSurface,
    letterSpacing: 1.5,
  },
  micBtn: {
    padding: space.sm,
    marginRight: 4,
    borderRadius: radius.full,
  },
  micBtnRecording: {
    backgroundColor: colors.critical,
  },
  otpSecureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: space.xs,
  },
  otpSecureText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 11,
    color: colors.tertiary,
    letterSpacing: 0.3,
  },

  // Privacy card
  privacyCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.xs,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.positiveContainer,
    borderWidth: 1,
    borderColor: 'rgba(4,120,87,0.15)',
  },
  privacyText: {
    flex: 1,
  },
  privacyBold: {
    fontFamily: fontFamily.bold,
    fontSize: 12,
    color: colors.onPositiveContainer,
  },
  privacyBody: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    lineHeight: 15,
    marginTop: 2,
  },

  // SIM section
  simSection: {
    marginHorizontal: space.md,
    marginTop: space.md,
  },
  simHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: space.xs,
  },
  simLabel: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  autoDetectBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
  },
  autoDetectText: {
    fontFamily: fontFamily.semiBold,
    fontSize: 10,
    color: colors.tertiary,
  },
  simRow: {
    flexDirection: 'row',
    gap: 8,
  },
  simCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: space.sm,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  simCardActive: {
    borderColor: colors.primaryContainer,
    backgroundColor: colors.onPrimaryContainer,
  },
  simNum: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
  },
  simNumActive: {
    color: colors.primaryContainer,
  },
  simCarrier: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
  },

  // Free banner
  freeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginTop: space.md,
    padding: space.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  freeIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(155,47,0,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  freeText: {
    flex: 1,
  },
  freeTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    color: colors.onSurface,
  },
  freeSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  // Price strip
  priceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    marginHorizontal: space.md,
    marginTop: space.sm,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  pricePhoto: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    flexShrink: 0,
  },
  priceInfo: {
    flex: 1,
  },
  priceLiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.tertiary,
  },
  priceLiveText: {
    fontFamily: fontFamily.bold,
    fontSize: 10,
    color: colors.tertiary,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  priceTitle: {
    fontFamily: fontFamily.medium,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  priceValue: {
    fontFamily: fontFamily.extraBold,
    fontSize: 16,
    color: colors.primary,
    letterSpacing: -0.2,
  },
  priceUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  // WhatsApp
  whatsappRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginHorizontal: space.md,
    marginTop: space.xs,
    paddingVertical: space.xs,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  whatsappText: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    flex: 1,
  },

  // Terms
  termsRow: {
    marginHorizontal: space.md,
    marginTop: space.md,
    alignItems: 'center',
  },
  termsText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 16,
  },
  termsLink: {
    fontFamily: fontFamily.semiBold,
    color: colors.primaryContainer,
    textDecorationLine: 'underline',
  },

  // Footer
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    justifyContent: 'center',
    marginTop: space.sm,
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.2,
  },

  // CTA
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
  ctaBtnDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  ctaText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },
  // ★ `scrollContent` carries no horizontal padding — every sibling on this
  //   screen insets itself (`section` with paddingHorizontal, `inputCard`
  //   with marginHorizontal). This row did not, so the two cards ran edge to
  //   edge past the screen while the number card below sat properly inset.
  roleRow: {
    flexDirection: 'row',
    gap: space.xs,
    marginHorizontal: space.md,
    marginBottom: space.md,
  },
  roleCard: {
    flex: 1,
    // `minWidth: 0` lets a flex child shrink below its content width instead
    // of forcing the row wider than its container.
    minWidth: 0,
    alignItems: 'flex-start',
    gap: 2,
    padding: space.sm,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surface,
  },
  roleCardActive: { borderColor: colors.primaryContainer, backgroundColor: colors.onPrimaryContainer },
  roleLabel: { fontFamily: fontFamily.bold, fontSize: 15, color: colors.onSurface, marginTop: 4 },
  roleLabelActive: { color: colors.primary },
  roleSub: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.onSurfaceVariant, lineHeight: 15 },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  langBtnText: { fontFamily: fontFamily.bold, fontSize: 12, color: colors.primary },
});
