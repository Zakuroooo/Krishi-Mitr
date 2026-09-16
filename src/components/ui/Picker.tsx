/**
 * A dropdown: a labelled button that opens a sheet of options.
 *
 * ★ Why a component rather than another row of chips: the market screen picks
 *   a crop and a district, and chips would put every option on screen at once
 *   next to a chart that is the actual content. A closed control that states
 *   the current selection is also the only version that stays readable when
 *   the list grows past three — and the district list is three today because
 *   the seed is three districts, not because Maharashtra has three.
 *
 * ★ Sized for a thumb in a mandi: the trigger is a full touch target and each
 *   option row is `touch.targetMin` tall, per the same rule the rest of the app
 *   follows. Options are never truncated to one line — a Marathi mandi name
 *   wraps rather than turning into an ellipsis.
 *
 * ★ ZERO EMOJIS. The chevron and the tick are the shared SVG `Icon`.
 */

import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { colors, fontFamily, radius, space, touch, type as typography } from '../../theme/tokens';
import { Icon } from './Icon';
import { useT } from '../../lib/i18n';

export interface PickerOption {
  id: string;
  label: string;
  /** Optional second line — the mandi a district resolves to, for instance. */
  sublabel?: string;
}

export function Picker({
  label,
  options,
  selectedId,
  onSelect,
  icon,
  disabled = false,
}: {
  label: string;
  options: PickerOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  icon?: Parameters<typeof Icon>[0]['name'];
  disabled?: boolean;
}) {
  const { t } = useT();
  const [open, setOpen] = useState(false);

  const selected = options.find(o => o.id === selectedId) ?? null;
  const isDisabled = disabled || options.length === 0;

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>

      <TouchableOpacity
        style={[styles.trigger, isDisabled && styles.triggerDisabled]}
        onPress={() => setOpen(true)}
        disabled={isDisabled}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? t('picker_none')}`}>
        {icon ? <Icon name={icon} size={16} color={colors.primary} /> : null}
        <Text style={styles.triggerText} numberOfLines={1}>
          {selected?.label ?? t('picker_none')}
        </Text>
        <Icon name="chevron-down" size={16} color={colors.onSurfaceVariant} />
      </TouchableOpacity>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}>
        {/* Tapping the scrim closes — the same gesture as the back button, so
            the sheet is never a trap on a phone with no soft back key. */}
        <Pressable style={styles.scrim} onPress={() => setOpen(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.sheetTitle}>{label}</Text>
            <ScrollView bounces={false}>
              {options.map(o => {
                const active = o.id === selectedId;
                return (
                  <TouchableOpacity
                    key={o.id}
                    style={styles.option}
                    onPress={() => {
                      onSelect(o.id);
                      setOpen(false);
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}>
                    <View style={styles.optionText}>
                      <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                        {o.label}
                      </Text>
                      {o.sublabel ? <Text style={styles.optionSub}>{o.sublabel}</Text> : null}
                    </View>
                    {active ? <Icon name="check" size={18} color={colors.primary} /> : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, minWidth: 0, gap: 4 },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.medium,
  },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: touch.targetMin,
    paddingHorizontal: space.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.borderCard,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, ...typography.titleMd, color: colors.onSurface },

  scrim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '70%',
    paddingHorizontal: space.md,
    paddingTop: space.md,
    paddingBottom: space.xl,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  sheetTitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
    fontFamily: fontFamily.medium,
    marginBottom: space.xs,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: touch.targetMin,
    paddingVertical: space.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  optionText: { flex: 1 },
  optionLabel: { ...typography.titleMd, color: colors.onSurface },
  optionLabelActive: { color: colors.primary, fontFamily: fontFamily.extraBold },
  optionSub: { ...typography.labelSm, color: colors.onSurfaceVariant, marginTop: 1 },
});
