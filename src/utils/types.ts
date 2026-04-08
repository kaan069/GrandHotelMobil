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

/* ==================== STOK ==================== */

/** Backend GET /api/stock/ response'undaki tek stok ürünü */
export interface StockItem {
  id: number;
  name: string;
  category: string;
  unit: string;
  quantity: number;
  isMinibar: boolean;
  minibarPrice: string | null;
  createdAt: string;
}

/* ==================== MİNİBAR ==================== */

/** Minibar ürünü (isMinibar=true olan stok ürünleri + takip bilgisi) */
export interface MinibarProduct {
  id: number;
  name: string;
  price: number;
  unit: string;
  totalStock: number;
  inMinibar: number;
  sold: number;
  availableStock: number;
}

/** Odadaki minibar kalemi */
export interface RoomMinibarItem {
  id: number;
  roomId: number;
  roomNumber: string;
  productId: number;
  productName: string;
  quantity: number;
  price: number;
  placedBy: string;
  placedAt: string;
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
  agreedRate?: string | number | null;
}

/* ==================== RESTORAN / CAFE ==================== */

/** Hizmet alanı (restoran, cafe, bar, havuz bar) */
export interface ApiServiceArea {
  id: number;
  name: string;
  areaType: string;
  isActive: boolean;
  hasKitchen: boolean;
  tableCount: number;
}

/** Restoran/cafe masası */
export interface ApiTable {
  id: number;
  tableNumber: string;
  serviceAreaId: number;
  serviceAreaName: string;
  capacity: number;
  status: string;
  isActive: boolean;
  qrToken: string;
  currentTabId: number | null;
  currentTotal: string;
  currentTab?: ApiTab;
}

/** Adisyon */
export interface ApiTab {
  id: number;
  tabNo: string;
  reservationId: number | null;
  roomId: number | null;
  roomNumber: string | null;
  tableId: number | null;
  tableNumber: string | null;
  guestName: string;
  servicePoint: string;
  status: string;
  openedByName: string | null;
  totalAmount: string;
  paymentMethod: string | null;
  notes: string;
  openedAt: string;
  closedAt: string | null;
  paidAt: string | null;
  items?: ApiTabItem[];
}

/** Adisyon kalemi */
export interface ApiTabItem {
  id: number;
  menuItemId: number | null;
  menuItemName: string | null;
  description: string;
  quantity: number;
  unitPrice: string;
  totalPrice: string;
  createdAt: string;
}

/** Menü kategorisi */
export interface ApiMenuCategory {
  id: number;
  name: string;
  sortOrder: number;
  isActive: boolean;
  itemCount?: number;
}

/** Menü ürünü */
export interface ApiMenuItem {
  id: number;
  categoryId: number;
  name: string;
  description: string;
  price: string;
  imageUrl: string | null;
  isAvailable: boolean;
  sortOrder: number;
}
