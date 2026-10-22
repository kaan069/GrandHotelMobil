/**
 * RoomMoveModal - Oda Taşıma
 *
 * Dolu odadaki rezervasyonu (misafirler + folio) başka odaya taşır.
 * Dolu/bloke odalar seçilemez; kirli/bakımdaki oda için uyarı gösterilir.
 * Web karşılığı: components/rooms/RoomMoveDialog.tsx
 *
 * API: roomsApi.getAll / roomsApi.moveGuests → POST /api/rooms/{id}/move/
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROOM_STATUS, ROOM_STATUS_LABELS, ROOM_STATUS_COLORS } from '../../utils/constants';
import { roomsApi } from '../../services/api';
import type { ApiRoom } from '../../utils/types';

interface RoomMoveModalProps {
  visible: boolean;
  sourceRoom: { id: number; number: string };
  onClose: () => void;
  /** Taşıma başarılı — hedef oda numarası */
  onMoved: (targetRoomNumber: string) => void;
}

const BLOCKED_TARGET = new Set<string>([ROOM_STATUS.OCCUPIED, ROOM_STATUS.BLOCKED]);

const STATUS_WARNINGS: Record<string, string> = {
  [ROOM_STATUS.DIRTY]: 'kirli durumda',
  [ROOM_STATUS.MAINTENANCE]: 'bakımda',
};

const RoomMoveModal: React.FC<RoomMoveModalProps> = ({ visible, sourceRoom, onClose, onMoved }) => {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [moving, setMoving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery('');
    setLoading(true);
    roomsApi.getAll()
      .then(setRooms)
      .catch((err: Error) => Alert.alert('Hata', err.message || 'Odalar yüklenemedi'))
      .finally(() => setLoading(false));
  }, [visible]);

  /* Kaynak oda hariç; müsait odalar üstte, sonra oda numarası */
  const candidates = useMemo(() => {
    const q = query.trim();
    return rooms
      .filter((r) => r.id !== sourceRoom.id && (!q || r.roomNumber.includes(q)))
      .sort((a, b) => {
        const aFree = a.status === ROOM_STATUS.AVAILABLE ? 0 : 1;
        const bFree = b.status === ROOM_STATUS.AVAILABLE ? 0 : 1;
        if (aFree !== bFree) return aFree - bFree;
        return a.roomNumber.localeCompare(b.roomNumber, 'tr', { numeric: true });
      });
  }, [rooms, query, sourceRoom.id]);

  const doMove = async (target: ApiRoom) => {
    setMoving(true);
    try {
      await roomsApi.moveGuests(sourceRoom.id, target.id);
      onMoved(target.roomNumber);
    } catch (err) {
      Alert.alert('Taşıma Yapılamadı', (err as Error).message || 'Beklenmeyen bir hata oluştu');
    } finally {
      setMoving(false);
    }
  };

  const handleSelect = (target: ApiRoom) => {
    if (BLOCKED_TARGET.has(target.status)) return;
    const warning = STATUS_WARNINGS[target.status];
    const message = warning
      ? `Oda ${target.roomNumber} ${warning}. Yine de misafirler Oda ${sourceRoom.number} → Oda ${target.roomNumber} taşınsın mı?`
      : `Misafirler, folio ve açık adisyonlar Oda ${sourceRoom.number} → Oda ${target.roomNumber} taşınsın mı?`;
    Alert.alert('Oda Taşı', message, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Taşı', style: warning ? 'destructive' : 'default', onPress: () => doMove(target) },
    ]);
  };

  const renderRoom = ({ item }: { item: ApiRoom }) => {
    const disabled = BLOCKED_TARGET.has(item.status) || moving;
    const statusColor = ROOM_STATUS_COLORS[item.status] || colors.textSecondary;
    return (
      <TouchableOpacity
        style={[styles.roomItem, disabled && styles.roomItemDisabled]}
        onPress={() => handleSelect(item)}
        disabled={disabled}
        activeOpacity={0.7}
      >
        <Ionicons
          name={item.status === ROOM_STATUS.AVAILABLE ? 'checkmark-circle' : 'bed-outline'}
          size={24}
          color={item.status === ROOM_STATUS.AVAILABLE ? colors.success : colors.textDisabled}
        />
        <View style={styles.roomInfo}>
          <Text style={styles.roomNumber}>Oda {item.roomNumber}</Text>
          <Text style={styles.roomFloor}>Kat {item.floor}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>
            {ROOM_STATUS_LABELS[item.status] || item.status}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={moving ? undefined : onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} disabled={moving}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Oda Taşı — Oda {sourceRoom.number}</Text>
            <View style={{ width: 24 }}>
              {moving && <ActivityIndicator size="small" color={colors.primary} />}
            </View>
          </View>

          <View style={styles.searchContainer}>
            <AppInput
              value={query}
              onChangeText={setQuery}
              placeholder="Oda numarası ara..."
              icon="search-outline"
              keyboardType="number-pad"
              style={{ marginBottom: 0 }}
            />
            <Text style={styles.hint}>Dolu ve bloke odalar seçilemez.</Text>
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : (
            <FlatList
              data={candidates}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderRoom}
              contentContainerStyle={styles.list}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={<Text style={styles.emptyText}>Oda bulunamadı</Text>}
            />
          )}
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
    maxHeight: '85%',
    minHeight: '60%',
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
  searchContainer: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.xs },
  list: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl },
  roomItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roomItemDisabled: { opacity: 0.45 },
  roomInfo: { flex: 1 },
  roomNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomFloor: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  statusText: { fontSize: fontSize.xs, fontWeight: '600' },
  emptyText: {
    textAlign: 'center',
    color: colors.textDisabled,
    paddingVertical: spacing.xl,
    fontSize: fontSize.sm,
  },
});

export default RoomMoveModal;
