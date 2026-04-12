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

import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../utils/constants';
import type {
  ApiRoom,
  Guest,
  Company,
  Reservation,
  ReservationDetail,
  ApiFolioItem,
  StockItem,
  MinibarProduct,
  RoomMinibarItem,
  ApiServiceArea,
  ApiTable,
  ApiTab,
  ApiTabItem,
  ApiMenuCategory,
  ApiMenuItem,
} from '../utils/types';
import type { Fault } from '../components/tasks/FaultDetailView';

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

  /* AsyncStorage'dan hotel ID ve JWT token al */
  let hotelId: string | null = null;
  let token: string | null = null;
  try {
    const keys = await AsyncStorage.multiGet([
      'grandhotel_mobile_hotel_id',
      'grandhotel_mobile_token',
    ]);
    hotelId = keys[0][1];
    token = keys[1][1];
  } catch {
    /* Storage kullanılamıyorsa sessizce geç */
  }

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(hotelId ? { 'X-Hotel-Id': hotelId } : {}),
      ...(options?.headers || {}),
    },
    ...options,
  });

  // HTTP 204 No Content (DELETE işlemlerinde döner)
  if (response.status === 204) {
    return undefined as T;
  }

  // 401 veya token süresi dolmuş 403 → Token refresh dene (login endpoint'i hariç)
  // Backend süresi dolmuş token için 401 yerine 403 dönebiliyor (DRF default davranışı)
  if (
    (response.status === 401 ||
      (response.status === 403 && /token|süres/i.test(
        await response.clone().text().catch(() => '')
      ))) &&
    !endpoint.includes('/staff/login')
  ) {
    const refreshed = await _tryRefreshToken();
    if (refreshed) {
      // Yeni token ile tekrar dene
      return apiClient<T>(endpoint, options);
    }
    // Refresh başarısız → logout (AuthContext'e bırak)
  }

  // Hata durumunda backend'in döndüğü error mesajını al
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    // Django REST Framework field-level errors: { "field": ["msg"] }
    if (!errorData.error && typeof errorData === 'object') {
      const fieldErrors = Object.entries(errorData)
        .filter(([key]) => key !== 'requireForce' && key !== 'balance')
        .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(', ') : val}`)
        .join('\n');
      if (fieldErrors) throw new Error(fieldErrors);
    }

    const err: any = new Error(errorData.error || `API Hatası: ${response.status}`);
    if (errorData.requireForce) err.requireForce = true;
    if (errorData.balance) err.balance = errorData.balance;
    throw err;
  }

  return response.json();
}

/** Token refresh — 401 alındığında çağrılır */
async function _tryRefreshToken(): Promise<boolean> {
  try {
    const refreshToken = await AsyncStorage.getItem('grandhotel_mobile_refresh_token');
    if (!refreshToken) return false;

    const response = await fetch(`${API_BASE_URL}/staff/token/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    await AsyncStorage.multiSet([
      ['grandhotel_mobile_token', data.access],
      ['grandhotel_mobile_refresh_token', data.refresh],
    ]);
    return true;
  } catch {
    return false;
  }
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
  checkOut: (roomId: number, body?: { guestId?: number; force?: boolean }) =>
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

  /** Yeni oda ekle */
  create: (data: { roomNumber: string; bedType: string; floor: number; capacity: number; view: string; price: number; beds?: { type: string }[] }) =>
    apiClient<ApiRoom>('/rooms/', {
      method: 'POST',
      body: JSON.stringify({ ...data, status: 'available' }),
    }),

  /** Oda güncelle */
  update: (id: number, data: Record<string, unknown>) =>
    apiClient<ApiRoom>(`/rooms/${id}/`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Oda sil */
  delete: (id: number) =>
    apiClient(`/rooms/${id}/`, { method: 'DELETE' }),
};

/* ==================== HOTEL API ==================== */

