/**
 * GrandHotel Mobile — Paylaşılan Tip Tanımları
 *
 * Backend API response'larına uygun TypeScript interface'leri.
 * Tüm API çağrıları bu tipleri kullanır.
 */

/* ==================== MİSAFİR ==================== */

/** Backend GET /api/guests/ response'undaki tek misafir */
export interface Guest {
  id: number;
  tcNo: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string | null;
  companyId?: number | null;
  isBlocked?: boolean;
  createdAt?: string;
}

/* ==================== ODA ==================== */

/** Backend GET /api/rooms/ response'undaki tek oda */
export interface ApiRoom {
  id: number;
  roomNumber: string;
  bedType: string;
  floor: number;
  capacity: number;
  view: string;
  price: string;          // DecimalField string döner: "1500.00"
  status: string;
  guestName: string | null;
  guests: ApiRoomGuest[];
  reservationId: number | null;
  reservationNotes: string | null;
  reservationCheckIn: string | null;
  reservationCheckOut: string | null;
  reservationStaffName: string | null;
  reservationStatus: string | null;
  reservationOwnerName: string | null;
  notes: string | null;
}

/** Oda içindeki aktif misafir bilgisi (RoomSerializer.get_guests) */
export interface ApiRoomGuest {
  guestId: number;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string | null;
  isActive: boolean;
}

/** Eski uyumluluk — bazı component'ler bu basit tipi kullanıyor */
export interface RoomGuest {
  guestId: number;
  guestName: string;
  phone?: string;
}

/* ==================== REZERVASYON ==================== */

/** Backend GET /api/reservations/ response'undaki tek rezervasyon (özet) */
export interface Reservation {
  id: number;
  roomId: number;
  roomNumber: string;
  companyId: number | null;
  companyName: string | null;
  checkIn: string;
  checkOut: string | null;
  plannedCheckIn: string | null;
  plannedCheckOut: string | null;
  guestNames: string | null;
  guestCount: number;
  status: string;
  notes: string;
  totalAmount: string;
  paidAmount: string;
  isActive: boolean;
  createdByStaff: string | null;
}

/** Backend GET /api/reservations/{id}/ response (detay — stays + folios dahil) */
export interface ReservationDetail extends Reservation {
  stays: Stay[];
  folioItems: ApiFolioItem[];
}

/** Bir rezervasyondaki misafir giriş/çıkış kaydı */
export interface Stay {
  id: number;
  guestId: number;
  guestName: string;
  phone: string;
  checkIn: string;
  checkOut: string | null;
  isActive: boolean;
}

/* ==================== FOLİO ==================== */

export type FolioCategory =
  | 'room_charge'
  | 'minibar'
  | 'restaurant'
  | 'service'
  | 'discount'
  | 'payment';

/** Backend GET /api/folios/ response'undaki tek hesap kalemi */
export interface ApiFolioItem {
  id: number;
  reservationId: number;
  guestId?: number | null;
  category: FolioCategory;
  description: string;
  amount: number | string;  // DecimalField string dönebilir
  date: string;
  createdBy?: string | null;
}

/* ==================== FİRMA ==================== */

/** Backend GET /api/companies/ response'undaki tek firma */
export interface Company {
  id: number;
  name: string;
  taxNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
}
