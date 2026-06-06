/**
 * RoomSellView - Oda Satış / Detay Ekranı
 *
 * Müdür ve resepsiyon rolleri için tam özellikli oda yönetimi.
 * Müsait oda: Misafir ekle → Check-in → Folio ekle
 * Dolu oda: Misafir bilgileri + Folio + Check-out
 *
 * API entegrasyonu:
 *   - Check-in: roomsApi.checkIn → ilk misafir + reservation oluşur
 *   - Ek misafir: roomsApi.addGuest → mevcut reservation'a eklenir
 *   - Check-out: roomsApi.checkOut → misafir(ler) çıkarılır
 *   - Folio: foliosApi.create / delete → reservation'a bağlı
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
import useHotelSettings from '../../hooks/useHotelSettings';
import { roomsApi, foliosApi, reservationsApi, companiesApi } from '../../services/api';
import type { RoomGuest, ApiFolioItem, Guest, FolioCategory, Company } from '../../utils/types';
import { calcFolioTotals, isFolioDeductionRow } from '../../utils/folio';

import NewGuestModal from './NewGuestModal';
import GuestSearchModal from './GuestSearchModal';
import FolioAddModal from './FolioAddModal';
import ReservationConfirmModal from './ReservationConfirmModal';

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
  reservationId?: number;
  reservationNotes?: string;
  reservationCheckIn?: string;
  reservationCheckOut?: string;
  reservationStatus?: string | null;
  reservationOwnerName?: string | null;
}

interface RoomSellViewProps {
  room: RoomSellRoom;
  onClose: () => void;
  onRoomUpdate: () => void;
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
  const { settings: hotelSettings } = useHotelSettings();

  /* State */
  const [guests, setGuests] = useState<RoomGuest[]>(room.guests || []);
  const [folios, setFolios] = useState<ApiFolioItem[]>([]);
  const [notes, setNotes] = useState(room.reservationNotes || '');
  const [loading, setLoading] = useState(false);
  /* Walk-in akışı: boş odada Folio Ekle basılınca anlık reservation oluşur, ID burada tutulur */
  const [pendingReservationId, setPendingReservationId] = useState<number | null>(null);

  /* Firma & Fiyat */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
  const [nightlyRate, setNightlyRate] = useState<string>(room.price ? String(room.price) : '');

  useEffect(() => {
    companiesApi.getAll().then(setCompanies).catch(() => {});
  }, []);

  const handleCompanyChange = (compId: number | null) => {
    setSelectedCompanyId(compId);
    if (compId) {
      const comp = companies.find(c => c.id === compId);
      if (comp?.agreedRate) {
        setNightlyRate(String(comp.agreedRate));
      }
    }
  };

  /* Modal state */
  const [showNewGuest, setShowNewGuest] = useState(false);
  const [showGuestSearch, setShowGuestSearch] = useState(false);
  const [showFolioAdd, setShowFolioAdd] = useState(false);
  const [showReservationConfirm, setShowReservationConfirm] = useState(false);

  const isAvailable = room.status === ROOM_STATUS.AVAILABLE;
  const isOccupied = room.status === ROOM_STATUS.OCCUPIED;
  const isReserved = !!(room.reservationStatus === 'reserved' && room.reservationId);
  /* Misafir ekleme/çıkarma direkt API'ye gitmeli mi? (occupied veya reserved) */
  const guestApiMode = isOccupied || isReserved;

  /* Aktif reservation ID — gerçek (parent'tan) veya walk-in akışında oluşturulan */
  const activeReservationId = room.reservationId ?? pendingReservationId;

  /* Folio yükle — reservation varsa (race condition korumalı) */
  useEffect(() => {
    if (!activeReservationId) {
      setFolios([]);
      return;
    }
    let cancelled = false;
    foliosApi.getForReservation(activeReservationId)
      .then((data) => { if (!cancelled) setFolios(data); })
      .catch(() => { if (!cancelled) setFolios([]); });
    return () => { cancelled = true; };
  }, [activeReservationId]);

  /* Folio hesaplamaları — utils/folio.ts (tek doğruluk kaynağı) */
  const parseAmount = (a: number | string) => typeof a === 'string' ? parseFloat(a) : a;
  const folioTotals = calcFolioTotals(folios);
  const folioCharges = folioTotals.charges;
  const folioDiscounts = folioTotals.discounts;
  const folioPayments = folioTotals.payments;
  const folioTotal = folioTotals.total;
  const folioBalance = folioTotals.balance;

  /* ─── Misafir ekleme (rezerve/dolu ise API, müsait ise local state) ─── */
  const handleNewGuestSave = async (guest: Guest) => {
    const newRoomGuest: RoomGuest = {
      guestId: guest.id,
      guestName: `${guest.firstName} ${guest.lastName}`,
      phone: guest.phone,
    };
    if (guestApiMode) {
      try {
        await roomsApi.addGuest(room.id, guest.id);
        setGuests((prev) => [...prev, newRoomGuest]);
        setShowNewGuest(false);
        onRoomUpdate();
      } catch (err: any) {
        Alert.alert('Hata', err.message);
      }
    } else {
      setGuests((prev) => [...prev, newRoomGuest]);
      setShowNewGuest(false);
    }
  };

  const handleRegisteredGuestSelect = async (guest: Guest) => {
    const exists = guests.find((g) => g.guestId === guest.id);
    if (exists) {
      Alert.alert('Uyarı', 'Bu misafir zaten odada.');
      return;
    }

    if (guestApiMode) {
      try {
        await roomsApi.addGuest(room.id, guest.id);
        setGuests((prev) => [...prev, {
          guestId: guest.id,
          guestName: `${guest.firstName} ${guest.lastName}`,
          phone: guest.phone,
        }]);
        onRoomUpdate();
      } catch (err: any) {
        Alert.alert('Hata', err.message);
      }
    } else {
      setGuests((prev) => [...prev, {
        guestId: guest.id,
        guestName: `${guest.firstName} ${guest.lastName}`,
        phone: guest.phone,
      }]);
    }
    setShowGuestSearch(false);
  };

  const handleRemoveGuest = (guestId: number) => {
    Alert.alert('Misafir Çıkar', 'Bu misafiri odadan çıkarmak istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Çıkar',
        style: 'destructive',
        onPress: async () => {
          if (isOccupied) {
            try {
              await roomsApi.checkOut(room.id, { guestId });
              onRoomUpdate();
            } catch (err: any) {
              Alert.alert('Hata', err.message);
            }
          } else if (isReserved) {
            /* Rezerve durumda: stay'i kaldırmak için backend remove_guest yok,
               sadece local'den sil — kullanıcı rezervasyonu iptal etmek isterse "Rezervasyon İptal" var */
            setGuests((prev) => prev.filter((g) => g.guestId !== guestId));
          } else {
            setGuests((prev) => prev.filter((g) => g.guestId !== guestId));
          }
        },
      },
    ]);
  };

  /* ─── Folio Ekle butonuna basıldı: reservation yoksa otomatik walk-in dialog'u çıkar ─── */
  const handleFolioAddPress = () => {
    if (activeReservationId) {
      setShowFolioAdd(true);
      return;
    }
    if (guests.length === 0) {
      Alert.alert(
        'Misafir Gerekli',
        'Folio eklemek için önce odaya misafir eklemelisiniz.',
      );
      return;
    }
    Alert.alert(
      'Hızlı Rezervasyon',
      'Folio eklemek için bu odaya hızlı bir rezervasyon oluşturulacak. Check-in sonra "Check-in Yap" ile tamamlanabilir.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Oluştur',
          onPress: async () => {
            setLoading(true);
            try {
              const today = new Date().toISOString().split('T')[0];
              const created = await reservationsApi.create({
                roomId: room.id,
                guestId: guests[0].guestId,
                checkIn: today,
                notes,
                companyId: selectedCompanyId ?? undefined,
                staffName: user?.name,
              });
              for (let i = 1; i < guests.length; i++) {
                try { await roomsApi.addGuest(room.id, guests[i].guestId); } catch { /* misafir ekleme hatasi folio akisini bozmasin */ }
              }
              setPendingReservationId((created as { id: number }).id);
              onRoomUpdate();
              setShowFolioAdd(true);
            } catch (err: any) {
              Alert.alert('Hata', err.message || 'Rezervasyon oluşturulamadı');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /* ─── Folio kalemi oluştur (modal kaydet sonrası) ─── */
  const handleFolioAdd = async (data: { category: FolioCategory; description: string; amount: number; paymentMethod?: string }) => {
    const rid = activeReservationId;
    if (!rid) {
      Alert.alert('Uyarı', 'Aktif rezervasyon yok.');
      return;
    }
    try {
      const folio = await foliosApi.create({
        reservationId: rid,
        category: data.category,
        description: data.description,
        amount: data.amount,
        date: new Date().toISOString().split('T')[0],
        createdBy: user?.name,
      });
      setFolios((prev) => [...prev, folio]);
      setShowFolioAdd(false);
    } catch (err: any) {
      Alert.alert('Hata', err.message);
    }
  };

  const handleFolioDelete = (folioId: number) => {
    Alert.alert('Folio Sil', 'Bu folio kaydını silmek istiyor musunuz?', [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: async () => {
          try {
            await foliosApi.delete(folioId);
            setFolios((prev) => prev.filter((f) => f.id !== folioId));
          } catch (err: any) {
            Alert.alert('Hata', err.message);
          }
        },
      },
    ]);
  };

  /* ─── Rezerve Et (check-in olmadan rezervasyon yarat) ─── */
  const handleReserve = () => {
    if (guests.length === 0) {
      Alert.alert('Uyarı', 'Rezervasyon için en az 1 misafir eklemelisiniz.');
      return;
    }
    setShowReservationConfirm(true);
  };

  const submitReservation = async (checkIn: string, checkOut: string | null) => {
    setLoading(true);
    try {
      await reservationsApi.create({
        roomId: room.id,
        guestId: guests[0].guestId,
        checkIn,
        checkOut: checkOut || undefined,
        notes,
        companyId: selectedCompanyId ?? undefined,
        staffName: user?.name,
      });
      /* Ek misafirler — backend rezerve durumda check_in=None ile ekler */
      for (let i = 1; i < guests.length; i++) {
        await roomsApi.addGuest(room.id, guests[i].guestId);
      }
      setShowReservationConfirm(false);
      onRoomUpdate();
    } catch (err: any) {
      Alert.alert('Hata', err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  /* ─── Rezervasyon İptal (reserved durumda) ─── */
  const handleCancelReservation = () => {
    if (!room.reservationId) return;
    Alert.alert('Rezervasyon İptal', `Oda ${room.number} rezervasyonu iptal edilsin mi?`, [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet, İptal Et',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await reservationsApi.cancel(room.reservationId!);
            onRoomUpdate();
          } catch (err: any) {
            Alert.alert('Hata', err.message);
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  /* ─── Check-in ─── */
  const handleCheckIn = () => {
    /* Bugün girişli rezervasyon kontrolü */
    const today = new Date().toISOString().split('T')[0];
    const checkInDate = room.reservationCheckIn ? room.reservationCheckIn.split('T')[0] : null;
    const isReserved = room.reservationStatus === 'reserved' && room.reservationId && checkInDate === today;

    if (!isReserved && guests.length === 0) {
      Alert.alert('Uyarı', 'Check-in için en az 1 misafir eklemelisiniz.');
      return;
    }

    /* ─── Pre-flight: Check-in ödeme politikası ───
     * Web ile aynı kural: switch açıksa bakiyesi olan misafir check-in olamaz.
     * Şirket muafiyeti varsa (switch + firma seçili) atla.
     * Backend de aynı kontrolü yapıyor; bu sadece anlık UX uyarısı. */
    if (hotelSettings?.requirePaymentAtCheckin) {
      const isCompanyExempt = !!(hotelSettings.companyExemptFromCheckinPayment && selectedCompanyId);
      if (!isCompanyExempt && folioBalance > 0) {
        Alert.alert(
          'Ödeme Gerekli',
          `Otel politikası gereği ödeme alınmadan check-in yapılamaz.\n\nBakiye: ${formatCurrency(folioBalance)}\n\nÖnce folio üzerinden ödeme alın.`,
        );
        return;
      }
    }

    const message = isReserved
      ? `Oda ${room.number} — Rezervasyon sahibi: ${room.reservationOwnerName}\n\nCheck-in yapılsın mı?`
      : `Oda ${room.number} için check-in yapılsın mı?\n\nMisafir: ${guests.map((g) => g.guestName).join(', ')}`;

    Alert.alert(
      'Check-in',
      message,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Check-in Yap',
          onPress: async () => {
            setLoading(true);
            try {
              if (isReserved) {
                /* Mevcut rezervasyonu check-in'e çevir — dropdown'dan seçili firma gönderilir */
                await reservationsApi.checkIn(room.reservationId!, {
                  companyId: selectedCompanyId,
                });
                /* Varsa ek misafirler ekle */
                for (let i = 0; i < guests.length; i++) {
                  await roomsApi.addGuest(room.id, guests[i].guestId);
                }
              } else {
                /* Direkt check-in → Reservation + Stay oluşur */
                await roomsApi.checkIn(room.id, {
                  guestId: guests[0].guestId,
                  notes,
                  companyId: selectedCompanyId ?? undefined,
                });
                for (let i = 1; i < guests.length; i++) {
                  await roomsApi.addGuest(room.id, guests[i].guestId);
                }
              }

              onRoomUpdate();
            } catch (err: any) {
              Alert.alert('Hata', err.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  /* ─── Check-out ───
   * Backend artık eksik room_charge'i kendisi yazıyor (gün ortası çıkışta otomatik).
   * Mobile sadece şirket cariye yansıtma + force kontrolünü yönetir.
   */
  const canForce = user?.role === 'patron' || user?.role === 'manager';

  const performCheckOut = async (params: {
    force?: boolean;
    forceReason?: string;
    transferToCompany?: boolean;
  }) => {
    setLoading(true);
    try {
      await roomsApi.checkOut(room.id, {
        force: params.force,
        forceReason: params.forceReason,
        transferToCompany: params.transferToCompany,
        earlyDepartureMode: 'refund',
        staffName: user?.name,
      });
      onRoomUpdate();
    } catch (err: unknown) {
      const error = err as { message?: string; balance?: number; requireForce?: boolean };
      if (error.requireForce && canForce) {
        Alert.prompt(
          'Bakiye Var',
          `${error.message}\n\nZorla çıkış için sebep girin:`,
          [
            { text: 'İptal', style: 'cancel' },
            {
              text: 'Zorla Çıkış',
              style: 'destructive',
              onPress: (reason?: string) => {
                if (!reason || !reason.trim()) {
                  Alert.alert('Hata', 'Sebep zorunlu');
                  return;
                }
                performCheckOut({ ...params, force: true, forceReason: reason.trim() });
              },
            },
          ],
          'plain-text',
        );
      } else if (error.requireForce) {
        Alert.alert(
          'Bakiye Var',
          `${error.message}\n\nZorla çıkış için patron veya müdür yetkisi gerekir.`
        );
      } else {
        Alert.alert('Hata', (err as Error).message || 'Checkout hatası');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = () => {
    // Şirket bağlamı varsa cariye yansıtma seçeneği sun
    if (selectedCompanyId && folioBalance > 0) {
      const company = companies.find((c) => c.id === selectedCompanyId);
      Alert.alert(
        'Check-out',
        `${formatCurrency(folioBalance)} bakiye var.\n\n${company?.name || 'Şirket'} cariye yansıtılsın mı?`,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Hayır, Ödeme Al', onPress: () => performCheckOut({}) },
          {
            text: 'Evet, Cariye Yansıt',
            onPress: () => performCheckOut({ transferToCompany: true }),
          },
        ]
      );
      return;
    }
    const message = folioBalance > 0
      ? `Oda ${room.number} için check-out?\n\n⚠️ Bakiye: ${formatCurrency(folioBalance)}`
      : `Oda ${room.number} için check-out yapılsın mı?`;
    Alert.alert('Check-out', message, [
      { text: 'İptal', style: 'cancel' },
      {
        text: 'Check-out Yap',
        style: folioBalance > 0 ? 'destructive' : 'default',
        onPress: () => performCheckOut({}),
      },
    ]);
  };

  /* ─── İptal ─── */
  const handleCancel = () => {
    Alert.alert('Rezervasyon İptal', 'Misafirler çıkarılıp oda müsait yapılsın mı?', [
      { text: 'Hayır', style: 'cancel' },
      {
        text: 'Evet, İptal Et',
        style: 'destructive',
        onPress: async () => {
          setLoading(true);
          try {
            await roomsApi.checkOut(room.id);
            await roomsApi.updateStatus(room.id, ROOM_STATUS.AVAILABLE);
            onRoomUpdate();
          } catch (err: any) {
            Alert.alert('Hata', err.message);
          } finally {
            setLoading(false);
          }
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

        {/* Firma & Gecelik Ücret */}
        <AppCard style={styles.card}>
          <View style={styles.sectionHeader}>
            <Ionicons name="business" size={20} color={colors.primary} />
            <Text style={styles.sectionTitle}>Konaklama Bilgileri</Text>
          </View>

          {/* Firma seçimi — açılır menü */}
          <Text style={{ fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 }}>Firma</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: '#f8fafc', borderWidth: 1, borderColor: colors.border,
              borderRadius: borderRadius.md, padding: 12, marginBottom: 12,
            }}
            onPress={() => {
              const options = [
                { text: 'Bireysel (Firma Yok)', onPress: () => handleCompanyChange(null) },
                ...companies.map(c => ({
                  text: `${c.name}${c.agreedRate ? ` — ${Number(c.agreedRate).toLocaleString('tr-TR')} ₺/gece` : ''}`,
                  onPress: () => handleCompanyChange(c.id),
                })),
              ];
              Alert.alert('Firma Seçin', undefined, [
                ...options.map(o => ({ text: o.text, onPress: o.onPress })),
                { text: 'İptal', style: 'cancel' as const },
              ]);
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
              <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, color: selectedCompanyId ? colors.textPrimary : colors.textDisabled, fontWeight: selectedCompanyId ? '600' : '400' }}>
                {selectedCompanyId
                  ? companies.find(c => c.id === selectedCompanyId)?.name || 'Firma'
                  : 'Firma Seçin (Opsiyonel)'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Seçili firma bilgisi */}
          {selectedCompanyId && (() => {
            const comp = companies.find(c => c.id === selectedCompanyId);
            return comp?.agreedRate ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: -4 }}>
                <Ionicons name="checkmark-circle" size={16} color="#22c55e" />
                <Text style={{ fontSize: 12, color: '#22c55e', fontWeight: '600' }}>
                  Anlaşmalı fiyat: {Number(comp.agreedRate).toLocaleString('tr-TR')} ₺/gece
                </Text>
              </View>
            ) : null;
          })()}

          {/* Gecelik ücret */}
          <AppInput
            label="Gecelik Ücret (₺)"
            value={nightlyRate}
            onChangeText={setNightlyRate}
            keyboardType="numeric"
            icon="cash-outline"
          />
          {nightlyRate && Number(nightlyRate) > 0 && Number(nightlyRate) !== (room.price || 0) && (
            <AppButton
              title="Oda Fiyatını Kaydet"
              variant="outline"
              icon="save-outline"
              loading={loading}
              onPress={async () => {
                const newPrice = Number(nightlyRate);
                if (!newPrice || newPrice <= 0) {
                  Alert.alert('Uyarı', 'Geçerli bir fiyat girin.');
                  return;
                }
                setLoading(true);
                try {
                  await roomsApi.update(room.id, { price: newPrice });
                  Alert.alert('Başarılı', 'Oda fiyatı güncellendi.');
                  onRoomUpdate();
                } catch (err: any) {
                  Alert.alert('Hata', err.message);
                } finally {
                  setLoading(false);
                }
              }}
              style={{ marginTop: spacing.sm }}
            />
          )}
        </AppCard>

        {/* Misafir Yönetimi */}
        {(isAvailable || isOccupied) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                Odadaki Misafirler ({guests.length})
              </Text>
            </View>

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

        {/* Rezervasyon Notu */}
        {(isAvailable || isOccupied) && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Rezervasyon Notu</Text>
            </View>
            <AppInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Not ekleyin..."
              multiline
            />
            {isOccupied && notes !== (room.reservationNotes || '') && (
              <AppButton
                title="Notu Kaydet"
                variant="outline"
                onPress={async () => {
                  try {
                    await roomsApi.updateNotes(room.id, notes);
                    Alert.alert('Başarılı', 'Not kaydedildi.');
                  } catch (err: any) {
                    Alert.alert('Hata', err.message);
                  }
                }}
                style={{ marginTop: spacing.sm }}
              />
            )}
          </AppCard>
        )}

        {/* Folio Özeti — her zaman görünür; rezervasyonsuz odada Folio Ekle akışı walk-in oluşturur */}
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
                      isFolioDeductionRow(folio.category) && styles.folioAmountNeg,
                    ]}>
                      {isFolioDeductionRow(folio.category) ? '-' : ''}
                      {formatCurrency(parseAmount(folio.amount))}
                    </Text>
                    <TouchableOpacity onPress={() => handleFolioDelete(folio.id)} style={styles.folioDeleteBtn}>
                      <Ionicons name="trash-outline" size={16} color={colors.error} />
                    </TouchableOpacity>
                  </View>
                ))}

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
              onPress={handleFolioAddPress}
              variant="outline"
              icon="add-circle-outline"
              style={{ marginTop: spacing.sm }}
            />
        </AppCard>

        {/* Aksiyon Butonları */}
        {isAvailable && (
          <>
            <AppButton
              title="Check-in Yap"
              onPress={handleCheckIn}
              icon="log-in-outline"
              disabled={guests.length === 0}
              loading={loading}
              style={{ marginBottom: spacing.sm }}
            />
            {!isReserved && (
              <AppButton
                title="Rezerve Et"
                onPress={handleReserve}
                icon="bookmark-outline"
                variant="secondary"
                disabled={guests.length === 0}
                loading={loading}
                style={{ marginBottom: spacing.sm }}
              />
            )}
            {isReserved && (
              <AppButton
                title="Rezervasyon İptal"
                onPress={handleCancelReservation}
                icon="close-circle-outline"
                variant="danger"
                loading={loading}
                style={{ marginBottom: spacing.sm }}
              />
            )}
          </>
        )}

        {isOccupied && (
          <>
            <AppButton
              title="Check-out Yap"
              onPress={handleCheckOut}
              icon="log-out-outline"
              variant="secondary"
              loading={loading}
              style={{ marginBottom: spacing.sm }}
            />
            <AppButton
              title="Rezervasyon İptal"
              onPress={handleCancel}
              icon="close-circle-outline"
              variant="danger"
              loading={loading}
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
      <ReservationConfirmModal
        visible={showReservationConfirm}
        roomNumber={room.number}
        guests={guests}
        companyName={selectedCompanyId ? companies.find(c => c.id === selectedCompanyId)?.name : null}
        notes={notes}
        onClose={() => setShowReservationConfirm(false)}
        onConfirm={submitReservation}
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
  backBtn: { padding: 4 },
  headerTitle: {
    flex: 1,
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  scrollView: { flex: 1 },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 120,
  },
  card: { marginBottom: spacing.md },
  roomHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  roomNumber: { fontSize: 36, fontWeight: '800', color: colors.textPrimary },
  floorText: { fontSize: fontSize.sm, color: colors.textSecondary, marginTop: 2 },
  roomBadges: { alignItems: 'flex-end', gap: 6 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.divider,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  badgeText: { fontSize: fontSize.xs, color: colors.textSecondary, fontWeight: '500' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: spacing.md,
  },
  sectionTitle: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  guestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 10,
  },
  guestInfo: { flex: 1 },
  guestName: { fontSize: fontSize.md, fontWeight: '600', color: colors.textPrimary },
  guestPhone: { fontSize: fontSize.xs, color: colors.textSecondary, marginTop: 2 },
  emptyText: {
    fontSize: fontSize.sm,
    color: colors.textDisabled,
    textAlign: 'center',
    paddingVertical: spacing.md,
    fontStyle: 'italic',
  },
  guestActions: { flexDirection: 'row', gap: 8, marginTop: spacing.md },
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
  guestActionText: { fontSize: fontSize.sm, fontWeight: '600', color: colors.primary },
  folioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: 8,
  },
  folioInfo: { flex: 1 },
  folioCategoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginBottom: 2,
  },
  folioCategoryText: { fontSize: 10, fontWeight: '600' },
  folioDesc: { fontSize: fontSize.sm, color: colors.textPrimary },
  folioAmount: { fontSize: fontSize.sm, fontWeight: '700', color: colors.textPrimary },
  folioAmountNeg: { color: '#22C55E' },
  folioDeleteBtn: { padding: 4 },
  folioSummary: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 2,
    borderTopColor: colors.divider,
  },
  folioSummaryRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  folioSummaryLabel: { fontSize: fontSize.sm, color: colors.textSecondary },
  folioSummaryValue: { fontSize: fontSize.sm, fontWeight: '600', color: colors.textPrimary },
  folioBalanceRow: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  folioBalanceLabel: { fontSize: fontSize.md, fontWeight: '700', color: colors.textPrimary },
  folioBalanceValue: { fontSize: fontSize.md, fontWeight: '800' },
});

export default RoomSellView;
