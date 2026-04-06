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

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  TouchableOpacity,
  Modal,
  FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { AppInput, AppButton } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { APP_NAME, SERVER_LIST, setApiBaseUrl, API_BASE_URL } from '../../utils/constants';
import type { ServerConfig } from '../../utils/constants';

const SERVER_STORAGE_KEY = '@grandhotel_server_url';

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

  // Geliştirici modu — logo'ya 5 kez tıkla
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [devMode, setDevMode] = useState(false);
  const [serverModal, setServerModal] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>(API_BASE_URL);
  const [customUrl, setCustomUrl] = useState('');

  // Kayıtlı sunucu URL'ini yükle
  React.useEffect(() => {
    AsyncStorage.getItem(SERVER_STORAGE_KEY).then((url) => {
      if (url) {
        setApiBaseUrl(url);
        setSelectedServer(url);
      }
    }).catch(() => {});
  }, []);

  const handleLogoTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    tapTimerRef.current = setTimeout(() => { tapCountRef.current = 0; }, 2000);

    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDevMode(true);
      setServerModal(true);
    }
  };

  const selectServer = async (url: string, name?: string) => {
    setApiBaseUrl(url);
    setSelectedServer(url);
    await AsyncStorage.setItem(SERVER_STORAGE_KEY, url).catch(() => {});
    setServerModal(false);
    Alert.alert('Sunucu Değiştirildi', name || url);
  };

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
        {/* Logo alanı — 5x tıkla → geliştirici modu */}
        <TouchableOpacity style={styles.logoContainer} activeOpacity={0.9} onPress={handleLogoTap}>
          <View style={styles.logoIcon}>
            <Ionicons name="business" size={40} color={colors.textWhite} />
          </View>
          <Text style={styles.appName}>{APP_NAME}</Text>
          <Text style={styles.subtitle}>Personel Giriş</Text>
          {devMode && (
            <TouchableOpacity onPress={() => setServerModal(true)} style={styles.devBadge}>
              <Ionicons name="server-outline" size={12} color="#fff" />
              <Text style={styles.devBadgeText}>DEV</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>

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

      {/* Sunucu Seçim Modal — Geliştirici Modu */}
      <Modal visible={serverModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Ionicons name="server" size={24} color={colors.primary} />
              <Text style={styles.modalTitle}>Sunucu Seçimi</Text>
              <TouchableOpacity onPress={() => setServerModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalSubtitle}>
              Aktif: {selectedServer}
            </Text>

            <FlatList
              data={SERVER_LIST}
              keyExtractor={(item) => item.url}
              renderItem={({ item }: { item: ServerConfig }) => (
                <TouchableOpacity
                  style={[styles.serverItem, selectedServer === item.url && styles.serverItemActive]}
                  onPress={() => selectServer(item.url, item.name)}
                >
                  <Ionicons
                    name={selectedServer === item.url ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selectedServer === item.url ? colors.primary : colors.textDisabled}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.serverName}>{item.name}</Text>
                    <Text style={styles.serverUrl}>{item.url}</Text>
                  </View>
                </TouchableOpacity>
              )}
              style={{ maxHeight: 250 }}
            />

            {/* Manuel URL girişi */}
            <View style={styles.customUrlBox}>
              <Text style={styles.customUrlLabel}>Manuel Sunucu URL:</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <AppInput
                  value={customUrl}
                  onChangeText={setCustomUrl}
                  placeholder="http://192.168.x.x:8000/api"
                  style={{ flex: 1 }}
                />
                <AppButton
                  title="Bağlan"
                  onPress={() => {
                    if (customUrl.trim()) selectServer(customUrl.trim(), 'Manuel');
                  }}
                  style={{ width: 80 }}
                />
              </View>
            </View>
          </View>
        </View>
      </Modal>
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
  // Geliştirici modu
  devBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ef4444',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    marginTop: 8,
  },
  devBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#fff',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    flex: 1,
  },
  modalSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  serverItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    marginBottom: 4,
  },
  serverItemActive: {
    backgroundColor: '#eff6ff',
  },
  serverName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  serverUrl: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customUrlBox: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  customUrlLabel: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
});

export default LoginScreen;
