/**
 * RoomServiceScreen - Oda Servisi Ekranı
 *
 * Garson ve resepsiyon personeli odaya ekstra ürün/hizmet ekleyebilir.
 * Siparişler oda bazlı listelenir ve teslim durumu takip edilir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  HOTEL_ROOMS,
  ROOM_SERVICE_CATEGORIES,
  ORDER_STATUS,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

interface RoomServiceOrder {
  id: number;
  roomNumber: string;
  item: string;
  category: string;
  quantity: number;
  note: string;
  status: 'pending' | 'delivered';
  orderedBy: string;
  createdAt: string;
}

interface RoomServiceScreenProps {
  onClose: () => void;
}

/** Mock siparişler */
const INITIAL_ORDERS: RoomServiceOrder[] = [
  {
    id: 1,
    roomNumber: '201',
    item: 'Cola',
    category: 'drink',
    quantity: 2,
    note: '',
    status: 'pending',
    orderedBy: 'Fatma Çelik',
    createdAt: '2026-03-11T10:30:00',
  },
  {
    id: 2,
    roomNumber: '305',
    item: 'Ekstra Yastık',
    category: 'amenity',
    quantity: 1,
    note: 'Yumuşak yastık tercih ediliyor',
    status: 'pending',
    orderedBy: 'Ayşe Kaya',
    createdAt: '2026-03-11T09:15:00',
  },
  {
    id: 3,
    roomNumber: '102',
    item: 'Sandviç',
    category: 'food',
    quantity: 1,
    note: '',
    status: 'delivered',
    orderedBy: 'Fatma Çelik',
    createdAt: '2026-03-10T22:00:00',
  },
];

