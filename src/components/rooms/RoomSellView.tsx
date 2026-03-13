/**
 * RoomSellView - Oda Satış / Detay Ekranı
 *
 * Müdür ve resepsiyon rolleri için tam özellikli oda yönetimi.
 * Müsait oda: Misafir ekle → Folio ekle → Check-in
 * Dolu oda: Misafir bilgileri + Folio + Check-out
 *
 * Web'deki RoomDetailContent bileşeninin mobil versiyonu.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import {
  ROOM_STATUS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
  FOLIO_CATEGORY_LABELS,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import { RoomGuest, FolioItem, Guest, FolioCategory } from '../../utils/types';
import { getFoliosForRoom, addFolioLocal, deleteFolioLocal, clearFoliosForRoom } from '../../utils/mockData';

import NewGuestModal from './NewGuestModal';
import GuestSearchModal from './GuestSearchModal';
import FolioAddModal from './FolioAddModal';

export interface RoomSellRoom {
  id: number;
  number: string;
  bedType: string;
  floor: number;
  capacity: number;
  status: string;
  guestName?: string;
  guests?: RoomGuest[];
  price?: number;
  lastCleaned?: string;
  cleanedBy?: string;
}

interface RoomSellViewProps {
  room: RoomSellRoom;
  onClose: () => void;
  onRoomUpdate: (roomId: number, updates: Partial<RoomSellRoom>) => void;
}

const BED_TYPE_LABELS: Record<string, string> = {
  single: 'Tek Kişilik',
  double: 'Çift Kişilik',
  twin: 'Twin',
  king: 'King',
};

const formatCurrency = (amount: number): string => {
  return `₺${amount.toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const RoomSellView: React.FC<RoomSellViewProps> = ({ room, onClose, onRoomUpdate }) => {
  const { user } = useAuth();

  /* State */
  const [guests, setGuests] = useState<RoomGuest[]>(room.guests || []);
  const [folios, setFolios] = useState<FolioItem[]>([]);
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  const [checkOutDate, setCheckOutDate] = useState('');
  const [nightlyRate, setNightlyRate] = useState(room.price?.toString() || '');

  /* Modal state */
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [showFolioAdd, setShowFolioAdd] = useState(false);

  const isAvailable = room.status === ROOM_STATUS.AVAILABLE;
  const isOccupied = room.status === ROOM_STATUS.OCCUPIED;

  /* Folioları yükle */
  useEffect(() => {
    setFolios(getFoliosForRoom(room.id));
  }, [room.id]);

  /* Folio hesaplamaları */
  const folioCharges = folios
    .filter((f) => f.category !== 'payment' && f.category !== 'discount')
    .reduce((sum, f) => sum + f.amount, 0);
  const folioDiscounts = folios
    .filter((f) => f.category === 'discount')
    .reduce((sum, f) => sum + f.amount, 0);
  const folioPayments = folios
    .filter((f) => f.category === 'payment')
    .reduce((sum, f) => sum + f.amount, 0);
  const folioTotal = folioCharges - folioDiscounts;
  const folioBalance = folioTotal - folioPayments;

  /* Misafir ekleme */
  const handleNewGuestSave = (guest: Guest) => {
    const newRoomGuest: RoomGuest = {
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      phone: guest.phone,
    };
    setGuests((prev) => [...prev, newRoomGuest]);
    setShowNewGuest(false);
  };

  const handleRegisteredGuestSelect = (guest: Guest) => {
    const exists = guests.find((g) => g.guestId === guest.id);
    if (exists) {
      Alert.alert('Uyarı', 'Bu misafir zaten odada.');
      return;
    }
    const newRoomGuest: RoomGuest = {
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      phone: guest.phone,
    };
    setGuests((prev) => [...prev, newRoomGuest]);
    setShowGuestSearch(false);
  };

  const handleRemoveGuest = (guestId: number) => {
    Alert.alert('Misafir Çıkar', 'Bu misafiri odadan çıkarmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      { text: 'Çıkar', style: 'destructive', onPress: () => setGuests((prev) => prev.filter((g) => g.guestId !== guestId)) },
    ]);
  };

  /* Folio ekleme */
  const handleFolioAdd = (data: { category: FolioCategory; description: string; amount: number; paymentMethod?: string }) => {
    const folio = addFolioLocal({
      roomId: room.id,
      category: data.category,
      description: data.description,
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      createdBy: user?.name,
    });
    setFolios((prev) => [...prev, folio]);
    setShowFolioAdd(false);
  };

  const handleFolioDelete = (folioId: number) => {
    Alert.alert('Folio Sil', 'Bu folio kaydını silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => {
          deleteFolioLocal(folioId);
          setFolios((prev) => prev.filter((f) => f.id !== folioId));
        },
      },
    ]);
  };

  /* Check-in */
  const handleCheckIn = () => {
    if (guests.length === 0) {
      Alert.alert('Uyarı', 'Check-in için en az 1 misafir eklemelisiniz.');
      return;
    }
    if (folioPayments === 0) {
      Alert.alert('Uyarı', 'Check-in için en az 1 ödeme kaydı eklemelisiniz.');
      return;
    }

    Alert.alert(
      'Check-in',
      `Oda ${room.number} için check-in yapılsın mı?\n\nMisafir: ${guests.map((g) => g.guestName).join(', ')}\nToplam: ${formatCurrency(folioTotal)}\nÖdenen: ${formatCurrency(folioPayments)}`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Check-in Yap',
          onPress: () => {
            onRoomUpdate(room.id, {
              status: ROOM_STATUS.OCCUPIED,
              guestName: guests.map((g) => g.guestName).join(', '),
              guests,
            });
            onClose();
          },
        },
      ]
    );
  };

  /* Check-out */
  const handleCheckOut = () => {
    const message = folioBalance > 0
      ? `Oda ${room.number} için check-out yapılsın mı?\n\n⚠️ Bakiye: ${formatCurrency(folioBalance)}\nBakiye kalmış durumda, yine de çıkış yapılsın mı?`
      : `Oda ${room.number} için check-out yapılsın mı?`;

    Alert.alert('Check-out', message, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Check-out Yap',
        style: folioBalance > 0 ? 'destructive' : 'default',
        onPress: () => {
          clearFoliosForRoom(room.id);
          onRoomUpdate(room.id, {
            status: ROOM_STATUS.DIRTY,
            guestName: '',
            guests: [],
          });
          onClose();
        },
      },
    ]);
  };

  /* İptal */
  const handleCancel = () => {
    Alert.alert('Rezervasyon İptal', 'Misafirler çıkarılıp oda müsait yapılsın mı?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet, İptal Et',
        style: 'destructive',
        onPress: () => {
          clearFoliosForRoom(room.id);
          onRoomUpdate(room.id, {
            status: ROOM_STATUS.AVAILABLE,
            guestName: '',
            guests: [],
          });
          onClose();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Oda {room.number}</Text>
        <StatusChip
          label={ROOM_STATUS_LABELS[room.status]}
          color={ROOM_STATUS_COLORS[room.status]}
        />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Oda Bilgi Kartı */}
        <AppCard style={styles.card}>
          <View style={styles.roomHeader}>
            <View>
              <Text style={styles.roomNumber}>{room.number}</Text>
              <Text style={styles.floorText}>Kat {room.floor}</Text>
            </View>
            <View style={styles.roomBadges}>
              <View style={styles.badge}>
                <Ionicons name="bed-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.badgeText}>{BED_TYPE_LABELS[room.bedType] || room.bedType}</Text>
              </View>
              <View style={styles.badge}>
                <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
                <Text style={styles.badgeText}>{room.capacity} kişi</Text>
              </View>
            </View>
          </View>
        </AppCard>

        {/* Misafir Yönetimi — sadece müsait veya dolu */}
        {(isAvailable || isOccupied) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                Odadaki Misafirler ({guests.length})
              </Text>
            </View>

            {/* Misafir listesi */}
            {guests.map((guest) => (
              <View key={guest.guestId} style={styles.guestRow}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{guest.guestName}</Text>
                  {guest.phone && (
                    <Text style={styles.guestPhone}>{guest.phone}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleRemoveGuest(guest.guestId)}>
                  <Ionicons name="close-circle" size={22} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            {guests.length === 0 && (
              <Text style={styles.emptyText}>Henüz misafir eklenmedi</Text>
            )}

            {/* Misafir ekleme butonları */}
            <View style={styles.guestActions}>
              <TouchableOpacity
                style={styles.guestActionBtn}
                onPress={() => setShowNewGuest(true)}
              >
                <Ionicons name="person-add-outline" size={18} color={colors.primary} />
                <Text style={styles.guestActionText}>Yeni Misafir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.guestActionBtn}
                onPress={() => setShowGuestSearch(true)}
              >
                <Ionicons name="search-outline" size={18} color={colors.primary} />
                <Text style={styles.guestActionText}>Kayıtlı Misafir</Text>
              </TouchableOpacity>
            </View>
          </AppCard>
        )}

        {/* Konaklama Bilgileri */}
        {(isAvailable || isOccupied) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Konaklama Bilgileri</Text>
            </View>

            <AppInput
              label="Giriş Tarihi"
              value={checkInDate}
              onChangeText={setCheckInDate}
              placeholder="YYYY-MM-DD"
              icon="log-in-outline"
              editable={isAvailable}
            />

            <AppInput
              label="Çıkış Tarihi"
              value={checkOutDate}
              onChangeText={setCheckOutDate}
              placeholder="YYYY-MM-DD"
              icon="log-out-outline"
            />

            <AppInput
              label="Gecelik Ücret (₺)"
              value={nightlyRate}
              onChangeText={setNightlyRate}
              placeholder="0.00"
              keyboardType="decimal-pad"
              icon="cash-outline"
            />
          </AppCard>
        )}

        {/* Folio Özeti */}
        {(isAvailable || isOccupied) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Folio</Text>
            </View>

            {folios.length > 0 ? (
              <>
                {folios.map((folio) => (
                  <View key={folio.id} style={styles.folioRow}>
                    <View style={styles.folioInfo}>
                      <View style={[
                        styles.folioCategoryBadge,
                        { backgroundColor: folio.category === 'payment' ? '#22C55E20' : folio.category === 'discount' ? '#F5920B20' : colors.primary + '15' },
                      ]}>
                        <Text style={[
                          styles.folioCategoryText,
                          { color: folio.category === 'payment' ? '#22C55E' : folio.category === 'discount' ? '#F59E0B' : colors.primary },
                        ]}>
                          {FOLIO_CATEGORY_LABELS[folio.category]}
                        </Text>
                      </View>
                      <Text style={styles.folioDesc} numberOfLines={1}>{folio.description}</Text>
                    </View>
                    <Text style={[
                      styles.folioAmount,
                      (folio.category === 'payment' || folio.category === 'discount') && styles.folioAmountNeg,
                    ]}>
                      {folio.category === 'payment' || folio.category === 'discount' ? '-' : ''}
                      {formatCurrency(folio.amount)}
                    </Text>
                    <TouchableOpacity onPress={() => handleFolioDelete(folio.id)} style={styles.folioDeleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

                {/* Folio Toplam */}
                <View style={styles.folioSummary}>
                  <View style={styles.folioSummaryRow}>
                    <Text style={styles.folioSummaryLabel}>Toplam</Text>
                    <Text style={styles.folioSummaryValue}>{formatCurrency(folioTotal)}</Text>
                  </View>
                  <View style={styles.folioSummaryRow}>
                    <Text style={styles.folioSummaryLabel}>Ödenen</Text>
                    <Text style={[styles.folioSummaryValue, { color: '#22C55E' }]}>{formatCurrency(folioPayments)}</Text>
                  </View>
                  <View style={[styles.folioSummaryRow, styles.folioBalanceRow]}>
                    <Text style={styles.folioBalanceLabel}>Bakiye</Text>
                    <Text style={[
                      styles.folioBalanceValue,
                      { color: folioBalance > 0 ? colors.error : '#22C55E' },
                    ]}>
                      {formatCurrency(folioBalance)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>Henüz folio kaydı yok</Text>
            )}

            <AppButton
              title="Folio Ekle"
              onPress={() => setShowFolioAdd(true)}
              variant="outline"
              icon="add-circle-outline"
              style={{ marginTop: spacing.sm }}
            />
          </AppCard>
        )}

        {/* Aksiyon Butonları */}
        {isAvailable && (
          <AppButton
            title="Check-in Yap"
            onPress={handleCheckIn}
            icon="log-in-outline"
            disabled={guests.length === 0}
            style={{ marginBottom: spacing.sm }}
          />
        )}

        {isOccupied && (
          <>
            <AppButton
              title="Check-out Yap"
              onPress={handleCheckOut}
              icon="log-out-outline"
              variant="secondary"
              style={{ marginBottom: spacing.sm }}
            />
            <AppButton
              title="Rezervasyon İptal"
              onPress={handleCancel}
              icon="close-circle-outline"
              variant="danger"
              style={{ marginBottom: spacing.sm }}
            />
          </>
        )}
      </ScrollView>

      {/* Modals */}
      <NewGuestModal
        visible={showNewGuest}
        onClose={() => setShowNewGuest(false)}
        onSave={handleNewGuestSave}
      />
      <GuestSearchModal
        visible={showGuestSearch}
        roomNumber={room.number}
        onClose={() => setShowGuestSearch(false)}
        onSelect={handleRegisteredGuestSelect}
      />
      <FolioAddModal
        visible={showFolioAdd}
        onClose={() => setShowFolioAdd(false)}
        onSave={handleFolioAdd}
      />
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
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: 56,
    paddingBottom: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
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
  card: {
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
  roomBadges: {
    alignItems: 'flex-end',
    gap: 6,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.divider,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  /* Misafir listesi */
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  guestInfo: {
    flex: 1,
  },
  guestName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  guestPhone: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  guestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: spacing.md,
  },
  guestActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  guestActionText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.primary,
  },
  /* Folio */
  folioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  folioInfo: {
    flex: 1,
  },
  folioCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  folioCategoryText: {
    fontSize: 10,
    fontWeight: '600',
  },
  folioDesc: {
    fontSize: fontSize.sm,
    color: colors.textPrimary,
  },
  folioAmount: {
    fontSize: fontSize.sm,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  folioAmountNeg: {
    color: '#22C55E',
  },
  folioDeleteBtn: {
    padding: 4,
  },
  folioSummary: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  folioSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  folioSummaryLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  folioSummaryValue: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  folioBalanceRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  folioBalanceLabel: {
    fontSize: fontSize.md,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  folioBalanceValue: {
    fontSize: fontSize.md,
    fontWeight: '800',
  },
});

export default RoomSellView;
