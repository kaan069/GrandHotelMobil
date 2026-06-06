/**
 * MrzScanModal — Kimlik & Pasaport MRZ Kamera Tarayıcı
 *
 * Akış:
 *   1. Modal açılınca kamera mount olur, ortada kimlik çerçevesi belirir
 *   2. Çerçevenin içinde aşağı/yukarı kayan tarama çizgisi animasyonu
 *   3. Her ~900ms'de düşük çözünürlüklü foto çek → ML Kit OCR → MRZ parse dene
 *   4. MRZ bulunduğunda titreşim + yeşil tik animasyonu → onScan(data) → kapan
 *   5. Kullanıcı "Vazgeç" butonuyla istediği an kapatabilir
 *
 * On-device çalışır (internet yok): @react-native-ml-kit/text-recognition.
 * Modül yüklü değilse modal hata mesajıyla açılır (graceful fallback).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Vibration,
  Dimensions,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';

import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { parseMrz, MrzData } from '../../utils/mrzParser';

/* ML Kit text recognition — opsiyonel native modül (Expo dev build gerekli) */
let TextRecognition: { recognize: (uri: string) => Promise<{ text: string }> } | null = null;
try {
  TextRecognition = require('@react-native-ml-kit/text-recognition').default;
} catch {
  TextRecognition = null;
}

interface MrzScanModalProps {
  visible: boolean;
  onClose: () => void;
  onScan: (data: MrzData) => void;
}

const { width: SCREEN_W } = Dimensions.get('window');
/* Kimlik kartı oranı (ISO/IEC 7810 ID-1): 85.6 × 54 mm → 1.586 */
const FRAME_W = SCREEN_W * 0.86;
const FRAME_H = FRAME_W / 1.586;
const SCAN_INTERVAL_MS = 900;

