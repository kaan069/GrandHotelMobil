/**
 * ReservationHistoryScreen — Rezervasyon Listesi
 *
 * Web "Rezervasyon Listesi" sayfası ile feature-parity:
 *   - Preset filtreler (yatay scroll chip bar): Bugün Girecekler, Bugün Çıkacaklar, vb.
 *   - Durum filtreleri (reserved, checked_in, checked_out, cancelled)
 *   - Tarih aralığı (dateFrom / dateTo)
 *   - Server-side search (debounce 300ms)
 *   - "Yeni Rezervasyon" butonu (modal)
 *   - Rezervasyon iptal aksiyonu (uzun bas → menu)
 *   - Kart: Rez. No, durum chip'i, ödeme chip'i, personel adı, acente, ön kayıt adı
 *
 * Filtreler değiştiğinde API parametreli olarak yeniden çağrılır.
 * Detay görünümü: misafirler (stays) + folio + adisyonlar; Düzenle, Check-in,
 * Check-in İptal, Rezervasyon İptal (web ReservationDetail ile aynı işlemler).
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip, EmptyState, LoadingState, LoadMoreFooter } from '../../components/common';
import usePagedList from '../../hooks/usePagedList';
import CalendarPicker from '../../components/common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  FOLIO_CATEGORY_LABELS,
  RESERVATION_FILTERS,
  RESERVATION_FILTER_LABELS,
  RESERVATION_STATUS,
  RESERVATION_STATUS_LABELS,
  RESERVATION_STATUS_COLORS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_COLORS,
} from '../../utils/constants';
import { reservationsApi, tabsApi } from '../../services/api';
import type { Reservation, ReservationDetail, ApiTab } from '../../utils/types';
import { calcFolioTotals, isFolioDeductionRow } from '../../utils/folio';

import NewReservationModal from '../../components/reservations/NewReservationModal';
import ReservationEditModal from '../../components/reservations/ReservationEditModal';

interface ReservationHistoryScreenProps {
  onClose: () => void;
}

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
};

const formatDateShort = (s: string): string => {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' });
};

const formatCurrency = (amount: string | number): string => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const computePaymentStatus = (total: string | number, paid: string | number): 'paid' | 'partial' | 'unpaid' => {
  const t = typeof total === 'string' ? parseFloat(total) : total;
  const p = typeof paid === 'string' ? parseFloat(paid) : paid;
  if (t <= 0) return 'unpaid';
  if (p >= t) return 'paid';
  if (p > 0) return 'partial';
  return 'unpaid';
};

/* Preset filtre chip listesi (yatay scroll). 'all' = no preset */
const PRESET_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: RESERVATION_FILTERS.TODAY_CHECKIN, label: RESERVATION_FILTER_LABELS[RESERVATION_FILTERS.TODAY_CHECKIN] },
  { value: RESERVATION_FILTERS.TODAY_CHECKOUT, label: RESERVATION_FILTER_LABELS[RESERVATION_FILTERS.TODAY_CHECKOUT] },
  { value: RESERVATION_FILTERS.TOMORROW_CHECKIN, label: RESERVATION_FILTER_LABELS[RESERVATION_FILTERS.TOMORROW_CHECKIN] },
  { value: RESERVATION_FILTERS.TODAY_CHECKOUT_DONE, label: RESERVATION_FILTER_LABELS[RESERVATION_FILTERS.TODAY_CHECKOUT_DONE] },
  { value: RESERVATION_FILTERS.UNPAID_CHECKOUT, label: RESERVATION_FILTER_LABELS[RESERVATION_FILTERS.UNPAID_CHECKOUT] },
];

/* Durum chip listesi — İptal kasıtlı olarak yok (iptal edilenler hiçbir yerde gösterilmiyor) */
const STATUS_CHIPS: { value: string; label: string }[] = [
  { value: 'all', label: 'Hepsi' },
  { value: RESERVATION_STATUS.RESERVED, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.RESERVED] },
  { value: RESERVATION_STATUS.CHECKED_IN, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.CHECKED_IN] },
  { value: RESERVATION_STATUS.CHECKED_OUT, label: RESERVATION_STATUS_LABELS[RESERVATION_STATUS.CHECKED_OUT] },
];

