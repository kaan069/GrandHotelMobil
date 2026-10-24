/**
 * RoomSellView - Oda Satış / Detay Ekranı
 *
 * Müdür ve resepsiyon rolleri için tam özellikli oda yönetimi.
 * Müsait oda: Misafir ekle → Check-in → Folio ekle
 * Dolu oda: Misafir bilgileri + Folio + Check-out
 *
 * API entegrasyonu:
 *   - Check-in: roomsApi.checkIn → ilk misafir + reservation oluşur
 *     (rezerve odada reservationsApi.checkIn — erken giriş dahil)
 *   - Ek misafir: roomsApi.addGuest → mevcut reservation'a eklenir
 *   - Misafir menüsü: konaklama geçmişi, tek misafir check-out, odadan çıkar
 *     (roomsApi.removeGuest — son misafir çıkarılamaz), kara liste (guestsApi.toggleBlock)
 *   - Check-out: roomsApi.checkOut → misafir(ler) çıkarılır
 *   - Check-in iptal: reservationsApi.revertCheckin → rezervasyon 'Rezerve'ye döner
 *   - Check-out iptal: roomsApi.revertCheckout (son 24 saat)
 *   - Oda taşı: roomsApi.moveGuests (RoomMoveModal)
 *   - Folio: foliosApi.create / delete → reservation'a bağlı
 *   - KBS (modül açıksa) ve İşlem Geçmişi (patron/müdür) kartları
 * Web karşılığı: components/rooms/RoomDetailContent.tsx
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { AppCard, AppButton, AppInput, StatusChip, OptionPickerModal, PromptModal } from '../common';
import { colors, spacing, fontSize, borderRadius } from '../../theme';
import { deferAlert } from '../../utils/alert';
import {
  ROOM_STATUS,
  ROOM_STATUS_LABELS,
  ROOM_STATUS_COLORS,
  FOLIO_CATEGORY_LABELS,
  FOLIO_PAYMENT_METHOD_LABELS,
} from '../../utils/constants';
import useAuth from '../../hooks/useAuth';
import useHotelSettings from '../../hooks/useHotelSettings';
import { roomsApi, foliosApi, reservationsApi, companiesApi, guestsApi, agenciesApi, Agency } from '../../services/api';
import type { RoomGuest, ApiFolioItem, Guest, FolioCategory, Company } from '../../utils/types';
import { isAdmin, isModuleEnabled } from '../../utils/permissions';
import { calcFolioTotals, isFolioDeductionRow } from '../../utils/folio';
import FolioBalanceSummary from './FolioBalanceSummary';

import NewGuestModal from './NewGuestModal';
import GuestSearchModal from './GuestSearchModal';
import FolioAddModal from './FolioAddModal';
import ReservationConfirmModal from './ReservationConfirmModal';
import RoomMoveModal from './RoomMoveModal';
import RoomKbsCard from './RoomKbsCard';
import RoomAuditLogCard from './RoomAuditLogCard';
import GuestStayHistoryModal from '../guests/GuestStayHistoryModal';
import NewReservationModal from '../reservations/NewReservationModal';
import InvoiceFormModal from '../tasks/InvoiceFormModal';
import InvoicePdfModal from '../tasks/InvoicePdfModal';

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
  reservationCompanyId?: number | null;
  reservationAgencyId?: number | null;
  reservationAgencyCode?: string;
  placeholderGuestName?: string;
  placeholderGuestPhone?: string;
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

  /* Firma / Acente & Fiyat — rezervasyon varsa kayıtlı değerlerle başlar (web ile aynı) */
  const [companies, setCompanies] = useState<Company[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(room.reservationCompanyId ?? null);
  const [selectedAgencyId, setSelectedAgencyId] = useState<number | null>(room.reservationAgencyId ?? null);
  const [agencyCode, setAgencyCode] = useState(room.reservationAgencyCode || '');
  const [picker, setPicker] = useState<'company' | 'agency' | null>(null);
  const [nightlyRate, setNightlyRate] = useState<string>(room.price ? String(room.price) : '');

  useEffect(() => {
    companiesApi.getAll().then(setCompanies).catch(() => {});
    agenciesApi.getAll().then(setAgencies).catch(() => {});
  }, []);

  useEffect(() => {
    setSelectedCompanyId(room.reservationCompanyId ?? null);
    setSelectedAgencyId(room.reservationAgencyId ?? null);
    setAgencyCode(room.reservationAgencyCode || '');
  }, [room.id, room.reservationId, room.reservationCompanyId, room.reservationAgencyId, room.reservationAgencyCode]);

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
  const [showRoomMove, setShowRoomMove] = useState(false);
  const [showQuickReservation, setShowQuickReservation] = useState(false);
  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoicePdfResult, setInvoicePdfResult] = useState<
    { pdfUrl: string; invoiceNo: string; timedOut: boolean } | null
  >(null);
  /* Bakiyeli çıkışta zorla çıkış sebebi (patron / müdür) */
  const [forcePrompt, setForcePrompt] = useState<{
    message: string;
    params: { transferToCompany?: boolean };
  } | null>(null);
  const [historyGuest, setHistoryGuest] = useState<RoomGuest | null>(null);

  const isAvailable = room.status === ROOM_STATUS.AVAILABLE;
  const isOccupied = room.status === ROOM_STATUS.OCCUPIED;
  const isReserved = !!(room.reservationStatus === 'reserved' && room.reservationId);
  /* Misafir ekleme/çıkarma direkt API'ye gitmeli mi? (occupied veya reserved) */
  const guestApiMode = isOccupied || isReserved;

  /* Aktif reservation ID — gerçek (parent'tan) veya walk-in akışında oluşturulan */
  const activeReservationId = room.reservationId ?? pendingReservationId;

  /* room.guests parent'tan güncellendiğinde local state'i sync et (rezerve/dolu durumlarda).
   * Boş odada (reservation yok) kullanıcı misafir ekliyor → local state korunur.
   * Rezervasyon kapandıysa (check-out / iptal / taşıma) liste boşalır. */
  const roomGuestSignature = (room.guests || []).map(g => `${g.guestId}`).join(',');
  const prevReservationIdRef = useRef(room.reservationId);
  useEffect(() => {
    if (room.reservationId) {
      setGuests(room.guests || []);
    } else if (prevReservationIdRef.current) {
      setGuests([]);
      setPendingReservationId(null);
    }
    prevReservationIdRef.current = room.reservationId;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.reservationId, roomGuestSignature]);

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
  const folioBalance = folioTotals.balance;

  /* Yeni rezervasyon / walk-in check-in'de gönderilen acente alanları */
  const agencyPayload = selectedAgencyId
    ? { agencyId: selectedAgencyId, agencyReservationCode: agencyCode.trim() || undefined }
    : {};

  /* Mevcut rezervasyonda firma/acente değiştirildi mi? (kaydedilmeden check-out yapılmaz) */
  const hasStayInfoChanges = !!room.reservationId && (
    selectedCompanyId !== (room.reservationCompanyId ?? null)
    || selectedAgencyId !== (room.reservationAgencyId ?? null)
    || agencyCode.trim() !== (room.reservationAgencyCode || '')
  );

  const handleSaveStayInfo = async () => {
    if (!room.reservationId) return;
    setLoading(true);
    try {
      await reservationsApi.update(room.reservationId, {
        companyId: selectedCompanyId,
        agencyId: selectedAgencyId,
        agencyReservationCode: selectedAgencyId ? agencyCode.trim() : '',
      });
      Alert.alert('Başarılı', 'Firma ve acente bilgisi kaydedildi.');
      onRoomUpdate();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'Kaydedilemedi');
    } finally {
      setLoading(false);
    }
  };

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

  /* ─── Misafir menüsü ───
   * Boş odada (rezervasyon yok) misafirler sadece yerel listede → listeden çıkarılır.
   * Rezerve/dolu odada web'deki kebab menüyle aynı işlemler (backend kuralları geçerli). */
  const runGuestAction = async (action: () => Promise<unknown>, success?: string) => {
    setLoading(true);
    try {
      await action();
      if (success) Alert.alert('Başarılı', success);
      onRoomUpdate();
    } catch (err) {
      Alert.alert('Hata', (err as Error).message || 'İşlem yapılamadı');
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMenu = (guest: RoomGuest) => {
    if (!guestApiMode) {
      Alert.alert(guest.guestName, 'Misafir listeden çıkarılsın mı?', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Listeden Çıkar',
          style: 'destructive',
          onPress: () => setGuests((prev) => prev.filter((g) => g.guestId !== guest.guestId)),
        },
      ]);
      return;
    }

    const isLastGuest = guests.length <= 1;
    const options: { text: string; style?: 'destructive' | 'cancel'; onPress?: () => void }[] = [
      { text: 'Konaklama Geçmişi', onPress: () => setHistoryGuest(guest) },
    ];
    if (isOccupied) {
      options.push({
        text: 'Check-out Yap',
        onPress: () => {
          /* Son misafirin çıkışı = oda check-out'u (bakiye / cari / zorla çıkış akışı) */
          if (isLastGuest) { handleCheckOut(); return; }
          Alert.alert('Misafir Check-out', `${guest.guestName} için check-out yapılsın mı?`, [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Check-out Yap',
              onPress: () => runGuestAction(() => roomsApi.checkOut(room.id, { guestId: guest.guestId, staffName: user?.name })),
            },
          ]);
        },
      });
    }
    if (!isLastGuest) {
      options.push({
        text: 'Odadan Çıkar',
        style: 'destructive',
        onPress: () => Alert.alert(
          'Misafiri Çıkar',
          `${guest.guestName} yanlışlıkla eklendiyse odadan çıkarılır (konaklama kaydı silinir). Devam edilsin mi?`,
          [
            { text: 'Vazgeç', style: 'cancel' },
            { text: 'Çıkar', style: 'destructive', onPress: () => runGuestAction(() => roomsApi.removeGuest(room.id, guest.guestId)) },
          ],
        ),
      });
    }
    options.push({
      text: 'Kara Liste (Engelle / Kaldır)',
      onPress: async () => {
        try {
          const updated = await guestsApi.toggleBlock(guest.guestId);
          Alert.alert(
            'Kara Liste',
            updated.isBlocked
              ? `${guest.guestName} kara listeye alındı. Mevcut konaklaması devam ediyor.`
              : `${guest.guestName} kara listeden çıkarıldı.`,
          );
        } catch (err) {
          Alert.alert('Hata', (err as Error).message || 'İşlem yapılamadı');
        }
      },
    });
    options.push({ text: 'Kapat', style: 'cancel' });
    Alert.alert(guest.guestName, guest.phone || undefined, options);
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
                ...agencyPayload,
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
        paymentMethod: data.paymentMethod,
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
        ...agencyPayload,
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
    /* Rezerve oda → mevcut rezervasyon check-in'e çevrilir (giriş tarihi ileride olsa da: erken giriş).
     * Yer tutucu (sadece isimli) rezervasyonda önce kalıcı misafir kaydı eklenmeli — web ile aynı kural. */
    const localToday = new Date();
    const today = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
    const checkInDate = room.reservationCheckIn ? room.reservationCheckIn.split('T')[0] : null;
    const isEarlyArrival = isReserved && !!checkInDate && checkInDate > today;

    if (guests.length === 0) {
      Alert.alert(
        'Misafir Gerekli',
        isReserved
          ? 'Check-in için kalıcı misafir kaydı gerekiyor. Önce kimlik bilgileriyle misafir ekleyin.'
          : 'Check-in için en az 1 misafir eklemelisiniz.',
      );
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

    const guestList = guests.map((g) => g.guestName).join(', ');
    const message = isReserved
      ? `Oda ${room.number} — Rezervasyon sahibi: ${room.reservationOwnerName || guestList}`
        + (isEarlyArrival ? `\n\nRezervasyonun giriş tarihi ${new Date(room.reservationCheckIn!).toLocaleDateString('tr-TR')} — erken giriş yapılacak.` : '')
        + '\n\nCheck-in yapılsın mı?'
      : `Oda ${room.number} için check-in yapılsın mı?\n\nMisafir: ${guestList}`;

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
                /* Mevcut rezervasyonu check-in'e çevir — dropdown'dan seçili firma gönderilir.
                 * Misafirler zaten rezervasyonda (rezerve odada eklenenler direkt API'ye gider);
                 * backend hepsinin giriş saatini yazar. */
                await reservationsApi.checkIn(room.reservationId!, {
                  companyId: selectedCompanyId,
                  agencyId: selectedAgencyId,
                  agencyReservationCode: selectedAgencyId ? agencyCode.trim() : '',
                });
              } else {
                /* Direkt check-in → Reservation + Stay oluşur */
                await roomsApi.checkIn(room.id, {
                  guestId: guests[0].guestId,
                  notes,
                  companyId: selectedCompanyId ?? undefined,
                  ...agencyPayload,
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
  const canForce = isAdmin(user);

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
        /* Sebep girişi PromptModal ile (Alert.prompt Android'de çalışmaz) */
        setForcePrompt({ message: error.message || 'Odada ödenmemiş bakiye var.', params });
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
    if (hasStayInfoChanges) {
      Alert.alert('Kaydedilmemiş Değişiklik', 'Firma / acente değişikliğini önce "Firma ve Acenteyi Kaydet" ile kaydedin.');
      return;
    }
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

  /* ─── Check-in İptal (dolu oda) ───
   * Rezervasyon 'Rezerve'ye döner, oda müsait olur; misafir ve folio kayıtları korunur.
   * Rezervasyonu tamamen iptal etmek için sonra "Rezervasyon İptal" kullanılır. */
  const handleRevertCheckin = () => {
    if (!room.reservationId) return;
    Alert.alert(
      'Check-in İptal',
      `Oda ${room.number} check-in'i geri alınacak. Rezervasyon "Rezerve" durumuna döner, misafir ve folio kayıtları korunur.\n\nDevam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Check-in İptal',
          style: 'destructive',
          onPress: () => runGuestAction(() => reservationsApi.revertCheckin(room.reservationId!)),
        },
      ],
    );
  };

  /* ─── Check-out İptal (son 24 saat) — oda tekrar dolu olur ───
     Backend çıkışta yazılan kapanış kalemlerini ve cari aktarımını siler, planlanan çıkış tarihini geri yükler */
  const handleRevertCheckout = () => {
    Alert.alert(
      'Check-out İptal',
      `Oda ${room.number} için son 24 saatte yapılan check-out geri alınacak. Çıkışta yazılan kapanış kalemleri ve cari aktarımı silinir, oda tekrar dolu olur.\n\nDevam edilsin mi?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Geri Al',
          onPress: () => runGuestAction(async () => {
            const res = await roomsApi.revertCheckout(room.id);
            const removed = res.removedItems?.length ? `\n\nSilinen kalemler: ${res.removedItems.join(', ')}` : '';
            if (res.kbsResendRequired) {
              Alert.alert(
                'Check-out geri alındı',
                `KBS'ye çıkış bildirildiği için misafirlerin KBS girişini tekrar gönderin.${removed}`,
              );
            } else {
              Alert.alert('Başarılı', `Check-out geri alındı.${removed}`);
            }
          }),
        },
      ],
    );
  };

  const handleRoomMoved = (targetRoomNumber: string) => {
    setShowRoomMove(false);
    onRoomUpdate();
    onClose();
    deferAlert('Oda Taşındı', `Misafirler Oda ${targetRoomNumber} odasına taşındı.`);
  };

  const showAdmin = isAdmin(user);
  const kbsEnabled = isModuleEnabled(user, 'kbs');
  const invoicesEnabled = isModuleEnabled(user, 'invoices');

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

          {/* Firma seçimi */}
          <Text style={styles.fieldLabel}>Firma</Text>
          <TouchableOpacity style={styles.selectField} onPress={() => setPicker('company')}>
            <View style={styles.selectFieldInner}>
              <Ionicons name="business-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.selectFieldText, !selectedCompanyId && styles.selectFieldPlaceholder]}>
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

          {/* Acente seçimi + rezervasyon kodu */}
          <Text style={styles.fieldLabel}>Acente</Text>
          <TouchableOpacity style={styles.selectField} onPress={() => setPicker('agency')}>
            <View style={styles.selectFieldInner}>
              <Ionicons name="globe-outline" size={18} color={colors.textSecondary} />
              <Text style={[styles.selectFieldText, !selectedAgencyId && styles.selectFieldPlaceholder]}>
                {selectedAgencyId
                  ? agencies.find(a => a.id === selectedAgencyId)?.name || 'Acente'
                  : 'Acente Seçin (Opsiyonel)'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
          {!!selectedAgencyId && (
            <AppInput
              label="Acente Rezervasyon Kodu"
              value={agencyCode}
              onChangeText={setAgencyCode}
              icon="barcode-outline"
            />
          )}
          {hasStayInfoChanges && (
            <AppButton
              title="Firma ve Acenteyi Kaydet"
              variant="outline"
              icon="save-outline"
              loading={loading}
              onPress={handleSaveStayInfo}
              style={{ marginBottom: spacing.sm }}
            />
          )}

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

        {/* Misafir Yönetimi — her durumda görünür (rezerve odada da kim rezerve ettiği görünsün) */}
        <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="people" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>
                {isReserved ? `Rezerve Eden (${guests.length})` : `Odadaki Misafirler (${guests.length})`}
              </Text>
            </View>
            {isReserved && room.reservationCheckIn && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: -4, paddingHorizontal: 4 }}>
                <Ionicons name="calendar-outline" size={14} color={colors.primary} />
                <Text style={{ fontSize: 12, color: colors.primary, fontWeight: '600' }}>
                  Giriş: {new Date(room.reservationCheckIn).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </Text>
              </View>
            )}

            {isReserved && guests.length === 0 && !!room.placeholderGuestName && (
              <View style={styles.placeholderInfo}>
                <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                <Text style={styles.placeholderText}>
                  Ön kayıt: {room.placeholderGuestName}{room.placeholderGuestPhone ? ` · ${room.placeholderGuestPhone}` : ''}.
                  {' '}Check-in için "Yeni Misafir" ile kimlik bilgilerini girin.
                </Text>
              </View>
            )}

            {guests.map((guest) => (
              <View key={guest.guestId} style={styles.guestRow}>
                <Ionicons name="person-circle-outline" size={28} color={colors.primary} />
                <View style={styles.guestInfo}>
                  <Text style={styles.guestName}>{guest.guestName}</Text>
                  {guest.phone && (
                    <Text style={styles.guestPhone}>{guest.phone}</Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => handleGuestMenu(guest)} hitSlop={8} disabled={loading}>
                  <Ionicons
                    name={guestApiMode ? 'ellipsis-vertical' : 'close-circle'}
                    size={22}
                    color={guestApiMode ? colors.textSecondary : colors.error}
                  />
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

        {/* Rezervasyon Notu — her durumda görünür */}
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
            {(isOccupied || isReserved) && notes !== (room.reservationNotes || '') && (
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
                      <Text style={styles.folioDesc} numberOfLines={1}>
                        {folio.description}
                        {folio.paymentMethod ? ` · ${FOLIO_PAYMENT_METHOD_LABELS[folio.paymentMethod] || folio.paymentMethod}` : ''}
                      </Text>
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

                {/* Müşterinin hesabı: harcama / ödenen / kırmızı "Borçlu" */}
                <FolioBalanceSummary folios={folios} />
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

        {/* KBS — sadece dolu odada ve modül açıksa */}
        {isOccupied && kbsEnabled && <RoomKbsCard roomId={room.id} isOccupied={isOccupied} />}

        {/* Fatura Kes — dolu odada, fatura modülü açıksa (web: oda detayı → Fatura) */}
        {isOccupied && invoicesEnabled && (
          <AppCard style={styles.card}>
            <View style={styles.sectionHeader}>
              <Ionicons name="receipt-outline" size={20} color={colors.primary} />
              <Text style={styles.sectionTitle}>Fatura</Text>
            </View>
            <Text style={styles.invoiceHint}>
              Paraşüt üzerinden e-Arşiv / e-Fatura kesin. Müşteri ve folio bilgileri otomatik doldurulur.
            </Text>
            <AppButton title="Fatura Kes" icon="receipt" onPress={() => setInvoiceModalOpen(true)} style={{ marginTop: spacing.sm }} />
          </AppCard>
        )}

        {/* İşlem Geçmişi — patron / genel müdür (web ile aynı) */}
        {showAdmin && <RoomAuditLogCard roomId={room.id} />}

        {/* Aksiyon Butonları — rezerve oda kirli olsa da (misafir erken geldi) check-in yapılabilir */}
        {(isAvailable || isReserved) && (
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
            {!isReserved && !room.reservationId && !pendingReservationId && guests.length === 0 && (
              <AppButton
                title="Ön Kayıt (İsim / Telefon ile Rezervasyon)"
                onPress={() => setShowQuickReservation(true)}
                icon="call-outline"
                variant="outline"
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
              title="Oda Taşı"
              onPress={() => setShowRoomMove(true)}
              icon="swap-horizontal-outline"
              variant="outline"
              disabled={loading}
              style={{ marginBottom: spacing.sm }}
            />
            <AppButton
              title="Check-in İptal"
              onPress={handleRevertCheckin}
              icon="arrow-undo-outline"
              variant="danger"
              loading={loading}
              style={{ marginBottom: spacing.sm }}
            />
          </>
        )}

        {/* Check-out İptal — rezervasyonu olmayan oda (son 24 saatte çıkış yapıldıysa backend geri alır) */}
        {!isOccupied && !room.reservationId && !pendingReservationId && guests.length === 0
          && (room.status === ROOM_STATUS.DIRTY || isAvailable) && (
          <AppButton
            title="Check-out İptal"
            onPress={handleRevertCheckout}
            icon="arrow-undo-outline"
            variant="outline"
            loading={loading}
            style={{ marginBottom: spacing.sm }}
          />
        )}
      </ScrollView>

      {/* Modals */}
      <NewGuestModal
        visible={showNewGuest}
        onClose={() => setShowNewGuest(false)}
        onSave={handleNewGuestSave}
        initialValues={isReserved && guests.length === 0 && room.placeholderGuestName ? {
          firstName: room.placeholderGuestName.trim().split(/\s+/).slice(0, -1).join(' '),
          lastName: room.placeholderGuestName.trim().split(/\s+/).slice(-1)[0],
          phone: room.placeholderGuestPhone,
        } : undefined}
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
        agencyName={selectedAgencyId ? agencies.find(a => a.id === selectedAgencyId)?.name : null}
        notes={notes}
        onClose={() => setShowReservationConfirm(false)}
        onConfirm={submitReservation}
      />
      <RoomMoveModal
        visible={showRoomMove}
        sourceRoom={{ id: room.id, number: room.number }}
        onClose={() => setShowRoomMove(false)}
        onMoved={handleRoomMoved}
      />
      <InvoiceFormModal
        visible={invoiceModalOpen}
        roomId={room.id}
        roomNumber={room.number}
        createdBy={user?.name}
        onClose={() => setInvoiceModalOpen(false)}
        onSuccess={(result) => {
          setInvoiceModalOpen(false);
          setInvoicePdfResult({ pdfUrl: result.pdfUrl, invoiceNo: result.invoiceNo, timedOut: result.status === 'timeout' });
        }}
      />
      <InvoicePdfModal
        visible={!!invoicePdfResult}
        pdfUrl={invoicePdfResult?.pdfUrl || ''}
        invoiceNo={invoicePdfResult?.invoiceNo || ''}
        timedOut={invoicePdfResult?.timedOut}
        onClose={() => setInvoicePdfResult(null)}
      />
      <PromptModal
        visible={!!forcePrompt}
        title="Zorla Çıkış"
        message={`${forcePrompt?.message || ''}\n\nZorla çıkış için sebep girin (işlem geçmişine yazılır):`}
        placeholder="Sebep"
        confirmText="Zorla Çıkış"
        destructive
        validate={(v) => (v.trim() ? null : 'Sebep zorunlu')}
        onConfirm={(reason) => {
          const params = forcePrompt?.params || {};
          performCheckOut({ ...params, force: true, forceReason: reason.trim() });
        }}
        onClose={() => setForcePrompt(null)}
      />
      <NewReservationModal
        visible={showQuickReservation}
        initialRoomId={room.id}
        initialQuick
        onClose={() => setShowQuickReservation(false)}
        onSaved={onRoomUpdate}
      />
      <OptionPickerModal<number | null>
        visible={picker === 'company'}
        title="Firma Seçin"
        options={[
          { value: null, label: 'Bireysel (Firma Yok)' },
          ...companies.map((c) => ({
            value: c.id,
            label: c.name,
            sublabel: c.agreedRate ? `${Number(c.agreedRate).toLocaleString('tr-TR')} ₺/gece` : undefined,
          })),
        ]}
        selectedValue={selectedCompanyId}
        onSelect={handleCompanyChange}
        onClose={() => setPicker(null)}
      />
      <OptionPickerModal<number | null>
        visible={picker === 'agency'}
        title="Acente Seçin"
        options={[
          { value: null, label: 'Acente Yok' },
          ...agencies
            .filter((a) => a.isActive !== false || a.id === selectedAgencyId)
            .map((a) => ({ value: a.id, label: a.name })),
        ]}
        selectedValue={selectedAgencyId}
        onSelect={(v) => { setSelectedAgencyId(v); if (!v) setAgencyCode(''); }}
        onClose={() => setPicker(null)}
      />
      <GuestStayHistoryModal
        visible={!!historyGuest}
        guestId={historyGuest?.guestId ?? null}
        guestName={historyGuest?.guestName || ''}
        onClose={() => setHistoryGuest(null)}
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
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 4 },
  selectField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 12,
  },
  selectFieldInner: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  selectFieldText: { fontSize: 14, color: colors.textPrimary, fontWeight: '600' },
  selectFieldPlaceholder: { color: colors.textDisabled, fontWeight: '400' },
  placeholderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.warning + '15',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  placeholderText: { flex: 1, fontSize: fontSize.xs, color: colors.textPrimary },
  invoiceHint: { fontSize: fontSize.xs, color: colors.textSecondary },
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
});

export default RoomSellView;
