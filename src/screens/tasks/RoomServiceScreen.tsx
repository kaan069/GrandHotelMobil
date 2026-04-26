/**
 * RoomServiceScreen - Oda Servisi Ekranı
 *
 * Garson/lobici dolu odaları görür.
 * Odaya tıklayınca otelin menüsünden ürün seçer.
 * Sipariş mutfağa düşer + oda folio'suna eklenir.
 *
 * Backend: /api/restaurant/qr/room/{roomNumber}/menu/ (menü)
 *          /api/restaurant/qr/room/{roomNumber}/order/ (sipariş)
 *          /api/rooms/ (oda listesi)
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
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { EmptyState, LoadingState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { roomsApi, menuApi, apiClient } from '../../services/api';
import type { ApiMenuCategory, ApiMenuItem } from '../../utils/types';
import useAuth from '../../hooks/useAuth';

interface OccupiedRoom {
  id: number;
  roomNumber: string;
  guestName: string | null;
  floor: number;
}

interface CartItem {
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
}

interface Props {
  onClose: () => void;
}

const RoomServiceScreen: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const [rooms, setRooms] = useState<OccupiedRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Sipariş formu
  const [selectedRoom, setSelectedRoom] = useState<OccupiedRoom | null>(null);
  const [categories, setCategories] = useState<ApiMenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [selectedCat, setSelectedCat] = useState<number | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Dolu odaları yükle
  const fetchRooms = useCallback(async () => {
    try {
      const all = await roomsApi.getAll();
      const occupied = all
        .filter((r: Record<string, unknown>) => r.status === 'occupied')
        .map((r: Record<string, unknown>) => ({
          id: r.id as number,
          roomNumber: r.roomNumber as string,
          guestName: r.guestName as string | null,
          floor: r.floor as number,
        }));
      setRooms(occupied);
    } catch {
      setRooms([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchRooms(); }, [fetchRooms]);

  // Oda seçilince menüyü yükle
  const selectRoom = async (room: OccupiedRoom) => {
    setSelectedRoom(room);
    setCart([]);
    setMenuLoading(true);
    try {
      const cats = await menuApi.getCategories();
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCat(cats[0].id);
        const items = await menuApi.getItems(cats[0].id);
        setMenuItems(items);
      }
    } catch {
      Alert.alert('Hata', 'Menü yüklenemedi');
    } finally {
      setMenuLoading(false);
    }
  };

  // Kategori değiştir
  const changeCategory = async (catId: number) => {
    setSelectedCat(catId);
    try {
      const items = await menuApi.getItems(catId);
      setMenuItems(items);
    } catch {
      setMenuItems([]);
    }
  };

  // Sepet işlemleri
  const addToCart = (item: ApiMenuItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === item.id);
      if (existing) {
        return prev.map(c => c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { menuItemId: item.id, name: item.name, price: Number(item.price), quantity: 1 }];
    });
  };

  const removeFromCart = (menuItemId: number) => {
    setCart(prev => {
      const existing = prev.find(c => c.menuItemId === menuItemId);
      if (existing && existing.quantity > 1) {
        return prev.map(c => c.menuItemId === menuItemId ? { ...c, quantity: c.quantity - 1 } : c);
      }
      return prev.filter(c => c.menuItemId !== menuItemId);
    });
  };

  // Sipariş gönder
  const handleSubmit = async () => {
    if (!selectedRoom || cart.length === 0) return;
    setSubmitting(true);
    try {
      const result = await apiClient<{ tabNo: string; totalAmount: string }>(
        `/restaurant/qr/room/${selectedRoom.roomNumber}/order/`,
        {
          method: 'POST',
          body: JSON.stringify({
            items: cart.map(c => ({ menuItemId: c.menuItemId, quantity: c.quantity, notes: '' })),
          }),
        }
      );
      Alert.alert(
        'Sipariş Gönderildi',
        `Oda ${selectedRoom.roomNumber}\nAdisyon: ${result.tabNo}\nToplam: ${result.totalAmount} ₺\n\nMutfağa iletildi ve folio'ya eklendi.`,
        [{ text: 'Tamam', onPress: () => { setSelectedRoom(null); setCart([]); } }]
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Sipariş gönderilemedi';
      Alert.alert('Hata', msg);
    } finally {
      setSubmitting(false);
    }
  };

  const cartTotal = cart.reduce((s, c) => s + c.price * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const fmt = (n: number) => n.toLocaleString('tr-TR');

  // ── Sipariş formu (oda seçilmiş) ──
  if (selectedRoom) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelectedRoom(null); setCart([]); }} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Oda {selectedRoom.roomNumber}</Text>
            <Text style={styles.subtitle}>{selectedRoom.guestName || 'Misafir'}</Text>
          </View>
          {cartCount > 0 && (
            <View style={styles.cartBadge}>
              <Ionicons name="cart" size={18} color="#fff" />
              <Text style={styles.cartBadgeText}>{cartCount}</Text>
            </View>
          )}
        </View>

        {menuLoading ? (
          <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
        ) : (
          <>
            {/* Kategoriler */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.catChip, selectedCat === cat.id && styles.catChipActive]}
                  onPress={() => changeCategory(cat.id)}
                >
                  <Text style={[styles.catChipText, selectedCat === cat.id && styles.catChipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Ürünler */}
            <FlatList
              data={menuItems.filter(i => i.isAvailable !== false)}
              keyExtractor={i => String(i.id)}
              contentContainerStyle={{ padding: spacing.sm, paddingBottom: cartCount > 0 ? 100 : 20 }}
              renderItem={({ item }) => {
                const inCart = cart.find(c => c.menuItemId === item.id);
                return (
                  <View style={styles.menuItem}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.menuName}>{item.name}</Text>
                      <Text style={styles.menuPrice}>{fmt(Number(item.price))} ₺</Text>
                    </View>
                    {inCart ? (
                      <View style={styles.qtyRow}>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => removeFromCart(item.id)}>
                          <Ionicons name="remove" size={18} color={colors.primary} />
                        </TouchableOpacity>
                        <Text style={styles.qtyText}>{inCart.quantity}</Text>
                        <TouchableOpacity style={styles.qtyBtn} onPress={() => addToCart(item)}>
                          <Ionicons name="add" size={18} color={colors.primary} />
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.addBtn} onPress={() => addToCart(item)}>
                        <Ionicons name="add" size={20} color={colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              }}
              ListEmptyComponent={<EmptyState icon="restaurant-outline" title="Ürün Yok" description="Bu kategoride ürün bulunamadı" />}
            />

            {/* Sepet bar */}
            {cartCount > 0 && (
              <View style={styles.cartBar}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cartTotal}>{fmt(cartTotal)} ₺</Text>
                  <Text style={styles.cartSub}>{cartCount} ürün</Text>
                </View>
                <TouchableOpacity
                  style={[styles.sendBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="send" size={18} color="#fff" />
                      <Text style={styles.sendBtnText}>Odaya Gönder</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </>
        )}
      </View>
    );
  }

  // ── Oda listesi ──
  if (loading) return <LoadingState message="Odalar yükleniyor..." />;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Oda Servisi</Text>
          <Text style={styles.subtitle}>{rooms.length} dolu oda</Text>
        </View>
        <TouchableOpacity onPress={() => { setRefreshing(true); fetchRooms(); }}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.sm }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchRooms(); }} />}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.roomCard} onPress={() => selectRoom(item)} activeOpacity={0.7}>
            <View style={styles.roomIcon}>
              <Ionicons name="bed-outline" size={22} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.roomNumber}>Oda {item.roomNumber}</Text>
              <Text style={styles.roomGuest}>{item.guestName || 'Misafir'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
          </TouchableOpacity>
        )}
        ListEmptyComponent={<EmptyState icon="bed-outline" title="Dolu Oda Yok" description="Konaklamada olan oda bulunamadı" />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Oda kartı
  roomCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    padding: spacing.md, marginBottom: spacing.xs,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  roomIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#22c55e', justifyContent: 'center', alignItems: 'center' },
  roomNumber: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  roomGuest: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },

  // Kategori bar
  catBar: { maxHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  catChip: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.card, marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },

  // Menü ürün
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.md,
    padding: spacing.sm, marginBottom: spacing.xs,
  },
  menuName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  menuPrice: { fontSize: fontSize.sm, fontWeight: '700', color: colors.primary, marginTop: 2 },
  addBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff6ff', justifyContent: 'center', alignItems: 'center' },
  qtyText: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary, minWidth: 20, textAlign: 'center' },

  // Sepet bar
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.surface, borderTopWidth: 2, borderTopColor: colors.border,
    padding: spacing.md, gap: 12,
  },
  cartTotal: { fontSize: fontSize.lg, fontWeight: '800', color: colors.textPrimary },
  cartSub: { fontSize: fontSize.xs, color: colors.textSecondary },
  cartBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.primary, paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.full },
  cartBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  sendBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.primary, paddingHorizontal: 20, paddingVertical: 12, borderRadius: borderRadius.full },
  sendBtnText: { fontSize: fontSize.md, fontWeight: '700', color: '#fff' },
});

export default RoomServiceScreen;
