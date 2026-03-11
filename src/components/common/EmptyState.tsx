/**
 * EmptyState - Boş liste gösterimi
 *
 * Props:
 *   - icon (string): Ionicons ikon adı
 *   - title (string): Başlık
 *   - description (string): Açıklama
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize } from '../../theme';

export interface EmptyStateProps {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  description?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon = 'file-tray-outline', title, description }) => {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={56} color={colors.textDisabled} />
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default EmptyState;
