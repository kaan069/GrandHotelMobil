/**
 * useRestaurantWebSocket — Restoran gerçek zamanlı güncellemeleri (Mobile)
 *
 * Backend'deki ws://localhost:8000/ws/restaurant/ adresine bağlanır.
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
import { API_BASE_URL } from '../utils/constants';
import type { ApiTable } from '../utils/types';

const WS_BASE = API_BASE_URL.replace(/\/api$/, '').replace('http', 'ws') + '/ws/restaurant/';

interface OrderData {
  id: number;
  tabItemId: number;
  itemDescription: string;
  itemQuantity: number;
  tabId: number;
  tabNo: string;
  tableNumber: string | null;
  roomNumber: string | null;
  servicePoint: string;
  guestName: string;
  status: string;
  notes: string;
  sentToKitchenAt: string;
  [key: string]: unknown;
}

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

    // Multi-tenant: hotel_id query param zorunlu (backend reddediyor)
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const hotelId = await AsyncStorage.getItem('grandhotel_mobile_hotel_id');
    if (!hotelId) {
      console.warn('[WS Restaurant] hotel_id yok, bağlantı atlandı');
      return;
    }
    const params = new URLSearchParams({ hotel_id: hotelId });
    if (groups && groups.length > 0) {
      params.set('groups', groups.join(','));
    }
    const url = `${WS_BASE}?${params.toString()}`;

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

    ws.onclose = () => {
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
