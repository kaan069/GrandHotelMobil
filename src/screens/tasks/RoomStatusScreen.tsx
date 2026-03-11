/**
 * RoomStatusScreen - Oda Durumu Yönetimi
 *
 * Housekeeping personeli odaların durumunu görüntüler ve günceller.
 * Web uygulamasıyla aynı oda verileri ve durumlar kullanılır.
 * Durumlar: Müsait / Dolu / Kirli / Bakımda / Bloke
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  ROOM_STATUS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

interface Room {
  id: number;
  number: string;
  bedType: string;
  floor: number;
  capacity: number;
  status: string;
  guestName?: string;
  lastCleaned?: string;
  cleanedBy?: string;
}

interface RoomStatusScreenProps {
  onClose: () => void;
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Tek',
  double: 'Çift',
  twin: 'Twin',
  king: 'King',
};

/** Mock oda verileri - Web ile aynı */
const INITIAL_ROOMS: Room[] = [
  { id: 1, number: '101', bedType: 'single', floor: 1, capacity: 1, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 2, number: '102', bedType: 'double', floor: 1, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Ali Yılmaz', lastCleaned: '2026-03-10T09:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 3, number: '103', bedType: 'double', floor: 1, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 4, number: '201', bedType: 'double', floor: 2, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 5, number: '202', bedType: 'king', floor: 2, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Ayşe Demir', lastCleaned: '2026-03-09T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 6, number: '203', bedType: 'twin', floor: 2, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-09T11:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 7, number: '301', bedType: 'king', floor: 3, capacity: 3, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 8, number: '302', bedType: 'double', floor: 3, capacity: 2, status: ROOM_STATUS.MAINTENANCE, lastCleaned: '2026-03-08T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 9, number: '303', bedType: 'single', floor: 3, capacity: 1, status: ROOM_STATUS.BLOCKED, lastCleaned: '2026-03-07T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 10, number: '401', bedType: 'king', floor: 4, capacity: 3, status: ROOM_STATUS.OCCUPIED, guestName: 'Mehmet Kaya', lastCleaned: '2026-03-10T07:30:00', cleanedBy: 'Zeynep Arslan' },
];

interface FilterOption {
  value: string;
  label: string;
}

const FILTERS: FilterOption[] = [
  { value: 'all', label: 'Tümü' },
  { value: ROOM_STATUS.AVAILABLE, label: 'Müsait' },
  { value: ROOM_STATUS.OCCUPIED, label: 'Dolu' },
  { value: ROOM_STATUS.DIRTY, label: 'Kirli' },
  { value: ROOM_STATUS.MAINTENANCE, label: 'Bakımda' },
  { value: ROOM_STATUS.BLOCKED, label: 'Bloke' },
];

