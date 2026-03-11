/**
 * FaultDetailView - Arıza Detay Görünümü
 *
 * Arıza listesinden seçilen arızanın detaylarını gösterir.
 * Durum değiştirme ve çözüm fotoğrafı ekleme işlevleri sunar.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, StatusChip } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  FAULT_STATUS,
  FAULT_STATUS_LABELS,
  FAULT_STATUS_COLORS,
  FAULT_CATEGORIES,
} from '../../utils/constants';

export interface Fault {
  id: number;
  roomNumber: string;
  category: string;
  description: string;
  status: string;
  reportedBy: string;
  createdAt: string;
  photos: string[];
  resolutionPhotos: string[];
}

interface FaultDetailViewProps {
  fault: Fault;
  onClose: () => void;
  onUpdateStatus: (id: number, status: string) => void;
  onResolve: (id: number) => void;
}

const FaultDetailView: React.FC<FaultDetailViewProps> = ({
  fault,
  onClose,
  onUpdateStatus,
  onResolve,
}) => {
  const getCategoryLabel = (value: string): string => {
    const cat = FAULT_CATEGORIES.find((c) => c.value === value);
    return cat ? cat.label : value;
  };

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Arıza Detayı</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Oda + Durum */}
        <View style={styles.statusRow}>
          <View style={styles.roomBadge}>
            <Ionicons name="bed-outline" size={16} color={colors.primary} />
            <Text style={styles.roomText}>Oda {fault.roomNumber}</Text>
          </View>
          <StatusChip
            label={FAULT_STATUS_LABELS[fault.status]}
            color={FAULT_STATUS_COLORS[fault.status]}
          />
        </View>

        {/* Bilgi Kartı */}
        <AppCard style={styles.infoCard}>
          <View style={styles.categoryRow}>
            <Ionicons name="construct-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.categoryLabel}>{getCategoryLabel(fault.category)}</Text>
          </View>

          <Text style={styles.description}>{fault.description}</Text>

          <View style={styles.divider} />

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="person-outline" size={14} color={colors.textDisabled} />
              <Text style={styles.metaText}>{fault.reportedBy}</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textDisabled} />
              <Text style={styles.metaText}>{formatDate(fault.createdAt)}</Text>
            </View>
          </View>
        </AppCard>

        {/* Arıza Fotoğrafları */}
        {fault.photos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Arıza Fotoğrafları</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {fault.photos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photo} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Çözüm Fotoğrafları */}
        {fault.resolutionPhotos.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Çözüm Fotoğrafları</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.photoRow}>
                {fault.resolutionPhotos.map((uri, i) => (
                  <Image key={i} source={{ uri }} style={styles.photo} />
                ))}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Durum Zaman Çizelgesi */}
        <AppCard style={styles.timelineCard}>
          <Text style={styles.sectionTitle}>Durum</Text>
          <View style={styles.timelineRow}>
            <View style={[styles.timelineDot, { backgroundColor: FAULT_STATUS_COLORS[FAULT_STATUS.OPEN] }]} />
            <Text style={styles.timelineText}>Açıldı — {formatDate(fault.createdAt)}</Text>
          </View>
          {(fault.status === FAULT_STATUS.IN_PROGRESS || fault.status === FAULT_STATUS.RESOLVED) && (
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: FAULT_STATUS_COLORS[FAULT_STATUS.IN_PROGRESS] }]} />
              <Text style={styles.timelineText}>İşleme alındı</Text>
            </View>
          )}
          {fault.status === FAULT_STATUS.RESOLVED && (
            <View style={styles.timelineRow}>
              <View style={[styles.timelineDot, { backgroundColor: FAULT_STATUS_COLORS[FAULT_STATUS.RESOLVED] }]} />
              <Text style={styles.timelineText}>Çözüldü</Text>
            </View>
          )}
        </AppCard>
      </ScrollView>

      {/* Aksiyon Butonları */}
      {fault.status !== FAULT_STATUS.RESOLVED && (
        <View style={styles.actionBar}>
          {fault.status === FAULT_STATUS.OPEN && (
            <AppButton
              title="İşleme Al"
              variant="outline"
              icon="play-outline"
              onPress={() => onUpdateStatus(fault.id, FAULT_STATUS.IN_PROGRESS)}
              style={styles.actionButton}
            />
          )}
          <AppButton
            title="Çözüldü"
            icon="checkmark-circle-outline"
            onPress={() => onResolve(fault.id)}
            style={styles.actionButton}
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 10,
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
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  roomBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },
  roomText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.primary,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: spacing.sm,
  },
  categoryLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    lineHeight: 24,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  metaRow: {
    gap: spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
  },
  section: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
    gap: 10,
  },
  photo: {
    width: 150,
    height: 150,
    borderRadius: borderRadius.md,
    backgroundColor: colors.divider,
  },
  timelineCard: {
    marginBottom: spacing.md,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: spacing.sm,
  },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  timelineText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  actionBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    paddingBottom: 34,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  actionButton: {
    flex: 1,
  },
});

export default FaultDetailView;
