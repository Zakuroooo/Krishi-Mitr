/**
 * S18 — photo review. Stitch screen 18
 * (`18_photo_review_multi_angle_quality_verification`), second of the
 * three-step listing flow.
 *
 * ★ Stitch shows this as "multi-angle quality verification" with three shots
 *   being checked. One photo is what `LotDto.photo_path` holds — a single
 *   nullable path — so one photo is what this screen reviews. Three slots
 *   backed by one field would be two empty boxes a farmer keeps trying to
 *   fill.
 *
 * ★ Nothing here verifies anything. The question the screen asks is the
 *   honest one — can a buyer see what he needs to see — and the farmer is the
 *   one who answers it, with retake or continue. There is no check mark
 *   claiming a machine approved the shot.
 */

import React from 'react';
import { Image, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S18_PhotoReview'>;

export default function S18_PhotoReview({ route, navigation }: Props) {
  const { t, locale } = useT();

  const narration = t('nar_scr_photo');
  const { photoUri } = route.params;

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
          <Text style={styles.headerTitle}>{t('pr_title')}</Text>
          <Text style={styles.headerSub}>{t('pr_step')}</Text>
        </View>
        {/* ★ This screen had no speaker at all. */}
        <ListenButton text={narration} />
      </View>

      <View style={styles.body}>
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={[styles.photo, styles.photoEmpty]}>
            <Icon name="camera" size={36} color={colors.outline} />
            <Text style={styles.photoEmptyText}>{t('pr_no_photo')}</Text>
          </View>
        )}

        <Text style={styles.question}>{t('pr_question')}</Text>
      </View>

      <View style={styles.dock}>
        <TouchableOpacity
          style={styles.primaryCta}
          onPress={() => navigation.navigate('S19_Quantity', { photoUri })}
          accessibilityRole="button">
          <Text style={styles.primaryCtaText}>{t('pr_use')}</Text>
          <Icon name="arrow-right" size={18} color={colors.onPrimary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryCta}
          onPress={() => navigation.canGoBack() && navigation.goBack()}
          accessibilityRole="button">
          <Icon name="refresh" size={17} color={colors.primary} />
          <Text style={styles.secondaryCtaText}>{t('pr_retake')}</Text>
        </TouchableOpacity>
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

  body: { flex: 1, padding: space.md, gap: space.md },
  photo: {
    flex: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  photoEmpty: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  photoEmptyText: { ...typography.bodySm, color: colors.onSurfaceVariant },
  question: { ...typography.titleMd, color: colors.onSurface, textAlign: 'center' },

  dock: {
    padding: space.md,
    paddingBottom: space.xl,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    gap: space.xs,
  },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: touch.targetHero,
    borderRadius: radius.md,
    backgroundColor: colors.primaryContainer,
  },
  primaryCtaText: { ...typography.titleLg, color: colors.onPrimary, fontFamily: fontFamily.extraBold },
  secondaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: touch.targetMin,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  secondaryCtaText: { ...typography.titleMd, color: colors.primary },
});
