/**
 * Ortak Sabitler — backend /api/meta/choices/ ile senkron
 *
 * Neden?
 *   Roller, durumlar, kategoriler web ve mobilde ayrı ayrı elle yazılmıştı ve
 *   ayrıştı (ör. mobilde backend'de olmayan izin türleri). Tek doğruluk
 *   kaynağı backend modellerindeki CHOICES'lardır.
 *
 * Nasıl?
 *   - Anahtarlar (ör. 'reserved', 'room_charge') constants.ts'de sabit kalır:
 *     kod mantığı onlara bağlıdır.
 *   - Etiketler giriş sonrası backend'den alınıp mevcut sözlüklerin ÜZERİNE
 *     yazılır. constants.ts'deki etiketler ilk açılış/çevrimdışı yedeğidir.
 *   - Geliştirme modunda (__DEV__) backend'de karşılığı olmayan yerel
 *     anahtarlar konsola uyarı olarak basılır → ayrışma hemen fark edilir.
 *
 * Kullanım: AuthContext giriş sonrası ve oturum yüklenince hydrateChoiceLabels() çağırır.
 * Webdeki karşılığı: grandhotel-web/src/utils/choices.ts
 */

import { metaApi, MetaChoices } from '../services/api';
import {
  ROLE_LABELS,
  ROOM_STATUS_LABELS,
  RESERVATION_STATUS_LABELS,
  FOLIO_CATEGORY_LABELS,
  FOLIO_CATEGORIES,
  PAYMENT_METHOD_LABELS,
  FAULT_STATUS_LABELS,
  FAULT_CATEGORIES,
  STOCK_UNITS,
  STOCK_CATEGORIES,
  LEAVE_TYPES,
  TABLE_STATUS_LABELS,
  LabelValueOption,
} from './constants';

type ChoiceKey = keyof MetaChoices;
type ChoiceOption = MetaChoices[ChoiceKey][number];

/** { değer: etiket } sözlükleri — backend'deki tüm değerler eklenir */
const LABEL_MAPS: [ChoiceKey, Record<string, string>][] = [
  ['roles', ROLE_LABELS],
  ['roomStatus', ROOM_STATUS_LABELS],
  ['reservationStatus', RESERVATION_STATUS_LABELS],
  ['folioCategories', FOLIO_CATEGORY_LABELS],
  ['paymentMethods', PAYMENT_METHOD_LABELS],
  ['faultStatus', FAULT_STATUS_LABELS],
];

/** [{value, label}] seçici listeleri — sadece mevcut seçeneklerin etiketi güncellenir */
const OPTION_LISTS: [ChoiceKey, readonly LabelValueOption[]][] = [
  ['folioCategories', FOLIO_CATEGORIES],
  ['faultCategories', FAULT_CATEGORIES],
  ['stockUnits', STOCK_UNITS],
  ['stockCategories', STOCK_CATEGORIES],
  ['leaveTypes', LEAVE_TYPES],
];

/**
 * Sadece anahtar kontrolü yapılan (etiketi bilerek yerel kalan) sözlükler.
 * Masa durum çipi dar → kısa "Hesap" etiketi korunur (backend: "Hesap İstendi").
 */
const CHECK_ONLY: [ChoiceKey, Record<string, string>][] = [
  ['tableStatus', TABLE_STATUS_LABELS],
];

function warnStale(key: ChoiceKey, localValues: string[], options: ChoiceOption[]) {
  if (!__DEV__) return;
  const backendValues = new Set(options.map((o) => o.value));
  const stale = localValues.filter((v) => !backendValues.has(v));
  if (stale.length > 0) {
    console.warn(`[choices] ${key}: backend'de olmayan yerel değerler →`, stale);
  }
}

/** Backend etiketlerini yerel sözlüklere uygular. Hata olursa yerel etiketler kalır. */
export async function hydrateChoiceLabels(): Promise<void> {
  const choices = await metaApi.getChoices();

  for (const [key, target] of LABEL_MAPS) {
    const options = choices[key] || [];
    warnStale(key, Object.keys(target), options);
    options.forEach((o) => { target[o.value] = o.label; });
  }

  for (const [key, list] of OPTION_LISTS) {
    const options = choices[key] || [];
    warnStale(key, list.map((item) => item.value), options);
    const labelByValue = new Map(options.map((o) => [o.value, o.label]));
    list.forEach((item) => {
      const label = labelByValue.get(item.value);
      if (label) item.label = label;
    });
  }

  for (const [key, target] of CHECK_ONLY) {
    warnStale(key, Object.keys(target), choices[key] || []);
  }
}
