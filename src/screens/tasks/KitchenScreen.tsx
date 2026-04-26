/**
 * KitchenScreen — Mutfak Ekranı / KDS (Mobil)
 *
 * Aşçı hesabında açılan sipariş yönetim ekranı.
 * WebSocket ile yeni siparişler anında gelir.
 *
 * Özellikler:
 *   - Gerçek zamanlı sipariş takibi (WebSocket)
 *   - Renk kodlu kartlar (bekliyor, hazırlanıyor, hazır)
 *   - Geçen süre göstergesi
 *   - Büyük dokunmatik butonlar (Başla, Hazır)
 *   - Hizmet alanı filtresi
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
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoadingState, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { serviceAreasApi, apiClient } from '../../services/api';
import type { ApiServiceArea } from '../../utils/types';
import useRestaurantWebSocket from '../../hooks/useRestaurantWebSocket';
import useAudioNotification from '../../hooks/useAudioNotification';

interface OrderItem {
  id: number;
  tabItemId: number;
  itemDescription: string;
  itemQuantity: number;
  tabId: number;
  tabNo: string;
  tableNumber: string | null;
  roomNumber: string | null;
  servicePoint: string;
  guestName: string;
  status: string;
  notes: string;
  sentToKitchenAt: string;
  [key: string]: unknown;
}

interface Props {
  onClose: () => void;
}

/** API fetch for orders */
async function fetchKitchenOrders(filters?: { status?: string; serviceAreaId?: number }): Promise<OrderItem[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.serviceAreaId) params.append('serviceAreaId', String(filters.serviceAreaId));
  const qs = params.toString();
  return apiClient<OrderItem[]>(`/order-items/${qs ? '?' + qs : ''}`);
}

async function kitchenAction(id: number, action: string, body?: object): Promise<OrderItem> {
  return apiClient<OrderItem>(`/order-items/${id}/${action}/`, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
}

const getElapsedMinutes = (sentAt: string): number =>
  Math.floor((Date.now() - new Date(sentAt).getTime()) / 60000);

const getTimeColor = (minutes: number): string => {
  if (minutes > 10) return '#ef4444';
  if (minutes > 5) return '#f97316';
  return '#22c55e';
};

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'pending': return '#ef4444';
    case 'preparing': return '#f59e0b';
    case 'ready': return '#22c55e';
    case 'served': return '#94a3b8';
    case 'cancelled': return '#64748b';
    default: return '#94a3b8';
  }
};

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'pending': return 'Bekliyor';
    case 'preparing': return 'Hazırlanıyor';
    case 'ready': return 'Hazır';
    case 'served': return 'Servis Edildi';
    case 'cancelled': return 'İptal';
    default: return status;
  }
};

