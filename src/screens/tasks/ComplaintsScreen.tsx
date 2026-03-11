/**
 * ComplaintsScreen - Şikayetler & Öneriler
 *
 * Müşteriler odalardaki QR menüden şikayet/öneri gönderir.
 * Patron ve müdür bu ekrandan görüntüler ve yönetir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, EmptyState } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  COMPLAINT_STATUS,
  COMPLAINT_STATUS_LABELS,
  COMPLAINT_STATUS_COLORS,
} from '../../utils/constants';

interface Complaint {
  id: number;
  roomNumber: string;
  guestName: string;
  description: string;
  type: 'complaint' | 'suggestion';
  status: string;
  createdAt: string;
}

interface ComplaintsScreenProps {
  onClose: () => void;
}

interface FilterOption {
  value: string;
  label: string;
}

const FILTERS: FilterOption[] = [
  { value: 'all', label: 'Tümü' },
  { value: COMPLAINT_STATUS.NEW, label: 'Yeni' },
  { value: COMPLAINT_STATUS.READ, label: 'Okundu' },
  { value: COMPLAINT_STATUS.RESOLVED, label: 'Çözüldü' },
];

const TYPE_FILTERS: FilterOption[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'complaint', label: 'Şikayetler' },
  { value: 'suggestion', label: 'Öneriler' },
];

/** Mock şikayet verileri - QR menüden gelen */
const INITIAL_COMPLAINTS: Complaint[] = [
  {
    id: 1,
    roomNumber: '102',
    guestName: 'Ali Yılmaz',
    description: 'Odadaki klima çalışmıyor, çok sıcak. Lütfen en kısa sürede ilgilenin.',
    type: 'complaint',
    status: COMPLAINT_STATUS.NEW,
    createdAt: '2026-03-11T09:30:00',
  },
  {
    id: 2,
    roomNumber: '202',
    guestName: 'Ayşe Demir',
    description: 'Kahvaltıda vegan seçenekler eklenirse çok memnun olurum.',
    type: 'suggestion',
    status: COMPLAINT_STATUS.NEW,
    createdAt: '2026-03-11T08:15:00',
  },
  {
    id: 3,
    roomNumber: '301',
    guestName: 'Anonim',
    description: 'Banyodaki sıcak su gece 23:00\'dan sonra gelmiyor.',
    type: 'complaint',
    status: COMPLAINT_STATUS.READ,
    createdAt: '2026-03-10T22:45:00',
  },
  {
    id: 4,
    roomNumber: '401',
    guestName: 'Mehmet Kaya',
    description: 'Havuz saatleri uzatılabilir mi? Akşam 20:00 erken kapanıyor.',
    type: 'suggestion',
    status: COMPLAINT_STATUS.READ,
    createdAt: '2026-03-10T18:00:00',
  },
  {
    id: 5,
    roomNumber: '103',
    guestName: 'Anonim',
    description: 'Koridordaki gürültü geceleri rahatsız ediyor.',
    type: 'complaint',
    status: COMPLAINT_STATUS.RESOLVED,
    createdAt: '2026-03-09T23:30:00',
  },
];

