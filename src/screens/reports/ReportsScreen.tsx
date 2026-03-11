/**
 * ReportsScreen - Raporlar Ekranı
 *
 * Patron ve müdür için:
 *   - Günlük/Aylık kazanç
 *   - Personel giriş-çıkış logu
 *   - Stok durumu
 *   - Arıza özeti
 *   - Doluluk oranı
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { AppCard, AppHeader } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface StaffLog {
  name: string;
  checkIn: string;
  checkOut: string;
}

interface ReportData {
  dailyRevenue: number;
  monthlyRevenue: number;
  occupancyRate: number;
  totalRooms: number;
  occupiedRooms: number;
  totalFaults: number;
  openFaults: number;
  resolvedFaults: number;
  totalStaff: number;
  activeStaff: number;
  lowStockItems: number;
  staffLogs: StaffLog[];
}

interface ReportsScreenProps {
  onClose: () => void;
}

interface StatBoxProps {
  icon: string;
  label: string;
  value: string | number;
  color: string;
}

/** Mock rapor verileri */
const REPORT_DATA: ReportData = {
  dailyRevenue: 28500,
  monthlyRevenue: 425000,
  occupancyRate: 71.1,
  totalRooms: 45,
  occupiedRooms: 32,
  totalFaults: 12,
  openFaults: 3,
  resolvedFaults: 9,
  totalStaff: 6,
  activeStaff: 5,
  lowStockItems: 2,
  staffLogs: [
    { name: 'Mehmet Demir', checkIn: '08:00', checkOut: '17:30' },
    { name: 'Ayşe Kaya', checkIn: '07:45', checkOut: '---' },
    { name: 'Hasan Şahin', checkIn: '06:30', checkOut: '---' },
    { name: 'Zeynep Arslan', checkIn: '07:00', checkOut: '---' },
    { name: 'Ali Öztürk', checkIn: '08:15', checkOut: '17:00' },
  ],
};

const ReportsScreen: React.FC<ReportsScreenProps> = ({ onClose }) => {
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

      <ScrollView contentContainerStyle={styles.content}>
        {/* === Gelir Raporu === */}
        <Text style={styles.sectionTitle}>Gelir Raporu</Text>
        <View style={styles.statRow}>
          <StatBox
            icon="today-outline"
            label="Günlük Ciro"
            value={`${REPORT_DATA.dailyRevenue.toLocaleString('tr-TR')} ₺`}
            color={colors.success}
          />
          <StatBox
            icon="calendar-outline"
            label="Aylık Ciro"
            value={`${REPORT_DATA.monthlyRevenue.toLocaleString('tr-TR')} ₺`}
            color={colors.primary}
          />
        </View>

        {/* === Doluluk Raporu === */}
        <Text style={styles.sectionTitle}>Doluluk Oranı</Text>
        <AppCard style={styles.occupancyCard}>
          <View style={styles.occupancyRow}>
            <View style={styles.occupancyCircle}>
              <Text style={styles.occupancyValue}>%{REPORT_DATA.occupancyRate}</Text>
            </View>
            <View style={styles.occupancyInfo}>
              <Text style={styles.occupancyText}>{REPORT_DATA.occupiedRooms} / {REPORT_DATA.totalRooms} oda dolu</Text>
              <Text style={styles.occupancySubtext}>{REPORT_DATA.totalRooms - REPORT_DATA.occupiedRooms} oda müsait</Text>
            </View>
          </View>
        </AppCard>

        {/* === Arıza Raporu === */}
        <Text style={styles.sectionTitle}>Arıza Durumu</Text>
        <View style={styles.statRow}>
          <StatBox icon="warning-outline" label="Açık" value={REPORT_DATA.openFaults} color={colors.error} />
          <StatBox icon="checkmark-circle-outline" label="Çözülen" value={REPORT_DATA.resolvedFaults} color={colors.success} />
          <StatBox icon="construct-outline" label="Toplam" value={REPORT_DATA.totalFaults} color={colors.info} />
        </View>

        {/* === Personel Giriş/Çıkış Logu === */}
        <Text style={styles.sectionTitle}>Personel Giriş/Çıkış (Bugün)</Text>
        <AppCard>
          {REPORT_DATA.staffLogs.map((log, index) => (
            <View key={index} style={[styles.logRow, index < REPORT_DATA.staffLogs.length - 1 && styles.logDivider]}>
              <Text style={styles.logName}>{log.name}</Text>
              <View style={styles.logTimes}>
                <View style={styles.logTime}>
                  <Ionicons name="log-in-outline" size={14} color={colors.success} />
                  <Text style={styles.logTimeText}>{log.checkIn}</Text>
                </View>
                <View style={styles.logTime}>
                  <Ionicons name="log-out-outline" size={14} color={colors.error} />
                  <Text style={styles.logTimeText}>{log.checkOut}</Text>
                </View>
              </View>
            </View>
          ))}
        </AppCard>

        {/* === Stok Uyarısı === */}
        <Text style={styles.sectionTitle}>Stok Durumu</Text>
        <AppCard>
          <View style={styles.stockAlert}>
            <Ionicons name="alert-circle" size={24} color={colors.warning} />
            <Text style={styles.stockAlertText}>
              {REPORT_DATA.lowStockItems} ürün minimum stok seviyesinin altında
            </Text>
          </View>
        </AppCard>
      </ScrollView>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  statRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  statValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    marginTop: spacing.xs,
  },
  statLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  occupancyCard: {
    marginBottom: spacing.sm,
  },
  occupancyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  occupancyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  occupancyValue: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.primary,
  },
  occupancyInfo: {
    flex: 1,
  },
  occupancyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  occupancySubtext: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  logRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  logDivider: {
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  logName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    flex: 1,
  },
  logTimes: {
    flexDirection: 'row',
    gap: 16,
  },
  logTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logTimeText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  stockAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  stockAlertText: {
    fontSize: fontSize.md,
    color: colors.warning,
    fontWeight: '500',
    flex: 1,
  },
});

export default ReportsScreen;
