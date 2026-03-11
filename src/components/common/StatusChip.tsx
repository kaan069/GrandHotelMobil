/**
 * StatusChip - Durum gösterge bileşeni
 *
 * Props:
 *   - label (string): Durum metni
 *   - color (string): Arka plan rengi
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { borderRadius, fontSize } from '../../theme';

export interface StatusChipProps {
  label: string;
  color: string;
}

const StatusChip: React.FC<StatusChipProps> = ({ label, color }) => {
  return (
    <View style={[styles.chip, { backgroundColor: color + '20' }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <Text style={[styles.text, { color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});

export default StatusChip;
