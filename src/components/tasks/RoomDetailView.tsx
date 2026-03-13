/**
 * RoomDetailView - Oda Detay Görünümü
 *
 * Oda durumu ekranından bir odaya tıklanınca açılır.
 * Oda bilgilerini gösterir, durum değiştirme ve arıza bildirme imkanı sunar.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { AppCard, AppButton, AppInput, StatusChip } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  ROOM_STATUS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
  FAULT_CATEGORIES,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';

export interface Room {
  id: number;
  number: string;
  bedType: string;
  floor: number;
  capacity: number;
  status: string;
  guestName?: string;
  lastCleaned?: string;
  cleanedBy?: string;
}

interface RoomDetailViewProps {
  room: Room;
  onClose: () => void;
  onStatusChange: (roomNumber: string, newStatus: string) => void;
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Tek Kişilik',
  double: 'Çift Kişilik',
  twin: 'Twin',
  king: 'King',
};

const getStatusIcon = (status: string): string => {
  switch (status) {
    case ROOM_STATUS.AVAILABLE: return 'checkmark-circle';
    case ROOM_STATUS.OCCUPIED: return 'person';
    case ROOM_STATUS.DIRTY: return 'alert-circle';
    case ROOM_STATUS.MAINTENANCE: return 'construct';
    case ROOM_STATUS.BLOCKED: return 'lock-closed';
    default: return 'help-circle';
  }
};

const getStatusActions = (currentStatus: string): { value: string; label: string; icon: string; color: string }[] => {
  switch (currentStatus) {
    case ROOM_STATUS.DIRTY:
      return [
        { value: ROOM_STATUS.AVAILABLE, label: 'Temiz Yap', icon: 'checkmark-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] },
      ];
    case ROOM_STATUS.MAINTENANCE:
      return [
        { value: ROOM_STATUS.AVAILABLE, label: 'Bakım Bitti', icon: 'checkmark-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.AVAILABLE] },
      ];
    case ROOM_STATUS.AVAILABLE:
      return [
        { value: ROOM_STATUS.DIRTY, label: 'Kirli Yap', icon: 'alert-circle', color: ROOM_STATUS_COLORS[ROOM_STATUS.DIRTY] },
        { value: ROOM_STATUS.MAINTENANCE, label: 'Bakıma Al', icon: 'construct', color: ROOM_STATUS_COLORS[ROOM_STATUS.MAINTENANCE] },
      ];
    default:
      return [];
  }
};

const RoomDetailView: React.FC<RoomDetailViewProps> = ({ room, onClose, onStatusChange }) => {
  const { user } = useAuth();
  const [faultCategory, setFaultCategory] = useState('');
  const [faultDescription, setFaultDescription] = useState('');
  const [faultPhotos, setFaultPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getFullYear()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleStatusChange = (newStatus: string) => {
    const statusLabel = ROOM_STATUS_LABELS[newStatus];
    Alert.alert(
      'Oda Durumu Güncelle',
      `Oda ${room.number} → ${statusLabel} olarak işaretlensin mi?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Güncelle',
          onPress: () => onStatusChange(room.number, newStatus),
        },
      ]
    );
  };

  /** Fotoğraf ekleme */
  const handleAddPhoto = () => {
    Alert.alert('Fotoğraf Ekle', 'Fotoğraf kaynağını seçin', [
      {
        text: 'Kamera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('İzin Gerekli', 'Kamera izni gerekli');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
          if (!result.canceled) {
            setFaultPhotos((prev) => [...prev, result.assets[0].uri]);
          }
        },
      },
      {
        text: 'Galeri',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsMultipleSelection: true,
            quality: 0.7,
          });
          if (!result.canceled) {
            setFaultPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
          }
        },
      },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  const removePhoto = (index: number) => {
    setFaultPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /** Arıza bildir */
  const handleSubmitFault = () => {
    const newErrors: Record<string, string> = {};
    if (!faultCategory) newErrors.category = 'Kategori seçin';
    if (!faultDescription.trim()) newErrors.description = 'Açıklama zorunlu';
    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    const faultData = {
      roomNumber: room.number,
      category: faultCategory,
      description: faultDescription.trim(),
      photos: faultPhotos,
      reportedBy: String(user?.id ?? ''),
      reportedByName: user?.name ?? '',
      createdAt: new Date().toISOString(),
    };

    console.log('Oda arızası bildirildi:', faultData);

    Alert.alert(
      'Başarılı',
      `Oda ${room.number} için arıza kaydı oluşturuldu.`,
      [{
        text: 'Tamam',
        onPress: () => {
          setFaultCategory('');
          setFaultDescription('');
          setFaultPhotos([]);
          setErrors({});
        },
      }]
    );
  };

  const actions = getStatusActions(room.status);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Oda {room.number}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Oda Bilgi Kartı */}
        <AppCard style={styles.infoCard}>
          <View style={styles.roomHeader}>
            <View>
              <Text style={styles.roomNumber}>{room.number}</Text>
              <Text style={styles.floorText}>Kat {room.floor}</Text>
            </View>
            <View style={styles.statusArea}>
              <Ionicons
                name={getStatusIcon(room.status) as any}
                size={28}
                color={ROOM_STATUS_COLORS[room.status]}
              />
              <StatusChip
                label={ROOM_STATUS_LABELS[room.status]}
                color={ROOM_STATUS_COLORS[room.status]}
              />
            </View>
          </View>

          <View style={styles.divider} />

          {/* Detay Satırları */}
          <View style={styles.detailRow}>
            <Ionicons name="bed-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Yatak Tipi</Text>
            <Text style={styles.detailValue}>{BED_TYPE_LABELS[room.bedType] || room.bedType}</Text>
          </View>

          <View style={styles.detailRow}>
            <Ionicons name="people-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.detailLabel}>Kapasite</Text>
            <Text style={styles.detailValue}>{room.capacity} kişi</Text>
          </View>

          {room.status === ROOM_STATUS.OCCUPIED && room.guestName && (
            <View style={styles.detailRow}>
              <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Misafir</Text>
              <Text style={styles.detailValue}>{room.guestName}</Text>
            </View>
          )}

          {room.lastCleaned && (
            <View style={styles.detailRow}>
              <Ionicons name="sparkles-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Son Temizlik</Text>
              <Text style={styles.detailValue}>{formatDate(room.lastCleaned)}</Text>
            </View>
          )}

          {room.cleanedBy && (
            <View style={styles.detailRow}>
              <Ionicons name="hand-left-outline" size={18} color={colors.textSecondary} />
              <Text style={styles.detailLabel}>Temizleyen</Text>
              <Text style={styles.detailValue}>{room.cleanedBy}</Text>
            </View>
          )}
        </AppCard>

        {/* Durum Değiştirme */}
        {actions.length > 0 && (
          <AppCard style={styles.actionCard}>
            <Text style={styles.sectionTitle}>Durum Güncelle</Text>
            <View style={styles.actionRow}>
              {actions.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[styles.statusBtn, { borderColor: opt.color, backgroundColor: opt.color + '10' }]}
                  onPress={() => handleStatusChange(opt.value)}
                >
                  <Ionicons name={opt.icon as any} size={18} color={opt.color} />
                  <Text style={[styles.statusBtnText, { color: opt.color }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </AppCard>
        )}

        {/* Arıza / Hasar Bildir */}
        <AppCard style={styles.faultCard}>
          <View style={styles.faultTitleRow}>
            <Ionicons name="warning-outline" size={20} color={colors.error} />
            <Text style={styles.sectionTitle}>Arıza / Hasar Bildir</Text>
          </View>

          <Text style={styles.faultRoomInfo}>Oda: {room.number} (otomatik)</Text>

          {/* Kategori */}
          <Text style={styles.label}>Arıza Kategorisi</Text>
          {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
          <View style={styles.categoryGrid}>
            {FAULT_CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat.value}
                style={[
                  styles.categoryChip,
                  faultCategory === cat.value && styles.categoryChipActive,
                ]}
                onPress={() => {
                  setFaultCategory(cat.value);
                  if (errors.category) setErrors((p) => ({ ...p, category: '' }));
                }}
              >
                <Text
                  style={[
                    styles.categoryText,
                    faultCategory === cat.value && styles.categoryTextActive,
                  ]}
                >
                  {cat.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Açıklama */}
          <AppInput
            label="Açıklama"
            value={faultDescription}
            onChangeText={(text: string) => {
              setFaultDescription(text);
              if (errors.description) setErrors((p) => ({ ...p, description: '' }));
            }}
            placeholder="Arıza/hasarı detaylı açıklayın..."
            multiline
            error={errors.description}
          />

          {/* Fotoğraflar */}
          <Text style={styles.label}>Fotoğraflar</Text>
          <View style={styles.photoGrid}>
            {faultPhotos.map((uri, index) => (
              <View key={index} style={styles.photoWrapper}>
                <Image source={{ uri }} style={styles.photo} />
                <TouchableOpacity
                  style={styles.photoRemove}
                  onPress={() => removePhoto(index)}
                >
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
              <Ionicons name="camera-outline" size={28} color={colors.textSecondary} />
              <Text style={styles.addPhotoText}>Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Gönder */}
          <AppButton
            title="Arıza Bildir"
            onPress={handleSubmitFault}
            icon="send-outline"
            variant="danger"
          />
        </AppCard>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  infoCard: {
    marginBottom: spacing.md,
  },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomNumber: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
  },
  floorText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  statusArea: {
    alignItems: 'flex-end',
    gap: 6,
  },
  divider: {
    height: 1,
    backgroundColor: colors.divider,
    marginVertical: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    gap: 10,
  },
  detailLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  detailValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  actionCard: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
  },
  statusBtnText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  faultCard: {
    marginBottom: spacing.md,
  },
  faultTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.sm,
  },
  faultRoomInfo: {
    fontSize: fontSize.xs,
    color: colors.textDisabled,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  label: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  errorText: {
    fontSize: fontSize.xs,
    color: colors.error,
    marginBottom: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: spacing.md,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: borderRadius.full,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: colors.primary + '15',
    borderColor: colors.primary,
  },
  categoryText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  photoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: spacing.md,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
  },
  photoRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.surface,
    borderRadius: 11,
  },
  addPhotoBtn: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.md,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addPhotoText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
});

export default RoomDetailView;
