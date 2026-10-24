/**
 * CariStatement — Firma / acente cari hesap ekstresi (mobil)
 *
 * Tek doğruluk kaynağı cari defterdir (backend apps/accounting/ledger.py, party.py):
 *   Borç     : folio bakiyesinin cariye aktarılması (check-out veya "Cariye Borçlu Aktarım")
 *   Tahsilat : ödeme (yöntemiyle); en eski açık borçtan başlayarak kapatır, fazlası avans kalır
 *   Bakiye   = Σ borç − Σ alacak  (>0 bize borçlu, <0 avans)
 * Konaklayan misafirlerin açık folio bakiyesi henüz cariye aktarılmadığı için borç değildir;
 * bilgi olarak ayrıca gösterilir.
 *
 * İşlemler: "Tahsilat Al" (genel — en eski borçtan, fazlası avans), tahsilat satırında "İptal"
 * (muhasebe / yönetim). Belirli konaklamalara tahsilat borç kutucuklarından (DebtCards) yapılır.
 * Tahsilat rezervasyon foliosuna yazılmaz.
 * Kaydırma kapsayan ekranın ScrollView'ındadır; bu bileşen düz View döner.
 * Web karşılığı: grandhotel-web/src/components/debtors/AccountTransactionTable.tsx
 */

import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { companiesApi, agenciesApi, accountTransactionsApi } from '../../services/api';
import type { CariDebtDetail, CariStatementRow } from '../../services/api';
import { FOLIO_PAYMENT_METHOD_LABELS } from '../../utils/constants';
import { hasAnyRole, ACCOUNTING_ROLES } from '../../utils/permissions';
import { deferAlert } from '../../utils/alert';
import useAuth from '../../hooks/useAuth';
import CariPaymentModal, { CariPaymentValues } from './CariPaymentModal';

interface Props {
  kind: 'company' | 'agency';
  partyId: number;
  /** Bakiye değişince (liste rozetlerini / borç kutucuklarını tazelemek için) */
  onChanged?: () => void;
  /** Dışarıdan değişince yeniden yüklenir (ör. borç kutucuklarından tahsilat) */
  reloadToken?: number;
}

