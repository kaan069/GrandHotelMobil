/**
 * GuestSearchModal - Kayıtlı Misafir Arama
 *
 * TC veya isimle arama yapılır.
 * Seçilen misafir onay sonrası odaya eklenir.
 * Blokeli misafirler seçilemez.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppInput, AppButton } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { Guest } from '../../utils/types';
import { searchGuests } from '../../utils/mockData';

interface GuestSearchModalProps {
  visible: boolean;
  roomNumber: string;
  onClose: () => void;
  onSelect: (guest: Guest) => void;
}

const GuestSearchModal: React.FC<GuestSearchModalProps> = ({
  visible,
  roomNumber,
  onClose,
  onSelect,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Guest[]>([]);

  useEffect(() => {
    if (visible) {
      setResults(searchGuests(''));
      setQuery('');
    }
  }, [visible]);

  const handleSearch = (text: string) => {
    setQuery(text);
    setResults(searchGuests(text));
  };

  const handleSelectGuest = (guest: Guest) => {
    if (guest.isBlocked) {
      Alert.alert('Blokeli Misafir', 'Bu misafir bloke edilmiş, odaya eklenemez.');
      return;
    }

    Alert.alert(
      'Misafir Seç',
      `${guest.firstName} ${guest.lastName} misafirini Oda ${roomNumber}'a eklemek istiyor musunuz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Evet, Ekle',
          onPress: () => {
            onSelect(guest);
            setQuery('');
          },
        },
      ]
    );
  };

  const renderGuestItem = ({ item }: { item: Guest }) => {
    const isBlocked = item.isBlocked;
    return (
      <TouchableOpacity
        style={[styles.guestItem, isBlocked && styles.guestItemBlocked]}
        onPress={() => handleSelectGuest(item)}
        activeOpacity={isBlocked ? 1 : 0.7}
      >
        <View style={styles.guestIcon}>
          <Ionicons
            name={isBlocked ? 'ban' : 'person-circle-outline'}
            size={36}
            color={isBlocked ? colors.textDisabled : colors.primary}
          />
        </View>
        <View style={styles.guestInfo}>
          <Text style={[styles.guestName, isBlocked && styles.blockedText]}>
            {item.firstName} {item.lastName}
          </Text>
          <Text style={styles.guestDetail}>TC: {item.tcNo}</Text>
          <Text style={styles.guestDetail}>{item.phone}</Text>
        </View>
        {isBlocked && (
          <View style={styles.blockedBadge}>
            <Text style={styles.blockedBadgeText}>Blokeli</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.title}>Kayıtlı Misafir Ara</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Arama */}
          <View style={styles.searchContainer}>
            <AppInput
              value={query}
              onChangeText={handleSearch}
              placeholder="TC veya isim ile ara..."
              icon="search-outline"
              style={{ marginBottom: 0 }}
            />
          </View>

          {/* Sonuçlar */}
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderGuestItem}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={48} color={colors.textDisabled} />
                <Text style={styles.emptyText}>Sonuç bulunamadı</Text>
              </View>
            }
          />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.background,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '85%',
    minHeight: '60%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  searchContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  list: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  guestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  guestItemBlocked: {
    opacity: 0.5,
  },
  guestIcon: {
    marginRight: 12,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  guestDetail: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  blockedText: {
    color: colors.textDisabled,
    textDecorationLine: 'line-through',
  },
  blockedBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  blockedBadgeText: {
    fontSize: fontSize.xs,
    color: colors.error,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    marginTop: spacing.sm,
  },
});

export default GuestSearchModal;
