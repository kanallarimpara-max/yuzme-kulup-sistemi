import { describe, expect, it } from 'vitest';
import { maskedNameMatches, matchAthletes, parseEventTitle, parseResultPages, type PdfItem } from './tyf';

// Tamamen kurgusal veri. Gerçek sporcu sonucu depoya konmaz.
const row = (y: number, rank: string, name: string, club: string, time: string, laps: string): PdfItem[] => [
  { x: 119, y: y + 2, text: name }, { x: 452, y: y + 2, text: time }, { x: 42, y, text: rank }, { x: 80, y, text: '4/1' },
  { x: 381, y, text: '2015' }, { x: 119, y: y - 8, text: club }, { x: 433, y: y - 6, text: laps },
];
const page: PdfItem[] = [
  { x: 125, y: 798, text: 'KURGUSAL ULUSAL MÜSABAKA' }, { x: 299, y: 786, text: '22.11.2026' }, { x: 220, y: 740, text: 'Kadınlar 100m Serbest' },
  { x: 35, y: 716, text: 'Sıra' }, { x: 381, y: 716, text: 'D.Yılı' },
  ...row(698, '1', 'Ze**ep Ş***n', 'Mavi Dalga Spor Kulübü', '1:21.86', '50m 38.75 100m 1:21.86'),
  ...row(674, '2', 'De*** K**a', 'Başka Spor Kulübü', '1:24.37', '50m 40.74 100m 1:24.37'),
  ...row(650, '', 'Ze**ep Ş***n', 'Mavi Dalga S.K.', 'DSQ', ''),
];

describe('TYF sonuç PDF ayrıştırma', () => {
  it('olay başlığını çözer, bayrağı atlar', () => {
    expect(parseEventTitle('Erkekler 200m Karışık')).toEqual({ distance: 200, stroke: 'karisik', gender: 'E' });
    expect(parseEventTitle('Kadınlar 4 x 50m Serbest')).toBeNull();
  });
  it('sporcu, kulüp, derece ve lapları ayırır', () => {
    const event = parseResultPages([page])!;
    expect([event.gender, event.distance, event.stroke, event.date]).toEqual(['K', 100, 'serbest', '2026-11-22']);
    expect(event.rows).toHaveLength(3);
    expect(event.rows[0]).toMatchObject({ rank: 1, maskedName: 'Ze**ep Ş***n', birthYear: 2015, club: 'Mavi Dalga Spor Kulübü', timeMs: 81860, lapsMs: [38750, 81860] });
    expect(event.rows[2]).toMatchObject({ rank: null, timeMs: null, status: 'DSQ' });
  });
  it('sayfa sonundaki DSQ listesi ne satır olur ne üstteki dereceyi siler', () => {
    const list = [...page.slice(0, 5), ...row(698, '1', 'Ze**ep Ş***n', 'Mavi Dalga Spor Kulübü', '1:21.86', ''),
      { x: 31.2, y: 678, text: 'DSQ' }, { x: 56.6, y: 678, text: 'De*** K**a' }, { x: 153, y: 678, text: 'Başka Spor Kulübü' }];
    const { rows } = parseResultPages([list])!;
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ timeMs: 81860, status: '' });
  });
  it('yıldızlı adı harf harf eşleştirir', () => {
    expect(maskedNameMatches('Ze**ep Ş***n', 'Zeynep Şahin')).toBe(true);
    expect(maskedNameMatches('Ze**ep Ş***n', 'Zeynep Şahinoğlu')).toBe(false);
    expect(maskedNameMatches('Ze**ep Ş***n', 'Zehrap Kahin')).toBe(false);
  });
  it('yalnız kendi kulübünü ve doğru sporcuyu alır', () => {
    const event = parseResultPages([page])!;
    const zeynep = { id: 's1', firstName: 'Zeynep', lastName: 'Şahin', birthYear: 2015, gender: 'K' as const };
    const matches = matchAthletes(event, 'Mavi Dalga SK', [zeynep, { ...zeynep, id: 's2', birthYear: 2014 }, { ...zeynep, id: 's3', gender: 'E' }]);
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({ confidence: 'auto', athlete: { id: 's1' } });
  });
  it('aynı desene uyan iki sporcuyu insan onayına bırakır', () => {
    const event = parseResultPages([page])!;
    const a = { id: 'a', firstName: 'Zeynep', lastName: 'Şahin', birthYear: 2015, gender: 'K' as const };
    expect(matchAthletes(event, 'Mavi Dalga SK', [a, { ...a, id: 'b', lastName: 'Şakin' }])[0].confidence).toBe('review');
  });
});