export const hotelApi = {
  get: () => apiClient<Record<string, unknown>>('/hotel/'),
  update: (data: Record<string, unknown>) =>
    apiClient<Record<string, unknown>>('/hotel/', {
      method: 'PUT',
      body: JSON.stringify(data),
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

  /** TC ile müşteri kontrolü */
  checkTc: (tc: string) =>
    apiClient<{ found: boolean; isBlocked?: boolean; guest?: Guest }>(`/guests/check_tc/?tc=${encodeURIComponent(tc)}`),
};

/* ==================== COMPANIES API ==================== */

export const companiesApi = {
  /** Tüm firmaları getir */
  getAll: () =>
    apiClient<Company[]>('/companies/'),

  /** Yeni firma oluştur */
  create: (data: { name: string; taxNumber?: string; address?: string; phone?: string; email?: string; agreedRate?: number }) =>
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
    checkIn: string; checkOut?: string;
    notes?: string; staffName?: string; companyId?: number;
  }) =>
    apiClient<Reservation>('/reservations/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Rezervasyon güncelle (sadece reserved/confirmed durumunda) */
  update: (id: number, data: {
    roomId?: number; checkIn?: string; checkOut?: string;
    notes?: string; companyId?: number | null; totalAmount?: number;
  }) =>
    apiClient<Reservation>(`/reservations/${id}/`, {
      method: 'PUT',
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
  nightAuditExecute: (processedBy?: string) =>
    apiClient<any>('/kazanc/night-audit/', { method: 'POST', body: JSON.stringify({ processedBy }) }),

  /** No-show iptal */
  cancelNoShow: (reservationId: number) =>
    apiClient<any>(`/reservations/${reservationId}/cancel/`, { method: 'POST' }),

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
  salary?: number | string | null;
  consecutiveWorkDays?: number;
  totalWorkDays?: number;
  weeklyLeaveEarned?: number;
  weeklyLeaveUsed?: number;
  weeklyLeaveRemaining?: number;
  annualLeaveEntitlement?: number;
  usedAnnualLeave?: number;
  remainingAnnualLeave?: number;
  isOnLeaveToday?: boolean;
  enabledModules?: string[];
  branchCode?: string;
  hotelId?: number;
  hotelName?: string;
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
    staffNumber: string; hireDate: string; roles: string[]; salary?: number;
  }) =>
    apiClient<ApiEmployee>('/staff/', { method: 'POST', body: JSON.stringify(data) }),

  update: (id: number, data: Partial<{
    firstName: string; lastName: string; phone: string;
    hireDate: string; status: string; roles: string[]; salary: number;
  }>) =>
    apiClient<ApiEmployee>(`/staff/${id}/`, { method: 'PATCH', body: JSON.stringify(data) }),

  delete: (id: number) =>
    apiClient<void>(`/staff/${id}/`, { method: 'DELETE' }),

  login: (data: { branchCode: string; staffNumber: string; password: string }) =>
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

/* ==================== MULTIPART UPLOAD HELPER ==================== */

async function apiMultipart<T>(endpoint: string, formData: FormData, method = 'POST'): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    method,
    body: formData,
    // Content-Type header EKLENMEMELİ — fetch otomatik boundary ekler
  });

  if (response.status === 204) {
    return undefined as T;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `API Hatası: ${response.status}`);
  }

  return response.json();
}

/* ==================== STOCK (STOK) API ==================== */

