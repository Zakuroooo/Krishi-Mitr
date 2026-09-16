import React from 'react';
import { StyleSheet, View, ViewProps, ViewStyle } from 'react-native';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'outlined' | 'elevated';
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
}

export function Card({
  variant = 'default',
  style,
  children,
  ...props
}: CardProps) {
  const containerStyle = [
    styles.card,
    variant === 'outlined' && styles.outlined,
    variant === 'elevated' && styles.elevated,
    style,
  ];

  return (
    <View style={containerStyle} {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  outlined: {
    borderColor: '#CBD5E1',
    borderWidth: 1.5,
  },
  elevated: {
    borderWidth: 0,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
});
