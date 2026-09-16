/**
 * S00_Splash — Screen 01: Landing / Splash screen.
 *
 * Pixel-matched to Stitch `01_splash_bhaav_ka_bharosa_seedha_sauda/screen.png`.
 *
 * ★ ZERO EMOJIS — all icons are SVG via Icon component.
 * ★ FULL I18N — every text uses t('key'), language switcher changes all text live.
 */

import React, { useState } from 'react';
import {
  Dimensions,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { colors, fontFamily, space, radius, touch } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import type { Locale } from '../../types/api';
import type { AuthStackParamList } from '../../navigation/AuthStack';
import { ListenButton } from '../../components/ui/ListenButton';
import { Logo } from '../../components/ui/Logo';
import { SpeakingFace } from '../../components/ui/SpeakingFace';

type Props = NativeStackScreenProps<AuthStackParamList, 'S0_Splash'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const mandiWarehouse = require('../../assets/images/mandi_warehouse.jpg');

export default function S00_Splash({ navigation }: Props) {
  const { t, locale, setLocale } = useT();
  const [selectedLang, setSelectedLang] = useState<Locale>(locale);

  const handleLangSwitch = (lang: Locale) => {
    setSelectedLang(lang);
    setLocale(lang);
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* ★ Two large tinted circles floated behind this screen as "ambient
          glow". They carried no meaning, cost two extra views on the first
          frame, and are the visual signature of a generated layout rather
          than a designed one. The parchment ground is the background. */}

      {/* ★ Deliberately not a ScrollView. Everything here has to fit one
          screen: a farmer meeting the app for the first time should see the
          whole offer at once, not discover half of it by scrolling. If
          something new has to go on this screen, something else comes off. */}
      <View style={styles.body}>

        {/* ── 1. Top ribbon ─────────────────────────────────── */}
        {/* ★ A pulsing green dot beside "LASALGAON DIRECT MANDI ONLINE" sat
            here. It was the first thing on the first screen and it was pure
            chrome — nothing is live, nothing connects to Lasalgaon in real
            time, and a status light that reports no status is decoration
            pretending to be information. It also reads as marketing rather
            than as something written for a farmer. Removed; the speaker now
            has the ribbon to itself. */}
        <View style={styles.topRibbon}>
          {/* ★ This pill had no `onPress` at all — the very first speaker a
              farmer meets did nothing when tapped. `ListenButton` owns the
              behaviour so it cannot go dead again by copy-paste, and it reads
              the screen: the product name, the tagline, and today's price. */}
          {/* ★ It was reading the app name, the tagline and *today's onion
              price* — a line left pointing at the price strip after that strip
              was deleted, so the first thing a farmer heard was a number no
              longer on the screen.

              It now speaks a written summary of what this screen offers
              rather than reading its labels back: what the app decides, that
              he can talk to it in his own language, that he need not read, and
              which button to press. `large` because this is the first control
              a farmer meets and it has to be findable without being looked
              for. */}
          <ListenButton text={t('splash_narration')} large />
        </View>

        {/* ── 2. App emblem ─────────────────────────────────── */}
        <View style={styles.emblemContainer}>
          <View style={styles.emblemGlow} />
          {/* ★ This drew a leaf, a white bar, and the literal text "SETU" —
              the project's old name, on the first screen of an app called
              Krishi Mitra. It is now the real mark: the same bridge shape the
              bar was gesturing at, with the sprout growing through it, drawn
              once in `components/ui/Logo` so the splash, the header and the
              tab bar cannot drift apart. */}
          <View style={styles.emblemOuter}>
            <View style={styles.emblemInner}>
              <Logo size={80} bare background="transparent" foreground={colors.onPrimary} />
            </View>
          </View>
          {/* ★ A "Verified" badge used to sit here, under the emblem, on the
              very first screen of the app. Verified by whom? Nothing issues
              it and nothing checks it — a green tick asserting an approval
              that does not exist, in the position a certification mark
              occupies. Removed rather than reworded. */}
        </View>

        {/* ── 3. App name ───────────────────────────────────── */}
        {/* ★ One name. This rendered `splash_app_name` *and*
            `splash_app_name_latin` — so an English farmer saw "Krishi Mitra"
            with "KRISHI MITRA" stacked beneath it, and a Marathi one saw two
            scripts at once on the app's first screen. */}
        <Text style={styles.appName} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
          {t('splash_app_name')}
        </Text>

        {/* ── 4. Tagline ────────────────────────────────────── */}
        <View style={styles.taglineCard}>
          {/* Same duplication as the name: `splash_tagline` and
              `splash_tagline_sub` say the same thing twice. */}
          <Text style={styles.taglineDevanagari}>{t('splash_tagline')}</Text>
        </View>

        {/* ── 5. How it works ───────────────────────────────
            ★ A "today's onion price at Lasalgaon" card sat here, on the very
              first screen. A farmer arriving here has told us nothing — not
              his crop, not his mandi — so that number belonged to somebody
              else's onion at somebody else's yard. It looked like data and
              was decoration.

            ★ What belongs on a first screen is the answer to "what is this,
              and can I use it?". For a farmer who may not read, that answer
              is: you talk to it, and it talks back. Three steps, each with a
              picture of the action rather than an abstract glyph. */}
        <View style={styles.howCard}>
          <Text style={styles.howTitle}>{t('splash_how_title')}</Text>

          <View style={styles.howRow}>
            <View style={styles.howStep}>
              {/* The same face used on every mic in the app, animating, so
                  the control he will meet later is already familiar here. */}
              <SpeakingFace listening size={54} />
              <Text style={styles.howLabel}>{t('splash_how_1')}</Text>
              <Text style={styles.howSub}>{t('splash_how_1_sub')}</Text>
            </View>

            <View style={styles.howArrow}>
              <Icon name="arrow-right" size={16} color={colors.outline} />
            </View>

            <View style={styles.howStep}>
              <View style={styles.howIconBg}>
                <Icon name="globe" size={26} color={colors.primary} />
              </View>
              <Text style={styles.howLabel}>{t('splash_how_2')}</Text>
              <Text style={styles.howSub}>{t('splash_how_2_sub')}</Text>
            </View>

            <View style={styles.howArrow}>
              <Icon name="arrow-right" size={16} color={colors.outline} />
            </View>

            <View style={styles.howStep}>
              <View style={styles.howIconBg}>
                <Icon name="volume" size={26} color={colors.primary} />
              </View>
              <Text style={styles.howLabel}>{t('splash_how_3')}</Text>
              <Text style={styles.howSub}>{t('splash_how_3_sub')}</Text>
            </View>
          </View>

          {/* ★ The one claim on this screen we have actually tested: with the
              server stopped the app still speaks, through the phone's own
              engine. Verified on device, not asserted. */}
          <View style={styles.howOffline}>
            <Icon name="check-circle" size={13} color={colors.tertiary} />
            <Text style={styles.howOfflineText}>{t('splash_no_net')}</Text>
          </View>
        </View>

        {/* ── 6. Trust badges ───────────────────────────────── */}
        {/* ★ Three "trust" cards sat here — both numbers always, it says when
            it does not know, buyers direct. They are the right three points
            and they are already made, at length and better, on the very next
            screen ("Why Krishi Mitra"). Saying them twice was what pushed this
            screen past one screenful and made it scroll. A splash that scrolls
            is a splash that has not decided what it is for. */}
      </View>

      {/* ── 7. Bottom action pad (fixed) ────────────────── */}
      <View style={styles.bottomDock}>
        {/* Language selector */}
        <View style={styles.langRow}>
          <Icon name="globe" size={14} color={colors.outline} />
          {(['mr', 'hi', 'en'] as Locale[]).map(lang => {
            const isActive = selectedLang === lang;
            const label = lang === 'mr' ? 'मराठी' : lang === 'hi' ? 'हिंदी' : 'English';
            return (
              <TouchableOpacity
                key={lang}
                style={[styles.langPill, isActive && styles.langActive]}
                onPress={() => handleLangSwitch(lang)}>
                <Text style={[styles.langText, isActive && styles.langActiveText]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* CTA button
            ★ "Get started" always runs the whole journey: language, then why
              this app exists, then the phone number.

              It used to skip to the phone screen whenever a language was
              already saved — which is true of any device the app has been
              opened on once, so the two onboarding screens became unreachable
              in practice. That is wrong twice over: they are where a farmer
              learns what the product is, and they are the part of the flow we
              most need to be able to show.

              A returning farmer is not made to sit through it: the "log in
              with a one-time code" link below goes straight to the phone
              screen. Starting fresh and coming back are different intents and
              now have different buttons, instead of one button guessing. */}
        <TouchableOpacity
          style={styles.ctaBtn}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('S1_Language')}>
          <Text style={styles.ctaText}>{t('splash_get_started')}</Text>
          <Icon name="arrow-right" size={20} color={colors.onPrimary} />
        </TouchableOpacity>

        {/* OTP login link
            ★ This had no `onPress` — it read "already registered? log in with
              OTP" and did nothing at all. It is the shortcut for a returning
              farmer, so it goes where that farmer wants to be: the phone
              number, which is where the OTP is sent from. */}
        <TouchableOpacity
          style={styles.otpRow}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={t('splash_otp_login')}
          onPress={() => navigation.navigate('S2_Phone')}>
          <Icon name="zap" size={12} color={colors.tertiary} />
          <Text style={styles.otpText}>{t('splash_otp_login')}</Text>
        </TouchableOpacity>

        {/* ★ The footer read "लासलगाव • नाशिक नोड v2.4" beside "256-bit bank
            encryption". There is no Nashik node and there is no bank
            encryption: `lib/api.ts` says in its own header that Phase 1 keeps
            a 72-hour JWT in AsyncStorage, and that we say so out loud rather
            than implying a keystore we did not build. A footer contradicting
            our own code, on the first screen, is exactly the claim that fails
            the only follow-up question that matters. */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scroll: {
    flex: 1,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: space.sm,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: space.xxl,
  },

  // Ambient glow
  // Top ribbon
  topRibbon: {
    flexDirection: 'row',
    // Only the speaker lives here now that the "live mandi" chip is gone;
    // `space-between` would strand it on the left.
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: space.md,
    paddingTop: space.xl + 20,
    paddingBottom: space.xs,
    width: '100%',
  },
  listenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: 'rgba(155,47,0,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(155,47,0,0.15)',
    gap: 4,
  },
  listenText: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    letterSpacing: 0.3,
    color: colors.primary,
  },

  // Emblem
  emblemContainer: {
    alignItems: 'center',
    marginTop: space.xxl,
    marginBottom: space.md,
    position: 'relative',
  },
  emblemGlow: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: 'rgba(194,65,12,0.08)',
    top: -16,
  },
  emblemOuter: {
    width: 112,
    height: 112,
    borderRadius: 24,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 8,
  },
  emblemInner: {
    width: 96,
    height: 96,
    borderRadius: 20,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  // App name
  /**
   * ★ The title was clipped under the logo in Marathi and Hindi. Cause:
   *   `fontSize: 40` with `lineHeight: 48`. Devanagari needs far more
   *   vertical room than Latin at the same size — the shirorekha and the
   *   matras above it (कृषी) plus descenders below sit outside what a 1.2×
   *   line box allows, so the glyph tops were cut. Latin never showed it,
   *   which is why it read as a logo-overflow bug rather than a type bug.
   *   1.45× plus explicit padding clears both extremes in all three scripts.
   */
  appName: {
    fontFamily: fontFamily.extraBold,
    fontSize: 38,
    lineHeight: 58,
    paddingTop: 6,
    paddingBottom: 2,
    color: colors.primary,
    letterSpacing: -0.5,
    textAlign: 'center',
    marginTop: space.md,
    alignSelf: 'stretch',
    paddingHorizontal: space.md,
  },

  // Tagline
  taglineCard: {
    marginTop: space.lg,
    marginHorizontal: space.xxl,
    paddingHorizontal: space.md,
    paddingVertical: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(225,191,181,0.5)',
    alignItems: 'center',
  },
  taglineDevanagari: {
    fontFamily: fontFamily.bold,
    fontSize: 20,
    lineHeight: 28,
    color: colors.onSurface,
    textAlign: 'center',
  },

  // Price strip
  priceStrip: {
    marginTop: space.lg,
    marginHorizontal: space.md,
    width: SCREEN_WIDTH - space.md * 2,
  },
  priceStripInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderWidth: 1,
    borderColor: 'rgba(225,191,181,0.5)',
    overflow: 'hidden',
  },
  pricePhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    marginRight: space.sm,
  },
  priceInfo: {
    flex: 1,
  },
  priceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  priceLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 11,
    color: colors.tertiary,
    letterSpacing: 0.2,
  },
  priceMarket: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.outline,
  },
  priceCommodity: {
    fontFamily: fontFamily.extraBold,
    fontSize: 15,
    lineHeight: 20,
    color: colors.onSurface,
  },
  priceRange: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    lineHeight: 22,
    color: colors.primary,
    letterSpacing: -0.3,
  },
  priceUnit: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },

  // Trust grid
  howCard: {
    // ★ Narrower side margins and more inner padding than the default card.
    //   Devanagari sets wider than Latin at the same point size — "मराठी,
    //   हिंदी, इंग्रजी" needs noticeably more room than "Marathi, Hindi,
    //   English" — so the three columns were cramped against the card edges in
    //   exactly the two languages most farmers will use. The card takes the
    //   width back from its own margins.
    marginHorizontal: space.sm,
    marginTop: space.md,
    paddingVertical: space.md,
    paddingHorizontal: space.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  howTitle: {
    fontFamily: fontFamily.bold,
    fontSize: 15,
    lineHeight: 21,
    color: colors.onSurface,
    textAlign: 'center',
    marginBottom: space.md,
  },
  // ★ The arrows sit between three columns of unequal text height. Centring
  //   the row on the icons (not the text) keeps the arrows level with the
  //   circles, and the fixed label/sub heights stop a two-line label — Marathi
  //   "ॲप समजते" wraps where English "It understands" does not — from pushing
  //   its own subtitle down onto the divider below.
  howRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  howStep: { flex: 1, alignItems: 'center', gap: 3, paddingHorizontal: 2 },
  // Half the 54px icon height, so the arrow lands on the circles' centre line.
  // Narrow, so the arrows take as little of the row's width as possible —
  // every pixel here belongs to the three labels.
  howArrow: { height: 54, justifyContent: 'center', paddingHorizontal: 2 },
  howIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.onPrimaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  howLabel: {
    fontFamily: fontFamily.bold,
    fontSize: 13,
    lineHeight: 18,
    color: colors.onSurface,
    marginTop: 4,
    textAlign: 'center',
  },
  howSub: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    lineHeight: 15,
    // Devanagari conjuncts get clipped by tight tracking at this size.
    letterSpacing: 0.1,
    // Two lines' worth, reserved, so all three columns end level regardless of
    // how the translation happens to wrap.
    minHeight: 30,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  howOffline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: space.md,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: colors.borderCard,
  },
  howOfflineText: { fontFamily: fontFamily.semiBold, fontSize: 12, color: colors.tertiary },
  trustGrid: {
    flexDirection: 'row',
    paddingHorizontal: space.md,
    marginTop: space.md,
    gap: 8,
  },
  trustCard: {
    flex: 1,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: 'rgba(225,191,181,0.5)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  trustIconBg: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  trustTitle: {
    fontFamily: fontFamily.extraBold,
    fontSize: 11,
    lineHeight: 14,
    color: colors.onSurface,
  },
  trustSub: {
    fontSize: 10,
    fontFamily: fontFamily.medium,
    color: colors.onSurfaceVariant,
    lineHeight: 12,
    marginTop: 2,
  },

  // Bottom dock
  bottomDock: {
    paddingHorizontal: space.md,
    paddingTop: space.xs,
    paddingBottom: space.lg,
    backgroundColor: colors.surface,
  },

  // Language selector
  langRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: space.sm,
    paddingVertical: 4,
    paddingHorizontal: 4,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: 'rgba(225,191,181,0.5)',
    alignSelf: 'center',
    gap: 2,
  },
  langPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginLeft: 4,
  },
  langActive: {
    backgroundColor: colors.primary,
    shadowColor: '#9A3412',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  langText: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    color: colors.onSurfaceVariant,
  },
  langActiveText: {
    fontFamily: fontFamily.bold,
    color: colors.onPrimary,
  },

  // CTA
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
    shadowOpacity: 0.39,
    shadowRadius: 14,
    elevation: 6,
  },
  ctaText: {
    fontFamily: fontFamily.extraBold,
    fontSize: 18,
    color: colors.onPrimary,
    letterSpacing: 0.3,
  },

  // OTP link
  otpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: space.sm,
    gap: 4,
  },
  otpText: {
    fontFamily: fontFamily.regular,
    fontSize: 11,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.2,
  },

});
