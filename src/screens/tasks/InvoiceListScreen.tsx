/**
 * InvoiceListScreen — Fatura Listesi + Fatura Detayı
 *
 * Liste: durum filtresi + müşteri / fatura no / VKN araması (sunucuda), sonsuz kaydırma.
 * Detay: belge bilgileri, müşteri, kalemler, toplamlar; işlemler:
 *   - PDF görüntüle (tamamlanan)
 *   - Tekrar Gönder (taslak / hatalı → Paraşüt)
 *   - Durum Sorgula (Paraşüt'te işleniyor)
 *   - İptal (sadece taslak / hatalı — resmîleşmiş belge Paraşüt'ten iptal edilir)
 * Web karşılığı: pages/invoices/InvoiceList.tsx
 *
 * API: invoicesApi.listPage / get / send / checkStatus / cancel
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip, EmptyState, LoadingState, LoadMoreFooter } from '../../components/common';
import usePagedList from '../../hooks/usePagedList';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import InvoicePdfModal from '../../components/tasks/InvoicePdfModal';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  INVOICE_STATUS_LABELS, INVOICE_STATUS_COLORS, INVOICE_TYPE_LABELS, INVOICE_DOCUMENT_TYPE_LABELS,
} from '../../utils/constants';
import { invoicesApi, ApiInvoice } from '../../services/api';

interface InvoiceListScreenProps {
  onClose: () => void;
}

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Tümü' },
  { value: 'completed', label: INVOICE_STATUS_LABELS.completed },
  { value: 'processing', label: INVOICE_STATUS_LABELS.processing },
  { value: 'failed', label: INVOICE_STATUS_LABELS.failed },
  { value: 'draft', label: INVOICE_STATUS_LABELS.draft },
  { value: 'cancelled', label: INVOICE_STATUS_LABELS.cancelled },
];

const money = (v: string | number) =>
  `₺${Number(v || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const formatDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—';

const InvoiceListScreen: React.FC<InvoiceListScreenProps> = ({ onClose }) => {
  const [status, setStatus] = useState('all');
  const [query, setQuery] = useState('');
  const search = useDebouncedValue(query.trim());

  const [selected, setSelected] = useState<ApiInvoice | null>(null);
  const [busy, setBusy] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  /* Faturalar sayfa sayfa; durum / arama değişince baştan */
  const list = usePagedList(
    (page, pageSize) => invoicesApi.listPage({
      page, pageSize, status: status === 'all' ? undefined : status, search: search || undefined,
    }),
    [status, search],
  );

  /* Detaydaki işlemler — sonuç faturası ekranda ve listede güncellenir */
  const runAction = async (action: () => Promise<ApiInvoice>, successMessage?: (inv: ApiInvoice) => string) => {
    setBusy(true);
    try {
      const updated = await action();
      setSelected(updated);
      list.setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      if (successMessage) Alert.alert('Fatura', successMessage(updated));
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'İşlem yapılamadı');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = (inv: ApiInvoice) => {
    Alert.alert('Faturayı İptal Et', `${inv.invoiceNo || `#${inv.id}`} iptal edilsin mi? Bu işlem geri alınamaz.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'İptal Et', style: 'destructive', onPress: () => runAction(() => invoicesApi.cancel(inv.id), () => 'Fatura iptal edildi.') },
    ]);
  };

  /* ─── DETAY ─── */
  if (selected) {
    const inv = selected;
    const statusColor = INVOICE_STATUS_COLORS[inv.status] || colors.textSecondary;
    const canResend = inv.status === 'draft' || inv.status === 'failed';
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setSelected(null)}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title} numberOfLines={1}>Fatura {inv.invoiceNo || `#${inv.id}`}</Text>
          <StatusChip label={INVOICE_STATUS_LABELS[inv.status] || inv.status} color={statusColor} />
        </View>

        <ScrollView contentContainerStyle={styles.detailContent}>
          {inv.status === 'failed' && !!inv.errorMessage && (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle" size={18} color={colors.error} />
              <Text style={styles.errorText}>{inv.errorMessage}</Text>
            </View>
          )}

          <AppCard style={styles.card}>
            <InfoRow label="Tür" value={INVOICE_TYPE_LABELS[inv.type] || inv.type} />
            <InfoRow label="Belge" value={INVOICE_DOCUMENT_TYPE_LABELS[inv.documentType] || inv.documentType} />
            <InfoRow label="Tarih" value={formatDate(inv.issueDate)} />
            {!!inv.dueDate && <InfoRow label="Vade" value={formatDate(inv.dueDate)} />}
            <InfoRow label="Müşteri" value={inv.customerName} />
            <InfoRow label="Hesap Türü" value={inv.customerType === 'company' ? 'Firma' : 'Şahıs'} />
            {!!inv.taxNumber && <InfoRow label="Vergi / TC No" value={inv.taxNumber} />}
            {!!inv.taxOffice && <InfoRow label="Vergi Dairesi" value={inv.taxOffice} />}
            {!!inv.createdBy && <InfoRow label="Düzenleyen" value={inv.createdBy} />}
          </AppCard>

          <AppCard style={styles.card}>
            <Text style={styles.sectionTitle}>Kalemler</Text>
            {(inv.items || []).map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemDesc}>{item.description}</Text>
                  <Text style={styles.itemMeta}>{Number(item.quantity)} × {money(item.unitPrice)} · KDV %{item.vatRate}</Text>
                </View>
                <Text style={styles.itemTotal}>{money(item.total)}</Text>
              </View>
            ))}
            <InfoRow label="Ara Toplam" value={money(inv.subtotal)} />
            <InfoRow label="KDV" value={money(inv.vatAmount)} />
            {inv.hasAccommodationTax && <InfoRow label="Konaklama Vergisi" value={money(inv.accommodationTaxAmount)} />}
            <InfoRow label="Genel Toplam" value={money(inv.totalAmount)} strong />
          </AppCard>

          {!!inv.pdfUrl && (
            <AppButton title="PDF Görüntüle" icon="document-outline" variant="outline" onPress={() => setShowPdf(true)} style={styles.actionBtn} />
          )}
          {canResend && (
            <AppButton
              title="Paraşüt'e Tekrar Gönder"
              icon="send-outline"
              loading={busy}
              onPress={() => runAction(
                () => invoicesApi.send(inv.id),
                (u) => (u.status === 'failed' ? `Gönderilemedi: ${u.errorMessage || 'bilinmeyen hata'}` : 'Fatura gönderildi.'),
              )}
              style={styles.actionBtn}
            />
          )}
          {inv.status === 'processing' && (
            <AppButton
              title="Durumu Sorgula"
              icon="refresh-outline"
              variant="secondary"
              loading={busy}
              onPress={() => runAction(
                () => invoicesApi.checkStatus(inv.id),
                (u) => `Fatura durumu: ${INVOICE_STATUS_LABELS[u.status] || u.status}`,
              )}
              style={styles.actionBtn}
            />
          )}
          {canResend && (
            <AppButton title="Faturayı İptal Et" icon="close-circle-outline" variant="danger" disabled={busy} onPress={() => handleCancel(inv)} style={styles.actionBtn} />
          )}
          {inv.status === 'completed' && (
            <Text style={styles.hint}>Resmîleşmiş fatura iptal/iade işlemleri Paraşüt üzerinden yapılır.</Text>
          )}
        </ScrollView>

        <InvoicePdfModal
          visible={showPdf}
          pdfUrl={inv.pdfUrl || ''}
          invoiceNo={inv.invoiceNo || ''}
          onClose={() => setShowPdf(false)}
        />
      </View>
    );
  }

  /* ─── LİSTE ─── */

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} color={colors.textPrimary} /></TouchableOpacity>
        <Text style={styles.title}>Faturalar</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipBar} contentContainerStyle={styles.chipScroll}>
        {STATUS_FILTERS.map((f) => (
          <TouchableOpacity key={f.value} style={[styles.chip, status === f.value && styles.chipActive]} onPress={() => setStatus(f.value)}>
            <Text style={[styles.chipText, status === f.value && styles.chipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <View style={styles.searchContainer}>
        <AppInput value={query} onChangeText={setQuery} placeholder="Müşteri, fatura no veya vergi no ara..." icon="search-outline" style={{ marginBottom: 0 }} />
      </View>

      {list.loading && list.items.length === 0 ? (
        <LoadingState message="Faturalar yükleniyor..." />
      ) : (
        <FlatList
          data={list.items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={list.refreshing} onRefresh={list.refresh} colors={[colors.primary]} />}
          onEndReached={list.loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={<LoadMoreFooter loading={list.loadingMore} />}
          ListEmptyComponent={<EmptyState icon="receipt-outline" title={list.error || 'Fatura bulunamadı'} />}
          renderItem={({ item }) => (
            <AppCard style={styles.itemCard} onPress={() => setSelected(item)}>
              <View style={styles.cardTop}>
                <Text style={styles.cardNo}>{item.invoiceNo || `#${item.id}`}</Text>
                <StatusChip label={INVOICE_STATUS_LABELS[item.status] || item.status} color={INVOICE_STATUS_COLORS[item.status] || colors.textSecondary} />
              </View>
              <Text style={styles.cardCustomer} numberOfLines={1}>{item.customerName}</Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardMeta}>
                  {formatDate(item.issueDate)} · {INVOICE_DOCUMENT_TYPE_LABELS[item.documentType] || item.documentType}
                </Text>
                <Text style={styles.cardTotal}>{money(item.totalAmount)}</Text>
              </View>
            </AppCard>
          )}
        />
      )}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; strong?: boolean }> = ({ label, value, strong }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={[styles.infoValue, strong && { color: colors.primary, fontWeight: '800' }]}>{value}</Text>
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
  chipBar: { flexGrow: 0, marginTop: spacing.sm },
  chipScroll: { paddingHorizontal: spacing.md, gap: spacing.sm },
  chip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: borderRadius.full,
    borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textWhite, fontWeight: '700' },
  searchContainer: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  list: { padding: spacing.md, paddingBottom: 100 },
  itemCard: { marginBottom: spacing.sm },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardNo: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  cardCustomer: { fontSize: fontSize.sm, color: colors.textPrimary, marginTop: 4 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  cardMeta: { fontSize: fontSize.xs, color: colors.textSecondary },
  cardTotal: { fontSize: fontSize.md, fontWeight: '800', color: colors.textPrimary },
  detailContent: { padding: spacing.md, paddingBottom: 100 },
  card: { marginBottom: spacing.md },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.sm },
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm,
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider,
  },
  infoLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  infoValue: { flexShrink: 1, textAlign: 'right', fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.divider },
  itemDesc: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  itemMeta: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  itemTotal: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: spacing.sm, marginBottom: spacing.md,
    borderRadius: borderRadius.md, backgroundColor: colors.error + '15',
  },
  errorText: { flex: 1, fontSize: fontSize.sm, color: colors.error },
  actionBtn: { marginBottom: spacing.sm },
  hint: { fontSize: fontSize.xs, color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs },
});

export default InvoiceListScreen;
