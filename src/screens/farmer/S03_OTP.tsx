/**
 * S03_OTP — Screen 05: 6-digit OTP verification with countdown timer.
 * Matched to Stitch `05_otp_verification_6_pin_sms_auto_detect/screen.png`
 * ★ ZERO EMOJIS  ★ FULL I18N
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView, Platform, ScrollView, StatusBar,
  StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, space, radius, touch } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { ApiError, requestOtp, verifyOtp } from '../../lib/api';
import { getPendingAuth, setPendingAuth, useAuth } from '../../lib/auth';
import { USE_FIXTURES } from '../../config';
import { fxAuthRegisteredBuyer } from '../../fixtures/auth';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { ListenButton } from '../../components/ui/ListenButton';
import { VoiceMic } from '../../components/ui/VoiceMic';
import { digitsFromSpeech } from '../../lib/spokenDigits';

type Props = NativeStackScreenProps<AuthStackParamList, 'S3_OTP'>;

const RESEND_SECONDS = 30;

export default function S03_OTP({ navigation }: Props) {
  const { t, locale } = useT();
  const { signIn } = useAuth();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(RESEND_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState('');
  const inputs = useRef<(TextInput | null)[]>([]);

  // S2 stores the phone the moment it requests an OTP (`setPendingAuth`,
  // code left blank until this screen collects it) — there is nothing to
  // verify without it, so a farmer who somehow lands here directly goes
  // back rather than crashing on a null phone.
  const phone = getPendingAuth()?.phone ?? null;
  const role = getPendingAuth()?.role ?? 'FARMER';
  useEffect(() => {
    if (!phone) navigation.replace('S2_Phone');
  }, [phone, navigation]);

  // Countdown timer
  useEffect(() => {
    if (countdown <= 0) return;
    const id = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown]);

  /**
   * ★ Voice entry for the code. A farmer who has just dictated his phone
   *   number then had to stop, find the keypad and type six digits — the one
   *   step in registration that still assumed reading. `VoiceMic` records and
   *   sends the clip to the same `POST /voice/transcribe` the phone screen
   *   uses; `digitsFromSpeech` reads the answer whether it comes back as
   *   words, Devanagari numerals or ASCII.
   */
  const onVoiceCode = (transcript: string) => {
    const digits = digitsFromSpeech(transcript, 6);
    if (!digits) return;
    const next = Array.from({ length: 6 }, (_, i) => digits[i] ?? '');
    setOtp(next);
    // Land the cursor after the last digit heard, so a partial reading is
    // finished by hand rather than restarting.
    const at = Math.min(digits.length, 5);
    inputs.current[at]?.focus();
  };

  const handleDigit = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[idx] = digit;
    setOtp(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
    if (!digit && idx > 0) inputs.current[idx - 1]?.focus();
  };

  // ★ BUG FIX: this used to be a bare `setTimeout` — any 6 digits "verified"
  //   after 1.2s with no server round trip. Now it calls the real
  //   `/auth/otp/verify`; success signs the farmer in directly (existing
  //   account), and — per CANON §7.1's "identical error for wrong code and
  //   unknown phone" — any failure is treated as "never registered" and
  //   carries the same {phone, code} to S3_Profile, which verifies it for
  //   real via `register()`.
  /**
   * ★ Both back affordances on this screen used to call `navigation.goBack()`
   *   bare. When the OTP screen is the bottom of the stack — a returning
   *   farmer starts at S2_Phone, which `AuthStack` makes the initial route
   *   once a locale is stored, and a `replace()` on the way in leaves no
   *   history — React Navigation has nothing to pop and throws "The action
   *   GO_BACK was not handled by any navigator" over the screen.
   *
   *   Going back from here means one thing: change the number. So it pops
   *   when it can and navigates to the phone screen when it cannot, which is
   *   the same destination either way and never errors.
   */
  const goBackToPhone = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.navigate('S2_Phone');
  };

  const handleVerify = async () => {
    if (!phone) return;
    const code = otp.join('');
    setVerifying(true);
    setError('');
    try {
      if (USE_FIXTURES) {
        // ★ A buyer needs nothing the farmer profile screen collects — no
        //   district, no village, no land. Phone and OTP are the whole
        //   signup, exactly as asked, so he lands in the buyer console here
        //   instead of being walked through a farmer's form.
        if (role === 'BUYER') {
          await signIn(fxAuthRegisteredBuyer);
          return;
        }
        setPendingAuth(phone, code, role);
        navigation.navigate('S3_Profile');
        return;
      }
      const res = await verifyOtp(phone, code);
      await signIn(res);
    } catch {
      setPendingAuth(phone, code, role);
      navigation.navigate('S3_Profile');
    } finally {
      setVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!phone) return;
    setCountdown(RESEND_SECONDS);
    setError('');
    if (!USE_FIXTURES) {
      try {
        await requestOtp(phone);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : t('network_error_generic'));
      }
    }
  };

  const filled = otp.filter(Boolean).length;
  const isReady = filled === 6;
  const timerStr = `00:${String(countdown).padStart(2, '0')}`;

  return (
    <KeyboardAvoidingView style={styles.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={goBackToPhone}>
            <Icon name="arrow-left" size={20} color={colors.onSurface} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>{t('otp_title')}</Text>
            <Text style={styles.headerStep}>{t('otp_step')}</Text>
          </View>
          <ListenButton text={t('otp_title')} />
        </View>

        {/* Icon */}
        <View style={styles.iconWrap}>
          <View style={styles.iconOuter}>
            <Icon name="message-circle" size={36} color={colors.primaryContainer} />
          </View>
          <View style={styles.lockBadge}>
            <Icon name="lock" size={12} color={colors.onTertiary} />
          </View>
        </View>

        <Text style={styles.heading}>{t('otp_heading')}</Text>
        <Text style={styles.subheading}>{t('otp_subheading')}</Text>

        {/* Phone number row */}
        <View style={styles.phoneRow}>
          {/* ★ This read `{phone} {t('otp_sent_to')}` — the number prepended by
              hand, and `t()` called with no vars. English had no placeholder
              so it looked fine; Marathi and Hindi both contain `{phone}`, so
              a farmer saw the literal text "{phone}" on screen next to his
              own number. The key now carries the placeholder in all three and
              is given the value. */}
          <Text style={styles.phoneNum}>{t('otp_sent_to', { phone: phone ?? '' })}</Text>
          <TouchableOpacity style={styles.editBtn} onPress={goBackToPhone}>
            <Icon name="edit" size={12} color={colors.primaryContainer} />
            <Text style={styles.editText}>{t('otp_edit')}</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {/* OTP boxes */}
        <Text style={styles.boxHint}>{t('otp_box_hint')}</Text>
        <View style={styles.otpRow}>
          {otp.map((digit, i) => (
            <TextInput
              key={i}
              ref={el => { inputs.current[i] = el; }}
              style={[styles.otpBox, digit ? styles.otpBoxFilled : null, i === filled && filled < 6 ? styles.otpBoxActive : null]}
              value={digit}
              onChangeText={v => handleDigit(v, i)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        {/* ── Say the code instead of typing it ────────────────────── */}
        <View style={styles.voiceRow}>
          <VoiceMic locale={locale} onTranscript={onVoiceCode} />
        </View>

        {/* Auto-detect banner */}
        <View style={styles.autoBanner}>
          <View style={styles.autoIconBg}>
            <Icon name="check-circle" size={18} color={colors.tertiary} />
          </View>
          <View style={styles.autoText}>
            <Text style={styles.autoTitle}>{t('otp_auto_title')}</Text>
            <Text style={styles.autoSub}>{t('otp_auto_sub')}</Text>
          </View>
          <Icon name="refresh" size={16} color={colors.outline} />
        </View>

        {/* Resend row */}
        <View style={styles.resendCard}>
          <View style={styles.resendLeft}>
            <Icon name="clock" size={16} color={countdown > 0 ? colors.primary : colors.tertiary} />
            <View>
              <Text style={styles.resendLabel}>{t('otp_resend_label')}</Text>
              <Text style={[styles.resendTimer, { color: countdown > 0 ? colors.primary : colors.tertiary }]}>
                {timerStr} <Text style={styles.resendTimerSec}>({countdown}s)</Text>
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={[styles.resendBtn, countdown > 0 && styles.resendBtnDisabled]}
            disabled={countdown > 0}
            onPress={handleResend}>
            <Text style={[styles.resendBtnText, countdown > 0 && { color: colors.outline }]}>
              {t('otp_resend_btn')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ★ "Get OTP on WhatsApp" and "Receive by Phone Call" removed —
            neither channel exists; SMS via `/auth/otp/request` is the only
            delivery path this product actually has. */}

        {/* Footer trust */}
        <View style={styles.footerRow}>
          <Icon name="shield-check" size={11} color={colors.tertiary} />
          <Text style={styles.footerText}>{t('otp_footer')}</Text>
        </View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.dock}>
        <TouchableOpacity
          style={[styles.ctaBtn, !isReady && styles.ctaDisabled]}
          disabled={!isReady || verifying}
          onPress={handleVerify}>
          <Text style={styles.ctaText}>
            {verifying ? t('otp_verifying') : t('otp_cta')}
          </Text>
          {!verifying && <Icon name="arrow-right" size={20} color={colors.onPrimary} />}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  scroll: { paddingBottom: 100 },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    paddingHorizontal: space.md, paddingTop: space.xl + 20, paddingBottom: space.sm,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 12, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant, alignItems: 'center', justifyContent: 'center',
  },
  headerCenter: { flex: 1 },
  headerTitle: { fontFamily: fontFamily.bold, fontSize: 16, color: colors.primary },
  headerStep: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.onSurfaceVariant },
  listenBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: radius.full,
    backgroundColor: 'rgba(155,47,0,0.08)', borderWidth: 1, borderColor: 'rgba(155,47,0,0.15)',
  },
  listenText: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primary },
  iconWrap: { alignItems: 'center', marginTop: space.xl, position: 'relative', alignSelf: 'center' },
  iconOuter: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.onPrimaryContainer, borderWidth: 2, borderColor: colors.primaryContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  lockBadge: {
    position: 'absolute', bottom: 0, right: -4, width: 26, height: 26,
    borderRadius: 13, backgroundColor: colors.tertiary,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface,
  },
  heading: {
    fontFamily: fontFamily.extraBold, fontSize: 26, color: colors.onSurface,
    textAlign: 'center', marginTop: space.md, letterSpacing: -0.3, paddingHorizontal: space.md,
  },
  subheading: {
    fontFamily: fontFamily.regular, fontSize: 13, color: colors.onSurfaceVariant,
    textAlign: 'center', marginTop: 4, paddingHorizontal: space.xxl,
  },
  phoneRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: space.md, marginTop: space.md, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  phoneNum: { fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.onSurface, flex: 1 },
  editBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radius.full,
    backgroundColor: colors.onPrimaryContainer,
  },
  editText: { fontFamily: fontFamily.bold, fontSize: 11, color: colors.primaryContainer },
  errorText: {
    fontFamily: fontFamily.semiBold, fontSize: 13, color: colors.critical,
    textAlign: 'center', marginHorizontal: space.md, marginTop: space.xs,
  },
  boxHint: {
    fontFamily: fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant,
    textAlign: 'center', marginTop: space.lg, marginBottom: space.sm,
  },
  otpRow: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingHorizontal: space.md },
  voiceRow: { alignItems: 'center', marginTop: space.sm },
  otpBox: {
    width: 48, height: 60, borderRadius: radius.md, borderWidth: 1.5,
    borderColor: colors.outlineVariant, backgroundColor: colors.surface,
    textAlign: 'center', fontFamily: fontFamily.extraBold, fontSize: 28,
    color: colors.onSurface,
  },
  otpBoxFilled: { borderColor: colors.primaryContainer, backgroundColor: colors.onPrimaryContainer },
  otpBoxActive: { borderColor: colors.primaryContainer, borderWidth: 2 },
  autoBanner: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    marginHorizontal: space.md, marginTop: space.md, padding: space.sm,
    borderRadius: radius.lg, backgroundColor: colors.positiveContainer,
    borderWidth: 1, borderColor: 'rgba(4,120,87,0.2)',
  },
  autoIconBg: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(4,120,87,0.12)',
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  autoText: { flex: 1 },
  autoTitle: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.onPositiveContainer },
  autoSub: { fontFamily: fontFamily.regular, fontSize: 11, color: colors.onSurfaceVariant },
  resendCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginHorizontal: space.md, marginTop: space.sm, padding: space.md,
    borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  resendLeft: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  resendLabel: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant },
  resendTimer: { fontFamily: fontFamily.extraBold, fontSize: 16, letterSpacing: 1 },
  resendTimerSec: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.outline },
  resendBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.full,
    backgroundColor: colors.primaryContainer,
  },
  resendBtnDisabled: { backgroundColor: colors.surfaceContainerHigh },
  resendBtnText: { fontFamily: fontFamily.bold, fontSize: 13, color: colors.onPrimary },
  altLabel: {
    fontFamily: fontFamily.bold, fontSize: 11, color: colors.onSurfaceVariant,
    letterSpacing: 0.8, textTransform: 'uppercase',
    marginHorizontal: space.md, marginTop: space.lg, marginBottom: space.xs,
  },
  altList: { paddingHorizontal: space.md, gap: 8 },
  altCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    padding: space.md, borderRadius: radius.lg, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  altIconBg: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  altInfo: { flex: 1 },
  altTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  altTitle: { fontFamily: fontFamily.bold, fontSize: 14, color: colors.onSurface },
  instantBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
  },
  instantText: { fontFamily: fontFamily.bold, fontSize: 10, color: colors.tertiary },
  altSub: { fontFamily: fontFamily.regular, fontSize: 12, color: colors.onSurfaceVariant, marginTop: 1 },
  footerRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, justifyContent: 'center',
    marginTop: space.lg, paddingBottom: space.sm,
  },
  footerText: { fontFamily: fontFamily.regular, fontSize: 10, color: colors.onSurfaceVariant },
  dock: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: space.md, paddingBottom: space.xl, paddingTop: space.sm,
    backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.outlineVariant,
  },
  ctaBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: touch.targetHero, backgroundColor: colors.primaryContainer,
    borderRadius: radius.lg, gap: space.sm,
    shadowColor: '#C2410C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 5,
  },
  ctaDisabled: { backgroundColor: colors.surfaceContainerHigh, shadowOpacity: 0, elevation: 0 },
  ctaText: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.onPrimary, letterSpacing: 0.3 },
});
