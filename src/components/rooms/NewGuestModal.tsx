/**
 * NewGuestModal - Yeni Misafir Kayıt Formu
 *
 * TC Kimlik, ad, soyad, telefon, e-posta alanları.
 * Kaydet → misafir oluşturulur ve odaya eklenir.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { Guest } from '../../utils/types';
import { addGuestLocal } from '../../utils/mockData';

interface NewGuestModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (guest: Guest) => void;
}

const NewGuestModal: React.FC<NewGuestModalProps> = ({ visible, onClose, onSave }) => {
  const [tcNo, setTcNo] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const resetForm = () => {
    setTcNo('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setEmail('');
    setErrors({});
  };

  const handleSave = () => {
    const newErrors: Record<string, string> = {};
    if (!tcNo.trim() || tcNo.trim().length !== 11) newErrors.tcNo = 'TC Kimlik 11 haneli olmalı';
    if (!firstName.trim()) newErrors.firstName = 'Ad zorunlu';
    if (!lastName.trim()) newErrors.lastName = 'Soyad zorunlu';
    if (!phone.trim()) newErrors.phone = 'Telefon zorunlu';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const guest = addGuestLocal({
      tcNo: tcNo.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
    });

    onSave(guest);
    resetForm();
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Yeni Misafir</Text>
            <View style={{ width: 24 }} />
          </View>

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <AppInput
              label="TC Kimlik No"
              value={tcNo}
              onChangeText={(t) => {
                setTcNo(t);
                if (errors.tcNo) setErrors((p) => ({ ...p, tcNo: '' }));
              }}
              placeholder="11 haneli TC kimlik numarası"
              keyboardType="number-pad"
              maxLength={11}
              icon="card-outline"
              error={errors.tcNo}
            />

            <AppInput
              label="Ad"
              value={firstName}
              onChangeText={(t) => {
                setFirstName(t);
                if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' }));
              }}
              placeholder="Misafirin adı"
              icon="person-outline"
              error={errors.firstName}
            />

            <AppInput
              label="Soyad"
              value={lastName}
              onChangeText={(t) => {
                setLastName(t);
                if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' }));
              }}
              placeholder="Misafirin soyadı"
              icon="person-outline"
              error={errors.lastName}
            />

            <AppInput
              label="Telefon"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                if (errors.phone) setErrors((p) => ({ ...p, phone: '' }));
              }}
              placeholder="05XX XXX XX XX"
              keyboardType="phone-pad"
              icon="call-outline"
              error={errors.phone}
            />

            <AppInput
              label="E-posta (opsiyonel)"
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              keyboardType="email-address"
              icon="mail-outline"
              autoCapitalize="none"
            />

            <AppButton
              title="Kaydet ve Odaya Ekle"
              onPress={handleSave}
              icon="checkmark-circle-outline"
            />

            <AppButton
              title="Vazgeç"
              onPress={handleClose}
              variant="outline"
              style={{ marginTop: spacing.sm }}
            />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
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
});

export default NewGuestModal;
