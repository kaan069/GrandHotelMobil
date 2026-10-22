/**
 * ReservationEditModal — Rezervasyon Düzenle
 *
 * Rezerve: oda, giriş/çıkış, firma, acente (+kod), not değişebilir.
 * Giriş yapılmış: oda ("Oda Taşı" ile değişir) ve giriş tarihi sabit; çıkış tarihi
 * (uzatma/kısaltma), firma, acente ve not değişebilir. Backend aynı kuralları uygular.
 * Web karşılığı: components/reservations/ReservationEditDialog.tsx
 *
 * API: reservationsApi.update → PUT /api/reservations/{id}/
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, OptionPickerModal } from '../common';
import CalendarPicker from '../common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROOM_STATUS, ROOM_STATUS_LABELS, RESERVATION_STATUS } from '../../utils/constants';
import { reservationsApi, roomsApi, companiesApi, agenciesApi, Agency } from '../../services/api';
import type { ApiRoom, Company, Reservation } from '../../utils/types';

interface ReservationEditModalProps {
  visible: boolean;
  reservation: Reservation | null;
  onClose: () => void;
  onSaved: () => void;
}

type PickerTarget = 'room' | 'company' | 'agency' | null;

const localDateStr = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/** Backend ISO tarih-saatini yerel takvim gününe çevir */
const isoToLocalDate = (iso: string | null): string => (iso ? localDateStr(new Date(iso)) : '');

const addDays = (s: string, n: number): string => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return localDateStr(d);
};

const formatDateTr = (s: string): string =>
  s ? new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' }) : 'Seçilmedi';

