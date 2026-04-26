import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface CalendarPickerProps {
  visible: boolean;
  selectedDate: string;
  minDate?: string;
  title?: string;
  onSelect: (date: string) => void;
  onClose: () => void;
}

const MONTH_NAMES = [
  'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
  'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık',
];
const WEEKDAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

const toDate = (s: string) => new Date(s + 'T00:00:00');
const toStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const CalendarPicker: React.FC<CalendarPickerProps> = ({
  visible, selectedDate, minDate, title, onSelect, onClose,
}) => {
  const initial = toDate(selectedDate);
  const [viewYear, setViewYear] = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const minD = minDate ? toDate(minDate) : null;
  const selectedD = toDate(selectedDate);

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
  const daysInMonth = lastOfMonth.getDate();
  /* Pazartesi=0 olacak şekilde offset */
  const startDayOffset = (firstOfMonth.getDay() + 6) % 7;

  const cells: Array<{ day: number | null; date: Date | null }> = [];
  for (let i = 0; i < startDayOffset; i++) cells.push({ day: null, date: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(viewYear, viewMonth, d);
    cells.push({ day: d, date: dt });
  }
  while (cells.length % 7 !== 0) cells.push({ day: null, date: null });

  const goPrevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goNextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={22} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>{title || 'Tarih Seç'}</Text>
            <View style={{ width: 22 }} />
          </View>

          <View style={styles.monthRow}>
            <TouchableOpacity style={styles.navBtn} onPress={goPrevMonth}>
              <Ionicons name="chevron-back" size={20} color={colors.primary} />
            </TouchableOpacity>
            <Text style={styles.monthText}>{MONTH_NAMES[viewMonth]} {viewYear}</Text>
            <TouchableOpacity style={styles.navBtn} onPress={goNextMonth}>
              <Ionicons name="chevron-forward" size={20} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {WEEKDAYS.map((w) => (
              <Text key={w} style={styles.weekday}>{w}</Text>
            ))}
          </View>

          <View style={styles.grid}>
            {cells.map((cell, idx) => {
              if (!cell.date) {
                return <View key={idx} style={styles.cell} />;
              }
              const isDisabled = minD ? cell.date < new Date(minD.getFullYear(), minD.getMonth(), minD.getDate()) : false;
              const isSelected = isSameDay(cell.date, selectedD);
              return (
                <TouchableOpacity
                  key={idx}
                  style={[
                    styles.cell,
                    isSelected && styles.cellSelected,
                    isDisabled && styles.cellDisabled,
                  ]}
                  disabled={isDisabled}
                  onPress={() => {
                    onSelect(toStr(cell.date!));
                    onClose();
                  }}
                >
                  <Text style={[
                    styles.cellText,
                    isSelected && styles.cellTextSelected,
                    isDisabled && styles.cellTextDisabled,
                  ]}>
                    {cell.day}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  container: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.background,
    borderRadius: borderRadius.xl,
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  monthText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  weekday: {
    flex: 1,
    textAlign: 'center',
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    paddingVertical: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellSelected: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.full,
  },
  cellDisabled: {
    opacity: 0.3,
  },
  cellText: {
    fontSize: fontSize.sm,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  cellTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  cellTextDisabled: {
    color: colors.textDisabled,
  },
});

export default CalendarPicker;
