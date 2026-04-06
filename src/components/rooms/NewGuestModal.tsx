/**
 * NewGuestModal - Yeni Misafir Kayıt Formu
 *
 * TC Kimlik girilip alan dışına çıkılınca:
 * - Kayıtlı müşteri → bilgiler otomatik doldurulur
 * - Blokeli müşteri → kırmızı uyarı, kayıt engellenir
 * - Yeni müşteri → boş form, normal kayıt
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { Guest } from '../../utils/types';
import { guestsApi } from '../../services/api';

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
  const [saving, setSaving] = useState(false);

  // TC kontrolü
  const [tcStatus, setTcStatus] = useState<'idle' | 'checking' | 'found' | 'blocked' | 'new'>('idle');
  const [foundGuestId, setFoundGuestId] = useState<number | null>(null);

  const resetForm = () => {
    setTcNo(''); setFirstName(''); setLastName('');
    setPhone(''); setEmail('');
    setErrors({}); setTcStatus('idle'); setFoundGuestId(null);
  };

  // TC girilip alan dışına çıkınca kontrol et
  const handleTcBlur = useCallback(async () => {
    if (tcNo.trim().length !== 11) {
      setTcStatus('idle');
      return;
    }
    setTcStatus('checking');
    try {
      const result = await guestsApi.checkTc(tcNo.trim());
      if (result.found && result.guest) {
        setFirstName(result.guest.firstName);
        setLastName(result.guest.lastName);
        setPhone(result.guest.phone || '');
        setEmail(result.guest.email || '');
        setFoundGuestId(result.guest.id);
        setTcStatus(result.isBlocked ? 'blocked' : 'found');
      } else {
        setTcStatus('new');
        setFoundGuestId(null);
      }
    } catch {
      setTcStatus('idle');
    }
  }, [tcNo]);

  const handleSave = async () => {
    if (tcStatus === 'blocked') {
      Alert.alert('Blokeli Müşteri', 'Bu müşteri kara listede. Kayıt yapılamaz.');
      return;
    }

    const newErrors: Record<string, string> = {};
    if (!tcNo.trim() || tcNo.trim().length !== 11) newErrors.tcNo = 'TC Kimlik 11 haneli olmalı';
    if (!firstName.trim()) newErrors.firstName = 'Ad zorunlu';
    if (!lastName.trim()) newErrors.lastName = 'Soyad zorunlu';
    if (!phone.trim()) newErrors.phone = 'Telefon zorunlu';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSaving(true);
    try {
      const guest = await guestsApi.create({
        tcNo: tcNo.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      onSave(guest);
      resetForm();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Misafir oluşturulamadı';
      Alert.alert('Hata', msg);
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => { resetForm(); onClose(); };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={handleClose} />
        <View style={styles.container} onStartShouldSetResponder={() => true}>
          <View style={styles.header}>
            <TouchableOpacity onPress={handleClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Yeni Misafir</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Blokeli uyarısı */}
          {tcStatus === 'blocked' && (
            <View style={styles.blockedBanner}>
              <Ionicons name="ban" size={20} color="#fff" />
              <Text style={styles.blockedText}>Bu müşteri kara listede! Kayıt yapılamaz.</Text>
            </View>
          )}

          {/* Kayıtlı müşteri bilgisi */}
          {tcStatus === 'found' && (
            <View style={styles.foundBanner}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.foundText}>Kayıtlı müşteri — bilgiler otomatik dolduruldu</Text>
            </View>
          )}

          <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
            <View>
              <AppInput
                label="TC Kimlik No"
                value={tcNo}
                onChangeText={(t: string) => {
                  const v = t.replace(/\D/g, '').slice(0, 11);
                  setTcNo(v);
                  if (errors.tcNo) setErrors((p) => ({ ...p, tcNo: '' }));
                  if (v.length < 11) { setTcStatus('idle'); setFoundGuestId(null); }
                }}
                onBlur={handleTcBlur}
                placeholder="11 haneli TC kimlik numarası"
                keyboardType="number-pad"
                maxLength={11}
                icon="card-outline"
                error={errors.tcNo}
              />
              {tcStatus === 'checking' && (
                <View style={styles.tcChecking}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.tcCheckingText}>Kontrol ediliyor...</Text>
                </View>
              )}
              {tcStatus === 'new' && (
                <View style={styles.tcNew}>
                  <Ionicons name="person-add" size={14} color="#22c55e" />
                  <Text style={styles.tcNewText}>Yeni müşteri</Text>
                </View>
              )}
            </View>

            <AppInput
              label="Ad" value={firstName}
              onChangeText={(t: string) => { setFirstName(t); if (errors.firstName) setErrors((p) => ({ ...p, firstName: '' })); }}
              placeholder="Misafirin adı" icon="person-outline" error={errors.firstName}
              editable={tcStatus !== 'blocked'}
            />
            <AppInput
              label="Soyad" value={lastName}
              onChangeText={(t: string) => { setLastName(t); if (errors.lastName) setErrors((p) => ({ ...p, lastName: '' })); }}
              placeholder="Misafirin soyadı" icon="person-outline" error={errors.lastName}
              editable={tcStatus !== 'blocked'}
            />
            <AppInput
              label="Telefon" value={phone}
              onChangeText={(t: string) => { setPhone(t); if (errors.phone) setErrors((p) => ({ ...p, phone: '' })); }}
              placeholder="05XX XXX XX XX" keyboardType="phone-pad" icon="call-outline" error={errors.phone}
              editable={tcStatus !== 'blocked'}
            />
            <AppInput
              label="E-posta (opsiyonel)" value={email}
              onChangeText={setEmail} placeholder="email@example.com"
              keyboardType="email-address" icon="mail-outline" autoCapitalize="none"
              editable={tcStatus !== 'blocked'}
            />

            <AppButton
              title={tcStatus === 'found' ? 'Kayıtlı Müşteriyi Ekle' : 'Kaydet ve Odaya Ekle'}
              onPress={handleSave}
              icon="checkmark-circle-outline"
              loading={saving}
              disabled={tcStatus === 'blocked'}
            />
            <AppButton title="Vazgeç" onPress={handleClose} variant="outline" style={{ marginTop: spacing.sm }} />
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  container: { backgroundColor: colors.background, borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl, maxHeight: '90%' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: spacing.md, paddingTop: spacing.lg, paddingBottom: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  form: { padding: spacing.md },
  blockedBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ef4444', paddingHorizontal: spacing.md, paddingVertical: 10 },
  blockedText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm, flex: 1 },
  foundBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3b82f6', paddingHorizontal: spacing.md, paddingVertical: 10 },
  foundText: { color: '#fff', fontWeight: '600', fontSize: fontSize.sm, flex: 1 },
  tcChecking: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  tcCheckingText: { fontSize: fontSize.xs, color: colors.textSecondary },
  tcNew: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: -8, marginBottom: 8, marginLeft: 4 },
  tcNewText: { fontSize: fontSize.xs, color: '#22c55e', fontWeight: '600' },
});

export default NewGuestModal;
