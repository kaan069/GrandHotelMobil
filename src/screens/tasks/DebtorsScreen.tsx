/**
 * DebtorsScreen — Borçlular Ekranı
 *
 * Açık tüm cari hesap hareketleri (debit + credit):
 *   - Debit (borçlu) → pozitif, kırmızı
 *   - Credit (alacaklı) → negatif, yeşil
 * 3 filtre sekmesi: Tümü / Şahıs / Firma-Acente
 * Kayda basınca → Ödeme Ekle prompt → settle endpoint
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, EmptyState, LoadingState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import useAuth from '../../hooks/useAuth';
import { accountTransactionsApi } from '../../services/api';
import type { ApiAccountTransaction, AccountTransactionDebtorListResponse } from '../../services/api';

interface DebtorsScreenProps {
  onClose: () => void;
}

type FilterType = 'all' | 'guest' | 'company_or_agency';

const formatCurrency = (amount: number): string =>
  `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const TARGET_LABEL: Record<string, string> = {
  company: 'Firma',
  agency: 'Acente',
  guest: 'Şahıs',
};

const DebtorsScreen: React.FC<DebtorsScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [data, setData] = useState<AccountTransactionDebtorListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const load = useCallback(async () => {
    try {
      const res = await accountTransactionsApi.getDebtorList();
      setData(res);
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Borçlular yüklenemedi');
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const handleSettle = (tx: ApiAccountTransaction) => {
    Alert.prompt(
      tx.type === 'debit' ? 'Borç Ödemesi' : 'Alacak İşlemi',
      `${TARGET_LABEL[tx.targetType || ''] || '-'}: ${tx.targetName}\nTutar: ${formatCurrency(parseFloat(tx.amount))}\n\nÖdeme tutarını girin:`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Kaydet',
          onPress: async (value?: string) => {
            const amount = parseFloat(value || '0');
            if (amount <= 0) {
              Alert.alert('Hata', 'Geçerli bir tutar girin');
              return;
            }
            try {
              await accountTransactionsApi.settle(tx.id, {
                amount,
                description: `Cari hesap ödemesi — ${tx.description || '#' + tx.id}`,
                staffName: user?.name || '',
              });
              Alert.alert('Başarılı', `${formatCurrency(amount)} ödeme kaydedildi.`);
              load();
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'İşlem başarısız');
            }
          },
        },
      ],
      'plain-text',
      tx.amount,
      'decimal-pad'
    );
  };

  const items = data?.items || [];
  const filteredItems = items.filter((i) => {
    if (filter === 'guest') return i.targetType === 'guest';
    if (filter === 'company_or_agency') return i.targetType !== 'guest';
    return true;
  });

  const guestCount = items.filter((i) => i.targetType === 'guest').length;
  const corpCount = items.filter((i) => i.targetType !== 'guest').length;

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Borçlular</Text>
          <View style={{ width: 28 }} />
        </View>
        <LoadingState message="Borçlular yükleniyor..." />
      </View>
    );
  }

  const summary = data?.summary;
  const netBalance = summary ? parseFloat(summary.netBalance) : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Borçlular</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Özet */}
      {summary && (
        <View style={styles.summaryRow}>
          <View style={[styles.summaryBox, { backgroundColor: colors.error + '15' }]}>
            <Text style={styles.summaryLabel}>Borç</Text>
            <Text style={[styles.summaryValue, { color: colors.error }]}>
              {formatCurrency(parseFloat(summary.debitTotal))}
            </Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.success + '15' }]}>
            <Text style={styles.summaryLabel}>Alacak</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>
              {formatCurrency(parseFloat(summary.creditTotal))}
            </Text>
          </View>
          <View style={[styles.summaryBox, { backgroundColor: colors.divider }]}>
            <Text style={styles.summaryLabel}>Net</Text>
            <Text style={[styles.summaryValue, { color: netBalance > 0 ? colors.error : netBalance < 0 ? colors.success : colors.textPrimary }]}>
              {formatCurrency(netBalance)}
            </Text>
          </View>
        </View>
      )}

      {/* Filtre sekmeleri */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'all' && styles.filterChipActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            Tümü ({items.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'guest' && styles.filterChipActive]}
          onPress={() => setFilter('guest')}
        >
          <Text style={[styles.filterText, filter === 'guest' && styles.filterTextActive]}>
            Şahıs ({guestCount})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === 'company_or_agency' && styles.filterChipActive]}
          onPress={() => setFilter('company_or_agency')}
        >
          <Text style={[styles.filterText, filter === 'company_or_agency' && styles.filterTextActive]}>
            Firma/Acente ({corpCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Liste */}
      {filteredItems.length === 0 ? (
        <EmptyState
          icon="checkmark-done-circle-outline"
          title="Açık Kayıt Yok"
          description="Bu filtrede açık cari hesap kaydı bulunmuyor."
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
          renderItem={({ item }) => {
            const isCredit = item.type === 'credit';
            const amount = parseFloat(item.amount) || 0;
            return (
              <AppCard style={styles.itemCard}>
                <TouchableOpacity onPress={() => handleSettle(item)}>
                  <View style={styles.itemHeader}>
                    <View style={styles.targetBadge}>
                      <Text style={styles.targetBadgeText}>
                        {TARGET_LABEL[item.targetType || ''] || '—'}
                      </Text>
                    </View>
                    <Text style={styles.itemDate}>{formatDate(item.createdAt)}</Text>
                  </View>
                  <Text style={styles.itemTarget}>{item.targetName}</Text>
                  {item.guestName && item.targetType !== 'guest' && (
                    <Text style={styles.itemSub}>Misafir: {item.guestName}</Text>
                  )}
                  {item.roomNumber && (
                    <Text style={styles.itemSub}>Oda: {item.roomNumber}</Text>
                  )}
                  {item.description ? (
                    <Text style={styles.itemSub}>{item.description}</Text>
                  ) : null}
                  <View style={styles.itemFooter}>
                    <Text
                      style={[
                        styles.itemAmount,
                        { color: isCredit ? colors.success : colors.error },
                      ]}
                    >
                      {isCredit ? '−' : '+'}{formatCurrency(amount)}
                    </Text>
                    <View style={styles.settleBtn}>
                      <Ionicons name="cash-outline" size={16} color={colors.primary} />
                      <Text style={styles.settleBtnText}>Kapat</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </AppCard>
            );
          }}
        />
      )}
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
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  summaryRow: {
    flexDirection: 'row', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  summaryBox: {
    flex: 1, paddingVertical: spacing.sm, paddingHorizontal: spacing.xs,
    borderRadius: borderRadius.md, alignItems: 'center',
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  summaryValue: { fontSize: fontSize.md, fontWeight: '800' },
  filterRow: {
    flexDirection: 'row', paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    gap: 8, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: borderRadius.full, backgroundColor: colors.divider,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.textWhite },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  itemCard: { marginBottom: spacing.sm },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  targetBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  targetBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  itemDate: { fontSize: fontSize.xs, color: colors.textSecondary },
  itemTarget: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  itemSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 2 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  itemAmount: { fontSize: fontSize.lg, fontWeight: '800' },
  settleBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1, borderColor: colors.primary,
  },
  settleBtnText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
});

export default DebtorsScreen;
