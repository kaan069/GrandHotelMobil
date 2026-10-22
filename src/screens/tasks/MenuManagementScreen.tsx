/**
 * MenuManagementScreen — Menü Yönetimi
 *
 * Kategoriler (üstte yatay) ve seçili kategorinin ürünleri.
 * Yönetici / restoran müdürü: kategori ekle-düzenle-sil, ürün ekle-düzenle-sil (ad, açıklama, fiyat).
 * Mutfak / bar (şef, barista, barmen): sadece ürünü "Tükendi / Mevcut" işaretler.
 * Ürün görseli web panelinden yüklenir; mobil düzenleme görseli değiştirmez.
 * Web karşılığı: pages/menu/MenuManagement.tsx
 *
 * API: menuApi.getCategories / getItems / createCategory / updateCategory / deleteCategory /
 *      createItem / updateItem / deleteItem
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, LoadingState, EmptyState, PromptModal, parseAmount, isAmountText } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLES } from '../../utils/constants';
import { hasAnyRole, ADMIN_ROLES } from '../../utils/permissions';
import useAuth from '../../hooks/useAuth';
import { menuApi } from '../../services/api';
import type { ApiMenuCategory, ApiMenuItem } from '../../utils/types';

interface MenuManagementScreenProps {
  onClose: () => void;
}

/** Backend RESTAURANT_MANAGER_ROLES / MENU_AVAILABILITY_ROLES ile aynı */
const MENU_MANAGER_ROLES = [...ADMIN_ROLES, ROLES.RESTAURANT_MANAGER];
const AVAILABILITY_ROLES = [...MENU_MANAGER_ROLES, ROLES.CHEF, ROLES.BARISTA, ROLES.BARMAN];

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_ITEM = { name: '', description: '', price: '' };

