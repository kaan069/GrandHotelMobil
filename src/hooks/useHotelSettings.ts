/**
 * useHotelSettings — Otel ayarlarını (check-in policy vb.) sunucudan çekip cache'ler.
 *
 * Kullanım:
 *   const { settings, loading, refresh } = useHotelSettings();
 *   if (settings?.requirePaymentAtCheckin) { ... }
 *
 * Tek tek mount eden ekranlar arasında paylaşılan tek bir cache yok — şu an her hook
 * instance kendi fetch'ini yapar. İhtiyaç halinde Context'e taşınabilir.
 */

import { useState, useEffect, useCallback } from 'react';
import { hotelApi, HotelSettings } from '../services/api';

export const useHotelSettings = () => {
  const [settings, setSettings] = useState<HotelSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await hotelApi.get();
      setSettings(data);
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, loading, refresh: fetchSettings };
};

export default useHotelSettings;
