/**
 * useRoomWebSocket — Gerçek zamanlı oda durumu güncellemeleri (Mobile)
 *
 * Web versiyonuyla aynı mantık + mobil'e özel:
 *   - AppState listener: Uygulama arka plandan döndüğünde reconnect yapar
 *   - React Native'in native WebSocket API'sini kullanır
 *
 * Kullanım:
 *   useRoomWebSocket({
 *     onRoomUpdate: (room) => {
 *       setRooms(prev => prev.map(r => r.id === room.id ? room : r));
 *     },
 *   });
 */

import { useEffect, useRef, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { API_BASE_URL } from '../utils/constants';
import type { ApiRoom } from '../utils/types';

/**
 * WebSocket URL'ini API URL'inden türet.
 * http://localhost:8000/api → ws://localhost:8000/ws/rooms/
 * Bu sayede fiziksel cihazda IP değişikliği tek yerden yapılır.
 */
const WS_URL = API_BASE_URL.replace(/\/api$/, '').replace('http', 'ws') + '/ws/rooms/';

interface UseRoomWebSocketOptions {
  onRoomUpdate: (room: ApiRoom) => void;
  enabled?: boolean;
}

export default function useRoomWebSocket({ onRoomUpdate, enabled = true }: UseRoomWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>();
  const onRoomUpdateRef = useRef(onRoomUpdate);
  onRoomUpdateRef.current = onRoomUpdate;

  const connect = useCallback(async () => {
    if (!enabled) return;

    // Multi-tenant: hotel_id query param zorunlu (backend reddediyor)
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const hotelId = await AsyncStorage.getItem('grandhotel_mobile_hotel_id');
    if (!hotelId) {
      console.warn('[WS] hotel_id yok, bağlantı atlandı');
      return;
    }
    const url = `${WS_URL}?hotel_id=${encodeURIComponent(hotelId)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[WS] Bağlandı');
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'room_update' && data.room) {
          onRoomUpdateRef.current(data.room);
        }
      } catch (err) {
        console.error('[WS] Parse hatası:', err);
      }
    };

    ws.onclose = () => {
      reconnectTimer.current = setTimeout(connect, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [enabled]);

  useEffect(() => {
    connect();

    /**
     * Mobil'e özel: Uygulama arka plandan öne geldiğinde
     * WebSocket bağlantısı kopmuş olabilir. Tekrar bağlan.
     *
     * AppState durumları:
     *   'active'     → Uygulama ön planda (kullanıcı görüyor)
     *   'background' → Uygulama arka planda
     *   'inactive'   → Geçiş durumu (iOS'ta kısa süre)
     */
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
