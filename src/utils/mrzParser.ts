/**
 * mrzParser — Kimlik & Pasaport MRZ Parser (Cihaz Üzerinde)
 *
 * Mobil kamerada ML Kit text-recognition'dan gelen ham OCR metnini parse eder.
 * Her iki ICAO 9303 formatını destekler:
 *   - TD1 (3 satır × 30 karakter) → T.C. Kimlik Kartı (2017+)
 *   - TD3 (2 satır × 44 karakter) → Pasaport
 *
 * TD1 örneği:
 *   I<TURA21H7G3X10<<<<<<<<<<<<<<<
 *   9001011M3001011TUR12345678901<C
 *   YILMAZ<<AHMET<<<<<<<<<<<<<<<<<<
 *
 * TD3 örneği:
 *   P<TURYILMAZ<<AHMET<<<<<<<<<<<<<<<<<<<<<<<<<<
 *   A21H7G3X14TUR9001011M3001011<<<<<<<<<<<<<<00
 *
 * Notlar:
 * - TC numarası TD1 satır 2'de pos 15-25 (11 hane).
 * - TD3'te (pasaport) TC alanı yok — sadece pasaport no, ad, soyad, doğum, cinsiyet alınır.
 * - 2 haneli yıl: 50+ → 19xx, 0-49 → 20xx.
 */

export interface MrzData {
  tcNo: string;
  firstName: string;
  lastName: string;
  birthDate: string;   // YYYY-MM-DD
  gender: 'M' | 'F' | '';
  expiryDate: string;  // YYYY-MM-DD
  documentNumber: string;
  documentType: 'id' | 'passport';
  raw: string;
}

function expandYear(yy: string): string {
  const n = parseInt(yy, 10);
  if (Number.isNaN(n)) return '';
  return n >= 50 ? `19${yy}` : `20${yy}`;
}

