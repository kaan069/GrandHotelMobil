/**
 * folio.ts — Folio kategori grupları ve bakiye hesabı için tek doğruluk kaynağı.
 *
 * Backend `apps/stays/models.py` ile birebir uyumlu.
 * Web tarafındaki `/web/src/utils/folio.ts` ile aynı semantiği taşır.
 */

export const PAYMENT_LIKE_CATEGORIES = new Set([
  'payment',
  'account_transfer_debit',
]);

export const DEDUCTION_CATEGORIES = new Set([
  'discount',
  'account_transfer_credit',
]);

export interface FolioItemLike {
  category: string;
  amount: number | string;
}

export interface FolioTotals {
  charges: number;
  discounts: number;
  payments: number;
  /** total = charges - discounts. Müşterinin toplam borcu. */
  total: number;
  /** balance = total - payments. >0 müşteri borçlu, <0 otel borçlu (iade). */
  balance: number;
}

const toNumber = (v: number | string | undefined): number => {
  if (v == null) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return isNaN(n) ? 0 : n;
};

export const calcFolioTotals = (items: FolioItemLike[]): FolioTotals => {
  let charges = 0;
  let discounts = 0;
  let payments = 0;
  for (const item of items) {
    const amount = toNumber(item.amount);
    if (PAYMENT_LIKE_CATEGORIES.has(item.category)) {
      payments += amount;
    } else if (DEDUCTION_CATEGORIES.has(item.category)) {
      discounts += amount;
    } else {
      charges += amount;
    }
  }
  const total = charges - discounts;
  return {
    charges,
    discounts,
    payments,
    total,
    balance: total - payments,
  };
};

export const isFolioDeductionRow = (category: string): boolean => {
  return PAYMENT_LIKE_CATEGORIES.has(category) || DEDUCTION_CATEGORIES.has(category);
};

/** Otel kuralı: aynı gün → 1 gece, sonrası gün farkı. */
export const calcNightsCount = (checkInISO: string, until?: Date): number => {
  if (!checkInISO) return 0;
  const ci = new Date(checkInISO);
  const end = until || new Date();
  const ciDate = new Date(ci.getFullYear(), ci.getMonth(), ci.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  const ms = endDate.getTime() - ciDate.getTime();
  const days = Math.floor(ms / (1000 * 60 * 60 * 24));
  return Math.max(1, days || 1);
};
