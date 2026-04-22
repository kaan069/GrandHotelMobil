/**
 * pollInvoiceStatus — Paraşüt fatura durum polling helper'ı (mobil).
 *
 * Backend /api/invoices/{id}/send/ async job başlatıyor.
 * Bu helper check-status endpoint'ini aralıklı çağırıp completed/failed olana kadar bekler.
 */

import { invoicesApi, type ApiInvoice } from '../services/api';

export type PollOutcome =
  | { status: 'completed'; invoice: ApiInvoice }
  | { status: 'failed'; invoice: ApiInvoice }
  | { status: 'timeout'; invoice: ApiInvoice | null };

export interface PollOptions {
  intervalMs?: number;
  timeoutMs?: number;
}

export async function pollInvoiceStatus(
  invoiceId: number,
  { intervalMs = 3000, timeoutMs = 60000 }: PollOptions = {}
): Promise<PollOutcome> {
  const startedAt = Date.now();
  let lastInvoice: ApiInvoice | null = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const invoice = await invoicesApi.checkStatus(invoiceId);
      lastInvoice = invoice;
      if (invoice.status === 'completed') return { status: 'completed', invoice };
      if (invoice.status === 'failed') return { status: 'failed', invoice };
    } catch {
      try {
        const invoice = await invoicesApi.get(invoiceId);
        lastInvoice = invoice;
        if (invoice.status === 'completed') return { status: 'completed', invoice };
        if (invoice.status === 'failed') return { status: 'failed', invoice };
      } catch {
        // ignore, retry
      }
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: 'timeout', invoice: lastInvoice };
}
