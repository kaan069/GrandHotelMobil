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

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Platform } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

import { AppButton } from '../../components/common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { SHIFTS_STORAGE_KEY } from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import type { ShiftEntry } from '../tasks/ShiftsScreen';

// NFC — native modül, Expo Go'da çalışmaz
let NfcManager: any = null;
let NfcTech: any = null;
let Ndef: any = null;
try {
  const nfc = require('react-native-nfc-manager');
  NfcManager = nfc.default;
  NfcTech = nfc.NfcTech;
  Ndef = nfc.Ndef;
} catch {
  // NFC modülü yok — sadece QR çalışır
}

interface BarcodeScanResult {
  data: string;
  type?: string;
}

// NFC mesai tag formatı: "mesai:grandhotel" (NDEF text record)
const MESAI_NFC_PREFIX = 'mesai:';

const QRScreen: React.FC = () => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState<boolean>(false);
  const [mode, setMode] = useState<'qr' | 'nfc'>('qr');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  // NFC desteğini kontrol et
  useEffect(() => {
    if (!NfcManager) return;
    NfcManager.isSupported()
      .then((supported: boolean) => setNfcSupported(supported))
      .catch(() => setNfcSupported(false));
  }, []);

  // NFC taramayı başlat
  const startNfcScan = useCallback(async () => {
    if (!NfcManager || !nfcSupported) return;
    setNfcScanning(true);
    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();

      if (tag?.ndefMessage && tag.ndefMessage.length > 0) {
        const record = tag.ndefMessage[0];
        const text = Ndef.text.decodePayload(new Uint8Array(record.payload));
        const lower = text.toLowerCase().trim();

        if (lower.startsWith(MESAI_NFC_PREFIX)) {
          const shiftType = await detectShiftType();
          saveShiftEntry(shiftType);
        } else {
          Alert.alert('NFC Okundu', `Veri: ${text}`, [{ text: 'Tamam' }]);
        }
      } else {
        Alert.alert('NFC', 'Tag okunamadı veya boş.', [{ text: 'Tamam' }]);
      }
    } catch {
      // Kullanıcı iptal etti veya hata
    } finally {
      NfcManager.cancelTechnologyRequest().catch(() => {});
      setNfcScanning(false);
    }
  }, [nfcSupported]);

  // NFC taramayı durdur
  const stopNfcScan = useCallback(() => {
    if (!NfcManager) return;
    NfcManager.cancelTechnologyRequest().catch(() => {});
    setNfcScanning(false);
  }, []);

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

    // Backend devam kaydı oluştur
    try {
      const { API_BASE_URL } = require('../../utils/constants');
      await fetch(`${API_BASE_URL}/staff/attendance/mark/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffNumber: user.staffNumber, type: shiftType }),
      });
    } catch {
      /* Çevrimdışıysa sessizce geç */
    }

    const label = shiftType === 'entry' ? 'Giriş' : 'Çıkış';
    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    Alert.alert(
      `Mesai ${label}`,
      `${user.name}\n${label} saati: ${time}`,
      [{ text: 'Tamam', onPress: () => setScanned(false) }]
    );
  };

  /** Bugün açık giriş kaydı var mı kontrol et */
  const detectShiftType = async (): Promise<'entry' | 'exit'> => {
    if (!user) return 'entry';
    try {
      const stored = await AsyncStorage.getItem(SHIFTS_STORAGE_KEY);
      const all: ShiftEntry[] = stored ? JSON.parse(stored) : [];
      const today = new Date().toISOString().split('T')[0];
      const todayShifts = all.filter(
        (s) => s.staffNumber === user.staffNumber && s.timestamp.startsWith(today)
      );
      const entries = todayShifts.filter((s) => s.type === 'entry').length;
      const exits = todayShifts.filter((s) => s.type === 'exit').length;
      // Giriş sayısı çıkıştan fazlaysa → açık mesai var → çıkış yap
      return entries > exits ? 'exit' : 'entry';
    } catch {
      return 'entry';
    }
  };

  /** QR kod okunduğunda */
  const handleBarCodeScanned = async ({ data }: BarcodeScanResult) => {
    if (scanned) return;
    setScanned(true);

    const lower = data.toLowerCase().trim();

    /* Mesai QR kodları — tek kod veya ayrı giriş/çıkış */
    if (
      lower === 'mesai:grandhotel' ||
      lower === 'mesai:giris' || lower === 'mesai:entry' ||
      lower === 'mesai:cikis' || lower === 'mesai:exit'
    ) {
      let shiftType: 'entry' | 'exit';
      if (lower === 'mesai:giris' || lower === 'mesai:entry') {
        shiftType = 'entry';
      } else if (lower === 'mesai:cikis' || lower === 'mesai:exit') {
        shiftType = 'exit';
      } else {
        // Tek QR: otomatik tespit
        shiftType = await detectShiftType();
      }
      saveShiftEntry(shiftType);
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

  // NFC modu
  if (mode === 'nfc' && nfcSupported) {
    return (
      <View style={styles.container}>
        <View style={styles.nfcContainer}>
          {/* Mod seçici */}
          <View style={styles.modeSwitch}>
            <TouchableOpacity style={styles.modeBtn} onPress={() => { stopNfcScan(); setMode('qr'); }}>
              <Ionicons name="qr-code-outline" size={20} color={colors.textSecondary} />
              <Text style={styles.modeBtnText}>QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]}>
              <Ionicons name="radio-outline" size={20} color="#fff" />
              <Text style={[styles.modeBtnText, { color: '#fff' }]}>NFC</Text>
            </TouchableOpacity>
          </View>

          {/* NFC animasyon alanı */}
          <View style={styles.nfcIconArea}>
            <View style={[styles.nfcCircle, nfcScanning && styles.nfcCircleActive]}>
              <Ionicons name="radio-outline" size={64} color={nfcScanning ? colors.primary : colors.textDisabled} />
            </View>
            <Text style={styles.nfcStatusText}>
              {nfcScanning ? 'NFC tag bekleniyor...' : 'Mesai giriş/çıkış için NFC okutun'}
            </Text>
            <Text style={styles.hintText}>Telefonunuzu NFC etiketine yaklaştırın</Text>
          </View>

          {/* NFC butonları */}
          {!nfcScanning ? (
            <TouchableOpacity style={styles.nfcStartBtn} onPress={startNfcScan} activeOpacity={0.7}>
              <Ionicons name="radio" size={24} color="#fff" />
              <Text style={styles.nfcStartBtnText}>NFC Tara</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nfcStartBtn, { backgroundColor: '#ef4444' }]} onPress={stopNfcScan} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#fff" />
              <Text style={styles.nfcStartBtnText}>İptal</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }

  // QR modu (varsayılan)
  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      />
      <View style={[styles.overlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }]}>
        {/* NFC destekleniyorsa mod seçici göster */}
        {nfcSupported && (
          <View style={[styles.modeSwitch, { position: 'absolute', top: 60 }]}>
            <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]}>
              <Ionicons name="qr-code-outline" size={20} color="#fff" />
              <Text style={[styles.modeBtnText, { color: '#fff' }]}>QR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('nfc')}>
              <Ionicons name="radio-outline" size={20} color="rgba(255,255,255,0.7)" />
              <Text style={[styles.modeBtnText, { color: 'rgba(255,255,255,0.7)' }]}>NFC</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.scanFrame}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <Text style={styles.scanText}>QR kodu çerçeveye yerleştirin</Text>
        <Text style={styles.hintText}>Mesai QR okutun — otomatik giriş/çıkış</Text>
      </View>
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
  // NFC stiller
  nfcContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: borderRadius.full,
    padding: 4,
    gap: 4,
  },
  modeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
  },
  modeBtnActive: {
    backgroundColor: colors.primary,
  },
  modeBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  nfcIconArea: {
    alignItems: 'center',
    marginVertical: 40,
  },
  nfcCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 3,
    borderColor: '#e2e8f0',
  },
  nfcCircleActive: {
    borderColor: colors.primary,
    backgroundColor: '#eff6ff',
  },
  nfcStatusText: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  nfcStartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: borderRadius.full,
  },
  nfcStartBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },
});

export default QRScreen;
