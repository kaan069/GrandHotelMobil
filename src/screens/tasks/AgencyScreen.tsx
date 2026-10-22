/**
 * AgencyScreen — Acente Yönetimi
 *
 * İki görünüm:
 *   1. Tümü — acente listesi + ekleme
 *   2. Borçlu — gerçekleşmiş konaklamalarda ödenmemiş bakiyesi olan acenteler
 *
 * Acente detayı: bilgiler (komisyon, yetkili, cari bakiye), borç özeti,
 * konaklamalar (bakiyeli olana "Ödeme Ekle") ve gelecek (rezerve) rezervasyonlar.
 * Düzenle: ad, iletişim, komisyon oranı, not, aktif/pasif.
 * Web karşılığı: pages/guests/AgencyList.tsx + components/agencies/*
 *
 * API: agenciesApi.getAll / create / update / getDebtors / getDebtDetail / getReservations / addPayment
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Modal, ScrollView, Alert, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppCard, AppButton, AppInput, EmptyState, LoadingState, StatusChip, PromptModal, parseAmount,
} from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { deferAlert } from '../../utils/alert';
import { RESERVATION_STATUS_LABELS, RESERVATION_STATUS_COLORS } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import {
  agenciesApi, Agency, AgencyInput, AgencyDebtor, AgencyDebtDetail, AgencyReservation,
} from '../../services/api';

interface AgencyScreenProps {
  onClose: () => void;
}

type FilterType = 'all' | 'debtors';

const formatCurrency = (amount: number): string =>
  `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const EMPTY_FORM = { name: '', taxNumber: '', contactPerson: '', phone: '', email: '', address: '', commissionRate: '', notes: '', isActive: true };
type AgencyForm = typeof EMPTY_FORM;

const AgencyScreen: React.FC<AgencyScreenProps> = ({ onClose }) => {
  const { user } = useAuth();

  const [filter, setFilter] = useState<FilterType>('all');
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [debtors, setDebtors] = useState<AgencyDebtor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /* Detay */
  const [selected, setSelected] = useState<Agency | null>(null);
  const [detail, setDetail] = useState<AgencyDebtDetail | null>(null);
  const [upcoming, setUpcoming] = useState<AgencyReservation[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState<{ rezId: number; roomNumber: string; balance: number } | null>(null);

  /* Form (ekle / düzenle) */
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<AgencyForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (filter === 'all') setAgencies(await agenciesApi.getAll());
      else setDebtors(await agenciesApi.getDebtors());
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Acenteler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const loadDetail = async (agencyId: number) => {
    setDetailLoading(true);
    try {
      const [debt, all] = await Promise.all([
        agenciesApi.getDebtDetail(agencyId),
        agenciesApi.getReservations(agencyId),
      ]);
      setDetail(debt);
      setUpcoming(all.filter((r) => r.status === 'reserved'));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Acente detayı yüklenemedi');
    } finally {
      setDetailLoading(false);
    }
  };

  const openAgency = async (agencyId: number) => {
    let agency = agencies.find((a) => a.id === agencyId) || null;
    if (!agency) {
      try {
        agency = (await agenciesApi.getAll()).find((a) => a.id === agencyId) || null;
      } catch { agency = null; }
    }
    if (!agency) return;
    setSelected(agency);
    setDetail(null);
    setUpcoming([]);
    loadDetail(agency.id);
  };

  const openForm = (agency?: Agency) => {
    setEditingId(agency?.id ?? null);
    setForm(agency ? {
      name: agency.name,
      taxNumber: agency.taxNumber || '',
      contactPerson: agency.contactPerson || '',
      phone: agency.phone || '',
      email: agency.email || '',
      address: agency.address || '',
      commissionRate: agency.commissionRate ? String(Number(agency.commissionRate)) : '',
      notes: agency.notes || '',
      isActive: agency.isActive !== false,
    } : EMPTY_FORM);
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Uyarı', 'Acente adı zorunludur.'); return; }
    const rate = form.commissionRate.trim() ? parseAmount(form.commissionRate) : 0;
    if (rate < 0 || rate > 100) { Alert.alert('Uyarı', 'Komisyon oranı 0 ile 100 arasında olmalı.'); return; }
    const payload: AgencyInput = {
      name: form.name.trim(),
      taxNumber: form.taxNumber.trim() || null,
      contactPerson: form.contactPerson.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
      commissionRate: rate.toFixed(2),
      notes: form.notes.trim() || null,
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editingId) {
        const updated = await agenciesApi.update(editingId, payload);
        setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
      } else {
        await agenciesApi.create(payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const submitPayment = async (value: string) => {
    if (!paymentTarget || !selected) return;
    const amount = parseAmount(value);
    await agenciesApi.addPayment(selected.id, {
      reservationId: paymentTarget.rezId,
      amount,
      description: 'Acente ödemesi',
      staffName: user?.name || '',
    });
    deferAlert('Başarılı', `${formatCurrency(amount)} ödeme kaydedildi.`);
    loadDetail(selected.id);
  };

  const renderForm = () => (
    <Modal visible={formOpen} animationType="slide" transparent onRequestClose={() => setFormOpen(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setFormOpen(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
            <Text style={styles.modalTitle}>{editingId ? 'Acente Düzenle' : 'Yeni Acente'}</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
            <AppInput label="Acente Adı *" value={form.name} onChangeText={(v) => setForm((p) => ({ ...p, name: v }))} icon="globe-outline" />
            <AppInput label="Komisyon Oranı (%)" value={form.commissionRate} onChangeText={(v) => setForm((p) => ({ ...p, commissionRate: v }))} keyboardType="decimal-pad" icon="pricetag-outline" />
            <AppInput label="Vergi Numarası" value={form.taxNumber} onChangeText={(v) => setForm((p) => ({ ...p, taxNumber: v }))} keyboardType="number-pad" icon="document-text-outline" />
            <AppInput label="Yetkili Kişi" value={form.contactPerson} onChangeText={(v) => setForm((p) => ({ ...p, contactPerson: v }))} icon="person-outline" />
            <AppInput label="Telefon" value={form.phone} onChangeText={(v) => setForm((p) => ({ ...p, phone: v }))} keyboardType="phone-pad" icon="call-outline" />
            <AppInput label="E-posta" value={form.email} onChangeText={(v) => setForm((p) => ({ ...p, email: v }))} keyboardType="email-address" autoCapitalize="none" icon="mail-outline" />
            <AppInput label="Adres" value={form.address} onChangeText={(v) => setForm((p) => ({ ...p, address: v }))} multiline icon="location-outline" />
            <AppInput label="Notlar" value={form.notes} onChangeText={(v) => setForm((p) => ({ ...p, notes: v }))} multiline />
            {!!editingId && (
              <TouchableOpacity style={styles.toggleRow} onPress={() => setForm((p) => ({ ...p, isActive: !p.isActive }))}>
                <Ionicons name={form.isActive ? 'checkbox' : 'square-outline'} size={22} color={colors.primary} />
                <Text style={styles.toggleText}>Aktif (pasif acente yeni rezervasyonda seçilemez)</Text>
              </TouchableOpacity>
            )}
            <AppButton title={editingId ? 'Kaydet' : 'Acente Oluştur'} icon="checkmark-circle-outline" onPress={handleSave} loading={saving} />
            <AppButton title="Vazgeç" variant="outline" onPress={() => setFormOpen(false)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  /* ─── DETAY ─── */
  if (selected) {
    const summary = detail?.summary;
    const balance = Number(summary?.balance || 0);
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelected(null); load(); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selected.name}</Text>
          <TouchableOpacity onPress={() => openForm(selected)}>
            <Ionicons name="create-outline" size={24} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {detailLoading && !detail ? (
          <LoadingState message="Yükleniyor..." />
        ) : (
          <ScrollView contentContainerStyle={styles.detailContent}>
            <AppCard style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="globe" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Acente Bilgileri</Text>
                {selected.isActive === false && <StatusChip label="Pasif" color={colors.textSecondary} />}
              </View>
              <InfoRow label="Komisyon" value={`%${Number(selected.commissionRate || 0)}`} />
              <InfoRow label="Vergi No" value={selected.taxNumber || '—'} />
              <InfoRow label="Yetkili" value={selected.contactPerson || '—'} />
              <InfoRow label="Telefon" value={selected.phone || '—'} />
              <InfoRow label="E-posta" value={selected.email || '—'} />
              <InfoRow label="Adres" value={selected.address || '—'} />
              <InfoRow
                label="Açık Cari Bakiye"
                value={formatCurrency(Number(selected.accountBalance || 0))}
                valueColor={Number(selected.accountBalance || 0) > 0 ? colors.error : undefined}
              />
              {!!selected.notes && <Text style={styles.notesText}>{selected.notes}</Text>}
            </AppCard>

            {summary && (
              <AppCard style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="stats-chart" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Konaklama Özeti</Text>
                </View>
                <InfoRow label="Konaklama" value={`${summary.reservationCount} adet`} />
                <InfoRow label="Ciro" value={formatCurrency(Number(summary.totalAmount))} />
                <InfoRow label="Ödenen" value={formatCurrency(Number(summary.paidAmount))} valueColor={colors.success} />
                <InfoRow label="Bakiye" value={formatCurrency(balance)} valueColor={balance > 0 ? colors.error : colors.success} />
                <InfoRow label="Acente Komisyonu" value={formatCurrency(Number(summary.commission))} />
              </AppCard>
            )}

            <AppCard style={styles.card}>
              <View style={styles.sectionHeader}>
                <Ionicons name="bed" size={20} color={colors.primary} />
                <Text style={styles.sectionTitle}>Konaklamalar ({detail?.reservations.length || 0})</Text>
              </View>
              {(detail?.reservations || []).length === 0 ? (
                <Text style={styles.emptyText}>Gerçekleşmiş konaklama yok</Text>
              ) : (
                detail!.reservations.map((r) => {
                  const rBalance = Number(r.balance);
                  return (
                    <View key={r.id} style={styles.rezRow}>
                      <View style={styles.rezTop}>
                        <Text style={styles.rezRoom}>Oda {r.roomNumber}</Text>
                        <StatusChip label={RESERVATION_STATUS_LABELS[r.status] || r.status} color={RESERVATION_STATUS_COLORS[r.status] || colors.textSecondary} />
                      </View>
                      {!!r.guestNames && <Text style={styles.rezMeta}>{r.guestNames}</Text>}
                      <Text style={styles.rezMeta}>{formatDate(r.checkIn)} → {formatDate(r.checkOut)}{r.agencyReservationCode ? ` · Kod: ${r.agencyReservationCode}` : ''}</Text>
                      <View style={styles.rezBottom}>
                        <Text style={styles.rezMeta}>
                          {formatCurrency(Number(r.totalAmount))} · Ödenen {formatCurrency(Number(r.paidAmount))}
                        </Text>
                        {rBalance > 0 && (
                          <TouchableOpacity
                            style={styles.payBtn}
                            onPress={() => setPaymentTarget({ rezId: r.id, roomNumber: r.roomNumber, balance: rBalance })}
                          >
                            <Ionicons name="cash-outline" size={14} color={colors.primary} />
                            <Text style={styles.payBtnText}>Ödeme Ekle · {formatCurrency(rBalance)}</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </AppCard>

            {upcoming.length > 0 && (
              <AppCard style={styles.card}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="calendar" size={20} color={colors.primary} />
                  <Text style={styles.sectionTitle}>Gelecek Rezervasyonlar ({upcoming.length})</Text>
                </View>
                {upcoming.map((r) => (
                  <View key={r.id} style={styles.rezRow}>
                    <Text style={styles.rezRoom}>Oda {r.roomNumber}</Text>
                    <Text style={styles.rezMeta}>{formatDate(r.checkIn)} → {formatDate(r.checkOut)}{r.agencyReservationCode ? ` · Kod: ${r.agencyReservationCode}` : ''}</Text>
                    {!!r.guestNames && <Text style={styles.rezMeta}>{r.guestNames}</Text>}
                  </View>
                ))}
              </AppCard>
            )}
          </ScrollView>
        )}

        {renderForm()}
        <PromptModal
          visible={!!paymentTarget}
          title="Ödeme Ekle"
          message={paymentTarget ? `Oda ${paymentTarget.roomNumber} — Bakiye: ${formatCurrency(paymentTarget.balance)}` : undefined}
          placeholder="Ödeme tutarı"
          initialValue={paymentTarget ? String(paymentTarget.balance) : ''}
          keyboardType="decimal-pad"
          confirmText="Ödeme Yap"
          validate={(v) => {
            const amount = parseAmount(v);
            if (amount <= 0) return 'Geçerli bir tutar girin';
            if (paymentTarget && amount > paymentTarget.balance + 0.001) return 'Tutar bakiyeden büyük olamaz';
            return null;
          }}
          onConfirm={submitPayment}
          onClose={() => setPaymentTarget(null)}
        />
      </View>
    );
  }

  /* ─── LİSTE ─── */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Acente Yönetimi</Text>
        <TouchableOpacity onPress={() => openForm()}><Ionicons name="add-circle" size={28} color={colors.primary} /></TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {([['all', 'Tümü'], ['debtors', 'Borçlu']] as [FilterType, string][]).map(([val, label]) => (
          <TouchableOpacity key={val} style={[styles.filterChip, filter === val && styles.filterChipActive]} onPress={() => setFilter(val)}>
            <Text style={[styles.filterText, filter === val && styles.filterTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Acenteler yükleniyor..." />
      ) : filter === 'all' ? (
        <FlatList
          data={agencies}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="globe-outline" title="Acente bulunamadı" />}
          renderItem={({ item }) => (
            <AppCard style={styles.itemCard} onPress={() => openAgency(item.id)}>
              <View style={styles.itemRow}>
                <Ionicons name="globe-outline" size={26} color={item.isActive === false ? colors.textDisabled : colors.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    Komisyon %{Number(item.commissionRate || 0)}{item.contactPerson ? ` · ${item.contactPerson}` : ''}
                  </Text>
                </View>
                {item.isActive === false && <StatusChip label="Pasif" color={colors.textSecondary} />}
                <Ionicons name="chevron-forward" size={18} color={colors.textDisabled} />
              </View>
            </AppCard>
          )}
        />
      ) : (
        <FlatList
          data={debtors}
          keyExtractor={(a) => String(a.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
          ListEmptyComponent={<EmptyState icon="checkmark-done-outline" title="Borçlu acente yok" />}
          renderItem={({ item }) => (
            <AppCard style={styles.itemCard} onPress={() => openAgency(item.id)}>
              <View style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemMeta}>
                    {item.reservationCount} konaklama · Ciro {formatCurrency(Number(item.totalAmount))}
                  </Text>
                </View>
                <Text style={styles.debtAmount}>{formatCurrency(Number(item.balance))}</Text>
              </View>
            </AppCard>
          )}
        />
      )}

      {renderForm()}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; valueColor?: string }> = ({ label, value, valueColor }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, valueColor ? { color: valueColor } : null]}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { flex: 1, textAlign: 'center', fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  filterTextActive: { color: colors.textWhite, fontWeight: '700' },
  list: { padding: spacing.md, paddingBottom: 100 },
  itemCard: { marginBottom: spacing.sm },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  itemName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  itemMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  debtAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.error },
  detailContent: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.md },
  sectionTitle: { flex: 1, fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  notesText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.md, fontSize: fontSize.sm },
  rezRow: { paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.divider },
  rezTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rezRoom: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  rezMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  rezBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginTop: 4 },
  payBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: borderRadius.md,
    borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.primary + '10',
  },
  payBtnText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: {
    backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '92%',
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  modalForm: { padding: spacing.md },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  toggleText: { flex: 1, fontSize: fontSize.sm, color: colors.textPrimary },
});

export default AgencyScreen;
