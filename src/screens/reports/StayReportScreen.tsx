/**
 * StayReportScreen — Oda Raporu / Firma Raporu
 *
 * Oda veya firma seçilir, isteğe bağlı giriş tarihi aralığı verilir.
 * Özet (konaklama sayısı, ciro / ödenen / bakiye — sadece gerçekleşmiş konaklamalar)
 * ve rezervasyon listesi (iptaller hariç) gösterilir.
 * Web karşılığı: pages/reports/RoomReport.tsx, CompanyReport.tsx
 *
 * API: reportsApi.room / reportsApi.company, roomsApi.getAll, companiesApi.getAll
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, LoadingState, EmptyState, OptionPickerModal } from '../../components/common';
import CalendarPicker from '../../components/common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS, ROOM_STATUS_LABELS } from '../../utils/constants';
import { reportsApi, roomsApi, companiesApi, RoomReport, CompanyReport, StayReportReservation } from '../../services/api';
import type { ApiRoom, Company } from '../../utils/types';

interface StayReportScreenProps {
  mode: 'room' | 'company';
  onClose: () => void;
}

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const formatDay = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

const StayReportScreen: React.FC<StayReportScreenProps> = ({ mode, onClose }) => {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<string | null>(null);
  const [dateTo, setDateTo] = useState<string | null>(null);
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to' | null>(null);
  const [report, setReport] = useState<RoomReport | CompanyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (mode === 'room') roomsApi.getAll().then(setRooms).catch(() => setRooms([]));
    else companiesApi.getAll().then(setCompanies).catch(() => setCompanies([]));
  }, [mode]);

  useEffect(() => {
    if (!selectedId) { setReport(null); return; }
    let cancelled = false;
    setLoading(true);
    const filters = { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined };
    const request = mode === 'room' ? reportsApi.room(selectedId, filters) : reportsApi.company(selectedId, filters);
    request
      .then((data) => { if (!cancelled) setReport(data); })
      .catch((err: Error) => { if (!cancelled) Alert.alert('Hata', err.message || 'Rapor yüklenemedi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [mode, selectedId, dateFrom, dateTo]);

  const options = mode === 'room'
    ? [...rooms]
      .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'tr', { numeric: true }))
      .map((r) => ({ value: r.id as number | null, label: `Oda ${r.roomNumber}`, sublabel: `Kat ${r.floor} · ${ROOM_STATUS_LABELS[r.status] || r.status}` }))
    : companies.map((c) => ({ value: c.id as number | null, label: c.name, sublabel: c.taxNumber || undefined }));

  const selectedLabel = options.find((o) => o.value === selectedId)?.label;
  const title = mode === 'room' ? 'Oda Raporu' : 'Firma Raporu';

  const renderSummary = () => {
    if (!report) return null;
    if (mode === 'room') {
      const r = report as RoomReport;
      return (
        <AppCard style={styles.card}>
          <InfoRow label="Durum" value={ROOM_STATUS_LABELS[r.room.status] || r.room.status} />
          <InfoRow label="Gecelik Fiyat" value={money(r.room.price)} />
          <InfoRow label="Konaklama" value={`${r.summary.totalReservations}`} />
          <InfoRow label="Toplam Ciro" value={money(r.summary.totalRevenue)} strong />
        </AppCard>
      );
    }
    const c = report as CompanyReport;
    const balance = Number(c.summary.balance);
    return (
      <AppCard style={styles.card}>
        <InfoRow label="Konaklama" value={`${c.summary.totalReservations} (${c.summary.activeReservations} aktif)`} />
        <InfoRow label="Misafir" value={`${c.summary.totalGuests}`} />
        <InfoRow label="Toplam Tutar" value={money(c.summary.totalAmount)} strong />
        <InfoRow label="Ödenen" value={money(c.summary.paidAmount)} color={colors.success} />
        <InfoRow label="Bakiye" value={money(balance)} color={balance > 0 ? colors.error : colors.success} strong />
      </AppCard>
    );
  };

  const renderReservation = (r: StayReportReservation) => {
    const balance = Number(r.totalAmount) - Number(r.paidAmount);
    const guests = r.stays.map((st) => st.guestName).join(', ');
    return (
      <AppCard key={r.id} style={styles.card}>
        <View style={styles.rezTop}>
          <Text style={styles.rezTitle}>{mode === 'room' ? (guests || 'Misafir yok') : `Oda ${r.roomNumber}`}</Text>
          <StatusChip label={RESERVATION_STATUS_LABELS[r.status] || r.status} color={RESERVATION_STATUS_COLORS[r.status] || colors.textSecondary} />
        </View>
        {mode === 'company' && !!guests && <Text style={styles.meta}>{guests}</Text>}
        <Text style={styles.meta}>{formatDate(r.checkIn)} → {formatDate(r.checkOut)}</Text>
        <Text style={styles.meta}>
          {money(r.totalAmount)} · Ödenen {money(r.paidAmount)}
          {balance > 0 && r.status !== 'reserved' ? ` · Bakiye ${money(balance)}` : ''}
          {r.status === 'reserved' ? ' (planlanan)' : ''}
        </Text>
      </AppCard>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="arrow-back" size={24} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>{title}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <TouchableOpacity style={styles.selector} onPress={() => setPickerOpen(true)}>
          <Ionicons name={mode === 'room' ? 'bed-outline' : 'business-outline'} size={18} color={colors.textSecondary} />
          <Text style={[styles.selectorText, !selectedLabel && { color: colors.textDisabled }]}>
            {selectedLabel || (mode === 'room' ? 'Oda seçin' : 'Firma seçin')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
        </TouchableOpacity>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('from')}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.dateChipText}>{dateFrom ? formatDay(dateFrom) : 'Başlangıç'}</Text>
          </TouchableOpacity>
          <Text style={styles.meta}>→</Text>
          <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('to')}>
            <Ionicons name="calendar-outline" size={14} color={colors.primary} />
            <Text style={styles.dateChipText}>{dateTo ? formatDay(dateTo) : 'Bitiş'}</Text>
          </TouchableOpacity>
          {(dateFrom || dateTo) && (
            <TouchableOpacity onPress={() => { setDateFrom(null); setDateTo(null); }}>
              <Ionicons name="close-circle" size={20} color={colors.error} />
            </TouchableOpacity>
          )}
        </View>

        {!selectedId ? (
          <EmptyState icon="bar-chart-outline" title={mode === 'room' ? 'Rapor için oda seçin' : 'Rapor için firma seçin'} />
        ) : loading ? (
          <LoadingState message="Rapor hazırlanıyor..." />
        ) : report ? (
          <>
            {renderSummary()}
            <Text style={styles.sectionTitle}>Konaklamalar ({report.reservations.length})</Text>
            {report.reservations.length === 0
              ? <Text style={styles.emptyText}>Kayıt yok</Text>
              : report.reservations.map(renderReservation)}
            <Text style={styles.hint}>Tutar toplamları sadece giriş yapılmış / tamamlanmış konaklamalardan hesaplanır.</Text>
          </>
        ) : null}
      </ScrollView>

      <OptionPickerModal<number | null>
        visible={pickerOpen}
        title={mode === 'room' ? 'Oda Seçin' : 'Firma Seçin'}
        options={options}
        selectedValue={selectedId}
        onSelect={setSelectedId}
        onClose={() => setPickerOpen(false)}
        searchable
      />
      <CalendarPicker
        visible={calendarTarget !== null}
        selectedDate={(calendarTarget === 'to' ? dateTo : dateFrom) || new Date().toISOString().slice(0, 10)}
        minDate={calendarTarget === 'to' && dateFrom ? dateFrom : undefined}
        title={calendarTarget === 'to' ? 'Bitiş Tarihi' : 'Başlangıç Tarihi'}
        onSelect={(d) => {
          if (calendarTarget === 'from') {
            setDateFrom(d);
            if (dateTo && dateTo < d) setDateTo(d);
          } else {
            setDateTo(d);
          }
        }}
        onClose={() => setCalendarTarget(null)}
      />
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; color?: string; strong?: boolean }> = ({ label, value, color, strong }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, strong && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.background, zIndex: 10 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.md, paddingBottom: 100 },
  selector: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.md, padding: 14, marginBottom: spacing.sm,
  },
  selectorText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '600' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateChipText: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600' },
  card: { marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm, marginBottom: spacing.xs },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  rezTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm },
  rezTitle: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.md, fontSize: fontSize.sm },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});

export default StayReportScreen;
