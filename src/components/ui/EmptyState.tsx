import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';

export interface EmptyStateProps {
  title: string;
  description?: string;
  ctaText?: string;
  onCtaPress?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({
  title,
  description,
  ctaText,
  onCtaPress,
  icon,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {icon ? <View style={styles.iconContainer}>{icon}</View> : null}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {ctaText && onCtaPress ? (
        <Button
          title={ctaText}
          onPress={onCtaPress}
          variant="primary"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  button: {
    marginTop: 12,
    minWidth: 200,
  },
});
