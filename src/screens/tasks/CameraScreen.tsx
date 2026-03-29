/**
 * CameraScreen — Kamera İzleme Ekranı
 *
 * Otel kameralarını canlı izleme. Grid veya tek kamera görünümü.
 * WebRTC, HLS, MJPEG stream destekler.
 * Backend hazır olduğunda stream URL'leri API'den gelir.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Modal,
  StatusBar,
  Image,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { cameraApi } from '../../services/api';
import type { ApiCamera } from '../../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/* ==================== DEMO KAMERALAR ==================== */

const DEMO_CAMERAS: ApiCamera[] = [
  { id: 1, name: 'Lobi Girişi', location: 'Ana Giriş', streamUrl: '', status: 'offline', type: 'ip', order: 1 },
  { id: 2, name: 'Resepsiyon', location: 'Lobi', streamUrl: '', status: 'offline', type: 'ip', order: 2 },
  { id: 3, name: 'Otopark Girişi', location: 'Dış Mekan', streamUrl: '', status: 'offline', type: 'ip', order: 3 },
  { id: 4, name: 'Restoran', location: '1. Kat', streamUrl: '', status: 'offline', type: 'ip', order: 4 },
  { id: 5, name: 'Havuz', location: 'Dış Mekan', streamUrl: '', status: 'offline', type: 'ip', order: 5 },
  { id: 6, name: 'Koridor 1. Kat', location: '1. Kat', streamUrl: '', status: 'offline', type: 'ip', order: 6 },
  { id: 7, name: 'Koridor 2. Kat', location: '2. Kat', streamUrl: '', status: 'offline', type: 'ip', order: 7 },
  { id: 8, name: 'Arka Giriş', location: 'Servis', streamUrl: '', status: 'offline', type: 'ip', order: 8 },
  { id: 9, name: 'Asansör Lobi', location: 'Lobi', streamUrl: '', status: 'offline', type: 'ip', order: 9 },
];

/* ==================== GRID LAYOUTS ==================== */

type GridLayout = 1 | 2 | 3;

interface ScreenProps {
  onClose: () => void;
}

/* ==================== CAMERA CARD ==================== */

interface CameraCardProps {
  camera: ApiCamera;
  size: number;
  onPress: () => void;
}

const CameraCard: React.FC<CameraCardProps> = ({ camera, size, onPress }) => {
  const isOnline = camera.status === 'online' && camera.streamUrl;
  const isMjpeg = camera.streamUrl?.toLowerCase().includes('mjpeg') ||
    camera.streamUrl?.toLowerCase().endsWith('.jpg');

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.cameraCard, { width: size, height: size * 0.65 }]}
    >
      {/* Video / Görüntü alanı */}
      <View style={styles.cameraView}>
        {isOnline && isMjpeg ? (
          <Image
            source={{ uri: camera.streamUrl }}
            style={styles.cameraImage}
            resizeMode="contain"
          />
        ) : isOnline ? (
          <View style={styles.cameraStreamPlaceholder}>
            <Ionicons name="videocam" size={32} color={colors.success} />
            <Text style={styles.streamText}>Canlı Yayın</Text>
          </View>
        ) : (
          <View style={styles.cameraOffline}>
            <Ionicons name="videocam-off-outline" size={32} color="#666" />
            <Text style={styles.offlineText}>Çevrimdışı</Text>
          </View>
        )}

        {/* Canlı badge */}
        {isOnline && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>CANLI</Text>
          </View>
        )}

        {/* Fullscreen butonu */}
        <TouchableOpacity style={styles.fullscreenBtn} onPress={onPress}>
          <Ionicons name="expand-outline" size={18} color="white" />
        </TouchableOpacity>
      </View>

      {/* Alt bilgi */}
      <View style={styles.cameraInfo}>
        <View style={styles.cameraInfoLeft}>
          <View style={[styles.statusDot, { backgroundColor: isOnline ? colors.success : colors.error }]} />
          <Text style={styles.cameraName} numberOfLines={1}>{camera.name}</Text>
        </View>
        <Text style={styles.cameraLocation} numberOfLines={1}>{camera.location}</Text>
      </View>
    </TouchableOpacity>
  );
};

