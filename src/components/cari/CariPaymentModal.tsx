/**
 * CariPaymentModal — cari tahsilat formu (tutar + ödeme yöntemi + açıklama)
 *
 * Kullanıldığı yerler: CariStatement ("Tahsilat Al" — fazlası avans), DebtCards (seçili borçlar;
 * maxAmount = seçililerin kalanı).
 * Kısmi tutar girilebilir; kaydı çağıran taraf yapar (onSubmit).
 * onSubmit hata fırlatırsa pencere açık kalır ve mesaj gösterilir.
 * Web karşılığı: grandhotel-web/src/components/debtors/CariPaymentDialog.tsx
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';

import { AppInput, AppButton, parseAmount, isAmountText } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { FOLIO_PAYMENT_METHODS } from '../../utils/constants';

export interface CariPaymentValues {
  amount: number;
  paymentMethod: string;
  description: string;
}

interface Props {
  visible: boolean;
  title: string;
  /** Formun üstündeki bilgi (ör. kalan borç) */
  hint?: string;
  /** Açılışta önerilen tutar ve açıklama */
  defaultAmount?: number;
  /** Verilirse tutar bunu aşamaz (seçili borçların kalanı) */
  maxAmount?: number;
  defaultDescription?: string;
  onClose: () => void;
  onSubmit: (values: CariPaymentValues) => Promise<void>;
}

/** 1250.5 → "1250,50" — binlik ayırıcısız; cihaz yereli ne olursa olsun parseAmount doğru okur */
const toAmountText = (n: number) => n.toFixed(2).replace('.', ',');

const CariPaymentModal: React.FC<Props> = ({
  visible, title, hint, defaultAmount, maxAmount, defaultDescription = '', onClose, onSubmit,
}) => {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setAmount(defaultAmount && defaultAmount > 0 ? toAmountText(defaultAmount) : '');
      setMethod('');
      setDescription(defaultDescription);
      setError(null);
      setBusy(false);
    }
  }, [visible, defaultAmount, defaultDescription]);

  const handleSave = async () => {
    const value = parseAmount(amount);
    if (!isAmountText(amount) || value <= 0) { setError('Geçerli bir tutar girin'); return; }
    if (maxAmount !== undefined && value > maxAmount + 0.001) {
      setError(`Tutar seçili borçların toplamını (${maxAmount.toFixed(2).replace('.', ',')} ₺) aşamaz`);
      return;
    }
    if (!method) { setError('Ödeme yöntemi seçin'); return; }
    setBusy(true);
    try {
      await onSubmit({ amount: value, paymentMethod: method, description: description.trim() });
    } catch (err) {
      setError((err as Error).message || 'Tahsilat kaydedilemedi');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={busy ? undefined : onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={busy ? undefined : onClose} />
        <View style={styles.box}>
          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <Text style={styles.title}>{title}</Text>
            {!!hint && <Text style={styles.hint}>{hint}</Text>}

            <AppInput
              label="Tutar (₺)"
              value={amount}
              onChangeText={(t) => { setAmount(t); setError(null); }}
              placeholder="0,00"
              keyboardType="decimal-pad"
              icon="cash-outline"
            />

            <Text style={styles.label}>Ödeme Yöntemi</Text>
            <View style={styles.chipRow}>
              {FOLIO_PAYMENT_METHODS.map((m) => (
                <TouchableOpacity
                  key={m.value}
                  style={[styles.chip, method === m.value && styles.chipActive]}
                  onPress={() => { setMethod(m.value); setError(null); }}
                >
                  <Text style={[styles.chipText, method === m.value && styles.chipTextActive]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <AppInput
              label="Açıklama"
              value={description}
              onChangeText={setDescription}
              placeholder="Cari tahsilat"
              icon="document-text-outline"
            />

            {!!error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.actions}>
              <AppButton title="Vazgeç" variant="outline" onPress={onClose} disabled={busy} style={styles.actionBtn} />
              <AppButton title="Tahsilatı Kaydet" onPress={handleSave} loading={busy} style={styles.actionBtn} />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  box: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg, maxHeight: '90%' },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  hint: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: spacing.md },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: borderRadius.full,
    backgroundColor: colors.divider, borderWidth: 1, borderColor: colors.border,
  },
  chipActive: { backgroundColor: colors.success, borderColor: colors.success },
  chipText: { fontSize: fontSize.sm, color: colors.textSecondary, fontWeight: '500' },
  chipTextActive: { color: colors.textWhite, fontWeight: '700' },
  error: { fontSize: fontSize.sm, color: colors.error, marginBottom: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flex: 1 },
});

export default CariPaymentModal;