const MrzScanModal: React.FC<MrzScanModalProps> = ({ visible, onClose, onScan }) => {
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [hint, setHint] = useState('Kimlik kartının arkasını veya pasaportu çerçeveye yaklaştırın');
  const [success, setSuccess] = useState(false);
  const cameraRef = useRef<CameraView | null>(null);
  /* Tarama akışını durdurmak için flag (capture ile başarı arasındaki yarışı engeller) */
  const stoppedRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /* Aynı framede iki capture başlamasın */
  const busyRef = useRef(false);

  /* Animasyon değerleri */
  const scanLineY = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  /* Tarama çizgisi sürekli aşağı/yukarı kayar */
  const startScanLineAnim = useCallback(() => {
    scanLineY.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineY, {
          toValue: FRAME_H - 4,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scanLineY, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [scanLineY]);

  /* Başarı animasyonu */
  const playSuccessAnimation = useCallback((data: MrzData) => {
    setSuccess(true);
    Vibration.vibrate(150);
    Animated.parallel([
      Animated.spring(successScale, { toValue: 1, tension: 80, friction: 6, useNativeDriver: true }),
      Animated.timing(successOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();

    setTimeout(() => {
      onScan(data);
      handleClose();
    }, 900);
  }, [onScan, successScale, successOpacity]);

  /* Kameradan foto çek + OCR + parse */
  const captureAndScan = useCallback(async () => {
    if (busyRef.current || stoppedRef.current) return;
    if (!cameraRef.current || !TextRecognition) return;
    busyRef.current = true;
    try {
      /* Düşük çözünürlük: hız + boyut. shutterSound yok. */
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.5,
        skipProcessing: true,
        shutterSound: false,
        base64: false,
      });
      if (!photo?.uri || stoppedRef.current) return;

      const result = await TextRecognition.recognize(photo.uri);
      if (stoppedRef.current) return;

      /* DEBUG: OCR çıktısını göster — sorun çözülünce kaldırılacak */
      console.log('[MRZ OCR]', JSON.stringify(result.text));

      const data = parseMrz(result.text || '');
      if (data) {
        console.log('[MRZ PARSED]', JSON.stringify(data));
        stoppedRef.current = true;
        if (intervalRef.current) clearInterval(intervalRef.current);
        playSuccessAnimation(data);
      } else {
        console.log('[MRZ PARSE FAIL] — yukarıdaki OCR metni eşleşmedi');
      }
    } catch (e) {
      console.log('[MRZ ERROR]', e);
    } finally {
      busyRef.current = false;
    }
  }, [playSuccessAnimation]);

  /* Modal açılınca tarama döngüsünü başlat */
  useEffect(() => {
    if (!visible) return;
    stoppedRef.current = false;
    busyRef.current = false;
    setSuccess(false);
    setCameraReady(false);
    successScale.setValue(0);
    successOpacity.setValue(0);

    if (!TextRecognition) {
      setHint('ML Kit modülü yüklü değil. Lütfen kurulum talimatlarını uygulayın.');
      return;
    }

    return () => {
      stoppedRef.current = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [visible, successScale, successOpacity]);

  /* Kamera hazır olduğunda capture döngüsünü başlat */
  useEffect(() => {
    if (!cameraReady || !visible || stoppedRef.current) return;
    startScanLineAnim();
    /* Kamerayı 400ms ısınmaya bırak */
    const t = setTimeout(() => {
      if (stoppedRef.current) return;
      captureAndScan();
      intervalRef.current = setInterval(captureAndScan, SCAN_INTERVAL_MS);
    }, 400);
    return () => clearTimeout(t);
  }, [cameraReady, visible, captureAndScan, startScanLineAnim]);

  const handleClose = useCallback(() => {
    stoppedRef.current = true;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCameraReady(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  /* Kamera izni yok */
  if (!permission?.granted) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permContainer}>
          <Ionicons name="camera-outline" size={72} color="#fff" />
          <Text style={styles.permTitle}>Kamera İzni Gerekli</Text>
          <Text style={styles.permSubtitle}>
            Kimlik tarama için kameraya erişim izni gerekiyor.
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>İzin Ver</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleClose} style={{ marginTop: spacing.md }}>
            <Text style={styles.cancelText}>Vazgeç</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  /* ML Kit yüklü değilse uyarı */
  if (!TextRecognition) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
        <View style={styles.permContainer}>
          <Ionicons name="warning-outline" size={72} color="#fbbf24" />
          <Text style={styles.permTitle}>Modül Eksik</Text>
          <Text style={styles.permSubtitle}>
            MRZ tarama için @react-native-ml-kit/text-recognition kurulumu yapılmalı:{'\n\n'}
            npm install @react-native-ml-kit/text-recognition{'\n'}
            npx expo run:ios  (veya run:android)
          </Text>
          <TouchableOpacity style={styles.permBtn} onPress={handleClose}>
            <Text style={styles.permBtnText}>Tamam</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <View style={styles.container}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          onCameraReady={() => setCameraReady(true)}
        />

        {/* Karartma overlay'i — çerçevenin dışı koyulaştırılmış görünür */}
        <View style={styles.dimOverlay} pointerEvents="none">
          <View style={styles.dimTop} />
          <View style={styles.dimMiddleRow}>
            <View style={styles.dimSide} />
            <View style={styles.frameCutout} />
            <View style={styles.dimSide} />
          </View>
          <View style={styles.dimBottom} />
        </View>

        {/* Çerçeve + tarama çizgisi */}
        <View style={styles.frameContainer} pointerEvents="none">
          <View style={styles.frame}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
            {!success && (
              <Animated.View
                style={[
                  styles.scanLine,
                  { transform: [{ translateY: scanLineY }] },
                ]}
              />
            )}
          </View>
        </View>

        {/* Üst başlık */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.topTitle}>MRZ Tara</Text>
          <View style={{ width: 28 }} />
        </View>

        {/* Alt yönlendirme */}
        <View style={styles.bottomBar}>
          {!cameraReady ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.hintText}>Kamera başlatılıyor…</Text>
            </View>
          ) : (
            <>
              <Text style={styles.hintText}>{hint}</Text>
              <Text style={styles.subHintText}>
                Kartı çerçevenin içinde sabit tutun — okunduğunda otomatik kapanır
              </Text>
            </>
          )}
        </View>

        {/* Başarı animasyonu */}
        {success && (
          <Animated.View style={[styles.successOverlay, { opacity: successOpacity }]}>
            <Animated.View
              style={[styles.successCircle, { transform: [{ scale: successScale }] }]}
            >
              <Ionicons name="checkmark" size={88} color="#fff" />
            </Animated.View>
            <Text style={styles.successText}>Okundu!</Text>
          </Animated.View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  camera: { ...StyleSheet.absoluteFillObject },

  /* Karartma — çerçevenin dışı yarı şeffaf siyah */
  dimOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  dimTop: { position: 'absolute', top: 0, left: 0, right: 0, height: (Dimensions.get('window').height - FRAME_H) / 2, backgroundColor: 'rgba(0,0,0,0.55)' },
  dimMiddleRow: { flexDirection: 'row', height: FRAME_H, width: '100%' },
  dimSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  frameCutout: { width: FRAME_W, height: FRAME_H },
  dimBottom: { position: 'absolute', bottom: 0, left: 0, right: 0, height: (Dimensions.get('window').height - FRAME_H) / 2, backgroundColor: 'rgba(0,0,0,0.55)' },

  /* Çerçeve */
  frameContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center' },
  frame: { width: FRAME_W, height: FRAME_H, position: 'relative' },
  corner: { position: 'absolute', width: 28, height: 28, borderColor: '#22c55e' },
  cornerTL: { top: -2, left: -2, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 6 },
  cornerTR: { top: -2, right: -2, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 6 },
  cornerBL: { bottom: -2, left: -2, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 6 },
  cornerBR: { bottom: -2, right: -2, borderBottomWidth: 4, borderRightWidth: 4, borderBottomRightRadius: 6 },
  scanLine: {
    position: 'absolute',
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: '#22c55e',
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 8,
    elevation: 10,
  },

  /* Üst */
  topBar: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  closeBtn: { padding: 4 },
  topTitle: { color: '#fff', fontSize: fontSize.lg, fontWeight: '700' },

  /* Alt */
  bottomBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 60 : 40,
    left: spacing.md,
    right: spacing.md,
    alignItems: 'center',
  },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  hintText: { color: '#fff', fontSize: fontSize.md, fontWeight: '600', textAlign: 'center' },
  subHintText: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, marginTop: 6, textAlign: 'center' },

  /* Başarı */
  successOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  successCircle: { width: 140, height: 140, borderRadius: 70, backgroundColor: '#16a34a', justifyContent: 'center', alignItems: 'center' },
  successText: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.lg },

  /* İzin */
  permContainer: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: spacing.lg },
  permTitle: { color: '#fff', fontSize: fontSize.xl, fontWeight: '700', marginTop: spacing.md },
  permSubtitle: { color: 'rgba(255,255,255,0.8)', fontSize: fontSize.md, textAlign: 'center', marginTop: spacing.sm, lineHeight: 22 },
  permBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, borderRadius: borderRadius.md, marginTop: spacing.lg },
  permBtnText: { color: '#fff', fontWeight: '700', fontSize: fontSize.md },
  cancelText: { color: 'rgba(255,255,255,0.7)', fontSize: fontSize.md },
});

export default MrzScanModal;