const num = (v: string | number | null | undefined) => Number(v ?? 0) || 0;
const money = (v: string | number | null | undefined) =>
  `₺${num(v).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const CariStatement: React.FC<Props> = ({ kind, partyId, onChanged, reloadToken }) => {
  const { user } = useAuth();
  const canCancelPayment = hasAnyRole(user, ACCOUNTING_ROLES);
  const [detail, setDetail] = useState<CariDebtDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const api = kind === 'company' ? companiesApi : agenciesApi;
      setDetail(await api.getDebtDetail(partyId));
    } catch (err) {
      setError((err as Error).message || 'Cari ekstre yüklenemedi');
    } finally {
      setLoading(false);
    }
  }, [kind, partyId]);

  useEffect(() => { load(); }, [load, reloadToken]);

  const afterChange = () => {
    load();
    onChanged?.();
  };

  const handleSubmit = async (values: CariPaymentValues) => {
    if (kind === 'company') {
      await companiesApi.addPayment(partyId, values);
    } else {
      await agenciesApi.addPayment(partyId, values);
    }
    setCollectOpen(false);
    deferAlert('Başarılı', `${money(values.amount)} tahsilat kaydedildi.`);
    afterChange();
  };

  const handleCancelPayment = (tx: CariStatementRow) => {
    Alert.alert(
      'Tahsilat İptali',
      `${money(tx.amount)} tahsilat iptal edilsin mi? Kapattığı borçlar tekrar açılır.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'İptal Et',
          style: 'destructive',
          onPress: async () => {
            try {
              await accountTransactionsApi.cancelPayment(tx.id);
              Alert.alert('Başarılı', 'Tahsilat iptal edildi.');
              afterChange();
            } catch (err) {
              Alert.alert('Hata', (err as Error).message || 'Tahsilat iptal edilemedi');
            }
          },
        },
      ],
    );
  };

  if (loading && !detail) {
    return <ActivityIndicator style={{ marginVertical: spacing.lg }} color={colors.primary} />;
  }
  if (error || !detail) {
    return (
      <AppCard style={styles.card}>
        <Text style={styles.errorText}>{error || 'Cari ekstre yüklenemedi'}</Text>
        <AppButton title="Tekrar Dene" variant="outline" onPress={load} style={{ marginTop: spacing.sm }} />
      </AppCard>
    );
  }

  const { summary } = detail;
  const balance = num(summary.balance);

  return (
    <View>
      {/* Özet */}
      <AppCard style={[styles.card, { borderLeftWidth: 4, borderLeftColor: balance > 0 ? colors.error : colors.success }]}>
        <View style={styles.sectionHeader}>
          <Ionicons name="wallet-outline" size={20} color={balance > 0 ? colors.error : colors.success} />
          <Text style={styles.sectionTitle}>Cari Hesap</Text>
        </View>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Bakiye</Text>
            <Text style={[styles.summaryValue, { color: balance > 0 ? colors.error : balance < 0 ? colors.success : colors.textPrimary }]}>
              {money(balance)}
            </Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Açık Borç</Text>
            <Text style={styles.summaryValue}>{money(summary.openDebit)}</Text>
          </View>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>Avans</Text>
            <Text style={[styles.summaryValue, { color: colors.success }]}>{money(summary.unallocatedCredit)}</Text>
          </View>
        </View>
        {num(summary.inHouseBalance) > 0 && (
          <Text style={styles.infoText}>
            Konaklayan misafirlerin açık hesabı: {money(summary.inHouseBalance)} (çıkışta cariye aktarılır)
          </Text>
        )}
        {summary.revenue !== undefined && (
          <Text style={styles.infoText}>
            Gerçekleşen ciro: {money(summary.revenue)} · Komisyon: {money(summary.commission)}
          </Text>
        )}
        <AppButton
          title="Tahsilat Al"
          icon="cash-outline"
          onPress={() => setCollectOpen(true)}
          style={{ marginTop: spacing.sm }}
        />
      </AppCard>

      {/* Konaklayanlar (henüz cariye aktarılmadı) */}
      {detail.inHouse.length > 0 && (
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="bed-outline" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Konaklayanlar ({detail.inHouse.length})</Text>
          </View>
          {detail.inHouse.map((r) => (
            <View key={r.id} style={styles.inHouseRow}>
              <View style={styles.roomBadge}><Text style={styles.roomBadgeText}>{r.roomNumber}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>{r.guestNames || '—'}</Text>
                <Text style={styles.rowSub}>{formatDate(r.checkIn)} → {formatDate(r.checkOut)}</Text>
              </View>
              <Text style={styles.rowAmount}>{money(r.balance)}</Text>
            </View>
          ))}
        </AppCard>
      )}

      {/* Hareketler — en yeni üstte, yürüyen bakiye */}
      <View style={styles.sectionHeader}>
        <Ionicons name="list-outline" size={20} color={colors.primary} />
        <Text style={styles.sectionTitle}>Cari Hareketler ({detail.transactions.length})</Text>
      </View>
      {detail.transactions.length === 0 ? (
        <Text style={styles.emptyText}>Cari hareket yok</Text>
      ) : (
        detail.transactions.map((tx) => {
          const isCredit = tx.type === 'credit';
          const isPayment = isCredit && !tx.sourceFolioItemId;
          const open = tx.status === 'open';
          const label = isPayment ? 'Tahsilat' : isCredit ? 'Alacak' : 'Borç';
          return (
            <AppCard key={tx.id} style={styles.txCard}>
              <View style={styles.txHeader}>
                <View style={[styles.typeBadge, { backgroundColor: (isCredit ? colors.success : colors.error) + '18' }]}>
                  <Text style={[styles.typeText, { color: isCredit ? colors.success : colors.error }]}>{label}</Text>
                </View>
                <Text style={styles.rowSub}>{formatDate(tx.createdAt)}</Text>
                <Text style={[styles.txAmount, { color: isCredit ? colors.success : colors.error }]}>
                  {isCredit ? '−' : '+'}{money(tx.amount)}
                </Text>
              </View>
              <Text style={styles.rowTitle} numberOfLines={2}>
                {tx.description || '—'}
                {tx.paymentMethod ? ` · ${FOLIO_PAYMENT_METHOD_LABELS[tx.paymentMethod] || tx.paymentMethod}` : ''}
              </Text>
              {!!tx.roomNumber && (
                <Text style={styles.rowSub}>Oda {tx.roomNumber}{tx.guestName ? ` · ${tx.guestName}` : ''}</Text>
              )}
              <View style={styles.txFooter}>
                <Text style={styles.rowSub}>
                  {open ? `Kalan: ${money(tx.remaining)}` : 'Kapandı'} · Bakiye: {money(tx.runningBalance)}
                </Text>
                {isPayment && canCancelPayment && (
                  <TouchableOpacity style={[styles.actionBtn, { borderColor: colors.error }]} onPress={() => handleCancelPayment(tx)}>
                    <Text style={[styles.actionText, { color: colors.error }]}>İptal</Text>
                  </TouchableOpacity>
                )}
              </View>
            </AppCard>
          );
        })
      )}

      <CariPaymentModal
        visible={collectOpen}
        title="Tahsilat Al"
        hint={`Cari bakiye: ${money(balance)}. En eski açık borçtan başlayarak kapatılır; fazlası avans kalır.`}
        defaultAmount={balance}
        defaultDescription="Cari tahsilat"
        onClose={() => setCollectOpen(false)}
        onSubmit={handleSubmit}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: { marginBottom: spacing.md },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: spacing.sm },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  summaryItem: {
    flex: 1, alignItems: 'center', paddingVertical: spacing.sm,
    backgroundColor: colors.divider, borderRadius: borderRadius.sm,
  },
  summaryLabel: { fontSize: fontSize.xs, color: colors.textSecondary, marginBottom: 4 },
  summaryValue: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  infoText: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.sm },
  inHouseRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  roomBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: 10, paddingVertical: 4, borderRadius: borderRadius.sm },
  roomBadgeText: { fontSize: fontSize.sm, fontWeight: '800', color: colors.primary },
  rowTitle: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  rowAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  txCard: { marginBottom: spacing.sm },
  txHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: borderRadius.sm },
  typeText: { fontSize: fontSize.xs, fontWeight: '700' },
  txAmount: { marginLeft: 'auto', fontSize: fontSize.md, fontWeight: '800' },
  txFooter: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  actionBtn: {
    marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.primary,
  },
  actionText: { fontSize: fontSize.xs, fontWeight: '700', color: colors.primary },
  errorText: { fontSize: fontSize.sm, color: colors.error },
  emptyText: { fontSize: fontSize.sm, color: colors.textDisabled, textAlign: 'center', paddingVertical: spacing.md, fontStyle: 'italic' },
});

export default CariStatement;
