import data from '../data/standards.json';
import type { Standard } from './rules';

// Barajlar uygulamayla gelir, Firestore okuma kotası harcamaz. Güncelleme: node scripts/tyf-barajlar.mjs
export const STANDARDS = data.standards as Standard[] & Array<Standard & { title: string; when: string; source: string }>;
export const STANDARD_SOURCE = data.source;
export const STANDARD_SEASON = data.season;

export const groupLabel = (s: Pick<Standard, 'when'> & { title?: string }) => {
  const title = (s as { title?: string }).title ?? '';
  const name = /MİLLİ/.test(title) ? 'Milli Takım Seçmesi' : /KISA KULVAR/.test(title) ? 'Türkiye Şampiyonası (Kısa Kulvar)' : 'Türkiye Şampiyonası (Uzun Kulvar)';
  return `${name} · ${s.when}`;
};
