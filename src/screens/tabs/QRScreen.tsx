/**
 * QRScreen - QR Kod Tarayıcı Ekranı
 *
 * Ortadaki QR butonuna basılınca kamera açılır.
 * QR kod okutulunca ilgili aksiyona yönlendirilir.
 *
 * Mesai QR formatı: "mesai:giris" veya "mesai:cikis"
 * QR okutulduğunda AsyncStorage'a kayıt eklenir.
 *
 * Not: Kamera izni gerektirir (expo-camera).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../components/common';
import { colors, spacing, fontSize } from '../../theme';
import { SHIFTS_STORAGE_KEY } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import type { ShiftEntry } from '../tasks/ShiftsScreen';

interface BarcodeScanResult {
  data: string;
  type?: string;
}

const QRScreen: React.FC = () => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  /** Mesai kaydı ekle */
  const saveShiftEntry = async (shiftType: 'entry' | 'exit') => {
    if (!user) return;

    const newEntry: ShiftEntry = {
      id: Date.now(),
      staffNumber: user.staffNumber,
      staffName: user.name,
      type: shiftType,
      timestamp: new Date().toISOString(),
    };

    try {
      const stored = await AsyncStorage.getItem(SHIFTS_STORAGE_KEY);
      const existing: ShiftEntry[] = stored ? JSON.parse(stored) : [];
      existing.push(newEntry);
      await AsyncStorage.setItem(SHIFTS_STORAGE_KEY, JSON.stringify(existing));
    } catch {
      /* Storage hatası */
    }

    const label = shiftType === 'entry' ? 'Giriş' : 'Çıkış';
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    Alert.alert(
      `Mesai ${label}`,
      `${user.name}\n${label} saati: ${time}`,
      [{ text: 'Tamam', onPress: () => setScanned(false) }]
    );
  };

  /** QR kod okunduğunda */
  const handleBarCodeScanned = ({ data }: BarcodeScanResult) => {
    if (scanned) return;
    setScanned(true);

    const lower = data.toLowerCase().trim();

    /* Mesai QR kodları */
    if (lower === 'mesai:giris' || lower === 'mesai:entry') {
      saveShiftEntry('entry');
      return;
    }
    if (lower === 'mesai:cikis' || lower === 'mesai:exit') {
      saveShiftEntry('exit');
      return;
    }

    /* Genel QR */
    Alert.alert(
      'QR Kod Okundu',
      `Veri: ${data}`,
      [{ text: 'Tekrar Tara', onPress: () => setScanned(false) }]
    );
  };

  /* Kamera izni henüz yüklenmedi */
  if (!permission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.infoText}>Kamera izni kontrol ediliyor...</Text>
      </View>
    );
  }

  /* Kamera izni reddedildi */
  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={64} color={colors.textDisabled} />
        <Text style={styles.infoText}>QR kod taramak için kamera izni gerekli</Text>
        <AppButton
          title="İzin Ver"
          onPress={requestPermission}
          style={styles.permButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        {/* Tarama çerçevesi */}
        <View style={styles.overlay}>
          <View style={styles.scanFrame}>
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
          </View>
          <Text style={styles.scanText}>QR kodu çerçeveye yerleştirin</Text>
          <Text style={styles.hintText}>Mesai giriş/çıkış veya genel QR</Text>
        </View>
      </CameraView>
    </View>
  );
};

const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  infoText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  permButton: {
    width: 200,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: colors.textWhite,
  },
  topLeft: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
  },
  topRight: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
  },
  bottomLeft: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH, borderLeftWidth: CORNER_WIDTH,
  },
  bottomRight: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH, borderRightWidth: CORNER_WIDTH,
  },
  scanText: {
    color: colors.textWhite,
    fontSize: fontSize.sm,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  hintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: fontSize.xs,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
});

export default QRScreen;
