/**
 * EmployeeAddModal - Yeni Eleman Ekleme Modalı
 *
 * Patron yeni personel ekleyebilir:
 *   - Ad, Soyad
 *   - Görevler (çoklu seçim)
 *   - Telefon
 *   - 4 haneli otomatik şifre
 *   - İşe giriş tarihi
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppButton, AppInput, AppCard } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { ROLES, ROLE_LABELS } from '../../utils/constants';

interface EmployeeData {
  firstName: string;
  lastName: string;
  name: string;
  roles: string[];
  role: string;
  phone: string;
  password: string;
  hireDate: string;
  status: string;
  usedLeave: number;
}

interface EmployeeAddModalProps {
  onClose: () => void;
  onSave: (data: EmployeeData) => void;
}

/** 4 haneli rastgele şifre üret */
const generatePassword = (): string =>
  String(Math.floor(1000 + Math.random() * 9000));

/** Patron hariç seçilebilir roller */
const SELECTABLE_ROLES: [string, string][] = Object.entries(ROLE_LABELS).filter(
  ([key]) => key !== ROLES.PATRON
) as [string, string][];

const EmployeeAddModal: React.FC<EmployeeAddModalProps> = ({ onClose, onSave }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [hireDate, setHireDate] = useState(new Date().toISOString().split('T')[0]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Rol seçimi toggle */
  const toggleRole = (role: string) => {
    setSelectedRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
    if (errors.roles) setErrors((p) => ({ ...p, roles: '' }));
  };

  /** Form doğrulama */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!firstName.trim()) newErrors.firstName = 'Ad zorunlu';
    if (!lastName.trim()) newErrors.lastName = 'Soyad zorunlu';
    if (selectedRoles.length === 0) newErrors.roles = 'En az bir görev seçin';
    if (!phone.trim()) newErrors.phone = 'Telefon zorunlu';
    if (!password || password.length !== 4) newErrors.password = '4 haneli şifre zorunlu';
    if (!hireDate) newErrors.hireDate = 'İşe giriş tarihi zorunlu';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Kaydet */
  const handleSubmit = () => {
    if (!validate()) return;

    const employeeData: EmployeeData = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      name: `${firstName.trim()} ${lastName.trim()}`,
      roles: selectedRoles,
      role: selectedRoles[0],
      phone: phone.trim(),
      password,
      hireDate,
      status: 'active',
      usedLeave: 0,
    };

    onSave(employeeData);

    Alert.alert(
      'Başarılı',
      `${employeeData.name} eklendi.\nPersonel Şifresi: ${password}`,
      [{ text: 'Tamam', onPress: onClose }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Yeni Eleman Ekle</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Ad */}
        <AppInput
          label="Ad"
          value={firstName}
          onChangeText={(text: string) => {
            setFirstName(text);
            if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' }));
          }}
          placeholder="Örn: Mehmet"
          icon="person-outline"
          error={errors.firstName}
        />

        {/* Soyad */}
        <AppInput
          label="Soyad"
          value={lastName}
          onChangeText={(text: string) => {
            setLastName(text);
            if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' }));
          }}
          placeholder="Örn: Demir"
          icon="person-outline"
          error={errors.lastName}
        />

        {/* Görevler (çoklu seçim) */}
        <Text style={styles.label}>Görevler</Text>
        {errors.roles && <Text style={styles.errorText}>{errors.roles}</Text>}
        <View style={styles.roleGrid}>
          {SELECTABLE_ROLES.map(([key, label]) => {
            const isSelected = selectedRoles.includes(key);
            return (
              <TouchableOpacity
                key={key}
                style={[styles.roleChip, isSelected && styles.roleChipActive]}
                onPress={() => toggleRole(key)}
              >
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={16} color={colors.primary} style={{ marginRight: 4 }} />
                )}
                <Text style={[styles.roleText, isSelected && styles.roleTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Telefon */}
        <AppInput
          label="Telefon"
          value={phone}
          onChangeText={(text: string) => {
            setPhone(text);
            if (errors.phone) setErrors((p) => ({ ...p, phone: '' }));
          }}
          placeholder="Örn: 0532 123 45 67"
          icon="call-outline"
          keyboardType="phone-pad"
          error={errors.phone}
        />

        {/* Şifre (4 haneli) */}
        <Text style={styles.label}>Şifre (4 Haneli)</Text>
        <View style={styles.passwordRow}>
          <View style={styles.passwordBox}>
            <Text style={styles.passwordText}>{password}</Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => setPassword(generatePassword())}
          >
            <Ionicons name="refresh" size={20} color={colors.primary} />
            <Text style={styles.refreshText}>Yenile</Text>
          </TouchableOpacity>
        </View>
        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

        {/* İşe Giriş Tarihi */}
        <AppInput
          label="İşe Giriş Tarihi"
          value={hireDate}
          onChangeText={(text: string) => {
            setHireDate(text);
            if (errors.hireDate) setErrors((p) => ({ ...p, hireDate: '' }));
          }}
          placeholder="YYYY-MM-DD"
          icon="calendar-outline"
          error={errors.hireDate}
        />

        {/* Kaydet */}
        <AppButton
          title="Eleman Ekle"
          onPress={handleSubmit}
          icon="person-add-outline"
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  roleText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  roleTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: spacing.md,
  },
  passwordBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  passwordText: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 8,
    textAlign: 'center',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary + '15',
  },
  refreshText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});

export default EmployeeAddModal;
