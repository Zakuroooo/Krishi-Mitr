/**
 * S35_FarmerProfile — profile & payout settings.
 *
 * ★ Rewritten from scratch. The Stitch-matched draft claimed "UIDAI e-KYC ·
 *   Masked VID Verified" — i.e. a completed Aadhaar verification. That is
 *   not a cosmetic exaggeration; it is a direct violation of this project's
 *   I9 invariant ("No Aadhaar numbers, ever. Not hashed, not encrypted, not
 *   in seed data, not 'just for the demo'. Phone is the identifier.") The
 *   same draft also invented a specific bank account, IFSC code, branch,
 *   9.9-acre landholding, a 7/12 land-record reference, an FPO membership
 *   number, a QR gate pass, and a "digitally signed" export PDF — none of
 *   which exist anywhere in this product.
 *
 * ★ What's real and shown: the signed-in farmer's own name and phone
 *   (`useAuth()`) and their district, resolved the same way S3_Profile
 *   resolves it (`GET /ref/districts`, or the fixture until that route
 *   exists). Everything else this screen would eventually need — payout
 *   bank details, land records — is marked `coming_soon`, per explicit
 *   product direction, rather than shown as if it already works.
 *
 * ★ ZERO EMOJIS — every icon is the shared SVG `Icon` component.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, fontFamily, radius, space } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import { useAuth } from '../../lib/auth';
import { getDistricts } from '../../lib/api';
import { USE_FIXTURES } from '../../config';
import { fxDistricts } from '../../fixtures/auth';
import type { District } from '../../types/api';

export default function S35_FarmerProfile({ navigation }: any) {
  const { t, locale } = useT();
  const { user } = useAuth();

  /**
   * The screen, spoken: who this is, then the four facts on it. Built from the
   * same `user` object the cards render, so the voice cannot describe a detail
   * that is not on screen.
   */
  const narration = [
    t('nar_scr_profile'),
    user?.name ? `${t('profile_name_label')}: ${user.name}` : null,
    user?.phone ? `${t('profile_phone_label')}: ${user.phone}` : null,
  ]
    .filter(Boolean)
    .join('. ');

  const [districtName, setDistrictName] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    (USE_FIXTURES ? Promise.resolve(fxDistricts) : getDistricts())
      .then((list: District[]) => {
        const match = list.find(d => d.id === user.district_id);
        setDistrictName(match?.name_mr ?? null);
      })
      .catch(() => setDistrictName(null));
  }, [user]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('profile_title')}</Text>
        {/* ★ Was an empty spacer holding the title centred. It is now the
            screen's speaker — same width, so the title stays centred, and the
            screen gains the affordance it was missing entirely. */}
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Identity card */}
        <View style={styles.identityCard}>
          <View style={styles.avatarCircle}>
            <Text style={styles.avatarInitial}>{(user?.name?.trim()?.[0] ?? '?').toUpperCase()}</Text>
          </View>
          <View style={styles.identityInfo}>
            <Text style={styles.farmerName} numberOfLines={1}>
              {user?.name ?? ''}
            </Text>
            <Text style={styles.farmerPhone}>{user?.phone ?? ''}</Text>
            {districtName && (
              <View style={styles.locRow}>
                <Icon name="map-pin" size={11} color={colors.onSurfaceVariant} />
                <Text style={styles.locText}>{districtName}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Coming soon — payout bank + land/KYC */}
        <Text style={styles.sectionLabel}>{t('coming_soon')}</Text>
        <View style={styles.comingSoonCard}>
          <View style={styles.comingSoonRow}>
            <View style={styles.comingSoonIconBg}>
              <Icon name="building" size={16} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.comingSoonText}>{t('profile_soon_bank')}</Text>
          </View>
          <View style={styles.comingSoonDivider} />
          <View style={styles.comingSoonRow}>
            <View style={styles.comingSoonIconBg}>
              <Icon name="leaf" size={16} color={colors.onSurfaceVariant} />
            </View>
            <Text style={styles.comingSoonText}>{t('profile_soon_land')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: space.md, paddingTop: space.xl + 8, paddingBottom: space.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.outlineVariant,
  },
  backBtn: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontFamily: fontFamily.extraBold, fontSize: 16, color: colors.onSurface },
  scroll: { paddingBottom: space.xxl },

  identityCard: {
    flexDirection: 'row', alignItems: 'center', gap: space.sm,
    margin: space.md, padding: space.md,
    borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant,
  },
  avatarCircle: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.surfaceContainer, alignItems: 'center', justifyContent: 'center',
  },
  avatarInitial: { fontFamily: fontFamily.extraBold, fontSize: 26, color: colors.primary },
  identityInfo: { flex: 1 },
  farmerName: { fontFamily: fontFamily.extraBold, fontSize: 18, color: colors.onSurface },
  farmerPhone: { fontFamily: fontFamily.regular, fontSize: 13, color: colors.onSurfaceVariant, marginTop: 2 },
  locRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  locText: { fontFamily: fontFamily.medium, fontSize: 12, color: colors.onSurfaceVariant },

  sectionLabel: {
    fontFamily: fontFamily.bold, fontSize: 11, color: colors.onSurfaceVariant,
    paddingHorizontal: space.md, marginTop: space.md, marginBottom: space.xs,
    textTransform: 'uppercase', letterSpacing: 0.6,
  },
  comingSoonCard: {
    marginHorizontal: space.md, borderRadius: radius.xl, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.outlineVariant, overflow: 'hidden',
  },
  comingSoonRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.md },
  comingSoonIconBg: {
    width: 36, height: 36, borderRadius: 10, backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center', justifyContent: 'center',
  },
  comingSoonText: { flex: 1, fontFamily: fontFamily.medium, fontSize: 13, color: colors.onSurfaceVariant },
  comingSoonDivider: { height: 1, backgroundColor: colors.outlineVariant, marginLeft: 52 },
});
