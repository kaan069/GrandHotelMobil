/**
 * DebtCards — Borç kutucukları (firma / acente / şahıs), mobil
 *
 * Borçlunun açık borçları konaklama başına ayrı kart (backend GET /account-transactions/open_debts/):
 * oda, misafir, tarih / gece, borç – ödenen – kalan, folio dökümü (kategori özeti + "Folio ▾" ile
 * tüm kalemler) ve bu borca yapılmış kısmi tahsilatlar.
 *
 * Tahsilat: karta dokununca seçilir → "Seçilenleri Tahsil Et", ya da karttaki "Tahsilat".
 * Tutar seçili kartların kalanını aşamaz (kısmi olabilir); önce en eski konaklama kapanır.
 * Kapanan kart listeden düşer, kalanlar açık kalır (ör. ikisi bugün, üçüncüsü haftaya).
 * Kaydırma kapsayan ekranın ScrollView'ındadır; bu bileşen düz View döner.
 * Web karşılığı: grandhotel-web/src/components/debtors/DebtCards.tsx
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { accountTransactionsApi } from '../../services/api';
import type { CariDebtCard, CariOpenDebtsResponse } from '../../services/api';
import { FOLIO_CATEGORY_LABELS, FOLIO_PAYMENT_METHOD_LABELS } from '../../utils/constants';
import { isFolioDeductionRow } from '../../utils/folio';
import { deferAlert } from '../../utils/alert';
import CariPaymentModal, { CariPaymentValues } from './CariPaymentModal';

interface Props {
  /** Tek hedef: { company } | { agency } | { guest } */
  target: { company?: number; agency?: number; guest?: number };
  title?: string;
  /** Tahsilattan sonra (ekstre / liste tazelensin) */
  onChanged?: () => void;
  /** Dışarıdan değişince yeniden yüklenir (ör. ekstrede tahsilat iptal edildi) */
  reloadToken?: number;
}

