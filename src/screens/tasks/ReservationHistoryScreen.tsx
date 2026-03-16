/**
 * ReservationHistoryScreen — Rezervasyon Geçmişi
 *
 * Tüm rezervasyonları listeler. Filtre: Tümü / Aktif / Geçmiş
 * Tıklayınca detay: misafirler (giriş/çıkış tarihleri) + folio kalemleri
 *
 * API: reservationsApi.getAll(), reservationsApi.getById()
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppInput, StatusChip, EmptyState, LoadingState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { FOLIO_CATEGORY_LABELS } from '../../utils/constants';
import useApi from '../../hooks/useApi';
import { reservationsApi } from '../../services/api';
import type { Reservation, ReservationDetail } from '../../utils/types';

interface ReservationHistoryScreenProps {
  onClose: () => void;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

type FilterType = 'all' | 'active' | 'past';

const ReservationHistoryScreen: React.FC<ReservationHistoryScreenProps> = ({ onClose }) => {
  const { data: reservations, loading, error, refetch } = useApi(() => reservationsApi.getAll());

  const [filter, setFilter] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState<ReservationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /* Rezervasyon detayını yükle */
  const handleSelectReservation = async (reservation: Reservation) => {
    setLoadingDetail(true);
    try {
      const detail = await reservationsApi.getById(reservation.id);
      setSelectedDetail(detail);
    } catch {
      setSelectedDetail(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  /* Filtrele + Ara */
  const filteredReservations = (reservations || []).filter((r) => {
    if (filter === 'active') return r.isActive;
    if (filter === 'past') return !r.isActive;
    return true;
  }).filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.roomNumber.toLowerCase().includes(q) ||
      (r.guestNames || '').toLowerCase().includes(q) ||
      (r.companyName || '').toLowerCase().includes(q)
    );
  });

  /* Yükleniyor */
  if (loading && !reservations) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Rezervasyon Geçmişi</Text>
          <View style={{ width: 28 }} />
        </View>
        <LoadingState message="Rezervasyonlar yükleniyor..." />
      </View>
    );
  }

  /* Detay görünümü */
  if (selectedDetail) {
    const parseAmount = (a: number | string) => typeof a === 'string' ? parseFloat(a) : a;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedDetail(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Oda {selectedDetail.roomNumber}</Text>
          <StatusChip
            label={selectedDetail.isActive ? 'Aktif' : 'Geçmiş'}
            color={selectedDetail.isActive ? '#22C55E' : '#64748B'}
          />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {/* Tarih bilgisi */}
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Konaklama Bilgileri</Text>
            </View>
            <View style={styles.dateRow}>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Giriş</Text>
                <Text style={styles.dateValue}>{formatDate(selectedDetail.checkIn)}</Text>
              </View>
              <View style={styles.dateItem}>
                <Text style={styles.dateLabel}>Çıkış</Text>
                <Text style={styles.dateValue}>{formatDate(selectedDetail.checkOut)}</Text>
              </View>
            </View>
            {selectedDetail.companyName && (
              <Text style={styles.companyText}>Firma: {selectedDetail.companyName}</Text>
            )}
            {selectedDetail.notes ? (
              <Text style={styles.notesText}>Not: {selectedDetail.notes}</Text>
            ) : null}
          </AppCard>

          {/* Misafirler */}
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Misafirler ({selectedDetail.stays.length})</Text>
            </View>
            {selectedDetail.stays.map((stay) => (
              <View key={stay.id} style={styles.stayRow}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                <View style={styles.stayInfo}>
                  <Text style={styles.stayName}>{stay.guestName}</Text>
                  <Text style={styles.stayDate}>
                    Giriş: {formatDate(stay.checkIn)}
                  </Text>
                  <Text style={styles.stayDate}>
                    Çıkış: {formatDate(stay.checkOut)}
                  </Text>
                </View>
                <StatusChip
                  label={stay.isActive ? 'Odada' : 'Çıktı'}
                  color={stay.isActive ? '#22C55E' : '#64748B'}
                />
              </View>
            ))}
          </AppCard>

          {/* Folio */}
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Hesap Detayı ({selectedDetail.folioItems.length})</Text>
            </View>
            {selectedDetail.folioItems.length > 0 ? (
              <>
                {selectedDetail.folioItems.map((folio) => (
                  <View key={folio.id} style={styles.folioRow}>
                    <View style={styles.folioInfo}>
                      <Text style={styles.folioCategory}>
                        {FOLIO_CATEGORY_LABELS[folio.category] || folio.category}
                      </Text>
                      <Text style={styles.folioDesc} numberOfLines={1}>{folio.description}</Text>
                    </View>
                    <Text style={[
                      styles.folioAmount,
                      (folio.category === 'payment' || folio.category === 'discount') && { color: '#22C55E' },
                    ]}>
                      {folio.category === 'payment' || folio.category === 'discount' ? '-' : ''}
                      {formatCurrency(folio.amount)}
                    </Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Toplam</Text>
                  <Text style={styles.totalValue}>{formatCurrency(selectedDetail.totalAmount)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Ödenen</Text>
                  <Text style={[styles.totalValue, { color: '#22C55E' }]}>{formatCurrency(selectedDetail.paidAmount)}</Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Hesap kaydı yok</Text>
            )}
          </AppCard>
        </ScrollView>
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
        <Text style={styles.title}>Rezervasyon Geçmişi</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        {([
          { value: 'all', label: 'Tümü' },
          { value: 'active', label: 'Aktif' },
          { value: 'past', label: 'Geçmiş' },
        ] as { value: FilterType; label: string }[]).map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <Text style={[styles.filterText, filter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Arama Barı */}
      <View style={styles.searchContainer}>
        <AppInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Oda no, misafir adı veya firma ara..."
          icon="search-outline"
          style={{ marginBottom: 0 }}
        />
      </View>

      {/* Liste */}
      <FlatList
        data={filteredReservations}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
        ListEmptyComponent={
          <EmptyState icon="time-outline" title="Rezervasyon bulunamadı" />
        }
        renderItem={({ item }) => (
          <AppCard style={styles.rezCard} onPress={() => handleSelectReservation(item)}>
            <View style={styles.rezTop}>
              <View style={styles.roomBadge}>
                <Text style={styles.roomBadgeText}>{item.roomNumber}</Text>
              </View>
              <StatusChip
                label={item.isActive ? 'Aktif' : 'Tamamlandı'}
                color={item.isActive ? '#22C55E' : '#64748B'}
              />
            </View>
            {item.guestNames && (
              <Text style={styles.rezGuests} numberOfLines={1}>
                <Ionicons name="people-outline" size={12} /> {item.guestNames}
              </Text>
            )}
            <View style={styles.rezDates}>
              <Text style={styles.rezDateText}>
                <Ionicons name="log-in-outline" size={11} /> {formatDate(item.checkIn)}
              </Text>
              <Text style={styles.rezDateText}>
                <Ionicons name="log-out-outline" size={11} /> {formatDate(item.checkOut)}
              </Text>
            </View>
            {item.companyName && (
              <Text style={styles.rezCompany}>
                <Ionicons name="business-outline" size={11} /> {item.companyName}
              </Text>
            )}
            <View style={styles.rezFooter}>
              <View>
                <Text style={styles.rezAmount}>{formatCurrency(item.totalAmount)}</Text>
                {Number(item.paidAmount) > 0 && (
                  <Text style={styles.rezPaid}>Ödenen: {formatCurrency(item.paidAmount)}</Text>
                )}
                {Number(item.totalAmount) - Number(item.paidAmount) > 0 && (
                  <Text style={styles.rezBalance}>
                    Bakiye: {formatCurrency(Number(item.totalAmount) - Number(item.paidAmount))}
                  </Text>
                )}
              </View>
              <Text style={styles.rezGuestCount}>{item.guestCount} misafir</Text>
            </View>
          </AppCard>
        )}
      />

      {/* Detay yükleniyor overlay */}
      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <LoadingState message="Detay yükleniyor..." />
        </View>
      )}
    </View>
  );
};

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
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
  },
  filterChipActive: { backgroundColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.textWhite },
  searchContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  /* Rezervasyon kartı */
  rezCard: { marginBottom: spacing.sm },
  rezTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  roomBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  roomBadgeText: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  rezGuests: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  rezDates: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  rezDateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  rezCompany: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 6 },
  rezFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.divider },
  rezAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  rezPaid: { fontSize: fontSize.xs, color: colors.success, marginTop: 2 },
  rezBalance: { fontSize: fontSize.xs, color: colors.error, fontWeight: '700', marginTop: 2 },
  rezGuestCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  /* Detay */
  detailContent: { padding: spacing.md, paddingBottom: spacing.xxl },
  card: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  dateRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.sm },
  dateItem: { flex: 1, backgroundColor: colors.divider, padding: spacing.sm, borderRadius: borderRadius.sm },
  dateLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  dateValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  companyText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 4, fontStyle: 'italic' },
  stayRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  stayInfo: { flex: 1 },
  stayName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  stayDate: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  folioRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  folioInfo: { flex: 1 },
  folioCategory: { fontSize: 10, fontWeight: '600', color: colors.primary, marginBottom: 2 },
  folioDesc: { fontSize: fontSize.sm, color: colors.textPrimary },
  folioAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 4 },
  totalLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  totalValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.md, fontStyle: 'italic' },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ReservationHistoryScreen;
