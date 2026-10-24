/**
 * GrandHotel Mobile - Sabit Değerler
 *
 * Uygulama genelinde kullanılan sabitler tek bir yerden yönetilir.
 */

/* ==================== ROLLER ==================== */

export const ROLES = {
  PATRON: 'patron',
  MANAGER: 'manager',
  RECEPTION: 'reception',
  RECEPTION_MANAGER: 'reception_manager',
  WAITER: 'waiter',
  CHEF: 'chef',
  RESTAURANT_MANAGER: 'restaurant_manager',
  HOUSEKEEPER: 'housekeeper',
  HOUSEKEEPING_MANAGER: 'housekeeping_manager',
  TECHNICIAN: 'technician',
  SECURITY: 'security',
  ACCOUNTANT: 'accountant',
  ACCOUNTING_MANAGER: 'accounting_manager',
  LOBBY: 'lobby',
  BARISTA: 'barista',
  BARMAN: 'barman',
  MINIBAR: 'minibar',
  CASHIER: 'cashier',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.PATRON]: 'Patron',
  [ROLES.MANAGER]: 'Genel Müdür',
  [ROLES.RECEPTION]: 'Resepsiyon',
  [ROLES.RECEPTION_MANAGER]: 'Resepsiyon Müdürü',
  [ROLES.WAITER]: 'Garson',
  [ROLES.CHEF]: 'Aşçı',
  [ROLES.RESTAURANT_MANAGER]: 'Restoran Müdürü',
  [ROLES.HOUSEKEEPER]: 'Housekeeping',
  [ROLES.HOUSEKEEPING_MANAGER]: 'Housekeeping Müdürü',
  [ROLES.TECHNICIAN]: 'Teknik',
  [ROLES.SECURITY]: 'Güvenlik',
  [ROLES.ACCOUNTANT]: 'Muhasebe',
  [ROLES.ACCOUNTING_MANAGER]: 'Muhasebe Müdürü',
  [ROLES.LOBBY]: 'Lobi',
  [ROLES.BARISTA]: 'Barista',
  [ROLES.BARMAN]: 'Barmen',
  [ROLES.MINIBAR]: 'Minibar Görevlisi',
  [ROLES.CASHIER]: 'Kasiyer',
};

/* ==================== MASA DURUMLARI ==================== */

export const TABLE_STATUS = {
  EMPTY: 'empty',
  OCCUPIED: 'occupied',
  RESERVED: 'reserved',
  BILL_REQUESTED: 'bill_requested',
} as const;

export const TABLE_STATUS_LABELS: Record<string, string> = {
  [TABLE_STATUS.EMPTY]: 'Boş',
  [TABLE_STATUS.OCCUPIED]: 'Dolu',
  [TABLE_STATUS.RESERVED]: 'Rezerve',
  [TABLE_STATUS.BILL_REQUESTED]: 'Hesap',
};

export const TABLE_STATUS_COLORS: Record<string, string> = {
  [TABLE_STATUS.EMPTY]: '#22C55E',
  [TABLE_STATUS.OCCUPIED]: '#EF4444',
  [TABLE_STATUS.RESERVED]: '#3B82F6',
  [TABLE_STATUS.BILL_REQUESTED]: '#F59E0B',
};

/* ==================== ADİSYON ÖDEME YÖNTEMLERİ ==================== */

export const PAYMENT_METHODS = {
  CASH: 'cash',
  CARD: 'card',
  ROOM_CHARGE: 'room_charge',
} as const;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  [PAYMENT_METHODS.CASH]: 'Nakit',
  [PAYMENT_METHODS.CARD]: 'Kredi Kartı',
  [PAYMENT_METHODS.ROOM_CHARGE]: 'Odaya Yansıt',
};

/* ==================== FOLIO / CARİ TAHSİLAT YÖNTEMLERİ ==================== */

/** Backend FolioItem.PAYMENT_METHOD_CHOICES / ledger.PAYMENT_METHODS (web ile aynı) */
export const FOLIO_PAYMENT_METHODS: readonly LabelValueOption[] = [
  { value: 'cash', label: 'Nakit' },
  { value: 'card', label: 'Kredi Kartı' },
  { value: 'transfer', label: 'Havale/EFT' },
  { value: 'other', label: 'Diğer' },
];

export const FOLIO_PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(
  FOLIO_PAYMENT_METHODS.map((m) => [m.value, m.label]),
);

