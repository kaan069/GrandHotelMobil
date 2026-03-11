/**
 * StockScreen - Stok Yönetimi Ekranı
 *
 * Ürün ekleme, düzenleme ve stok takibi.
 * Patron ve müdür için erişilebilir.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, AppCard, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { STOCK_UNITS, STOCK_CATEGORIES } from '../../utils/constants';

interface StockItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minStock: number;
}

interface StockFormData {
  name: string;
  category: string;
  quantity: string;
  unit: string;
  minStock: string;
}

interface StockScreenProps {
  onClose: () => void;
}

/** Mock stok verileri */
const INITIAL_STOCK: StockItem[] = [
  { id: 1, name: 'Domates', category: 'food', quantity: 25, unit: 'kg', minStock: 10 },
  { id: 2, name: 'Zeytinyağı', category: 'food', quantity: 8, unit: 'lt', minStock: 5 },
  { id: 3, name: 'Çamaşır Deterjanı', category: 'cleaning', quantity: 3, unit: 'kutu', minStock: 5 },
  { id: 4, name: 'Kola', category: 'drink', quantity: 48, unit: 'adet', minStock: 20 },
  { id: 5, name: 'Tuvalet Kağıdı', category: 'cleaning', quantity: 15, unit: 'paket', minStock: 10 },
];

const EMPTY_PRODUCT: StockFormData = { name: '', category: 'food', quantity: '', unit: 'adet', minStock: '' };

const StockScreen: React.FC<StockScreenProps> = ({ onClose }) => {
  const [stock, setStock] = useState<StockItem[]>(INITIAL_STOCK);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<StockItem | null>(null);
  const [formData, setFormData] = useState<StockFormData>({ ...EMPTY_PRODUCT });

  /** Kategori adını getir */
  const getCategoryLabel = (value: string): string => {
    const cat = STOCK_CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  /** Birim adını getir */
  const getUnitLabel = (value: string): string => {
    const unit = STOCK_UNITS.find((u) => u.value === value);
    return unit ? unit.label : value;
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
        minStock: String(item.minStock),
      });
    } else {
      setEditItem(null);
      setFormData({ ...EMPTY_PRODUCT });
    }
    setShowForm(true);
  };

  /** Kaydet (ekle veya güncelle) */
  const handleSave = () => {
    if (!formData.name.trim() || !formData.quantity) return;

    if (editItem) {
      /* Güncelle */
      setStock((prev) =>
        prev.map((item) =>
          item.id === editItem.id
            ? { ...item, ...formData, quantity: Number(formData.quantity), minStock: Number(formData.minStock) }
            : item
        )
      );
    } else {
      /* Yeni ekle */
      const nextId = stock.length > 0 ? Math.max(...stock.map((i) => i.id)) + 1 : 1;
      setStock((prev) => [
        ...prev,
        { id: nextId, ...formData, quantity: Number(formData.quantity), minStock: Number(formData.minStock) },
      ]);
    }

    setShowForm(false);
    setEditItem(null);
    setFormData({ ...EMPTY_PRODUCT });
  };

  /** Ürün sil */
  const handleDelete = (id: number) => {
    Alert.alert('Sil', 'Bu ürünü silmek istediğinize emin misiniz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => setStock((prev) => prev.filter((item) => item.id !== id)),
      },
    ]);
  };

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

      {/* Stok listesi */}
      <FlatList
        data={stock}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="cube-outline" title="Stok boş" description="Ürün eklemek için + butonuna basın" />
        }
        renderItem={({ item }) => {
          const isLowStock = item.quantity <= item.minStock;
          return (
            <TouchableOpacity activeOpacity={0.7} onPress={() => openForm(item)}>
              <AppCard style={[styles.stockCard, isLowStock && styles.lowStockCard]}>
                <View style={styles.stockInfo}>
                  <Text style={styles.stockName}>{item.name}</Text>
                  <Text style={styles.stockCategory}>{getCategoryLabel(item.category)}</Text>
                </View>
                <View style={styles.stockRight}>
                  <Text style={[styles.stockQuantity, isLowStock && styles.lowStockText]}>
                    {item.quantity} {item.unit}
                  </Text>
                  {isLowStock && (
                    <Text style={styles.lowStockLabel}>Düşük Stok!</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleDelete(item.id)} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={18} color={colors.error} />
                </TouchableOpacity>
              </AppCard>
            </TouchableOpacity>
          );
        }}
      />

      {/* Ürün ekleme/düzenleme modal */}
      <Modal visible={showForm} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.formContainer}>
          <View style={styles.formHeader}>
            <TouchableOpacity onPress={() => setShowForm(false)}>
              <Ionicons name="close" size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.formTitle}>{editItem ? 'Ürün Düzenle' : 'Yeni Ürün'}</Text>
            <View style={{ width: 28 }} />
          </View>

          <View style={styles.formContent}>
            <AppInput
              label="Ürün Adı"
              value={formData.name}
              onChangeText={(text: string) => setFormData((p) => ({ ...p, name: text }))}
              placeholder="Ürün adı girin"
            />
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
                placeholder="kg"
                style={{ flex: 1 }}
              />
            </View>
            <AppInput
              label="Minimum Stok"
              value={formData.minStock}
              onChangeText={(text: string) => setFormData((p) => ({ ...p, minStock: text }))}
              placeholder="Uyarı seviyesi"
              keyboardType="numeric"
            />
            <AppButton title="Kaydet" onPress={handleSave} icon="checkmark-outline" />
          </View>
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
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  stockCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  lowStockCard: {
    borderWidth: 1,
    borderColor: colors.warning + '60',
  },
  stockInfo: {
    flex: 1,
  },
  stockName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
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
  lowStockText: {
    color: colors.warning,
  },
  lowStockLabel: {
    fontSize: fontSize.xs,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 2,
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
  formContent: {
    padding: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
});

export default StockScreen;
