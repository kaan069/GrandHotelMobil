/**
 * ReportsScreen - Raporlar Ekranı
 *
 * Patron ve müdür için:
 *   - Günlük/Aylık kazanç (backend kazanc API'den)
 *   - Doluluk oranı (backend'den)
 *   - Bugünkü check-in/check-out listesi (backend'den)
 *   - Personel giriş-çıkış logu (henüz local)
 *   - Stok durumu (henüz local)
 *   - Arıza özeti (henüz local)
 *
 * Gelir ve doluluk verileri backend'deki kazanc app'inden gelir.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard } from '../../components/common';
import { colors, spacing, fontSize } from '../../theme';
import { kazancApi } from '../../services/api';

interface ReportsScreenProps {
  onClose: () => void;
}

interface StatBoxProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

const ReportsScreen: React.FC<ReportsScreenProps> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  /* Backend'den dashboard istatistiklerini çek */
  useEffect(() => {
    kazancApi.dashboardStats()
      .then((data) => { setStats(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const occ = stats?.occupancy;
  const rev = stats?.revenue;
  const checkins = stats?.todayCheckins || [];
  const checkouts = stats?.todayCheckouts || [];

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Raporlar</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* === Gelir Raporu === */}
          <Text style={styles.sectionTitle}>Gelir Raporu</Text>
          <View style={styles.statRow}>
            <StatBox
              icon="today-outline"
              label="Günlük Ciro"
              value={`${(rev?.dailyRevenue || 0).toLocaleString('tr-TR')} ₺`}
              color={colors.success}
            />
            <StatBox
              icon="calendar-outline"
              label="Aylık Ciro"
              value={`${(rev?.monthlyRevenue || 0).toLocaleString('tr-TR')} ₺`}
              color={colors.primary}
            />
          </View>

          {/* Aylık büyüme */}
          {rev?.monthlyGrowthPercent !== 0 && (
            <AppCard style={styles.growthCard}>
              <View style={styles.growthRow}>
                <Ionicons
                  name={rev?.monthlyGrowthPercent > 0 ? 'trending-up' : 'trending-down'}
                  size={20}
                  color={rev?.monthlyGrowthPercent > 0 ? colors.success : colors.error}
                />
                <Text style={[
                  styles.growthText,
                  { color: rev?.monthlyGrowthPercent > 0 ? colors.success : colors.error },
                ]}>
                  %{Math.abs(rev?.monthlyGrowthPercent || 0).toFixed(1)} {rev?.monthlyGrowthPercent > 0 ? 'artış' : 'düşüş'}
                </Text>
                <Text style={styles.growthSubtext}>geçen aya göre</Text>
              </View>
            </AppCard>
          )}

          {/* === Doluluk Raporu === */}
          <Text style={styles.sectionTitle}>Doluluk Oranı</Text>
          <AppCard style={styles.occupancyCard}>
            <View style={styles.occupancyRow}>
              <View style={styles.occupancyCircle}>
                <Text style={styles.occupancyValue}>%{occ?.occupancyRate || 0}</Text>
              </View>
              <View style={styles.occupancyInfo}>
                <Text style={styles.occupancyText}>
                  {occ?.occupiedRooms || 0} / {occ?.totalRooms || 0} oda dolu
                </Text>
                <Text style={styles.occupancySubtext}>
                  {occ?.availableRooms || 0} müsait · {occ?.dirtyRooms || 0} kirli · {occ?.maintenanceRooms || 0} bakımda
                </Text>
              </View>
            </View>
          </AppCard>

          {/* === Oda Tipi Dağılımı === */}
          <View style={styles.statRow}>
            <StatBox icon="bed-outline" label="Tek Kişilik" value={occ?.singleRooms || 0} color={colors.info} />
            <StatBox icon="bed-outline" label="Çift+" value={occ?.doubleRooms || 0} color={colors.primary} />
          </View>

          {/* === Bugünkü Check-in'ler === */}
          <Text style={styles.sectionTitle}>Bugünkü Girişler ({checkins.length})</Text>
          <AppCard>
            {checkins.length > 0 ? (
              checkins.map((item: any, index: number) => (
                <View key={index} style={[styles.logRow, index < checkins.length - 1 && styles.logDivider]}>
                  <View style={styles.logNameRow}>
                    <Ionicons name="log-in-outline" size={16} color={colors.success} />
                    <Text style={styles.logName}>{item.guest}</Text>
                  </View>
                  <View style={styles.logTimes}>
                    <Text style={styles.logRoom}>Oda {item.room}</Text>
                    <Text style={styles.logTimeText}>{item.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Bugün giriş yapan yok</Text>
            )}
          </AppCard>

          {/* === Bugünkü Check-out'lar === */}
          <Text style={styles.sectionTitle}>Bugünkü Çıkışlar ({checkouts.length})</Text>
          <AppCard>
            {checkouts.length > 0 ? (
              checkouts.map((item: any, index: number) => (
                <View key={index} style={[styles.logRow, index < checkouts.length - 1 && styles.logDivider]}>
                  <View style={styles.logNameRow}>
                    <Ionicons name="log-out-outline" size={16} color={colors.error} />
                    <Text style={styles.logName}>{item.guest}</Text>
                  </View>
                  <View style={styles.logTimes}>
                    <Text style={styles.logRoom}>Oda {item.room}</Text>
                    <Text style={styles.logTimeText}>{item.time}</Text>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Bugün çıkış yapan yok</Text>
            )}
          </AppCard>

          {/* === Ödeme Özeti === */}
          <Text style={styles.sectionTitle}>Ödeme Durumu (Bu Ay)</Text>
          <View style={styles.statRow}>
            <StatBox
              icon="cash-outline"
              label="Tahsilat"
              value={`${(rev?.monthlyPayments || 0).toLocaleString('tr-TR')} ₺`}
              color={colors.success}
            />
            <StatBox
              icon="alert-circle-outline"
              label="Bakiye"
              value={`${(rev?.monthlyBalance || 0).toLocaleString('tr-TR')} ₺`}
              color={rev?.monthlyBalance > 0 ? colors.error : colors.success}
            />
          </View>
        </ScrollView>
      )}
    </View>
  );
};

/** İstatistik kutusu bileşeni */
const StatBox: React.FC<StatBoxProps> = ({ icon, label, value, color }) => (
  <AppCard style={styles.statBox}>
    <Ionicons name={icon as any} size={24} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </AppCard>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
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
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  statValue: { fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.xs },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  growthCard: { marginTop: spacing.sm },
  growthRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  growthText: { fontSize: fontSize.md, fontWeight: '700' },
  growthSubtext: { fontSize: fontSize.xs, color: colors.textSecondary },
  occupancyCard: { marginBottom: spacing.sm },
  occupancyRow: { flexDirection: 'row', alignItems: 'center' },
  occupancyCircle: {
    width: 80, height: 80, borderRadius: 40,
    borderWidth: 4, borderColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginRight: spacing.md,
  },
  occupancyValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  occupancyInfo: { flex: 1 },
  occupancyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  occupancySubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  logName: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary },
  logTimes: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logRoom: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  logTimeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
});

export default ReportsScreen;
