/**
 * RoomAuditLogCard - Oda İşlem Geçmişi (patron / genel müdür)
 *
 * Check-out, zorla çıkış, oda taşıma, silinen folio, check-in/out iptali gibi
 * kayıtlar. Kayıtları backend yazar; işlemi yapan token'daki personeldir.
 * Web karşılığı: components/rooms/roomdetail/AuditLogSection.tsx
 *
 * API: auditApi.getByRoom(roomId) → GET /api/rooms/{id}/audit-logs/
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { AUDIT_ACTION_LABELS, AUDIT_ACTION_COLORS } from '../../utils/constants';
import { auditApi, ApiAuditLog } from '../../services/api';

const RoomAuditLogCard: React.FC<{ roomId: number }> = ({ roomId }) => {
  const [expanded, setExpanded] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<ApiAuditLog[]>([]);

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !fetched) {
      setLoading(true);
      auditApi.getByRoom(roomId)
        .then(setLogs)
        .catch((err: Error) => Alert.alert('Hata', err.message || 'İşlem geçmişi yüklenemedi'))
        .finally(() => { setLoading(false); setFetched(true); });
    }
  };

  return (
    <AppCard style={styles.card}>
      <TouchableOpacity style={styles.header} onPress={handleToggle} activeOpacity={0.7}>
        <Ionicons name="time" size={20} color={colors.primary} />
        <Text style={styles.title}>İşlem Geçmişi</Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.body}>
          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: spacing.md }} />
          ) : logs.length > 0 ? (
            logs.map((log) => {
              const color = AUDIT_ACTION_COLORS[log.action] || colors.textSecondary;
              return (
                <View key={log.id} style={styles.logRow}>
                  <View style={styles.logTop}>
                    <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                      <Text style={[styles.badgeText, { color }]}>
                        {AUDIT_ACTION_LABELS[log.action] || log.action}
                      </Text>
                    </View>
                    <Text style={styles.dateText}>{new Date(log.createdAt).toLocaleString('tr-TR')}</Text>
                  </View>
                  {!!log.description && <Text style={styles.descText}>{log.description}</Text>}
                  <Text style={styles.byText}>{log.performedBy || '—'}</Text>
                </View>
              );
            })
          ) : fetched ? (
            <Text style={styles.emptyText}>Kayıtlı işlem bulunmuyor.</Text>
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
  logRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  logTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  badgeText: { fontSize: fontSize.xs, fontWeight: '600' },
  dateText: { fontSize: fontSize.xs, color: colors.textSecondary },
  descText: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  byText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary, paddingVertical: spacing.xs },
});

export default RoomAuditLogCard;
