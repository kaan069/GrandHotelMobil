/**
 * AuthContext - Kimlik Doğrulama Bağlamı
 *
 * Kullanıcı oturum bilgisini uygulama genelinde sağlar.
 * Giriş: şube kodu + personel numarası + şifre
 *
 * Not: Şimdilik mock veri ile çalışır, backend hazır olunca API'ye geçilecek.
 */

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ROLES, Role } from '../utils/constants';

export interface User {
  id: number;
  name: string;
  role: Role;
  branchCode: string;
  staffNumber: string;
  hireDate: string;
}

export interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (branchCode: string, staffNumber: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
}

interface MockUser extends User {
  password: string;
}

export const AuthContext = createContext<AuthContextType | null>(null);

/** Mock personel verileri (test için) */
const MOCK_USERS: readonly MockUser[] = [
  { id: 1, name: 'Ahmet Yılmaz', role: ROLES.PATRON, branchCode: '001', staffNumber: '1001', password: '1234', hireDate: '2019-01-10' },
  { id: 2, name: 'Mehmet Demir', role: ROLES.MANAGER, branchCode: '001', staffNumber: '1002', password: '1234', hireDate: '2022-03-15' },
  { id: 3, name: 'Ayşe Kaya', role: ROLES.RECEPTION, branchCode: '001', staffNumber: '1003', password: '1234', hireDate: '2023-06-01' },
  { id: 4, name: 'Fatma Çelik', role: ROLES.WAITER, branchCode: '001', staffNumber: '1004', password: '1234', hireDate: '2024-01-10' },
  { id: 5, name: 'Hasan Şahin', role: ROLES.CHEF, branchCode: '001', staffNumber: '1005', password: '1234', hireDate: '2021-09-20' },
  { id: 6, name: 'Ali Öztürk', role: ROLES.TECHNICIAN, branchCode: '001', staffNumber: '1006', password: '1234', hireDate: '2023-02-14' },
  { id: 7, name: 'Zeynep Arslan', role: ROLES.HOUSEKEEPER, branchCode: '001', staffNumber: '1007', password: '1234', hireDate: '2024-05-01' },
];

const STORAGE_KEY = 'grandhotel_mobile_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Giriş yap
   * @param {string} branchCode - Şube kodu
   * @param {string} staffNumber - Personel numarası
   * @param {string} password - Şifre
   */
  const login = useCallback(async (branchCode: string, staffNumber: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      /* Mock doğrulama - backend hazır olunca API çağrısı yapılacak */
      const found = MOCK_USERS.find(
        (u) =>
          u.branchCode === branchCode &&
          u.staffNumber === staffNumber &&
          u.password === password
      );

      if (!found) {
        throw new Error('Şube kodu, personel numarası veya şifre hatalı');
      }

      const userData: User = {
        id: found.id,
        name: found.name,
        role: found.role,
        branchCode: found.branchCode,
        staffNumber: found.staffNumber,
        hireDate: found.hireDate,
      };

      setUser(userData);
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(userData));
      } catch {
        /* Storage kullanılamıyorsa oturum sadece bellekte tutulur */
      }
      return userData;
    } finally {
      setLoading(false);
    }
  }, []);

  /** Çıkış yap */
  const logout = useCallback(async (): Promise<void> => {
    setUser(null);
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Storage kullanılamıyorsa sessizce geç */
    }
  }, []);

  /** Kayıtlı oturumu yükle (uygulama açılışında) */
  const loadSession = useCallback(async (): Promise<void> => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved) as User);
      }
    } catch (e) {
      /* Hata varsa sessizce geç */
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        login,
        logout,
        loadSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
