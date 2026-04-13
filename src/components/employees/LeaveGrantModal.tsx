/**
 * LeaveGrantModal — Mobil İzin Verme Modalı
 *
 * Patron/müdür bir elemana izin vermek için kullanır.
 * Web'deki LeaveDialog'un mobil karşılığı.
 *
 * Özellikler:
 *   - İzin tipi seçimi (haftalık, yıllık, günlük, ücretsiz)
 *   - Tarih aralığı girişi
 *   - Not alanı
 *   - Haftalık izin bu hafta kullanılmışsa uyarı + yıllıktan düşüm seçeneği
 *   - Yıllık izin bakiye kontrolü
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

const LEAVE_TYPES: { value: string; label: string; icon: string }[] = [
  { value: 'weekly', label: 'Haftalık İzin', icon: 'calendar-outline' },
  { value: 'annual', label: 'Yıllık İzin', icon: 'sunny-outline' },
  { value: 'daily', label: 'Günlük İzin', icon: 'today-outline' },
  { value: 'unpaid', label: 'Ücretsiz İzin', icon: 'remove-circle-outline' },
];

interface LeaveGrantModalProps {
  onClose: () => void;
  onSave: (data: {
    employeeId: number;
    leaveType: string;
    startDate: string;
    endDate: string;
    deductFromAnnual: boolean;
    note: string;
  }) => void;
  employee: {
    id: number;
    fullName: string;
    hasWeeklyLeaveThisWeek?: boolean;
    remainingAnnualLeave?: number;
    annualLeaveEntitlement?: number;
    weeklyLeaveRemaining?: number;
  };
}

const LeaveGrantModal: React.FC<LeaveGrantModalProps> = ({ onClose, onSave, employee }) => {
  const today = new Date().toISOString().split('T')[0];
  const [leaveType, setLeaveType] = useState('weekly');
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [note, setNote] = useState('');
  const [deductFromAnnual, setDeductFromAnnual] = useState(false);

  const showWeeklyWarning = leaveType === 'weekly' && employee.hasWeeklyLeaveThisWeek;
  const remainingAnnual = employee.remainingAnnualLeave ?? 0;
  const entitlement = employee.annualLeaveEntitlement ?? 0;
  const weeklyRemaining = employee.weeklyLeaveRemaining ?? 0;

  // Gün sayısı hesapla
  const duration = (() => {
    if (!startDate || !endDate) return 0;
    const s = new Date(startDate).getTime();
    const e = new Date(endDate).getTime();
    return Math.max(0, Math.floor((e - s) / 86400000) + 1);
  })();

  const handleSubmit = () => {
    if (!startDate || !endDate) {
      Alert.alert('Hata', 'Tarih alanları zorunlu');
      return;
    }
    if (startDate > endDate) {
      Alert.alert('Hata', 'Bitiş tarihi başlangıçtan önce olamaz');
      return;
    }

    const shouldDeduct = showWeeklyWarning ? deductFromAnnual : (leaveType === 'annual' || leaveType === 'daily');

    // Yıllık bakiye kontrolü
    if (shouldDeduct && duration > remainingAnnual) {
      Alert.alert('Hata', `Yetersiz yıllık izin. Kalan: ${remainingAnnual} gün, talep: ${duration} gün`);
      return;
    }

    onSave({
      employeeId: employee.id,
      leaveType,
      startDate,
      endDate,
      deductFromAnnual: shouldDeduct,
      note,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>İzin Ver</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Eleman bilgisi */}
        <View style={styles.infoCard}>
          <Ionicons name="person" size={20} color={colors.primary} />
          <Text style={styles.infoName}>{employee.fullName}</Text>
        </View>

        {/* Bakiye bilgisi */}
        <View style={styles.balanceRow}>
          <View style={[styles.balanceBox, { backgroundColor: '#EFF6FF' }]}>
            <Text style={styles.balanceLabel}>Yıllık İzin</Text>
            <Text style={[styles.balanceValue, { color: colors.primary }]}>{remainingAnnual}/{entitlement}</Text>
          </View>
          <View style={[styles.balanceBox, { backgroundColor: '#F0FDF4' }]}>
            <Text style={styles.balanceLabel}>Haftalık İzin</Text>
            <Text style={[styles.balanceValue, { color: colors.success }]}>{weeklyRemaining} gün</Text>
          </View>
        </View>

        {/* İzin tipi seçimi */}
        <Text style={styles.label}>İzin Tipi</Text>
        <View style={styles.typeGrid}>
          {LEAVE_TYPES.map((t) => {
            const isSelected = leaveType === t.value;
            return (
              <TouchableOpacity
                key={t.value}
                style={[styles.typeChip, isSelected && styles.typeChipActive]}
                onPress={() => { setLeaveType(t.value); setDeductFromAnnual(false); }}
              >
                <Ionicons name={t.icon as any} size={16} color={isSelected ? colors.primary : colors.textSecondary} />
                <Text style={[styles.typeText, isSelected && styles.typeTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Haftalık izin uyarısı */}
        {showWeeklyWarning && (
          <View style={styles.warningBox}>
            <Ionicons name="warning" size={18} color="#D97706" />
            <Text style={styles.warningText}>Bu hafta zaten haftalık izin kullanılmış.</Text>
            <View style={styles.switchRow}>
              <Switch
                value={deductFromAnnual}
                onValueChange={setDeductFromAnnual}
                trackColor={{ true: colors.primary }}
              />
              <Text style={styles.switchLabel}>Yıllık izinden düşülsün</Text>
            </View>
          </View>
        )}

        {/* Tarih aralığı */}
        <AppInput
          label="Başlangıç Tarihi"
          value={startDate}
          onChangeText={setStartDate}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
        />
        <AppInput
          label="Bitiş Tarihi"
          value={endDate}
          onChangeText={setEndDate}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
        />

        {duration > 0 && (
          <Text style={styles.durationText}>{duration} gün izin</Text>
        )}

        {/* Not */}
        <AppInput
          label="Not (Opsiyonel)"
          value={note}
          onChangeText={setNote}
          placeholder="İzin sebebi..."
          icon="chatbubble-outline"
          multiline
        />

        {/* Kaydet */}
        <AppButton
          title="İzin Ver"
          onPress={handleSubmit}
          icon="checkmark-circle-outline"
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  infoCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: spacing.sm, backgroundColor: colors.primary + '10',
    borderRadius: borderRadius.md, marginBottom: spacing.md,
  },
  infoName: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary },
  balanceRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  balanceBox: {
    flex: 1, padding: spacing.sm, borderRadius: borderRadius.md, alignItems: 'center',
  },
  balanceLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  balanceValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 8 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: borderRadius.full, backgroundColor: colors.surface,
    borderWidth: 1.5, borderColor: colors.border,
  },
  typeChipActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  typeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  typeTextActive: { color: colors.primary, fontWeight: '600' },
  warningBox: {
    padding: spacing.sm, backgroundColor: '#FFFBEB',
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: '#FDE68A',
    marginBottom: spacing.md,
  },
  warningText: { fontSize: fontSize.sm, color: '#92400E', marginLeft: 24, marginTop: -18, marginBottom: 8 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  switchLabel: { fontSize: fontSize.sm, color: colors.textPrimary },
  durationText: {
    fontSize: fontSize.sm, fontWeight: '600', color: colors.primary,
    textAlign: 'center', marginBottom: spacing.sm,
  },
  submitButton: { marginTop: spacing.sm },
});

export default LeaveGrantModal;
