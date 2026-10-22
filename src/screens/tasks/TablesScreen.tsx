/**
 * TablesScreen — Masa Yönetimi (Mobil)
 *
 * Masalar box grid. Masaya tıkla → direkt TableDetailScreen açılır.
 * "Masa aç" dialog'u YOK — ilk ürün eklendiğinde tab otomatik oluşur.
 * Yönetici / restoran müdürü sağ üstteki + ile hizmet alanı ve masa ekler
 * (web Masa Yönetimi ile aynı; backend CanManageRestaurant).
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoadingState, EmptyState, AppInput, AppButton } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { TABLE_STATUS_COLORS } from '../../utils/constants';
import { tablesApi, serviceAreasApi } from '../../services/api';
import type { ApiTable, ApiServiceArea } from '../../utils/types';
import useRestaurantWebSocket from '../../hooks/useRestaurantWebSocket';
import useAuth from '../../hooks/useAuth';
import { ROLES } from '../../utils/constants';
import { hasAnyRole, ADMIN_ROLES } from '../../utils/permissions';

import TableDetailScreen from './TableDetailScreen';

interface Props {
  onClose: () => void;
}

/** Backend ServiceArea.AREA_TYPE_CHOICES */
const AREA_TYPES: { value: string; label: string }[] = [
  { value: 'restaurant', label: 'Restoran' },
  { value: 'cafe', label: 'Kafe' },
  { value: 'bar', label: 'Bar' },
  { value: 'pool_bar', label: 'Havuz Bar' },
  { value: 'room_service', label: 'Oda Servisi' },
];

