/**
 * S19 — quantity, and the end of the listing flow. Stitch screen 19
 * (`19_quantity_weight_stepper_harvest_sizing_bags`).
 *
 * ★ This screen owns the `createLot` call that used to live in S12. The three
 *   Stitch screens (17 photograph → 18 review → 19 quantity) are the same
 *   work S12 did on one page; splitting them without moving the mutation
 *   would have left S12 as a fourth step asking again for what 17–19 already
 *   collected.
 *
 * ★ I2: quantity is entered and stored in **kilograms**, displayed in
 *   quintals. The stepper moves in whole quintals because that is the unit a
 *   farmer actually thinks and trades in; `qty_kg` is what goes on the wire.
 *   Bags are derived at 50 kg — the mandi gunny — and shown so the number can
 *   be checked against what is physically stacked.
 *
 * ★ `photo_path` is optional on the create body (CANON §7.5). Arriving here
 *   with `photoUri: null` from S17's skip is a normal listing, not a
 *   degraded one, and the key is omitted from the body entirely rather than
 *   sent as null.
 */

import React, { useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from '../../components/ui/Icon';
import { createLot } from '../../lib/api';
import { useT } from '../../lib/i18n';
import { ListenButton } from '../../components/ui/ListenButton';
import { formatNumber, toQuintal } from '../../lib/money';
import { DEFAULT_COMMODITY_ID, DEFAULT_MARKET_ID, DEFAULT_QTY_KG, USE_FIXTURES } from '../../config';
import { fxLotListed } from '../../fixtures/lots';
import { ErrorState } from '../../components/farmer/States';
import type { MyLotsStackParamList } from '../../navigation/FarmerTabs';
import type { LotDto } from '../../types/api';

type Props = NativeStackScreenProps<MyLotsStackParamList, 'S19_Quantity'>;

/** One quintal per press. I2 — stored as kg, stepped as quintals. */
const QTY_STEP_KG = 100;
const KG_PER_BAG = 50;

interface CreateLotBody {
  commodity_id: string;
  market_id: string;
  qty_kg: number;
  harvest_date: string;
  photo_path: string | null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function persistLot(body: CreateLotBody): Promise<LotDto> {
  if (USE_FIXTURES) {
    return {
      ...fxLotListed,
      qty_kg: body.qty_kg,
      harvest_date: body.harvest_date,
      photo_path: body.photo_path,
    };
  }
  // `photo_path` is a genuinely optional key — a field the server should never
  // see at all when there is no photo, rather than one carrying an explicit
  // null.
  return createLot(
    body.photo_path === null
      ? {
          commodity_id: body.commodity_id,
          market_id: body.market_id,
          qty_kg: body.qty_kg,
          harvest_date: body.harvest_date,
        }
      : { ...body, photo_path: body.photo_path },
  );
}

export default function S19_Quantity({ route, navigation }: Props) {
  const { t, locale } = useT();

  const narration = t('nar_scr_qty');
  const queryClient = useQueryClient();
  const photoUri = route.params?.photoUri ?? null;

  const [qtyKg, setQtyKg] = useState(DEFAULT_QTY_KG);

  const { mutate: create, isPending, isError, reset } = useMutation({
    mutationFn: persistLot,
    onSuccess: lot => {
      // The lots list is now stale — My Produce should show this one on return.
      queryClient.invalidateQueries({ queryKey: ['lots'] });
      navigation.navigate('S20_QualityDiagnostic', { lot_id: lot.id });
    },
  });

  const adjustQty = (deltaKg: number) =>
    setQtyKg(prev => Math.max(QTY_STEP_KG, prev + deltaKg));

  const onCreate = () =>
    create({
      commodity_id: DEFAULT_COMMODITY_ID,
      market_id: DEFAULT_MARKET_ID,
      qty_kg: qtyKg,
      harvest_date: todayIso(),
      photo_path: photoUri,
    });

  if (isError) {
    return <ErrorState message={t('lot_create_error')} onRetry={() => reset()} />;
  }

  const quintals = toQuintal(qtyKg);
  const bags = Math.floor(qtyKg / KG_PER_BAG);

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
          <Text style={styles.headerTitle}>{t('qs_title')}</Text>
          <Text style={styles.headerSub}>{t('qs_step')}</Text>
        </View>
        {/* ★ This screen had no speaker at all. */}
        <ListenButton text={narration} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.dialCard}>
          <Text style={styles.dialUnit}>{t('qs_quintals')}</Text>

          <View style={styles.dialRow}>
            <TouchableOpacity
              style={styles.dialBtn}
              onPress={() => adjustQty(-QTY_STEP_KG)}
              accessibilityRole="button"
              accessibilityLabel="−">
              <Text style={styles.dialBtnText}>−</Text>
            </TouchableOpacity>

            <Text style={styles.dialValue}>{formatNumber(quintals, locale)}</Text>

            <TouchableOpacity
              style={styles.dialBtn}
              onPress={() => adjustQty(QTY_STEP_KG)}
              accessibilityRole="button"
              accessibilityLabel="+">
              <Text style={styles.dialBtnText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* The live conversion — the number a farmer can check against the
              stack in front of him. */}
          <Text style={styles.conversion}>
            {t('qs_conversion', {
              kg: formatNumber(qtyKg, locale),
              bags: formatNumber(bags, locale),
            })}
          </Text>
        </View>

        {photoUri ? (
          <View style={styles.photoChip}>
            <Icon name="camera" size={15} color={colors.tertiary} />
            <Text style={styles.photoChipText}>{t('pr_use')}</Text>
          </View>
        ) : null}

        <Text style={styles.hint}>{t('qs_hint')}</Text>
      </ScrollView>

      <View style={styles.dock}>
        <TouchableOpacity
          style={[styles.cta, isPending && styles.ctaDisabled]}
          onPress={onCreate}
          disabled={isPending}
          accessibilityRole="button">
          <Text style={styles.ctaText}>{isPending ? t('qs_creating') : t('qs_create')}</Text>
          {!isPending ? <Icon name="arrow-right" size={18} color={colors.onPrimary} /> : null}
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

  scroll: { padding: space.md, paddingBottom: 140, gap: space.sm },

  dialCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderCard,
    paddingVertical: space.xl,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  dialUnit: {
    ...typography.labelMd,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    marginTop: space.sm,
    width: '100%',
  },
  dialBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialBtnText: { fontSize: 34, lineHeight: 40, fontFamily: fontFamily.bold, color: colors.primary },
  dialValue: {
    flex: 1,
    textAlign: 'center',
    fontSize: 64,
    lineHeight: 72,
    fontFamily: fontFamily.extraBold,
    color: colors.onSurface,
  },
  conversion: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    marginTop: space.sm,
    textAlign: 'center',
  },

  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.positiveContainer,
  },
  photoChipText: { ...typography.labelSm, color: colors.onPositiveContainer },

  hint: {
    ...typography.labelSm,
    color: colors.outline,
    fontFamily: fontFamily.medium,
    textAlign: 'center',
  },

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
});
