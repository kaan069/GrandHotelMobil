/**
 * FolioAddModal - Folio Ekleme Formu
 *
 * Kategori (chip grid), açıklama, tutar alanları.
 * Kategori "Ödeme" ise ödeme yöntemi seçimi de gösterilir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { FOLIO_CATEGORIES, PAYMENT_METHODS } from '../../utils/constants';
import type { FolioCategory } from '../../utils/types';

interface FolioAddModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: {
    category: FolioCategory;
    description: string;
    amount: number;
    paymentMethod?: string;
  }) => void;
}

const FolioAddModal: React.FC<FolioAddModalProps> = ({ visible, onClose, onSave }) => {
  const [category, setCategory] = useState<string>('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setCategory('');
    setDescription('');
    setAmount('');
    setPaymentMethod('');
    setErrors({});
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!category) newErrors.category = 'Kategori seçin';
    if (!description.trim()) newErrors.description = 'Açıklama zorunlu';
    const parsedAmount = parseFloat(amount);
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) newErrors.amount = 'Geçerli tutar girin';
    if (category === 'payment' && !paymentMethod) newErrors.paymentMethod = 'Ödeme yöntemi seçin';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    onSave({
      category: category as FolioCategory,
      description: description.trim(),
      amount: parsedAmount,
      paymentMethod: category === 'payment' ? paymentMethod : undefined,
    });
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Folio Ekle</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            {/* Kategori */}
            <Text style={styles.label}>Kategori</Text>
            {errors.category ? <Text style={styles.errorText}>{errors.category}</Text> : null}
            <View style={styles.chipGrid}>
              {FOLIO_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.value}
                  style={[
                    styles.chip,
                    category === cat.value && styles.chipActive,
                  ]}
                  onPress={() => {
                    setCategory(cat.value);
                    if (cat.value !== 'payment') setPaymentMethod('');
                    if (errors.category) setErrors((p) => ({ ...p, category: '' }));
                  }}
                >
                  <Text
                    style={[
                      styles.chipText,
                      category === cat.value && styles.chipTextActive,
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ödeme yöntemi (sadece payment kategorisinde) */}
            {category === 'payment' && (
              <>
                <Text style={styles.label}>Ödeme Yöntemi</Text>
                {errors.paymentMethod ? <Text style={styles.errorText}>{errors.paymentMethod}</Text> : null}
                <View style={styles.chipGrid}>
                  {PAYMENT_METHODS.map((pm) => (
                    <TouchableOpacity
                      key={pm.value}
                      style={[
                        styles.chip,
                        paymentMethod === pm.value && styles.chipActivePayment,
                      ]}
                      onPress={() => {
                        setPaymentMethod(pm.value);
                        if (errors.paymentMethod) setErrors((p) => ({ ...p, paymentMethod: '' }));
                      }}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          paymentMethod === pm.value && styles.chipTextActivePayment,
                        ]}
                      >
                        {pm.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* Açıklama */}
            <AppInput
              label="Açıklama"
              value={description}
              onChangeText={(t) => {
                setDescription(t);
                if (errors.description) setErrors((p) => ({ ...p, description: '' }));
              }}
              placeholder="Folio açıklaması..."
              icon="document-text-outline"
              error={errors.description}
            />

            {/* Tutar */}
            <AppInput
              label="Tutar (₺)"
              value={amount}
              onChangeText={(t) => {
                setAmount(t);
                if (errors.amount) setErrors((p) => ({ ...p, amount: '' }));
              }}
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="cash-outline"
              error={errors.amount}
            />

            <AppButton
              title="Ekle"
              onPress={handleSave}
              icon="add-circle-outline"
            />

            <AppButton
              title="Vazgeç"
              onPress={handleClose}
              variant="outline"
              style={{ marginTop: spacing.sm, marginBottom: spacing.lg }}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  form: {
    padding: spacing.md,
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: 4,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  chipActivePayment: {
    backgroundColor: '#22C55E15',
    borderColor: '#22C55E',
  },
  chipTextActivePayment: {
    color: '#22C55E',
    fontWeight: '600',
  },
});

export default FolioAddModal;
