/**
 * ShoppingListScreen - Alışveriş Listesi Ekranı
 *
 * Aşçı ve garson için alışveriş listesi oluşturma ve yönetme.
 * Ürün adı, miktar ve birim girilerek listeye eklenir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, AppCard, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface ShoppingItem {
  id: number;
  name: string;
  quantity: string;
  unit: string;
  checked: boolean;
}

interface ShoppingListScreenProps {
  onClose: () => void;
}

/** Mock alışveriş listesi */
const INITIAL_LIST: ShoppingItem[] = [
  { id: 1, name: 'Domates', quantity: '5', unit: 'kg', checked: false },
  { id: 2, name: 'Zeytinyağı', quantity: '3', unit: 'lt', checked: false },
  { id: 3, name: 'Un', quantity: '10', unit: 'kg', checked: true },
  { id: 4, name: 'Peçete', quantity: '5', unit: 'paket', checked: false },
];

const ShoppingListScreen: React.FC<ShoppingListScreenProps> = ({ onClose }) => {
  const [items, setItems] = useState<ShoppingItem[]>(INITIAL_LIST);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({ name: '', quantity: '', unit: 'adet' });

  /** Yeni ürün ekle */
  const handleAdd = () => {
    if (!newItem.name.trim() || !newItem.quantity.trim()) return;

    const nextId = items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
    setItems((prev) => [
      ...prev,
      { id: nextId, ...newItem, checked: false },
    ]);
    setNewItem({ name: '', quantity: '', unit: 'adet' });
    setShowForm(false);
  };

  /** Ürünü işaretle/kaldır */
  const toggleCheck = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  /** Ürünü sil */
  const handleDelete = (id: number) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Alışveriş Listesi</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Ionicons name={showForm ? 'close-circle' : 'add-circle'} size={28} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Ürün ekleme formu */}
      {showForm && (
        <AppCard style={styles.formCard}>
          <AppInput
            label="Ürün Adı"
            value={newItem.name}
            onChangeText={(text: string) => setNewItem((p) => ({ ...p, name: text }))}
            placeholder="Örn: Domates"
          />
          <View style={styles.formRow}>
            <AppInput
              label="Miktar"
              value={newItem.quantity}
              onChangeText={(text: string) => setNewItem((p) => ({ ...p, quantity: text }))}
              placeholder="5"
              keyboardType="numeric"
              style={{ flex: 1, marginRight: 8 }}
            />
            <AppInput
              label="Birim"
              value={newItem.unit}
              onChangeText={(text: string) => setNewItem((p) => ({ ...p, unit: text }))}
              placeholder="kg"
              style={{ flex: 1 }}
            />
          </View>
          <AppButton title="Ekle" onPress={handleAdd} icon="add-outline" />
        </AppCard>
      )}

      {/* Alışveriş listesi */}
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="cart-outline" title="Liste boş" description="Ürün eklemek için + butonuna basın" />
        }
        renderItem={({ item }) => (
          <View style={[styles.itemRow, item.checked && styles.itemChecked]}>
            <TouchableOpacity onPress={() => toggleCheck(item.id)} style={styles.checkbox}>
              <Ionicons
                name={item.checked ? 'checkbox' : 'square-outline'}
                size={24}
                color={item.checked ? colors.success : colors.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemName, item.checked && styles.itemNameChecked]}>
                {item.name}
              </Text>
              <Text style={styles.itemDetail}>{item.quantity} {item.unit}</Text>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />
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
  formCard: {
    margin: spacing.md,
  },
  formRow: {
    flexDirection: 'row',
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemChecked: {
    opacity: 0.6,
  },
  checkbox: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
  },
  itemNameChecked: {
    textDecorationLine: 'line-through',
    color: colors.textSecondary,
  },
  itemDetail: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default ShoppingListScreen;
