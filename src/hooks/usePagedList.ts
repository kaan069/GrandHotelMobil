/**
 * usePagedList — sonsuz kaydırmalı sayfalı liste
 *
 * Backend listeleri ?page=&pageSize= ile sayfalı döner (config/pagination.py → Paginated<T>).
 * İlk sayfa açılışta / filtre (deps) değişince yüklenir; FlatList onEndReached → loadMore()
 * sonraki sayfayı ekler; refresh() aşağı çekip yenileme içindir. Filtre hızlı değişirse
 * eski isteklerin geç gelen yanıtları yok sayılır.
 *
 * Kullanım:
 *   const list = usePagedList((page, pageSize) => reservationsApi.getPage({ page, pageSize, search }), [search]);
 *   <FlatList data={list.items} onEndReached={list.loadMore} onEndReachedThreshold={0.4}
 *     refreshing={list.refreshing} onRefresh={list.refresh} ... />
 * Web karşılığı: grandhotel-web/src/hooks/useServerTable.ts
 */

import { useCallback, useEffect, useRef, useState, type DependencyList } from 'react';

import type { Paginated } from '../services/api';

const DEFAULT_PAGE_SIZE = 25;

export default function usePagedList<T>(
  fetchPage: (page: number, pageSize: number) => Promise<Paginated<T>>,
  deps: DependencyList,
  pageSize: number = DEFAULT_PAGE_SIZE,
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);
  const fetchRef = useRef(fetchPage);
  fetchRef.current = fetchPage;

  /** İlk sayfayı yükle (liste baştan) */
  const loadFirst = useCallback(async (asRefresh: boolean) => {
    const id = ++requestId.current;
    if (asRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetchRef.current(1, pageSize);
      if (id !== requestId.current) return;
      setItems(res.results);
      setTotal(res.count);
      setPage(1);
      setHasMore(!!res.next);
    } catch (err) {
      if (id !== requestId.current) return;
      setError((err as Error).message || 'Liste yüklenemedi');
    } finally {
      if (id === requestId.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [pageSize]);

  useEffect(() => {
    loadFirst(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadFirst, ...deps]);

  const refresh = useCallback(() => loadFirst(true), [loadFirst]);

  /** Sonraki sayfayı ekle (liste sonuna gelindiğinde) */
  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || loading || refreshing) return;
    const id = requestId.current;
    setLoadingMore(true);
    try {
      const res = await fetchRef.current(page + 1, pageSize);
      if (id !== requestId.current) return;  // bu arada filtre değişti / yenilendi
      setItems((prev) => [...prev, ...res.results]);
      setTotal(res.count);
      setPage(page + 1);
      setHasMore(!!res.next);
    } catch (err) {
      if (id === requestId.current) setError((err as Error).message || 'Liste yüklenemedi');
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, loading, refreshing, page, pageSize]);

  return { items, setItems, total, hasMore, loading, loadingMore, refreshing, error, refresh, loadMore };
}
