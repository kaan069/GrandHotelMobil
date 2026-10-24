/**
 * GuestListScreen — Müşteri Listesi + Müşteri Detayı
 *
 * Liste: ad / TC / telefon ile sunucu tarafı arama (300ms debounce), kara liste filtresi,
 * sonsuz kaydırma (sayfa sayfa).
 * Detay: kimlik bilgileri, firma, konaklama özeti (konaklama sayısı, gece, harcama,
 * ödeme, bakiye — iptal edilen rezervasyonlar sayılmaz) ve konaklama geçmişi.
 * Ön büro rolleri kara listeye alabilir / çıkarabilir.
 * Web karşılığı: pages/guests/GuestList.tsx + GuestDetail.tsx
 *
 * API: guestsApi.getPage / stayHistory / toggleBlock, companiesApi.getAll
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip, EmptyState, LoadingState, LoadMoreFooter } from '../../components/common';
import usePagedList from '../../hooks/usePagedList';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { RESERVATION_STATUS, RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from '../../utils/constants';
import { guestsApi, companiesApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import { isFrontOffice } from '../../utils/permissions';
import type { Guest, Company, Reservation } from '../../utils/types';

interface GuestListScreenProps {
  onClose: () => void;
}

const formatDate = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatMoney = (v: number): string =>
  `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Gece sayısı — çıkışı olmayan (devam eden) konaklama bugüne kadar sayılır */
const nightsOf = (r: Reservation): number => {
  const end = r.checkOut ? new Date(r.checkOut).getTime() : Date.now();
  return Math.max(Math.ceil((end - new Date(r.checkIn).getTime()) / 86400000), 0);
};

