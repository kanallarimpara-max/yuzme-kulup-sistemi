import { describe, expect, it } from 'vitest';
import { parseStandardPage, type PdfCell } from './standards';

// Reglaman tablosunun konum düzenini taklit eden kurgusal değerler.
const cells: PdfCell[] = [
  { x: 171, y: 642, text: '50M (UZUN KULVAR) KATILIM BARAJLARI' }, { x: 100, y: 621, text: 'ERKEKLER' }, { x: 396, y: 621, text: 'KADINLAR' },
  { x: 60, y: 603, text: '18' }, { x: 69, y: 603, text: '-' }, { x: 72, y: 603, text: '17' }, { x: 85, y: 603, text: '16' },
  { x: 446, y: 603, text: '18' }, { x: 458, y: 603, text: '17' }, { x: 471, y: 603, text: '16' },
  { x: 17, y: 588, text: '19+' }, { x: 109, y: 588, text: '15' }, { x: 154, y: 588, text: '14' }, { x: 199, y: 588, text: '13' },
  { x: 315, y: 588, text: '13' }, { x: 359, y: 588, text: '14' }, { x: 404, y: 588, text: '15' }, { x: 492, y: 588, text: '19+' },
  { x: 67, y: 582, text: '2008' }, { x: 261, y: 546, text: '100' }, { x: 273, y: 546, text: 'm' }, { x: 254, y: 531, text: 'Serbest' },
  ...[12, 57, 102, 147, 192, 308, 353, 398, 443, 488].map((x, i) => ({ x, y: 537, text: `01:0${i},50` })),
];

describe('baraj tablosu', () => {
  const rows = parseStandardPage(cells, 'Kurgusal Şampiyona', 'kaynak');
  it('her sütunu cinsiyet ve yaşa ayırır', () => {
    expect(rows).toHaveLength(10);
    expect(rows[0]).toMatchObject({ pool: '50m', gender: 'E', age: 19, maxAge: 99, stroke: 'serbest', distance: 100, timeMs: 60500 });
    expect(rows[1]).toMatchObject({ gender: 'E', age: 16, maxAge: 18 });
    expect(rows[4]).toMatchObject({ gender: 'E', age: 13, maxAge: 13 });
    expect(rows[5]).toMatchObject({ gender: 'K', age: 13 });
    expect(rows[9]).toMatchObject({ gender: 'K', age: 19, maxAge: 99, timeMs: 69500 });
  });
  it('baraj tablosu olmayan sayfayı boş döner', () => {
    expect(parseStandardPage([{ x: 1, y: 1, text: 'Genel kurallar' }], 't', 's')).toEqual([]);
  });
});
