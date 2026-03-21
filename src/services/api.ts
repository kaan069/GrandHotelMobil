/**
 * GrandHotel Mobile — Merkezi API Servisi
 *
 * Tüm backend API çağrıları bu dosyada tanımlıdır.
 * Kullanım: import { roomsApi, guestsApi } from '../services/api';
 *
 * Yapı:
 *   apiClient()    — ortak fetch wrapper (hata yönetimi dahil)
 *   roomsApi       — oda işlemleri (CRUD + check-in/out)
 *   guestsApi      — misafir işlemleri (CRUD + arama)
 *   companiesApi   — firma işlemleri
 *   reservationsApi — rezervasyon listesi ve detayı
 *   foliosApi      — hesap kalemleri
 *   reportsApi     — raporlama
 */

import { API_BASE_URL } from '../utils/constants';
import type {
  ApiRoom,
  Guest,
  Company,
  Reservation,
  ReservationDetail,
  ApiFolioItem,
} from '../utils/types';

/* ==================== BASE CLIENT ==================== */

/**
 * Ortak fetch wrapper — tüm API çağrıları bu fonksiyon üzerinden geçer.
 *
 * Ne yapar:
 *   1. URL'yi oluşturur (API_BASE_URL + endpoint)
 *   2. Header'ları ekler (Content-Type: application/json)
 *   3. Fetch isteği atar
 *   4. Hata varsa → Error fırlatır
 *   5. Başarılıysa → JSON olarak döner
 *
 * Generic <T> ne demek?
 *   Fonksiyonun dönüş tipini çağıran yerde belirlersin.
 *   apiClient<Guest[]>('/guests/') → Promise<Guest[]> döner
 *   apiClient<ApiRoom>('/rooms/1/') → Promise<ApiRoom> döner
 */
