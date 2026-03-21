/**
 * MinibarAddModal - Minibar Ürün Ekleme Modal'ı
 *
 * Minibar ürün listesini gösterir.
 * Personel bir ürün seçip adet belirleyerek odanın minibarına ekler.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { minibarApi } from '../../services/api';
import type { MinibarProduct } from '../../utils/types';

interface MinibarAddModalProps {
  visible: boolean;
  roomId: number;
  onClose: () => void;
  onItemAdded: () => void;
  staffName?: string;
}

const MinibarAddModal: React.FC<MinibarAddModalProps> = ({
  visible,
  roomId,
  onClose,
  onItemAdded,
  staffName,
}) => {
  const [products, setProducts] = useState<MinibarProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<MinibarProduct | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      loadProducts();
      setSelectedProduct(null);
      setQuantity(1);
    }
  }, [visible]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await minibarApi.getProducts();
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!selectedProduct) return;

    setSubmitting(true);
    try {
      await minibarApi.addToRoom(roomId, {
        productId: selectedProduct.id,
        quantity,
        staffName,
      });
      onItemAdded();
      onClose();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Ürün eklenemedi');
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount: number): string =>
    `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Ürün Ekle</Text>
          <View style={{ width: 28 }} />
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Ürünler yükleniyor...</Text>
          </View>
        ) : (
          <>
            {/* Ürün Listesi */}
            <FlatList
              data={products}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.list}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons name="cube-outline" size={48} color={colors.textDisabled} />
                  <Text style={styles.emptyText}>Minibar ürünü bulunamadı</Text>
                  <Text style={styles.emptySubtext}>
                    Stok yönetiminden "Minibar" kategorili ürün ekleyin
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isSelected = selectedProduct?.id === item.id;
                const isDisabled = item.availableStock <= 0;

                return (
                  <TouchableOpacity
                    style={[
                      styles.productRow,
                      isSelected && styles.productRowSelected,
                      isDisabled && styles.productRowDisabled,
                    ]}
                    onPress={() => {
                      if (!isDisabled) {
                        setSelectedProduct(item);
                        setQuantity(1);
                      }
                    }}
                    disabled={isDisabled}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.productIcon, isDisabled && { opacity: 0.4 }]}>
                      <Ionicons name="wine-outline" size={22} color={isSelected ? colors.primary : colors.textSecondary} />
                    </View>
                    <View style={styles.productInfo}>
                      <Text style={[styles.productName, isDisabled && styles.disabledText]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.productMeta, isDisabled && styles.disabledText]}>
                        {formatCurrency(item.price)} · Stok: {item.availableStock} {item.unit}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                    )}
                    {isDisabled && (
                      <Text style={styles.outOfStockBadge}>Stok Yok</Text>
                    )}
                  </TouchableOpacity>
                );
              }}
            />

            {/* Adet Seçici + Ekle Butonu */}
            {selectedProduct && (
              <View style={styles.footer}>
                <View style={styles.quantityRow}>
                  <Text style={styles.selectedName}>{selectedProduct.name}</Text>
                  <View style={styles.stepper}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      <Ionicons name="remove" size={20} color={colors.primary} />
                    </TouchableOpacity>
                    <Text style={styles.stepperValue}>{quantity}</Text>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => setQuantity((q) => Math.min(selectedProduct.availableStock, q + 1))}
                    >
                      <Ionicons name="add" size={20} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <AppButton
                  title={submitting ? 'Ekleniyor...' : `Minibar'a Ekle (${formatCurrency(selectedProduct.price * quantity)})`}
                  onPress={handleAdd}
                  icon="snow-outline"
                  disabled={submitting}
                />
              </View>
            )}
          </>
        )}
      </View>
    </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  list: {
    padding: spacing.md,
    paddingBottom: 200,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textDisabled,
  },
  emptySubtext: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: 8,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: 12,
  },
  productRowSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '08',
  },
  productRowDisabled: {
    opacity: 0.5,
  },
  productIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.divider,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  productMeta: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  disabledText: {
    color: colors.textDisabled,
  },
  outOfStockBadge: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.error,
    backgroundColor: colors.error + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  footer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: 34,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    flex: 1,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  stepperBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperValue: {
    fontSize: fontSize.lg,
    fontWeight: '800',
    color: colors.textPrimary,
    minWidth: 36,
    textAlign: 'center',
  },
});

export default MinibarAddModal;
