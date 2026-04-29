/**
 * ShiftsScreen - Mesailerim Ekranı
 *
 * Backend'deki Attendance kayıtlarından mesai geçmişini gösterir.
 * QR ile giriş/çıkış yapıldığında backend'e Attendance kaydı işlenir.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { attendanceApi, type ApiAttendanceLog } from '../../services/api';
import useAuth from '../../hooks/useAuth';

/** QRScreen ile uyumlu olabilmek için legacy tip — başka yerden import ediliyor */
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

const formatDateTr = (iso: string): string => {
  const d = new Date(iso + 'T00:00:00');
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

const todayIso = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
};

const formatHm = (t: string | null): string => {
  if (!t) return '--:--';
  const parts = t.split(':');
  return parts.length >= 2 ? `${parts[0]}:${parts[1]}` : t;
};

const STATUS_LABELS: Record<string, string> = {
  present: 'Geldi',
  absent: 'Gelmedi',
  leave: 'İzinli',
  day_off: 'Hafta Tatili',
};

const STATUS_COLORS: Record<string, string> = {
  present: '#22C55E',
  absent: '#EF4444',
  leave: '#3B82F6',
  day_off: '#94A3B8',
};

const ShiftsScreen: React.FC<ShiftsScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<ApiAttendanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await attendanceApi.getForEmployee(user.id);
      data.sort((a, b) => b.date.localeCompare(a.date));
      setLogs(data);
    } catch (err: any) {
      setError(err?.message || 'Mesai kayıtları yüklenemedi');
      setLogs([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  /* Bugünün özeti */
  const today = todayIso();
  const todayLog = logs.find((l) => l.date === today);

  /* Bu ay — geldiği gün sayısı (status='present') */
  const now = new Date();
  const yyyymm = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}`;
  const monthLogs = logs.filter((l) => l.date.startsWith(yyyymm));
  const monthPresentDays = monthLogs.filter((l) => l.status === 'present').length;

  /* Toplam çalışma saati (bu ay) */
  const monthTotalHours = monthLogs.reduce((sum, l) => {
    return sum + (l.workedHours ? Number(l.workedHours) : 0);
  }, 0);

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Mesailerim</Text>
          <View style={{ width: 28 }} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Mesailerim</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Ionicons name="refresh" size={22} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Bugün Özeti */}
      <View style={styles.summaryRow}>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="log-in-outline" size={24} color="#22C55E" />
          <Text style={styles.summaryLabel}>Giriş</Text>
          <Text style={styles.summaryValue}>{formatHm(todayLog?.checkInTime ?? null)}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="log-out-outline" size={24} color="#EF4444" />
          <Text style={styles.summaryLabel}>Çıkış</Text>
          <Text style={styles.summaryValue}>{formatHm(todayLog?.checkOutTime ?? null)}</Text>
        </AppCard>
        <AppCard style={styles.summaryCard}>
          <Ionicons name="calendar-outline" size={24} color={colors.primary} />
          <Text style={styles.summaryLabel}>Bu Ay</Text>
          <Text style={styles.summaryValue}>{monthPresentDays} gün</Text>
        </AppCard>
      </View>

      {/* Toplam çalışma saati */}
      {monthTotalHours > 0 && (
        <View style={styles.totalHoursRow}>
          <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
          <Text style={styles.totalHoursText}>
            Bu ay toplam çalışma: <Text style={styles.totalHoursValue}>{monthTotalHours.toFixed(1)} saat</Text>
          </Text>
        </View>
      )}

      <Text style={styles.sectionTitle}>Mesai Geçmişi</Text>

      <FlatList
        data={logs}
        keyExtractor={(item) => item.date}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <EmptyState
            icon="time-outline"
            title="Henüz mesai kaydı yok"
            description="QR ile giriş yaptığında burada görünecek"
          />
        }
        renderItem={({ item }) => {
          const isToday = item.date === today;
          const statusColor = STATUS_COLORS[item.status] || colors.textSecondary;
          return (
            <AppCard style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <View style={styles.dateRow}>
                  <Ionicons name="calendar" size={16} color={colors.primary} />
                  <Text style={styles.dateText}>{formatDateTr(item.date)}</Text>
                </View>
                <View style={styles.headerRight}>
                  <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {STATUS_LABELS[item.status] || item.status}
                    </Text>
                  </View>
                  {isToday && (
                    <View style={styles.todayBadge}>
                      <Text style={styles.todayText}>Bugün</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.shiftRow}>
                <View style={styles.shiftItem}>
                  <Ionicons name="log-in-outline" size={18} color="#22C55E" />
                  <Text style={styles.shiftLabel}>Giriş:</Text>
                  <Text style={styles.shiftTime}>{formatHm(item.checkInTime)}</Text>
                </View>
                <View style={styles.shiftItem}>
                  <Ionicons name="log-out-outline" size={18} color="#EF4444" />
                  <Text style={styles.shiftLabel}>Çıkış:</Text>
                  <Text style={styles.shiftTime}>{formatHm(item.checkOutTime)}</Text>
                </View>
                {item.workedHours && (
                  <View style={styles.shiftItem}>
                    <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                    <Text style={styles.shiftTime}>{Number(item.workedHours).toFixed(1)} sa</Text>
                  </View>
                )}
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.error + '15',
    borderRadius: borderRadius.md,
  },
  errorText: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.error,
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
  totalHoursRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  totalHoursText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  totalHoursValue: {
    fontWeight: '700',
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
    flexGrow: 1,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  statusText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
  },
  todayBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  todayText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.primary,
  },
  shiftRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
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
