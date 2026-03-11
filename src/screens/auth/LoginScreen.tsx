/**
 * LoginScreen - Giriş Ekranı
 *
 * Personel giriş formu:
 *   - Şube Kodu
 *   - Personel Numarası
 *   - Şifre
 *
 * Mock veri ile test:
 *   Şube: 001, Numara: 1001-1007, Şifre: 1234
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { APP_NAME } from '../../utils/constants';

interface LoginErrors {
  branchCode?: string;
  staffNumber?: string;
  password?: string;
}

const LoginScreen: React.FC = () => {
  const { login, loading } = useAuth();

  const [branchCode, setBranchCode] = useState<string>('');
  const [staffNumber, setStaffNumber] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [errors, setErrors] = useState<LoginErrors>({});

  /** Form doğrulama */
  const validate = (): boolean => {
    const newErrors: LoginErrors = {};
    if (!branchCode.trim()) newErrors.branchCode = 'Şube kodu zorunlu';
    if (!staffNumber.trim()) newErrors.staffNumber = 'Personel numarası zorunlu';
    if (!password.trim()) newErrors.password = 'Şifre zorunlu';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Giriş yap */
  const handleLogin = async () => {
    if (!validate()) return;

    try {
      await login(branchCode.trim(), staffNumber.trim(), password.trim());
    } catch (err: any) {
      Alert.alert('Giriş Hatası', err.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo alanı */}
        <View style={styles.logoContainer}>
          <View style={styles.logoIcon}>
            <Ionicons name="business" size={40} color={colors.textWhite} />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Personel Giriş</Text>
        </View>

        {/* Form alanı */}
        <View style={styles.formContainer}>
          <AppInput
            label="Şube Kodu"
            value={branchCode}
            onChangeText={(text: string) => {
              setBranchCode(text);
              if (errors.branchCode) setErrors((p) => ({ ...p, branchCode: '' }));
            }}
            placeholder="Örn: 001"
            icon="business-outline"
            keyboardType="number-pad"
            error={errors.branchCode}
          />

          <AppInput
            label="Personel Numarası"
            value={staffNumber}
            onChangeText={(text: string) => {
              setStaffNumber(text);
              if (errors.staffNumber) setErrors((p) => ({ ...p, staffNumber: '' }));
            }}
            placeholder="Örn: 1001"
            icon="person-outline"
            keyboardType="number-pad"
            error={errors.staffNumber}
          />

          <AppInput
            label="Şifre"
            value={password}
            onChangeText={(text: string) => {
              setPassword(text);
              if (errors.password) setErrors((p) => ({ ...p, password: '' }));
            }}
            placeholder="Şifrenizi girin"
            icon="lock-closed-outline"
            secureTextEntry
            error={errors.password}
          />

          <AppButton
            title="Giriş Yap"
            onPress={handleLogin}
            loading={loading}
            icon="log-in-outline"
            style={styles.loginButton}
          />
        </View>

        {/* Alt bilgi */}
        <Text style={styles.footer}>{APP_NAME} &copy; 2026</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xxl,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  appName: {
    fontSize: fontSize.title,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginTop: 4,
  },
  formContainer: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  loginButton: {
    marginTop: spacing.sm,
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginTop: spacing.xl,
  },
});

export default LoginScreen;
