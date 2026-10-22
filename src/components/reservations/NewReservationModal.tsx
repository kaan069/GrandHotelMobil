/**
 * NewReservationModal — Mobile'da yeni rezervasyon oluşturma
 *
 * Akış:
 *   1. Oda seç (aktif rezervasyonu olmayan, bloke olmayan odalar)
 *   2. Misafir: kayıtlı/yeni misafir YA DA ön kayıt (sadece ad soyad + telefon —
 *      kalıcı misafir oluşmaz; misafir geldiğinde oda ekranında kimlikle eklenir)
 *   3. Giriş + çıkış tarihi seç (CalendarPicker)
 *   4. Firma / Acente + acente rezervasyon kodu (opsiyonel)
 *   5. Not (opsiyonel)
 *   6. Kaydet → reservationsApi.create
 * Web karşılığı: components/reservations/NewReservationDialog.tsx + oda detayındaki Hızlı Rezervasyon
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, OptionPickerModal } from '../common';
import CalendarPicker from '../common/CalendarPicker';
import NewGuestModal from '../rooms/NewGuestModal';
import GuestSearchModal from '../rooms/GuestSearchModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROOM_STATUS, ROOM_STATUS_LABELS } from '../../utils/constants';
import { reservationsApi, roomsApi, companiesApi, agenciesApi, Agency } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import type { ApiRoom, Guest, Company } from '../../utils/types';

interface NewReservationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** Oda ekranından açılınca oda seçili gelir */
  initialRoomId?: number;
  /** true → ön kayıt (ad soyad + telefon) modunda açılır */
  initialQuick?: boolean;
}

type GuestMode = 'guest' | 'quick';
type PickerTarget = 'room' | 'company' | 'agency' | null;

