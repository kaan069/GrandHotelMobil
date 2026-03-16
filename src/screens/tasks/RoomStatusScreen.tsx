/**
 * RoomStatusScreen - Oda Durumu Yönetimi
 *
 * Backend API'den odaları çeker ve durumlarını yönetir.
 * Housekeeping, resepsiyon, patron ve müdür erişebilir.
 * Durumlar: Müsait / Dolu / Kirli / Bakımda / Bloke
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, EmptyState, LoadingState } from '../../components/common';
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
import useApi from '../../hooks/useApi';
import useRoomWebSocket from '../../hooks/useRoomWebSocket';
import { roomsApi } from '../../services/api';
import type { ApiRoom } from '../../utils/types';

interface RoomStatusScreenProps {
  onClose: () => void;
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Tek',
  double: 'Çift',
  twin: 'Twin',
  king: 'King',
};

/** Backend ApiRoom → Frontend Room interface'ine dönüştürür */
const mapApiRoomToRoom = (apiRoom: ApiRoom): Room => ({
  id: apiRoom.id,
  number: apiRoom.roomNumber,
  bedType: apiRoom.bedType,
  floor: apiRoom.floor,
  capacity: apiRoom.capacity,
  status: apiRoom.status,
  guestName: apiRoom.guestName || undefined,
});

/** Backend ApiRoom → RoomSellView'ın beklediği format */
const mapApiRoomToSellRoom = (apiRoom: ApiRoom): RoomSellRoom => ({
  id: apiRoom.id,
  number: apiRoom.roomNumber,
  bedType: apiRoom.bedType,
  floor: apiRoom.floor,
  capacity: apiRoom.capacity,
  status: apiRoom.status,
  guestName: apiRoom.guestName || undefined,
  guests: apiRoom.guests.map((g) => ({
    guestId: g.guestId,
    guestName: g.guestName,
    phone: g.phone,
  })),
  price: parseFloat(apiRoom.price) || 0,
  reservationId: apiRoom.reservationId || undefined,
  reservationNotes: apiRoom.reservationNotes || undefined,
  reservationCheckIn: apiRoom.reservationCheckIn || undefined,
  reservationCheckOut: apiRoom.reservationCheckOut || undefined,
});

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

  /* API'den odaları çek */
  const { data: apiRooms, loading, error, refetch } = useApi(() => roomsApi.getAll());

  /* Canlı oda state'i — API + WebSocket birleşimi */
  const [liveRooms, setLiveRooms] = useState<ApiRoom[]>([]);
  const [filter, setFilter] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState<ApiRoom | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  /* API verisi gelince liveRooms'a aktar */
  useEffect(() => {
    if (apiRooms) setLiveRooms(apiRooms);
  }, [apiRooms]);

  /* WebSocket: Oda güncellenince liveRooms'ta güncelle */
  useRoomWebSocket({
    onRoomUpdate: (updatedRoom) => {
      setLiveRooms((prev) =>
        prev.map((r) => r.id === updatedRoom.id ? updatedRoom : r)
      );
    },
  });

  /** Patron, müdür veya resepsiyon mu? */
  const canManageRooms = user?.role === ROLES.PATRON || user?.role === ROLES.MANAGER || user?.role === ROLES.RECEPTION;

  /** Pull-to-refresh */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  /** Oda güncellendikten sonra (check-in/out) — listeyi yenile */
  const handleRoomUpdate = () => {
    setSelectedRoom(null);
    refetch();
  };

  /** Hızlı durum değiştirme (listeden temiz/kirli toggle) */
  const handleStatusChange = async (roomNumber: string, newStatus: string) => {
    const room = apiRooms?.find((r) => r.roomNumber === roomNumber);
    if (!room) return;
    try {
      await roomsApi.updateStatus(room.id, newStatus);
      refetch();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  /* Odaları filtrele */
  /* liveRooms kullan — API + WebSocket birleşimi */
  const rooms = liveRooms;
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

  /* Yükleniyor */
  if (loading && !apiRooms) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Oda Durumu</Text>
          <View style={{ width: 28 }} />
        </View>
        <LoadingState message="Odalar yükleniyor..." />
      </View>
    );
  }

  /* Hata */
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Oda Durumu</Text>
          <View style={{ width: 28 }} />
        </View>
        <EmptyState icon="cloud-offline-outline" title="Bağlantı Hatası" description={error} />
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
        keyExtractor={(item) => item.roomNumber}
        contentContainerStyle={styles.list}
        numColumns={2}
        columnWrapperStyle={styles.gridRow}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
        }
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
                  onPress={() => handleStatusChange(room.roomNumber, ROOM_STATUS.AVAILABLE)}
                >
                  <Ionicons name="checkmark-circle" size={14} color="#fff" />
                  <Text style={styles.quickBtnText}>Temiz</Text>
                </TouchableOpacity>
              )}
              {isClean && (
                <TouchableOpacity
                  style={[styles.quickBtn, { backgroundColor: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] }]}
                  onPress={() => handleStatusChange(room.roomNumber, ROOM_STATUS.DIRTY)}
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
                  <Text style={styles.roomNumber}>{room.roomNumber}</Text>
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
              </AppCard>
            </View>
          );
        }}
      />

      {/* Oda Detay Overlay — rol bazlı */}
      {selectedRoom && canManageRooms ? (
        <RoomSellView
          room={mapApiRoomToSellRoom(selectedRoom)}
          onClose={() => setSelectedRoom(null)}
          onRoomUpdate={handleRoomUpdate}
        />
      ) : selectedRoom ? (
        <RoomDetailView
          room={mapApiRoomToRoom(selectedRoom)}
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
});

export default RoomStatusScreen;
