/**
 * NotificationContext — Global bildirim sistemi
 *
 * Tüm WebSocket olaylarını dinler ve sesli bildirim çalar.
 * MainTabs içinde sarmalanır — kullanıcı giriş yaptıktan sonra aktif olur.
 *
 * Dinlenen olaylar:
 *   - Restoran: yeni sipariş, sipariş hazır, masa güncellemesi
 *   - Oda: oda durumu değişikliği
 */

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
import useRestaurantWebSocket from '../hooks/useRestaurantWebSocket';
import useRoomWebSocket from '../hooks/useRoomWebSocket';
import useAudioNotification from '../hooks/useAudioNotification';
import type { NotificationSound } from '../hooks/useAudioNotification';
import useAuth from '../hooks/useAuth';

interface NotificationContextType {
  playSound: (type: NotificationSound) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  playSound: () => {},
});

export const useNotification = () => useContext(NotificationContext);

interface Props {
  children: ReactNode;
}

export const NotificationProvider: React.FC<Props> = ({ children }) => {
  const { user } = useAuth();
  const { play } = useAudioNotification();

  // Kullanıcının rolüne göre hangi sesleri duyacağını belirle
  const roles = user?.roles || [];
  const isKitchenStaff = roles.some(r => ['chef', 'restaurant_manager'].includes(r));
  const isServiceStaff = roles.some(r => ['waiter', 'barista', 'barman', 'cashier', 'restaurant_manager'].includes(r));
  const isReceptionStaff = roles.some(r => ['reception', 'reception_manager', 'lobby'].includes(r));
  const isManager = roles.some(r => ['patron', 'manager'].includes(r));

  // Restoran WebSocket — mutfak + servis olayları
  useRestaurantWebSocket({
    groups: ['kitchen', 'tables', 'cashier'],
    enabled: isKitchenStaff || isServiceStaff || isManager,
    onNewOrder: useCallback(() => {
      // Aşçı/restoran müdürü → yeni sipariş sesi
      if (isKitchenStaff || isManager) {
        play('new_order');
      }
    }, [isKitchenStaff, isManager, play]),
    onOrderStatusUpdate: useCallback((order) => {
      // Garson/kasiyer → sipariş hazır sesi
      if ((isServiceStaff || isManager) && order.status === 'ready') {
        play('order_ready');
      }
    }, [isServiceStaff, isManager, play]),
  });

  // Oda WebSocket — resepsiyon olayları
  useRoomWebSocket({
    enabled: isReceptionStaff || isManager,
    onRoomUpdate: useCallback(() => {
      // Oda durumu değiştiğinde hafif bildirim
      if (isReceptionStaff || isManager) {
        play('notification');
      }
    }, [isReceptionStaff, isManager, play]),
  });

  const value = { playSound: play };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export default NotificationContext;