const ReservationEditModal: React.FC<ReservationEditModalProps> = ({ visible, reservation, onClose, onSaved }) => {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [roomId, setRoomId] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [agencyId, setAgencyId] = useState<number | null>(null);
  const [agencyCode, setAgencyCode] = useState('');
  const [notes, setNotes] = useState('');
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [calendarTarget, setCalendarTarget] = useState<'checkIn' | 'checkOut' | null>(null);
  const [saving, setSaving] = useState(false);

  const isCheckedIn = reservation?.status === RESERVATION_STATUS.CHECKED_IN;

  useEffect(() => {
    if (!visible || !reservation) return;
    setRoomId(reservation.roomId);
    setCheckIn(isoToLocalDate(reservation.checkIn));
    setCheckOut(isoToLocalDate(reservation.checkOut));
    setCompanyId(reservation.companyId ?? null);
    setAgencyId(reservation.agencyId ?? null);
    setAgencyCode(reservation.agencyReservationCode || '');
    setNotes(reservation.notes || '');
    setSaving(false);
    if (reservation.status === RESERVATION_STATUS.RESERVED) {
      roomsApi.getAll().then(setRooms).catch(() => setRooms([]));
    }
    companiesApi.getAll().then(setCompanies).catch(() => setCompanies([]));
    agenciesApi.getAll().then(setAgencies).catch(() => setAgencies([]));
  }, [visible, reservation]);

  if (!reservation) return null;

  const today = localDateStr(new Date());
  /* Çıkış en erken: giriş + 1 gün; konaklayan misafirde ayrıca bugünden önce olamaz */
  const minCheckOut = checkIn ? addDays(checkIn, 1) : today;
  const checkOutMin = isCheckedIn && minCheckOut < today ? today : minCheckOut;

  const roomOptions = rooms
    .filter((r) => r.id === reservation.roomId || (!r.reservationId && r.status !== ROOM_STATUS.BLOCKED))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'tr', { numeric: true }))
    .map((r) => ({
      value: r.id as number | null,
      label: `Oda ${r.roomNumber}`,
      sublabel: r.id === reservation.roomId ? 'Mevcut oda' : `Kat ${r.floor} · ${ROOM_STATUS_LABELS[r.status] || r.status}`,
    }));

  const selectedRoomLabel = rooms.find((r) => r.id === roomId)?.roomNumber ?? reservation.roomNumber;
  const selectedCompany = companies.find((c) => c.id === companyId);
  const selectedAgency = agencies.find((a) => a.id === agencyId);

  const handleSave = async () => {
    if (!checkOut) {
      Alert.alert('Eksik Bilgi', 'Çıkış tarihi seçin.');
      return;
    }
    if (checkIn && checkOut <= checkIn) {
      Alert.alert('Geçersiz Tarih', 'Çıkış tarihi girişten sonra olmalı.');
      return;
    }
    setSaving(true);
    try {
      await reservationsApi.update(reservation.id, {
        ...(isCheckedIn ? {} : { roomId: roomId ?? undefined, checkIn }),
        checkOut,
        notes,
        companyId,
        agencyId,
        agencyReservationCode: agencyId ? agencyCode.trim() : '',
      });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Güncellenemedi', (err as Error).message || 'Beklenmeyen bir hata oluştu');
    } finally {
      setSaving(false);
    }
  };

  const renderSelector = (
    icon: keyof typeof Ionicons.glyphMap, text: string, onPress?: () => void, locked?: string,
  ) => (
    <>
      <TouchableOpacity style={[styles.selector, !onPress && styles.selectorLocked]} onPress={onPress} disabled={!onPress}>
        <Ionicons name={icon} size={18} color={colors.textSecondary} />
        <Text style={styles.selectorText}>{text}</Text>
        <Ionicons name={onPress ? 'chevron-down' : 'lock-closed-outline'} size={16} color={colors.textSecondary} />
      </TouchableOpacity>
      {!!locked && <Text style={styles.hint}>{locked}</Text>}
    </>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Rezervasyon Düzenle #{reservation.id}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
            {!!(reservation.guestNames || reservation.placeholderGuestName) && (
              <Text style={styles.guestText}>
                Misafir: {reservation.guestNames || `${reservation.placeholderGuestName} (ön kayıt)`}
              </Text>
            )}

            <Text style={styles.label}>Oda</Text>
            {renderSelector(
              'bed-outline',
              `Oda ${selectedRoomLabel}`,
              isCheckedIn ? undefined : () => setPicker('room'),
              isCheckedIn ? 'Konaklayan misafirin odası oda ekranındaki "Oda Taşı" ile değişir.' : undefined,
            )}

            <Text style={styles.label}>Giriş Tarihi</Text>
            {renderSelector(
              'calendar',
              formatDateTr(checkIn),
              isCheckedIn ? undefined : () => setCalendarTarget('checkIn'),
              isCheckedIn ? 'Giriş yapıldı — değiştirilemez.' : undefined,
            )}

            <Text style={styles.label}>Çıkış Tarihi</Text>
            {renderSelector('calendar', formatDateTr(checkOut), () => setCalendarTarget('checkOut'))}

            <Text style={styles.label}>Firma</Text>
            {renderSelector('business-outline', selectedCompany ? selectedCompany.name : 'Bireysel (firma yok)', () => setPicker('company'))}

            <Text style={styles.label}>Acente</Text>
            {renderSelector('globe-outline', selectedAgency ? selectedAgency.name : 'Acente yok', () => setPicker('agency'))}
            {!!agencyId && (
              <AppInput value={agencyCode} onChangeText={setAgencyCode} placeholder="Acente rezervasyon kodu" icon="barcode-outline" />
            )}

            <Text style={styles.label}>Not</Text>
            <AppInput value={notes} onChangeText={setNotes} placeholder="Rezervasyon notu..." multiline />

            <AppButton title="Kaydet" icon="save-outline" onPress={handleSave} loading={saving} style={{ marginTop: spacing.md }} />
            <AppButton title="Vazgeç" variant="outline" onPress={onClose} disabled={saving} style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </View>

      <CalendarPicker
        visible={calendarTarget !== null}
        selectedDate={(calendarTarget === 'checkIn' ? checkIn : checkOut) || today}
        minDate={calendarTarget === 'checkIn' ? today : checkOutMin}
        title={calendarTarget === 'checkIn' ? 'Giriş Tarihi' : 'Çıkış Tarihi'}
        onSelect={(d) => {
          if (calendarTarget === 'checkIn') {
            setCheckIn(d);
            if (!checkOut || checkOut <= d) setCheckOut(addDays(d, 1));
          } else {
            setCheckOut(d);
          }
        }}
        onClose={() => setCalendarTarget(null)}
      />

      <OptionPickerModal<number | null>
        visible={picker === 'room'}
        title="Oda Seçin"
        options={roomOptions}
        selectedValue={roomId}
        onSelect={setRoomId}
        onClose={() => setPicker(null)}
        searchable
      />
      <OptionPickerModal<number | null>
        visible={picker === 'company'}
        title="Firma Seçin"
        options={[{ value: null, label: 'Bireysel (firma yok)' }, ...companies.map((c) => ({ value: c.id, label: c.name }))]}
        selectedValue={companyId}
        onSelect={setCompanyId}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal<number | null>
        visible={picker === 'agency'}
        title="Acente Seçin"
        options={[
          { value: null, label: 'Acente yok' },
          ...agencies
            .filter((a) => a.isActive !== false || a.id === reservation.agencyId)
            .map((a) => ({ value: a.id, label: a.name })),
        ]}
        selectedValue={agencyId}
        onSelect={(v) => { setAgencyId(v); if (!v) setAgencyCode(''); }}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  form: { padding: spacing.md },
  guestText: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.xs },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: spacing.sm },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 14,
    marginBottom: 4,
  },
  selectorLocked: { backgroundColor: colors.divider },
  selectorText: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500' },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
});

export default ReservationEditModal;
