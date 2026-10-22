/**
 * CashRegisterScreen — Kasa
 *
 * Liste: kasalar, durum, bugünkü nakit / kart / odaya yansıtma / gider.
 * Detay (oturum özeti — açılıştan itibaren): açılış bakiyesi, satışlar, giderler,
 * beklenen nakit; kapanmışsa sayılan nakit ve fark. Son hareketler listesi.
 * İşlemler: Kasayı Aç (açılış bakiyesi), Kasayı Kapat (sayılan nakit — beklenen nakitle
 * önerilir, fark gösterilir), Gider Ekle (tutar + açıklama).
 * İşlemi yapan personel backend'de oturumdaki kullanıcıdır.
 * Web karşılığı: pages/kasa/CashRegisterPage.tsx
 *
 * API: kasaApi.getAll / getSummary / getTransactions / open / close / addExpense
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppCard, AppButton, AppInput, StatusChip, LoadingState, EmptyState, PromptModal, parseAmount, isAmountText,
} from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { CASH_REGISTER_TYPE_LABELS, CASH_TRANSACTION_LABELS } from '../../utils/constants';
import { kasaApi, ApiCashRegister, ApiCashSummary, ApiCashTransaction } from '../../services/api';

interface CashRegisterScreenProps {
  onClose: () => void;
}

const money = (v: string | number | null | undefined) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatTime = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';

/* Kasadan nakit çıkışı olan hareketler eksi gösterilir */
const OUTFLOW = new Set(['expense']);

