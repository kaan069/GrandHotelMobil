/**
 * GrandHotel Mobile - Paylaşılan Tip Tanımları
 *
 * Oda detay/satış ekranında kullanılan ortak tipler.
 */

/* ==================== MİSAFİR ==================== */

export interface Guest {
  id: number;
  tcNo: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  companyId?: number;
  createdAt: string;
  isBlocked?: boolean;
}

export interface RoomGuest {
  guestId: number;
  guestName: string;
  phone?: string;
}

/* ==================== FOLİO ==================== */

export type FolioCategory =
  | 'room_charge'
  | 'minibar'
  | 'restaurant'
  | 'service'
  | 'discount'
  | 'payment';

export interface FolioItem {
  id: number;
  roomId: number;
  guestId?: number;
  category: FolioCategory;
  description: string;
  amount: number;
  date: string;
  createdBy?: string;
  paymentMethod?: string;
}

/* ==================== FİRMA ==================== */

export interface Company {
  id: number;
  name: string;
  taxNo: string;
  address: string;
  phone: string;
  email: string;
}
