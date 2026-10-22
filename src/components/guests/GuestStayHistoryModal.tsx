/**
 * GuestStayHistoryModal - Misafirin Konaklama Geçmişi
 *
 * Misafirin kaldığı tüm rezervasyonlar: oda, tarih, firma, tutar / ödenen.
 * Tutarlar backend'de folio kalemlerinden anlık hesaplanır.
 * Web karşılığı: components/rooms/roomdetail/StayHistoryDialog.tsx
 *
 * API: guestsApi.stayHistory(guestId) → GET /api/guests/{id}/stay_history/
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from '../../utils/constants';
import { guestsApi } from '../../services/api';
import type { Reservation } from '../../utils/types';

interface GuestStayHistoryModalProps {
  visible: boolean;
  guestId: number | null;
  guestName: string;
  onClose: () => void;
}

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const formatMoney = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const GuestStayHistoryModal: React.FC<GuestStayHistoryModalProps> = ({ visible, guestId, guestName, onClose }) => {
  const [items, setItems] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !guestId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    guestsApi.stayHistory(guestId)
      .then((data) => {
        if (cancelled) return;
        setItems([...data].sort((a, b) => (b.checkIn || '').localeCompare(a.checkIn || '')));
      })
      .catch((err: Error) => { if (!cancelled) setError(err.message || 'Geçmiş yüklenemedi'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [visible, guestId]);

  const renderItem = ({ item }: { item: Reservation }) => {
    const statusColor = RESERVATION_STATUS_COLORS[item.status] || colors.textSecondary;
    const balance = Number(item.totalAmount || 0) - Number(item.paidAmount || 0);
    return (
      <View style={styles.item}>
        <View style={styles.itemTop}>
          <Text style={styles.roomText}>Oda {item.roomNumber}</Text>
          <View style={[styles.badge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.badgeText, { color: statusColor }]}>
              {RESERVATION_STATUS_LABELS[item.status] || item.status}
            </Text>
          </View>
        </View>
        <Text style={styles.dateText}>{formatDate(item.checkIn)} → {formatDate(item.checkOut)}</Text>
        {!!item.companyName && <Text style={styles.metaText}>Firma: {item.companyName}</Text>}
        <View style={styles.amountRow}>
          <Text style={styles.metaText}>Tutar: {formatMoney(item.totalAmount)}</Text>
          <Text style={styles.metaText}>Ödenen: {formatMoney(item.paidAmount)}</Text>
          {balance > 0 && <Text style={[styles.metaText, { color: colors.error, fontWeight: '700' }]}>Bakiye: {formatMoney(balance)}</Text>}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title} numberOfLines={1}>Konaklama Geçmişi — {guestName}</Text>
            <View style={{ width: 24 }} />
          </View>

          {loading ? (
            <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
          ) : error ? (
            <Text style={[styles.emptyText, { color: colors.error }]}>{error}</Text>
          ) : (
            <FlatList
              data={items}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              contentContainerStyle={styles.list}
              ListEmptyComponent={<Text style={styles.emptyText}>Konaklama kaydı bulunamadı</Text>}
            />
          )}
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    minHeight: '50%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  list: { padding: spacing.md, paddingBottom: spacing.xxl },
  item: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  roomText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  dateText: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  metaText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  amountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: 4 },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.xl, fontSize: fontSize.sm },
});

export default GuestStayHistoryModal;