/** Housekeeping durum değiştirme seçenekleri */
const getStatusActions = (currentStatus: string): { value: string; label: string; icon: string; color: string }[] => {
  switch (currentStatus) {
    case ROOM_STATUS.DIRTY:
      return [
        { value: ROOM_STATUS.AVAILABLE, label: 'Temiz Yap', icon: 'checkmark-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] },
      ];
    case ROOM_STATUS.MAINTENANCE:
      return [
        { value: ROOM_STATUS.AVAILABLE, label: 'Bakım Bitti', icon: 'checkmark-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] },
      ];
    case ROOM_STATUS.AVAILABLE:
      return [
        { value: ROOM_STATUS.DIRTY, label: 'Kirli Yap', icon: 'alert-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] },
      ];
    default:
      return [];
  }
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case ROOM_STATUS.AVAILABLE: return 'checkmark-circle';
    case ROOM_STATUS.OCCUPIED: return 'person';
    case ROOM_STATUS.DIRTY: return 'alert-circle';
    case ROOM_STATUS.MAINTENANCE: return 'construct';
    case ROOM_STATUS.BLOCKED: return 'lock-closed';
    default: return 'help-circle';
  }
};

const RoomStatusScreen: React.FC<RoomStatusScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<Room[]>(INITIAL_ROOMS);
  const [filter, setFilter] = useState('all');

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleStatusChange = (roomNumber: string, newStatus: string) => {
    const statusLabel = ROOM_STATUS_LABELS[newStatus];
    Alert.alert(
      'Oda Durumu Güncelle',
      `Oda ${roomNumber} → ${statusLabel} olarak işaretlensin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Güncelle',
          onPress: () => {
            setRooms((prev) =>
              prev.map((r) =>
                r.number === roomNumber
                  ? {
                      ...r,
                      status: newStatus,
                      lastCleaned: newStatus === ROOM_STATUS.AVAILABLE ? new Date().toISOString() : r.lastCleaned,
                      cleanedBy: newStatus === ROOM_STATUS.AVAILABLE ? (user?.name || r.cleanedBy) : r.cleanedBy,
                    }
                  : r
              )
            );
          },
        },
      ]
    );
  };

  const filteredRooms = filter === 'all'
    ? rooms
    : rooms.filter((r) => r.status === filter);

  /* Özet sayılar */
  const summary = {
    available: rooms.filter((r) => r.status === ROOM_STATUS.AVAILABLE).length,
    occupied: rooms.filter((r) => r.status === ROOM_STATUS.OCCUPIED).length,
    dirty: rooms.filter((r) => r.status === ROOM_STATUS.DIRTY).length,
    maintenance: rooms.filter((r) => r.status === ROOM_STATUS.MAINTENANCE).length,
    blocked: rooms.filter((r) => r.status === ROOM_STATUS.BLOCKED).length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Oda Durumu</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Özet Kartları */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] + '20' }]}>
          <Text style={[styles.summaryNum, { color: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] }]}>{summary.available}</Text>
          <Text style={styles.summaryLabel}>Müsait</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.OCCUPIED] + '20' }]}>
          <Text style={[styles.summaryNum, { color: ROOM_STATUS_COLORS[ROOM_STATUS.OCCUPIED] }]}>{summary.occupied}</Text>
          <Text style={styles.summaryLabel}>Dolu</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] + '20' }]}>
          <Text style={[styles.summaryNum, { color: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] }]}>{summary.dirty}</Text>
          <Text style={styles.summaryLabel}>Kirli</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.MAINTENANCE] + '20' }]}>
          <Text style={[styles.summaryNum, { color: ROOM_STATUS_COLORS[ROOM_STATUS.MAINTENANCE] }]}>{summary.maintenance}</Text>
          <Text style={styles.summaryLabel}>Bakım</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.BLOCKED] + '20' }]}>
          <Text style={[styles.summaryNum, { color: ROOM_STATUS_COLORS[ROOM_STATUS.BLOCKED] }]}>{summary.blocked}</Text>
          <Text style={styles.summaryLabel}>Bloke</Text>
        </View>
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
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

      {/* Oda Listesi */}
      <FlatList
        data={filteredRooms}
        keyExtractor={(item) => item.number}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="Oda bulunamadı" />}
        renderItem={({ item: room }) => {
          const actions = getStatusActions(room.status);
          return (
            <AppCard style={styles.roomCard}>
              {/* Oda No + Durum İkonu */}
              <View style={styles.roomTop}>
                <Text style={styles.roomNumber}>{room.number}</Text>
                <Ionicons
                  name={getStatusIcon(room.status) as any}
                  size={22}
                  color={ROOM_STATUS_COLORS[room.status]}
                />
              </View>

              {/* Kat + Yatak Tipi */}
              <Text style={styles.floorText}>
                Kat {room.floor} · {BED_TYPE_LABELS[room.bedType] || room.bedType}
              </Text>

              {/* Durum Chip */}
              <StatusChip
                label={ROOM_STATUS_LABELS[room.status]}
                color={ROOM_STATUS_COLORS[room.status]}
              />

              {/* Misafir Adı */}
              {room.status === ROOM_STATUS.OCCUPIED && room.guestName && (
                <View style={styles.guestRow}>
                  <Ionicons name="person" size={12} color={colors.textSecondary} />
                  <Text style={styles.guestName} numberOfLines={1}>{room.guestName}</Text>
                </View>
              )}

              {/* Son Temizlik */}
              {room.lastCleaned && (
                <Text style={styles.cleanInfo}>
                  Son: {formatDate(room.lastCleaned)}
                </Text>
              )}

              {/* Durum Değiştirme Butonları */}
              {actions.length > 0 && (
                <View style={styles.statusActions}>
                  {actions.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[styles.statusBtn, { borderColor: opt.color }]}
                      onPress={() => handleStatusChange(room.number, opt.value)}
                    >
                      <Ionicons name={opt.icon as any} size={14} color={opt.color} />
                      <Text style={[styles.statusBtnText, { color: opt.color }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </AppCard>
          );
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 6,
    backgroundColor: colors.surface,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  summaryNum: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.textWhite,
  },
  list: {
    padding: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  gridRow: {
    justifyContent: 'space-between',
  },
  roomCard: {
    width: '48.5%',
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  roomTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  roomNumber: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  floorText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginBottom: 6,
  },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  guestName: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    flex: 1,
  },
  cleanInfo: {
    fontSize: 10,
    color: colors.textDisabled,
    marginTop: 6,
  },
  statusActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  statusBtnText: {
    fontSize: 10,
    fontWeight: '600',
  },
});

export default RoomStatusScreen;
