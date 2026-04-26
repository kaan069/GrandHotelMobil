/**
 * QRScreen - QR Kod Tarayıcı Ekranı
 *
 * Akış:
 *   1. Ekran açıldığında "Taramaya Başla" butonu (kamera kapalı, performans için)
 *   2. Buton'a basınca kamera açılır
 *   3. QR okununca → başarı animasyonu (scale + fade) + titreşim
 *   4. 2 sn sonra animasyon kapanır + kamera kapanır → butona döner
 *
 * Bu yapı:
 *   - İlk açılışta donmayı önler (kamera lazy mount)
 *   - Sürekli okumayı engeller (her tarama sonrası kamera kapanır)
 *   - Race condition'ı önler (useRef ile sync flag)
 *
 * Mesai QR formatı: "mesai:giris" | "mesai:cikis" | "mesai:grandhotel"
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, Animated, Vibration, ActivityIndicator } from 'react-native';
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

interface SuccessInfo {
  type: 'entry' | 'exit';
  name: string;
  time: string;
}

const MESAI_NFC_PREFIX = 'mesai:';
const SUCCESS_DISPLAY_MS = 2200;

const QRScreen: React.FC = () => {
  const { user } = useAuth();
  const [permission, requestPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'qr' | 'nfc'>('qr');
  const [nfcSupported, setNfcSupported] = useState(false);
  const [nfcScanning, setNfcScanning] = useState(false);

  /* Tarama akışı */
  const [scanning, setScanning] = useState(false);   // kamera açık mı (lazy mount)
  const [cameraReady, setCameraReady] = useState(false);
  const [successInfo, setSuccessInfo] = useState<SuccessInfo | null>(null);
  // useRef: setState async olduğu için race condition'ı önler
  const handlingRef = useRef(false);

  /* Animasyon değerleri */
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;
  const checkRotate = useRef(new Animated.Value(0)).current;

  // NFC desteğini kontrol et
  useEffect(() => {
    if (!NfcManager) return;
    NfcManager.isSupported()
      .then((supported: boolean) => setNfcSupported(supported))
      .catch(() => setNfcSupported(false));
  }, []);

  // Cleanup: ekran kaybolursa kamerayı kapat
  useEffect(() => {
    return () => {
      handlingRef.current = false;
      setScanning(false);
    };
  }, []);

  /** Başarı animasyonunu başlat */
  const playSuccessAnimation = useCallback((info: SuccessInfo) => {
    setSuccessInfo(info);
    successScale.setValue(0);
    successOpacity.setValue(0);
    checkRotate.setValue(0);

    Animated.parallel([
      Animated.spring(successScale, {
        toValue: 1,
        tension: 80,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(successOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(checkRotate, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();

    // Hafif titreşim
    Vibration.vibrate(150);

    // Otomatik kapan
    setTimeout(() => {
      Animated.timing(successOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }).start(() => {
        setSuccessInfo(null);
        setScanning(false);     // kamerayı kapat → butona dön
        setCameraReady(false);
        handlingRef.current = false;
      });
    }, SUCCESS_DISPLAY_MS);
  }, [successScale, successOpacity, checkRotate]);

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
          await saveShiftEntry(shiftType);
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

  /** Mesai kaydı ekle (Alert YOK — animasyon ile gösterilir) */
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

    // Backend devam kaydı (offline ise sessizce geç)
    try {
      const { API_BASE_URL } = require('../../utils/constants');
      await fetch(`${API_BASE_URL}/staff/attendance/mark/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffNumber: user.staffNumber, type: shiftType }),
      });
    } catch {
      /* Çevrimdışı */
    }

    const time = new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
    playSuccessAnimation({ type: shiftType, name: user.name, time });
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
      return entries > exits ? 'exit' : 'entry';
    } catch {
      return 'entry';
    }
  };

  /** QR kod okunduğunda */
  const handleBarCodeScanned = async ({ data }: BarcodeScanResult) => {
    // useRef → race condition fix: state'in batch'ini beklemez
    if (handlingRef.current) return;
    handlingRef.current = true;

    const lower = data.toLowerCase().trim();

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
        shiftType = await detectShiftType();
      }
      await saveShiftEntry(shiftType);
      return;
    }

    /* Mesai dışı QR */
    Alert.alert(
      'QR Kod Okundu',
      `Veri: ${data}`,
      [{
        text: 'Tamam',
        onPress: () => {
          handlingRef.current = false;
          setScanning(false);
          setCameraReady(false);
        },
      }]
    );
  };

  const startScanning = () => {
    handlingRef.current = false;
    setSuccessInfo(null);
    setScanning(true);
  };

  const stopScanning = () => {
    handlingRef.current = false;
    setScanning(false);
    setCameraReady(false);
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

          <View style={styles.nfcIconArea}>
            <View style={[styles.nfcCircle, nfcScanning && styles.nfcCircleActive]}>
              <Ionicons name="radio-outline" size={64} color={nfcScanning ? colors.primary : colors.textDisabled} />
            </View>
            <Text style={styles.nfcStatusText}>
              {nfcScanning ? 'NFC tag bekleniyor...' : 'Mesai giriş/çıkış için NFC okutun'}
            </Text>
            <Text style={styles.hintText}>Telefonunuzu NFC etiketine yaklaştırın</Text>
          </View>

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

  /* QR modu — varsayılan
     scanning=false: ortada büyük "Taramaya Başla" butonu (kamera mount değil → performans)
     scanning=true:  CameraView mount, taramaya hazır
     successInfo:    başarı animasyonu (kameranın üstünde)
  */
  return (
    <View style={styles.container}>
      {/* Mod seçici (üstte) */}
      {nfcSupported && !scanning && (
        <View style={[styles.modeSwitch, styles.modeSwitchTop]}>
          <TouchableOpacity style={[styles.modeBtn, styles.modeBtnActive]}>
            <Ionicons name="qr-code-outline" size={20} color="#fff" />
            <Text style={[styles.modeBtnText, { color: '#fff' }]}>QR</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.modeBtn} onPress={() => setMode('nfc')}>
            <Ionicons name="radio-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.modeBtnText}>NFC</Text>
          </TouchableOpacity>
        </View>
      )}

      {!scanning ? (
        /* Kamera henüz açılmadı — Taramaya Başla butonu */
        <View style={styles.idleContainer}>
          <View style={styles.idleIconCircle}>
            <Ionicons name="qr-code-outline" size={88} color={colors.primary} />
          </View>
          <Text style={styles.idleTitle}>Mesai QR Tarayıcı</Text>
          <Text style={styles.idleSubtitle}>
            Tarayıcıyı başlatmak için aşağıdaki butona dokunun.
            QR okunduktan sonra otomatik kapanır.
          </Text>
          <TouchableOpacity style={styles.startBtn} onPress={startScanning} activeOpacity={0.8}>
            <Ionicons name="scan-outline" size={26} color="#fff" />
            <Text style={styles.startBtnText}>Taramaya Başla</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* Kamera açık */
        <>
          <CameraView
            style={styles.camera}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handlingRef.current ? undefined : handleBarCodeScanned}
            onCameraReady={() => setCameraReady(true)}
          />

          {/* Loading overlay (kamera ısınıyor) */}
          {!cameraReady && (
            <View style={[styles.overlay, styles.cameraLoadingOverlay]}>
              <ActivityIndicator size="large" color={colors.textWhite} />
              <Text style={styles.scanText}>Kamera başlatılıyor…</Text>
            </View>
          )}

          {/* Tarama overlay (kamera hazırsa) */}
          {cameraReady && !successInfo && (
            <View style={styles.overlay}>
              <View style={styles.scanFrame}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
              <Text style={styles.scanText}>QR kodu çerçeveye yerleştirin</Text>
              <Text style={styles.hintText}>Mesai QR okutun — otomatik giriş/çıkış</Text>

              {/* Vazgeç butonu */}
              <TouchableOpacity style={styles.cancelBtn} onPress={stopScanning} activeOpacity={0.7}>
                <Ionicons name="close" size={20} color="#fff" />
                <Text style={styles.cancelBtnText}>Vazgeç</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Başarı animasyonu */}
          {successInfo && (
            <Animated.View
              style={[
                styles.overlay,
                styles.successOverlay,
                { opacity: successOpacity },
              ]}
            >
              <Animated.View
                style={[
                  styles.successCircle,
                  {
                    backgroundColor: successInfo.type === 'entry' ? '#16a34a' : '#dc2626',
                    transform: [{ scale: successScale }],
                  },
                ]}
              >
                <Animated.View
                  style={{
                    transform: [{
                      rotate: checkRotate.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['-90deg', '0deg'],
                      }),
                    }],
                  }}
                >
                  <Ionicons
                    name={successInfo.type === 'entry' ? 'log-in' : 'log-out'}
                    size={88}
                    color="#fff"
                  />
                </Animated.View>
              </Animated.View>

              <Animated.Text
                style={[
                  styles.successTitle,
                  { transform: [{ scale: successScale }] },
                ]}
              >
                {successInfo.type === 'entry' ? 'Mesai Girişi' : 'Mesai Çıkışı'}
              </Animated.Text>

              <Animated.View style={{ transform: [{ scale: successScale }], alignItems: 'center' }}>
                <Text style={styles.successName}>{successInfo.name}</Text>
                <Text style={styles.successTime}>{successInfo.time}</Text>
              </Animated.View>
            </Animated.View>
          )}
        </>
      )}
    </View>
  );
};

const CORNER_SIZE = 30;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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

  /* Idle (kamera kapalı) */
  idleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  idleIconCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 2,
    borderColor: '#bfdbfe',
  },
  idleTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  idleSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.primary,
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: borderRadius.full,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  startBtnText: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: '#fff',
  },

  /* Camera */
  camera: {
    flex: 1,
  },
  overlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  cameraLoadingOverlay: {
    backgroundColor: 'rgba(0,0,0,0.7)',
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
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 38, 38, 0.9)',
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: borderRadius.full,
    marginTop: 32,
  },
  cancelBtnText: {
    color: '#fff',
    fontSize: fontSize.sm,
    fontWeight: '600',
  },

  /* Başarı animasyonu */
  successOverlay: {
    backgroundColor: 'rgba(0,0,0,0.85)',
  },
  successCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  successTitle: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
    marginBottom: spacing.sm,
    letterSpacing: 1,
  },
  successName: {
    color: '#fff',
    fontSize: fontSize.md,
    fontWeight: '600',
    opacity: 0.9,
  },
  successTime: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 2,
  },

  /* NFC stiller */
  nfcContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: borderRadius.full,
    padding: 4,
    gap: 4,
  },
  modeSwitchTop: {
    position: 'absolute',
    top: 60,
    alignSelf: 'center',
    zIndex: 10,
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
