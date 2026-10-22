/**
 * RoomKbsCard - Oda KBS (Kimlik Bildirim Sistemi) Durumu
 *
 * Açılınca odanın KBS kayıtlarını yükler; dolu odada "KBS Gönder" ile
 * check-in yapmış misafirler bildirilir (zaten bildirilenler tekrar gönderilmez).
 * Sadece otelde 'kbs' modülü açıksa ve ön büro rolündeyse gösterilir.
 * Web karşılığı: components/rooms/roomdetail/KbsSection.tsx
 *
 * API: kbsApi.getRecords({ roomId }) / kbsApi.send(roomId)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { kbsApi, ApiKbsRecord, ApiKbsResult } from '../../services/api';

interface RoomKbsCardProps {
  roomId: number;
  isOccupied: boolean;
}

const RoomKbsCard: React.FC<RoomKbsCardProps> = ({ roomId, isOccupied }) => {
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [records, setRecords] = useState<ApiKbsRecord[]>([]);
  const [results, setResults] = useState<ApiKbsResult[] | null>(null);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      setRecords(await kbsApi.getRecords({ roomId }));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'KBS kayıtları yüklenemedi');
    } finally {
      setLoading(false);
      setFetched(true);
    }
  };

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched) fetchRecords();
  };

  const handleSend = async () => {
    setSending(true);
    setResults(null);
    try {
      const response = await kbsApi.send(roomId);
      setResults(response.results);
      fetchRecords();
    } catch (err) {
      Alert.alert('KBS Bildirimi Başarısız', (err as Error).message || 'Beklenmeyen bir hata oluştu');
    } finally {
      setSending(false);
    }
  };

  const activeRecords = records.filter((r) => r.status === 'checked_in');
  const allSent = isOccupied && activeRecords.length > 0;

  return (
    <AppCard style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.7}>
        <Ionicons name="id-card" size={20} color={colors.primary} />
        <Text style={styles.title}>KBS Durumu</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {isOccupied && (
            <AppButton
              title={allSent ? 'Tekrar Gönder' : 'KBS Gönder'}
              icon="send-outline"
              variant={allSent ? 'outline' : 'primary'}
              loading={sending}
              onPress={handleSend}
              style={{ marginBottom: spacing.sm }}
            />
          )}

          {results && (
            <View style={styles.resultBox}>
              {results.map((r, i) => (
                <View key={`${r.tcNo}-${i}`} style={styles.row}>
                  <Ionicons
                    name={r.status === 'checked_in' ? 'checkmark-circle' : 'alert-circle'}
                    size={16}
                    color={r.status === 'checked_in' ? colors.success : colors.error}
                  />
                  <Text style={styles.rowText}>{r.guestName}: {r.message}</Text>
                </View>
              ))}
            </View>
          )}

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
          ) : activeRecords.length > 0 ? (
            activeRecords.map((record) => (
              <View key={record.id} style={styles.row}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowText}>{record.guestName}</Text>
                  <Text style={styles.refText}>Ref: {record.kbsReference}</Text>
                </View>
              </View>
            ))
          ) : isOccupied ? (
            <Text style={[styles.infoText, { color: colors.warning }]}>KBS bildirimi yapılmamış.</Text>
          ) : fetched ? (
            <Text style={styles.infoText}>Oda boş — KBS kaydı yok.</Text>
          ) : null}
        </View>
      )}
    </AppCard>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  body: { marginTop: spacing.md },
  resultBox: {
    backgroundColor: colors.divider,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    gap: 4,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  rowText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
  refText: { fontSize: fontSize.xs, color: colors.textSecondary },
  infoText: { fontSize: fontSize.sm, color: colors.textSecondary, paddingVertical: spacing.xs },
});

export default RoomKbsCard;
