/**
 * LoadingState — Yükleniyor gösterimi
 *
 * EmptyState ile aynı pattern: ortalanmış spinner + mesaj.
 * API çağrısı devam ederken ekranda gösterilir.
 *
 * Kullanım:
 *   if (loading) return <LoadingState />;
 *   if (loading) return <LoadingState message="Odalar yükleniyor..." />;
 */

import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, spacing, fontSize } from '../../theme';

interface LoadingStateProps {
  message?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ message = 'Yükleniyor...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  message: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
});

export default LoadingState;
