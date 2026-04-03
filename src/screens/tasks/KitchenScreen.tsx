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
import { serviceAreasApi } from '../../services/api';
import { API_BASE_URL } from '../../utils/constants';
import type { ApiServiceArea } from '../../utils/types';
import useRestaurantWebSocket from '../../hooks/useRestaurantWebSocket';

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
  const url = `${API_BASE_URL}/order-items/${qs ? '?' + qs : ''}`;
  const res = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
  if (!res.ok) throw new Error('Siparişler yüklenemedi');
  return res.json();
}

async function kitchenAction(id: number, action: string, body?: object): Promise<OrderItem> {
  const url = `${API_BASE_URL}/order-items/${id}/${action}/`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error('İşlem başarısız');
  return res.json();
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
      // TODO: Sesli bildirim (react-native-sound veya expo-av)
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

  if (loading) return <LoadingState message="Siparişler yükleniyor..." />;

  const renderOrder = ({ item: order }: { item: OrderItem }) => {
    const elapsed = getElapsedMinutes(order.sentToKitchenAt);
    const statusColor = getStatusColor(order.status);
    const location = order.tableNumber
      ? `Masa ${order.tableNumber}`
      : order.roomNumber
        ? `Oda ${order.roomNumber}`
        : order.guestName || '?';

    return (
      <View style={[styles.orderCard, { borderLeftColor: statusColor }]}>
        {/* Üst: Konum + Süre */}
        <View style={styles.orderHeader}>
          <Text style={styles.orderLocation}>{location}</Text>
          <View style={[styles.timeBadge, { backgroundColor: getTimeColor(elapsed) }]}>
            <Ionicons name="time-outline" size={12} color="#fff" />
            <Text style={styles.timeText}>{elapsed} dk</Text>
          </View>
        </View>

        <Text style={styles.orderTabNo}>{order.tabNo}</Text>

        {/* Ürün */}
        <View style={styles.orderItemBox}>
          <Text style={styles.orderItemText}>
            {order.itemQuantity}x {order.itemDescription}
          </Text>
          {order.notes ? (
            <Text style={styles.orderNotes}>⚠ {order.notes}</Text>
          ) : null}
        </View>

        {/* Durum badge */}
        <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
          <Text style={styles.statusText}>{getStatusLabel(order.status)}</Text>
        </View>

        {/* Aksiyonlar */}
        <View style={styles.orderActions}>
          {order.status === 'pending' && (
            <>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#f59e0b' }]}
                onPress={() => handleStart(order.id)}
              >
                <Ionicons name="play" size={18} color="#fff" />
                <Text style={styles.actionBtnText}>Başla</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#ef4444', flex: 0.3 }]}
                onPress={() => handleCancel(order.id)}
              >
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </>
          )}
          {order.status === 'preparing' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#22c55e' }]}
              onPress={() => handleReady(order.id)}
            >
              <Ionicons name="checkmark" size={18} color="#fff" />
              <Text style={styles.actionBtnText}>Hazır</Text>
            </TouchableOpacity>
          )}
          {order.status === 'ready' && (
            <Text style={styles.readyLabel}>✓ Servis bekliyor</Text>
          )}
        </View>
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

      {/* Sipariş listesi */}
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
        ListEmptyComponent={<EmptyState icon="restaurant-outline" title="Aktif Sipariş Yok" description="Yeni siparişler burada görünecek" />}
        numColumns={2}
        columnWrapperStyle={styles.row}
      />
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
    width: '48.5%',
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
  orderItemBox: {
    backgroundColor: '#f8fafc',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.xs,
  },
  orderItemText: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  orderNotes: { fontSize: fontSize.sm, fontWeight: '600', color: '#ef4444', marginTop: 4 },
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
