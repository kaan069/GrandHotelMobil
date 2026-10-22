/**
 * ShiftHandoverScreen — Mesai Devri (ön büro vardiyası)
 *
 * Aktif mesai: kimden kime, başlangıç; "Mesaiyi Devret" (yeni personel seçilir,
 * önceki mesai otomatik kapanıp özet alınır) ve "Mesaiyi Kapat" (kart / nakit
 * tutarı + not girilir). Geçmiş: kapanmış mesailer gün gün; dokununca özet.
 * Özet (satış, satılan / dolu / boş oda) backend'de sadece bu otelin verisiyle hesaplanır.
 * Web karşılığı: pages/shift/ShiftHandover.tsx + components/layout/ShiftHandoverButton.tsx
 *
 * API: shiftsApi.getAll / getActive / create / close, staffApi.getAll
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppCard, AppButton, AppInput, StatusChip, LoadingState, EmptyState, parseAmount, isAmountText,
} from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { deferAlert } from '../../utils/alert';
import { ROLE_LABELS } from '../../utils/constants';
import { FRONT_OFFICE_ROLES } from '../../utils/permissions';
import useAuth from '../../hooks/useAuth';
import { shiftsApi, staffApi, ApiShiftHandover, ApiEmployee } from '../../services/api';

interface ShiftHandoverScreenProps {
  onClose: () => void;
}

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—';

const formatDateTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

const ShiftHandoverScreen: React.FC<ShiftHandoverScreenProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [active, setActive] = useState<ApiShiftHandover | null>(null);
  const [history, setHistory] = useState<ApiShiftHandover[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [staff, setStaff] = useState<ApiEmployee[] | null>(null);
  const [handoverTarget, setHandoverTarget] = useState<ApiEmployee | null>(null);
  const [handoverNotes, setHandoverNotes] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [closeForm, setCloseForm] = useState({ card: '', cash: '', notes: '' });
  const [busy, setBusy] = useState(false);
  const [detail, setDetail] = useState<ApiShiftHandover | null>(null);

  const load = useCallback(async () => {
    try {
      const [act, all] = await Promise.all([shiftsApi.getActive(), shiftsApi.getAll({ status: 'closed' })]);
      setActive(act);
      setHistory(all);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Mesai kayıtları yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  /* Devralacak personel: ön büro rolündeki aktif çalışanlar (kendisi hariç) */
  const openHandover = async () => {
    try {
      const list = await staffApi.getAll({ status: 'active' });
      const candidates = list.filter((e) => e.id !== user?.id && (e.roles || []).some((r) => FRONT_OFFICE_ROLES.includes(r)));
      if (candidates.length === 0) {
        Alert.alert('Personel Yok', 'Mesaiyi devralabilecek ön büro personeli bulunamadı.');
        return;
      }
      setHandoverTarget(null);
      setHandoverNotes('');
      setStaff(candidates);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Personel listesi yüklenemedi');
    }
  };

  const confirmHandover = async () => {
    if (!handoverTarget) return;
    setBusy(true);
    try {
      const res = await shiftsApi.create({ toEmployeeId: handoverTarget.id, notes: handoverNotes.trim() || undefined });
      setStaff(null);
      setHandoverTarget(null);
      setHandoverNotes('');
      await load();
      deferAlert('Mesai Devredildi', `${handoverTarget.fullName} mesaiyi devraldı.${res.closedShift ? '\n\nÖnceki mesai kapatıldı ve özeti kaydedildi.' : ''}`);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Mesai devredilemedi');
    } finally {
      setBusy(false);
    }
  };

  const confirmClose = async () => {
    if (!active) return;
    for (const v of [closeForm.card, closeForm.cash]) {
      if (v.trim() && !isAmountText(v)) { Alert.alert('Uyarı', 'Kart / nakit tutarını doğru girin (ör. 1250,50).'); return; }
    }
    setBusy(true);
    try {
      await shiftsApi.close(active.id, {
        cardSales: closeForm.card.trim() ? parseAmount(closeForm.card) : 0,
        cashSales: closeForm.cash.trim() ? parseAmount(closeForm.cash) : 0,
        notes: closeForm.notes.trim() || undefined,
      });
      setCloseOpen(false);
      await load();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Mesai kapatılamadı');
    } finally {
      setBusy(false);
    }
  };

  /* Geçmiş — gün gün */
  const grouped = history.reduce<Record<string, ApiShiftHandover[]>>((acc, sh) => {
    const day = (sh.startTime || '').slice(0, 10);
    (acc[day] = acc[day] || []).push(sh);
    return acc;
  }, {});
  const days = Object.keys(grouped).sort((a, b) => b.localeCompare(a));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Mesai Devri</Text>
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
            <View style={styles.sectionHeader}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Aktif Mesai</Text>
              {active && <StatusChip label="Devam Ediyor" color={colors.success} />}
            </View>
            {active ? (
              <>
                <Text style={styles.activeNames}>{active.fromUser} → {active.toUser}</Text>
                <Text style={styles.meta}>Başlangıç: {formatDateTime(active.startTime)}</Text>
                {!!active.notes && <Text style={styles.notes}>"{active.notes}"</Text>}
              </>
            ) : (
              <Text style={styles.meta}>Aktif mesai yok.</Text>
            )}
            <AppButton title="Mesaiyi Devret" icon="swap-horizontal-outline" onPress={openHandover} disabled={busy} style={{ marginTop: spacing.md }} />
            {active && (
              <AppButton
                title="Mesaiyi Kapat"
                icon="stop-circle-outline"
                variant="outline"
                onPress={() => { setCloseForm({ card: '', cash: '', notes: '' }); setCloseOpen(true); }}
                disabled={busy}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </AppCard>

          <Text style={styles.historyTitle}>Geçmiş Mesailer</Text>
          {days.length === 0 && <EmptyState icon="time-outline" title="Kapanmış mesai yok" />}
          {days.map((day) => (
            <View key={day}>
              <Text style={styles.dayLabel}>{formatDay(day)}</Text>
              {grouped[day].map((sh) => (
                <AppCard key={sh.id} style={styles.card} onPress={() => setDetail(sh)}>
                  <View style={styles.histRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histNames}>{sh.fromUser} → {sh.toUser}</Text>
                      <Text style={styles.meta}>{formatTime(sh.startTime)} – {formatTime(sh.endTime)} · {sh.roomsSold} oda satıldı</Text>
                    </View>
                    <Text style={styles.histTotal}>{money(sh.totalSales)}</Text>
                  </View>
                </AppCard>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Devir — personel seçimi + not + onay tek pencerede (iOS'ta art arda modal açmak güvenilir değil) */}
      <Modal visible={!!staff} animationType="slide" transparent onRequestClose={() => setStaff(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, { maxHeight: '85%' }]}>
            <Text style={styles.modalTitle}>Mesaiyi Devret</Text>
            <Text style={styles.meta}>
              Devralacak personeli seçin.{active ? ' Mevcut mesai kapatılıp özeti kaydedilir.' : ''}
            </Text>
            <ScrollView style={styles.staffList} keyboardShouldPersistTaps="handled">
              {(staff || []).map((e) => {
                const selected = handoverTarget?.id === e.id;
                return (
                  <TouchableOpacity key={e.id} style={[styles.staffRow, selected && styles.staffRowSelected]} onPress={() => setHandoverTarget(e)}>
                    <Ionicons name={selected ? 'radio-button-on' : 'radio-button-off'} size={20} color={selected ? colors.primary : colors.textDisabled} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.histNames}>{e.fullName}</Text>
                      <Text style={styles.meta}>{(e.roles || []).map((r) => ROLE_LABELS[r] || r).join(', ')}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <AppInput label="Devir notu (opsiyonel)" value={handoverNotes} onChangeText={setHandoverNotes} multiline placeholder="Ör. 204 geç çıkış istedi" />
            <View style={styles.modalActions}>
              <AppButton title="Vazgeç" variant="outline" onPress={() => { setStaff(null); setHandoverTarget(null); }} disabled={busy} style={{ flex: 1 }} />
              <AppButton title="Devret" onPress={confirmHandover} loading={busy} disabled={!handoverTarget} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Mesai kapat */}
      <Modal visible={closeOpen} animationType="fade" transparent onRequestClose={() => setCloseOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Mesaiyi Kapat</Text>
            <AppInput label="Kart satışı (₺)" value={closeForm.card} onChangeText={(v) => setCloseForm((p) => ({ ...p, card: v }))} keyboardType="decimal-pad" />
            <AppInput label="Nakit satışı (₺)" value={closeForm.cash} onChangeText={(v) => setCloseForm((p) => ({ ...p, cash: v }))} keyboardType="decimal-pad" />
            <AppInput label="Not" value={closeForm.notes} onChangeText={(v) => setCloseForm((p) => ({ ...p, notes: v }))} multiline />
            <View style={styles.modalActions}>
              <AppButton title="Vazgeç" variant="outline" onPress={() => setCloseOpen(false)} disabled={busy} style={{ flex: 1 }} />
              <AppButton title="Kapat" variant="danger" onPress={confirmClose} loading={busy} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* Mesai özeti */}
      <Modal visible={!!detail} animationType="fade" transparent onRequestClose={() => setDetail(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Mesai Özeti</Text>
            {detail && (
              <>
                <Text style={styles.histNames}>{detail.fromUser} → {detail.toUser}</Text>
                <Text style={[styles.meta, { marginBottom: spacing.sm }]}>{formatDateTime(detail.startTime)} – {formatDateTime(detail.endTime)}</Text>
                <InfoRow label="Kart Satışı" value={money(detail.cardSales)} />
                <InfoRow label="Nakit Satışı" value={money(detail.cashSales)} />
                <InfoRow label="Toplam Satış (folio)" value={money(detail.totalSales)} />
                <InfoRow label="Satılan Oda" value={String(detail.roomsSold)} />
                <InfoRow label="Dolu / Boş Oda" value={`${detail.roomsOccupied} / ${detail.roomsAvailable}`} />
                {!!detail.notes && <Text style={styles.notes}>"{detail.notes}"</Text>}
              </>
            )}
            <AppButton title="Kapat" variant="outline" onPress={() => setDetail(null)} style={{ marginTop: spacing.md }} />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  activeNames: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  notes: { fontSize: fontSize.sm, color: colors.textSecondary, fontStyle: 'italic', marginTop: spacing.xs },
  historyTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginTop: spacing.md, marginBottom: spacing.xs },
  dayLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary, marginTop: spacing.sm, marginBottom: 6, textTransform: 'uppercase' },
  histRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  histNames: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  histTotal: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  staffList: { marginVertical: spacing.sm, maxHeight: 280 },
  staffRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, marginBottom: 6,
  },
  staffRowSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
});

export default ShiftHandoverScreen;
