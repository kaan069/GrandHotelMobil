/**
 * İzin Hesaplama Utility
 *
 * Türk İş Kanunu'na göre yıllık izin hesaplama.
 * İşe giriş tarihine göre hak edilen izin günü:
 *   - <1 yıl: 0 gün
 *   - 1-5 yıl: 14 gün
 *   - 5-15 yıl: 20 gün
 *   - 15+ yıl: 26 gün
 */

/**
 * Kıdem süresini yıl olarak hesaplar
 * @param {string} hireDate - İşe giriş tarihi (ISO string)
 * @returns {number} Ondalıklı yıl
 */
export const getYearsOfService = (hireDate: string | null | undefined): number => {
  if (!hireDate) return 0;
  const hire = new Date(hireDate);
  const now = new Date();
  const diffMs = now.getTime() - hire.getTime();
  return diffMs / (1000 * 60 * 60 * 24 * 365.25);
};

/**
 * Yıllık izin hakkını hesaplar
 * @param {string} hireDate - İşe giriş tarihi (ISO string)
 * @returns {number} Hak edilen yıllık izin günü (0, 14, 20 veya 26)
 */
export const calculateAnnualLeave = (hireDate: string | null | undefined): number => {
  const years = getYearsOfService(hireDate);
  if (years < 1) return 0;
  if (years < 5) return 14;
  if (years < 15) return 20;
  return 26;
};
