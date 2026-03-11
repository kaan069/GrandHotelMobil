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
  WAITER: 'waiter',
  CHEF: 'chef',
  TECHNICIAN: 'technician',
  HOUSEKEEPER: 'housekeeper',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const ROLE_LABELS: Record<string, string> = {
  [ROLES.PATRON]: 'Patron',
  [ROLES.MANAGER]: 'Müdür',
  [ROLES.RECEPTION]: 'Resepsiyon',
  [ROLES.WAITER]: 'Garson',
  [ROLES.CHEF]: 'Aşçı',
  [ROLES.TECHNICIAN]: 'Teknik',
  [ROLES.HOUSEKEEPER]: 'Housekeeping',
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
  { value: 'kg', label: 'Kilogram' },
  { value: 'lt', label: 'Litre' },
  { value: 'adet', label: 'Adet' },
  { value: 'paket', label: 'Paket' },
  { value: 'kutu', label: 'Kutu' },
  { value: 'koli', label: 'Koli' },
];

/* ==================== STOK KATEGORİLERİ ==================== */

export const STOCK_CATEGORIES: readonly LabelValueOption[] = [
  { value: 'food', label: 'Gıda' },
  { value: 'drink', label: 'İçecek' },
  { value: 'cleaning', label: 'Temizlik' },
  { value: 'office', label: 'Ofis Malzemesi' },
  { value: 'maintenance', label: 'Bakım/Onarım' },
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
};

export const ROOM_STATUS_COLORS: Record<string, string> = {
  [ROOM_STATUS.AVAILABLE]: '#22C55E',
  [ROOM_STATUS.OCCUPIED]: '#EF4444',
  [ROOM_STATUS.DIRTY]: '#F97316',
  [ROOM_STATUS.MAINTENANCE]: '#3B82F6',
  [ROOM_STATUS.BLOCKED]: '#64748B',
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
  '101', '102', '103',
  '201', '202', '203',
  '301', '302', '303',
  '401',
];

/* ==================== STORAGE KEYS ==================== */

export const EMPLOYEES_STORAGE_KEY = 'grandhotel_employees';

/* ==================== UYGULAMA AYARLARI ==================== */

export const APP_NAME = 'GrandHotel';
export const API_BASE_URL = 'http://localhost:3001/api';