const CashRegisterScreen: React.FC<CashRegisterScreenProps> = ({ onClose }) => {
  const [registers, setRegisters] = useState<ApiCashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [selected, setSelected] = useState<ApiCashRegister | null>(null);
  const [summary, setSummary] = useState<ApiCashSummary | null>(null);
  const [transactions, setTransactions] = useState<ApiCashTransaction[]>([]);
  const [detailLoading, setDetailLoading] = useState(false);

  const [balancePrompt, setBalancePrompt] = useState<'open' | 'close' | null>(null);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expense, setExpense] = useState({ amount: '', description: '' });
  const [savingExpense, setSavingExpense] = useState(false);

  const loadRegisters = useCallback(async () => {
    try {
      const list = await kasaApi.getAll();
      setRegisters(list);
      return list;
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Kasalar yüklenemedi');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadRegisters(); }, [loadRegisters]);

  const loadDetail = async (registerId: number) => {
    setDetailLoading(true);
    try {
      const [s, tx] = await Promise.all([kasaApi.getSummary(registerId), kasaApi.getTransactions(registerId)]);
      setSummary(s);
      setTransactions(tx);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Kasa özeti yüklenemedi');
    } finally {
      setDetailLoading(false);
    }
  };

  const openRegister = (reg: ApiCashRegister) => {
    setSelected(reg);
    setSummary(null);
    setTransactions([]);
    loadDetail(reg.id);
  };

  /* İşlem sonrası hem liste hem açık detay güncellenir */
  const refreshAll = async (registerId: number) => {
    const list = await loadRegisters();
    const updated = list.find((r) => r.id === registerId);
    if (updated) setSelected(updated);
    await loadDetail(registerId);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    if (selected) await refreshAll(selected.id);
    else await loadRegisters();
    setRefreshing(false);
  };

  const submitBalance = async (value: string) => {
    if (!selected || !balancePrompt) return;
    const amount = parseAmount(value);
    if (balancePrompt === 'open') {
      await kasaApi.open(selected.id, { openingBalance: amount });
    } else {
      await kasaApi.close(selected.id, { closingBalance: amount });
    }
    await refreshAll(selected.id);
  };

  const submitExpense = async () => {
    if (!selected) return;
    const amount = parseAmount(expense.amount);
    if (amount <= 0) { Alert.alert('Uyarı', 'Geçerli bir tutar girin.'); return; }
    if (!expense.description.trim()) { Alert.alert('Uyarı', 'Gider açıklaması zorunlu.'); return; }
    setSavingExpense(true);
    try {
      await kasaApi.addExpense(selected.id, { amount, description: expense.description.trim() });
      setExpenseOpen(false);
      await refreshAll(selected.id);
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Gider eklenemedi');
    } finally {
      setSavingExpense(false);
    }
  };

  /* ─── DETAY ─── */
  if (selected) {
    const isOpen = selected.status === 'open';
    const difference = summary?.difference != null ? Number(summary.difference) : null;
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { setSelected(null); loadRegisters(); }}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>{selected.name}</Text>
          <StatusChip label={isOpen ? 'Açık' : 'Kapalı'} color={isOpen ? colors.success : colors.textSecondary} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          <AppCard style={styles.card}>
            <InfoRow label="Tür" value={CASH_REGISTER_TYPE_LABELS[selected.registerType] || selected.registerType} />
            {!!selected.serviceAreaName && <InfoRow label="Hizmet Alanı" value={selected.serviceAreaName} />}
            <InfoRow label="Açılış" value={`${formatTime(selected.openedAt)}${selected.openedByName ? ` · ${selected.openedByName}` : ''}`} />
            {!isOpen && <InfoRow label="Kapanış" value={`${formatTime(selected.closedAt)}${selected.closedByName ? ` · ${selected.closedByName}` : ''}`} />}
          </AppCard>

          {detailLoading && !summary ? (
            <LoadingState message="Özet yükleniyor..." />
          ) : summary && (
            <AppCard style={styles.card}>
              <Text style={styles.sectionTitle}>{isOpen ? 'Açık Oturum Özeti' : 'Son Oturum Özeti'}</Text>
              <InfoRow label="Açılış Bakiyesi" value={money(summary.openingBalance)} />
              <InfoRow label="Nakit Satış" value={money(summary.cashSales)} />
              <InfoRow label="Kart Satış" value={money(summary.cardSales)} />
              <InfoRow label="Odaya Yansıtma" value={money(summary.roomChargeSales)} />
              <InfoRow label="Giderler" value={`-${money(summary.expenses)}`} color={colors.error} />
              <InfoRow label="Toplam Satış" value={money(summary.totalSales)} strong />
              <InfoRow label="Beklenen Nakit" value={money(summary.expectedCash)} strong color={colors.primary} />
              {summary.actualCash != null && (
                <>
                  <InfoRow label="Sayılan Nakit" value={money(summary.actualCash)} strong />
                  <InfoRow
                    label="Fark"
                    value={`${difference && difference > 0 ? '+' : ''}${money(difference)}`}
                    strong
                    color={difference === 0 ? colors.success : colors.error}
                  />
                </>
              )}
              <Text style={styles.hint}>Beklenen nakit = açılış + nakit satış − gider ({summary.transactionCount} işlem)</Text>
            </AppCard>
          )}

          {isOpen ? (
            <>
              <AppButton title="Gider Ekle" icon="remove-circle-outline" variant="outline" onPress={() => { setExpense({ amount: '', description: '' }); setExpenseOpen(true); }} style={styles.actionBtn} />
              <AppButton title="Kasayı Kapat" icon="lock-closed-outline" variant="danger" onPress={() => setBalancePrompt('close')} style={styles.actionBtn} />
            </>
          ) : (
            <AppButton title="Kasayı Aç" icon="lock-open-outline" onPress={() => setBalancePrompt('open')} style={styles.actionBtn} />
          )}

          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>Son Hareketler</Text>
            {transactions.length === 0 ? (
              <Text style={styles.emptyText}>Hareket yok</Text>
            ) : (
              transactions.slice(0, 50).map((tx) => (
                <View key={tx.id} style={styles.txRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txTitle}>
                      {CASH_TRANSACTION_LABELS[tx.transactionType] || tx.transactionType}{tx.tabNo ? ` · ${tx.tabNo}` : ''}
                    </Text>
                    <Text style={styles.txMeta}>
                      {formatTime(tx.createdAt)}{tx.processedByName ? ` · ${tx.processedByName}` : ''}{tx.description ? ` · ${tx.description}` : ''}
                    </Text>
                  </View>
                  <Text style={[styles.txAmount, OUTFLOW.has(tx.transactionType) && { color: colors.error }]}>
                    {OUTFLOW.has(tx.transactionType) ? '-' : ''}{money(tx.amount)}
                  </Text>
                </View>
              ))
            )}
          </AppCard>
        </ScrollView>

        <PromptModal
          visible={!!balancePrompt}
          title={balancePrompt === 'open' ? 'Kasayı Aç' : 'Kasayı Kapat'}
          message={balancePrompt === 'open'
            ? 'Kasadaki açılış nakdini girin.'
            : `Kasadaki nakdi sayıp girin. Beklenen nakit: ${money(summary?.expectedCash)}`}
          placeholder="Tutar (₺)"
          initialValue={balancePrompt === 'close' ? String(Number(summary?.expectedCash || 0)) : '0'}
          keyboardType="decimal-pad"
          confirmText={balancePrompt === 'open' ? 'Aç' : 'Kapat'}
          destructive={balancePrompt === 'close'}
          validate={(v) => (isAmountText(v) ? null : 'Geçerli bir tutar girin (ör. 1250,50)')}
          onConfirm={submitBalance}
          onClose={() => setBalancePrompt(null)}
        />

        <Modal visible={expenseOpen} animationType="fade" transparent onRequestClose={() => setExpenseOpen(false)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalBox}>
              <Text style={styles.modalTitle}>Kasadan Gider</Text>
              <AppInput label="Tutar (₺)" value={expense.amount} onChangeText={(v) => setExpense((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" autoFocus />
              <AppInput label="Açıklama" value={expense.description} onChangeText={(v) => setExpense((p) => ({ ...p, description: v }))} placeholder="Ör. temizlik malzemesi" />
              <View style={styles.modalActions}>
                <AppButton title="Vazgeç" variant="outline" onPress={() => setExpenseOpen(false)} disabled={savingExpense} style={{ flex: 1 }} />
                <AppButton title="Kaydet" onPress={submitExpense} loading={savingExpense} style={{ flex: 1 }} />
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  /* ─── LİSTE ─── */
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Kasa</Text>
        <View style={{ width: 28 }} />
      </View>

      {loading ? (
        <LoadingState message="Kasalar yükleniyor..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {registers.length === 0 && <EmptyState icon="wallet-outline" title="Tanımlı kasa yok" />}
          {registers.map((reg) => {
            const isOpen = reg.status === 'open';
            return (
              <AppCard key={reg.id} style={styles.card} onPress={() => openRegister(reg)}>
                <View style={styles.regTop}>
                  <Ionicons name="wallet-outline" size={24} color={isOpen ? colors.success : colors.textDisabled} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.regName}>{reg.name}</Text>
                    <Text style={styles.txMeta}>{CASH_REGISTER_TYPE_LABELS[reg.registerType] || reg.registerType}{reg.serviceAreaName ? ` · ${reg.serviceAreaName}` : ''}</Text>
                  </View>
                  <StatusChip label={isOpen ? 'Açık' : 'Kapalı'} color={isOpen ? colors.success : colors.textSecondary} />
                </View>
                <View style={styles.totalsRow}>
                  <Total label="Nakit" value={money(reg.todayTotals?.cash)} />
                  <Total label="Kart" value={money(reg.todayTotals?.card)} />
                  <Total label="Oda" value={money(reg.todayTotals?.roomCharge)} />
                  <Total label="Gider" value={money(reg.todayTotals?.expense)} />
                </View>
              </AppCard>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const Total: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.totalBox}>
    <Text style={styles.totalLabel}>{label}</Text>
    <Text style={styles.totalValue}>{value}</Text>
  </View>
);

const InfoRow: React.FC<{ label: string; value: string; color?: string; strong?: boolean }> = ({ label, value, color, strong }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, strong && { fontWeight: '800' }, color ? { color } : null]}>{value}</Text>
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
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  regTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  regName: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  totalsRow: { flexDirection: 'row', gap: 6, marginTop: spacing.sm },
  totalBox: { flex: 1, backgroundColor: colors.divider, borderRadius: borderRadius.sm, padding: 6 },
  totalLabel: { fontSize: 10, color: colors.textSecondary },
  totalValue: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textPrimary, marginTop: 2 },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  actionBtn: { marginBottom: spacing.sm },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.md, fontSize: fontSize.sm },
  txRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  txTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  txMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  txAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  modalBox: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  modalTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
  modalActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
});

export default CashRegisterScreen;
