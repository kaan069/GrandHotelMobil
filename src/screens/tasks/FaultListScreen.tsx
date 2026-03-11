/**
 * FaultListScreen - Arıza Listesi Ekranı
 *
 * Teknik personel ve patron/müdür için arıza takibi.
 * Arızalar durumlarına göre listelenir.
 * Teknik personel arıza çözüm fotoğrafı ekleyerek kapatabilir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppCard, StatusChip, EmptyState } from '../../components/common';
import FaultDetailView from '../../components/tasks/FaultDetailView';
import type { Fault } from '../../components/tasks/FaultDetailView';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { FAULT_STATUS, FAULT_STATUS_LABELS, FAULT_STATUS_COLORS, FAULT_CATEGORIES } from '../../utils/constants';

interface FaultListScreenProps {
  onClose: () => void;
}

interface FilterOption {
  value: string;
  label: string;
}

/** Mock arıza verileri */
const INITIAL_FAULTS: Fault[] = [
  {
    id: 1,
    roomNumber: '201',
    category: 'electric',
    description: 'Yatak odası lambası çalışmıyor. Ampul değiştirilmeli.',
    status: FAULT_STATUS.OPEN,
    reportedBy: 'Ayşe Kaya',
    createdAt: '2026-03-11T09:30:00',
    photos: [],
    resolutionPhotos: [],
  },
  {
    id: 2,
    roomNumber: '305',
    category: 'plumbing',
    description: 'Lavabo tıkanmış, su akışı çok yavaş.',
    status: FAULT_STATUS.IN_PROGRESS,
    reportedBy: 'Fatma Çelik',
    createdAt: '2026-03-10T14:00:00',
    photos: [],
    resolutionPhotos: [],
  },
  {
    id: 3,
    roomNumber: '102',
    category: 'aircon',
    description: 'Klima soğutmuyor, sadece fan çalışıyor.',
    status: FAULT_STATUS.RESOLVED,
    reportedBy: 'Ali Öztürk',
    createdAt: '2026-03-09T11:00:00',
    photos: [],
    resolutionPhotos: [],
  },
];

const FaultListScreen: React.FC<FaultListScreenProps> = ({ onClose }) => {
  const [faults, setFaults] = useState<Fault[]>(INITIAL_FAULTS);
  const [filter, setFilter] = useState('all');
  const [selectedFault, setSelectedFault] = useState<Fault | null>(null);

  /** Kategori adı */
  const getCategoryLabel = (value: string): string => {
    const cat = FAULT_CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  /** Tarih formatla */
  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  /** Arıza durumunu güncelle */
  const updateStatus = (id: number, newStatus: string) => {
    setFaults((prev) =>
      prev.map((f) => (f.id === id ? { ...f, status: newStatus } : f))
    );
    setSelectedFault((prev) =>
      prev && prev.id === id ? { ...prev, status: newStatus } : prev
    );
  };

  /** Çözüm fotoğrafı ekle ve arızayı kapat */
  const handleResolve = async (faultId: number) => {
    Alert.alert('Arıza Çözümü', 'Çözüm fotoğrafı eklemek ister misiniz?', [
      {
        text: 'Fotoğraf Ekle',
        onPress: async () => {
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled) {
            const photoUri = result.assets[0].uri;
            setFaults((prev) =>
              prev.map((f) =>
                f.id === faultId
                  ? {
                      ...f,
                      status: FAULT_STATUS.RESOLVED,
                      resolutionPhotos: [...f.resolutionPhotos, photoUri],
                    }
                  : f
              )
            );
            setSelectedFault((prev) =>
              prev && prev.id === faultId
                ? { ...prev, status: FAULT_STATUS.RESOLVED, resolutionPhotos: [...prev.resolutionPhotos, photoUri] }
                : prev
            );
            Alert.alert('Başarılı', 'Arıza çözüldü olarak işaretlendi');
          }
        },
      },
      {
        text: 'Fotoğrafsız Kapat',
        onPress: () => {
          updateStatus(faultId, FAULT_STATUS.RESOLVED);
          Alert.alert('Başarılı', 'Arıza çözüldü olarak işaretlendi');
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  /* Filtrelenmiş arızalar */
  const filteredFaults = filter === 'all'
    ? faults
    : faults.filter((f) => f.status === filter);

  /** Filtre butonları */
  const FILTERS: FilterOption[] = [
    { value: 'all', label: 'Tümü' },
    { value: FAULT_STATUS.OPEN, label: 'Açık' },
    { value: FAULT_STATUS.IN_PROGRESS, label: 'İşlemde' },
    { value: FAULT_STATUS.RESOLVED, label: 'Çözüldü' },
  ];

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Arıza Listesi</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Filtreler */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
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

      {/* Arıza listesi */}
      <FlatList
        data={filteredFaults}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="construct-outline" title="Arıza bulunamadı" />
        }
        renderItem={({ item }) => (
          <AppCard style={styles.faultCard} onPress={() => setSelectedFault(item)}>
            {/* Üst satır: Oda no + Durum */}
            <View style={styles.faultTop}>
              <View style={styles.roomBadge}>
                <Text style={styles.roomText}>Oda {item.roomNumber}</Text>
              </View>
              <StatusChip
                label={FAULT_STATUS_LABELS[item.status]}
                color={FAULT_STATUS_COLORS[item.status]}
              />
            </View>

            {/* Kategori */}
            <Text style={styles.faultCategory}>{getCategoryLabel(item.category)}</Text>

            {/* Açıklama */}
            <Text style={styles.faultDesc}>{item.description}</Text>

            {/* Alt bilgi */}
            <View style={styles.faultBottom}>
              <Text style={styles.faultMeta}>
                {item.reportedBy} · {formatDate(item.createdAt)}
              </Text>

              {/* Çözüm fotoğrafları */}
              {item.resolutionPhotos.length > 0 && (
                <View style={styles.resPhotos}>
                  {item.resolutionPhotos.map((uri, i) => (
                    <Image key={i} source={{ uri }} style={styles.resPhoto} />
                  ))}
                </View>
              )}

              {/* Aksiyon butonları */}
              {item.status !== FAULT_STATUS.RESOLVED && (
                <View style={styles.faultActions}>
                  {item.status === FAULT_STATUS.OPEN && (
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => updateStatus(item.id, FAULT_STATUS.IN_PROGRESS)}
                    >
                      <Ionicons name="play-outline" size={16} color={colors.info} />
                      <Text style={[styles.actionText, { color: colors.info }]}>İşleme Al</Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleResolve(item.id)}
                  >
                    <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                    <Text style={[styles.actionText, { color: colors.success }]}>Çözüldü</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </AppCard>
        )}
      />

      {/* Arıza Detay Overlay */}
      {selectedFault && (
        <FaultDetailView
          fault={selectedFault}
          onClose={() => setSelectedFault(null)}
          onUpdateStatus={updateStatus}
          onResolve={handleResolve}
        />
      )}
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
    gap: 8,
    backgroundColor: colors.surface,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: borderRadius.full,
    backgroundColor: colors.divider,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterTextActive: {
    color: colors.textWhite,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  faultCard: {
    marginBottom: spacing.sm,
  },
  faultTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  roomBadge: {
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  roomText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  faultCategory: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  faultDesc: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 22,
  },
  faultBottom: {
    marginTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  faultMeta: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  resPhotos: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.sm,
  },
  resPhoto: {
    width: 60,
    height: 60,
    borderRadius: borderRadius.sm,
  },
  faultActions: {
    flexDirection: 'row',
    gap: 16,
    marginTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  actionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
});

export default FaultListScreen;
