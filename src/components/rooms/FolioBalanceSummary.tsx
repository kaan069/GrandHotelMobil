/**
 * FolioBalanceSummary — folio hesap özeti: Harcama / Ödenen / Borç durumu (mobil)
 *
 * Konaklayan müşterinin borcu her harcamayla (gün sonu oda ücreti, kafe, minibar…) artar;
 * ödeme alındıkça azalır. Kural (backend Reservation.refresh_totals, utils/folio.ts ile aynı):
 *   bakiye > 0 → kırmızı "Borçlu: X ₺"
 *   bakiye = 0 → yeşil "Ödendi"
 *   bakiye < 0 → turuncu "Fazla ödeme — iade: X ₺"
 * Web karşılığı: grandhotel-web/src/components/rooms/FolioBalanceSummary.tsx
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { calcFolioTotals, FolioItemLike } from '../../utils/folio';

const money = (v: number) =>
  `₺${v.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/** Bakiye → durum etiketi + renk (oda kutucuğu ve listelerde de aynı kural) */
export const folioBalanceStatus = (balance: number): { label: string; color: string } => {
  if (balance > 0.004) return { label: `Borçlu: ${money(balance)}`, color: colors.error };
  if (balance < -0.004) return { label: `Fazla ödeme — iade: ${money(-balance)}`, color: colors.warning };
  return { label: 'Ödendi', color: colors.success };
};

interface Props {
  folios: FolioItemLike[];
}

const FolioBalanceSummary: React.FC<Props> = ({ folios }) => {
  const totals = calcFolioTotals(folios);
  const status = folioBalanceStatus(totals.balance);
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.label}>Harcama</Text>
        <Text style={styles.value}>{money(totals.total)}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.label}>Ödenen</Text>
        <Text style={[styles.value, { color: colors.success }]}>{money(totals.payments - totals.creditTransfers)}</Text>
      </View>
      <View style={[styles.statusBox, { borderColor: status.color, backgroundColor: status.color + '14' }]}>
        <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  label: { fontSize: fontSize.sm, color: colors.textSecondary },
  value: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  statusBox: {
    marginTop: spacing.sm, paddingVertical: spacing.sm, borderRadius: borderRadius.md,
    borderWidth: 1, alignItems: 'center',
  },
  statusText: { fontSize: fontSize.md, fontWeight: '800' },
});

export default FolioBalanceSummary;