const RoomServiceScreen: React.FC<RoomServiceScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [orders, setOrders] = useState<RoomServiceOrder[]>(INITIAL_ORDERS);
  const [showForm, setShowForm] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'delivered'>('all');

  /* Form state */
  const [formItem, setFormItem] = useState('');
  const [formCategory, setFormCategory] = useState('');
  const [formQuantity, setFormQuantity] = useState('1');
  const [formNote, setFormNote] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const getCategoryLabel = (value: string): string => {
    const cat = ROOM_SERVICE_CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const openForm = (roomNumber: string) => {
    setSelectedRoom(roomNumber);
    setFormItem('');
    setFormCategory('');
    setFormQuantity('1');
    setFormNote('');
    setFormErrors({});
    setShowForm(true);
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    if (!formItem.trim()) errors.item = 'Ürün adı gerekli';
    if (!formCategory) errors.category = 'Kategori seçin';
    if (!formQuantity || parseInt(formQuantity) < 1) errors.quantity = 'Geçerli adet girin';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddOrder = () => {
    if (!validateForm()) return;

    const newOrder: RoomServiceOrder = {
      id: Date.now(),
      roomNumber: selectedRoom,
      item: formItem.trim(),
      category: formCategory,
      quantity: parseInt(formQuantity),
      note: formNote.trim(),
      status: 'pending',
      orderedBy: user?.name || 'Bilinmeyen',
      createdAt: new Date().toISOString(),
    };

    setOrders((prev) => [newOrder, ...prev]);
    setShowForm(false);
    Alert.alert('Başarılı', `${selectedRoom} nolu odaya sipariş eklendi`);
  };

  const handleDeliver = (orderId: number) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: 'delivered' as const } : o))
    );
  };

  const handleDelete = (orderId: number) => {
    Alert.alert('Siparişi Sil', 'Bu siparişi silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => setOrders((prev) => prev.filter((o) => o.id !== orderId)),
      },
    ]);
  };

  /* Filtrelenmiş siparişler */
  const filteredOrders = filter === 'all'
    ? orders
    : orders.filter((o) => o.status === filter);

  /* Oda bazlı gruplama */
  const roomsWithOrders = HOTEL_ROOMS.map((room) => ({
    number: room,
    orders: filteredOrders.filter((o) => o.roomNumber === room),
    pendingCount: orders.filter((o) => o.roomNumber === room && o.status === 'pending').length,
  }));

  const FILTERS: { value: 'all' | 'pending' | 'delivered'; label: string }[] = [
    { value: 'all', label: 'Tümü' },
    { value: 'pending', label: 'Bekleyen' },
    { value: 'delivered', label: 'Teslim Edildi' },
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Oda Servisi</Text>
        <View style={{ width: 28 }} />
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
        data={roomsWithOrders}
        keyExtractor={(item) => item.number}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState icon="restaurant-outline" title="Sipariş bulunamadı" />}
        renderItem={({ item: room }) => (
          <AppCard style={styles.roomCard}>
            {/* Oda başlık */}
            <View style={styles.roomHeader}>
              <View style={styles.roomBadge}>
                <Ionicons name="bed-outline" size={16} color={colors.primary} />
                <Text style={styles.roomText}>Oda {room.number}</Text>
              </View>
              <View style={styles.roomHeaderRight}>
                {room.pendingCount > 0 && (
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingText}>{room.pendingCount}</Text>
                  </View>
                )}
                <TouchableOpacity
                  style={styles.addBtn}
                  onPress={() => openForm(room.number)}
                >
                  <Ionicons name="add-circle" size={28} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Siparişler */}
            {room.orders.length > 0 ? (
              room.orders.map((order) => (
                <View key={order.id} style={styles.orderRow}>
                  <View style={styles.orderInfo}>
                    <View style={styles.orderTitleRow}>
                      <Text style={styles.orderItem}>
                        {order.quantity}x {order.item}
                      </Text>
                      <StatusChip
                        label={order.status === 'pending' ? 'Bekliyor' : 'Teslim'}
                        color={order.status === 'pending' ? '#F59E0B' : '#22C55E'}
                      />
                    </View>
                    <Text style={styles.orderCategory}>{getCategoryLabel(order.category)}</Text>
                    {order.note ? <Text style={styles.orderNote}>{order.note}</Text> : null}
                    <Text style={styles.orderMeta}>
                      {order.orderedBy} · {formatDate(order.createdAt)}
                    </Text>
                  </View>
                  <View style={styles.orderActions}>
                    {order.status === 'pending' && (
                      <TouchableOpacity onPress={() => handleDeliver(order.id)}>
                        <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity onPress={() => handleDelete(order.id)}>
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <Text style={styles.noOrders}>Sipariş yok</Text>
            )}
          </AppCard>
        )}
      />

      {/* Sipariş Ekleme Modalı */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>Oda {selectedRoom} — Sipariş Ekle</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <AppInput
              label="Ürün Adı"
              value={formItem}
              onChangeText={(t: string) => {
                setFormItem(t);
                if (formErrors.item) setFormErrors((p) => ({ ...p, item: '' }));
              }}
              placeholder="Örn: Cola, Ekstra Yastık"
              icon="pricetag-outline"
              error={formErrors.item}
            />

            {/* Kategori Seçimi */}
            <Text style={styles.fieldLabel}>Kategori</Text>
            {formErrors.category ? <Text style={styles.errorText}>{formErrors.category}</Text> : null}
            <View style={styles.categoryRow}>
              {ROOM_SERVICE_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    formCategory === cat.value && styles.categoryChipActive,
                  ]}
                  onPress={() => {
                    setFormCategory(cat.value);
                    if (formErrors.category) setFormErrors((p) => ({ ...p, category: '' }));
                  }}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formCategory === cat.value && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label="Adet"
              value={formQuantity}
              onChangeText={(t: string) => {
                setFormQuantity(t);
                if (formErrors.quantity) setFormErrors((p) => ({ ...p, quantity: '' }));
              }}
              placeholder="1"
              icon="layers-outline"
              keyboardType="number-pad"
              error={formErrors.quantity}
            />

            <AppInput
              label="Not (Opsiyonel)"
              value={formNote}
              onChangeText={setFormNote}
              placeholder="Ek bilgi..."
              icon="chatbox-outline"
              multiline
            />

            <AppButton
              title="Sipariş Ekle"
              icon="add-circle-outline"
              onPress={handleAddOrder}
              style={styles.submitBtn}
            />
          </ScrollView>
        </View>
      </Modal>
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
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 8,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.textWhite,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  roomCard: {
    marginBottom: spacing.sm,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  roomText: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.primary,
  },
  roomHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: '#F59E0B',
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pendingText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textWhite,
  },
  addBtn: {
    padding: 2,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  orderInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  orderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  orderItem: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  orderCategory: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderNote: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  orderMeta: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: 4,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 2,
  },
  noOrders: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    fontStyle: 'italic',
    paddingTop: spacing.xs,
  },
  /* Form */
  formContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  formHeader: {
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
  formTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  formScroll: {
    flex: 1,
  },
  formContent: {
    padding: spacing.md,
    paddingBottom: 40,
  },
  fieldLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 6,
    marginTop: spacing.sm,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  categoryChipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryChipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: spacing.lg,
  },
});

export default RoomServiceScreen;
