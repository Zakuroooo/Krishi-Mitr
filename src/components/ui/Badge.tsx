import React from 'react';
import { colors } from '../../theme/tokens';
import { StyleSheet, Text, View, ViewStyle, TextStyle } from 'react-native';

export type BadgeType =
  | 'AGMARKNET'
  | 'MSAMB'
  | 'SYNTHETIC'
  | 'ARCHIVE'
  | 'IMPUTED'
  | 'GRADE_A'
  | 'GRADE_B'
  | 'GRADE_C'
  | 'SUCCESS'
  | 'WARNING'
  | 'INFO';

export interface BadgeProps {
  label: string;
  type?: BadgeType;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Badge({ label, type = 'INFO', style, textStyle }: BadgeProps) {
  const getBadgeStyle = () => {
    switch (type) {
      case 'AGMARKNET':
      case 'MSAMB':
      case 'SUCCESS':
        return styles.success;
      case 'SYNTHETIC':
      case 'WARNING':
        return styles.warning;
      case 'ARCHIVE':
      case 'IMPUTED':
        return styles.archive;
      case 'GRADE_A':
        return styles.gradeA;
      case 'GRADE_B':
        return styles.gradeB;
      case 'GRADE_C':
        return styles.gradeC;
      default:
        return styles.info;
    }
  };

  const getTextStyle = () => {
    switch (type) {
      case 'AGMARKNET':
      case 'MSAMB':
      case 'SUCCESS':
        return styles.successText;
      case 'SYNTHETIC':
      case 'WARNING':
        return styles.warningText;
      case 'ARCHIVE':
      case 'IMPUTED':
        return styles.archiveText;
      case 'GRADE_A':
        return styles.gradeAText;
      case 'GRADE_B':
        return styles.gradeBText;
      case 'GRADE_C':
        return styles.gradeCText;
      default:
        return styles.infoText;
    }
  };

  return (
    <View style={[styles.badge, getBadgeStyle(), style]}>
      <Text style={[styles.text, getTextStyle(), textStyle]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  success: {
    backgroundColor: colors.positiveContainer,
  },
  successText: {
    color: colors.positiveSolid,
  },
  warning: {
    backgroundColor: colors.warningContainer,
  },
  warningText: {
    color: colors.warning,
  },
  archive: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  archiveText: {
    color: colors.onSurfaceVariant,
  },
  gradeA: {
    backgroundColor: colors.positiveContainer,
  },
  gradeAText: {
    color: colors.positiveSolid,
  },
  gradeB: {
    backgroundColor: colors.surfaceContainerLow,
  },
  gradeBText: {
    color: colors.onSurfaceVariant,
  },
  gradeC: {
    backgroundColor: colors.warningContainer,
  },
  gradeCText: {
    color: colors.warning,
  },
  info: {
    backgroundColor: colors.surfaceContainerLow,
  },
  infoText: {
    color: colors.onSurfaceVariant,
  },
});
