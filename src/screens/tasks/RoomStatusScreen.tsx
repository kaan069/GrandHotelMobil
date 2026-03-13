/**
 * RoomStatusScreen - Oda Durumu Yönetimi
 *
 * Housekeeping, resepsiyon, patron ve müdür odaların durumunu görüntüler.
 * Odaya tıklayınca detay ekranı açılır (bilgi + arıza bildirme).
 * 6 kat × 8 oda = 48 oda
 * Durumlar: Müsait / Dolu / Kirli / Bakımda / Bloke
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, EmptyState } from '../../components/common';
import RoomDetailView from '../../components/tasks/RoomDetailView';
import type { Room } from '../../components/tasks/RoomDetailView';
import RoomSellView from '../../components/rooms/RoomSellView';
import type { RoomSellRoom } from '../../components/rooms/RoomSellView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  ROOM_STATUS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
  ROLES,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import { RoomGuest } from '../../utils/types';

interface RoomStatusScreenProps {
  onClose: () => void;
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Tek',
  double: 'Çift',
  twin: 'Twin',
  king: 'King',
};

/** 48 oda — 6 kat × 8 oda */
const INITIAL_ROOMS: Room[] = [
  /* === KAT 1 === */
  { id: 101, number: '101', bedType: 'single', floor: 1, capacity: 1, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 102, number: '102', bedType: 'double', floor: 1, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Ali Yılmaz', lastCleaned: '2026-03-10T09:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 103, number: '103', bedType: 'double', floor: 1, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 104, number: '104', bedType: 'twin', floor: 1, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 105, number: '105', bedType: 'single', floor: 1, capacity: 1, status: ROOM_STATUS.OCCUPIED, guestName: 'Fatma Şen', lastCleaned: '2026-03-09T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 106, number: '106', bedType: 'double', floor: 1, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 107, number: '107', bedType: 'king', floor: 1, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-09T11:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 108, number: '108', bedType: 'twin', floor: 1, capacity: 2, status: ROOM_STATUS.MAINTENANCE, lastCleaned: '2026-03-08T10:00:00', cleanedBy: 'Zeynep Arslan' },

  /* === KAT 2 === */
  { id: 201, number: '201', bedType: 'double', floor: 2, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 202, number: '202', bedType: 'king', floor: 2, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Ayşe Demir', lastCleaned: '2026-03-09T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 203, number: '203', bedType: 'twin', floor: 2, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-09T11:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 204, number: '204', bedType: 'single', floor: 2, capacity: 1, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 205, number: '205', bedType: 'double', floor: 2, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Hasan Çelik', lastCleaned: '2026-03-10T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 206, number: '206', bedType: 'king', floor: 2, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 207, number: '207', bedType: 'twin', floor: 2, capacity: 2, status: ROOM_STATUS.BLOCKED, lastCleaned: '2026-03-07T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 208, number: '208', bedType: 'double', floor: 2, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T06:00:00', cleanedBy: 'Zeynep Arslan' },

  /* === KAT 3 === */
  { id: 301, number: '301', bedType: 'king', floor: 3, capacity: 3, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 302, number: '302', bedType: 'double', floor: 3, capacity: 2, status: ROOM_STATUS.MAINTENANCE, lastCleaned: '2026-03-08T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 303, number: '303', bedType: 'single', floor: 3, capacity: 1, status: ROOM_STATUS.BLOCKED, lastCleaned: '2026-03-07T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 304, number: '304', bedType: 'double', floor: 3, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Elif Korkmaz', lastCleaned: '2026-03-10T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 305, number: '305', bedType: 'twin', floor: 3, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 306, number: '306', bedType: 'king', floor: 3, capacity: 3, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-09T12:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 307, number: '307', bedType: 'single', floor: 3, capacity: 1, status: ROOM_STATUS.OCCUPIED, guestName: 'Murat Aydın', lastCleaned: '2026-03-10T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 308, number: '308', bedType: 'double', floor: 3, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T09:30:00', cleanedBy: 'Zeynep Arslan' },

  /* === KAT 4 === */
  { id: 401, number: '401', bedType: 'king', floor: 4, capacity: 3, status: ROOM_STATUS.OCCUPIED, guestName: 'Mehmet Kaya', lastCleaned: '2026-03-10T07:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 402, number: '402', bedType: 'double', floor: 4, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 403, number: '403', bedType: 'twin', floor: 4, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 404, number: '404', bedType: 'single', floor: 4, capacity: 1, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 405, number: '405', bedType: 'king', floor: 4, capacity: 3, status: ROOM_STATUS.OCCUPIED, guestName: 'Selin Yıldız', lastCleaned: '2026-03-09T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 406, number: '406', bedType: 'double', floor: 4, capacity: 2, status: ROOM_STATUS.MAINTENANCE, lastCleaned: '2026-03-08T11:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 407, number: '407', bedType: 'twin', floor: 4, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 408, number: '408', bedType: 'double', floor: 4, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Burak Özkan', lastCleaned: '2026-03-10T08:30:00', cleanedBy: 'Zeynep Arslan' },

  /* === KAT 5 === */
  { id: 501, number: '501', bedType: 'king', floor: 5, capacity: 3, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 502, number: '502', bedType: 'double', floor: 5, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Deniz Aksoy', lastCleaned: '2026-03-09T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 503, number: '503', bedType: 'twin', floor: 5, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T06:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 504, number: '504', bedType: 'single', floor: 5, capacity: 1, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 505, number: '505', bedType: 'double', floor: 5, capacity: 2, status: ROOM_STATUS.BLOCKED, lastCleaned: '2026-03-06T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 506, number: '506', bedType: 'king', floor: 5, capacity: 3, status: ROOM_STATUS.OCCUPIED, guestName: 'Zehra Tan', lastCleaned: '2026-03-10T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 507, number: '507', bedType: 'twin', floor: 5, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T09:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 508, number: '508', bedType: 'double', floor: 5, capacity: 2, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-09T11:30:00', cleanedBy: 'Zeynep Arslan' },

  /* === KAT 6 === */
  { id: 601, number: '601', bedType: 'king', floor: 6, capacity: 3, status: ROOM_STATUS.OCCUPIED, guestName: 'Can Eren', lastCleaned: '2026-03-10T08:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 602, number: '602', bedType: 'double', floor: 6, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 603, number: '603', bedType: 'twin', floor: 6, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T08:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 604, number: '604', bedType: 'single', floor: 6, capacity: 1, status: ROOM_STATUS.DIRTY, lastCleaned: '2026-03-10T07:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 605, number: '605', bedType: 'double', floor: 6, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'İrem Başar', lastCleaned: '2026-03-09T09:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 606, number: '606', bedType: 'king', floor: 6, capacity: 3, status: ROOM_STATUS.MAINTENANCE, lastCleaned: '2026-03-07T10:00:00', cleanedBy: 'Zeynep Arslan' },
  { id: 607, number: '607', bedType: 'twin', floor: 6, capacity: 2, status: ROOM_STATUS.AVAILABLE, lastCleaned: '2026-03-11T10:30:00', cleanedBy: 'Zeynep Arslan' },
  { id: 608, number: '608', bedType: 'double', floor: 6, capacity: 2, status: ROOM_STATUS.OCCUPIED, guestName: 'Oğuz Kara', lastCleaned: '2026-03-10T10:00:00', cleanedBy: 'Zeynep Arslan' },
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
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  /** Patron, müdür veya resepsiyon mu? */
  const canManageRooms = user?.role === ROLES.PATRON || user?.role === ROLES.MANAGER || user?.role === ROLES.RECEPTION;

  /** Oda güncelle (RoomSellView'dan çağrılır — check-in/check-out) */
  const handleRoomUpdate = (roomId: number, updates: Partial<RoomSellRoom>) => {
    setRooms((prev) =>
      prev.map((r) =>
        r.id === roomId ? { ...r, ...updates } as Room : r
      )
    );
    setSelectedRoom(null);
  };

  /** Durum güncelle (hem listeden hem detaydan çağrılabilir) */
  const handleStatusChange = (roomNumber: string, newStatus: string) => {
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
    /* Detay açıksa selectedRoom'u da güncelle */
    setSelectedRoom((prev) =>
      prev && prev.number === roomNumber
        ? {
            ...prev,
            status: newStatus,
            lastCleaned: newStatus === ROOM_STATUS.AVAILABLE ? new Date().toISOString() : prev.lastCleaned,
            cleanedBy: newStatus === ROOM_STATUS.AVAILABLE ? (user?.name || prev.cleanedBy) : prev.cleanedBy,
          }
        : prev
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
          const isClean = room.status === ROOM_STATUS.AVAILABLE;
          const isDirty = room.status === ROOM_STATUS.DIRTY;
          return (
            <View style={styles.roomWrapper}>
              {/* Hızlı Temiz / Kirli Butonu */}
              {isDirty && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] }]}
                  onPress={() => handleStatusChange(room.number, ROOM_STATUS.AVAILABLE)}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <Text style={styles.quickBtnText}>Temiz</Text>
                </TouchableOpacity>
              )}
              {isClean && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] }]}
                  onPress={() => handleStatusChange(room.number, ROOM_STATUS.DIRTY)}
                >
                  <Ionicons name="alert-circle" size={14} color="#fff" />
                  <Text style={styles.quickBtnText}>Kirli</Text>
                </TouchableOpacity>
              )}
              {!isDirty && !isClean && (
                <View style={[styles.quickBtn, { backgroundColor: colors.textDisabled }]}>
                  <Text style={styles.quickBtnText}>{ROOM_STATUS_LABELS[room.status]}</Text>
                </View>
              )}

              <AppCard style={styles.roomCard} onPress={() => setSelectedRoom(room)}>
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
              </AppCard>
            </View>
          );
        }}
      />

      {/* Oda Detay Overlay — rol bazlı */}
      {selectedRoom && canManageRooms ? (
        <RoomSellView
          room={selectedRoom as RoomSellRoom}
          onClose={() => setSelectedRoom(null)}
          onRoomUpdate={handleRoomUpdate}
        />
      ) : selectedRoom ? (
        <RoomDetailView
          room={selectedRoom}
          onClose={() => setSelectedRoom(null)}
          onStatusChange={handleStatusChange}
        />
      ) : null}
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
  roomWrapper: {
    width: '48.5%',
    marginBottom: spacing.sm,
  },
  quickBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 6,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  quickBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  roomCard: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
});

export default RoomStatusScreen;
