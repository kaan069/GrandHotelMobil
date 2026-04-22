/**
 * InvoicePdfModal — Paraşüt faturası başarıyla kesildikten sonra PDF URL'sini gösterir.
 * Kullanıcı "Faturayı Aç" butonu ile Linking.openURL çağırıp PDF'i tarayıcıda açar.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../common';
import { colors, spacing, borderRadius, fontSize } from '../../theme';

interface InvoicePdfModalProps {
  visible: boolean;
  pdfUrl: string;
  invoiceNo: string;
  timedOut?: boolean;
  onClose: () => void;
}

const InvoicePdfModal: React.FC<InvoicePdfModalProps> = ({
  visible,
  pdfUrl,
  invoiceNo,
  timedOut = false,
  onClose,
}) => {
  const handleOpen = async () => {
    if (!pdfUrl) return;
    try {
      const supported = await Linking.canOpenURL(pdfUrl);
      if (!supported) {
        Alert.alert('Hata', 'Bağlantı açılamadı.');
        return;
      }
      await Linking.openURL(pdfUrl);
    } catch {
      Alert.alert('Hata', 'Bağlantı açılırken bir sorun oluştu.');
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Ionicons
              name={timedOut ? 'time-outline' : 'checkmark-circle'}
              size={32}
              color={timedOut ? colors.warning : colors.success}
            />
            <Text style={styles.title}>
              {timedOut ? 'Fatura İşleniyor' : 'Fatura Oluşturuldu'}
            </Text>
          </View>

          {invoiceNo ? <Text style={styles.invoiceNo}>{invoiceNo}</Text> : null}

          <Text style={styles.message}>
            {timedOut
              ? 'Paraşüt faturayı halen hazırlıyor. Birkaç dakika sonra Faturalar listesinden durumunu kontrol edebilirsiniz.'
              : 'Fatura Paraşüt üzerinden başarıyla kesildi. Aşağıdaki butonla faturayı tarayıcıda açabilirsiniz.'}
          </Text>

          {pdfUrl ? (
            <ScrollView style={styles.urlBox} horizontal>
              <Text style={styles.urlText}>{pdfUrl}</Text>
            </ScrollView>
          ) : null}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>Kapat</Text>
            </TouchableOpacity>
            {pdfUrl ? (
              <AppButton
                title="Faturayı Aç"
                icon="open-outline"
                onPress={handleOpen}
                style={styles.openBtn}
              />
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginLeft: spacing.sm,
  },
  invoiceNo: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginTop: spacing.sm,
  },
  message: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  urlBox: {
    marginTop: spacing.md,
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    maxHeight: 50,
  },
  urlText: { fontSize: fontSize.xs, color: colors.textSecondary, fontFamily: 'Courier' },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  closeBtn: { paddingVertical: 12, paddingHorizontal: 16 },
  closeText: { color: colors.textSecondary, fontWeight: '600' },
  openBtn: { paddingHorizontal: 20 },
});

export default InvoicePdfModal;
