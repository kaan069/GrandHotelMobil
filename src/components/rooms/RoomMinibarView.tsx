/**
 * RoomMinibarView - Oda Minibar Görünümü
 *
 * Buzdolabı şeklinde minibar UI.
 * Minibar ve housekeeping personeli oda detayında bu component'i görür.
 * Ürün ekleme, tüketim kaydı ve iade işlemleri yapılır.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { minibarApi } from '../../services/api';
import type { RoomMinibarItem } from '../../utils/types';
import MinibarAddModal from './MinibarAddModal';

interface RoomMinibarViewProps {
  roomId: number;
  roomNumber: string;
  roomStatus: string;
  staffName?: string;
}

const PRODUCT_ICONS: Record<string, string> = {
  default: 'wine-outline',
};

const RoomMinibarView: React.FC<RoomMinibarViewProps> = ({
  roomId,
  roomNumber,
  roomStatus,
  staffName,
}) => {
  const [items, setItems] = useState<RoomMinibarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadMinibar = useCallback(async () => {
    try {
      const data = await minibarApi.getRoomMinibar(roomId);
      setItems(data);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    loadMinibar();
  }, [loadMinibar]);

  const handleRefresh = () => {
    setLoading(true);
    loadMinibar();
  };

  const formatCurrency = (amount: number): string =>
    `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  /** Ürüne dokunulduğunda aksiyon seç */
  const handleItemPress = (item: RoomMinibarItem) => {
    const isOccupied = roomStatus === 'occupied';

    const options: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    if (isOccupied) {
      options.push({
        text: `Tüketildi (${formatCurrency(item.price * 1)})`,
        onPress: () => handleConsume(item),
      });
    }

    options.push({
      text: 'Çıkar (Stoka İade)',
      style: 'destructive',
      onPress: () => handleRemove(item),
    });

    options.push({ text: 'İptal', style: 'cancel' });

    Alert.alert(
      item.productName,
      isOccupied
        ? `${item.quantity} adet · ${formatCurrency(item.price)}/adet`
        : `${item.quantity} adet · Tüketim için oda dolu olmalı`,
      options
    );
  };

  /** Ürün tüketildi — folio'ya yazar */
  const handleConsume = async (item: RoomMinibarItem) => {
    try {
      await minibarApi.consume(roomId, {
        productId: item.productId,
        quantity: 1,
        staffName,
      });
      Alert.alert('Tüketim Kaydedildi', `${item.productName} — ${formatCurrency(item.price)} folio'ya eklendi`);
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Tüketim kaydedilemedi');
    }
  };

  /** Ürün çıkar — stoka iade */
  const handleRemove = async (item: RoomMinibarItem) => {
    try {
      await minibarApi.removeFromRoom(roomId, {
        productId: item.productId,
        quantity: 1,
      });
      handleRefresh();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Ürün çıkarılamadı');
    }
  };

  /* Raf satırlarına böl (her rafta max 4 ürün) */
  const shelves: RoomMinibarItem[][] = [];
  for (let i = 0; i < items.length; i += 4) {
    shelves.push(items.slice(i, i + 4));
  }

  return (
    <View style={styles.wrapper}>
      {/* ─── Buzdolabı Üst Bar ─── */}
      <View style={styles.fridgeTop}>
        <View style={styles.fridgeTopLeft}>
          <Ionicons name="snow-outline" size={20} color="#fff" />
          <Text style={styles.fridgeTitle}>Minibar</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setShowAddModal(true)}
        >
          <Ionicons name="add" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* ─── Buzdolabı Gövdesi ─── */}
      <View style={styles.fridgeBody}>
        {/* Kapı kolu */}
        <View style={styles.doorHandle} />

        {loading ? (
          <View style={styles.loadingArea}>
            <ActivityIndicator size="small" color={colors.textSecondary} />
          </View>
        ) : items.length === 0 ? (
          /* Boş minibar */
          <TouchableOpacity
            style={styles.emptyArea}
            onPress={() => setShowAddModal(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="snow-outline" size={36} color="#94A3B8" />
            <Text style={styles.emptyText}>Minibar boş</Text>
            <Text style={styles.emptySubtext}>Ürün eklemek için dokunun</Text>
          </TouchableOpacity>
        ) : (
          /* Raf satırları */
          <View style={styles.shelvesContainer}>
            {shelves.map((shelf, shelfIndex) => (
              <View key={shelfIndex}>
                <View style={styles.shelfRow}>
                  {shelf.map((item) => (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.itemCard}
                      onPress={() => handleItemPress(item)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.itemIconWrap}>
                        <Ionicons
                          name={(PRODUCT_ICONS[item.productName.toLowerCase()] || PRODUCT_ICONS.default) as any}
                          size={22}
                          color="#475569"
                        />
                        {/* Adet badge */}
                        <View style={styles.quantityBadge}>
                          <Text style={styles.quantityText}>{item.quantity}</Text>
                        </View>
                      </View>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.productName}
                      </Text>
                      <Text style={styles.itemPrice}>
                        {formatCurrency(item.price)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Raf çizgisi */}
                {shelfIndex < shelves.length - 1 && <View style={styles.shelfLine} />}
              </View>
            ))}
          </View>
        )}
      </View>

      {/* ─── Alt Bilgi ─── */}
      {items.length > 0 && (
        <View style={styles.fridgeFooter}>
          <Text style={styles.footerText}>
            {items.reduce((sum, i) => sum + i.quantity, 0)} ürün ·{' '}
            {formatCurrency(items.reduce((sum, i) => sum + i.price * i.quantity, 0))} toplam
          </Text>
        </View>
      )}

      {/* Ürün Ekleme Modal */}
      <MinibarAddModal
        visible={showAddModal}
        roomId={roomId}
        onClose={() => setShowAddModal(false)}
        onItemAdded={handleRefresh}
        staffName={staffName}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },

  /* ─── Buzdolabı Üst Bar ─── */
  fridgeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#475569',
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
  },
  fridgeTopLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fridgeTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
  addBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* ─── Buzdolabı Gövdesi ─── */
  fridgeBody: {
    backgroundColor: '#E8EDF2',
    borderWidth: 2,
    borderTopWidth: 0,
    borderColor: '#CBD5E1',
    minHeight: 140,
    position: 'relative',
  },
  doorHandle: {
    position: 'absolute',
    right: 8,
    top: 20,
    bottom: 20,
    width: 4,
    backgroundColor: '#94A3B8',
    borderRadius: 2,
    zIndex: 1,
  },
  loadingArea: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyArea: {
    paddingVertical: 30,
    alignItems: 'center',
    gap: 6,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: '#94A3B8',
  },
  emptySubtext: {
    fontSize: fontSize.xs,
    color: '#94A3B8',
  },

  /* ─── Raflar ─── */
  shelvesContainer: {
    padding: spacing.sm,
    paddingRight: 20,
  },
  shelfRow: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 8,
  },
  shelfLine: {
    height: 2,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 4,
  },

  /* ─── Ürün Kartı ─── */
  itemCard: {
    width: 68,
    alignItems: 'center',
    gap: 3,
  },
  itemIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    position: 'relative',
  },
  quantityBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  quantityText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  itemName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#475569',
    textAlign: 'center',
  },
  itemPrice: {
    fontSize: 9,
    color: '#64748B',
    fontWeight: '500',
  },

  /* ─── Alt Bilgi ─── */
  fridgeFooter: {
    backgroundColor: '#475569',
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    alignItems: 'center',
  },
  footerText: {
    fontSize: fontSize.xs,
    color: '#CBD5E1',
    fontWeight: '500',
  },
});

export default RoomMinibarView;
