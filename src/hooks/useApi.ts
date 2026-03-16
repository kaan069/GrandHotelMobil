/**
 * useApi Hook — Generic API veri çekme hook'u
 *
 * Kullanım:
 *   const { data, loading, error, refetch } = useApi(() => roomsApi.getAll());
 *
 * Ne yapar:
 *   1. Component mount olduğunda fetcher fonksiyonunu çağırır
 *   2. loading / error / data state'lerini yönetir
 *   3. refetch() ile tekrar çekilebilir (pull-to-refresh için)
 *
 * Generic <T>:
 *   useApi<ApiRoom[]>(() => roomsApi.getAll())
 *   → data: ApiRoom[] | null olarak dönüş tipi belirlenir
 */

import { useState, useEffect, useCallback } from 'react';

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function useApi<T>(fetcher: () => Promise<T>): UseApiResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, []);

  return { data, loading, error, refetch };
}

export default useApi;