/* ==================== ARIZA DURUMLARI ==================== */

export const FAULT_STATUS = {
  OPEN: 'open',
  IN_PROGRESS: 'in_progress',
  RESOLVED: 'resolved',
} as const;

export type FaultStatus = typeof FAULT_STATUS[keyof typeof FAULT_STATUS];

export const FAULT_STATUS_LABELS: Record<string, string> = {
  [FAULT_STATUS.OPEN]: 'Açık',
  [FAULT_STATUS.IN_PROGRESS]: 'İşlemde',
  [FAULT_STATUS.RESOLVED]: 'Çözüldü',
};

export const FAULT_STATUS_COLORS: Record<string, string> = {
  [FAULT_STATUS.OPEN]: '#EF4444',
  [FAULT_STATUS.IN_PROGRESS]: '#F59E0B',
  [FAULT_STATUS.RESOLVED]: '#22C55E',
};

/* ==================== ARIZA KATEGORİLERİ ==================== */

export interface LabelValueOption {
  value: string;
  label: string;
}

export const FAULT_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'electric', label: 'Elektrik' },
  { value: 'plumbing', label: 'Tesisat' },
  { value: 'furniture', label: 'Mobilya' },
  { value: 'aircon', label: 'Klima' },
  { value: 'tv', label: 'TV/Elektronik' },
  { value: 'door_lock', label: 'Kapı/Kilit' },
  { value: 'bathroom', label: 'Banyo' },
  { value: 'other', label: 'Diğer' },
];

/* ==================== STOK BİRİMLERİ ==================== */

export const STOCK_UNITS: readonly LabelValueOption[] = [
  { value: 'adet', label: 'Adet' },
  { value: 'kg', label: 'Kilogram' },
  { value: 'lt', label: 'Litre' },
  { value: 'paket', label: 'Paket' },
];

/* ==================== STOK KATEGORİLERİ ==================== */

export const STOCK_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'cleaning', label: 'Temizlik' },
  { value: 'kitchen', label: 'Mutfak' },
  { value: 'office', label: 'Ofis' },
  { value: 'other', label: 'Diğer' },
];

/* ==================== İZİN TİPLERİ ==================== */

export const LEAVE_TYPES: readonly LabelValueOption[] = [
  // Backend Leave.TYPE_CHOICES ile aynı (eskiden backend'de olmayan sick/personal vardı)
  { value: 'weekly', label: 'Haftalık İzin' },
  { value: 'annual', label: 'Yıllık İzin' },
  { value: 'daily', label: 'Günlük İzin' },
  { value: 'unpaid', label: 'Ücretsiz İzin' },
];

/** İzin türü etiketleri (liste ekranları) — webdeki LEAVE_TYPE_LABELS ile aynı */
export const LEAVE_TYPE_LABELS: Record<string, string> = {
  weekly: 'Haftalık İzin',
  annual: 'Yıllık İzin',
  daily: 'Günlük İzin',
  unpaid: 'Ücretsiz İzin',
};

/** Backend Leave.STATUS_CHOICES — talep 'pending' oluşur, yönetici onaylar/reddeder */
export const LEAVE_STATUS_LABELS: Record<string, string> = {
  pending: 'Onay Bekliyor',
  approved: 'Onaylandı',
  rejected: 'Reddedildi',
  cancelled: 'İptal',
};

export const LEAVE_STATUS_COLORS: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#22C55E',
  rejected: '#EF4444',
  cancelled: '#94A3B8',
};

/* ==================== FATURA ==================== */

/** Backend Invoice.STATUS_CHOICES / TYPE_CHOICES / DOCUMENT_TYPE_CHOICES — web ile aynı */
export const INVOICE_STATUS_LABELS: Record<string, string> = {
  draft: 'Taslak',
  pending: 'Bekliyor',
  processing: 'İşleniyor',
  completed: 'Tamamlandı',
  failed: 'Hata',
  cancelled: 'İptal',
};

export const INVOICE_STATUS_COLORS: Record<string, string> = {
  draft: '#64748B',
  pending: '#F59E0B',
  processing: '#3B82F6',
  completed: '#22C55E',
  failed: '#EF4444',
  cancelled: '#94A3B8',
};

export const INVOICE_TYPE_LABELS: Record<string, string> = {
  sales: 'Satış Faturası',
  purchase: 'Alış Faturası',
  return: 'İade Faturası',
  incoming: 'Gelen Fatura',
  outgoing: 'Giden Fatura',
};

