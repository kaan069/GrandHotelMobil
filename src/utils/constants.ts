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
  { value: 'annual', label: 'Yıllık İzin' },
  { value: 'sick', label: 'Hastalık İzni' },
  { value: 'personal', label: 'Mazeret İzni' },
  { value: 'unpaid', label: 'Ücretsiz İzin' },
];

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

/* ==================== FOLİO KATEGORİLERİ ==================== */

export const FOLIO_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'room_charge', label: 'Oda Ücreti' },
  { value: 'minibar', label: 'Minibar' },
  { value: 'restaurant', label: 'Restoran/Kafe' },
  { value: 'service', label: 'Hizmet/Servis' },
  { value: 'discount', label: 'İndirim' },
  { value: 'payment', label: 'Ödeme' },
];

export const FOLIO_CATEGORY_LABELS: Record<string, string> = {
  room_charge: 'Oda Ücreti',
  minibar: 'Minibar',
  restaurant: 'Restoran/Kafe',
  service: 'Hizmet/Servis',
  discount: 'İndirim',
  payment: 'Ödeme',
};

/* ==================== UYGULAMA AYARLARI ==================== */

export const APP_NAME = 'GrandHotel';
// Varsayılan API URL — sunucu
// Geliştirici modu ile değiştirilebilir (login ekranında logo'ya 5x tıkla)
import { Platform } from 'react-native';
const PRODUCTION_URL = 'http://89.252.152.168/api';
const getDefaultHost = () => {
  if (Platform.OS === 'web') return 'localhost';
  if (__DEV__) {
    // Android emülatöründen host makina → 10.0.2.2, iOS simülatörü → localhost
    return Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
  }
  return '89.252.152.168'; // Production sunucu
};
const DEFAULT_HOST = getDefaultHost();
export const DEFAULT_API_BASE_URL = __DEV__ ? `http://${DEFAULT_HOST}:8000/api` : PRODUCTION_URL;

// Mutable API_BASE_URL — sunucu seçimiyle değişebilir
export let API_BASE_URL = DEFAULT_API_BASE_URL;
export const setApiBaseUrl = (url: string) => { API_BASE_URL = url; };

// Sunucu listesi (geliştirici modu)
export interface ServerConfig {
  name: string;
  url: string;
}

export const SERVER_LIST: ServerConfig[] = [
  { name: 'Grand Hotel (Sunucu)', url: 'http://89.252.152.168/api' },
  { name: 'Test Sunucu (Lokal)', url: `http://${DEFAULT_HOST}:8000/api` },
];