const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const addDays = (s: string, n: number): string => {
  const d = new Date(s + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateTr = (s: string): string => {
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const NewReservationModal: React.FC<NewReservationModalProps> = ({
  visible, onClose, onSaved, initialRoomId, initialQuick = false,
}) => {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [guestMode, setGuestMode] = useState<GuestMode>('guest');
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [quickName, setQuickName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(null);
  const [agencyCode, setAgencyCode] = useState('');
  const [checkIn, setCheckIn] = useState<string>(todayStr());
  const [checkOut, setCheckOut] = useState<string>(addDays(todayStr(), 1));
  const [notes, setNotes] = useState('');

  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'checkIn' | 'checkOut' | null>(null);
  const [picker, setPicker] = useState<PickerTarget>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    /* Reset + fetch */
    setSelectedRoomId(initialRoomId ?? null);
    setGuestMode(initialQuick ? 'quick' : 'guest');
    setSelectedGuest(null);
    setQuickName('');
    setQuickPhone('');
    setSelectedCompanyId(null);
    setSelectedAgencyId(null);
    setAgencyCode('');
    setCheckIn(todayStr());
    setCheckOut(addDays(todayStr(), 1));
    setNotes('');
    setSubmitting(false);

    roomsApi.getAll().then(setRooms).catch(() => setRooms([]));
    companiesApi.getAll().then(setCompanies).catch(() => setCompanies([]));
    agenciesApi.getAll().then((list) => setAgencies(list.filter((a) => a.isActive !== false))).catch(() => setAgencies([]));
  }, [visible, initialRoomId, initialQuick]);

  /* Odada aynı anda tek aktif rezervasyon olabilir (backend kuralı) → rezervasyonu olan odalar seçilemez */
  const reservableRooms = rooms
    .filter((r) => !r.reservationId && r.status !== ROOM_STATUS.BLOCKED)
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber, 'tr', { numeric: true }));
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);
  const selectedAgency = agencies.find((a) => a.id === selectedAgencyId);

  const handleCheckInChange = (newDate: string) => {
    setCheckIn(newDate);
    if (checkOut <= newDate) setCheckOut(addDays(newDate, 1));
  };

  const handleSave = async () => {
    if (!selectedRoomId) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir oda seçin.');
      return;
    }
    if (guestMode === 'guest' && !selectedGuest) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir misafir seçin veya oluşturun.');
      return;
    }
    if (guestMode === 'quick' && quickName.trim().split(/\s+/).length < 2) {
      Alert.alert('Eksik Bilgi', 'Ön kayıt için misafirin adını ve soyadını girin.');
      return;
    }
    setSubmitting(true);
    try {
      await reservationsApi.create({
        roomId: selectedRoomId,
        ...(guestMode === 'guest'
          ? { guestId: selectedGuest!.id }
          : { placeholderGuestName: quickName.trim(), placeholderGuestPhone: quickPhone.trim() || undefined }),
        checkIn,
        checkOut,
        notes: notes.trim() || undefined,
        companyId: selectedCompanyId ?? undefined,
        agencyId: selectedAgencyId ?? undefined,
        agencyReservationCode: selectedAgencyId ? agencyCode.trim() || undefined : undefined,
        staffName: user?.name,
      });
      onSaved();
      onClose();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Rezervasyon oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

  const renderSelector = (icon: keyof typeof Ionicons.glyphMap, text: string, placeholder: boolean, onPress: () => void, trailing: keyof typeof Ionicons.glyphMap = 'chevron-down') => (
    <TouchableOpacity style={styles.selector} onPress={onPress}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} />
      <Text style={[styles.selectorText, placeholder && styles.selectorPlaceholder]}>{text}</Text>
      <Ionicons name={trailing} size={18} color={colors.textSecondary} />
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Yeni Rezervasyon</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Oda Seçimi */}
            <Text style={styles.label}>Oda *</Text>
            {renderSelector(
              'bed-outline',
              selectedRoom ? `Oda ${selectedRoom.roomNumber} · Kat ${selectedRoom.floor}` : 'Oda seçin',
              !selectedRoom,
              () => {
                if (reservableRooms.length === 0) {
                  Alert.alert('Uygun Oda Yok', 'Aktif rezervasyonu olmayan oda bulunmuyor.');
                  return;
                }
                setPicker('room');
              },
            )}

            {/* Misafir modu */}
            <Text style={styles.label}>Misafir *</Text>
            <View style={styles.segment}>
              {([['guest', 'Misafir Kaydı'], ['quick', 'Ön Kayıt (İsim/Telefon)']] as [GuestMode, string][]).map(([mode, label]) => (
                <TouchableOpacity
                  key={mode}
                  style={[styles.segmentBtn, guestMode === mode && styles.segmentBtnActive]}
                  onPress={() => setGuestMode(mode)}
                >
                  <Text style={[styles.segmentText, guestMode === mode && styles.segmentTextActive]}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {guestMode === 'guest' ? (
              <>
                {renderSelector(
                  'person-outline',
                  selectedGuest ? `${selectedGuest.firstName} ${selectedGuest.lastName}` : 'Kayıtlı misafir seçin',
                  !selectedGuest,
                  () => setShowGuestSearch(true),
                  'search',
                )}
                <TouchableOpacity onPress={() => setShowNewGuest(true)} style={styles.linkBtn}>
                  <Ionicons name="person-add-outline" size={14} color={colors.primary} />
                  <Text style={styles.linkText}>Yeni misafir oluştur (kimlik bilgileriyle)</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <AppInput value={quickName} onChangeText={setQuickName} placeholder="Ad Soyad" icon="person-outline" />
                <AppInput value={quickPhone} onChangeText={setQuickPhone} placeholder="Telefon (opsiyonel)" icon="call-outline" keyboardType="phone-pad" />
                <Text style={styles.hint}>
                  Ön kayıtta kalıcı misafir oluşmaz. Misafir geldiğinde oda ekranından kimlik bilgileriyle eklenip check-in yapılır.
                </Text>
              </>
            )}

            {/* Giriş Tarihi */}
            <Text style={styles.label}>Giriş Tarihi</Text>
            {renderSelector('calendar', formatDateTr(checkIn), false, () => setCalendarTarget('checkIn'))}

            {/* Çıkış Tarihi */}
            <Text style={styles.label}>Çıkış Tarihi</Text>
            {renderSelector('calendar', formatDateTr(checkOut), false, () => setCalendarTarget('checkOut'))}

            {/* Firma */}
            <Text style={styles.label}>Firma (Opsiyonel)</Text>
            {renderSelector('business-outline', selectedCompany ? selectedCompany.name : 'Bireysel (firma yok)', !selectedCompany, () => setPicker('company'))}

            {/* Acente */}
            <Text style={styles.label}>Acente (Opsiyonel)</Text>
            {renderSelector('globe-outline', selectedAgency ? selectedAgency.name : 'Acente yok', !selectedAgency, () => setPicker('agency'))}
            {selectedAgency && (
              <AppInput
                value={agencyCode}
                onChangeText={setAgencyCode}
                placeholder="Acente rezervasyon kodu (opsiyonel)"
                icon="barcode-outline"
              />
            )}

            {/* Not */}
            <Text style={styles.label}>Not</Text>
            <AppInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Rezervasyon notu..."
              multiline
            />

            <AppButton
              title="Rezervasyon Oluştur"
              onPress={handleSave}
              icon="bookmark-outline"
              loading={submitting}
              disabled={submitting}
              style={{ marginTop: spacing.md }}
            />
            <AppButton
              title="Vazgeç"
              onPress={onClose}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        </View>
      </View>

      {/* Misafir Arama Modal */}
      <GuestSearchModal
        visible={showGuestSearch}
        roomNumber={selectedRoom?.roomNumber || ''}
        onClose={() => setShowGuestSearch(false)}
        onSelect={(g) => {
          setSelectedGuest(g);
          setShowGuestSearch(false);
        }}
      />

      {/* Yeni Misafir Modal */}
      <NewGuestModal
        visible={showNewGuest}
        onClose={() => setShowNewGuest(false)}
        onSave={(g) => {
          setSelectedGuest(g);
          setShowNewGuest(false);
        }}
      />

      {/* Takvim */}
      <CalendarPicker
        visible={calendarTarget !== null}
        selectedDate={calendarTarget === 'checkIn' ? checkIn : checkOut}
        minDate={calendarTarget === 'checkIn' ? todayStr() : addDays(checkIn, 1)}
        title={calendarTarget === 'checkIn' ? 'Giriş Tarihi' : 'Çıkış Tarihi'}
        onSelect={(d) => {
          if (calendarTarget === 'checkIn') handleCheckInChange(d);
          else setCheckOut(d);
        }}
        onClose={() => setCalendarTarget(null)}
      />

      {/* Seçiciler */}
      <OptionPickerModal<number | null>
        visible={picker === 'room'}
        title="Oda Seçin"
        options={reservableRooms.map((r) => ({
          value: r.id,
          label: `Oda ${r.roomNumber}`,
          sublabel: `Kat ${r.floor} · ${ROOM_STATUS_LABELS[r.status] || r.status}`,
        }))}
        selectedValue={selectedRoomId}
        onSelect={setSelectedRoomId}
        onClose={() => setPicker(null)}
        searchable
      />
      <OptionPickerModal<number | null>
        visible={picker === 'company'}
        title="Firma Seçin"
        options={[
          { value: null, label: 'Bireysel (firma yok)' },
          ...companies.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.agreedRate ? `${Number(c.agreedRate).toLocaleString('tr-TR')} ₺/gece` : undefined,
          })),
        ]}
        selectedValue={selectedCompanyId}
        onSelect={setSelectedCompanyId}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal<number | null>
        visible={picker === 'agency'}
        title="Acente Seçin"
        options={[
          { value: null, label: 'Acente yok' },
          ...agencies.map((a) => ({
            value: a.id,
            label: a.name,
            sublabel: a.commissionRate && Number(a.commissionRate) > 0 ? `Komisyon %${Number(a.commissionRate)}` : undefined,
          })),
        ]}
        selectedValue={selectedAgencyId}
        onSelect={(v) => { setSelectedAgencyId(v); if (!v) setAgencyCode(''); }}
        onClose={() => setPicker(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
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
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
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
  selectorText: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  selectorPlaceholder: {
    color: colors.textDisabled,
    fontWeight: '400',
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.divider,
    borderRadius: borderRadius.md,
    padding: 3,
    marginBottom: spacing.sm,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  linkText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
});

export default NewReservationModal;
