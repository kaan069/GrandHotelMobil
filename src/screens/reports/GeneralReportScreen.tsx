/**
 * GeneralReportScreen - Genel Rapor (Mobil)
 *
 * Ay seçimi ile detaylı ciro, satış sayıları, oda tipi dağılımı,
 * firma/bireysel dağılımı, folio kategori dağılımı.
 * API: kazancApi.advancedReport(filters)
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

const MONTHS = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];

const BED_LABELS: Record<string, string> = {
  single: 'Tek Kişilik', double: 'Çift Kişilik', twin: 'Twin', king: 'King',
};

const FOLIO_LABELS: Record<string, string> = {
  room_charge: 'Oda Ücreti', minibar: 'Minibar', restaurant: 'Restoran',
  service: 'Hizmet', discount: 'İndirim', payment: 'Ödeme',
};

interface Props {
  onClose: () => void;
}

const GeneralReportScreen: React.FC<Props> = ({ onClose }) => {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth()); // 0-indexed
  const [year] = useState(now.getFullYear());
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const m = String(month + 1).padStart(2, '0');
    const lastDay = new Date(year, month + 1, 0).getDate();
    const dateFrom = `${year}-${m}-01`;
    const dateTo = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;

    kazancApi.advancedReport({ dateFrom, dateTo, includeDebtors: false })
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [month, year]);

  const summary = data?.summary || {};
  const sales = data?.salesCounts || {};
  const byCompany = summary.byCompany || [];
  const byCategory = summary.byCategory || {};
  const byBedRevenue = summary.byBedType || {};
  const byBedCount = sales.byBedType || {};

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Genel Rapor</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Ay Seçici */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.monthBar} contentContainerStyle={{ paddingHorizontal: spacing.sm }}>
        {MONTHS.map((name, i) => (
          <TouchableOpacity
            key={i}
            onPress={() => setMonth(i)}
            style={[styles.monthChip, month === i && styles.monthChipActive]}
          >
            <Text style={[styles.monthText, month === i && styles.monthTextActive]}>{name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {/* Ciro */}
          <Text style={styles.section}>Ciro Özeti</Text>
          <View style={styles.row}>
            <StatBox icon="cash-outline" label="Toplam Gelir" value={`${(summary.totalRevenue || 0).toLocaleString('tr-TR')} ₺`} color={colors.success} />
            <StatBox icon="card-outline" label="Tahsilat" value={`${(summary.totalPayments || 0).toLocaleString('tr-TR')} ₺`} color={colors.primary} />
          </View>
          <View style={styles.row}>
            <StatBox icon="alert-circle-outline" label="Bakiye" value={`${(summary.totalBalance || 0).toLocaleString('tr-TR')} ₺`} color={summary.totalBalance > 0 ? colors.error : colors.success} />
            <StatBox icon="bed-outline" label="Konaklama" value={data?.reservationCount || 0} color="#6A1B9A" />
          </View>

          {/* Satış Sayıları */}
          <Text style={styles.section}>Satış Detayları</Text>
          <View style={styles.row}>
            <StatBox icon="business-outline" label="Firma" value={sales.companyReservations || 0} color={colors.primary} />
            <StatBox icon="person-outline" label="Bireysel" value={sales.individualReservations || 0} color="#FF6F00" />
          </View>
          <View style={styles.row}>
            <StatBox icon="home-outline" label="Farklı Oda" value={sales.uniqueRooms || 0} color="#6A1B9A" />
            <StatBox icon="people-outline" label="Farklı Misafir" value={sales.uniqueGuests || 0} color="#00695C" />
          </View>

          {/* Oda Tipi Dağılımı */}
          <Text style={styles.section}>Oda Tipi Dağılımı</Text>
          <AppCard>
            {Object.keys({ ...byBedCount, ...byBedRevenue }).map((bt, i, arr) => (
              <View key={bt} style={[styles.tableRow, i < arr.length - 1 && styles.divider]}>
                <Text style={styles.tableLabel}>{BED_LABELS[bt] || bt}</Text>
                <Text style={styles.tableCount}>{byBedCount[bt] || 0} adet</Text>
                <Text style={styles.tableAmount}>{(byBedRevenue[bt] || 0).toLocaleString('tr-TR')} ₺</Text>
              </View>
            ))}
          </AppCard>

          {/* Firma Dağılımı */}
          {byCompany.length > 0 && (
            <>
              <Text style={styles.section}>Firma / Bireysel</Text>
              <AppCard>
                {byCompany.map((c: any, i: number) => (
                  <View key={i} style={[styles.tableRow, i < byCompany.length - 1 && styles.divider]}>
                    <Text style={[styles.tableLabel, { flex: 1 }]}>{c.name}</Text>
                    <Text style={styles.tableAmount}>{(c.revenue || 0).toLocaleString('tr-TR')} ₺</Text>
                  </View>
                ))}
              </AppCard>
            </>
          )}

          {/* Folio Dağılımı */}
          {Object.keys(byCategory).length > 0 && (
            <>
              <Text style={styles.section}>Folio Dağılımı</Text>
              <View style={styles.folioGrid}>
                {Object.entries(byCategory).map(([cat, amount]) => (
                  <AppCard key={cat} style={styles.folioBox}>
                    <Text style={styles.folioLabel}>{FOLIO_LABELS[cat] || cat}</Text>
                    <Text style={[styles.folioValue, { color: cat === 'payment' ? colors.success : colors.primary }]}>
                      {(amount as number).toLocaleString('tr-TR')} ₺
                    </Text>
                  </AppCard>
                ))}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
};

const StatBox: React.FC<{ icon: string; label: string; value: string | number; color: string }> = ({ icon, label, value, color }) => (
  <AppCard style={styles.statBox}>
    <Ionicons name={icon as any} size={22} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </AppCard>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  monthBar: { maxHeight: 50, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  monthChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: colors.background, marginRight: 6, marginVertical: 6,
  },
  monthChipActive: { backgroundColor: colors.primary },
  monthText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  monthTextActive: { color: '#fff', fontWeight: '700' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: spacing.xxl },
  section: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.sm },
  row: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.sm },
  statValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 4 },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  divider: { borderBottomWidth: 1, borderBottomColor: colors.divider },
  tableLabel: { fontSize: fontSize.md, fontWeight: '500', color: colors.textPrimary },
  tableCount: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  tableAmount: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  folioGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  folioBox: { width: '47%' as any, alignItems: 'center', paddingVertical: spacing.sm },
  folioLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  folioValue: { fontSize: fontSize.lg, fontWeight: '700', marginTop: 2 },
});

export default GeneralReportScreen;
