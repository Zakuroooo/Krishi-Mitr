import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
  ViewStyle,
  TextStyle,
} from 'react-native';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  loading?: boolean;
  style?: ViewStyle | ViewStyle[];
  textStyle?: TextStyle | TextStyle[];
}

export function Button({
  title,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
  ...props
}: ButtonProps) {
  const isPrimary = variant === 'primary';
  const isSecondary = variant === 'secondary';
  const isGhost = variant === 'ghost';
  const isOutline = variant === 'outline';

  const containerStyles = [
    styles.base,
    isPrimary && styles.primary,
    isSecondary && styles.secondary,
    isGhost && styles.ghost,
    isOutline && styles.outline,
    (disabled || loading) && styles.disabled,
    style,
  ];

  const labelStyles = [
    styles.label,
    isPrimary && styles.primaryLabel,
    isSecondary && styles.secondaryLabel,
    isGhost && styles.ghostLabel,
    isOutline && styles.outlineLabel,
    (disabled || loading) && styles.disabledLabel,
    textStyle,
  ];

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled || loading}
      style={containerStyles}
      {...props}>
      {loading ? (
        <ActivityIndicator color={isPrimary ? '#FFFFFF' : '#1B5E20'} />
      ) : (
        <Text style={labelStyles}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 56, // 56px minimum touch target for farmer accessibility
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  primary: {
    backgroundColor: '#1B5E20',
  },
  secondary: {
    backgroundColor: '#E8F5E9',
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: '#1B5E20',
  },
  disabled: {
    opacity: 0.5,
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  primaryLabel: {
    color: '#FFFFFF',
  },
  secondaryLabel: {
    color: '#1B5E20',
  },
  ghostLabel: {
    color: '#1B5E20',
  },
  outlineLabel: {
    color: '#1B5E20',
  },
  disabledLabel: {
    color: '#888888',
  },
});