const GuestListScreen: React.FC<GuestListScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const canBlock = isFrontOffice(user);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query.trim());
  const [onlyBlocked, setOnlyBlocked] = useState(false);

  const [selected, setSelected] = useState<Guest | null>(null);
  const [history, setHistory] = useState<Reservation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [blocking, setBlocking] = useState(false);

  /* Müşteriler sayfa sayfa; arama ve kara liste filtresi sunucuda */
  const list = usePagedList(
    (page, pageSize) => guestsApi.getPage({
      page, pageSize, search: debounced || undefined, isBlocked: onlyBlocked || undefined,
    }),
    [debounced, onlyBlocked],
  );

  useEffect(() => { companiesApi.getAll().then(setCompanies).catch(() => setCompanies([])); }, []);

  const openDetail = async (guest: Guest) => {
    setSelected(guest);
    setHistory([]);
    setHistoryLoading(true);
    try {
      const data = await guestsApi.stayHistory(guest.id);
      setHistory([...data].sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || '')));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Konaklama geçmişi yüklenemedi');
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleToggleBlock = () => {
    if (!selected) return;
    const willBlock = !selected.isBlocked;
    Alert.alert(
      willBlock ? 'Kara Listeye Al' : 'Kara Listeden Çıkar',
      willBlock
        ? `${selected.firstName} ${selected.lastName} kara listeye alınsın mı? Sonraki girişlerde odaya eklenemez.`
        : `${selected.firstName} ${selected.lastName} kara listeden çıkarılsın mı?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: willBlock ? 'Kara Listeye Al' : 'Çıkar',
          style: willBlock ? 'destructive' : 'default',
          onPress: async () => {
            setBlocking(true);
            try {
              const updated = await guestsApi.toggleBlock(selected.id);
              setSelected((prev) => (prev ? { ...prev, isBlocked: updated.isBlocked } : prev));
              list.setItems((prev) => prev.map((g) => (g.id === updated.id ? { ...g, isBlocked: updated.isBlocked } : g)));
            } catch (err) {
              Alert.alert('Hata', (err as Error).message || 'İşlem yapılamadı');
            } finally {
              setBlocking(false);
            }
          },
        },
      ],
    );
  };

  const companyName = (id?: number | null) => (id ? companies.find((c) => c.id === id)?.name : undefined);

  /* ─── DETAY ─── */
  if (selected) {
    const counted = history.filter((r) => r.status !== RESERVATION_STATUS.CANCELLED);
    const totalSpent = counted.reduce((s, r) => s + (Number(r.totalAmount) || 0), 0);
    const totalPaid = counted.reduce((s, r) => s + (Number(r.paidAmount) || 0), 0);
    const totalNights = counted.reduce((s, r) => s + nightsOf(r), 0);
    const balance = totalSpent - totalPaid;
    const comp = companyName(selected.companyId);

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selected.firstName} {selected.lastName}</Text>
          {selected.isBlocked
            ? <StatusChip label="Kara Liste" color={colors.error} />
            : <View style={{ width: 24 }} />}
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Müşteri Bilgileri</Text>
            </View>
            <InfoRow label="TC Kimlik" value={selected.tcNo || '—'} />
            <InfoRow label="Telefon" value={selected.phone || '—'} />
            <InfoRow label="E-posta" value={selected.email || '—'} />
            <InfoRow label="Firma" value={comp || '—'} />
            <InfoRow label="Kayıt Tarihi" value={formatDate(selected.createdAt)} />
            {canBlock && (
              <AppButton
                title={selected.isBlocked ? 'Kara Listeden Çıkar' : 'Kara Listeye Al'}
                icon={selected.isBlocked ? 'checkmark-circle-outline' : 'ban-outline'}
                variant={selected.isBlocked ? 'outline' : 'danger'}
                loading={blocking}
                onPress={handleToggleBlock}
                style={{ marginTop: spacing.md }}
              />
            )}
          </AppCard>

          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="stats-chart" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Konaklama Özeti</Text>
            </View>
            <InfoRow label="Toplam Konaklama" value={`${counted.length} kez`} />
            <InfoRow label="Toplam Gece" value={`${totalNights} gece`} />
            <InfoRow label="Toplam Harcama" value={formatMoney(totalSpent)} />
            <InfoRow label="Toplam Ödeme" value={formatMoney(totalPaid)} />
            <InfoRow label="Bakiye" value={formatMoney(balance)} valueColor={balance > 0 ? colors.error : colors.success} />
          </AppCard>

          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Konaklama Geçmişi ({history.length})</Text>
            </View>
            {historyLoading ? (
              <LoadingState message="Yükleniyor..." />
            ) : history.length === 0 ? (
              <Text style={styles.emptyText}>Konaklama kaydı yok</Text>
            ) : (
              history.map((r) => {
                const statusColor = RESERVATION_STATUS_COLORS[r.status] || colors.textSecondary;
                const rBalance = (Number(r.totalAmount) || 0) - (Number(r.paidAmount) || 0);
                return (
                  <View key={r.id} style={styles.stayRow}>
                    <View style={styles.stayTop}>
                      <Text style={styles.stayRoom}>Oda {r.roomNumber}</Text>
                      <StatusChip label={RESERVATION_STATUS_LABELS[r.status] || r.status} color={statusColor} />
                    </View>
                    <Text style={styles.stayDates}>{formatDate(r.checkIn)} → {r.checkOut ? formatDate(r.checkOut) : 'Konaklıyor'}</Text>
                    {!!r.companyName && <Text style={styles.stayMeta}>Firma: {r.companyName}</Text>}
                    <Text style={styles.stayMeta}>
                      Tutar {formatMoney(Number(r.totalAmount) || 0)} · Ödenen {formatMoney(Number(r.paidAmount) || 0)}
                      {rBalance > 0 && r.status !== RESERVATION_STATUS.CANCELLED ? ` · Bakiye ${formatMoney(rBalance)}` : ''}
                    </Text>
                  </View>
                );
              })
            )}
          </AppCard>
        </ScrollView>
      </View>
    );
  }

  /* ─── LİSTE ─── */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Müşteri Listesi</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.searchContainer}>
        <AppInput value={query} onChangeText={setQuery} placeholder="Ad, TC veya telefon ara..." icon="search-outline" style={{ marginBottom: 0 }} />
        <View style={styles.chipRow}>
          {([[false, 'Tümü'], [true, 'Kara Liste']] as [boolean, string][]).map(([val, label]) => (
            <TouchableOpacity key={label} style={[styles.chip, onlyBlocked === val && styles.chipActive]} onPress={() => setOnlyBlocked(val)}>
              <Text style={[styles.chipText, onlyBlocked === val && styles.chipTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.countText}>{list.total} müşteri</Text>
        </View>
      </View>

      {list.loading && list.items.length === 0 ? (
        <LoadingState message="Müşteriler yükleniyor..." />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(g) => String(g.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.primary]} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} />}
          ListEmptyComponent={<EmptyState icon="people-outline" title={list.error || 'Müşteri bulunamadı'} />}
          renderItem={({ item }) => {
            const comp = companyName(item.companyId);
            return (
              <AppCard style={styles.guestCard} onPress={() => openDetail(item)}>
                <View style={styles.guestRow}>
                  <Ionicons
                    name={item.isBlocked ? 'ban' : 'person-circle-outline'}
                    size={34}
                    color={item.isBlocked ? colors.error : colors.primary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.guestName}>{item.firstName} {item.lastName}</Text>
                    <Text style={styles.guestMeta}>{item.phone || '—'}{item.tcNo ? ` · TC ${item.tcNo}` : ''}</Text>
                    {!!comp && <Text style={styles.guestMeta}>{comp}</Text>}
                  </View>
                  {item.isBlocked && <StatusChip label="Kara Liste" color={colors.error} />}
                  <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
                </View>
              </AppCard>
            );
          }}
        />
      )}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  searchContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  chipRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.sm },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textWhite, fontWeight: '700' },
  countText: { marginLeft: 'auto', fontSize: fontSize.xs, color: colors.textSecondary },
  list: { padding: spacing.md, paddingBottom: 100 },
  guestCard: { marginBottom: spacing.sm },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  guestName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  guestMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  detailContent: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.md, fontSize: fontSize.sm },
  stayRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  stayTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stayRoom: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  stayDates: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  stayMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});

export default GuestListScreen;