const MenuManagementScreen: React.FC<MenuManagementScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const canManage = hasAnyRole(user, MENU_MANAGER_ROLES);
  const canToggle = hasAnyRole(user, AVAILABILITY_ROLES);

  const [categories, setCategories] = useState<ApiMenuCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [items, setItems] = useState<ApiMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [categoryPrompt, setCategoryPrompt] = useState<{ id: number | null; name: string } | null>(null);
  const [itemForm, setItemForm] = useState<{ id: number | null; name: string; description: string; price: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async (keepSelection = true) => {
    try {
      const cats = await menuApi.getCategories();
      setCategories(cats);
      setSelectedCatId((prev) => {
        if (keepSelection && prev && cats.some((c) => c.id === prev)) return prev;
        return cats[0]?.id ?? null;
      });
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Menü yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadItems = useCallback(async (catId: number | null) => {
    if (!catId) { setItems([]); return; }
    setItemsLoading(true);
    try {
      setItems(await menuApi.getItems(catId));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Ürünler yüklenemedi');
    } finally {
      setItemsLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { loadItems(selectedCatId); }, [selectedCatId, loadItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadCategories();
    await loadItems(selectedCatId);
    setRefreshing(false);
  };

  const saveCategory = async (name: string) => {
    if (!categoryPrompt) return;
    if (categoryPrompt.id) await menuApi.updateCategory(categoryPrompt.id, { name: name.trim() });
    else {
      const created = await menuApi.createCategory({ name: name.trim() });
      setSelectedCatId(created.id);
    }
    await loadCategories();
  };

  const deleteCategory = (cat: ApiMenuCategory) => {
    Alert.alert('Kategoriyi Sil', `"${cat.name}" ve içindeki ürünler silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await menuApi.deleteCategory(cat.id);
            await loadCategories(false);
          } catch (err) {
            Alert.alert('Hata', (err as Error).message || 'Kategori silinemedi');
          }
        },
      },
    ]);
  };

  const openItemForm = (item?: ApiMenuItem) => {
    setItemForm(item
      ? { id: item.id, name: item.name, description: item.description || '', price: String(Number(item.price)) }
      : { id: null, ...EMPTY_ITEM });
  };

  const saveItem = async () => {
    if (!itemForm || !selectedCatId) return;
    if (!itemForm.name.trim()) { Alert.alert('Uyarı', 'Ürün adı zorunlu.'); return; }
    if (!isAmountText(itemForm.price)) { Alert.alert('Uyarı', 'Geçerli bir fiyat girin (ör. 125,50).'); return; }
    const payload = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      price: parseAmount(itemForm.price).toFixed(2),
    };
    setSaving(true);
    try {
      if (itemForm.id) await menuApi.updateItem(itemForm.id, payload);
      else await menuApi.createItem({ ...payload, categoryId: selectedCatId, isAvailable: true });
      setItemForm(null);
      await loadItems(selectedCatId);
      loadCategories();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Ürün kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const toggleAvailability = async (item: ApiMenuItem) => {
    const next = !item.isAvailable;
    setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: next } : i)));
    try {
      await menuApi.updateItem(item.id, { isAvailable: next });
    } catch (err) {
      setItems((prev) => prev.map((i) => (i.id === item.id ? { ...i, isAvailable: item.isAvailable } : i)));
      Alert.alert('Hata', (err as Error).message || 'Durum değiştirilemedi');
    }
  };

  const deleteItem = (item: ApiMenuItem) => {
    Alert.alert('Ürünü Sil', `"${item.name}" silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await menuApi.deleteItem(item.id);
            await loadItems(selectedCatId);
            loadCategories();
          } catch (err) {
            Alert.alert('Hata', (err as Error).message || 'Ürün silinemedi');
          }
        },
      },
    ]);
  };

  const selectedCat = categories.find((c) => c.id === selectedCatId);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Menü Yönetimi</Text>
        {canManage ? (
          <TouchableOpacity onPress={() => setCategoryPrompt({ id: null, name: '' })}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        ) : <View style={{ width: 28 }} />}
      </View>

      {loading ? (
        <LoadingState message="Menü yükleniyor..." />
      ) : categories.length === 0 ? (
        <EmptyState icon="restaurant-outline" title="Menüde kategori yok" />
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar} contentContainerStyle={styles.catScroll}>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, selectedCatId === cat.id && styles.catChipActive]}
                onPress={() => setSelectedCatId(cat.id)}
                onLongPress={canManage ? () => Alert.alert(cat.name, undefined, [
                  { text: 'Yeniden Adlandır', onPress: () => setCategoryPrompt({ id: cat.id, name: cat.name }) },
                  { text: 'Sil', style: 'destructive', onPress: () => deleteCategory(cat) },
                  { text: 'Kapat', style: 'cancel' },
                ]) : undefined}
              >
                <Text style={[styles.catText, selectedCatId === cat.id && styles.catTextActive]}>
                  {cat.name}{cat.itemCount != null ? ` (${cat.itemCount})` : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          >
            {canManage && selectedCat && (
              <AppButton title={`${selectedCat.name} — Ürün Ekle`} icon="add-outline" variant="outline" onPress={() => openItemForm()} style={{ marginBottom: spacing.sm }} />
            )}
            {canManage && <Text style={styles.hint}>Kategoriyi yeniden adlandırmak / silmek için üzerine uzun basın.</Text>}

            {itemsLoading ? (
              <LoadingState message="Ürünler yükleniyor..." />
            ) : items.length === 0 ? (
              <Text style={styles.emptyText}>Bu kategoride ürün yok</Text>
            ) : (
              items.map((item) => (
                <AppCard key={item.id} style={styles.card}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.itemName, !item.isAvailable && styles.itemUnavailable]}>{item.name}</Text>
                      {!!item.description && <Text style={styles.meta} numberOfLines={2}>{item.description}</Text>}
                      <Text style={styles.price}>{money(item.price)}</Text>
                    </View>
                    {canToggle && (
                      <TouchableOpacity
                        style={[styles.availBtn, { borderColor: item.isAvailable ? colors.success : colors.textDisabled }]}
                        onPress={() => toggleAvailability(item)}
                      >
                        <Text style={[styles.availText, { color: item.isAvailable ? colors.success : colors.textSecondary }]}>
                          {item.isAvailable ? 'Mevcut' : 'Tükendi'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                  {canManage && (
                    <View style={styles.itemActions}>
                      <TouchableOpacity style={styles.actionLink} onPress={() => openItemForm(item)}>
                        <Ionicons name="create-outline" size={16} color={colors.primary} />
                        <Text style={styles.actionText}>Düzenle</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionLink} onPress={() => deleteItem(item)}>
                        <Ionicons name="trash-outline" size={16} color={colors.error} />
                        <Text style={[styles.actionText, { color: colors.error }]}>Sil</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </AppCard>
              ))
            )}
          </ScrollView>
        </>
      )}

      <PromptModal
        visible={!!categoryPrompt}
        title={categoryPrompt?.id ? 'Kategoriyi Yeniden Adlandır' : 'Yeni Kategori'}
        placeholder="Kategori adı"
        initialValue={categoryPrompt?.name || ''}
        confirmText="Kaydet"
        validate={(v) => (v.trim() ? null : 'Kategori adı zorunlu')}
        onConfirm={saveCategory}
        onClose={() => setCategoryPrompt(null)}
      />

      <Modal visible={!!itemForm} animationType="slide" transparent onRequestClose={() => setItemForm(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{itemForm?.id ? 'Ürünü Düzenle' : 'Yeni Ürün'}</Text>
            <AppInput label="Ürün adı *" value={itemForm?.name || ''} onChangeText={(v) => setItemForm((p) => (p ? { ...p, name: v } : p))} />
            <AppInput label="Fiyat (₺) *" value={itemForm?.price || ''} onChangeText={(v) => setItemForm((p) => (p ? { ...p, price: v } : p))} keyboardType="decimal-pad" />
            <AppInput label="Açıklama" value={itemForm?.description || ''} onChangeText={(v) => setItemForm((p) => (p ? { ...p, description: v } : p))} multiline />
            <View style={styles.modalActions}>
              <AppButton title="Vazgeç" variant="outline" onPress={() => setItemForm(null)} disabled={saving} style={{ flex: 1 }} />
              <AppButton title="Kaydet" onPress={saveItem} loading={saving} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  catBar: { flexGrow: 0, borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  catScroll: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  catChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  catTextActive: { color: colors.textWhite, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: 100 },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.sm },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.xl, fontSize: fontSize.sm },
  card: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  itemUnavailable: { color: colors.textDisabled, textDecorationLine: 'line-through' },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  price: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary, marginTop: 4 },
  availBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: borderRadius.md, borderWidth: 1.5 },
  availText: { fontSize: fontSize.xs, fontWeight: '700' },
  itemActions: { flexDirection: 'row', gap: spacing.lg, marginTop: spacing.sm, paddingTop: spacing.xs, borderTopWidth: 1, borderTopColor: colors.divider },
  actionLink: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 4 },
  actionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});

export default MenuManagementScreen;