export const INVOICE_DOCUMENT_TYPE_LABELS: Record<string, string> = {
  e_archive: 'e-Arşiv',
  e_invoice: 'e-Fatura',
};

/* ==================== MUHASEBE / KASA ==================== */

/** Backend Expense.CATEGORY_CHOICES (etiketler /meta/choices/ ile güncellenir) */
export const EXPENSE_CATEGORIES: LabelValueOption[] = [
  { value: 'rent', label: 'Kira' },
  { value: 'utilities', label: 'Elektrik/Su/Doğalgaz' },
  { value: 'salary', label: 'Personel/Maaş' },
  { value: 'tax', label: 'Vergi/SGK' },
  { value: 'maintenance', label: 'Bakım/Onarım' },
  { value: 'supplies', label: 'Malzeme/İkmal' },
  { value: 'food', label: 'Gıda/İçecek' },
  { value: 'marketing', label: 'Pazarlama' },
  { value: 'commission', label: 'Komisyon' },
  { value: 'other', label: 'Diğer' },
];

export const EXPENSE_PAYMENT_METHODS: LabelValueOption[] = [
  { value: 'cash', label: 'Nakit' },
  { value: 'card', label: 'Kart' },
  { value: 'transfer', label: 'Havale/EFT' },
  { value: 'other', label: 'Diğer' },
];

/** Backend CashRegister.REGISTER_TYPE_CHOICES */
export const CASH_REGISTER_TYPE_LABELS: Record<string, string> = {
  restaurant: 'Restoran Kasa',
  cafe: 'Kafe Kasa',
  bar: 'Bar Kasa',
  reception: 'Resepsiyon Kasa',
};

/** Backend CashRegisterTransaction.TRANSACTION_TYPE_CHOICES */
export const CASH_TRANSACTION_LABELS: Record<string, string> = {
  sale_cash: 'Nakit Satış',
  sale_card: 'Kart Satış',
  sale_room_charge: 'Odaya Yansıtma',
  expense: 'Gider',
  opening: 'Açılış',
  closing: 'Kapanış',
};

/* ==================== ODA İŞLEM GEÇMİŞİ ==================== */

/** Backend AuditLog.ACTION_CHOICES anahtarları (kayıtları backend yazar) — web AuditLogSection ile aynı */
export const AUDIT_ACTION_LABELS: Record<string, string> = {
  guest_removed: 'Misafir Çıkarıldı',
  folio_deleted: 'Folio Silindi',
  checkout_reversed: 'Check-out İptal',
  checkin_reversed: 'Check-in İptal',
  guest_checkout: 'Misafir Check-out',
  checkout: 'Check-out',
  force_checkout: 'Zorla Çıkış',
  room_moved: 'Oda Taşındı',
  guest_removed_from_company: 'Firmadan Çıkarıldı',
};

export const AUDIT_ACTION_COLORS: Record<string, string> = {
  guest_removed: '#F59E0B',
  folio_deleted: '#EF4444',
  checkout_reversed: '#3B82F6',
  checkin_reversed: '#3B82F6',
  guest_checkout: '#64748B',
  checkout: '#64748B',
  force_checkout: '#EF4444',
  room_moved: '#3B82F6',
  guest_removed_from_company: '#F59E0B',
};

/* ==================== ODA DURUMLARI ==================== */

export const ROOM_STATUS = {
  AVAILABLE: 'available',
  OCCUPIED: 'occupied',
  DIRTY: 'dirty',
  MAINTENANCE: 'maintenance',
  BLOCKED: 'blocked',
} as const;

export type RoomStatus = typeof ROOM_STATUS[keyof typeof ROOM_STATUS];

export const ROOM_STATUS_LABELS: Record<string, string> = {
  [ROOM_STATUS.AVAILABLE]: 'Müsait',
  [ROOM_STATUS.OCCUPIED]: 'Dolu',
  [ROOM_STATUS.DIRTY]: 'Kirli',
  [ROOM_STATUS.MAINTENANCE]: 'Bakımda',
  [ROOM_STATUS.BLOCKED]: 'Bloke',
  reserved: 'Rezerve',
};

export const ROOM_STATUS_COLORS: Record<string, string> = {
  [ROOM_STATUS.AVAILABLE]: '#22C55E',
  [ROOM_STATUS.OCCUPIED]: '#EF4444',
  [ROOM_STATUS.DIRTY]: '#F97316',
  [ROOM_STATUS.MAINTENANCE]: '#3B82F6',
  [ROOM_STATUS.BLOCKED]: '#64748B',
  reserved: '#1565C0',
};

