import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../common';
import CalendarPicker from '../common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import type { RoomGuest } from '../../utils/types';

interface ReservationConfirmModalProps {
  visible: boolean;
  roomNumber: string;
  guests: RoomGuest[];
  companyName?: string | null;
  notes?: string;
  onClose: () => void;
  onConfirm: (checkIn: string, checkOut: string | null) => Promise<void>;
}

const todayStr = (): string => {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const addDays = (dateStr: string, days: number): string => {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const formatDateTr = (dateStr: string): string => {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

const ReservationConfirmModal: React.FC<ReservationConfirmModalProps> = ({
  visible, roomNumber, guests, companyName, notes, onClose, onConfirm,
}) => {
  const [checkIn, setCheckIn] = useState<string>(todayStr());
  const [checkOut, setCheckOut] = useState<string>(addDays(todayStr(), 1));
  const [submitting, setSubmitting] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'checkIn' | 'checkOut' | null>(null);

  useEffect(() => {
    if (visible) {
      setCheckIn(todayStr());
      setCheckOut(addDays(todayStr(), 1));
      setSubmitting(false);
      setCalendarTarget(null);
    }
  }, [visible]);

  /* Giriş tarihi değişirse çıkışı en az +1 gün tut */
  const handleCheckInChange = (newCheckIn: string) => {
    setCheckIn(newCheckIn);
    if (checkOut <= newCheckIn) {
      setCheckOut(addDays(newCheckIn, 1));
    }
  };

  const handleConfirm = async () => {
    setSubmitting(true);
    try {
      await onConfirm(checkIn, checkOut);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Rezervasyon — Oda {roomNumber}</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Misafirler ({guests.length})</Text>
            <View style={styles.guestList}>
              {guests.map((g, i) => (
                <View key={g.guestId} style={styles.guestRow}>
                  <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
                  <Text style={styles.guestName}>{g.guestName}</Text>
                  {i === 0 && <Text style={styles.ownerTag}>Sahibi</Text>}
                </View>
              ))}
            </View>

            {companyName ? (
              <>
                <Text style={styles.label}>Firma</Text>
                <View style={styles.infoBox}>
                  <Ionicons name="business-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{companyName}</Text>
                </View>
              </>
            ) : null}

            <Text style={styles.label}>Giriş Tarihi</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarTarget('checkIn')}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dateSelectorText}>{formatDateTr(checkIn)}</Text>
              {checkIn === todayStr() && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Bugün</Text>
                </View>
              )}
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            <Text style={styles.label}>Çıkış Tarihi</Text>
            <TouchableOpacity style={styles.dateSelector} onPress={() => setCalendarTarget('checkOut')}>
              <Ionicons name="calendar" size={18} color={colors.primary} />
              <Text style={styles.dateSelectorText}>{formatDateTr(checkOut)}</Text>
              <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
            </TouchableOpacity>

            {notes ? (
              <>
                <Text style={styles.label}>Not</Text>
                <View style={styles.infoBox}>
                  <Ionicons name="document-text-outline" size={16} color={colors.textSecondary} />
                  <Text style={styles.infoText}>{notes}</Text>
                </View>
              </>
            ) : null}

            <AppButton
              title="Rezerve Et"
              onPress={handleConfirm}
              icon="bookmark-outline"
              loading={submitting}
              disabled={submitting || guests.length === 0}
              style={{ marginTop: spacing.md }}
            />

            <AppButton
              title="Vazgeç"
              onPress={onClose}
              variant="outline"
              style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}
            />
          </ScrollView>

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
        </View>
      </TouchableOpacity>
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
    maxHeight: '90%',
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  form: {
    padding: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
    marginTop: spacing.sm,
  },
  guestList: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
  },
  guestName: {
    flex: 1,
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  ownerTag: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '700',
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  fixedDateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  fixedDateText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  todayBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  todayBadgeText: {
    fontSize: fontSize.xs,
    color: colors.primary,
    fontWeight: '700',
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary + '08',
    borderRadius: borderRadius.md,
    padding: 14,
    borderWidth: 1.5,
    borderColor: colors.primary + '40',
    marginBottom: spacing.sm,
  },
  dateSelectorText: {
    flex: 1,
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
});

export default ReservationConfirmModal;