const ComplaintsScreen: React.FC<ComplaintsScreenProps> = ({ onClose }) => {
  const [complaints, setComplaints] = useState<Complaint[]>(INITIAL_COMPLAINTS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filteredComplaints = complaints
    .filter((c) => statusFilter === 'all' || c.status === statusFilter)
    .filter((c) => typeFilter === 'all' || c.type === typeFilter);

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleMarkRead = (id: number) => {
    setComplaints((prev) =>
      prev.map((c) =>
        c.id === id && c.status === COMPLAINT_STATUS.NEW
          ? { ...c, status: COMPLAINT_STATUS.READ }
          : c
      )
    );
  };

  const handleResolve = (id: number) => {
    Alert.alert(
      'Çözüldü Olarak İşaretle',
      'Bu şikayet/öneri çözüldü olarak işaretlensin mi?',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Çözüldü',
          onPress: () => {
            setComplaints((prev) =>
              prev.map((c) =>
                c.id === id ? { ...c, status: COMPLAINT_STATUS.RESOLVED } : c
              )
            );
          },
        },
      ]
    );
  };

  /* Özet sayılar */
  const summary = {
    total: complaints.length,
    newCount: complaints.filter((c) => c.status === COMPLAINT_STATUS.NEW).length,
    complaints: complaints.filter((c) => c.type === 'complaint').length,
    suggestions: complaints.filter((c) => c.type === 'suggestion').length,
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Şikayetler & Öneriler</Text>
        <View style={{ width: 28 }} />
      </View>

      {/* Özet */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryBox, { backgroundColor: '#EF444420' }]}>
          <Text style={[styles.summaryNum, { color: '#EF4444' }]}>{summary.newCount}</Text>
          <Text style={styles.summaryLabel}>Yeni</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#F59E0B20' }]}>
          <Text style={[styles.summaryNum, { color: '#F59E0B' }]}>{summary.complaints}</Text>
          <Text style={styles.summaryLabel}>Şikayet</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#3B82F620' }]}>
          <Text style={[styles.summaryNum, { color: '#3B82F6' }]}>{summary.suggestions}</Text>
          <Text style={styles.summaryLabel}>Öneri</Text>
        </View>
        <View style={[styles.summaryBox, { backgroundColor: '#22C55E20' }]}>
          <Text style={[styles.summaryNum, { color: '#22C55E' }]}>{summary.total}</Text>
          <Text style={styles.summaryLabel}>Toplam</Text>
        </View>
      </View>

      {/* Tür Filtresi */}
      <View style={styles.filterRow}>
        {TYPE_FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, typeFilter === f.value && styles.filterChipActive]}
            onPress={() => setTypeFilter(f.value)}
          >
            <Text style={[styles.filterText, typeFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Durum Filtresi */}
      <View style={[styles.filterRow, { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, statusFilter === f.value && styles.filterChipActive]}
            onPress={() => setStatusFilter(f.value)}
          >
            <Text style={[styles.filterText, statusFilter === f.value && styles.filterTextActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Şikayet Listesi */}
      <FlatList
        data={filteredComplaints}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState icon="chatbubbles-outline" title="Şikayet/Öneri bulunamadı" />
        }
        renderItem={({ item }) => (
          <AppCard
            style={[
              styles.complaintCard,
              item.status === COMPLAINT_STATUS.NEW && styles.newCard,
            ]}
            onPress={() => handleMarkRead(item.id)}
          >
            {/* Üst kısım: Oda + Tür + Durum */}
            <View style={styles.cardTop}>
              <View style={styles.leftBadges}>
                <View style={styles.roomBadge}>
                  <Ionicons name="bed-outline" size={14} color={colors.primary} />
                  <Text style={styles.roomText}>Oda {item.roomNumber}</Text>
                </View>
                <View style={[styles.typeBadge, {
                  backgroundColor: item.type === 'complaint' ? '#EF444415' : '#3B82F615',
                }]}>
                  <Ionicons
                    name={item.type === 'complaint' ? 'alert-circle' : 'bulb-outline'}
                    size={12}
                    color={item.type === 'complaint' ? '#EF4444' : '#3B82F6'}
                  />
                  <Text style={[styles.typeText, {
                    color: item.type === 'complaint' ? '#EF4444' : '#3B82F6',
                  }]}>
                    {item.type === 'complaint' ? 'Şikayet' : 'Öneri'}
                  </Text>
                </View>
              </View>
              <StatusChip
                label={COMPLAINT_STATUS_LABELS[item.status]}
                color={COMPLAINT_STATUS_COLORS[item.status]}
              />
            </View>

            {/* Açıklama */}
            <Text style={styles.description} numberOfLines={3}>
              {item.description}
            </Text>

            {/* Alt kısım: Misafir + Tarih */}
            <View style={styles.metaRow}>
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={12} color={colors.textDisabled} />
                <Text style={styles.metaText}>{item.guestName}</Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="time-outline" size={12} color={colors.textDisabled} />
                <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
              </View>
            </View>

            {/* Aksiyon Butonları */}
            {item.status !== COMPLAINT_STATUS.RESOLVED && (
              <View style={styles.actionRow}>
                {item.status === COMPLAINT_STATUS.NEW && (
                  <TouchableOpacity
                    style={[styles.actionBtn, { borderColor: '#F59E0B' }]}
                    onPress={() => handleMarkRead(item.id)}
                  >
                    <Ionicons name="eye-outline" size={14} color="#F59E0B" />
                    <Text style={[styles.actionText, { color: '#F59E0B' }]}>Okundu</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.actionBtn, { borderColor: colors.success }]}
                  onPress={() => handleResolve(item.id)}
                >
                  <Ionicons name="checkmark-circle-outline" size={14} color={colors.success} />
                  <Text style={[styles.actionText, { color: colors.success }]}>Çözüldü</Text>
                </TouchableOpacity>
              </View>
            )}
          </AppCard>
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
  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 6,
    backgroundColor: colors.surface,
  },
  summaryBox: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  summaryNum: {
    fontSize: fontSize.lg,
    fontWeight: '800',
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: 6,
    backgroundColor: colors.surface,
    flexWrap: 'wrap',
  },
  filterChip: {
    paddingHorizontal: 10,
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
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  complaintCard: {
    marginBottom: spacing.sm,
  },
  newCard: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  leftBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  roomText: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    color: colors.primary,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  typeText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  description: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
    lineHeight: 20,
    marginBottom: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  actionText: {
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
});

export default ComplaintsScreen;
