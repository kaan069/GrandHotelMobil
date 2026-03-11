/**
 * GrandHotel Mobile - Aralık ve Boyut Sabitleri
 */

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const fontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  title: 28,
} as const;

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

export type Spacing = typeof spacing;
export type FontSize = typeof fontSize;
export type BorderRadius = typeof borderRadius;

export default spacing;