const TablesScreen: React.FC<Props> = ({ onClose }) => {
  const { user } = useAuth();
  const canManageTables = hasAnyRole(user, [...ADMIN_ROLES, ROLES.RESTAURANT_MANAGER]);
  const [createMode, setCreateMode] = useState<'table' | 'area' | null>(null);
  const [form, setForm] = useState({ tableNumber: '', capacity: '4', areaId: null as number | null, areaName: '', areaType: 'restaurant' });
  const [creating, setCreating] = useState(false);
  const [tables, setTables] = useState<ApiTable[]>([]);
  const [serviceAreas, setServiceAreas] = useState<ApiServiceArea[]>([]);
  const [selectedArea, setSelectedArea] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTable, setSelectedTable] = useState<ApiTable | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      const filters: { serviceAreaId?: number } = {};
      if (selectedArea) filters.serviceAreaId = selectedArea;
      setTables(await tablesApi.getAll(filters));
    } catch (err) { console.error(err); }
    finally { setLoading(false); setRefreshing(false); }
  }, [selectedArea]);

  useEffect(() => { fetchTables(); }, [fetchTables]);
  useEffect(() => { serviceAreasApi.getAll().then(setServiceAreas).catch(console.error); }, []);

  useRestaurantWebSocket({
    groups: ['tables'],
    onTableUpdate: (t) => setTables(prev => prev.map(x => x.id === t.id ? t : x)),
  });

  if (selectedTable) {
    return (
      <TableDetailScreen
        table={selectedTable}
        onClose={() => { setSelectedTable(null); fetchTables(); }}
        onUpdate={fetchTables}
      />
    );
  }

  const openCreate = () => {
    Alert.alert('Ekle', undefined, [
      {
        text: 'Masa Ekle',
        onPress: () => {
          if (serviceAreas.length === 0) {
            Alert.alert('Hizmet Alanı Yok', 'Önce bir hizmet alanı (ör. Restoran) ekleyin.');
            return;
          }
          setForm((p) => ({ ...p, tableNumber: '', capacity: '4', areaId: selectedArea ?? serviceAreas[0].id }));
          setCreateMode('table');
        },
      },
      { text: 'Hizmet Alanı Ekle', onPress: () => { setForm((p) => ({ ...p, areaName: '', areaType: 'restaurant' })); setCreateMode('area'); } },
      { text: 'Vazgeç', style: 'cancel' },
    ]);
  };

  const submitCreate = async () => {
    setCreating(true);
    try {
      if (createMode === 'table') {
        const capacity = parseInt(form.capacity, 10);
        if (!form.tableNumber.trim()) { Alert.alert('Uyarı', 'Masa numarası zorunlu.'); return; }
        if (!form.areaId) { Alert.alert('Uyarı', 'Hizmet alanı seçin.'); return; }
        if (!Number.isInteger(capacity) || capacity < 1) { Alert.alert('Uyarı', 'Kapasite en az 1 olmalı.'); return; }
        await tablesApi.create({ tableNumber: form.tableNumber.trim(), serviceAreaId: form.areaId, capacity });
      } else {
        if (!form.areaName.trim()) { Alert.alert('Uyarı', 'Alan adı zorunlu.'); return; }
        await serviceAreasApi.create({ name: form.areaName.trim(), areaType: form.areaType });
        setServiceAreas(await serviceAreasApi.getAll());
      }
      setCreateMode(null);
      fetchTables();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Kaydedilemedi');
    } finally {
      setCreating(false);
    }
  };

  if (loading) return <LoadingState message="Masalar yükleniyor..." />;

  const emptyCount = tables.filter(t => t.status === 'empty').length;
  const occupiedCount = tables.filter(t => t.status === 'occupied').length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Masalar</Text>
          <Text style={styles.subtitle}>{emptyCount} boş · {occupiedCount} dolu</Text>
        </View>
        {canManageTables && (
          <TouchableOpacity onPress={openCreate} style={{ padding: spacing.xs }}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Alan filtresi */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        <TouchableOpacity
          style={[styles.filterChip, !selectedArea && styles.filterChipActive]}
          onPress={() => setSelectedArea(null)}
        >
          <Text style={[styles.filterChipText, !selectedArea && styles.filterChipTextActive]}>Tümü</Text>
        </TouchableOpacity>
        {serviceAreas.map(area => (
          <TouchableOpacity
            key={area.id}
            style={[styles.filterChip, selectedArea === area.id && styles.filterChipActive]}
            onPress={() => setSelectedArea(area.id)}
          >
            <Text style={[styles.filterChipText, selectedArea === area.id && styles.filterChipTextActive]}>{area.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Masa Grid */}
      <ScrollView
        contentContainerStyle={styles.grid}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTables(); }} />}
      >
        {tables.length === 0 ? (
          <EmptyState icon="grid-outline" title="Masa Yok" description="Henüz masa tanımlanmamış" />
        ) : (
          tables.map(table => {
            const statusColor = TABLE_STATUS_COLORS[table.status] || '#94a3b8';
            return (
              <TouchableOpacity
                key={table.id}
                style={[styles.tableCard, { borderTopColor: statusColor }]}
                activeOpacity={0.7}
                onPress={() => setSelectedTable(table)}
              >
                <Text style={styles.tableNumber}>{table.tableNumber}</Text>
                {table.status === 'occupied' ? (
                  <Text style={styles.tableTotal}>{parseFloat(table.currentTotal).toFixed(2)} ₺</Text>
                ) : (
                  <Text style={styles.emptyLabel}>Boş</Text>
                )}
                <Text style={styles.tableArea}>{table.serviceAreaName}</Text>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!createMode} animationType="fade" transparent onRequestClose={() => setCreateMode(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>{createMode === 'table' ? 'Masa Ekle' : 'Hizmet Alanı Ekle'}</Text>
            {createMode === 'table' ? (
              <>
                <AppInput label="Masa No" value={form.tableNumber} onChangeText={(v) => setForm((p) => ({ ...p, tableNumber: v }))} />
                <AppInput label="Kapasite" value={form.capacity} onChangeText={(v) => setForm((p) => ({ ...p, capacity: v.replace(/[^0-9]/g, '') }))} keyboardType="number-pad" />
                <Text style={styles.modalLabel}>Hizmet Alanı</Text>
                <View style={styles.optionWrap}>
                  {serviceAreas.map((a) => (
                    <TouchableOpacity key={a.id} style={[styles.filterChip, form.areaId === a.id && styles.filterChipActive]} onPress={() => setForm((p) => ({ ...p, areaId: a.id }))}>
                      <Text style={[styles.filterChipText, form.areaId === a.id && styles.filterChipTextActive]}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <>
                <AppInput label="Alan Adı" value={form.areaName} onChangeText={(v) => setForm((p) => ({ ...p, areaName: v }))} placeholder="Ör. Teras" />
                <Text style={styles.modalLabel}>Tür</Text>
                <View style={styles.optionWrap}>
                  {AREA_TYPES.map((t) => (
                    <TouchableOpacity key={t.value} style={[styles.filterChip, form.areaType === t.value && styles.filterChipActive]} onPress={() => setForm((p) => ({ ...p, areaType: t.value }))}>
                      <Text style={[styles.filterChipText, form.areaType === t.value && styles.filterChipTextActive]}>{t.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.modalHint}>Alan için otomatik bir kasa da oluşturulur.</Text>
              </>
            )}
            <View style={styles.modalActions}>
              <AppButton title="Vazgeç" variant="outline" onPress={() => setCreateMode(null)} disabled={creating} style={{ flex: 1 }} />
              <AppButton title="Kaydet" onPress={submitCreate} loading={creating} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  modalLabel: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6 },
  modalHint: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: spacing.sm },
  optionWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backButton: { marginRight: spacing.sm, padding: spacing.xs },
  title: { fontSize: fontSize.xl, fontWeight: '700', color: colors.textPrimary },
  subtitle: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  filterBar: { maxHeight: 48, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, backgroundColor: colors.surface },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.xs,
    borderRadius: borderRadius.full, backgroundColor: colors.card,
    marginRight: spacing.xs, borderWidth: 1, borderColor: colors.border,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterChipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '600' },
  filterChipTextActive: { color: '#fff' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm },
  tableCard: {
    width: '31%', margin: '1.16%', backgroundColor: colors.card,
    borderRadius: borderRadius.md, padding: spacing.sm, alignItems: 'center',
    borderTopWidth: 4, elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 2,
  },
  tableNumber: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary },
  tableTotal: { fontSize: fontSize.lg, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
  emptyLabel: { fontSize: fontSize.sm, color: colors.textDisabled, marginTop: spacing.xs },
  tableArea: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
});

export default TablesScreen;