/* ==================== ODA SERVİSİ ==================== */

export const ROOM_SERVICE_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'drink', label: 'İçecek' },
  { value: 'food', label: 'Yiyecek' },
  { value: 'amenity', label: 'Oda Malzemesi' },
  { value: 'other', label: 'Diğer' },
];

export const ORDER_STATUS = {
  PENDING: 'pending',
  DELIVERED: 'delivered',
} as const;

export type OrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

/* ==================== OTEL ODALARI ==================== */

export const HOTEL_ROOMS: readonly string[] = [
  '101', '102', '103', '104', '105', '106', '107', '108',
  '201', '202', '203', '204', '205', '206', '207', '208',
  '301', '302', '303', '304', '305', '306', '307', '308',
  '401', '402', '403', '404', '405', '406', '407', '408',
  '501', '502', '503', '504', '505', '506', '507', '508',
  '601', '602', '603', '604', '605', '606', '607', '608',
];

/* ==================== ŞİKAYET DURUMLARI ==================== */

export const COMPLAINT_STATUS = {
  NEW: 'new',
  READ: 'read',
  RESOLVED: 'resolved',
} as const;

export type ComplaintStatus = typeof COMPLAINT_STATUS[keyof typeof COMPLAINT_STATUS];

export const COMPLAINT_STATUS_LABELS: Record<string, string> = {
  [COMPLAINT_STATUS.NEW]: 'Yeni',
  [COMPLAINT_STATUS.READ]: 'Okundu',
  [COMPLAINT_STATUS.RESOLVED]: 'Çözüldü',
};

export const COMPLAINT_STATUS_COLORS: Record<string, string> = {
  [COMPLAINT_STATUS.NEW]: '#EF4444',
  [COMPLAINT_STATUS.READ]: '#F59E0B',
  [COMPLAINT_STATUS.RESOLVED]: '#22C55E',
};

/* ==================== STORAGE KEYS ==================== */

export const EMPLOYEES_STORAGE_KEY = 'grandhotel_employees';
export const SHIFTS_STORAGE_KEY = 'grandhotel_shifts';
export const COMPLAINTS_STORAGE_KEY = 'grandhotel_complaints';

/* ==================== REZERVASYON DURUMLARI ==================== */

/**
 * Backend Reservation.RESERVATION_STATUS_CHOICES ile birebir aynı (tek doğruluk kaynağı backend).
 * Webdeki RESERVATION_STATUS da aynı değer ve etiketleri kullanır.
 * Gelmeyen (no-show) rezervasyonlar gün sonunda 'cancelled' olur;
 * no-show sayısı/detayı gün sonu raporunda tutulur.
 */
export const RESERVATION_STATUS = {
  RESERVED: 'reserved',
  CHECKED_IN: 'checked_in',
  CHECKED_OUT: 'checked_out',
  CANCELLED: 'cancelled',
} as const;

export type ReservationStatus = typeof RESERVATION_STATUS[keyof typeof RESERVATION_STATUS];

export const RESERVATION_STATUS_LABELS: Record<string, string> = {
  [RESERVATION_STATUS.RESERVED]: 'Rezerve',
  [RESERVATION_STATUS.CHECKED_IN]: 'Giriş Yapıldı',
  [RESERVATION_STATUS.CHECKED_OUT]: 'Çıkış Yapıldı',
  [RESERVATION_STATUS.CANCELLED]: 'İptal',
};

export const RESERVATION_STATUS_COLORS: Record<string, string> = {
  [RESERVATION_STATUS.RESERVED]: '#F59E0B',
  [RESERVATION_STATUS.CHECKED_IN]: '#3B82F6',
  [RESERVATION_STATUS.CHECKED_OUT]: '#64748B',
  [RESERVATION_STATUS.CANCELLED]: '#EF4444',
};

/* ==================== REZERVASYON FİLTRE PRESET'LERİ ==================== */

export const RESERVATION_FILTERS = {
  TODAY_CHECKIN: 'today_checkin',
  TODAY_CHECKOUT: 'today_checkout',
  TODAY_CHECKED_OUT: 'today_checked_out',
  TODAY_CHECKOUT_DONE: 'today_checkout_done',
  TOMORROW_CHECKIN: 'tomorrow_checkin',
  UNPAID_CHECKOUT: 'unpaid_checkout',
} as const;

