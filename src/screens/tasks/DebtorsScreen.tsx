/**
 * DebtorsScreen — Borçlular Ekranı
 *
 * Cari bakiyesi olan her firma / acente / şahıs tek satır (GET /account-transactions/debtors/):
 * açık konaklama sayısı, en eski borç, bakiye. Filtre: Tümü / Şahıs / Firma-Acente.
 * Borçluya dokununca detay: borç kutucukları (DebtCards — konaklama başına, seçip tahsilat);
 * firma / acentede altında cari hesap ekstresi (CariStatement — geçmiş, avans, iptal).
 * Web karşılığı: pages/guests/DebtorList.tsx
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, EmptyState, LoadingState } from '../../components/common';
import DebtCards from '../../components/cari/DebtCards';
import CariStatement from '../../components/cari/CariStatement';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { accountTransactionsApi } from '../../services/api';
import type { CariDebtorPartyRow, CariDebtorsResponse, CariTargetType } from '../../services/api';

interface DebtorsScreenProps {
  onClose: () => void;
}

type FilterType = 'all' | 'guest' | 'company_or_agency';

const formatCurrency = (amount: number): string =>
  `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const daysAgo = (d: string | null) =>
  d ? Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000)) : 0;

const TARGET_LABEL: Record<CariTargetType, string> = {
  company: 'Firma',
  agency: 'Acente',
  guest: 'Şahıs',
};

const TARGET_ICON: Record<CariTargetType, keyof typeof Ionicons.glyphMap> = {
  company: 'business-outline',
  agency: 'globe-outline',
  guest: 'person-outline',
};

const DebtorsScreen: React.FC<DebtorsScreenProps> = ({ onClose }) => {
  const [data, setData] = useState<CariDebtorsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selected, setSelected] = useState<CariDebtorPartyRow | null>(null);

  /* Detay: kutucuklar ve ekstre birbirini tazeler */
  const [debtsReload, setDebtsReload] = useState(0);
  const [statementReload, setStatementReload] = useState(0);

  const load = useCallback(async () => {
    try {
      setData(await accountTransactionsApi.getDebtors());
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Borçlular yüklenemedi');
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

  const items = data?.items || [];
  const filteredItems = items.filter((i) => {
    if (filter === 'guest') return i.targetType === 'guest';
    if (filter === 'company_or_agency') return i.targetType !== 'guest';
    return true;
  });
  const guestCount = items.filter((i) => i.targetType === 'guest').length;
  const corpCount = items.length - guestCount;

  /* ─── Borçlu detayı ─── */
  if (selected) {
    const target = { [selected.targetType]: selected.id } as { company?: number; agency?: number; guest?: number };
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelected(null); load(); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selected.name}</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.detailContent}>
          <View style={styles.partyRow}>
            <View style={styles.targetBadge}>
              <Text style={styles.targetBadgeText}>{TARGET_LABEL[selected.targetType]}</Text>
            </View>
            {!!selected.phone && <Text style={styles.itemSub}>{selected.phone}</Text>}
          </View>

          <DebtCards
            target={target}
            reloadToken={debtsReload}
            onChanged={() => { setStatementReload((t) => t + 1); load(); }}
          />

          {selected.targetType !== 'guest' && (
            <View style={{ marginTop: spacing.md }}>
              <CariStatement
                kind={selected.targetType}
                partyId={selected.id}
                reloadToken={statementReload}
                onChanged={() => { setDebtsReload((t) => t + 1); load(); }}
              />
            </View>
          )}
        </ScrollView>
      </View>
    );
  }

  /* ─── Borçlu listesi ─── */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Borçlular</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <LoadingState message="Borçlular yükleniyor..." />
      ) : (
        <>
          {/* Özet */}
          {data && (
            <View style={styles.summaryRow}>
              <View style={[styles.summaryBox, { backgroundColor: colors.error + '15' }]}>
                <Text style={styles.summaryLabel}>Toplam</Text>
                <Text style={[styles.summaryValue, { color: colors.error }]}>
                  {formatCurrency(Number(data.summary.totalBalance) || 0)}
                </Text>
              </View>
              <View style={[styles.summaryBox, { backgroundColor: colors.divider }]}>
                <Text style={styles.summaryLabel}>Borçlu</Text>
                <Text style={styles.summaryValue}>{data.summary.count}</Text>
              </View>
              <View style={[styles.summaryBox, { backgroundColor: colors.divider }]}>
                <Text style={styles.summaryLabel}>Açık Konaklama</Text>
                <Text style={styles.summaryValue}>{data.summary.openCount}</Text>
              </View>
            </View>
          )}

          {/* Filtre sekmeleri */}
          <View style={styles.filterRow}>
            {([
              ['all', `Tümü (${items.length})`],
              ['guest', `Şahıs (${guestCount})`],
              ['company_or_agency', `Firma/Acente (${corpCount})`],
            ] as [FilterType, string][]).map(([value, label]) => (
              <TouchableOpacity
                key={value}
                style={[styles.filterChip, filter === value && styles.filterChipActive]}
                onPress={() => setFilter(value)}
              >
                <Text style={[styles.filterText, filter === value && styles.filterTextActive]}>{label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <FlatList
            data={filteredItems}
            keyExtractor={(item) => `${item.targetType}-${item.id}`}
            contentContainerStyle={styles.list}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />}
            ListEmptyComponent={
              <EmptyState
                icon="checkmark-done-circle-outline"
                title="Borçlu Yok"
                description="Bu filtrede açık cari bakiyesi olan kimse yok."
              />
            }
            renderItem={({ item }) => {
              const age = daysAgo(item.oldestOpenAt);
              return (
                <AppCard style={styles.itemCard} onPress={() => setSelected(item)}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemIcon}>
                      <Ionicons name={TARGET_ICON[item.targetType]} size={22} color={colors.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemTarget} numberOfLines={1}>{item.name}</Text>
                      <Text style={styles.itemSub}>
                        {TARGET_LABEL[item.targetType]} · {item.openCount} konaklama
                        {item.oldestOpenAt ? ` · en eski ${formatDate(item.oldestOpenAt)}` : ''}
                      </Text>
                      {age > 30 && <Text style={[styles.itemSub, { color: colors.error }]}>{age} gündür açık</Text>}
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={styles.itemAmount}>{formatCurrency(Number(item.balance) || 0)}</Text>
                      <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                    </View>
                  </View>
                </AppCard>
              );
            }}
          />
        </>
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
  summaryValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  itemIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary + '15', alignItems: 'center', justifyContent: 'center',
  },
  itemTarget: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  itemSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.error },
  detailContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  partyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  targetBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  targetBadgeText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
});

export default DebtorsScreen;