const KitchenScreen: React.FC<Props> = ({ onClose }) => {
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ApiServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { play } = useAudioNotification();
  const [refreshing, setRefreshing] = useState(false);

  // Geçen süre güncellemesi
  const [, setTick] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => setTick((t) => t + 1), 30000);
    return () => clearInterval(timer);
  }, []);

  /** Siparişleri yükle */
  const fetchOrders = useCallback(async () => {
    try {
      const filters: { serviceAreaId?: number } = {};
      if (selectedArea) filters.serviceAreaId = selectedArea;
      const data = await fetchKitchenOrders(filters);
      setOrders(data.filter((o) => ['pending', 'preparing', 'ready'].includes(o.status)));
    } catch (err) {
      console.error('Siparişler yüklenemedi:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedArea]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    serviceAreasApi.getAll().then((areas) => setServiceAreas(areas.filter((a) => a.hasKitchen))).catch(console.error);
  }, []);

  /** WebSocket: yeni sipariş + durum güncellemeleri */
  useRestaurantWebSocket({
    groups: ['kitchen'],
    onNewOrder: (order) => {
      setOrders((prev) => {
        if (prev.find((o) => o.id === order.id)) return prev;
        return [order, ...prev];
      });
      play('new_order');
    },
    onOrderStatusUpdate: (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o.id === updatedOrder.id ? updatedOrder : o))
      );
    },
  });

  /** Hazırlamaya başla */
  const handleStart = async (id: number) => {
    try {
      const updated = await kitchenAction(id, 'start');
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      Alert.alert('Hata', 'Başlatılamadı');
    }
  };

  /** Hazır */
  const handleReady = async (id: number) => {
    try {
      const updated = await kitchenAction(id, 'ready');
      setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
    } catch {
      Alert.alert('Hata', 'Hazır işaretlenemedi');
    }
  };

  /** İptal */
  const handleCancel = (id: number) => {
    Alert.alert('İptal', 'Bu siparişi iptal etmek istiyor musunuz?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet', style: 'destructive',
        onPress: async () => {
          try {
            const updated = await kitchenAction(id, 'cancel', { reason: 'Mutfak iptal' });
            setOrders((prev) => prev.map((o) => (o.id === id ? updated : o)));
          } catch {
            Alert.alert('Hata', 'İptal edilemedi');
          }
        },
      },
    ]);
  };

  const pendingCount = orders.filter((o) => o.status === 'pending').length;
  const preparingCount = orders.filter((o) => o.status === 'preparing').length;
  const readyCount = orders.filter((o) => o.status === 'ready').length;

  // Siparişleri masaya/konuma göre grupla (hook'lar early return'den önce olmalı)
  const grouped = React.useMemo(() => {
    const map = new Map<string, OrderItem[]>();
    orders.forEach((order) => {
      const key = order.tableNumber
        ? `Masa ${order.tableNumber}`
        : order.roomNumber
          ? `Oda ${order.roomNumber}`
          : order.guestName || '?';
      const list = map.get(key) || [];
      list.push(order);
      map.set(key, list);
    });
    return Array.from(map.entries());
  }, [orders]);

  if (loading) return <LoadingState message="Siparişler yükleniyor..." />;

  const renderGroupCard = (location: string, items: OrderItem[]) => {
    const oldestElapsed = Math.max(...items.map((o) => getElapsedMinutes(o.sentToKitchenAt)));
    const hasPending = items.some((o) => o.status === 'pending');
    const hasPreparing = items.some((o) => o.status === 'preparing');
    const groupColor = hasPending ? '#ef4444' : hasPreparing ? '#f59e0b' : '#22c55e';

    return (
      <View key={location} style={[styles.orderCard, { borderLeftColor: groupColor }]}>
        {/* Üst: Konum + Süre */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderLocation}>{location}</Text>
          <View style={[styles.timeBadge, { backgroundColor: getTimeColor(oldestElapsed) }]}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.timeText}>{oldestElapsed} dk</Text>
          </View>
        </View>
        <Text style={styles.orderTabNo}>{items[0]?.servicePoint} · {items.length} kalem</Text>

        {/* Ürün listesi */}
        {items.map((order) => {
          const statusColor = getStatusColor(order.status);
          return (
            <View key={order.id} style={[styles.orderItemRow, { borderLeftColor: statusColor }]}>
              <View style={{ flex: 1 }}>
                <Text style={styles.orderItemText}>
                  {order.itemQuantity}x {order.itemDescription}
                </Text>
                {order.notes ? <Text style={styles.orderNotes}>{order.notes}</Text> : null}
              </View>
              {/* Kalem aksiyonları */}
              {order.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => handleStart(order.id)}>
                    <Ionicons name="play" size={16} color="#f59e0b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.miniBtn} onPress={() => handleCancel(order.id)}>
                    <Ionicons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
              {order.status === 'preparing' && (
                <TouchableOpacity style={styles.miniBtn} onPress={() => handleReady(order.id)}>
                  <Ionicons name="checkmark" size={16} color="#22c55e" />
                </TouchableOpacity>
              )}
              {order.status === 'ready' && (
                <View style={[styles.miniStatusBadge, { backgroundColor: '#22c55e' }]}>
                  <Text style={styles.miniStatusText}>Hazır</Text>
                </View>
              )}
            </View>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Mutfak Ekranı</Text>
          <Text style={styles.subtitle}>
            {pendingCount} bekliyor · {preparingCount} hazırlanıyor · {readyCount} hazır
          </Text>
        </View>
        <TouchableOpacity onPress={fetchOrders}>
          <Ionicons name="refresh" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Alan filtresi */}
      {serviceAreas.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
          <TouchableOpacity
            style={[styles.filterChip, !selectedArea && styles.filterChipActive]}
            onPress={() => setSelectedArea(null)}
          >
            <Text style={[styles.filterChipText, !selectedArea && styles.filterChipTextActive]}>Tümü</Text>
          </TouchableOpacity>
          {serviceAreas.map((area) => (
            <TouchableOpacity
              key={area.id}
              style={[styles.filterChip, selectedArea === area.id && styles.filterChipActive]}
              onPress={() => setSelectedArea(area.id)}
            >
              <Text style={[styles.filterChipText, selectedArea === area.id && styles.filterChipTextActive]}>
                {area.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Sipariş listesi — masaya göre gruplanmış */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
      >
        {grouped.length === 0 ? (
          <EmptyState icon="restaurant-outline" title="Aktif Sipariş Yok" description="Yeni siparişler burada görünecek" />
        ) : (
          grouped.map(([location, items]) => renderGroupCard(location, items))
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  filterBar: {
    maxHeight: 48,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    backgroundColor: colors.card,
    marginRight: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  listContent: { padding: spacing.sm },
  row: { justifyContent: 'space-between' },
  orderCard: {
    width: '100%',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  orderLocation: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, flex: 1 },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
  },
  timeText: { fontSize: fontSize.xs, fontWeight: '700', color: '#fff' },
  orderTabNo: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.xs },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
    borderLeftWidth: 3,
  },
  orderItemText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  orderNotes: { fontSize: fontSize.xs, fontWeight: '600', color: '#ef4444', marginTop: 2 },
  miniBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  miniStatusText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.full,
    marginBottom: spacing.xs,
  },
  statusText: { fontSize: fontSize.xs, fontWeight: '700', color: '#fff' },
  orderActions: { flexDirection: 'row', gap: spacing.xs },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  readyLabel: {
    flex: 1,
    textAlign: 'center',
    color: '#22c55e',
    fontWeight: '700',
    fontSize: fontSize.md,
    paddingVertical: spacing.sm,
  },
});

export default KitchenScreen;
