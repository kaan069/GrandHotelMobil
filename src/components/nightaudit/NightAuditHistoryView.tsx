/**
 * NightAuditHistoryView — Geçmiş Gün Sonu Raporları
 *
 * Son 30 gün (değiştirilebilir: 7 / 30 / 90) kaydedilmiş gün sonu raporları:
 * tarih, işlenen oda, yazılan ücret, no-show, işlemi yapan (otomatik / personel),
 * doluluk. Rapora dokununca oda bazında yazılan ücretler ve no-show listesi açılır.
 * Web karşılığı: pages/reports/NightAuditReport.tsx
 *
 * API: kazancApi.nightAuditReports({ dateFrom, dateTo })
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, StatusChip, LoadingState, EmptyState } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { kazancApi, NightAuditReportItem } from '../../services/api';

const RANGES = [7, 30, 90] as const;

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const money = (v: number) => `₺${(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDay = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' });

const NightAuditHistoryView: React.FC = () => {
  const [range, setRange] = useState<(typeof RANGES)[number]>(30);
  const [reports, setReports] = useState<NightAuditReportItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const load = useCallback(async () => {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - range);
    try {
      setReports(await kazancApi.nightAuditReports({ dateFrom: localDate(from), dateTo: localDate(to) }));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Gün sonu raporları yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const total = reports.reduce((s, r) => s + (r.totalCharged || 0), 0);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
    >
      <View style={styles.rangeRow}>
        {RANGES.map((r) => (
          <TouchableOpacity key={r} style={[styles.chip, range === r && styles.chipActive]} onPress={() => setRange(r)}>
            <Text style={[styles.chipText, range === r && styles.chipTextActive]}>Son {r} gün</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <LoadingState message="Raporlar yükleniyor..." />
      ) : reports.length === 0 ? (
        <EmptyState icon="moon-outline" title="Bu aralıkta gün sonu raporu yok" />
      ) : (
        <>
          <AppCard style={styles.card}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{reports.length} gün sonu</Text>
              <Text style={styles.summaryValue}>{money(total)}</Text>
            </View>
          </AppCard>
          {reports.map((r) => {
            const expanded = expandedId === r.id;
            const occ = r.occupancySnapshot || {};
            return (
              <AppCard key={r.id} style={styles.card} onPress={() => setExpandedId(expanded ? null : r.id)}>
                <View style={styles.topRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dayText}>{formatDay(r.date)}</Text>
                    <Text style={styles.meta}>
                      {r.roomsCharged} oda · {r.automatic ? 'Otomatik' : r.processedBy || '—'}
                      {r.processedAt ? ` · ${new Date(r.processedAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.amount}>{money(r.totalCharged)}</Text>
                  <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textSecondary} />
                </View>
                <View style={styles.badges}>
                  {r.automatic && <StatusChip label="Otomatik" color={colors.info} />}
                  {r.noShowCount > 0 && <StatusChip label={`No-show ${r.noShowCancelled}/${r.noShowCount}`} color={colors.warning} />}
                  {occ.total ? <StatusChip label={`Doluluk %${Math.round(occ.rate ?? ((occ.occupied || 0) / occ.total) * 100)}`} color={colors.textSecondary} /> : null}
                </View>

                {expanded && (
                  <View style={styles.details}>
                    {(r.details || []).length === 0 ? (
                      <Text style={styles.meta}>Oda ücreti yazılmadı.</Text>
                    ) : (
                      r.details.map((d, i) => (
                        <View key={`${d.roomNumber}-${i}`} style={styles.detailRow}>
                          <Text style={styles.detailRoom}>{d.roomNumber}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.detailGuest} numberOfLines={1}>{d.guestName || '—'}</Text>
                            {(!!d.companyName || !!d.note) && (
                              <Text style={styles.meta} numberOfLines={1}>{[d.companyName, d.note].filter(Boolean).join(' · ')}</Text>
                            )}
                          </View>
                          <Text style={styles.detailAmount}>{money(d.amount)}</Text>
                        </View>
                      ))
                    )}
                    {(r.noShowDetails || []).length > 0 && (
                      <>
                        <Text style={styles.subTitle}>No-show</Text>
                        {r.noShowDetails.map((n) => (
                          <View key={n.reservationId} style={styles.detailRow}>
                            <Text style={styles.detailRoom}>{n.roomNumber}</Text>
                            <Text style={[styles.detailGuest, { flex: 1 }]} numberOfLines={1}>{n.guestName || '—'}</Text>
                            <Text style={[styles.meta, { color: n.cancelled ? colors.error : colors.textSecondary }]}>
                              {n.cancelled ? 'İptal edildi' : 'Bekletildi'}
                            </Text>
                          </View>
                        ))}
                      </>
                    )}
                  </View>
                )}
              </AppCard>
            );
          })}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: { padding: spacing.md, paddingBottom: 60 },
  rangeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textWhite, fontWeight: '700' },
  card: { marginBottom: spacing.sm },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  summaryValue: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primary },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  dayText: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: spacing.xs },
  details: { marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider, paddingTop: spacing.xs },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 6 },
  detailRoom: { width: 48, fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  detailGuest: { fontSize: fontSize.sm, color: colors.textPrimary },
  detailAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  subTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.sm },
});

export default NightAuditHistoryView;
