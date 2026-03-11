/**
 * QRScreen - QR Kod Tarayıcı Ekranı
 *
 * Ortadaki QR butonuna basılınca kamera açılır.
 * QR kod okutulunca ilgili aksiyona yönlendirilir.
 *
 * Not: Kamera izni gerektirir (expo-camera).
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../components/common';
import { colors, spacing, fontSize } from '../../theme';

interface BarcodeScanResult {
  data: string;
  type?: string;
}

const QRScreen: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);

  /** QR kod okunduğunda */
  const handleBarCodeScanned = ({ data }: BarcodeScanResult) => {
    if (scanned) return;
    setScanned(true);

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
});

export default QRScreen;