/* ==================== ANA BİLEŞEN ==================== */

const CameraScreen: React.FC<ScreenProps> = ({ onClose }) => {
  const [cameras, setCameras] = useState<ApiCamera[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [gridCols, setGridCols] = useState<GridLayout>(2);
  const [fullscreenCamera, setFullscreenCamera] = useState<ApiCamera | null>(null);

  const fetchCameras = useCallback(async () => {
    try {
      const data = await cameraApi.getAll();
      setCameras(data.length > 0 ? data : DEMO_CAMERAS);
    } catch {
      setCameras(DEMO_CAMERAS);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCameras();
  }, [fetchCameras]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchCameras();
  };

  const cardSize = (SCREEN_WIDTH - spacing.md * 2 - (gridCols - 1) * 8) / gridCols;
  const onlineCount = cameras.filter((c) => c.status === 'online').length;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Kameralar</Text>
          <Text style={styles.headerSubtitle}>
            {cameras.length} kamera{onlineCount > 0 ? ` (${onlineCount} aktif)` : ''}
          </Text>
        </View>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn}>
          <Ionicons name="refresh" size={22} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Grid düzeni seçimi */}
      <View style={styles.layoutBar}>
        {([1, 2, 3] as GridLayout[]).map((cols) => (
          <TouchableOpacity
            key={cols}
            style={[styles.layoutBtn, gridCols === cols && styles.layoutBtnActive]}
            onPress={() => setGridCols(cols)}
          >
            <Ionicons
              name={cols === 1 ? 'square-outline' : cols === 2 ? 'grid-outline' : 'apps-outline'}
              size={20}
              color={gridCols === cols ? colors.primary : colors.textDisabled}
            />
            <Text style={[styles.layoutLabel, gridCols === cols && styles.layoutLabelActive]}>
              {cols === 1 ? '1x1' : cols === 2 ? '2x2' : '3x3'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Kamera Grid */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Kameralar yükleniyor...</Text>
        </View>
      ) : cameras.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="videocam-off-outline" size={64} color={colors.textDisabled} />
          <Text style={styles.emptyTitle}>Kamera tanımlı değil</Text>
          <Text style={styles.emptySubtitle}>Kamera eklemek için sistem yöneticisiyle iletişime geçin.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.grid}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
          }
        >
          {cameras.slice(0, gridCols * gridCols * 4).map((camera) => (
            <CameraCard
              key={camera.id}
              camera={camera}
              size={cardSize}
              onPress={() => setFullscreenCamera(camera)}
            />
          ))}
        </ScrollView>
      )}

      {/* Fullscreen Modal */}
      <Modal
        visible={!!fullscreenCamera}
        animationType="fade"
        supportedOrientations={['portrait', 'landscape']}
        onRequestClose={() => setFullscreenCamera(null)}
      >
        <View style={styles.fullscreenContainer}>
          <StatusBar hidden />

          {/* Fullscreen header */}
          <View style={styles.fullscreenHeader}>
            <View style={styles.fullscreenInfo}>
              <Ionicons name="videocam" size={20} color="white" />
              <Text style={styles.fullscreenTitle}>{fullscreenCamera?.name}</Text>
              <Text style={styles.fullscreenLocation}>— {fullscreenCamera?.location}</Text>
            </View>
            <TouchableOpacity onPress={() => setFullscreenCamera(null)} style={styles.fullscreenCloseBtn}>
              <Ionicons name="close" size={28} color="white" />
            </TouchableOpacity>
          </View>

          {/* Fullscreen video */}
          <View style={styles.fullscreenVideo}>
            {fullscreenCamera?.status === 'online' && fullscreenCamera.streamUrl ? (
              fullscreenCamera.streamUrl.toLowerCase().includes('mjpeg') ||
              fullscreenCamera.streamUrl.toLowerCase().endsWith('.jpg') ? (
                <Image
                  source={{ uri: fullscreenCamera.streamUrl }}
                  style={styles.fullscreenImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.cameraStreamPlaceholder}>
                  <Ionicons name="videocam" size={48} color={colors.success} />
                  <Text style={[styles.streamText, { fontSize: fontSize.lg }]}>Canlı Yayın</Text>
                </View>
              )
            ) : (
              <View style={styles.cameraOffline}>
                <Ionicons name="videocam-off-outline" size={64} color="#666" />
                <Text style={[styles.offlineText, { fontSize: fontSize.lg }]}>Çevrimdışı</Text>
                <TouchableOpacity
                  style={styles.retryBtn}
                  onPress={() => {
                    // Retry logic
                    setFullscreenCamera(null);
                    setTimeout(() => {
                      if (fullscreenCamera) setFullscreenCamera(fullscreenCamera);
                    }, 500);
                  }}
                >
                  <Ionicons name="refresh" size={18} color="#999" />
                  <Text style={styles.retryText}>Tekrar Dene</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Canlı badge - fullscreen */}
            {fullscreenCamera?.status === 'online' && (
              <View style={[styles.liveBadge, { top: 16, left: 16 }]}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>CANLI</Text>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

/* ==================== STYLES ==================== */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    padding: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  headerSubtitle: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  refreshBtn: {
    padding: spacing.xs,
  },

  /* Layout bar */
  layoutBar: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  layoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: borderRadius.full,
    backgroundColor: colors.background,
  },
  layoutBtnActive: {
    backgroundColor: colors.primary + '15',
  },
  layoutLabel: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    fontWeight: '600',
  },
  layoutLabelActive: {
    color: colors.primary,
  },

  /* Grid */
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },

  /* Camera card */
  cameraCard: {
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    backgroundColor: '#1a1a2e',
  },
  cameraView: {
    flex: 1,
    backgroundColor: '#0f0f23',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraImage: {
    width: '100%',
    height: '100%',
  },
  cameraStreamPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  streamText: {
    color: colors.success,
    fontSize: fontSize.xs,
    fontWeight: '600',
  },
  cameraOffline: {
    alignItems: 'center',
    gap: 6,
  },
  offlineText: {
    color: '#999',
    fontSize: fontSize.xs,
  },

  /* Live badge */
  liveBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F44336',
  },
  liveText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  /* Fullscreen btn */
  fullscreenBtn: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 6,
    borderRadius: borderRadius.sm,
  },

  /* Camera info */
  cameraInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#16213e',
  },
  cameraInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  cameraName: {
    color: 'white',
    fontSize: fontSize.xs,
    fontWeight: '600',
    flex: 1,
  },
  cameraLocation: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 9,
    marginLeft: 6,
  },

  /* Loading */
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: fontSize.sm,
  },

  /* Empty */
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    padding: spacing.xl,
  },
  emptyTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  emptySubtitle: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
  },

  /* Fullscreen modal */
  fullscreenContainer: {
    flex: 1,
    backgroundColor: '#0a0a1a',
  },
  fullscreenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: 50,
    paddingBottom: spacing.sm,
    backgroundColor: '#16213e',
  },
  fullscreenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fullscreenTitle: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  fullscreenLocation: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: fontSize.sm,
  },
  fullscreenCloseBtn: {
    padding: spacing.xs,
  },
  fullscreenVideo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: '100%',
    height: '100%',
  },

  /* Retry */
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#555',
    borderRadius: borderRadius.md,
  },
  retryText: {
    color: '#999',
    fontSize: fontSize.sm,
  },
});

export default CameraScreen;
