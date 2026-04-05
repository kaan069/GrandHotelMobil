/**
 * useAudioNotification — Bildirim hook'u
 *
 * Titreşim ile bildirim verir.
 * Farklı olay tipleri için farklı titreşim desenleri.
 *
 * Not: Ses desteği development build gerektirir (expo-av).
 * Expo Go'da sadece titreşim çalışır.
 */

import { useCallback } from 'react';
import { Vibration, Platform } from 'react-native';

export type NotificationSound =
  | 'new_order'
  | 'order_ready'
  | 'task_assigned'
  | 'fault_alert'
  | 'notification';

// Titreşim desenleri (ms) — [bekleme, titreşim, bekleme, titreşim, ...]
const VIBRATION_PATTERNS: Record<NotificationSound, number[]> = {
  new_order: Platform.OS === 'android' ? [0, 300, 100, 300, 100, 300] : [0, 300, 100, 300],
  order_ready: Platform.OS === 'android' ? [0, 200, 100, 200] : [0, 200],
  task_assigned: Platform.OS === 'android' ? [0, 150, 100, 150] : [0, 150],
  fault_alert: Platform.OS === 'android' ? [0, 500, 200, 500] : [0, 500],
  notification: Platform.OS === 'android' ? [0, 100] : [0, 100],
};

export default function useAudioNotification() {
  const play = useCallback((type: NotificationSound = 'notification') => {
    try {
      const pattern = VIBRATION_PATTERNS[type];
      Vibration.vibrate(pattern);
    } catch {
      // Titreşim desteklenmiyorsa sessizce geç
    }
  }, []);

  return { play };
}