const ReservationHistoryScreen: React.FC<ReservationHistoryScreenProps> = ({ onClose }) => {
  /* Filtre state */
  const [presetFilter, setPresetFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  /* Veri state */

  /* Modal state */
  const [calendarTarget, setCalendarTarget] = useState<'dateFrom' | 'dateTo' | null>(null);
  const [showNewReservation, setShowNewReservation] = useState(false);

  /* Detay state */
  const [selectedDetail, setSelectedDetail] = useState<ReservationDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [selectedTabs, setSelectedTabs] = useState<ApiTab[]>([]);
  const [showEdit, setShowEdit] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  /* Search debounce (300ms) */
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  /* Veri çek — sayfa sayfa (sonsuz kaydırma); filtre / arama değişince baştan */
  const list = usePagedList(
    (page, pageSize) => reservationsApi.getPage({
      page,
      pageSize,
      filter: presetFilter !== 'all' ? presetFilter : undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      search: debouncedSearch || undefined,
    }),
    [presetFilter, statusFilter, dateFrom, dateTo, debouncedSearch],
  );
  const reservations: Reservation[] = list.items;
  const fetchReservations = list.refresh;

  /* Detay yükle */
  const handleSelectReservation = async (reservation: Reservation) => {
    setLoadingDetail(true);
    try {
      const [detail, tabs] = await Promise.all([
        reservationsApi.getById(reservation.id),
        tabsApi.getAll({ reservationId: reservation.id }).catch(() => [] as ApiTab[]),
      ]);
      setSelectedDetail(detail);
      setSelectedTabs(tabs || []);
    } catch {
      setSelectedDetail(null);
      setSelectedTabs([]);
    } finally {
      setLoadingDetail(false);
    }
  };

  /* Detaydaki işlemler (check-in / check-in iptal) — sonrasında detay ve liste yenilenir */
  const runDetailAction = (title: string, message: string, confirmText: string, action: () => Promise<unknown>, destructive = false) => {
    if (!selectedDetail) return;
    const current = selectedDetail;
    Alert.alert(title, message, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: confirmText,
        style: destructive ? 'destructive' : 'default',
        onPress: async () => {
          setActionLoading(true);
          try {
            await action();
            await handleSelectReservation(current);
            fetchReservations();
          } catch (err) {
            Alert.alert('Hata', (err as Error).message || 'İşlem yapılamadı');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  /* Rezervasyon iptal — hem ana listeden hem detaydan kullanılır */
  const handleCancel = (r: { id: number; roomNumber: string; status: string }, fromDetail = false) => {
    if (r.status !== RESERVATION_STATUS.RESERVED) {
      Alert.alert('İptal Edilemez', `Sadece "${RESERVATION_STATUS_LABELS[RESERVATION_STATUS.RESERVED]}" durumundaki rezervasyonlar iptal edilebilir.`);
      return;
    }
    Alert.alert(
      'Rezervasyon İptal',
      `Oda ${r.roomNumber} rezervasyonu iptal edilsin mi?`,
      [
        { text: 'Hayır', style: 'cancel' },
        {
          text: 'Evet, İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await reservationsApi.cancel(r.id);
              if (fromDetail) {
                setSelectedDetail(null);
                setSelectedTabs([]);
              }
              fetchReservations();
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'İptal edilemedi');
            }
          },
        },
      ]
    );
  };

  /* ─── DETAY GÖRÜNÜMÜ ─── */
  if (selectedDetail) {
    /* Cari aktarım ve indirimler de düşülür — utils/folio.ts (backend ile aynı hesap) */
    const { charges, discounts, payments, balance } = calcFolioTotals(selectedDetail.folioItems || []);
    const isPast = !selectedDetail.isActive;
    const isReservedStatus = selectedDetail.status === RESERVATION_STATUS.RESERVED;
    const isCheckedInStatus = selectedDetail.status === RESERVATION_STATUS.CHECKED_IN;
    const activeStayCount = selectedDetail.stays.filter((st) => st.isActive).length;

    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedDetail(null); setSelectedTabs([]); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{isPast ? 'Geçmiş Rez' : 'Aktif Rez'} · Oda {selectedDetail.roomNumber}</Text>
          <StatusChip
            label={RESERVATION_STATUS_LABELS[selectedDetail.status] || selectedDetail.status}
            color={RESERVATION_STATUS_COLORS[selectedDetail.status] || '#64748B'}
          />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
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
            {selectedDetail.companyName && <Text style={styles.companyText}>Firma: {selectedDetail.companyName}</Text>}
            {selectedDetail.agencyName && (
              <Text style={styles.companyText}>
                Acente: {selectedDetail.agencyName}
                {selectedDetail.agencyReservationCode ? ` · Kod: ${selectedDetail.agencyReservationCode}` : ''}
              </Text>
            )}
            {!!selectedDetail.placeholderGuestName && (
              <Text style={styles.companyText}>
                Ön kayıt: {selectedDetail.placeholderGuestName}
                {selectedDetail.placeholderGuestPhone ? ` · ${selectedDetail.placeholderGuestPhone}` : ''}
              </Text>
            )}
            {selectedDetail.notes ? <Text style={styles.notesText}>Not: {selectedDetail.notes}</Text> : null}
            {selectedDetail.createdByStaff && (
              <Text style={styles.companyText}>Personel: {selectedDetail.createdByStaff}</Text>
            )}
            {(isReservedStatus || isCheckedInStatus) && (
              <AppButton
                title="Düzenle"
                onPress={() => setShowEdit(true)}
                icon="create-outline"
                variant="outline"
                disabled={actionLoading}
                style={{ marginTop: spacing.md }}
              />
            )}
            {isReservedStatus && (
              <AppButton
                title="Check-in Yap"
                icon="log-in-outline"
                loading={actionLoading}
                style={{ marginTop: spacing.sm }}
                onPress={() => {
                  if (activeStayCount === 0) {
                    Alert.alert(
                      'Misafir Gerekli',
                      'Bu ön kayıtlı rezervasyonda kalıcı misafir yok. Oda Durumu ekranından odayı açıp kimlik bilgileriyle misafir ekleyin, ardından check-in yapın.',
                    );
                    return;
                  }
                  runDetailAction(
                    'Check-in',
                    `Oda ${selectedDetail.roomNumber} rezervasyonu check-in yapılsın mı?`,
                    'Check-in Yap',
                    () => reservationsApi.checkIn(selectedDetail.id),
                  );
                }}
              />
            )}
            {isCheckedInStatus && (
              <AppButton
                title="Check-in İptal"
                icon="arrow-undo-outline"
                variant="danger"
                loading={actionLoading}
                style={{ marginTop: spacing.sm }}
                onPress={() => runDetailAction(
                  'Check-in İptal',
                  'Rezervasyon "Rezerve" durumuna döner, oda müsait olur. Misafir ve folio kayıtları korunur.',
                  'Check-in İptal',
                  () => reservationsApi.revertCheckin(selectedDetail.id),
                  true,
                )}
              />
            )}
            {isReservedStatus && (
              <AppButton
                title="Rezervasyon İptal"
                onPress={() => handleCancel({
                  id: selectedDetail.id,
                  roomNumber: selectedDetail.roomNumber,
                  status: selectedDetail.status,
                }, true)}
                icon="close-circle-outline"
                variant="danger"
                disabled={actionLoading}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </AppCard>

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
                  <Text style={styles.stayDate}>Giriş: {formatDate(stay.checkIn)}</Text>
                  <Text style={styles.stayDate}>Çıkış: {formatDate(stay.checkOut)}</Text>
                </View>
                <StatusChip label={stay.isActive ? 'Odada' : 'Çıktı'} color={stay.isActive ? '#22C55E' : '#64748B'} />
              </View>
            ))}
          </AppCard>

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
                      <Text style={styles.folioCategory}>{FOLIO_CATEGORY_LABELS[folio.category] || folio.category}</Text>
                      <Text style={styles.folioDesc} numberOfLines={1}>{folio.description}</Text>
                    </View>
                    <Text style={[
                      styles.folioAmount,
                      isFolioDeductionRow(folio.category) && { color: '#22C55E' },
                    ]}>
                      {isFolioDeductionRow(folio.category) ? '-' : ''}
                      {formatCurrency(folio.amount)}
                    </Text>
                  </View>
                ))}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Toplam Ücret</Text>
                  <Text style={styles.totalValue}>{formatCurrency(charges)}</Text>
                </View>
                {discounts > 0 && (
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>İndirim</Text>
                    <Text style={[styles.totalValue, { color: '#F59E0B' }]}>-{formatCurrency(discounts)}</Text>
                  </View>
                )}
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Ödenen</Text>
                  <Text style={[styles.totalValue, { color: '#22C55E' }]}>{formatCurrency(payments)}</Text>
                </View>
                <View style={[styles.totalRow, { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 8, marginTop: 4 }]}>
                  <Text style={[styles.totalLabel, { fontWeight: '700' }]}>Bakiye</Text>
                  <Text style={[styles.totalValue, { color: balance > 0 ? '#EF4444' : '#22C55E', fontWeight: '700' }]}>
                    {formatCurrency(balance)}
                  </Text>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Hesap kaydı yok</Text>
            )}
          </AppCard>

          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="restaurant" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Adisyonlar ({selectedTabs.length})</Text>
            </View>
            {selectedTabs.length > 0 ? (
              selectedTabs.map((t) => (
                <View key={t.id} style={styles.tabBox}>
                  <View style={styles.tabHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                      <View style={styles.tabNoBadge}>
                        <Text style={styles.tabNoText}>{t.tabNo}</Text>
                      </View>
                      <StatusChip
                        label={t.status === 'paid' ? 'Ödendi' : t.status === 'closed' ? 'Kapandı' : t.status === 'open' ? 'Açık' : t.status}
                        color={t.status === 'paid' ? '#22C55E' : t.status === 'open' ? '#F59E0B' : '#64748B'}
                      />
                    </View>
                    <Text style={styles.tabAmount}>{formatCurrency(t.totalAmount)}</Text>
                  </View>
                  {t.servicePoint && <Text style={styles.tabMeta}>{t.servicePoint}</Text>}
                  {t.items && t.items.length > 0 && (
                    <View style={styles.tabItems}>
                      {t.items.map((item) => (
                        <View key={item.id} style={styles.tabItemRow}>
                          <Text style={styles.tabItemDesc} numberOfLines={1}>{item.quantity}x {item.description}</Text>
                          <Text style={styles.tabItemPrice}>{formatCurrency(item.totalPrice)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>Adisyon kaydı yok</Text>
            )}
          </AppCard>
        </ScrollView>

        <ReservationEditModal
          visible={showEdit}
          reservation={selectedDetail}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            handleSelectReservation(selectedDetail);
            fetchReservations();
          }}
        />
      </View>
    );
  }

  /* ─── ANA LİSTE ─── */
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Rezervasyon Listesi</Text>
        <TouchableOpacity onPress={() => setShowNewReservation(true)} style={styles.newBtn}>
          <Ionicons name="add" size={22} color={colors.textWhite} />
          <Text style={styles.newBtnText}>Yeni</Text>
        </TouchableOpacity>
      </View>

      {/* Preset filtre chip bar (yatay scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipBar}
      >
        {PRESET_CHIPS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chip, presetFilter === c.value && styles.chipActive]}
            onPress={() => setPresetFilter(c.value)}
          >
            <Text style={[styles.chipText, presetFilter === c.value && styles.chipTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Durum filtre chip bar (yatay scroll, küçük) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipScroll}
        style={styles.chipBarSecondary}
      >
        {STATUS_CHIPS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.chipSmall, statusFilter === c.value && styles.chipSmallActive]}
            onPress={() => setStatusFilter(c.value)}
          >
            <Text style={[styles.chipSmallText, statusFilter === c.value && styles.chipSmallTextActive]}>
              {c.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Tarih aralığı + arama */}
      <View style={styles.filterRow}>
        <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('dateFrom')}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.dateChipText}>{dateFrom ? formatDateShort(dateFrom) : 'Başlangıç'}</Text>
        </TouchableOpacity>
        <Text style={styles.dateSep}>→</Text>
        <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('dateTo')}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.dateChipText}>{dateTo ? formatDateShort(dateTo) : 'Bitiş'}</Text>
        </TouchableOpacity>
        {(dateFrom || dateTo) && (
          <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }} style={styles.clearBtn}>
            <Ionicons name="close-circle" size={18} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>

      {/* Arama */}
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
      {list.loading && reservations.length === 0 ? (
        <LoadingState message="Rezervasyonlar yükleniyor..." />
      ) : (
        <FlatList
          data={reservations}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.primary]} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} />}
          ListEmptyComponent={<EmptyState icon="time-outline" title={list.error || 'Rezervasyon bulunamadı'} />}
          renderItem={({ item }) => {
            const payStatus = computePaymentStatus(item.totalAmount, item.paidAmount);
            const canCancel = item.status === RESERVATION_STATUS.RESERVED;
            return (
              <AppCard
                style={styles.rezCard}
                onPress={() => handleSelectReservation(item)}
                onLongPress={canCancel ? () => handleCancel(item) : undefined}
              >
                <View style={styles.rezTop}>
                  <View style={styles.rezTopLeft}>
                    <Text style={styles.rezIdText}>#{item.id}</Text>
                    <View style={styles.roomBadge}>
                      <Text style={styles.roomBadgeText}>{item.roomNumber}</Text>
                    </View>
                  </View>
                  <View style={styles.rezTopRight}>
                    <StatusChip
                      label={RESERVATION_STATUS_LABELS[item.status] || item.status}
                      color={RESERVATION_STATUS_COLORS[item.status] || '#64748B'}
                    />
                    <StatusChip
                      label={PAYMENT_STATUS_LABELS[payStatus]}
                      color={PAYMENT_STATUS_COLORS[payStatus]}
                    />
                  </View>
                </View>
                {item.guestNames ? (
                  <Text style={styles.rezGuests} numberOfLines={1}>
                    <Ionicons name="people-outline" size={12} /> {item.guestNames}
                  </Text>
                ) : item.placeholderGuestName ? (
                  <Text style={styles.rezGuests} numberOfLines={1}>
                    <Ionicons name="person-outline" size={12} /> {item.placeholderGuestName} (ön kayıt)
                  </Text>
                ) : null}
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
                {item.agencyName && (
                  <Text style={styles.rezCompany}>
                    <Ionicons name="globe-outline" size={11} /> {item.agencyName}
                    {item.agencyReservationCode ? ` · ${item.agencyReservationCode}` : ''}
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
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.rezGuestCount}>{item.guestCount} misafir</Text>
                    {item.createdByStaff && (
                      <Text style={styles.rezStaff}>Personel: {item.createdByStaff}</Text>
                    )}
                    {canCancel && (
                      <Text style={styles.rezHint}>Uzun bas → iptal</Text>
                    )}
                  </View>
                </View>
              </AppCard>
            );
          }}
        />
      )}

      {/* Detay yükleniyor overlay */}
      {loadingDetail && (
        <View style={styles.loadingOverlay}>
          <LoadingState message="Detay yükleniyor..." />
        </View>
      )}

      {/* Yeni rezervasyon modal */}
      <NewReservationModal
        visible={showNewReservation}
        onClose={() => setShowNewReservation(false)}
        onSaved={fetchReservations}
      />

      {/* Tarih seçici (dateFrom / dateTo) */}
      <CalendarPicker
        visible={calendarTarget !== null}
        selectedDate={
          calendarTarget === 'dateFrom'
            ? (dateFrom || new Date().toISOString().slice(0, 10))
            : (dateTo || dateFrom || new Date().toISOString().slice(0, 10))
        }
        title={calendarTarget === 'dateFrom' ? 'Başlangıç Tarihi' : 'Bitiş Tarihi'}
        onSelect={(d) => {
          if (calendarTarget === 'dateFrom') {
            setDateFrom(d);
            if (dateTo && dateTo < d) setDateTo(null);
          } else {
            setDateTo(d);
          }
        }}
        onClose={() => setCalendarTarget(null)}
      />
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
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.md,
  },
  newBtnText: { color: colors.textWhite, fontSize: fontSize.sm, fontWeight: '700' },

  /* Chip barlar */
  chipBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 48,
  },
  chipBarSecondary: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    maxHeight: 40,
  },
  chipScroll: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
    marginRight: 8,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textWhite, fontWeight: '600' },

  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    marginRight: 6,
  },
  chipSmallActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  chipSmallText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  chipSmallTextActive: { color: colors.primary, fontWeight: '700' },

  /* Tarih + temizle */
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  dateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  dateChipText: { fontSize: fontSize.xs, color: colors.textPrimary, fontWeight: '600' },
  dateSep: { fontSize: fontSize.sm, color: colors.textSecondary },
  clearBtn: { padding: 4 },

  searchContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, backgroundColor: colors.surface },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },

  /* Rezervasyon kartı */
  rezCard: { marginBottom: spacing.sm },
  rezTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  rezTopLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rezTopRight: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' },
  rezIdText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '700' },
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
  rezFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  rezAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  rezPaid: { fontSize: fontSize.xs, color: '#22C55E', marginTop: 2 },
  rezBalance: { fontSize: fontSize.xs, color: '#EF4444', fontWeight: '700', marginTop: 2 },
  rezGuestCount: { fontSize: fontSize.xs, color: colors.textSecondary },
  rezStaff: { fontSize: 10, color: colors.textDisabled, marginTop: 2 },
  rezHint: { fontSize: 10, color: colors.primary, marginTop: 4, fontStyle: 'italic' },

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
  tabBox: {
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: '#fafafa',
  },
  tabHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  tabNoBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary },
  tabNoText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  tabAmount: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  tabMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  tabItems: { marginTop: 6, paddingLeft: 8, borderLeftWidth: 2, borderLeftColor: colors.primary },
  tabItemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  tabItemDesc: { fontSize: fontSize.sm, color: colors.textPrimary, flex: 1, marginRight: 8 },
  tabItemPrice: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '500' },
});

export default ReservationHistoryScreen;
