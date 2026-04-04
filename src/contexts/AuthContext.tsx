/**
 * AuthContext - Kimlik Doğrulama Bağlamı
 *
 * Kullanıcı oturum bilgisini uygulama genelinde sağlar.
 * Giriş: şube kodu + personel numarası + şifre
 * Backend API: POST /api/staff/login/
 */

import React, { createContext, useState, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Role } from '../utils/constants';
import { staffApi } from '../services/api';

export interface User {
  id: number;
  name: string;
  role: Role;
  roles: string[];
  enabledModules: string[];
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

export const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'grandhotel_mobile_user';

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  /** Backend API ile giriş yap */
  const login = useCallback(async (_branchCode: string, staffNumber: string, password: string): Promise<User> => {
    setLoading(true);
    try {
      const employee = await staffApi.login({ staffNumber, password });

      const primaryRole = (employee.roles && employee.roles.length > 0
        ? employee.roles[0]
        : 'reception') as Role;

      const userData: User = {
        id: employee.id,
        name: employee.fullName,
        role: primaryRole,
        roles: employee.roles || [],
        enabledModules: employee.enabledModules || ['base'],
        branchCode: '001',
        staffNumber: employee.staffNumber,
        hireDate: employee.hireDate,
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

  /** Kaydedilmiş oturumu yükle */
  const loadSession = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved) {
        setUser(JSON.parse(saved));
      }
    } catch {
      /* Hata durumunda oturumsuz devam et */
    } finally {
      setLoading(false);
    }
  }, []);

  const value: AuthContextType = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    loadSession,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
