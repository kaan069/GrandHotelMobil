/**
 * EarningsScreen — Kazançlarım Ekranı
 *
 * Profil sekmesinden açılır.
 * Maaş bilgisi + aylık komisyon kazançları gösterilir.
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

import useAuth from '../../hooks/useAuth';
import { staffApi, commissionApi } from '../../services/api';
import type { MyCommissionsData } from '../../services/api';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface Props {
  onClose: () => void;
}

const EarningsScreen: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [salary, setSalary] = useState<number | null>(null);
  const [commissions, setCommissions] = useState<MyCommissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Bu ay
  const now = new Date();
  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  const monthEnd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()).padStart(2, '0')}`;
  const monthLabel = now.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      const [emp, comm] = await Promise.all([
        staffApi.getById(user.id),
        commissionApi.getMy(user.staffNumber, { dateFrom: monthStart, dateTo: monthEnd }),
      ]);
      setSalary(emp.salary ? Number(emp.salary) : null);
      setCommissions(comm);
    } catch {
      // Sessiz hata
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user, monthStart, monthEnd]);

  useEffect(() => { loadData(); }, [loadData]);

  const totalEarned = commissions ? parseFloat(commissions.totalEarned) : 0;
  const totalSales = commissions ? parseFloat(commissions.totalSales) : 0;
  const grandTotal = (salary || 0) + totalEarned;

  const fmt = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

  if (loading) {
    return (
      <View style={styles.container}>
        <Header onClose={onClose} />
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header onClose={onClose} />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} />}
      >
        {/* Toplam Kazanç Kartı */}
        <View style={styles.totalCard}>
          <Text style={styles.totalLabel}>Bu Ay Toplam Kazanç</Text>
          <Text style={styles.totalAmount}>{fmt(grandTotal)} ₺</Text>
          <Text style={styles.totalMonth}>{monthLabel}</Text>
        </View>

        {/* Maaş */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Aylık Maaş</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardAmount}>
              {salary ? `${fmt(salary)} ₺` : 'Belirlenmemiş'}
            </Text>
          </View>
        </View>

        {/* Komisyon Özeti */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="trending-up-outline" size={20} color="#22c55e" />
            <Text style={styles.sectionTitle}>Komisyon Kazançları</Text>
          </View>
          <View style={styles.card}>
            <View style={styles.commSummary}>
              <View style={styles.commSummaryItem}>
                <Text style={styles.commLabel}>Toplam Satış</Text>
                <Text style={styles.commValue}>{fmt(totalSales)} ₺</Text>
              </View>
              <View style={styles.commDivider} />
              <View style={styles.commSummaryItem}>
                <Text style={styles.commLabel}>Komisyon</Text>
                <Text style={[styles.commValue, { color: '#22c55e' }]}>{fmt(totalEarned)} ₺</Text>
              </View>
              <View style={styles.commDivider} />
              <View style={styles.commSummaryItem}>
                <Text style={styles.commLabel}>Masa Sayısı</Text>
                <Text style={styles.commValue}>{commissions?.count || 0}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Komisyon Detayları */}
        {commissions && commissions.items.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="list-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.sectionTitle}>Detay</Text>
            </View>
            {commissions.items.map((item, idx) => (
              <View key={idx} style={styles.detailRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.detailTable}>
                    {item.tableNumber ? `Masa ${item.tableNumber}` : item.tabNo}
                  </Text>
                  <Text style={styles.detailDate}>{formatDate(item.date)}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.detailSales}>{fmt(parseFloat(item.tabTotal))} ₺</Text>
                  <Text style={styles.detailComm}>+{fmt(parseFloat(item.commissionAmount))} ₺</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {commissions && commissions.items.length === 0 && (
          <View style={styles.emptyBox}>
            <Ionicons name="cafe-outline" size={40} color={colors.textDisabled} />
            <Text style={styles.emptyText}>Bu ay henüz komisyon kaydı yok</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const Header: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <View style={styles.header}>
    <Ionicons name="arrow-back" size={24} color={colors.textPrimary} onPress={onClose} />
    <Text style={styles.headerTitle}>Kazançlarım</Text>
    <View style={{ width: 24 }} />
  </View>
);

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()}`;
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },

  // Toplam kart
  totalCard: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  totalLabel: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.8)', fontWeight: '500' },
  totalAmount: { fontSize: 36, fontWeight: '800', color: '#fff', marginVertical: 4 },
  totalMonth: { fontSize: fontSize.sm, color: 'rgba(255,255,255,0.7)' },

  // Bölüm
  section: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },

  // Kart
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardAmount: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },

  // Komisyon özet
  commSummary: { flexDirection: 'row', justifyContent: 'space-around' },
  commSummaryItem: { alignItems: 'center', flex: 1 },
  commDivider: { width: 1, backgroundColor: colors.border, marginVertical: 4 },
  commLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  commValue: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },

  // Detay satırı
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: 6,
  },
  detailTable: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  detailDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  detailSales: { fontSize: fontSize.sm, color: colors.textSecondary },
  detailComm: { fontSize: fontSize.md, fontWeight: '700', color: '#22c55e', marginTop: 2 },

  // Boş durum
  emptyBox: { alignItems: 'center', paddingVertical: 30, gap: 8 },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled },
});

export default EarningsScreen;
