/**
 * useRestaurantWebSocket — Restoran gerçek zamanlı güncellemeleri (Mobile)
 *
 * Backend'deki /ws/restaurant/?token=<JWT> adresine bağlanır (otel token'dan okunur).
 * Yeni sipariş, durum değişikliği, masa ve kasa güncellemelerini dinler.
 *
 * Mobil'e özel:
 *   - AppState listener: Arka plandan döndüğünde reconnect
 *   - React Native native WebSocket API
 *
 * Kullanım:
 *   useRestaurantWebSocket({
 *     onNewOrder: (order) => { ... },
 *     onTableUpdate: (table) => { ... },
 *     groups: ['kitchen', 'tables'],
 *   });
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getWsUrl } from '../utils/constants';
import { refreshAccessToken } from '../services/api';
import type { ApiOrderItemStatus } from '../services/api';
import type { ApiTable } from '../utils/types';

/** Backend: token yok/geçersiz (apps/staff/ws_auth.py) → token yenile, tekrar bağlan */
const WS_CLOSE_UNAUTHORIZED = 4401;

/**
 * WS sipariş verisi — backend REST ile aynı OrderItemStatusSerializer çıktısını
 * yayınlar (apps/restaurant/broadcast.py), bu yüzden tip de aynıdır.
 */
type OrderData = ApiOrderItemStatus;

interface UseRestaurantWebSocketOptions {
  onNewOrder?: (order: OrderData) => void;
  onOrderStatusUpdate?: (order: OrderData) => void;
  onTableUpdate?: (table: ApiTable) => void;
  onCashierUpdate?: (data: Record<string, unknown>) => void;
  groups?: string[];
  enabled?: boolean;
}

export default function useRestaurantWebSocket({
  onNewOrder,
  onOrderStatusUpdate,
  onTableUpdate,
  onCashierUpdate,
  groups,
  enabled = true,
}: UseRestaurantWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();

  const onNewOrderRef = useRef(onNewOrder);
  const onOrderStatusUpdateRef = useRef(onOrderStatusUpdate);
  const onTableUpdateRef = useRef(onTableUpdate);
  const onCashierUpdateRef = useRef(onCashierUpdate);

  onNewOrderRef.current = onNewOrder;
  onOrderStatusUpdateRef.current = onOrderStatusUpdate;
  onTableUpdateRef.current = onTableUpdate;
  onCashierUpdateRef.current = onCashierUpdate;

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Kimlik: access JWT — backend oteli token'dan okur
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('grandhotel_mobile_token');
    if (!token) {
      console.warn('[WS Restaurant] token yok, bağlantı atlandı');
      return;
    }
    const params = new URLSearchParams({ token });
    if (groups && groups.length > 0) {
      params.set('groups', groups.join(','));
    }
    // URL her bağlantıda yeniden üretilir (sunucu değişmiş olabilir)
    const url = `${getWsUrl('/ws/restaurant/')}?${params.toString()}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS Restaurant] Bağlandı');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        switch (data.type) {
          case 'new_order':
            onNewOrderRef.current?.(data.order);
            break;
          case 'order_status_update':
            onOrderStatusUpdateRef.current?.(data.order);
            break;
          case 'table_update':
            onTableUpdateRef.current?.(data.table);
            break;
          case 'cashier_update':
            onCashierUpdateRef.current?.(data.data);
            break;
        }
      } catch (err) {
        console.error('[WS Restaurant] Parse hatası:', err);
      }
    };

    ws.onclose = (event) => {
      if (event.code === WS_CLOSE_UNAUTHORIZED) {
        refreshAccessToken().then((ok) => {
          reconnectTimer.current = setTimeout(connect, ok ? 0 : 30000);
        });
        return;
      }
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled, groups]);

  useEffect(() => {
    connect();

    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active' && (!wsRef.current || wsRef.current.readyState === WebSocket.CLOSED)) {
        connect();
      }
    });

    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
      subscription.remove();
    };
  }, [connect]);
}