function parseMrzDate(raw: string): string {
  if (raw.length !== 6 || !/^\d{6}$/.test(raw)) return '';
  const yy = raw.slice(0, 2);
  const mm = raw.slice(2, 4);
  const dd = raw.slice(4, 6);
  const yyyy = expandYear(yy);
  if (!yyyy) return '';
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * OCR çıktısından sadece A-Z 0-9 < bırak, satır sonlarını koru.
 * Sonra her satırı boyutuna göre TD1/TD3 ayır.
 */
function extractMrzLines(input: string): { lines: string[]; type: 'td1' | 'td3' } | null {
  const cleaned = input
    .toUpperCase()
    .split(/[\n\r]+/)
    .map((l) => l.replace(/[^A-Z0-9<]/g, ''))
    .filter((l) => l.length >= 28);

  /* TD3 (pasaport): 2 satır × ~44 karakter, P< ile başlar */
  const td3Lines = cleaned.filter((l) => l.length >= 40 && l.length <= 48);
  if (td3Lines.length >= 2) {
    const l1 = td3Lines.find((l) => /^P[A-Z<]/.test(l));
    if (l1) {
      const idx = td3Lines.indexOf(l1);
      const rest = td3Lines.slice(idx + 1);
      if (rest.length > 0) {
        return {
          lines: [
            l1.padEnd(44, '<').slice(0, 44),
            rest[0].padEnd(44, '<').slice(0, 44),
          ],
          type: 'td3',
        };
      }
    }
  }

  /* TD1 (kimlik): 3 satır × ~30 karakter, I ile başlar */
  const td1Lines = cleaned.filter((l) => l.length >= 28 && l.length <= 34);
  if (td1Lines.length >= 3) {
    const l1Idx = td1Lines.findIndex((l) => /^I[A-Z<]TUR/.test(l) || /^ID[A-Z<]/.test(l));
    if (l1Idx >= 0 && td1Lines.length >= l1Idx + 3) {
      return {
        lines: [
          td1Lines[l1Idx].padEnd(30, '<').slice(0, 30),
          td1Lines[l1Idx + 1].padEnd(30, '<').slice(0, 30),
          td1Lines[l1Idx + 2].padEnd(30, '<').slice(0, 30),
        ],
        type: 'td1',
      };
    }
  }

  return null;
}

function parseTd1(lines: string[]): Omit<MrzData, 'raw'> | null {
  const [line1, line2, line3] = lines;
  if (!/^I[A-Z<]TUR/.test(line1)) return null;

  const documentNumber = line1.slice(5, 14).replace(/</g, '').trim();

  const birthRaw = line2.slice(0, 6);
  const gender = line2.slice(7, 8);
  const expiryRaw = line2.slice(8, 14);
  /* TC kimlik no — Türk yetkilileri TC'yi satır 1'in opsiyonel alanına (pos 15-29) yazıyor,
     bazen başında '<' filler olur. Bazı eski kartlarda satır 2 pos 18-28'de olabilir.
     '<'leri silip 11 haneli rakam dizisi ara. */
  const tcFromL1 = line1.slice(15, 30).replace(/</g, '');
  const tcFromL2 = line2.slice(18, 29).replace(/</g, '');
  const tcRaw = /^\d{11}$/.test(tcFromL1) ? tcFromL1
    : /^\d{11}$/.test(tcFromL2) ? tcFromL2
    : '';

  const namePart = line3.replace(/<+$/, '');
  const sepIndex = namePart.indexOf('<<');
  let lastName = '';
  let firstName = '';
  if (sepIndex >= 0) {
    lastName = namePart.slice(0, sepIndex).replace(/</g, ' ').trim();
    firstName = namePart.slice(sepIndex + 2).replace(/</g, ' ').trim();
  } else {
    lastName = namePart.replace(/</g, ' ').trim();
  }

  return {
    tcNo: tcRaw,
    firstName,
    lastName,
    birthDate: parseMrzDate(birthRaw),
    gender: gender === 'M' || gender === 'F' ? gender : '',
    expiryDate: parseMrzDate(expiryRaw),
    documentNumber,
    documentType: 'id',
  };
}

function parseTd3(lines: string[]): Omit<MrzData, 'raw'> | null {
  const [line1, line2] = lines;
  if (!/^P[A-Z<]/.test(line1)) return null;

  /* Satır 1: P< + 3 hane ülke + SOYAD<<AD<... */
  const namePart = line1.slice(5).replace(/<+$/, '');
  const sepIndex = namePart.indexOf('<<');
  let lastName = '';
  let firstName = '';
  if (sepIndex >= 0) {
    lastName = namePart.slice(0, sepIndex).replace(/</g, ' ').trim();
    firstName = namePart.slice(sepIndex + 2).replace(/</g, ' ').trim();
  } else {
    lastName = namePart.replace(/</g, ' ').trim();
  }

  /* Satır 2: pasaportNo(9) + check + ülke(3) + doğum(6) + check + cinsiyet(1) + expiry(6) + check + optional(14) + ... */
  const documentNumber = line2.slice(0, 9).replace(/</g, '').trim();
  const birthRaw = line2.slice(13, 19);
  const gender = line2.slice(20, 21);
  const expiryRaw = line2.slice(21, 27);
  const optional = line2.slice(28, 42).replace(/</g, '').trim();
  const tcRaw = /^\d{11}$/.test(optional) ? optional : '';

  return {
    tcNo: tcRaw,
    firstName,
    lastName,
    birthDate: parseMrzDate(birthRaw),
    gender: gender === 'M' || gender === 'F' ? gender : '',
    expiryDate: parseMrzDate(expiryRaw),
    documentNumber,
    documentType: 'passport',
  };
}

/**
 * MRZ ham OCR metnini parse et. Başarısızsa null.
 * Hem T.C. Kimlik (TD1) hem pasaport (TD3) çalışır.
 */
export function parseMrz(raw: string): MrzData | null {
  if (!raw || raw.length < 50) return null;

  const extracted = extractMrzLines(raw);
  if (!extracted) return null;

  const parsed =
    extracted.type === 'td1'
      ? parseTd1(extracted.lines)
      : parseTd3(extracted.lines);

  if (!parsed) return null;

  /* En az ad/soyad ve doğum tarihi şart — yoksa OCR yarım okumuş demek */
  if (!parsed.firstName || !parsed.lastName || !parsed.birthDate) {
    return null;
  }

  return { ...parsed, raw };
}
