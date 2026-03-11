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

/* ==================== STORAGE KEYS ==================== */

export const EMPLOYEES_STORAGE_KEY = 'grandhotel_employees';

/* ==================== UYGULAMA AYARLARI ==================== */

export const APP_NAME = 'GrandHotel';
export const API_BASE_URL = 'http://localhost:3001/api';
