/**
 * TableDetailScreen — Masa Detay / Adisyon (Mobil)
 *
 * Masaya tıklayınca açılır. Üstte adisyon kalemleri, altta menü.
 * + ile ürün ekle, -/sil ile çıkar. Tab yoksa ilk üründe otomatik oluşur.
 * Ödeme butonları sadece kasiyer/müdür/patron'da görünür.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  FlatList,
  RefreshControl,
  SectionList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoadingState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { tablesApi, tabsApi, menuApi, reservationsApi } from '../../services/api';
import type { ApiTable, ApiTab, ApiTabItem, ApiMenuCategory, ApiMenuItem } from '../../utils/types';
import type { Reservation } from '../../utils/types';
import useAuth from '../../hooks/useAuth';

interface Props {
  table: ApiTable;
  onClose: () => void;
  onUpdate: () => void;
}

const TableDetailScreen: React.FC<Props> = ({ table, onClose, onUpdate }) => {
  const { user } = useAuth();
  const canPay = ['cashier', 'patron', 'manager', 'restaurant_manager'].includes(user?.role || '');

  const [tab, setTab] = useState<ApiTab | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Menü */
  const [categories, setCategories] = useState<ApiMenuCategory[]>([]);
  const [menuItems, setMenuItems] = useState<ApiMenuItem[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);

  /* Ödeme */
  const [paymentVisible, setPaymentVisible] = useState(false);

  /* Hesap böl */
  const [splitVisible, setSplitVisible] = useState(false);
  const [splitSelected, setSplitSelected] = useState<number[]>([]);
  const [splitting, setSplitting] = useState(false);

  const toggleSplitItem = (id: number) => {
    setSplitSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSplit = async () => {
    if (!tab || splitSelected.length === 0) return;
    setSplitting(true);
    try {
      await tabsApi.split(tab.id, splitSelected);
      setSplitVisible(false);
      setSplitSelected([]);
      fetchDetail();
      Alert.alert('Başarılı', 'Hesap bölündü — yeni adisyon oluşturuldu');
    } catch {
      Alert.alert('Hata', 'Hesap bölme başarısız');
    } finally {
      setSplitting(false);
    }
  };
  const [showRoomSelect, setShowRoomSelect] = useState(false);
  const [checkedInRooms, setCheckedInRooms] = useState<Reservation[]>([]);

  /** Tab detay */
  const fetchDetail = useCallback(async () => {
    try {
      const detail = await tablesApi.getById(table.id);
      setTab(detail.currentTab || null);
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [table.id]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);

  /** Menü yükle */
  useEffect(() => {
    menuApi.getCategories().then((cats) => {
      setCategories(cats);
      if (cats.length > 0) {
        setSelectedCatId(cats[0].id);
        menuApi.getItems(cats[0].id).then(setMenuItems);
      }
    }).catch(console.error);
  }, []);

  const handleCatChange = async (catId: number) => {
    setSelectedCatId(catId);
    try { setMenuItems(await menuApi.getItems(catId)); }
    catch { setMenuItems([]); }
  };

  /** Ürün ekle (tab yoksa otomatik oluşur) */
  const handleAddItem = async (menuItem: ApiMenuItem) => {
    try {
      await tablesApi.addItem(table.id, {
        menuItemId: menuItem.id,
        quantity: 1,
        openedById: user?.id,
      });
      fetchDetail();
      onUpdate();
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'Ürün eklenemedi');
    }
  };

  /** Adet güncelle */
  const handleUpdateQty = async (itemId: number, qty: number) => {
    if (!tab) return;
    if (qty < 1) return handleRemoveItem(itemId);
    try {
      await tabsApi.updateItem(tab.id, itemId, qty);
      fetchDetail();
      onUpdate();
    } catch (err) { console.error(err); }
  };

  /** Kalem sil */
  const handleRemoveItem = async (itemId: number) => {
    if (!tab) return;
    try {
      await tabsApi.removeItem(tab.id, itemId);
      fetchDetail();
      onUpdate();
    } catch (err) { console.error(err); }
  };

  /** Odaya aktar — aktif odaları yükle */
  const handleShowRoomSelect = async () => {
    try {
      const res = await reservationsApi.getAll({ status: 'checked_in', isActive: true });
      setCheckedInRooms(res);
      setShowRoomSelect(true);
    } catch {
      Alert.alert('Hata', 'Aktif konaklamalar yüklenemedi');
    }
  };

  /** Ödeme */
  const handlePay = async (method: string, roomId?: number) => {
    if (!tab) return;
    try {
      await tabsApi.pay(tab.id, method, undefined, roomId);
      setPaymentVisible(false);
      setShowRoomSelect(false);
      Alert.alert('Başarılı', 'Ödeme alındı');
      onUpdate();
      onClose();
    } catch (err: any) {
      Alert.alert('Hata', err?.message || 'Ödeme hatası');
    }
  };

  const totalAmount = tab ? parseFloat(tab.totalAmount) : 0;
  const items = tab?.items || [];

  if (loading) return <LoadingState message="Yükleniyor..." />;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Masa {table.tableNumber}</Text>
          <Text style={styles.subtitle}>{table.serviceAreaName}{tab ? ` · ${tab.tabNo}` : ''}</Text>
        </View>
        {tab && (
          <View style={styles.totalBadge}>
            <Text style={styles.totalText}>{totalAmount.toFixed(2)} ₺</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchDetail(); }} />}
      >
        {/* Adisyon Kalemleri */}
        {items.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Adisyon</Text>
            {items.map(item => (
              <View key={item.id} style={styles.itemRow}>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.quantity - 1)}>
                  <Ionicons name="remove" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{item.quantity}</Text>
                <TouchableOpacity style={styles.qtyBtn} onPress={() => handleUpdateQty(item.id, item.quantity + 1)}>
                  <Ionicons name="add" size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.itemName}>{item.description}</Text>
                <Text style={styles.itemPrice}>{parseFloat(item.totalPrice).toFixed(2)} ₺</Text>
                <TouchableOpacity onPress={() => handleRemoveItem(item.id)}>
                  <Ionicons name="trash-outline" size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ))}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>TOPLAM</Text>
              <Text style={styles.totalValue}>{totalAmount.toFixed(2)} ₺</Text>
            </View>
          </View>
        )}

        {/* Menü — ürün ekle */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Menüden Ekle</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catBar}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catChip, selectedCatId === cat.id && styles.catChipActive]}
                onPress={() => handleCatChange(cat.id)}
              >
                <Text style={[styles.catChipText, selectedCatId === cat.id && styles.catChipTextActive]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {menuItems.filter(i => i.isAvailable).map(item => (
            <TouchableOpacity key={item.id} style={styles.menuItemRow} onPress={() => handleAddItem(item)}>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuItemName}>{item.name}</Text>
                <Text style={styles.menuItemPrice}>{parseFloat(item.price).toFixed(2)} ₺</Text>
              </View>
              <View style={styles.addBtn}>
                <Ionicons name="add" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Alt buton — Ödeme Al */}
      {canPay && tab && items.length > 0 && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[styles.payBtn, { backgroundColor: colors.primary }]}
            onPress={() => { setShowRoomSelect(false); setPaymentVisible(true); }}
          >
            <Ionicons name="card-outline" size={20} color="#fff" />
            <Text style={styles.payBtnText}>Ödeme Al — {totalAmount.toFixed(2)} ₺</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Ödeme Yöntemi Modal */}
      {paymentVisible && (
        <View style={styles.payOverlay}>
          <View style={styles.payModal}>
            {!showRoomSelect ? (
              <>
                <Text style={styles.payModalTitle}>Ödeme Yöntemi</Text>
                <Text style={styles.payModalAmount}>{totalAmount.toFixed(2)} ₺</Text>

                <TouchableOpacity style={styles.payOption} onPress={() => handlePay('cash')}>
                  <Ionicons name="cash-outline" size={28} color="#22C55E" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payOptionTitle}>Nakit</Text>
                    <Text style={styles.payOptionDesc}>Nakit ödeme al</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.payOption} onPress={() => handlePay('card')}>
                  <Ionicons name="card-outline" size={28} color="#3B82F6" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payOptionTitle}>Kredi Kartı</Text>
                    <Text style={styles.payOptionDesc}>Kart ile ödeme</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.payOption} onPress={handleShowRoomSelect}>
                  <Ionicons name="bed-outline" size={28} color="#F59E0B" />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.payOptionTitle}>Odaya Aktar</Text>
                    <Text style={styles.payOptionDesc}>Otel misafirinin odasına yansıt</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity style={styles.payCancel} onPress={() => setPaymentVisible(false)}>
                  <Text style={styles.payCancelText}>İptal</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                  <TouchableOpacity onPress={() => setShowRoomSelect(false)} style={{ marginRight: spacing.sm }}>
                    <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.payModalTitle}>Oda Seçin</Text>
                </View>

                <ScrollView style={{ maxHeight: 400 }}>
                  {checkedInRooms.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: colors.textSecondary, paddingVertical: spacing.lg }}>
                      Aktif konaklama yok
                    </Text>
                  ) : (
                    checkedInRooms.map((res) => (
                      <TouchableOpacity
                        key={res.id}
                        style={styles.roomOption}
                        onPress={() => handlePay('room_charge', res.roomId)}
                      >
                        <Text style={styles.roomNumber}>{res.roomNumber}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.roomGuest}>{res.guestNames || 'Misafir'}</Text>
                          <Text style={{ fontSize: fontSize.xs, color: colors.textSecondary }}>
                            Oda {res.roomNumber}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>

                <TouchableOpacity style={styles.payCancel} onPress={() => setPaymentVisible(false)}>
                  <Text style={styles.payCancelText}>İptal</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  totalBadge: { backgroundColor: colors.primary, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  totalText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  content: { flex: 1, padding: spacing.md },
  section: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  /* Adisyon kalemleri */
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.xs },
  qtyBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  qtyText: { fontSize: fontSize.md, fontWeight: '700', minWidth: 20, textAlign: 'center', color: colors.textPrimary },
  itemName: { flex: 1, fontSize: fontSize.md, color: colors.textPrimary },
  itemPrice: { fontSize: fontSize.md, fontWeight: '600', color: colors.primary, marginRight: spacing.xs },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 2, borderTopColor: colors.border,
  },
  totalLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  totalValue: { fontSize: fontSize.xl, fontWeight: '800', color: colors.primary },
  /* Menü */
  catBar: { maxHeight: 40, marginBottom: spacing.sm },
  catChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  catChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  catChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  catChipTextActive: { color: '#fff' },
  menuItemRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  menuItemName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  menuItemPrice: { fontSize: fontSize.sm, color: colors.primary, fontWeight: '600', marginTop: 2 },
  addBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  /* Alt butonlar */
  bottomBar: {
    flexDirection: 'row', gap: spacing.sm,
    padding: spacing.md, backgroundColor: colors.surface,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  payBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.xs, paddingVertical: spacing.sm + 2, borderRadius: borderRadius.md,
  },
  payBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  /* Ödeme modal */
  payOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
    padding: spacing.lg, zIndex: 100,
  },
  payModal: {
    backgroundColor: colors.surface, borderRadius: borderRadius.lg,
    padding: spacing.lg, width: '100%', maxWidth: 380,
  },
  payModalTitle: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  payModalAmount: {
    fontSize: 32, fontWeight: '800', color: colors.primary,
    textAlign: 'center', marginVertical: spacing.md,
  },
  payOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  payOptionTitle: { fontSize: fontSize.lg, fontWeight: '600', color: colors.textPrimary },
  payOptionDesc: { fontSize: fontSize.sm, color: colors.textSecondary },
  payCancel: {
    alignItems: 'center', paddingVertical: spacing.sm, marginTop: spacing.xs,
  },
  payCancelText: { fontSize: fontSize.md, color: colors.textSecondary, fontWeight: '600' },
  roomOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  roomNumber: {
    fontSize: fontSize.xxl, fontWeight: '800', color: colors.primary,
    minWidth: 50, textAlign: 'center',
  },
  roomGuest: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
});

export default TableDetailScreen;
