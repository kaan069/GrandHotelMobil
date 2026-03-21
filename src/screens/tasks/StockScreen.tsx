/**
 * StockScreen - Stok Yönetimi Ekranı
 *
 * Ürün ekleme, düzenleme ve stok takibi.
 * Backend API entegrasyonu ile çalışır.
 * Patron, müdür ve minibar görevlisi erişebilir.
 *
 * isMinibar: true olan ürünler odaların minibarına konulabilir.
 * minibarPrice: Misafir satış fiyatı (isMinibar true ise zorunlu).
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, AppCard, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { STOCK_CATEGORIES } from '../../utils/constants';
import useApi from '../../hooks/useApi';
import { stockApi } from '../../services/api';
import type { StockItem } from '../../utils/types';

interface StockFormData {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  isMinibar: boolean;
  minibarPrice: string;
}

interface StockScreenProps {
  onClose: () => void;
}

const EMPTY_PRODUCT: StockFormData = {
  name: '', category: 'kitchen', quantity: '', unit: 'adet',
  isMinibar: false, minibarPrice: '',
};

const formatCurrency = (amount: string | null): string => {
  if (!amount) return '';
  const num = parseFloat(amount);
  return `₺${num.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const StockScreen: React.FC<StockScreenProps> = ({ onClose }) => {
  const { data: stock, loading, error, refetch } = useApi<StockItem[]>(() => stockApi.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState<StockFormData>({ ...EMPTY_PRODUCT });
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState('all');

  /** Kategori adını getir */
  const getCategoryLabel = (value: string): string => {
    const cat = STOCK_CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  /** Form aç (yeni veya düzenleme) */
  const openForm = (item: StockItem | null = null) => {
    if (item) {
      setEditItem(item);
      setFormData({
        name: item.name,
        category: item.category,
        quantity: String(item.quantity),
        unit: item.unit,
        isMinibar: item.isMinibar,
        minibarPrice: item.minibarPrice || '',
      });
    } else {
      setEditItem(null);
      setFormData({ ...EMPTY_PRODUCT });
    }
    setShowForm(true);
  };

  /** Kaydet (ekle veya güncelle) — API */
  const handleSave = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Uyarı', 'Ürün adı zorunludur');
      return;
    }
    if (formData.isMinibar && !formData.minibarPrice) {
      Alert.alert('Uyarı', 'Minibar ürünü için satış fiyatı zorunludur');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        unit: formData.unit || 'adet',
        quantity: Number(formData.quantity) || 0,
        isMinibar: formData.isMinibar,
        minibarPrice: formData.isMinibar ? Number(formData.minibarPrice) : null,
      };

      if (editItem) {
        await stockApi.update(editItem.id, payload);
      } else {
        await stockApi.create(payload);
      }

      setShowForm(false);
      setEditItem(null);
      setFormData({ ...EMPTY_PRODUCT });
      await refetch();
    } catch (err: any) {
      Alert.alert('Hata', err.message || 'Kaydetme başarısız');
    } finally {
      setSubmitting(false);
    }
  };

  /** Ürün sil — API */
  const handleDelete = (id: number) => {
    Alert.alert('Sil', 'Bu ürünü silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await stockApi.delete(id);
            await refetch();
          } catch (err: any) {
            Alert.alert('Hata', err.message || 'Silme başarısız');
          }
        },
      },
    ]);
  };

  /* Filtreleme */
  const allStock = stock || [];
  const filteredStock = filter === 'all'
    ? allStock
    : filter === 'minibar'
      ? allStock.filter((s) => s.isMinibar)
      : allStock.filter((s) => s.category === filter);

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Stok Yönetimi</Text>
        <TouchableOpacity onPress={() => openForm()}>
          <Ionicons name="add-circle" size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        {[
          { value: 'all', label: 'Tümü' },
          { value: 'minibar', label: 'Minibar' },
          ...STOCK_CATEGORIES.map((c) => ({ value: c.value, label: c.label })),
        ].map((f) => (
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

      {/* Yükleniyor / Hata / Liste */}
      {loading && !stock ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Stok yükleniyor...</Text>
        </View>
      ) : error ? (
        <View style={styles.loadingContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={colors.error} />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={refetch} style={styles.retryBtn}>
            <Text style={styles.retryText}>Tekrar Dene</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredStock}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={loading} onRefresh={refetch} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <EmptyState icon="cube-outline" title="Stok boş" description="Ürün eklemek için + butonuna basın" />
          }
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.7} onPress={() => openForm(item)}>
              <AppCard style={styles.stockCard}>
                <View style={styles.stockInfo}>
                  <View style={styles.stockNameRow}>
                    <Text style={styles.stockName}>{item.name}</Text>
                    {item.isMinibar && (
                      <View style={styles.minibarBadge}>
                        <Ionicons name="snow-outline" size={10} color="#fff" />
                        <Text style={styles.minibarBadgeText}>Minibar</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.stockCategory}>
                    {getCategoryLabel(item.category)}
                    {item.isMinibar && item.minibarPrice ? ` · ${formatCurrency(item.minibarPrice)}` : ''}
                  </Text>
                </View>
                <View style={styles.stockRight}>
                  <Text style={styles.stockQuantity}>
                    {item.quantity} {item.unit}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </AppCard>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Ürün ekleme/düzenleme modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowForm(false)}>
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>{editItem ? 'Ürün Düzenle' : 'Yeni Ürün'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <ScrollView style={styles.formScroll} contentContainerStyle={styles.formContent}>
            <AppInput
              label="Ürün Adı"
              value={formData.name}
              onChangeText={(text: string) => setFormData((p) => ({ ...p, name: text }))}
              placeholder="Ürün adı girin"
            />

            {/* Kategori Seçimi */}
            <Text style={styles.formLabel}>Kategori</Text>
            <View style={styles.categoryGrid}>
              {STOCK_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.categoryChip,
                    formData.category === cat.value && styles.categoryChipActive,
                  ]}
                  onPress={() => setFormData((p) => ({ ...p, category: cat.value }))}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      formData.category === cat.value && styles.categoryChipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.formRow}>
              <AppInput
                label="Miktar"
                value={formData.quantity}
                onChangeText={(text: string) => setFormData((p) => ({ ...p, quantity: text }))}
                placeholder="0"
                keyboardType="numeric"
                style={{ flex: 1, marginRight: 8 }}
              />
              <AppInput
                label="Birim"
                value={formData.unit}
                onChangeText={(text: string) => setFormData((p) => ({ ...p, unit: text }))}
                placeholder="adet"
                style={{ flex: 1 }}
              />
            </View>

            {/* Minibar Toggle */}
            <View style={styles.minibarToggleRow}>
              <View style={styles.minibarToggleInfo}>
                <Ionicons name="snow-outline" size={20} color={formData.isMinibar ? colors.primary : colors.textSecondary} />
                <View>
                  <Text style={styles.minibarToggleLabel}>Minibarda Satılsın</Text>
                  <Text style={styles.minibarToggleHint}>
                    Açıksa bu ürün odalara minibar olarak konulabilir
                  </Text>
                </View>
              </View>
              <Switch
                value={formData.isMinibar}
                onValueChange={(val) => setFormData((p) => ({
                  ...p,
                  isMinibar: val,
                  minibarPrice: val ? p.minibarPrice : '',
                }))}
                trackColor={{ false: colors.divider, true: colors.primary + '50' }}
                thumbColor={formData.isMinibar ? colors.primary : '#f4f3f4'}
              />
            </View>

            {/* Minibar Fiyatı — sadece isMinibar açıksa */}
            {formData.isMinibar && (
              <AppInput
                label="Minibar Satış Fiyatı (₺)"
                value={formData.minibarPrice}
                onChangeText={(text: string) => setFormData((p) => ({ ...p, minibarPrice: text }))}
                placeholder="Misafir satış fiyatı"
                keyboardType="decimal-pad"
                icon="pricetag-outline"
              />
            )}

            <AppButton
              title={submitting ? 'Kaydediliyor...' : 'Kaydet'}
              onPress={handleSave}
              icon="checkmark-outline"
              disabled={submitting}
              style={{ marginTop: spacing.sm }}
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
    gap: 6,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 12,
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
  errorText: {
    fontSize: fontSize.sm,
    color: colors.error,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
  },
  retryText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textWhite,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  stockInfo: {
    flex: 1,
  },
  stockNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stockName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  minibarBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#475569',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  minibarBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#fff',
  },
  stockCategory: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  stockRight: {
    alignItems: 'flex-end',
    marginRight: 12,
  },
  stockQuantity: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  deleteBtn: {
    padding: 4,
  },
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
    paddingBottom: 100,
  },
  formLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
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
  formRow: {
    flexDirection: 'row',
  },
  minibarToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  minibarToggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  minibarToggleLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  minibarToggleHint: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default StockScreen;
