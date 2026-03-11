/**
 * GrandHotel Mobile - Renk Paleti
 *
 * Tüm renkler buradan yönetilir.
 * Web uygulamasıyla uyumlu renk şeması kullanılır.
 */

const colors = {
  /* Ana renkler */
  primary: '#1565C0',
  primaryLight: '#42A5F5',
  primaryDark: '#0D47A1',

  secondary: '#F59E0B',
  secondaryLight: '#FCD34D',

  /* Durum renkleri */
  success: '#22C55E',
  error: '#EF4444',
  warning: '#F97316',
  info: '#3B82F6',

  /* Metin renkleri */
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textWhite: '#FFFFFF',

  /* Arka plan renkleri */
  background: '#F5F5F5',
  surface: '#FFFFFF',
  card: '#FFFFFF',

  /* Kenarlık */
  border: '#E2E8F0',
  divider: '#F1F5F9',

  /* Özel renkler */
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.08)',

  /* Tab bar */
  tabActive: '#1565C0',
  tabInactive: '#94A3B8',
  tabBg: '#FFFFFF',

  /* QR butonu */
  qrButton: '#1565C0',
  qrButtonShadow: 'rgba(21, 101, 192, 0.3)',
} as const;

export type Colors = typeof colors;

export default colors;