export const RESERVATION_FILTER_LABELS: Record<string, string> = {
  [RESERVATION_FILTERS.TODAY_CHECKIN]: 'Bugün Girecekler',
  [RESERVATION_FILTERS.TODAY_CHECKOUT]: 'Bugün Çıkacaklar',
  [RESERVATION_FILTERS.TODAY_CHECKED_OUT]: 'Bugün Çıkışlı',
  [RESERVATION_FILTERS.TODAY_CHECKOUT_DONE]: 'Bugün Çıkanlar',
  [RESERVATION_FILTERS.TOMORROW_CHECKIN]: 'Yarın Girecekler',
  [RESERVATION_FILTERS.UNPAID_CHECKOUT]: 'Ödemesiz Çıkış',
};

/* ==================== ÖDEME DURUMLARI ==================== */

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid: 'Ödendi',
  partial: 'Kısmi',
  unpaid: 'Ödenmedi',
};

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid: '#22C55E',
  partial: '#F59E0B',
  unpaid: '#EF4444',
};

/* ==================== FOLİO KATEGORİLERİ ==================== */

export const FOLIO_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'room_charge', label: 'Oda Ücreti' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'restaurant', label: 'Restoran/Kafe' },
  { value: 'service', label: 'Ek Hizmet' },
  { value: 'discount', label: 'İndirim' },
  { value: 'payment', label: 'Ödeme' },
  { value: 'account_transfer_debit', label: 'Cariye Borçlu Aktarım' },
  { value: 'account_transfer_credit', label: 'Cariye Alacaklı Aktarım' },
];

/** Backend FolioItem.CATEGORY_CHOICES ve webdeki FOLIO_CATEGORIES ile aynı anahtarlar */
export const FOLIO_CATEGORY_LABELS: Record<string, string> = {
  room_charge: 'Oda Ücreti',
  minibar: 'Minibar',
  restaurant: 'Restoran/Kafe',
  service: 'Ek Hizmet',
  discount: 'İndirim',
  payment: 'Ödeme',
  account_transfer_debit: 'Cariye Borçlu Aktarım',
  account_transfer_credit: 'Cariye Alacaklı Aktarım',
};

/* ==================== UYGULAMA AYARLARI ==================== */

export const APP_NAME = 'GrandHotel';
// Varsayılan API URL — sunucu
// Geliştirici modu ile değiştirilebilir (login ekranında logo'ya 5x tıkla)
import { Platform } from 'react-native';
const PRODUCTION_URL = 'https://api.hotelgrandhitit.com/api';
// Lokal backend host'u (yalnızca "Test Sunucu (Lokal)" seçilirse kullanılır):
// Android emülatörü → 10.0.2.2, iOS simülatörü/web → localhost
const DEFAULT_HOST = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
// Varsayılan: canlı prod backend (HTTPS). iOS düz HTTP'yi (ATS) bloklar ve prod
// sunucuda :8000 firewall'lı olduğu için dev'de de HTTPS domaine bağlanıyoruz.
// Lokal backend ile geliştirmek istersen login ekranından "Test Sunucu (Lokal)" seç.
export const DEFAULT_API_BASE_URL = PRODUCTION_URL;

// Mutable API_BASE_URL — sunucu seçimiyle değişebilir
export let API_BASE_URL = DEFAULT_API_BASE_URL;
export const setApiBaseUrl = (url: string) => { API_BASE_URL = url; };

/**
 * WebSocket adresini o anki API_BASE_URL'den üretir.
 * https://x.com/api + '/ws/rooms/' → wss://x.com/ws/rooms/
 * Sabit (const) yerine fonksiyon: sunucu login ekranında değiştirilirse
 * bir sonraki bağlantı yeni sunucuya gider.
 */
export const getWsUrl = (path: string) =>
  API_BASE_URL.replace(/\/api$/, '').replace(/^http/, 'ws') + path;

// Sunucu listesi (geliştirici modu)
export interface ServerConfig {
  name: string;
  url: string;
}

export const SERVER_LIST: ServerConfig[] = [
  { name: 'Grand Hitit (Canlı)', url: 'https://api.hotelgrandhitit.com/api' },
  { name: 'Test Sunucu (Lokal)', url: `http://${DEFAULT_HOST}:8000/api` },
];
