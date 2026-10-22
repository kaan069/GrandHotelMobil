/**
 * Rol grupları ve yetki yardımcıları — backend apps/staff/permissions.py ile aynı gruplar
 *
 * Ekranlar buton/menü gizlemek için kullanır; asıl kontrol backend'dedir.
 * Kullanıcının TÜM rolleri dikkate alınır (backend de böyle kontrol eder):
 * birincil rolü garson olup ek olarak resepsiyon rolü olan personel ön büro işlemi yapabilir.
 */

import { ROLES } from './constants';

type RoleHolder = { role?: string; roles?: string[] } | null | undefined;
type ModuleHolder = { enabledModules?: string[] } | null | undefined;

export const ADMIN_ROLES: readonly string[] = [ROLES.PATRON, ROLES.MANAGER];
export const FRONT_OFFICE_ROLES: readonly string[] = [...ADMIN_ROLES, ROLES.RECEPTION, ROLES.RECEPTION_MANAGER];
export const ACCOUNTING_ROLES: readonly string[] = [...ADMIN_ROLES, ROLES.ACCOUNTANT, ROLES.ACCOUNTING_MANAGER];
/** Ciro/doluluk raporları, cari hesaplar, faturalar: ön büro + muhasebe */
export const REPORT_ROLES: readonly string[] = Array.from(new Set([...FRONT_OFFICE_ROLES, ...ACCOUNTING_ROLES]));
export const COMMISSION_VIEW_ROLES: readonly string[] = [
  ...ADMIN_ROLES, ROLES.RESTAURANT_MANAGER, ROLES.ACCOUNTANT, ROLES.ACCOUNTING_MANAGER,
];

/** Kullanıcının rollerinden biri listede mi? */
export function hasAnyRole(user: RoleHolder, roles: readonly string[]): boolean {
  const userRoles = user?.roles?.length ? user.roles : user?.role ? [user.role] : [];
  return userRoles.some((r) => roles.includes(r));
}

export const isAdmin = (user: RoleHolder) => hasAnyRole(user, ADMIN_ROLES);
export const isFrontOffice = (user: RoleHolder) => hasAnyRole(user, FRONT_OFFICE_ROLES);

/** Otelde modül açık mı? (kapalı modülün API'si 403 döner) */
export function isModuleEnabled(user: ModuleHolder, moduleId: string): boolean {
  return !!user?.enabledModules?.includes(moduleId);
}