const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
const money = (v: string | number | null | undefined) =>
  `₺${num(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

/** Folio özetinde gösterim sırası ve kart bağlamındaki etiketler */
const CATEGORY_ORDER = [
  'room_charge', 'minibar', 'restaurant', 'service', 'discount', 'payment',
  'account_transfer_credit', 'account_transfer_debit',
];
const CARD_CATEGORY_LABELS: Record<string, string> = {
  payment: 'Otelde ödenen',
  account_transfer_debit: 'Cariye aktarılan',
};

const DebtCards: React.FC<Props> = ({ target, title = 'Açık Borçlar', onChanged, reloadToken }) => {
  const [data, setData] = useState<CariOpenDebtsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  /** Tahsilat penceresindeki kartlar (null → kapalı) */
  const [payCards, setPayCards] = useState<CariDebtCard[] | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await accountTransactionsApi.getOpenDebts(target);
      setData(res);
      // Kapanan kartlar seçimden düşer
      setSelected((prev) => prev.filter((k) => res.debts.some((d) => d.key === k)));
    } catch (err) {
      setError((err as Error).message || 'Açık borçlar yüklenemedi');
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.company, target.agency, target.guest]);

  useEffect(() => { load(); }, [load, reloadToken]);

  const debts = data?.debts ?? [];
  const selectedCards = debts.filter((d) => selected.includes(d.key));
  const selectedTotal = selectedCards.reduce((s, d) => s + num(d.remaining), 0);
  const allSelected = debts.length > 0 && selected.length === debts.length;

  const toggleSelect = (key: string) =>
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  const toggleExpand = (key: string) =>
    setExpanded((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const payTotal = (payCards ?? []).reduce((s, d) => s + num(d.remaining), 0);
  const payRooms = (payCards ?? []).map((d) => (d.roomNumber ? `Oda ${d.roomNumber}` : 'Cari borç')).join(', ');

  const handlePay = async (values: CariPaymentValues) => {
    if (!payCards) return;
    await accountTransactionsApi.collect({
      companyId: target.company, agencyId: target.agency, guestId: target.guest,
      ...values,
      debitIds: payCards.flatMap((d) => d.debitIds),
    });
    setPayCards(null);
    setSelected([]);
    deferAlert('Başarılı', `${money(values.amount)} tahsilat kaydedildi.`);
    load();
    onChanged?.();
  };

  if (loading && !data) {
    return <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />;
  }
  if (error && !data) {
    return (
      <AppCard style={styles.card}>
        <Text style={styles.errorText}>{error}</Text>
        <AppButton title="Tekrar Dene" variant="outline" onPress={load} style={{ marginTop: spacing.sm }} />
      </AppCard>
    );
  }

  const advance = num(data?.summary.unallocatedCredit);

  return (
    <View>
      {/* Başlık + özet */}
      <View style={styles.sectionHeader}>
        <Ionicons name="albums-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.headerMeta}>
          {debts.length} konaklama · {money(data?.summary.openDebit)}
        </Text>
      </View>
      {advance > 0 && <Text style={styles.advanceText}>Kullanılmamış avans: {money(advance)}</Text>}

      {debts.length === 0 ? (
        <AppCard style={styles.card}>
          <View style={styles.emptyRow}>
            <Ionicons name="checkmark-circle-outline" size={22} color={colors.success} />
            <Text style={styles.emptyText}>Açık borç yok</Text>
          </View>
        </AppCard>
      ) : (
        <>
          {/* Toplu seçim / tahsilat */}
          <View style={styles.bulkRow}>
            {debts.length > 1 && (
              <TouchableOpacity onPress={() => setSelected(allSelected ? [] : debts.map((d) => d.key))}>
                <Text style={styles.linkText}>{allSelected ? 'Seçimi kaldır' : 'Tümünü seç'}</Text>
              </TouchableOpacity>
            )}
            <AppButton
              title={selectedCards.length
                ? `Seçilenleri Tahsil Et (${selectedCards.length} · ${money(selectedTotal)})`
                : 'Tahsil etmek için kart seçin'}
              icon="cash-outline"
              onPress={() => setPayCards(selectedCards)}
              disabled={selectedCards.length === 0}
              style={styles.bulkBtn}
            />
          </View>

          {debts.map((d) => {
            const isSelected = selected.includes(d.key);
            const isOpen = expanded.includes(d.key);
            const amount = num(d.amount);
            const settled = num(d.settled);
            const categories = d.folio ? CATEGORY_ORDER.filter((c) => d.folio!.byCategory[c] !== undefined) : [];
            return (
              <AppCard
                key={d.key}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => toggleSelect(d.key)}
              >
                {/* Oda + seçim */}
                <View style={styles.cardTop}>
                  <Ionicons
                    name={isSelected ? 'checkbox' : 'square-outline'}
                    size={22}
                    color={isSelected ? colors.primary : colors.textDisabled}
                  />
                  <View style={styles.roomBadge}>
                    <Text style={styles.roomBadgeText}>{d.roomNumber ? `Oda ${d.roomNumber}` : 'Cari Borç'}</Text>
                  </View>
                  {settled > 0 && (
                    <View style={styles.partialBadge}><Text style={styles.partialText}>Kısmi ödendi</Text></View>
                  )}
                  <Text style={styles.remaining}>{money(d.remaining)}</Text>
                </View>
                {!!d.guestNames && <Text style={styles.guestNames} numberOfLines={2}>{d.guestNames}</Text>}
                <Text style={styles.meta}>
                  {d.checkIn
                    ? `${formatDate(d.checkIn)} → ${formatDate(d.checkOut)} · ${d.nights} gece`
                    : `${formatDate(d.firstDebitAt)} · ${d.descriptions.join(', ') || 'Cari borç'}`}
                </Text>

                {/* Kısmi ödeme ilerlemesi */}
                {settled > 0 && (
                  <View style={{ marginTop: spacing.sm }}>
                    <View style={styles.progressTrack}>
                      <View style={[styles.progressFill, { width: `${amount > 0 ? Math.min(100, (settled / amount) * 100) : 0}%` }]} />
                    </View>
                    <Text style={styles.meta}>Borç {money(amount)} · Ödenen {money(settled)}</Text>
                  </View>
                )}

                {/* Folio özeti */}
                {categories.length > 0 && (
                  <View style={styles.folioBox}>
                    {categories.map((c) => (
                      <View key={c} style={styles.folioRow}>
                        <Text style={styles.folioLabel}>{CARD_CATEGORY_LABELS[c] || FOLIO_CATEGORY_LABELS[c] || c}</Text>
                        <Text style={styles.folioValue}>
                          {isFolioDeductionRow(c) ? '−' : ''}{money(d.folio!.byCategory[c])}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Tüm folio kalemleri */}
                {d.folio && d.folio.items.length > 0 && (
                  <>
                    <TouchableOpacity style={styles.expandBtn} onPress={() => toggleExpand(d.key)}>
                      <Text style={styles.linkText}>Folio detayı ({d.folio.items.length} kalem)</Text>
                      <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
                    </TouchableOpacity>
                    {isOpen && d.folio.items.map((f) => (
                      <View key={f.id} style={styles.itemRow}>
                        <Text style={styles.itemDate}>{formatDate(f.date)}</Text>
                        <Text style={styles.itemDesc} numberOfLines={1}>
                          {f.description}
                          {f.paymentMethod ? ` · ${FOLIO_PAYMENT_METHOD_LABELS[f.paymentMethod] || f.paymentMethod}` : ''}
                        </Text>
                        <Text style={styles.folioValue}>
                          {isFolioDeductionRow(f.category) ? '−' : ''}{money(f.amount)}
                        </Text>
                      </View>
                    ))}
                  </>
                )}

                {/* Bu borca yapılan tahsilatlar */}
                {d.payments.length > 0 && (
                  <View style={styles.paymentsBox}>
                    <Text style={styles.paymentsTitle}>Tahsilatlar</Text>
                    {d.payments.map((p, i) => (
                      <View key={i} style={styles.folioRow}>
                        <Text style={styles.folioLabel}>
                          {formatDate(p.date)} · {p.isTransfer ? 'Alacak mahsubu' : FOLIO_PAYMENT_METHOD_LABELS[p.paymentMethod] || p.paymentMethod || '—'}
                        </Text>
                        <Text style={[styles.folioValue, { color: colors.success }]}>{money(p.amount)}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <AppButton
                  title="Tahsilat"
                  variant="outline"
                  icon="cash-outline"
                  onPress={() => setPayCards([d])}
                  style={{ marginTop: spacing.sm }}
                />
              </AppCard>
            );
          })}
        </>
      )}

      <CariPaymentModal
        visible={!!payCards}
        title={payCards && payCards.length > 1 ? `Tahsilat — ${payCards.length} konaklama` : 'Borca Tahsilat'}
        hint={payCards
          ? `${payRooms} — kalan ${money(payTotal)}. Kısmi tutar girilebilir; önce en eski konaklama kapanır.`
          : undefined}
        defaultAmount={payTotal}
        maxAmount={payCards ? payTotal : undefined}
        defaultDescription={payCards ? `Tahsilat — ${payRooms}` : ''}
        onClose={() => setPayCards(null)}
        onSubmit={handlePay}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  headerMeta: { marginLeft: 'auto', fontSize: fontSize.sm, fontWeight: '700', color: colors.error },
  advanceText: { fontSize: fontSize.xs, color: colors.success, marginBottom: spacing.sm },
  bulkRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  bulkBtn: { flex: 1 },
  card: { marginBottom: spacing.sm },
  cardSelected: { borderWidth: 2, borderColor: colors.primary },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  roomBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.sm },
  roomBadgeText: { fontSize: fontSize.md, fontWeight: '800', color: colors.primary },
  partialBadge: { backgroundColor: colors.warning + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: borderRadius.sm },
  partialText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.warning },
  remaining: { marginLeft: 'auto', fontSize: fontSize.lg, fontWeight: '800', color: colors.error },
  guestNames: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginTop: 6 },
  meta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  progressTrack: { height: 6, borderRadius: 3, backgroundColor: colors.divider, overflow: 'hidden', marginBottom: 2 },
  progressFill: { height: 6, backgroundColor: colors.success },
  folioBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  folioRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  folioLabel: { fontSize: fontSize.xs, color: colors.textSecondary },
  folioValue: { fontSize: fontSize.xs, fontWeight: '600', color: colors.textPrimary },
  expandBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  itemDate: { fontSize: fontSize.xs, color: colors.textSecondary, width: 72 },
  itemDesc: { flex: 1, fontSize: fontSize.xs, color: colors.textPrimary },
  paymentsBox: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.divider },
  paymentsTitle: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  linkText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  emptyRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  emptyText: { fontSize: fontSize.sm, color: colors.textSecondary },
  errorText: { fontSize: fontSize.sm, color: colors.error },
});

export default DebtCards;
