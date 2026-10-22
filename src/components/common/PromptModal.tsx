/**
 * PromptModal - Tek alanlı giriş penceresi (tutar, sebep, not)
 *
 * Neden? Alert.prompt sadece iOS'ta çalışır; Android'de hiçbir şey göstermez.
 * Ödeme tutarı / zorla çıkış sebebi gibi girişler her iki platformda bu modalla alınır.
 *
 * Kullanım:
 *   <PromptModal
 *     visible={!!target} title="Ödeme Ekle" message="Bakiye: ₺1.200,00"
 *     keyboardType="decimal-pad" confirmText="Ödeme Yap"
 *     validate={(v) => (parseAmount(v) > 0 ? null : 'Geçerli bir tutar girin')}
 *     onConfirm={async (v) => { await pay(parseAmount(v)); }}
 *     onClose={() => setTarget(null)}
 *   />
 * onConfirm hata fırlatırsa pencere açık kalır ve mesaj gösterilir.
 */

import React, { useEffect, useState } from 'react';
import {
  View, Text, Modal, StyleSheet, TouchableOpacity, KeyboardAvoidingView, Platform, TextInputProps,
} from 'react-native';

import AppInput from './AppInput';
import AppButton from './AppButton';
import { colors, spacing, fontSize, borderRadius } from '../../theme';

interface PromptModalProps {
  visible: boolean;
  title: string;
  message?: string;
  placeholder?: string;
  initialValue?: string;
  keyboardType?: TextInputProps['keyboardType'];
  multiline?: boolean;
  confirmText?: string;
  destructive?: boolean;
  /** Hata mesajı döner (geçerliyse null) */
  validate?: (value: string) => string | null;
  onConfirm: (value: string) => Promise<void> | void;
  onClose: () => void;
}

/**
 * Tutar metni → sayı. Türkçe yazımda virgül ondalık, nokta binlik ayırıcıdır:
 *   "1.250,50" → 1250.5   "1.250" → 1250   "12,5" → 12.5
 * Virgül yoksa ve noktalar binlik grubu değilse nokta ondalık sayılır: "1250.5" → 1250.5
 * Geçersiz metin 0 döner (isAmountText ile birlikte kullanın).
 */
export const parseAmount = (raw: string): number => {
  const cleaned = raw.trim().replace(/\s/g, '');
  let normalized = cleaned;
  if (cleaned.includes(',')) normalized = cleaned.replace(/\./g, '').replace(',', '.');
  else if (/^\d{1,3}(\.\d{3})+$/.test(cleaned)) normalized = cleaned.replace(/\./g, '');
  const n = Number(normalized);
  return Number.isFinite(n) ? n : 0;
};

/** Metin geçerli bir tutar mı? ("1.250,50", "1250.5", "0") — sıfır dahil */
export const isAmountText = (raw: string): boolean =>
  /^(\d{1,3}(\.\d{3})+|\d+)(,\d{1,2})?$|^\d+(\.\d{1,2})?$/.test(raw.trim().replace(/\s/g, ''));

const PromptModal: React.FC<PromptModalProps> = ({
  visible, title, message, placeholder, initialValue = '', keyboardType, multiline,
  confirmText = 'Tamam', destructive, validate, onConfirm, onClose,
}) => {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setError(null);
      setBusy(false);
    }
  }, [visible, initialValue]);

  const handleConfirm = async () => {
    const validationError = validate ? validate(value) : null;
    if (validationError) {
      setError(validationError);
      return;
    }
    setBusy(true);
    try {
      await onConfirm(value);
      onClose();
    } catch (err) {
      setError((err as Error).message || 'İşlem yapılamadı');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={busy ? undefined : onClose}>
      <KeyboardAvoidingView style={styles.overlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={busy ? undefined : onClose} />
        <View style={styles.box}>
          <Text style={styles.title}>{title}</Text>
          {!!message && <Text style={styles.message}>{message}</Text>}
          <AppInput
            value={value}
            onChangeText={(t) => { setValue(t); setError(null); }}
            placeholder={placeholder}
            keyboardType={keyboardType}
            multiline={multiline}
            error={error || undefined}
            autoFocus
          />
          <View style={styles.actions}>
            <AppButton title="Vazgeç" variant="outline" onPress={onClose} disabled={busy} style={styles.actionBtn} />
            <AppButton
              title={confirmText}
              variant={destructive ? 'danger' : 'primary'}
              onPress={handleConfirm}
              loading={busy}
              style={styles.actionBtn}
            />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: spacing.lg },
  box: { backgroundColor: colors.surface, borderRadius: borderRadius.lg, padding: spacing.lg },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
  message: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.md },
  actions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  actionBtn: { flex: 1 },
});

export default PromptModal;
