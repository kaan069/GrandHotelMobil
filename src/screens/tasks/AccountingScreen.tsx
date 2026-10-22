/**
 * AccountingScreen — Muhasebe (patron / müdür / muhasebe)
 *
 * Üç sekme:
 *   1. Özet — açık borç / alacak (tüm cariler) + bu ay gelir / gider / net
 *   2. Gelir-Gider — tarih aralığı; gelir (indirimler düşülmüş) / gider / net,
 *      kategori kırılımı, gider defteri (ekle / sil)
 *   3. Şahıs Carileri — açık cari bakiyesi olan misafirler (tahsilat "Borçlular" ekranından)
 * Web karşılığı: pages/accounting/AccountingDashboard.tsx, IncomeExpense.tsx, GuestDebtors.tsx
 *
 * API: accountingApi.summary / incomeExpense / listExpenses / createExpense / deleteExpense / guestDebtors
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  AppCard, AppButton, AppInput, LoadingState, EmptyState, OptionPickerModal, parseAmount,
} from '../../components/common';
import CalendarPicker from '../../components/common/CalendarPicker';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, FOLIO_CATEGORY_LABELS } from '../../utils/constants';
import {
  accountingApi, AccountingSummary, IncomeExpenseSummary, ApiExpense, GuestDebtor,
} from '../../services/api';

interface AccountingScreenProps {
  onClose: () => void;
}

type TabKey = 'summary' | 'income' | 'guests';

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const formatDay = (s: string) =>
  new Date(s + 'T00:00:00').toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' });

const labelOf = (list: { value: string; label: string }[], value: string) =>
  list.find((o) => o.value === value)?.label || value;

const AccountingScreen: React.FC<AccountingScreenProps> = ({ onClose }) => {
  const [tab, setTab] = useState<TabKey>('summary');
  const [refreshing, setRefreshing] = useState(false);

  /* Özet */
  const [summary, setSummary] = useState<AccountingSummary | null>(null);

  /* Gelir-Gider */
  const today = new Date();
  const [dateFrom, setDateFrom] = useState(localDate(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [dateTo, setDateTo] = useState(localDate(today));
  const [calendarTarget, setCalendarTarget] = useState<'from' | 'to' | 'expense' | null>(null);
  const [ie, setIe] = useState<IncomeExpenseSummary | null>(null);
  const [expenses, setExpenses] = useState<ApiExpense[]>([]);

  /* Şahıs carileri */
  const [guestDebtors, setGuestDebtors] = useState<{ items: GuestDebtor[]; count: number; totalBalance: string } | null>(null);

  const [loading, setLoading] = useState(true);

  /* Gider formu */
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [expForm, setExpForm] = useState({ category: 'other', amount: '', date: localDate(today), description: '', vendor: '', paymentMethod: 'cash' });
  const [picker, setPicker] = useState<'category' | 'method' | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      if (tab === 'summary') setSummary(await accountingApi.summary());
      else if (tab === 'income') {
        const [ieData, expData] = await Promise.all([
          accountingApi.incomeExpense({ dateFrom, dateTo }),
          accountingApi.listExpenses({ dateFrom, dateTo }),
        ]);
        setIe(ieData);
        setExpenses(expData);
      } else setGuestDebtors(await accountingApi.guestDebtors());
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Veriler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [tab, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const openExpenseForm = () => {
    setExpForm({ category: 'other', amount: '', date: localDate(new Date()), description: '', vendor: '', paymentMethod: 'cash' });
    setExpenseOpen(true);
  };

  const saveExpense = async () => {
    const amount = parseAmount(expForm.amount);
    if (amount <= 0) { Alert.alert('Uyarı', 'Geçerli bir tutar girin.'); return; }
    setSaving(true);
    try {
      await accountingApi.createExpense({
        category: expForm.category,
        amount: amount.toFixed(2),
        date: expForm.date,
        description: expForm.description.trim() || undefined,
        vendor: expForm.vendor.trim() || undefined,
        paymentMethod: expForm.paymentMethod,
      });
      setExpenseOpen(false);
      load();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Gider kaydedilemedi');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = (e: ApiExpense) => {
    Alert.alert('Gideri Sil', `${e.categoryLabel} — ${money(e.amount)} silinsin mi?`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await accountingApi.deleteExpense(e.id);
            load();
          } catch (err) {
            Alert.alert('Hata', (err as Error).message || 'Silinemedi');
          }
        },
      },
    ]);
  };

  const renderSummary = () => (
    <>
      <StatRow label="Toplam Borç (bize borçlular)" value={money(summary?.openDebit || 0)} color={colors.error} />
      <StatRow label="Toplam Alacak" value={money(summary?.openCredit || 0)} color={colors.success} />
      <StatRow label="Net Alacak" value={money(summary?.netReceivable || 0)} />
      <StatRow label="Bu Ay Gelir" value={money(summary?.monthIncome || 0)} color={colors.success} />
      <StatRow label="Bu Ay Gider" value={money(summary?.monthExpense || 0)} color={colors.error} />
      <StatRow label="Bu Ay Net" value={money(summary?.monthNet || 0)} />
      <Text style={styles.hint}>Gelir indirimler düşülerek hesaplanır. Cari tahsilatları "Borçlular" ekranından yapılır.</Text>
    </>
  );

  const renderIncome = () => (
    <>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('from')}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.dateChipText}>{formatDay(dateFrom)}</Text>
        </TouchableOpacity>
        <Text style={styles.dateSep}>→</Text>
        <TouchableOpacity style={styles.dateChip} onPress={() => setCalendarTarget('to')}>
          <Ionicons name="calendar-outline" size={14} color={colors.primary} />
          <Text style={styles.dateChipText}>{formatDay(dateTo)}</Text>
        </TouchableOpacity>
      </View>

      <AppCard style={styles.card}>
        <InfoRow label="Gelir (net)" value={money(ie?.income || 0)} color={colors.success} strong />
        {Number(ie?.discounts || 0) > 0 && (
          <Text style={styles.subNote}>Brüt {money(ie?.grossIncome || 0)} − İndirim {money(ie?.discounts || 0)}</Text>
        )}
        <InfoRow label="Gider" value={money(ie?.expense || 0)} color={colors.error} strong />
        <InfoRow label="Net" value={money(ie?.net || 0)} strong />
      </AppCard>

      {!!ie?.incomeByCategory.length && (
        <AppCard style={styles.card}>
          <Text style={styles.sectionTitle}>Gelir Kırılımı</Text>
          {ie.incomeByCategory.map((c) => (
            <InfoRow key={c.category} label={FOLIO_CATEGORY_LABELS[c.category] || c.category} value={money(c.total)} />
          ))}
        </AppCard>
      )}

      <AppCard style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { flex: 1, marginBottom: 0 }]}>Giderler ({expenses.length})</Text>
          <TouchableOpacity style={styles.addBtn} onPress={openExpenseForm}>
            <Ionicons name="add" size={18} color={colors.textWhite} />
            <Text style={styles.addBtnText}>Gider Ekle</Text>
          </TouchableOpacity>
        </View>
        {expenses.length === 0 ? (
          <Text style={styles.emptyText}>Bu aralıkta gider yok</Text>
        ) : (
          expenses.map((e) => (
            <TouchableOpacity key={e.id} style={styles.expenseRow} onLongPress={() => deleteExpense(e)} activeOpacity={0.7}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{e.categoryLabel}{e.vendor ? ` · ${e.vendor}` : ''}</Text>
                <Text style={styles.expenseMeta}>
                  {formatDay(e.date)} · {e.paymentMethodLabel}{e.description ? ` · ${e.description}` : ''}
                </Text>
              </View>
              <Text style={styles.expenseAmount}>{money(e.amount)}</Text>
            </TouchableOpacity>
          ))
        )}
        {expenses.length > 0 && <Text style={styles.hint}>Silmek için gidere uzun basın.</Text>}
      </AppCard>
    </>
  );

  const renderGuests = () => (
    <>
      <AppCard style={styles.card}>
        <InfoRow label="Toplam Borç" value={money(guestDebtors?.totalBalance || 0)} color={colors.error} strong />
        <InfoRow label="Misafir" value={`${guestDebtors?.count || 0}`} />
      </AppCard>
      {(guestDebtors?.items || []).length === 0 ? (
        <EmptyState icon="checkmark-done-outline" title="Açık şahıs carisi yok" />
      ) : (
        guestDebtors!.items.map((g) => (
          <AppCard key={g.id} style={styles.card}>
            <View style={styles.guestRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.expenseTitle}>{g.name}</Text>
                <Text style={styles.expenseMeta}>{g.phone || '—'}{g.tcNo ? ` · TC ${g.tcNo}` : ''}</Text>
              </View>
              <Text style={[styles.expenseAmount, { color: colors.error }]}>{money(g.balance)}</Text>
            </View>
          </AppCard>
        ))
      )}
      <Text style={styles.hint}>Tahsilat için Görevler → Borçlular ekranını kullanın.</Text>
    </>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Muhasebe</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.segment}>
        {([['summary', 'Özet'], ['income', 'Gelir-Gider'], ['guests', 'Şahıs Carileri']] as [TabKey, string][]).map(([key, label]) => (
          <TouchableOpacity key={key} style={[styles.segmentBtn, tab === key && styles.segmentBtnActive]} onPress={() => setTab(key)}>
            <Text style={[styles.segmentText, tab === key && styles.segmentTextActive]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && !refreshing ? (
        <LoadingState message="Yükleniyor..." />
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />}
        >
          {tab === 'summary' ? renderSummary() : tab === 'income' ? renderIncome() : renderGuests()}
        </ScrollView>
      )}

      {/* Gider ekle */}
      <Modal visible={expenseOpen} animationType="slide" transparent onRequestClose={() => setExpenseOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setExpenseOpen(false)}><Ionicons name="close" size={24} color={colors.textPrimary} /></TouchableOpacity>
              <Text style={styles.modalTitle}>Gider Ekle</Text>
              <View style={{ width: 24 }} />
            </View>
            <ScrollView style={styles.modalForm} keyboardShouldPersistTaps="handled">
              <Text style={styles.label}>Kategori</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setPicker('category')}>
                <Text style={styles.selectorText}>{labelOf(EXPENSE_CATEGORIES, expForm.category)}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <AppInput label="Tutar (₺) *" value={expForm.amount} onChangeText={(v) => setExpForm((p) => ({ ...p, amount: v }))} keyboardType="decimal-pad" icon="cash-outline" />
              <Text style={styles.label}>Tarih</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setCalendarTarget('expense')}>
                <Text style={styles.selectorText}>{formatDay(expForm.date)}</Text>
                <Ionicons name="calendar" size={18} color={colors.primary} />
              </TouchableOpacity>
              <Text style={styles.label}>Ödeme Yöntemi</Text>
              <TouchableOpacity style={styles.selector} onPress={() => setPicker('method')}>
                <Text style={styles.selectorText}>{labelOf(EXPENSE_PAYMENT_METHODS, expForm.paymentMethod)}</Text>
                <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
              <AppInput label="Tedarikçi / Firma" value={expForm.vendor} onChangeText={(v) => setExpForm((p) => ({ ...p, vendor: v }))} icon="storefront-outline" />
              <AppInput label="Açıklama" value={expForm.description} onChangeText={(v) => setExpForm((p) => ({ ...p, description: v }))} multiline />
              <AppButton title="Kaydet" icon="checkmark-circle-outline" onPress={saveExpense} loading={saving} />
              <AppButton title="Vazgeç" variant="outline" onPress={() => setExpenseOpen(false)} style={{ marginTop: spacing.sm, marginBottom: spacing.xl }} />
            </ScrollView>
          </View>
        </View>

        <OptionPickerModal<string>
          visible={picker === 'category'}
          title="Gider Kategorisi"
          options={EXPENSE_CATEGORIES.map((o) => ({ value: o.value, label: o.label }))}
          selectedValue={expForm.category}
          onSelect={(v) => setExpForm((p) => ({ ...p, category: v }))}
          onClose={() => setPicker(null)}
        />
        <OptionPickerModal<string>
          visible={picker === 'method'}
          title="Ödeme Yöntemi"
          options={EXPENSE_PAYMENT_METHODS.map((o) => ({ value: o.value, label: o.label }))}
          selectedValue={expForm.paymentMethod}
          onSelect={(v) => setExpForm((p) => ({ ...p, paymentMethod: v }))}
          onClose={() => setPicker(null)}
        />
        <CalendarPicker
          visible={calendarTarget === 'expense'}
          selectedDate={expForm.date}
          title="Gider Tarihi"
          onSelect={(d) => setExpForm((p) => ({ ...p, date: d }))}
          onClose={() => setCalendarTarget(null)}
        />
      </Modal>

      <CalendarPicker
        visible={calendarTarget === 'from' || calendarTarget === 'to'}
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

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <AppCard style={styles.card}>
    <Text style={styles.statLabel}>{label}</Text>
    <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
  </AppCard>
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
  segment: {
    flexDirection: 'row', backgroundColor: colors.divider, borderRadius: borderRadius.md,
    padding: 3, marginHorizontal: spacing.md, marginTop: spacing.md,
  },
  segmentBtn: { flex: 1, paddingVertical: 8, borderRadius: borderRadius.sm, alignItems: 'center' },
  segmentBtnActive: { backgroundColor: colors.surface },
  segmentText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  segmentTextActive: { color: colors.primary, fontWeight: '700' },
  content: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.sm },
  statLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  statValue: { fontSize: fontSize.xxl, fontWeight: '800', color: colors.textPrimary, marginTop: 4 },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm },
  subNote: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: -2, marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  dateChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  dateChipText: { fontSize: fontSize.sm, color: colors.textPrimary, fontWeight: '600' },
  dateSep: { color: colors.textSecondary },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: borderRadius.md, backgroundColor: colors.primary,
  },
  addBtnText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textWhite },
  emptyText: { textAlign: 'center', color: colors.textDisabled, paddingVertical: spacing.md, fontSize: fontSize.sm },
  expenseRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  expenseTitle: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  expenseMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  expenseAmount: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  guestRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: 6, marginTop: spacing.xs },
  selector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: borderRadius.md, padding: 14, marginBottom: spacing.sm,
  },
  selectorText: { fontSize: fontSize.md, color: colors.textPrimary, fontWeight: '500' },
});

export default AccountingScreen;
