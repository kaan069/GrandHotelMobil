/**
 * InvoiceFormModal — Mobilde Paraşüt faturası kesme modalı.
 *
 * Akış:
 *  1. Modal açılınca /api/invoices/prepare/{roomId}/ ile müşteri + folio ön doldur
 *  2. Kullanıcı kalem ekler / düzenler
 *  3. Submit: create → send → poll (web ile aynı pattern)
 *  4. Tamamlanınca onSuccess(pdfUrl, invoiceNo) callback
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput } from '../common';
import { colors, spacing, borderRadius, fontSize } from '../../theme';
import {
  invoicesApi,
  type ApiInvoice,
  type InvoicePrepareResponse,
  type InvoiceCreatePayload,
} from '../../services/api';
import { pollInvoiceStatus } from '../../utils/pollInvoiceStatus';

interface InvoiceFormItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceFormModalProps {
  visible: boolean;
  roomId: number | null;
  roomNumber?: string;
  createdBy?: string;
  onClose: () => void;
  onSuccess: (result: { pdfUrl: string; invoiceNo: string; status: 'completed' | 'timeout' }) => void;
}

type Stage = 'idle' | 'creating' | 'sending' | 'polling';

const DOC_TYPE_BY_CUSTOMER: Record<'individual' | 'company', 'e_archive' | 'e_invoice'> = {
  individual: 'e_archive',
  company: 'e_invoice',
};

const VAT_OPTIONS = [1, 8, 10, 18, 20];

const InvoiceFormModal: React.FC<InvoiceFormModalProps> = ({
  visible,
  roomId,
  roomNumber,
  createdBy,
  onClose,
  onSuccess,
}) => {
  const [prepare, setPrepare] = useState<InvoicePrepareResponse | null>(null);
  const [prepareLoading, setPrepareLoading] = useState(false);
  const [prepareError, setPrepareError] = useState('');

  const [customerType, setCustomerType] = useState<'individual' | 'company'>('individual');
  const [customerName, setCustomerName] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [vatRate, setVatRate] = useState(20);
  const [items, setItems] = useState<InvoiceFormItem[]>([
    { id: 1, description: '', quantity: '1', unitPrice: '0' },
  ]);

  const [stage, setStage] = useState<Stage>('idle');
  const [submissionError, setSubmissionError] = useState('');

  useEffect(() => {
    if (!visible) {
      // Modal kapanınca state'i temizle
      setPrepare(null);
      setPrepareError('');
      setSubmissionError('');
      setStage('idle');
      return;
    }
    if (!roomId) return;

    setPrepareLoading(true);
    setPrepareError('');
    invoicesApi
      .prepare(roomId)
      .then((data) => {
        setPrepare(data);
        setCustomerType(data.customerType);
        setCustomerName(data.customerName || '');
        setTaxNumber(data.taxNumber || '');
        setAddress(data.address || '');
        setNotes(data.notes || '');
        if (data.folioItems && data.folioItems.length > 0) {
          setItems(
            data.folioItems.map((f, idx) => ({
              id: idx + 1,
              description: f.description,
              quantity: '1',
              unitPrice: String(Number(f.amount) || 0),
            }))
          );
        }
      })
      .catch((err: Error) => {
        setPrepareError(err.message || 'Oda bilgileri alınamadı.');
      })
      .finally(() => setPrepareLoading(false));
  }, [visible, roomId]);

  const updateItem = (id: number, field: keyof InvoiceFormItem, value: string) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      { id: prev.length ? Math.max(...prev.map((p) => p.id)) + 1 : 1, description: '', quantity: '1', unitPrice: '0' },
    ]);
  };

  const removeItem = (id: number) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((it) => it.id !== id)));
  };

  const subtotal = items.reduce(
    (sum, it) => sum + (Number(it.quantity) || 0) * (Number(it.unitPrice) || 0),
    0
  );
  const vatAmount = (subtotal * vatRate) / 100;
  const total = subtotal + vatAmount;

  const submitting = stage !== 'idle';

  const validate = (): string | null => {
    if (!customerName.trim()) return 'Müşteri adı zorunlu.';
    if (items.length === 0) return 'En az bir kalem ekleyin.';
    for (const it of items) {
      if (!it.description.trim()) return 'Tüm kalemlerin açıklaması dolu olmalı.';
      if ((Number(it.quantity) || 0) <= 0) return 'Miktarlar 0\'dan büyük olmalı.';
      if ((Number(it.unitPrice) || 0) <= 0) return 'Birim fiyatlar 0\'dan büyük olmalı.';
    }
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) {
      setSubmissionError(err);
      return;
    }
    setSubmissionError('');

    const payload: InvoiceCreatePayload = {
      type: 'sales',
      documentType: DOC_TYPE_BY_CUSTOMER[customerType],
      customerType,
      customerName: customerName.trim(),
      taxNumber: taxNumber.trim() || undefined,
      address: address.trim() || undefined,
      reservationId: prepare?.reservationId,
      guestId: prepare?.guestId,
      companyId: prepare?.companyId ?? undefined,
      issueDate: new Date().toISOString().split('T')[0],
      notes: notes.trim() || undefined,
      createdBy: createdBy || undefined,
      items: items.map((it) => ({
        description: it.description.trim(),
        quantity: Number(it.quantity) || 1,
        unitPrice: Number(it.unitPrice) || 0,
        vatRate,
      })),
    };

    setStage('creating');
    let draft: ApiInvoice;
    try {
      draft = await invoicesApi.create(payload);
    } catch (e) {
      setStage('idle');
      setSubmissionError((e as Error).message || 'Fatura oluşturulamadı.');
      return;
    }

    setStage('sending');
    let sent: ApiInvoice;
    try {
      sent = await invoicesApi.send(draft.id);
    } catch (e) {
      setStage('idle');
      setSubmissionError((e as Error).message || 'Paraşüt\'e gönderilemedi.');
      return;
    }

    if (sent.status === 'completed') {
      setStage('idle');
      onSuccess({ pdfUrl: sent.pdfUrl || '', invoiceNo: sent.invoiceNo, status: 'completed' });
      return;
    }
    if (sent.status === 'failed') {
      setStage('idle');
      setSubmissionError(sent.errorMessage || 'Paraşüt faturayı reddetti.');
      return;
    }

    setStage('polling');
    const outcome = await pollInvoiceStatus(draft.id, { intervalMs: 3000, timeoutMs: 60000 });
    setStage('idle');

    if (outcome.status === 'completed') {
      onSuccess({
        pdfUrl: outcome.invoice.pdfUrl || '',
        invoiceNo: outcome.invoice.invoiceNo,
        status: 'completed',
      });
      return;
    }
    if (outcome.status === 'failed') {
      setSubmissionError(outcome.invoice.errorMessage || 'Fatura kesilemedi.');
      return;
    }
    // timeout
    onSuccess({
      pdfUrl: outcome.invoice?.pdfUrl || '',
      invoiceNo: outcome.invoice?.invoiceNo || '',
      status: 'timeout',
    });
  };

  const stageLabel = (() => {
    switch (stage) {
      case 'creating':
        return 'Kayıt oluşturuluyor...';
      case 'sending':
        return 'Paraşüt\'e gönderiliyor...';
      case 'polling':
        return 'Fatura bekleniyor...';
      default:
        return 'Fatura Kes';
    }
  })();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={submitting} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Fatura Kes{roomNumber ? ` — Oda ${roomNumber}` : ''}</Text>
          <View style={{ width: 28 }} />
        </View>

        {prepareLoading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Oda bilgileri yükleniyor...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scroll}>
            {prepareError ? (
              <View style={styles.warningBox}>
                <Ionicons name="warning" size={18} color={colors.warning} />
                <Text style={styles.warningText}>{prepareError}</Text>
              </View>
            ) : null}

            {/* Müşteri tipi */}
            <Text style={styles.sectionLabel}>Müşteri Tipi</Text>
            <View style={styles.segment}>
              {(['individual', 'company'] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => setCustomerType(t)}
                  style={[styles.segmentItem, customerType === t && styles.segmentItemActive]}
                >
                  <Text style={[styles.segmentText, customerType === t && styles.segmentTextActive]}>
                    {t === 'individual' ? 'Bireysel' : 'Firma'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label={customerType === 'company' ? 'Firma Adı' : 'Ad Soyad'}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Müşteri adı"
            />

            <AppInput
              label={customerType === 'company' ? 'Vergi No (VKN)' : 'TC No'}
              value={taxNumber}
              onChangeText={setTaxNumber}
              placeholder={customerType === 'company' ? '10 haneli VKN' : '11 haneli TC'}
              keyboardType="number-pad"
            />

            <AppInput
              label="Adres"
              value={address}
              onChangeText={setAddress}
              placeholder="Fatura adresi"
              multiline
            />

            {/* KDV Oranı */}
            <Text style={styles.sectionLabel}>KDV Oranı</Text>
            <View style={styles.vatRow}>
              {VAT_OPTIONS.map((v) => (
                <TouchableOpacity
                  key={v}
                  onPress={() => setVatRate(v)}
                  style={[styles.vatChip, vatRate === v && styles.vatChipActive]}
                >
                  <Text style={[styles.vatChipText, vatRate === v && styles.vatChipTextActive]}>%{v}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Kalemler */}
            <View style={styles.itemsHeader}>
              <Text style={styles.sectionLabel}>Kalemler</Text>
              <TouchableOpacity onPress={addItem} style={styles.addItemBtn}>
                <Ionicons name="add-circle" size={20} color={colors.primary} />
                <Text style={styles.addItemText}>Kalem Ekle</Text>
              </TouchableOpacity>
            </View>

            {items.map((it) => (
              <View key={it.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemLabel}>#{it.id}</Text>
                  {items.length > 1 && (
                    <TouchableOpacity onPress={() => removeItem(it.id)}>
                      <Ionicons name="trash-outline" size={18} color={colors.error} />
                    </TouchableOpacity>
                  )}
                </View>
                <AppInput
                  label="Açıklama"
                  value={it.description}
                  onChangeText={(v) => updateItem(it.id, 'description', v)}
                  placeholder="Örn: Konaklama, Yiyecek"
                />
                <View style={styles.row}>
                  <View style={{ flex: 1, marginRight: spacing.sm }}>
                    <AppInput
                      label="Miktar"
                      value={it.quantity}
                      onChangeText={(v) => updateItem(it.id, 'quantity', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                  <View style={{ flex: 1.3 }}>
                    <AppInput
                      label="Birim Fiyat (₺)"
                      value={it.unitPrice}
                      onChangeText={(v) => updateItem(it.id, 'unitPrice', v)}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
              </View>
            ))}

            {/* Toplam */}
            <View style={styles.totalBox}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Ara Toplam</Text>
                <Text style={styles.totalValue}>{subtotal.toFixed(2)} ₺</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>KDV (%{vatRate})</Text>
                <Text style={styles.totalValue}>{vatAmount.toFixed(2)} ₺</Text>
              </View>
              <View style={[styles.totalRow, styles.totalRowGrand]}>
                <Text style={styles.totalLabelGrand}>Genel Toplam</Text>
                <Text style={styles.totalValueGrand}>{total.toFixed(2)} ₺</Text>
              </View>
            </View>

            <AppInput
              label="Notlar"
              value={notes}
              onChangeText={setNotes}
              placeholder="Opsiyonel"
              multiline
            />

            {submissionError ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle" size={18} color={colors.error} />
                <Text style={styles.errorText}>{submissionError}</Text>
              </View>
            ) : null}

            {stage === 'polling' ? (
              <View style={styles.infoBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.infoText}>
                  Paraşüt faturayı hazırlıyor, birkaç saniye sürebilir...
                </Text>
              </View>
            ) : null}

            <AppButton
              title={stageLabel}
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              icon="receipt"
              style={{ marginTop: spacing.md }}
            />
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    backgroundColor: colors.surface,
  },
  closeBtn: { padding: 4 },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  scroll: { padding: spacing.md, paddingBottom: spacing.xl },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm },
  loadingText: { color: colors.textSecondary, marginTop: spacing.sm },
  sectionLabel: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: 6,
  },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: 4,
    marginBottom: spacing.md,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
  },
  segmentItemActive: { backgroundColor: colors.primary },
  segmentText: { color: colors.textSecondary, fontWeight: '600' },
  segmentTextActive: { color: colors.textWhite },
  vatRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  vatChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  vatChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  vatChipText: { color: colors.textPrimary, fontWeight: '600' },
  vatChipTextActive: { color: colors.textWhite },
  itemsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  addItemBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addItemText: { color: colors.primary, fontWeight: '600' },
  itemCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  itemLabel: { fontSize: fontSize.xs, fontWeight: '700', color: colors.textSecondary },
  row: { flexDirection: 'row' },
  totalBox: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  totalRowGrand: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: 6,
    paddingTop: 8,
  },
  totalLabel: { color: colors.textSecondary, fontSize: fontSize.sm },
  totalValue: { color: colors.textPrimary, fontWeight: '600' },
  totalLabelGrand: { color: colors.textPrimary, fontSize: fontSize.md, fontWeight: '700' },
  totalValueGrand: { color: colors.primary, fontSize: fontSize.md, fontWeight: '700' },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFF8E1',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginBottom: spacing.sm,
  },
  warningText: { color: colors.textPrimary, flex: 1, fontSize: fontSize.sm },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FFEBEE',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  errorText: { color: colors.error, flex: 1, fontSize: fontSize.sm },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.sm,
  },
  infoText: { color: colors.textPrimary, flex: 1, fontSize: fontSize.sm },
});

export default InvoiceFormModal;
