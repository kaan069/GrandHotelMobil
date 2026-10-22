/**
 * deferAlert — Modal kapanırken gösterilecek bilgi mesajı
 *
 * iOS'ta Alert en üstteki ekrana (açık Modal'a) bağlanır; Modal hemen ardından
 * kapanırsa Alert de onunla birlikte kaybolur. Modal'ın kapanma animasyonu
 * bittikten sonra göstermek için kısa bir gecikmeyle açılır.
 */

import { Alert } from 'react-native';

const MODAL_DISMISS_MS = 400;

export function deferAlert(title: string, message?: string): void {
  setTimeout(() => Alert.alert(title, message), MODAL_DISMISS_MS);
}
