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
import { getWsUrl } from '../utils/constants';
import { refreshAccessToken } from '../services/api';
import type { ApiRoom } from '../utils/types';

/** Backend: token yok/geçersiz (apps/staff/ws_auth.py) → token yenile, tekrar bağlan */
const WS_CLOSE_UNAUTHORIZED = 4401;

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

    // Kimlik: access JWT — backend oteli token'dan okur
    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
    const token = await AsyncStorage.getItem('grandhotel_mobile_token');
    if (!token) {
      console.warn('[WS] token yok, bağlantı atlandı');
      return;
    }
    // URL her bağlantıda yeniden üretilir (sunucu değişmiş olabilir)
    const url = `${getWsUrl('/ws/rooms/')}?token=${encodeURIComponent(token)}`;

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
