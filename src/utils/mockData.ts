/**
 * GrandHotel Mobile - Mock Veri ve Yardımcı Fonksiyonlar
 *
 * Oda satış ekranı için örnek misafir, firma verileri ve CRUD yardımcıları.
 * Backend hazır olduğunda bu dosya API çağrılarıyla değiştirilecek.
 */

import { Guest, Company, FolioItem, FolioCategory } from './types';

/* ==================== MOCK MİSAFİRLER ==================== */

let guests: Guest[] = [
  { id: 1, tcNo: '12345678901', firstName: 'Ali', lastName: 'Yılmaz', phone: '05321234567', email: 'ali@email.com', createdAt: '2026-01-15', isBlocked: false },
  { id: 2, tcNo: '23456789012', firstName: 'Ayşe', lastName: 'Demir', phone: '05339876543', email: 'ayse@email.com', createdAt: '2026-01-20', isBlocked: false },
  { id: 3, tcNo: '34567890123', firstName: 'Mehmet', lastName: 'Kaya', phone: '05411112233', createdAt: '2026-02-01', isBlocked: false },
  { id: 4, tcNo: '45678901234', firstName: 'Fatma', lastName: 'Şahin', phone: '05523334455', email: 'fatma@email.com', createdAt: '2026-02-05', isBlocked: false },
  { id: 5, tcNo: '56789012345', firstName: 'Hasan', lastName: 'Çelik', phone: '05365556677', createdAt: '2026-02-10', isBlocked: true },
  { id: 6, tcNo: '67890123456', firstName: 'Zeynep', lastName: 'Arslan', phone: '05427778899', email: 'zeynep@email.com', createdAt: '2026-02-15', isBlocked: false },
  { id: 7, tcNo: '78901234567', firstName: 'Emre', lastName: 'Yıldız', phone: '05538889900', createdAt: '2026-02-20', isBlocked: false },
  { id: 8, tcNo: '89012345678', firstName: 'Deniz', lastName: 'Korkmaz', phone: '05319990011', email: 'deniz@email.com', createdAt: '2026-03-01', isBlocked: false },
  { id: 9, tcNo: '90123456789', firstName: 'Selin', lastName: 'Öztürk', phone: '05442223344', createdAt: '2026-03-05', isBlocked: false },
  { id: 10, tcNo: '01234567890', firstName: 'Burak', lastName: 'Aksoy', phone: '05556667788', email: 'burak@email.com', createdAt: '2026-03-10', isBlocked: false },
];

/* ==================== MOCK FİRMALAR ==================== */

const companies: Company[] = [
  { id: 1, name: 'ABC Turizm Ltd.', taxNo: '1234567890', address: 'İstanbul, Beyoğlu', phone: '02121234567', email: 'info@abcturizm.com' },
  { id: 2, name: 'XYZ Holding A.Ş.', taxNo: '9876543210', address: 'Ankara, Çankaya', phone: '03129876543', email: 'info@xyzholding.com' },
  { id: 3, name: 'Deniz Seyahat', taxNo: '5678901234', address: 'İzmir, Alsancak', phone: '02325678901', email: 'info@denizseyahat.com' },
];

/* ==================== MOCK FOLİO ==================== */

let folios: FolioItem[] = [];
let nextFolioId = 1;

/* ==================== YARDIMCI FONKSİYONLAR ==================== */

/** TC veya isimle misafir ara */
export const searchGuests = (query: string): Guest[] => {
  if (!query.trim()) return guests;
  const q = query.toLowerCase().trim();
  return guests.filter(
    (g) =>
      g.tcNo.includes(q) ||
      g.firstName.toLowerCase().includes(q) ||
      g.lastName.toLowerCase().includes(q) ||
      `${g.firstName} ${g.lastName}`.toLowerCase().includes(q)
  );
};

/** Tüm misafirleri getir */
export const getAllGuests = (): Guest[] => [...guests];

/** Yeni misafir oluştur */
export const addGuestLocal = (data: Omit<Guest, 'id' | 'createdAt' | 'isBlocked'>): Guest => {
  const newGuest: Guest = {
    ...data,
    id: Math.max(0, ...guests.map((g) => g.id)) + 1,
    createdAt: new Date().toISOString().split('T')[0],
    isBlocked: false,
  };
  guests = [...guests, newGuest];
  return newGuest;
};

/** Oda folioları getir */
export const getFoliosForRoom = (roomId: number): FolioItem[] => {
  return folios.filter((f) => f.roomId === roomId);
};

/** Folio ekle */
export const addFolioLocal = (data: Omit<FolioItem, 'id' | 'date'>): FolioItem => {
  const newFolio: FolioItem = {
    ...data,
    id: nextFolioId++,
    date: new Date().toISOString(),
  };
  folios = [...folios, newFolio];
  return newFolio;
};

/** Folio sil */
export const deleteFolioLocal = (folioId: number): void => {
  folios = folios.filter((f) => f.id !== folioId);
};

/** Oda folioları temizle (check-out sonrası) */
export const clearFoliosForRoom = (roomId: number): void => {
  folios = folios.filter((f) => f.roomId !== roomId);
};

/** Tüm firmaları getir */
export const getAllCompanies = (): Company[] => [...companies];
