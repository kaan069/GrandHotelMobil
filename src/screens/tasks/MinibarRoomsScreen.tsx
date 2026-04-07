/**
 * MinibarRoomsScreen — Minibar Oda Kontrol Ekranı
 *
 * Minibar görevlisi / housekeeping dolu odaları görür.
 * Odaya tıklayınca minibar buzdolabı açılır — tüketim/iade yapılır.
 * Çıkış yapacak odalar öncelikli gösterilir.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoadingState, EmptyState } from '../../components/common';
import RoomMinibarView from '../../components/rooms/RoomMinibarView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { roomsApi, minibarApi } from '../../services/api';
import useAuth from '../../hooks/useAuth';

interface RoomItem {
  id: number;
  roomNumber: string;
  status: string;
  guestName: string | null;
  floor: number;
  minibarCount?: number;
}

interface Props {
  onClose: () => void;
}

const MinibarRoomsScreen: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<RoomItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedRoom, setSelectedRoom] = useState<RoomItem | null>(null);

  const fetchRooms = useCallback(async () => {
    try {
      const allRooms = await roomsApi.getAll();
      // Sadece dolu ve çıkış yapılacak odalar
      const occupiedRooms = allRooms
        .filter((r: Record<string, unknown>) => r.status === 'occupied' || r.status === 'dirty')
        .map((r: Record<string, unknown>) => ({
          id: r.id as number,
          roomNumber: r.roomNumber as string,
          status: r.status as string,
          guestName: r.guestName as string | null,
          floor: r.floor as number,
        }));

      // Her oda için minibar ürün sayısını al
      const withMinibar = await Promise.all(
        occupiedRooms.map(async (room: RoomItem) => {
          try {
            const items = await minibarApi.getRoomMinibar(room.id);
            return { ...room, minibarCount: Array.isArray(items) ? items.length : 0 };
          } catch {
            return { ...room, minibarCount: 0 };
          }
        })
      );

      // Dirty (çıkış yapacak) odalar üstte
      withMinibar.sort((a, b) => {
        if (a.status === 'dirty' && b.status !== 'dirty') return -1;
        if (a.status !== 'dirty' && b.status === 'dirty') return 1;
        return a.roomNumber.localeCompare(b.roomNumber);
      });

      setRooms(withMinibar);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Arama filtresi
  const filtered = rooms.filter(r =>
    r.roomNumber.includes(search) ||
    (r.guestName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Oda detayı (minibar buzdolabı)
  if (selectedRoom) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelectedRoom(null)} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Oda {selectedRoom.roomNumber}</Text>
            <Text style={styles.subtitle}>{selectedRoom.guestName || 'Misafir'}</Text>
          </View>
          {selectedRoom.status === 'dirty' && (
            <View style={styles.checkoutBadge}>
              <Text style={styles.checkoutBadgeText}>Çıkış</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1, padding: spacing.sm }}>
          <RoomMinibarView
            roomId={selectedRoom.id}
            roomNumber={selectedRoom.roomNumber}
            roomStatus={selectedRoom.status === 'dirty' ? 'occupied' : selectedRoom.status}
            staffName={user?.name}
          />
        </View>
      </View>
    );
  }

  if (loading) return <LoadingState message="Odalar yükleniyor..." />;

  const renderRoom = ({ item }: { item: RoomItem }) => (
    <TouchableOpacity
      style={[styles.roomCard, item.status === 'dirty' && styles.roomCardDirty]}
      onPress={() => setSelectedRoom(item)}
      activeOpacity={0.7}
    >
      <View style={styles.roomLeft}>
        <View style={[styles.roomIcon, item.status === 'dirty' ? styles.roomIconDirty : styles.roomIconOccupied]}>
          <Ionicons name="bed-outline" size={20} color="#fff" />
        </View>
        <View>
          <Text style={styles.roomNumber}>Oda {item.roomNumber}</Text>
          <Text style={styles.roomGuest} numberOfLines={1}>
            {item.guestName || 'Misafir'}
          </Text>
          <Text style={styles.roomFloor}>Kat {item.floor}</Text>
        </View>
      </View>
      <View style={styles.roomRight}>
        {item.status === 'dirty' && (
          <View style={styles.urgentBadge}>
            <Ionicons name="alert-circle" size={14} color="#f59e0b" />
            <Text style={styles.urgentText}>Kontrol</Text>
          </View>
        )}
        <View style={styles.minibarBadge}>
          <Ionicons name="wine-outline" size={14} color={colors.primary} />
          <Text style={styles.minibarCount}>{item.minibarCount || 0}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Minibar Kontrol</Text>
          <Text style={styles.subtitle}>{rooms.length} oda</Text>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchRooms(); }}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Arama */}
      <View style={styles.searchBox}>
        <Ionicons name="search" size={18} color={colors.textDisabled} />
        <TextInput
          style={styles.searchInput}
          placeholder="Oda no veya misafir ara..."
          placeholderTextColor={colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Oda listesi */}
      <FlatList
        data={filtered}
        renderItem={renderRoom}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} />}
        ListEmptyComponent={<EmptyState icon="wine-outline" title="Dolu Oda Yok" description="Minibar kontrolü yapılacak oda bulunamadı" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.card, margin: spacing.sm, marginBottom: 0,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  list: { padding: spacing.sm },
  // Oda kartı
  roomCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    borderLeftWidth: 4, borderLeftColor: '#22c55e',
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  roomCardDirty: { borderLeftColor: '#f59e0b', backgroundColor: '#fffbeb' },
  roomLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  roomIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  roomIconOccupied: { backgroundColor: '#22c55e' },
  roomIconDirty: { backgroundColor: '#f59e0b' },
  roomNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomGuest: { fontSize: fontSize.sm, color: colors.textSecondary, maxWidth: 150 },
  roomFloor: { fontSize: fontSize.xs, color: colors.textDisabled },
  roomRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fef3c7', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgentText: { fontSize: 11, fontWeight: '700', color: '#f59e0b' },
  minibarBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#eff6ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  minibarCount: { fontSize: 12, fontWeight: '700', color: colors.primary },
  checkoutBadge: { backgroundColor: '#f59e0b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  checkoutBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

export default MinibarRoomsScreen;
