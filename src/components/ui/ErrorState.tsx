import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Button } from './Button';
import { translate } from '../../lib/i18n';
import type { Locale } from '../../types/api';

export interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  /** Only used to resolve the two defaults below when a caller omits them —
   * every current call site passes its own `message`/`retryText` explicitly,
   * but the default must still respect the selected language rather than
   * silently falling back to Marathi for whoever doesn't. */
  locale?: Locale;
}

export function ErrorState({
  message,
  onRetry,
  retryText,
  locale = 'mr',
}: ErrorStateProps) {
  const resolvedMessage = message ?? translate('error_generic', locale);
  const resolvedRetryText = retryText ?? translate('retry_button', locale);
  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Text style={styles.iconText}>!</Text>
      </View>
      <Text style={styles.message}>{resolvedMessage}</Text>
      {onRetry ? (
        <Button
          title={resolvedRetryText}
          onPress={onRetry}
          variant="outline"
          style={styles.button}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF5F5',
    borderRadius: 16,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: '#FEB2B2',
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E53E3E',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  message: {
    fontSize: 16,
    color: '#C53030',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 16,
    lineHeight: 24,
  },
  button: {
    borderColor: '#E53E3E',
    minWidth: 180,
  },
});
