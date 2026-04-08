/**
 * HotelManagementScreen — Otel Yönetimi (Mobil)
 *
 * Patron/müdür otel bilgilerini görür ve düzenler.
 * Web'deki HotelInfoSection'ın mobil karşılığı.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';

import { AppInput, AppButton } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { hotelApi } from '../../services/api';

interface Props {
  onClose: () => void;
}

const HotelManagementScreen: React.FC<Props> = ({ onClose }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [status, setStatus] = useState('');
  const [roomCount, setRoomCount] = useState(0);

  const fetchHotel = async () => {
    try {
      const data = await hotelApi.get();
      setName((data.name as string) || '');
      setAddress((data.address as string) || '');
      setPhone((data.phone as string) || '');
      setEmail((data.email as string) || '');
      setTaxNumber((data.taxNumber as string) || '');
      setStatus((data.status as string) || '');
      setRoomCount((data.roomCount as number) || 0);
    } catch {
      Alert.alert('Hata', 'Otel bilgileri yüklenemedi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchHotel(); }, []);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Hata', 'Otel adı zorunlu');
      return;
    }
    setSaving(true);
    try {
      await hotelApi.update({ name, address, phone, email, taxNumber });
      Alert.alert('Başarılı', 'Otel bilgileri güncellendi');
    } catch {
      Alert.alert('Hata', 'Kaydetme başarısız');
    } finally {
      setSaving(false);
    }
  };

  const statusLabel = status === 'approved' ? 'Onaylı' : status === 'pending' ? 'Onay Bekliyor' : status === 'rejected' ? 'Reddedildi' : status;
  const statusColor = status === 'approved' ? '#22c55e' : status === 'pending' ? '#f59e0b' : '#ef4444';

  if (loading) {
    return (
      <View style={styles.container}>
        <Header onClose={onClose} />
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header onClose={onClose} />

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchHotel(); }} />}
      >
        {/* Durum bandı */}
        <View style={[styles.statusBand, { backgroundColor: statusColor }]}>
          <Ionicons name={status === 'approved' ? 'checkmark-circle' : 'time'} size={18} color="#fff" />
          <Text style={styles.statusText}>{statusLabel}</Text>
          <Text style={styles.roomCountText}>{roomCount} oda</Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Otel Bilgileri</Text>

          <AppInput
            label="Otel Adı"
            value={name}
            onChangeText={setName}
            icon="business-outline"
            placeholder="Grand Hotel"
          />

          <AppInput
            label="Telefon"
            value={phone}
            onChangeText={setPhone}
            icon="call-outline"
            keyboardType="phone-pad"
            placeholder="0212 000 00 00"
          />

          <AppInput
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            icon="mail-outline"
            keyboardType="email-address"
            autoCapitalize="none"
            placeholder="info@otel.com"
          />

          <AppInput
            label="Vergi Numarası"
            value={taxNumber}
            onChangeText={setTaxNumber}
            icon="document-text-outline"
            placeholder="1234567890"
          />

          <AppInput
            label="Adres"
            value={address}
            onChangeText={setAddress}
            icon="location-outline"
            placeholder="Otel adresi"
            multiline
          />

          <AppButton
            title="Kaydet"
            onPress={handleSave}
            icon="save-outline"
            loading={saving}
            style={{ marginTop: spacing.md }}
          />
        </View>
      </ScrollView>
    </View>
  );
};

const Header: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onClose} style={styles.backBtn}>
      <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
    </TouchableOpacity>
    <Text style={styles.title}>Otel Yönetimi</Text>
    <View style={{ width: 24 }} />
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  content: { padding: spacing.md, paddingBottom: 40 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing.xs },
  title: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary },
  statusBand: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: spacing.md, paddingVertical: 10,
    borderRadius: borderRadius.md, marginBottom: spacing.md,
  },
  statusText: { color: '#fff', fontWeight: '700', fontSize: fontSize.sm },
  roomCountText: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.sm, marginLeft: 'auto' },
  card: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    padding: spacing.md, elevation: 1,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2,
  },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.md },
});

export default HotelManagementScreen;
