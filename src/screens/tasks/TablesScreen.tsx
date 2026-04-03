/**
 * TablesScreen — Masa Yönetimi (Mobil)
 *
 * Masalar box grid. Masaya tıkla → direkt TableDetailScreen açılır.
 * "Masa aç" dialog'u YOK — ilk ürün eklendiğinde tab otomatik oluşur.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { LoadingState, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { TABLE_STATUS_COLORS } from '../../utils/constants';
import { tablesApi, serviceAreasApi } from '../../services/api';
import type { ApiTable, ApiServiceArea } from '../../utils/types';
import useRestaurantWebSocket from '../../hooks/useRestaurantWebSocket';

import TableDetailScreen from './TableDetailScreen';

interface Props {
  onClose: () => void;
}

const TablesScreen: React.FC<Props> = ({ onClose }) => {
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
