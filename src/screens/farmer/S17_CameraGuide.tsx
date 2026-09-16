/**
 * S17 — the camera guide. Stitch screen 17
 * (`17_camera_guide_ai_produce_quality_scan`), first of the three-step
 * listing flow: photograph (17) → review (18) → quantity (19).
 *
 * ★ Stitch calls this screen "AI produce quality scan". It is not one, and
 *   this screen does not say it is. No computer-vision model exists anywhere
 *   in this project: the grade comes from the six answers the farmer gives on
 *   S20, and CANON §9 is explicit that the photo is **evidence, not input**.
 *   Telling a farmer his photo is being scanned would be inventing a feature,
 *   and worse, it would imply that a bad photo costs him a grade.
 *
 * ★ Which is why "continue without a photo" is a first-class button here and
 *   not a hidden escape hatch. `photo_path` is optional on the create-lot
 *   body (CANON §7.5), a lot with no photo is a normal lot, and a farmer with
 *   a cracked camera must be able to finish this flow. The note under the
 *   button says exactly that, so skipping does not feel like losing.
 */

import React, { useState } from 'react';
import {
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { Permission } from 'react-native';
import { launchCamera } from 'react-native-image-picker';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S17_CameraGuide'>;

/** `PermissionsAndroid.PERMISSIONS` is typed as a partial record, so the
 * CAMERA key reads as possibly-undefined. It is always present on Android and
 * this whole block is guarded by `Platform.OS === 'android'`; the constant is
 * narrowed once here rather than asserted at each of the two call sites. */
const CAMERA_PERMISSION: Permission = PermissionsAndroid.PERMISSIONS.CAMERA ?? 'android.permission.CAMERA';

const TIPS: Array<{ key: string; icon: Parameters<typeof Icon>[0]['name'] }> = [
  { key: 'cam_tip_light', icon: 'zap' },
  { key: 'cam_tip_fill', icon: 'camera' },
  { key: 'cam_tip_spread', icon: 'box' },
];

export default function S17_CameraGuide({ navigation }: Props) {
  const { t, locale } = useT();

  const narration = t('nar_scr_camera');
  const [permissionDenied, setPermissionDenied] = useState(false);

  const openCamera = async () => {
    if (Platform.OS === 'android') {
      const already = await PermissionsAndroid.check(CAMERA_PERMISSION);
      if (!already) {
        const granted = await PermissionsAndroid.request(CAMERA_PERMISSION);
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          setPermissionDenied(true);
          return;
        }
      }
    }
    setPermissionDenied(false);

    launchCamera({ mediaType: 'photo', saveToPhotos: false }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) navigation.navigate('S18_PhotoReview', { photoUri: uri });
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surface} />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel={t('back_button')}>
          <Icon name="arrow-left" size={20} color={colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>{t('cam_title')}</Text>
          <Text style={styles.headerSub}>{t('cam_step', { n: '1' })}</Text>
        </View>
        {/* ★ This screen had no speaker at all. */}
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* The framing guide, drawn rather than photographed — a mock viewfinder
            that shows what "fill the frame" means without shipping an image. */}
        <View style={styles.viewfinder}>
          <View style={[styles.corner, styles.cornerTL]} />
          <View style={[styles.corner, styles.cornerTR]} />
          <View style={[styles.corner, styles.cornerBL]} />
          <View style={[styles.corner, styles.cornerBR]} />
          <View style={styles.viewfinderCenter}>
            <Icon name="camera" size={40} color={colors.outline} />
          </View>
        </View>

        <Text style={styles.guideTitle}>{t('cam_guide_title')}</Text>
        <View style={styles.tipCard}>
          {TIPS.map((tip, i) => (
            <View key={tip.key} style={[styles.tipRow, i > 0 && styles.tipRowDivider]}>
              <View style={styles.tipIconBox}>
                <Icon name={tip.icon} size={16} color={colors.primary} />
              </View>
              <Text style={styles.tipText}>{t(tip.key)}</Text>
            </View>
          ))}
        </View>

        {permissionDenied ? (
          <View style={styles.deniedCard}>
            <Icon name="info" size={16} color={colors.warning} />
            <Text style={styles.deniedText}>{t('cam_permission_denied')}</Text>
          </View>
        ) : null}
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity style={styles.cta} onPress={openCamera} accessibilityRole="button">
          <Icon name="camera" size={20} color={colors.onPrimary} />
          <Text style={styles.ctaText}>{t('cam_open')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipBtn}
          onPress={() => navigation.navigate('S19_Quantity', { photoUri: null })}
          accessibilityRole="button">
          <Text style={styles.skipBtnText}>{t('cam_skip')}</Text>
        </TouchableOpacity>
        <Text style={styles.skipNote}>{t('cam_skip_note')}</Text>
      </View>
    </View>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1 },
  headerTitle: { ...typography.titleLg, color: colors.onSurface, fontFamily: fontFamily.extraBold },
  headerSub: { ...typography.labelSm, color: colors.onSurfaceVariant, fontFamily: fontFamily.medium },

  scroll: { padding: space.md, paddingBottom: 220, gap: space.sm },

  viewfinder: {
    height: 200,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderCenter: { alignItems: 'center', justifyContent: 'center' },
  corner: {
    position: 'absolute',
    width: 34,
    height: 34,
    borderColor: colors.primaryContainer,
  },
  cornerTL: { top: 14, left: 14, borderTopWidth: 3, borderLeftWidth: 3, borderTopLeftRadius: 10 },
  cornerTR: { top: 14, right: 14, borderTopWidth: 3, borderRightWidth: 3, borderTopRightRadius: 10 },
  cornerBL: { bottom: 14, left: 14, borderBottomWidth: 3, borderLeftWidth: 3, borderBottomLeftRadius: 10 },
  cornerBR: { bottom: 14, right: 14, borderBottomWidth: 3, borderRightWidth: 3, borderBottomRightRadius: 10 },

  guideTitle: { ...typography.titleMd, color: colors.onSurface, marginTop: space.xs },
  tipCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    overflow: 'hidden',
  },
  tipRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.sm },
  tipRowDivider: { borderTopWidth: 1, borderTopColor: colors.outlineVariant },
  tipIconBox: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipText: { ...typography.bodyMd, color: colors.onSurface, flex: 1 },

  deniedCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.warningContainer,
  },
  deniedText: { ...typography.bodySm, color: colors.onSurface, flex: 1 },

  dock: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
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
  ctaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
  skipBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: space.xs },
  skipBtnText: { ...typography.titleMd, color: colors.primary },
  skipNote: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
    lineHeight: 16,
  },
});
