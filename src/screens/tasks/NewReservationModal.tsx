/**
 * NewReservationModal — Mobile'da yeni rezervasyon oluşturma
 *
 * Akış:
 *   1. Müsait oda seç (dropdown)
 *   2. Misafir seç (kayıtlı misafir ara veya yeni misafir oluştur)
 *   3. Giriş + çıkış tarihi seç (CalendarPicker)
 *   4. Firma (opsiyonel)
 *   5. Not (opsiyonel)
 *   6. Kaydet → reservationsApi.create
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

import { AppButton, AppInput } from '../../components/common';
import CalendarPicker from '../../components/common/CalendarPicker';
import NewGuestModal from '../../components/rooms/NewGuestModal';
import GuestSearchModal from '../../components/rooms/GuestSearchModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { reservationsApi, roomsApi, companiesApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';
import type { ApiRoom, Guest, Company } from '../../utils/types';

interface NewReservationModalProps {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

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

const NewReservationModal: React.FC<NewReservationModalProps> = ({ visible, onClose, onSaved }) => {
  const { user } = useAuth();

  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [checkIn, setCheckIn] = useState<string>(todayStr());
  const [checkOut, setCheckOut] = useState<string>(addDays(todayStr(), 1));
  const [notes, setNotes] = useState('');

  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'checkIn' | 'checkOut' | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    /* Reset + fetch */
    setSelectedRoomId(null);
    setSelectedGuest(null);
    setSelectedCompanyId(null);
    setCheckIn(todayStr());
    setCheckOut(addDays(todayStr(), 1));
    setNotes('');
    setSubmitting(false);

    roomsApi.getAll().then(setRooms).catch(() => setRooms([]));
    companiesApi.getAll().then(setCompanies).catch(() => setCompanies([]));
  }, [visible]);

  const availableRooms = rooms.filter((r) => r.status === 'available');
  const selectedRoom = rooms.find((r) => r.id === selectedRoomId);
  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  const handleCheckInChange = (newDate: string) => {
    setCheckIn(newDate);
    if (checkOut <= newDate) setCheckOut(addDays(newDate, 1));
  };

  const handleSave = async () => {
    if (!selectedRoomId) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir oda seçin.');
      return;
    }
    if (!selectedGuest) {
      Alert.alert('Eksik Bilgi', 'Lütfen bir misafir seçin veya oluşturun.');
      return;
    }
    setSubmitting(true);
    try {
      await reservationsApi.create({
        roomId: selectedRoomId,
        guestId: selectedGuest.id,
        checkIn,
        checkOut,
        notes: notes.trim() || undefined,
        companyId: selectedCompanyId ?? undefined,
        staffName: user?.name,
      });
      onSaved();
      onClose();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Rezervasyon oluşturulamadı');
    } finally {
      setSubmitting(false);
    }
  };

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

          <ScrollView style={styles.form} contentContainerStyle={{ paddingBottom: spacing.xl }} showsVerticalScrollIndicator={false}>
            {/* Oda Seçimi */}
            <Text style={styles.label}>Oda *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => {
                if (availableRooms.length === 0) {
                  Alert.alert('Müsait Oda Yok', 'Şu anda boş oda bulunmuyor.');
                  return;
                }
                const options = availableRooms.slice(0, 30).map((r) => ({
                  text: `Oda ${r.roomNumber} (${r.bedType || ''} · Kat ${r.floor})`,
                  onPress: () => setSelectedRoomId(r.id),
                }));
                Alert.alert('Oda Seçin', `Müsait: ${availableRooms.length}`, [
                  ...options,
                  { text: 'İptal', style: 'cancel' as const },
                ]);
              }}
            >
              <Ionicons name="bed-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.selectorText, !selectedRoom && styles.selectorPlaceholder]}>
                {selectedRoom ? `Oda ${selectedRoom.roomNumber}` : 'Müsait oda seçin'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Misafir */}
            <Text style={styles.label}>Misafir *</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => setShowGuestSearch(true)}
            >
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.selectorText, !selectedGuest && styles.selectorPlaceholder]}>
                {selectedGuest ? `${selectedGuest.firstName} ${selectedGuest.lastName}` : 'Misafir seçin'}
              </Text>
              <Ionicons name="search" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowNewGuest(true)} style={styles.linkBtn}>
              <Ionicons name="person-add-outline" size={14} color={colors.primary} />
              <Text style={styles.linkText}>Yeni misafir oluştur</Text>
            </TouchableOpacity>

            {/* Giriş Tarihi */}
            <Text style={styles.label}>Giriş Tarihi</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setCalendarTarget('checkIn')}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.selectorText}>{formatDateTr(checkIn)}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Çıkış Tarihi */}
            <Text style={styles.label}>Çıkış Tarihi</Text>
            <TouchableOpacity style={styles.selector} onPress={() => setCalendarTarget('checkOut')}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.selectorText}>{formatDateTr(checkOut)}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Firma */}
            <Text style={styles.label}>Firma (Opsiyonel)</Text>
            <TouchableOpacity
              style={styles.selector}
              onPress={() => {
                const options = [
                  { text: 'Bireysel (Firma Yok)', onPress: () => setSelectedCompanyId(null) },
                  ...companies.map((c) => ({
                    text: c.name,
                    onPress: () => setSelectedCompanyId(c.id),
                  })),
                ];
                Alert.alert('Firma Seçin', undefined, [
                  ...options,
                  { text: 'İptal', style: 'cancel' as const },
                ]);
              }}
            >
              <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.selectorText, !selectedCompany && styles.selectorPlaceholder]}>
                {selectedCompany ? selectedCompany.name : 'Firma seçin'}
              </Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

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
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  linkText: { fontSize: fontSize.xs, color: colors.primary, fontWeight: '600' },
});

export default NewReservationModal;