export const stockApi = {
  /** Tüm stok ürünlerini getir (filtrelenebilir) */
  getAll: (filters?: { category?: string; isMinibar?: string }) => {
    const params = new URLSearchParams();
    if (filters?.category) params.append('category', filters.category);
    if (filters?.isMinibar) params.append('isMinibar', filters.isMinibar);
    const qs = params.toString();
    return apiClient<StockItem[]>(`/stock/${qs ? '?' + qs : ''}`);
  },

  /** Tekil stok ürünü */
  getById: (id: number) =>
    apiClient<StockItem>(`/stock/${id}/`),

  /** Yeni stok ürünü oluştur */
  create: (data: {
    name: string; category: string; unit?: string;
    quantity?: number; isMinibar?: boolean; minibarPrice?: number;
  }) =>
    apiClient<StockItem>('/stock/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Stok ürünü güncelle */
  update: (id: number, data: {
    name?: string; category?: string; unit?: string;
    quantity?: number; isMinibar?: boolean; minibarPrice?: number;
  }) =>
    apiClient<StockItem>(`/stock/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Stok ürünü sil */
  delete: (id: number) =>
    apiClient<void>(`/stock/${id}/`, { method: 'DELETE' }),
};

/* ==================== FAULTS (ARIZA) API ==================== */

export const faultsApi = {
  /** Arıza listesi (filtrelenebilir) */
  getAll: (filters?: { status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiClient<Fault[]>(`/faults/${qs ? '?' + qs : ''}`);
  },

  /** Tekil arıza detayı */
  getById: (id: number) =>
    apiClient<Fault>(`/faults/${id}/`),

  /** Yeni arıza oluştur (multipart/form-data) */
  create: (data: {
    room_number: string;
    category: string;
    description: string;
    reported_by?: string;
    photos?: string[];
  }) => {
    const formData = new FormData();
    formData.append('room_number', data.room_number);
    formData.append('category', data.category);
    formData.append('description', data.description);
    if (data.reported_by) formData.append('reported_by', data.reported_by);

    if (data.photos) {
      data.photos.forEach((uri) => {
        formData.append('photos', {
          uri,
          type: 'image/jpeg',
          name: `fault_${Date.now()}.jpg`,
        } as any);
      });
    }

    return apiMultipart<Fault>('/faults/', formData);
  },

  /** Arıza durumunu güncelle */
  updateStatus: (id: number, status: string, resolvedBy?: string) =>
    apiClient<Fault>(`/faults/${id}/status/`, {
      method: 'PATCH',
      body: JSON.stringify({
        status,
        ...(resolvedBy ? { resolved_by: resolvedBy } : {}),
      }),
    }),

  /** Çözüm fotoğrafı yükle */
  uploadResolutionPhotos: (id: number, photoUris: string[]) => {
    const formData = new FormData();
    photoUris.forEach((uri) => {
      formData.append('photos', {
        uri,
        type: 'image/jpeg',
        name: `resolution_${Date.now()}.jpg`,
      } as any);
    });
    return apiMultipart<Fault>(`/faults/${id}/resolution-photos/`, formData);
  },
};

/* ==================== MINIBAR API ==================== */

export const minibarApi = {
  /** Minibar ürünlerini getir (category='minibar' stok ürünleri + takip bilgisi) */
  getProducts: () =>
    apiClient<MinibarProduct[]>('/minibar/products/'),

  /** Bir odanın minibar içeriğini getir */
  getRoomMinibar: (roomId: number) =>
    apiClient<RoomMinibarItem[]>(`/minibar/rooms/${roomId}/`),

  /** Odanın minibarına ürün ekle */
  addToRoom: (roomId: number, data: { productId: number; quantity: number; staffName?: string }) =>
    apiClient<RoomMinibarItem>(`/minibar/rooms/${roomId}/add/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Minibardan ürün çıkar (stoka iade) */
  removeFromRoom: (roomId: number, data: { productId: number; quantity: number }) =>
    apiClient<void>(`/minibar/rooms/${roomId}/remove/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Ürün tüketildi (satıldı) — minibar azalır, folio charge oluşur */
  consume: (roomId: number, data: { productId: number; quantity: number; staffName?: string }) =>
    apiClient<{ folioItem: ApiFolioItem }>(`/minibar/rooms/${roomId}/consume/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};

/* ==================== CAMERA API ==================== */

export interface ApiCamera {
  id: number;
  name: string;
  location: string;
  streamUrl: string;
  snapshotUrl?: string;
  status: 'online' | 'offline';
  type: string;
  order: number;
}

export const cameraApi = {
  /** Tüm kameraları getir */
  getAll: () => apiClient<ApiCamera[]>('/cameras/'),
};

/* ==================== RESTORAN / CAFE ==================== */

/** Hizmet alanları */
export const serviceAreasApi = {
  getAll: () => apiClient<ApiServiceArea[]>('/service-areas/'),
};

/** Masa yönetimi */
export const tablesApi = {
  getAll: (filters?: { serviceAreaId?: number; status?: string }) => {
    const params = new URLSearchParams();
    if (filters?.serviceAreaId) params.append('serviceAreaId', String(filters.serviceAreaId));
    if (filters?.status) params.append('status', filters.status);
    const qs = params.toString();
    return apiClient<ApiTable[]>(`/tables/${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => apiClient<ApiTable>(`/tables/${id}/`),
  open: (id: number, data: { guestName?: string; openedById?: number }) =>
    apiClient<ApiTab>(`/tables/${id}/open/`, { method: 'POST', body: JSON.stringify(data) }),
  addItem: (tableId: number, data: { menuItemId: number; quantity: number; notes?: string; openedById?: number }) =>
    apiClient(`/tables/${tableId}/add_item/`, { method: 'POST', body: JSON.stringify(data) }),
  close: (id: number) =>
    apiClient<ApiTable>(`/tables/${id}/close/`, { method: 'POST' }),
  transfer: (id: number, toTableId: number) =>
    apiClient(`/tables/${id}/transfer/`, { method: 'POST', body: JSON.stringify({ toTableId }) }),
};

/** Adisyon (Tab) yönetimi */
export const tabsApi = {
  getAll: (filters?: { status?: string; roomId?: number; reservationId?: number; servicePoint?: string }) => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.roomId) params.append('roomId', String(filters.roomId));
    if (filters?.reservationId) params.append('reservationId', String(filters.reservationId));
    if (filters?.servicePoint) params.append('servicePoint', filters.servicePoint);
    const qs = params.toString();
    return apiClient<ApiTab[]>(`/tabs/${qs ? '?' + qs : ''}`);
  },
  getById: (id: number) => apiClient<ApiTab>(`/tabs/${id}/`),
  create: (data: { roomId?: number; guestName: string; servicePoint: string; openedById?: number }) =>
    apiClient<ApiTab>('/tabs/', { method: 'POST', body: JSON.stringify(data) }),
  addItem: (tabId: number, data: { menuItemId?: number; description?: string; quantity: number; unitPrice: number; notes?: string }) =>
    apiClient<ApiTabItem>(`/tabs/${tabId}/add_item/`, { method: 'POST', body: JSON.stringify(data) }),
  updateItem: (tabId: number, itemId: number, quantity: number) =>
    apiClient<ApiTabItem>(`/tabs/${tabId}/update_item/`, { method: 'POST', body: JSON.stringify({ itemId, quantity }) }),
  removeItem: (tabId: number, itemId: number) =>
    apiClient(`/tabs/${tabId}/remove_item/`, { method: 'POST', body: JSON.stringify({ itemId }) }),
  close: (tabId: number) =>
    apiClient<ApiTab>(`/tabs/${tabId}/close/`, { method: 'POST' }),
  pay: (tabId: number, paymentMethod: string, registerId?: number, roomId?: number) =>
    apiClient<ApiTab>(`/tabs/${tabId}/pay/`, { method: 'POST', body: JSON.stringify({ paymentMethod, registerId, roomId }) }),
  cancel: (tabId: number) =>
    apiClient<ApiTab>(`/tabs/${tabId}/cancel/`, { method: 'POST' }),
  refund: (tabId: number, reason?: string) =>
    apiClient<ApiTab>(`/tabs/${tabId}/refund/`, { method: 'POST', body: JSON.stringify({ reason }) }),
  split: (tabId: number, itemIds: number[], guestName?: string) =>
    apiClient(`/tabs/${tabId}/split/`, { method: 'POST', body: JSON.stringify({ itemIds, guestName }) }),
};

/** Menü yönetimi */
export const menuApi = {
  getCategories: () => apiClient<ApiMenuCategory[]>('/menu-categories/'),
  getItems: (categoryId?: number) => {
    const qs = categoryId ? `?categoryId=${categoryId}` : '';
    return apiClient<ApiMenuItem[]>(`/menu-items/${qs}`);
  },
};

/* ==================== KOMİSYON API ==================== */

export interface CommissionItem {
  tabNo: string;
  tableNumber: string;
  tabTotal: string;
  commissionRate: string;
  commissionAmount: string;
  date: string;
}

export interface MyCommissionsData {
  totalEarned: string;
  totalSales: string;
  count: number;
  items: CommissionItem[];
}

export const commissionApi = {
  getMy: (staffNumber: string, filters?: { dateFrom?: string; dateTo?: string }) => {
    const params = new URLSearchParams({ staffNumber });
    if (filters?.dateFrom) params.append('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.append('dateTo', filters.dateTo);
    return apiClient<MyCommissionsData>(`/commission/my/?${params.toString()}`);
  },
};
