/**
 * FaultCreateScreen - Arıza Oluşturma Ekranı
 *
 * TÜM ROLLER için erişilebilir.
 * Personel arıza/problem bildirir:
 *   - Oda numarası
 *   - Arıza kategorisi
 *   - Açıklama
 *   - Fotoğraf ekleme (galeriden veya kameradan)
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

import { AppButton, AppInput, AppCard } from '../../components/common';
import useAuth from '../../hooks/useAuth';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { FAULT_CATEGORIES } from '../../utils/constants';

interface FaultCreateScreenProps {
  onClose: () => void;
}

interface FaultData {
  roomNumber: string;
  category: string;
  description: string;
  photos: string[];
  reportedBy: string;
  reportedByName: string;
  createdAt: string;
}

const FaultCreateScreen: React.FC<FaultCreateScreenProps> = ({ onClose }) => {
  const { user } = useAuth();

  const [roomNumber, setRoomNumber] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  /** Galeriden fotoğraf seç */
  const pickFromGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, ...result.assets.map((a) => a.uri)]);
    }
  };

  /** Kameradan fotoğraf çek */
  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('İzin Gerekli', 'Fotoğraf çekmek için kamera izni gerekli');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.7,
    });

    if (!result.canceled) {
      setPhotos((prev) => [...prev, result.assets[0].uri]);
    }
  };

  /** Fotoğraf ekleme seçenekleri */
  const handleAddPhoto = () => {
    Alert.alert('Fotoğraf Ekle', 'Fotoğraf kaynağını seçin', [
      { text: 'Kamera', onPress: takePhoto },
      { text: 'Galeri', onPress: pickFromGallery },
      { text: 'İptal', style: 'cancel' },
    ]);
  };

  /** Fotoğrafı kaldır */
  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  /** Form doğrulama */
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!roomNumber.trim()) newErrors.roomNumber = 'Oda numarası zorunlu';
    if (!category) newErrors.category = 'Kategori seçin';
    if (!description.trim()) newErrors.description = 'Açıklama zorunlu';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /** Arızayı gönder */
  const handleSubmit = () => {
    if (!validate()) return;

    /* Backend'e gönderilecek veri */
    const faultData: FaultData = {
      roomNumber: roomNumber.trim(),
      category,
      description: description.trim(),
      photos,
      reportedBy: String(user?.id ?? ''),
      reportedByName: user?.name ?? '',
      createdAt: new Date().toISOString(),
    };

    console.log('Arıza bildirildi:', faultData);

    Alert.alert(
      'Başarılı',
      'Arıza kaydı oluşturuldu. Teknik ekibe bildirildi.',
      [{ text: 'Tamam', onPress: onClose }]
    );
  };

  return (
    <View style={styles.container}>
      {/* Başlık */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>Arıza Bildir</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Oda Numarası */}
        <AppInput
          label="Oda Numarası"
          value={roomNumber}
          onChangeText={(text: string) => {
            setRoomNumber(text);
            if (errors.roomNumber) setErrors((p) => ({ ...p, roomNumber: '' }));
          }}
          placeholder="Örn: 201"
          icon="bed-outline"
          keyboardType="number-pad"
          error={errors.roomNumber}
        />

        {/* Arıza Kategorisi */}
        <Text style={styles.label}>Arıza Kategorisi</Text>
        {errors.category && <Text style={styles.errorText}>{errors.category}</Text>}
        <View style={styles.categoryGrid}>
          {FAULT_CATEGORIES.map((cat) => (
            <TouchableOpacity
              key={cat.value}
              style={[
                styles.categoryChip,
                category === cat.value && styles.categoryChipActive,
              ]}
              onPress={() => {
                setCategory(cat.value);
                if (errors.category) setErrors((p) => ({ ...p, category: '' }));
              }}
            >
              <Text
                style={[
                  styles.categoryText,
                  category === cat.value && styles.categoryTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Açıklama */}
        <AppInput
          label="Arıza Açıklaması"
          value={description}
          onChangeText={(text: string) => {
            setDescription(text);
            if (errors.description) setErrors((p) => ({ ...p, description: '' }));
          }}
          placeholder="Arızayı detaylı açıklayın..."
          multiline
          error={errors.description}
        />

        {/* Fotoğraf ekleme */}
        <Text style={styles.label}>Fotoğraflar</Text>
        <View style={styles.photoGrid}>
          {photos.map((uri, index) => (
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

          {/* Fotoğraf ekle butonu */}
          <TouchableOpacity style={styles.addPhotoBtn} onPress={handleAddPhoto}>
            <Ionicons name="camera-outline" size={32} color={colors.textSecondary} />
            <Text style={styles.addPhotoText}>Ekle</Text>
          </TouchableOpacity>
        </View>

        {/* Gönder butonu */}
        <AppButton
          title="Arıza Bildir"
          onPress={handleSubmit}
          icon="send-outline"
          style={styles.submitButton}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
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
    marginBottom: spacing.lg,
  },
  photoWrapper: {
    position: 'relative',
  },
  photo: {
    width: 90,
    height: 90,
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
    width: 90,
    height: 90,
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
    marginTop: 4,
  },
  submitButton: {
    marginTop: spacing.sm,
  },
});

export default FaultCreateScreen;
