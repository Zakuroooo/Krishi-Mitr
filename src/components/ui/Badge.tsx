import React from 'react';
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
    backgroundColor: '#E8F5E9',
  },
  successText: {
    color: '#2E7D32',
  },
  warning: {
    backgroundColor: '#FFF3E0',
  },
  warningText: {
    color: '#E65100',
  },
  archive: {
    backgroundColor: '#ECEFF1',
  },
  archiveText: {
    color: '#455A64',
  },
  gradeA: {
    backgroundColor: '#E8F5E9',
  },
  gradeAText: {
    color: '#1B5E20',
  },
  gradeB: {
    backgroundColor: '#E3F2FD',
  },
  gradeBText: {
    color: '#1565C0',
  },
  gradeC: {
    backgroundColor: '#FFF8E1',
  },
  gradeCText: {
    color: '#F57F17',
  },
  info: {
    backgroundColor: '#F1F5F9',
  },
  infoText: {
    color: '#475569',
  },
});
