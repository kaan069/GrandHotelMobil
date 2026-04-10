/**
 * ReportsScreen - Raporlar Ekranı
 *
 * Patron ve müdür için:
 *   - Günlük/Aylık kazanç (backend kazanc API'den)
 *   - Folio kategori dağılımı
 *   - Doluluk oranı (backend'den)
 *   - Dolu oda detayları (folio toplamlarıyla)
 *   - Bugünkü check-in/check-out listesi
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../../components/common';
import { colors, spacing, fontSize } from '../../theme';
import { kazancApi, staffApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import GeneralReportScreen from './GeneralReportScreen';

interface StatBoxProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

const FOLIO_LABELS: Record<string, string> = {
  room_charge: 'Oda Ücreti',
  minibar: 'Minibar',
  restaurant: 'Restoran',
  service: 'Hizmet',
  discount: 'İndirim',
  payment: 'Ödeme',
};

const ReportsScreen: React.FC<{ onClose?: () => void }> = () => {
  const [showGeneralReport, setShowGeneralReport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [daily, setDaily] = useState<any>(null);
  const [totalSalaries, setTotalSalaries] = useState(0);
  const [salaryEmployeeCount, setSalaryEmployeeCount] = useState(0);

  const { user } = useAuth();
  const isManagement =
    user?.role === ROLES.PATRON ||
    user?.role === ROLES.MANAGER ||
    (user?.roles && user.roles.some((r) => r === ROLES.PATRON || r === ROLES.MANAGER));

  const fetchData = useCallback(async () => {
    try {
      const promises: Promise<any>[] = [
        kazancApi.dashboardStats(),
        kazancApi.dailySummary(),
      ];
      if (isManagement) {
        promises.push(staffApi.getAll());
      }
      const [statsData, dailyData, staffData] = await Promise.all(promises);
      setStats(statsData);
      setDaily(dailyData);
      if (isManagement && staffData) {
        const active = (staffData as any[]).filter((e) => e.status === 'active');
        const sum = active.reduce((s, e) => s + Number(e.salary || 0), 0);
        setTotalSalaries(sum);
        setSalaryEmployeeCount(active.filter((e) => e.salary && Number(e.salary) > 0).length);
      }
    } catch (err) {
      console.error('Rapor verisi yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isManagement]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const occ = stats?.occupancy;
  const rev = stats?.revenue;
  const checkins = stats?.todayCheckins || [];
  const checkouts = stats?.todayCheckouts || [];
  const folioBreakdown = daily?.folioBreakdown || {};
  const occupiedRooms = daily?.occupiedRoomDetails || [];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Raporlar yükleniyor...</Text>
      </View>
    );
  }

  if (showGeneralReport) {
    return <GeneralReportScreen onClose={() => setShowGeneralReport(false)} />;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Raporlar</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
      >
        {/* Genel Rapor Butonu */}
        <AppButton
          title="Genel Rapor (Aylık Detay)"
          onPress={() => setShowGeneralReport(true)}
          icon="bar-chart-outline"
          style={{ marginBottom: spacing.md }}
        />

        {/* === Sabit Giderler — sadece patron/müdür === */}
        {isManagement && (
          <>
            <Text style={styles.sectionTitle}>Sabit Giderler (Aylık)</Text>
            <AppCard style={styles.fixedExpenseCard}>
              <View style={styles.fixedExpenseRow}>
                <View style={styles.fixedExpenseIcon}>
                  <Ionicons name="people-outline" size={24} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fixedExpenseLabel}>Eleman Maaşları</Text>
                  <Text style={styles.fixedExpenseSubtext}>
                    {salaryEmployeeCount} aktif eleman
                  </Text>
                </View>
                <Text style={styles.fixedExpenseValue}>
                  {totalSalaries.toLocaleString('tr-TR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} ₺
                </Text>
              </View>
            </AppCard>
          </>
        )}

        {/* === Gelir Raporu === */}
        <Text style={styles.sectionTitle}>Gelir Raporu</Text>
        <View style={styles.statRow}>
          <StatBox icon="today-outline" label="Günlük Ciro" value={`${(rev?.dailyRevenue || 0).toLocaleString('tr-TR')} ₺`} color={colors.success} />
          <StatBox icon="calendar-outline" label="Aylık Ciro" value={`${(rev?.monthlyRevenue || 0).toLocaleString('tr-TR')} ₺`} color={colors.primary} />
        </View>

        {rev?.monthlyGrowthPercent !== 0 && (
          <AppCard style={styles.growthCard}>
            <View style={styles.growthRow}>
              <Ionicons
                name={rev?.monthlyGrowthPercent > 0 ? 'trending-up' : 'trending-down'}
                size={20}
                color={rev?.monthlyGrowthPercent > 0 ? colors.success : colors.error}
              />
              <Text style={[styles.growthText, { color: rev?.monthlyGrowthPercent > 0 ? colors.success : colors.error }]}>
                %{Math.abs(rev?.monthlyGrowthPercent || 0).toFixed(1)} {rev?.monthlyGrowthPercent > 0 ? 'artış' : 'düşüş'}
              </Text>
              <Text style={styles.growthSubtext}>geçen aya göre</Text>
            </View>
          </AppCard>
        )}

        {/* === Folio Kategori Dağılımı === */}
        {Object.keys(folioBreakdown).length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Günlük Folio Dağılımı</Text>
            <View style={styles.folioGrid}>
              {Object.entries(folioBreakdown).map(([cat, amount]) => (
                <AppCard key={cat} style={styles.folioBox}>
                  <Text style={styles.folioLabel}>{FOLIO_LABELS[cat] || cat}</Text>
                  <Text style={[styles.folioValue, { color: cat === 'payment' ? colors.success : cat === 'discount' ? colors.warning : colors.primary }]}>
                    {(amount as number).toLocaleString('tr-TR')} ₺
                  </Text>
                </AppCard>
              ))}
            </View>
          </>
        )}

        {/* === Ödeme Özeti === */}
        <Text style={styles.sectionTitle}>Ödeme Durumu (Bu Ay)</Text>
        <View style={styles.statRow}>
          <StatBox icon="cash-outline" label="Tahsilat" value={`${(rev?.monthlyPayments || 0).toLocaleString('tr-TR')} ₺`} color={colors.success} />
          <StatBox icon="alert-circle-outline" label="Bakiye" value={`${(rev?.monthlyBalance || 0).toLocaleString('tr-TR')} ₺`} color={rev?.monthlyBalance > 0 ? colors.error : colors.success} />
        </View>

        {/* === Doluluk === */}
        <Text style={styles.sectionTitle}>Doluluk Oranı</Text>
        <AppCard style={styles.occupancyCard}>
          <View style={styles.occupancyRow}>
            <View style={styles.occupancyCircle}>
              <Text style={styles.occupancyValue}>%{occ?.occupancyRate || 0}</Text>
            </View>
            <View style={styles.occupancyInfo}>
              <Text style={styles.occupancyText}>{occ?.occupiedRooms || 0} / {occ?.totalRooms || 0} oda dolu</Text>
              <Text style={styles.occupancySubtext}>
                {occ?.availableRooms || 0} müsait · {occ?.dirtyRooms || 0} kirli · {occ?.maintenanceRooms || 0} bakımda
              </Text>
            </View>
          </View>
        </AppCard>

        <View style={styles.statRow}>
          <StatBox icon="bed-outline" label="Tek Kişilik Dolu" value={daily?.occupancy?.singleOccupied || 0} color={colors.info} />
          <StatBox icon="bed-outline" label="Çift Kişilik Dolu" value={daily?.occupancy?.doubleOccupied || 0} color={colors.primary} />
        </View>

        {/* === Dolu Oda Detayları === */}
        {occupiedRooms.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Dolu Odalar ({occupiedRooms.length})</Text>
            {occupiedRooms.map((r: any, i: number) => (
              <AppCard key={i} style={styles.roomCard}>
                <View style={styles.roomRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.roomNumber}>Oda {r.roomNumber}</Text>
                    <Text style={styles.roomGuest}>{r.guestName}</Text>
                    {r.companyName && <Text style={styles.roomCompany}>{r.companyName}</Text>}
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.roomAmount}>{r.totalAmount.toLocaleString('tr-TR')} ₺</Text>
                    <Text style={[styles.roomBalance, { color: r.balance > 0 ? colors.error : colors.success }]}>
                      Bakiye: {r.balance.toLocaleString('tr-TR')} ₺
                    </Text>
                  </View>
                </View>
              </AppCard>
            ))}
          </>
        )}

        {/* === Giriş-Çıkış === */}
        <Text style={styles.sectionTitle}>Bugünkü Girişler ({checkins.length})</Text>
        <AppCard>
          {checkins.length > 0 ? checkins.map((item: any, index: number) => (
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
          )) : <Text style={styles.emptyText}>Bugün giriş yapan yok</Text>}
        </AppCard>

        <Text style={styles.sectionTitle}>Bugünkü Çıkışlar ({checkouts.length})</Text>
        <AppCard>
          {checkouts.length > 0 ? checkouts.map((item: any, index: number) => (
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
          )) : <Text style={styles.emptyText}>Bugün çıkış yapan yok</Text>}
        </AppCard>
      </ScrollView>
    </View>
  );
};

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
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    alignItems: 'center',
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
  loadingText: { fontSize: fontSize.md, color: colors.textSecondary, marginTop: spacing.md },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  sectionTitle: {
    fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary,
    marginTop: spacing.md, marginBottom: spacing.sm,
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
    justifyContent: 'center', alignItems: 'center', marginRight: spacing.md,
  },
  occupancyValue: { fontSize: fontSize.xl, fontWeight: '700', color: colors.primary },
  occupancyInfo: { flex: 1 },
  occupancyText: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  occupancySubtext: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  folioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  folioBox: { width: '47%' as any, alignItems: 'center', paddingVertical: spacing.sm },
  folioLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  folioValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
  roomCard: { marginBottom: spacing.xs },
  roomRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roomNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomGuest: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  roomCompany: { fontSize: fontSize.xs, color: colors.primary, marginTop: 1 },
  roomAmount: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  roomBalance: { fontSize: fontSize.sm, fontWeight: '600', marginTop: 2 },
  logRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  logDivider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  logNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  logName: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary },
  logTimes: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  logRoom: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600' },
  logTimeText: { fontSize: fontSize.sm, color: colors.textSecondary },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.md, fontStyle: 'italic' },
  fixedExpenseCard: { marginBottom: spacing.sm },
  fixedExpenseRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  fixedExpenseIcon: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  fixedExpenseLabel: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  fixedExpenseSubtext: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  fixedExpenseValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.error },
});

export default ReportsScreen;