async function apiClient<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    ...options,
  });

  // HTTP 204 No Content (DELETE işlemlerinde döner)
  if (response.status === 204) {
    return undefined as T;
  }

  // Hata durumunda backend'in döndüğü error mesajını al
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Hatası: ${response.status}`);
  }

  return response.json();
}

/* ==================== ROOMS API ==================== */

export const roomsApi = {
  /** Tüm odaları getir */
  getAll: () =>
    apiClient<ApiRoom[]>('/rooms/'),

  /** Tek oda detayı */
  getById: (id: number) =>
    apiClient<ApiRoom>(`/rooms/${id}/`),

  /** Check-in: Yeni rezervasyon + misafir girişi */
  checkIn: (roomId: number, body: { guestId: number; notes?: string }) =>
    apiClient<ApiRoom>(`/rooms/${roomId}/check_in/`, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  /** Check-out: Misafir çıkışı (tüm veya tek misafir) */
  checkOut: (roomId: number, body?: { guestId?: number }) =>
    apiClient<ApiRoom>(`/rooms/${roomId}/check_out/`, {
      method: 'POST',
      body: JSON.stringify(body || {}),
    }),

  /** Mevcut rezervasyona misafir ekle */
  addGuest: (roomId: number, guestId: number) =>
    apiClient<ApiRoom>(`/rooms/${roomId}/add_guest/`, {
      method: 'POST',
      body: JSON.stringify({ guestId }),
    }),

  /** Oda durumunu değiştir (available, dirty, maintenance, blocked) */
  updateStatus: (roomId: number, status: string) =>
    apiClient<ApiRoom>(`/rooms/${roomId}/update_status/`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    }),

  /** Aktif rezervasyonun notunu güncelle */
  updateNotes: (roomId: number, notes: string) =>
    apiClient<ApiRoom>(`/rooms/${roomId}/update_notes/`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    }),
};

/* ==================== GUESTS API ==================== */

export const guestsApi = {
  /** Tüm misafirleri getir */
  getAll: () =>
    apiClient<Guest[]>('/guests/'),

  /** Misafir ara (ad, soyad, TC, telefon) */
  search: (q: string) =>
    apiClient<Guest[]>(`/guests/search/?q=${encodeURIComponent(q)}`),

  /** Yeni misafir oluştur */
  create: (data: {
    tcNo: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    companyId?: number | null;
  }) =>
    apiClient<Guest>('/guests/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Kara listeye al/çıkar */
  toggleBlock: (id: number) =>
    apiClient<Guest>(`/guests/${id}/toggle_block/`, { method: 'POST' }),

  /** Misafirin rezervasyon geçmişi */
  stayHistory: (id: number) =>
    apiClient<Reservation[]>(`/guests/${id}/stay_history/`),
};

/* ==================== COMPANIES API ==================== */

export const companiesApi = {
  /** Tüm firmaları getir */
  getAll: () =>
    apiClient<Company[]>('/companies/'),

  /** Yeni firma oluştur */
  create: (data: { name: string; taxNumber?: string; address?: string; phone?: string; email?: string }) =>
    apiClient<Company>('/companies/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Firma güncelle */
  update: (id: number, data: Partial<Company>) =>
    apiClient<Company>(`/companies/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Firma sil */
  delete: (id: number) =>
    apiClient<void>(`/companies/${id}/`, { method: 'DELETE' }),

  /** Firmaya kayıtlı misafirler */
  getGuests: (id: number) =>
    apiClient<Guest[]>(`/companies/${id}/guests/`),

  /** Borçlu firmalar listesi */
  getDebtors: () =>
    apiClient<any[]>('/companies/debtors/'),

  /** Firma borç detayı */
  getDebtDetail: (id: number) =>
    apiClient<any>(`/companies/${id}/debt_detail/`),

  /** Firmaya ödeme ekle (borç kapat) */
  addPayment: (companyId: number, data: { reservationId: number; amount: number; description?: string; staffName?: string }) =>
    apiClient<any>(`/companies/${companyId}/add_payment/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

/* ==================== RESERVATIONS API ==================== */

export const reservationsApi = {
  /** Rezervasyon listesi (çoklu filtre) */
  getAll: (filters?: {
    roomId?: number; guestId?: number; companyId?: number;
    isActive?: boolean; status?: string;
    dateFrom?: string; dateTo?: string;
  }) => {
    const params = new URLSearchParams();
    if (filters?.roomId) params.append('roomId', String(filters.roomId));
    if (filters?.guestId) params.append('guestId', String(filters.guestId));
    if (filters?.companyId) params.append('companyId', String(filters.companyId));
    if (filters?.isActive !== undefined) params.append('isActive', String(filters.isActive));
    if (filters?.status) params.append('status', filters.status);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const qs = params.toString();
    return apiClient<Reservation[]>(`/reservations/${qs ? '?' + qs : ''}`);
  },

  /** Tek rezervasyon detayı */
  getById: (id: number) =>
    apiClient<ReservationDetail>(`/reservations/${id}/`),

  /** Yeni rezervasyon oluştur (check-in yapmadan) */
  create: (data: {
    roomId: number; guestId: number;
    plannedCheckIn: string; plannedCheckOut?: string;
    notes?: string; staffName?: string; companyId?: number;
  }) =>
    apiClient<Reservation>('/reservations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Rezervasyon iptal */
  cancel: (id: number) =>
    apiClient<Reservation>(`/reservations/${id}/cancel/`, { method: 'POST' }),

  /** Rezerve → Check-in dönüşümü */
  checkIn: (id: number) =>
    apiClient<Reservation>(`/reservations/${id}/check_in/`, { method: 'POST' }),
};

/* ==================== FOLIOS API ==================== */

export const foliosApi = {
  /** Rezervasyona ait folio kalemleri */
  getForReservation: (reservationId: number) =>
    apiClient<ApiFolioItem[]>(`/folios/?reservationId=${reservationId}`),

  /** Odanın aktif rezervasyonunun folio kalemleri */
  getForRoom: (roomId: number) =>
    apiClient<ApiFolioItem[]>(`/folios/?roomId=${roomId}`),

  /** Yeni folio kalemi oluştur */
  create: (data: {
    reservationId: number;
    guestId?: number | null;
    category: string;
    description: string;
    amount: number;
    date: string;
    createdBy?: string;
  }) =>
    apiClient<ApiFolioItem>('/folios/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Folio kalemi sil */
  delete: (id: number) =>
    apiClient<void>(`/folios/${id}/`, { method: 'DELETE' }),
};

/* ==================== REPORTS API ==================== */

export const reportsApi = {
  /** Firma raporu */
  company: (id: number, filters?: { dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const qs = params.toString();
    return apiClient<any>(`/reports/company/${id}/${qs ? '?' + qs : ''}`);
  },

  /** Misafir raporu */
  guest: (id: number) =>
    apiClient<any>(`/reports/guest/${id}/`),

  /** Oda raporu */
  room: (id: number) =>
    apiClient<any>(`/reports/room/${id}/`),
};

/* ==================== KAZANÇ (GELİR) API ==================== */

export const kazancApi = {
  /** Dashboard özet istatistikler (doluluk + ciro + check-in/out) */
  dashboardStats: () =>
    apiClient<any>('/kazanc/dashboard-stats/'),

  /** Gelir detay (kategori + oda tipi bazlı) */
  revenueBreakdown: (filters?: { month?: string; dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams();
    if (filters?.month) params.append('month', filters.month);
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    const qs = params.toString();
    return apiClient<any>(`/kazanc/revenue-breakdown/${qs ? '?' + qs : ''}`);
  },

  /** Günlük özet (doluluk + folio breakdown + dolu oda detayları) */
  dailySummary: (date?: string) => {
    const qs = date ? `?date=${date}` : '';
    return apiClient<any>(`/kazanc/daily-summary/${qs}`);
  },

  /** Gün sonu önizleme — hangi odalara ücret yansıyacak */
  nightAuditPreview: () =>
    apiClient<any>('/kazanc/night-audit-preview/'),

  /** Gün sonu uygula — oda ücretlerini folio'ya yaz */
  nightAuditExecute: () =>
    apiClient<any>('/kazanc/night-audit/', { method: 'POST' }),

  /** Gelişmiş kazanç raporu (çoklu filtreleme) */
  advancedReport: (filters?: {
    dateFrom?: string; dateTo?: string;
    bedTypes?: string; companyOnly?: boolean; individualOnly?: boolean;
    categories?: string; includeDebtors?: boolean;
  }) => {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    if (filters?.bedTypes) params.append('bedTypes', filters.bedTypes);
    if (filters?.companyOnly) params.append('companyOnly', 'true');
    if (filters?.individualOnly) params.append('individualOnly', 'true');
    if (filters?.categories) params.append('categories', filters.categories);
    if (filters?.includeDebtors) params.append('includeDebtors', 'true');
    const qs = params.toString();
    return apiClient<any>(`/kazanc/advanced-report/${qs ? '?' + qs : ''}`);
  },
};

/* ==================== STAFF (PERSONEL) API ==================== */

export interface ApiEmployee {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  password: string;
  staffNumber: string;
  hireDate: string;
  status: string;
  roles: string[];
  roleLabels: string[];
  createdAt: string;
}

export interface ApiTaskAssignment {
  id: number;
  employeeId: number;
  employeeName: string;
  isCompleted: boolean;
  completedAt: string | null;
  note: string;
  assignedAt: string;
}

export interface ApiTask {
  id: number;
  title: string;
  description: string;
  createdById: number;
  createdByName: string;
  assigneeNames: string | null;
  assigneeCount: number;
  completedCount: number;
  priority: string;
  status: string;
  dueDate: string | null;
  createdAt: string;
  assignments?: ApiTaskAssignment[];
}

export const staffApi = {
  getAll: (filters?: { status?: string; role?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.role) params.append('role', filters.role);
    const qs = params.toString();
    return apiClient<ApiEmployee[]>(`/staff/${qs ? '?' + qs : ''}`);
  },

  getById: (id: number) =>
    apiClient<ApiEmployee>(`/staff/${id}/`),

  create: (data: {
    firstName: string; lastName: string; phone: string; password: string;
    staffNumber: string; hireDate: string; roles: string[];
  }) =>
    apiClient<ApiEmployee>('/staff/', { method: 'POST', body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiClient<void>(`/staff/${id}/`, { method: 'DELETE' }),

  login: (data: { staffNumber: string; password: string }) =>
    apiClient<ApiEmployee>('/staff/login/', { method: 'POST', body: JSON.stringify(data) }),

  subordinates: (id: number) =>
    apiClient<ApiEmployee[]>(`/staff/${id}/subordinates/`),
};

/* ==================== TASKS (GÖREV) API ==================== */

export const tasksApi = {
  getAll: (filters?: { assignee?: number; createdBy?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.assignee) params.append('assignee', String(filters.assignee));
    if (filters?.createdBy) params.append('createdBy', String(filters.createdBy));
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiClient<ApiTask[]>(`/tasks/${qs ? '?' + qs : ''}`);
  },

  getById: (id: number) =>
    apiClient<ApiTask>(`/tasks/${id}/`),

  create: (data: {
    title: string; description?: string; createdById: number;
    assigneeIds: number[]; priority?: string; dueDate?: string;
  }) =>
    apiClient<ApiTask>('/tasks/', { method: 'POST', body: JSON.stringify(data) }),

  complete: (id: number, data: { employeeId: number; note?: string }) =>
    apiClient<ApiTask>(`/tasks/${id}/complete/`, { method: 'POST', body: JSON.stringify(data) }),

  cancel: (id: number) =>
    apiClient<ApiTask>(`/tasks/${id}/cancel/`, { method: 'POST' }),
};

/* ==================== LEAVES (İZİN) API ==================== */

export interface ApiLeave {
  id: number;
  employeeId: number;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  status: string;
  deductFromAnnual: boolean;
  note: string;
  approvedById: number | null;
  approvedByName: string | null;
  createdAt: string;
}

export const leavesApi = {
  getAll: (filters?: { employeeId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.employeeId) params.append('employeeId', String(filters.employeeId));
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiClient<ApiLeave[]>(`/leaves/${qs ? '?' + qs : ''}`);
  },

  getForEmployee: (employeeId: number) =>
    apiClient<ApiLeave[]>(`/staff/${employeeId}/leaves/`),
};
