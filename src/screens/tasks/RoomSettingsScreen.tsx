/**
 * RoomSettingsScreen — Oda Yönetimi (Mobil)
 *
 * Patron/müdür odaları listeler, yeni oda ekler, düzenler, siler.
 * Web'deki RoomSettings + RoomAddDialog'un mobil karşılığı.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton, LoadingState, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { roomsApi } from '../../services/api';
import type { ApiRoom } from '../../utils/types';

const BED_TYPES = [
  { value: 'single', label: 'Tek Kişilik' },
  { value: 'double', label: 'Çift Kişilik' },
  { value: 'king', label: 'King Size' },
  { value: 'twin', label: 'İki Tek Yataklı' },
  { value: 'suite', label: 'Süit' },
];

const VIEW_TYPES = [
  { value: 'none', label: 'Manzara Yok' },
  { value: 'city', label: 'Şehir' },
  { value: 'garden', label: 'Bahçe' },
  { value: 'sea', label: 'Deniz' },
];

const STATUS_COLORS: Record<string, string> = {
  available: '#22c55e',
  occupied: '#3b82f6',
  dirty: '#f59e0b',
  maintenance: '#ef4444',
  blocked: '#64748b',
};

interface Props {
  onClose: () => void;
}

const RoomSettingsScreen: React.FC<Props> = ({ onClose }) => {
  const [rooms, setRooms] = useState<ApiRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Oda ekleme/düzenleme modal
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRoom, setEditingRoom] = useState<ApiRoom | null>(null);
  const [form, setForm] = useState({
    roomNumber: '', bedType: 'double', floor: '1', capacity: '2', view: 'city', price: '1500',
  });
  const [saving, setSaving] = useState(false);

  const fetchRooms = useCallback(async () => {
    try {
      const data = await roomsApi.getAll();
      setRooms(data.sort((a: ApiRoom, b: ApiRoom) => a.roomNumber.localeCompare(b.roomNumber)));
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  const openAddModal = () => {
    setEditingRoom(null);
    setForm({ roomNumber: '', bedType: 'double', floor: '1', capacity: '2', view: 'city', price: '1500' });
    setModalVisible(true);
  };

  const openEditModal = (room: ApiRoom) => {
    setEditingRoom(room);
    setForm({
      roomNumber: room.roomNumber,
      bedType: room.bedType || 'double',
      floor: String(room.floor || 1),
      capacity: String(room.capacity || 2),
      view: room.view || 'city',
      price: String(parseFloat(room.price) || 1500),
    });
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!form.roomNumber.trim()) {
      Alert.alert('Hata', 'Oda numarası zorunlu');
      return;
    }
    setSaving(true);
    try {
      if (editingRoom) {
        await roomsApi.update(editingRoom.id, {
          bedType: form.bedType,
          floor: parseInt(form.floor),
          capacity: parseInt(form.capacity),
          view: form.view,
          price: parseFloat(form.price),
        });
        Alert.alert('Başarılı', 'Oda güncellendi');
      } else {
        await roomsApi.create({
          roomNumber: form.roomNumber.trim(),
          bedType: form.bedType,
          floor: parseInt(form.floor),
          capacity: parseInt(form.capacity),
          view: form.view,
          price: parseFloat(form.price),
        });
        Alert.alert('Başarılı', 'Oda eklendi');
      }
      setModalVisible(false);
      fetchRooms();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'İşlem başarısız';
      Alert.alert('Hata', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (room: ApiRoom) => {
    if (room.status === 'occupied') {
      Alert.alert('Uyarı', 'Dolu oda silinemez');
      return;
    }
    Alert.alert('Oda Sil', `${room.roomNumber} nolu odayı silmek istediğinize emin misiniz?`, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          try {
            await roomsApi.delete(room.id);
            fetchRooms();
          } catch {
            Alert.alert('Hata', 'Oda silinemedi');
          }
        },
      },
    ]);
  };

  if (loading) return <LoadingState message="Odalar yükleniyor..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Oda Yönetimi</Text>
          <Text style={styles.subtitle}>{rooms.length} oda</Text>
        </View>
        <TouchableOpacity style={styles.addFloatBtn} onPress={openAddModal}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Oda listesi */}
      <FlatList
        data={rooms}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.roomCard} onPress={() => openEditModal(item)} onLongPress={() => handleDelete(item)}>
            <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[item.status] || '#94a3b8' }]} />
            <View style={{ flex: 1 }}>
              <Text style={styles.roomNumber}>Oda {item.roomNumber}</Text>
              <Text style={styles.roomInfo}>
                {BED_TYPES.find(b => b.value === item.bedType)?.label || item.bedType} · Kat {item.floor} · {item.capacity} kişi
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.roomPrice}>{parseFloat(item.price).toLocaleString('tr-TR')} ₺</Text>
              <Text style={styles.roomView}>{VIEW_TYPES.find(v => v.value === item.view)?.label || item.view}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="Oda Yok" description="Henüz oda eklenmemiş" />}
      />

      {/* Oda Ekle/Düzenle Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editingRoom ? 'Oda Düzenle' : 'Yeni Oda Ekle'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <AppInput
                label="Oda Numarası"
                value={form.roomNumber}
                onChangeText={(t: string) => setForm(f => ({ ...f, roomNumber: t }))}
                icon="bed-outline"
                placeholder="101"
                editable={!editingRoom}
              />

              {/* Yatak tipi */}
              <Text style={styles.fieldLabel}>Yatak Tipi</Text>
              <View style={styles.chipRow}>
                {BED_TYPES.map(bt => (
                  <TouchableOpacity
                    key={bt.value}
                    style={[styles.chip, form.bedType === bt.value && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, bedType: bt.value }))}
                  >
                    <Text style={[styles.chipText, form.bedType === bt.value && styles.chipTextActive]}>
                      {bt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Kat"
                    value={form.floor}
                    onChangeText={(t: string) => setForm(f => ({ ...f, floor: t }))}
                    keyboardType="number-pad"
                    icon="layers-outline"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <AppInput
                    label="Kapasite"
                    value={form.capacity}
                    onChangeText={(t: string) => setForm(f => ({ ...f, capacity: t }))}
                    keyboardType="number-pad"
                    icon="people-outline"
                  />
                </View>
              </View>

              {/* Manzara */}
              <Text style={styles.fieldLabel}>Manzara</Text>
              <View style={styles.chipRow}>
                {VIEW_TYPES.map(vt => (
                  <TouchableOpacity
                    key={vt.value}
                    style={[styles.chip, form.view === vt.value && styles.chipActive]}
                    onPress={() => setForm(f => ({ ...f, view: vt.value }))}
                  >
                    <Text style={[styles.chipText, form.view === vt.value && styles.chipTextActive]}>
                      {vt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <AppInput
                label="Gecelik Fiyat (₺)"
                value={form.price}
                onChangeText={(t: string) => setForm(f => ({ ...f, price: t }))}
                keyboardType="numeric"
                icon="cash-outline"
              />

              <AppButton
                title={editingRoom ? 'Güncelle' : 'Oda Ekle'}
                onPress={handleSave}
                icon="checkmark-circle-outline"
                loading={saving}
                style={{ marginTop: spacing.sm }}
              />

              {editingRoom && (
                <AppButton
                  title="Odayı Sil"
                  onPress={() => { setModalVisible(false); handleDelete(editingRoom); }}
                  variant="danger"
                  icon="trash-outline"
                  style={{ marginTop: spacing.sm }}
                />
              )}

              <AppButton
                title="Vazgeç"
                onPress={() => setModalVisible(false)}
                variant="outline"
                style={{ marginTop: spacing.xs }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  addFloatBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  // Oda kartı
  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  roomNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomInfo: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  roomPrice: { fontSize: fontSize.md, fontWeight: '700', color: colors.primary },
  roomView: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl, padding: spacing.lg, maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  fieldLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: 6, marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: spacing.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textSecondary },
  chipTextActive: { color: '#fff' },
});

export default RoomSettingsScreen;
