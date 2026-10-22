/**
 * CommissionScreen — Garson Komisyonları
 *
 * Ayarlar (patron / genel müdür düzenler, diğerleri görür): komisyon açık mı,
 * minimum adisyon tutarı, oran (%).
 * Rapor (patron, müdür, restoran müdürü, muhasebe): tarih aralığı; toplam satış /
 * komisyon, personel bazında özet ve son kayıtlar. Toplamlar tüm kayıtlardan hesaplanır.
 * Web karşılığı: pages/reports/CommissionReport.tsx + komisyon ayarları
 *
 * API: commissionApi.getSettings / updateSettings / getReport
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, LoadingState, EmptyState, parseAmount, isAmountText } from '../../components/common';
import CalendarPicker from '../../components/common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { isAdmin } from '../../utils/permissions';
import useAuth from '../../hooks/useAuth';
import { commissionApi, CommissionSettings, CommissionReport } from '../../services/api';

interface CommissionScreenProps {
  onClose: () => void;
}

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDay = (s: string) =>
  new Date(s.slice(0, 10) + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

const CommissionScreen: React.FC<CommissionScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const canEditSettings = isAdmin(user);

  const today = new Date();
  const [dateFrom, setDateFrom] = useState(localDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateTo, setDateTo] = useState(localDate(today));
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to' | null>(null);

  const [settings, setSettings] = useState<CommissionSettings | null>(null);
  const [form, setForm] = useState({ isActive: false, minAmount: '', commissionRate: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [report, setReport] = useState<CommissionReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const applySettings = (st: CommissionSettings) => {
    setSettings(st);
    setForm({ isActive: st.isActive, minAmount: String(Number(st.minAmount)), commissionRate: String(Number(st.commissionRate)) });
  };

  const load = useCallback(async () => {
    try {
      const [st, rep] = await Promise.all([
        commissionApi.getSettings(),
        commissionApi.getReport({ dateFrom, dateTo }),
      ]);
      applySettings(st);
      setReport(rep);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Komisyon verileri yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const settingsChanged = !!settings && (
    form.isActive !== settings.isActive
    || form.minAmount !== String(Number(settings.minAmount))
    || form.commissionRate !== String(Number(settings.commissionRate))
  );

  const saveSettings = async () => {
    if (!isAmountText(form.minAmount) || !isAmountText(form.commissionRate)) {
      Alert.alert('Uyarı', 'Minimum tutar ve oran sayı olmalı.');
      return;
    }
    const rate = parseAmount(form.commissionRate);
    if (rate > 100) { Alert.alert('Uyarı', 'Oran 0 ile 100 arasında olmalı.'); return; }
    setSavingSettings(true);
    try {
      applySettings(await commissionApi.updateSettings({
        isActive: form.isActive,
        minAmount: parseAmount(form.minAmount),
        commissionRate: rate,
      }));
      Alert.alert('Kaydedildi', 'Komisyon ayarları güncellendi.');
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Ayarlar kaydedilemedi');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Komisyonlar</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <LoadingState message="Yükleniyor..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          <AppCard style={styles.card}>
            <View style={styles.settingsHeader}>
              <Text style={styles.sectionTitle}>Komisyon Ayarları</Text>
              <Switch
                value={form.isActive}
                onValueChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                disabled={!canEditSettings}
                trackColor={{ true: colors.success, false: colors.border }}
              />
            </View>
            <Text style={styles.meta}>
              {form.isActive ? 'Açık — kapanan adisyonlardan garsona komisyon yazılır.' : 'Kapalı — komisyon hesaplanmaz.'}
            </Text>
            <View style={styles.formRow}>
              <AppInput
                label="Min. adisyon (₺)"
                value={form.minAmount}
                onChangeText={(v) => setForm((p) => ({ ...p, minAmount: v }))}
                keyboardType="decimal-pad"
                editable={canEditSettings}
                style={{ flex: 1 }}
              />
              <AppInput
                label="Oran (%)"
                value={form.commissionRate}
                onChangeText={(v) => setForm((p) => ({ ...p, commissionRate: v }))}
                keyboardType="decimal-pad"
                editable={canEditSettings}
                style={{ flex: 1 }}
              />
            </View>
            {canEditSettings ? (
              settingsChanged && <AppButton title="Ayarları Kaydet" icon="save-outline" onPress={saveSettings} loading={savingSettings} />
            ) : (
              <Text style={styles.meta}>Ayarları patron veya genel müdür değiştirebilir.</Text>
            )}
          </AppCard>

          <View style={styles.dateRow}>
            <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('from')}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.dateChipText}>{formatDay(dateFrom)}</Text>
            </TouchableOpacity>
            <Text style={styles.meta}>→</Text>
            <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('to')}>
              <Ionicons name="calendar-outline" size={14} color={colors.primary} />
              <Text style={styles.dateChipText}>{formatDay(dateTo)}</Text>
            </TouchableOpacity>
          </View>

          {report && (
            <>
              <View style={styles.statRow}>
                <Stat label="Adisyon" value={String(report.count)} />
                <Stat label="Satış" value={money(report.totalSales)} />
                <Stat label="Komisyon" value={money(report.totalCommission)} highlight />
              </View>

              <Text style={styles.sectionTitle}>Personel Bazında</Text>
              {report.byEmployee.length === 0 ? (
                <EmptyState icon="people-outline" title="Bu aralıkta komisyon yok" />
              ) : (
                report.byEmployee.map((e) => (
                  <AppCard key={e.employeeId} style={styles.card}>
                    <View style={styles.rowBetween}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.name}>{e.employeeName}</Text>
                        <Text style={styles.meta}>{e.count} adisyon · Satış {money(e.totalSales)}</Text>
                      </View>
                      <Text style={styles.amount}>{money(e.totalCommission)}</Text>
                    </View>
                  </AppCard>
                ))
              )}

              {report.items.length > 0 && (
                <>
                  <Text style={styles.sectionTitle}>Son Kayıtlar</Text>
                  <AppCard style={styles.card}>
                    {report.items.slice(0, 50).map((it) => (
                      <View key={it.id} style={styles.itemRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.itemTitle}>{it.employeeName} · Masa {it.tableNumber || '—'}</Text>
                          <Text style={styles.meta}>{formatDay(it.date)} · {it.tabNo || ''} · %{Number(it.commissionRate)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.itemAmount}>{money(it.commissionAmount)}</Text>
                          <Text style={styles.meta}>{money(it.tabTotal)}</Text>
                        </View>
                      </View>
                    ))}
                    {(report.truncated || report.items.length > 50) && (
                      <Text style={styles.hint}>Liste kısaltıldı — toplamlar tüm kayıtları içerir.</Text>
                    )}
                  </AppCard>
                </>
              )}
            </>
          )}
        </ScrollView>
      )}

      <CalendarPicker
        visible={calendarTarget !== null}
        selectedDate={calendarTarget === 'to' ? dateTo : dateFrom}
        minDate={calendarTarget === 'to' ? dateFrom : undefined}
        title={calendarTarget === 'to' ? 'Bitiş Tarihi' : 'Başlangıç Tarihi'}
        onSelect={(d) => {
          if (calendarTarget === 'from') {
            setDateFrom(d);
            if (dateTo < d) setDateTo(d);
          } else {
            setDateTo(d);
          }
        }}
        onClose={() => setCalendarTarget(null)}
      />
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <View style={[styles.stat, highlight && { borderColor: colors.primary }]}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, highlight && { color: colors.primary }]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    paddingHorizontal: spacing.md, paddingTop: 56, paddingBottom: spacing.md,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  content: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.sm },
  settingsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.xs, marginBottom: spacing.xs },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  formRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginVertical: spacing.sm },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateChipText: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600' },
  statRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  stat: {
    flex: 1, padding: spacing.sm, borderRadius: borderRadius.md, borderWidth: 1,
    borderColor: colors.border, backgroundColor: colors.surface,
  },
  statLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  statValue: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary, marginTop: 2 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  name: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  itemRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  itemTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  itemAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
});

export default CommissionScreen;
