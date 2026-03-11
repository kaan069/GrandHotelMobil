/**
 * ShiftsScreen - Mesailerim Ekranı
 *
 * QR kod okutularak kaydedilen mesai giriş/çıkış saatlerini gösterir.
 * Her personel kendi mesai geçmişini buradan takip edebilir.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { SHIFTS_STORAGE_KEY } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

export interface ShiftEntry {
  id: number;
  staffNumber: string;
  staffName: string;
  type: 'entry' | 'exit';
  timestamp: string;
}

interface ShiftsScreenProps {
  onClose: () => void;
}

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [shifts, setShifts] = useState<ShiftEntry[]>([]);

  useEffect(() => {
    loadShifts();
  }, []);

  const loadShifts = async () => {
    try {
      const stored = await AsyncStorage.getItem(SHIFTS_STORAGE_KEY);
      if (stored) {
        const all: ShiftEntry[] = JSON.parse(stored);
        const myShifts = all.filter((s) => s.staffNumber === user?.staffNumber);
        setShifts(myShifts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
      }
    } catch {
      /* Storage hatası */
    }
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
  };

  const formatTime = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  /** Günlük grupla */
  const groupedByDate = shifts.reduce<Record<string, ShiftEntry[]>>((acc, shift) => {
    const date = formatDate(shift.timestamp);
    if (!acc[date]) acc[date] = [];
    acc[date].push(shift);
    return acc;
  }, {});

  const dateKeys = Object.keys(groupedByDate);

  /* Bugünün mesai özeti */
  const today = formatDate(new Date().toISOString());
  const todayShifts = groupedByDate[today] || [];
  const todayEntry = todayShifts.find((s) => s.type === 'entry');
  const todayExit = todayShifts.find((s) => s.type === 'exit');

  /* Aylık toplam hesapla */
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();
  const monthShifts = shifts.filter((s) => {
    const d = new Date(s.timestamp);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });
  const monthEntryCount = monthShifts.filter((s) => s.type === 'entry').length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mesailerim</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Bugün Özeti */}
      <View style={styles.summaryRow}>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="log-in-outline" size={24} color={colors.success} />
          <Text style={styles.summaryLabel}>Giriş</Text>
          <Text style={styles.summaryValue}>
            {todayEntry ? formatTime(todayEntry.timestamp) : '--:--'}
          </Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="log-out-outline" size={24} color={colors.error} />
          <Text style={styles.summaryLabel}>Çıkış</Text>
          <Text style={styles.summaryValue}>
            {todayExit ? formatTime(todayExit.timestamp) : '--:--'}
          </Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.summaryLabel}>Bu Ay</Text>
          <Text style={styles.summaryValue}>{monthEntryCount} gün</Text>
        </AppCard>
      </View>

      {/* Mesai Geçmişi */}
      <Text style={styles.sectionTitle}>Mesai Geçmişi</Text>

      <FlatList
        data={dateKeys}
        keyExtractor={(item) => item}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Henüz mesai kaydı yok"
          />
        }
        renderItem={({ item: date }) => {
          const dayShifts = groupedByDate[date];
          const entry = dayShifts.find((s) => s.type === 'entry');
          const exit = dayShifts.find((s) => s.type === 'exit');

          return (
            <AppCard style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar" size={16} color={colors.primary} />
                  <Text style={styles.dateText}>{date}</Text>
                </View>
                {date === today && (
                  <View style={styles.todayBadge}>
                    <Text style={styles.todayText}>Bugün</Text>
                  </View>
                )}
              </View>

              <View style={styles.shiftRow}>
                <View style={styles.shiftItem}>
                  <Ionicons name="log-in-outline" size={18} color={colors.success} />
                  <Text style={styles.shiftLabel}>Giriş:</Text>
                  <Text style={styles.shiftTime}>
                    {entry ? formatTime(entry.timestamp) : '-'}
                  </Text>
                </View>
                <View style={styles.shiftItem}>
                  <Ionicons name="log-out-outline" size={18} color={colors.error} />
                  <Text style={styles.shiftLabel}>Çıkış:</Text>
                  <Text style={styles.shiftTime}>
                    {exit ? formatTime(exit.timestamp) : '-'}
                  </Text>
                </View>
              </View>
            </AppCard>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: 4,
  },
  summaryLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  dayCard: {
    marginBottom: spacing.sm,
  },
  dayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  todayBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  todayText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  shiftRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  shiftItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shiftLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  shiftTime: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
});

export default ShiftsScreen;
