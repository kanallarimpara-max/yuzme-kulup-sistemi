import { describe, expect, it } from 'vitest';
import { matchStartEntries, parseStartPages } from './startList';
import { clubSetupSteps, nextSetupStep } from './setup';
import { skillProgress } from './skills';
import type { PdfItem } from './tyf';

const line = (y: number, ...cells: Array<[number, string]>): PdfItem[] => cells.map(([x, text]) => ({ x, y, text }));

// TYF start listesi sayfasının konumlu metni; adlar ve kulüpler kurgusaldır.
const page = [
  ...line(772, [245, 'Start Listesi'], [306, '26.11.2026']),
  ...line(739, [224, 'Kadınlar 50m Serbest']),
  ...line(706, [37, 'Seri 1/2']),
  ...line(691, [35, 'Kulvar'], [147, 'Sporcu'], [279, 'D.Yılı'], [398, 'Kulüp'], [521, 'Giriş']),
  ...line(677, [74, 'Ece *ur**'], [280, '2015'], [329, 'Mavi Dalga Spor Kulübü'], [541, '30.29']),
  ...line(662, [47, '1'], [74, 'Ada *ılma*'], [280, '2015'], [329, 'Başka Spor Kulübü'], [541, '30.09']),
  ...line(525, [37, 'Seri 2/2']),
  ...line(495, [74, 'Deniz *aya'], [280, '2015'], [329, 'Başka Spor Kulübü'], [541, '31.00']),
  ...line(481, [47, '4'], [74, 'Ada *ılma*'], [280, '2014'], [329, 'Mavi Dalga Spor Kulübü'], [541, '29.10']),
];

describe('TYF start listesi', () => {
  it('seri, kulvar (numarasız ilk satır 0. kulvar) ve sporcu satırlarını okur', () => {
    const e = parseStartPages([page])!;
    expect([e.gender, e.distance, e.stroke, e.date]).toEqual(['K', 50, 'serbest', '2026-11-26']);
    expect(e.entries.map((x) => [x.heat, x.heats, x.lane, x.maskedName, x.birthYear, x.club, x.entryTime])).toEqual([
      [1, 2, 0, 'Ece *ur**', 2015, 'Mavi Dalga Spor Kulübü', '30.29'],
      [1, 2, 1, 'Ada *ılma*', 2015, 'Başka Spor Kulübü', '30.09'],
      [2, 2, 0, 'Deniz *aya', 2015, 'Başka Spor Kulübü', '31.00'],
      [2, 2, 4, 'Ada *ılma*', 2014, 'Mavi Dalga Spor Kulübü', '29.10'],
    ]);
  });

  it('yalnız kulüp, doğum yılı ve ad birlikte tutan sporcuları eşleştirir', () => {
    const e = parseStartPages([page])!;
    const athletes = [
      { id: 'a', firstName: 'Ece', lastName: 'Turan', birthYear: 2015, gender: 'K' as const },
      { id: 'b', firstName: 'Ada', lastName: 'Yılmaz', birthYear: 2014, gender: 'K' as const },
      { id: 'c', firstName: 'Ada', lastName: 'Yılmaz', birthYear: 2015, gender: 'K' as const },
      { id: 'd', firstName: 'Ece', lastName: 'Turan', birthYear: 2015, gender: 'E' as const },
    ];
    // "c" başka kulübün satırıyla eşleşir, "d" erkektir: ikisi de alınmaz.
    expect(matchStartEntries(e, 'Mavi Dalga Spor Kulübü', athletes).map((m) => [m.athlete.id, m.entry.heat, m.entry.lane])).toEqual([['a', 1, 0], ['b', 2, 4]]);
  });
});

describe('Kulüp açılış rehberi ve beceri karnesi', () => {
  it('sıradaki adımı zorunlu adımlardan seçer, logo en sona kalır', () => {
    const steps = clubSetupSteps({ logo: false, branches: 1, models: 1, coaches: 1, lessons: 0, students: 0 });
    expect(nextSetupStep(steps)?.cta).toBe('İlk dersi oluştur');
    expect(nextSetupStep(clubSetupSteps({ logo: false, branches: 1, models: 1, coaches: 1, lessons: 1, students: 3 }))?.key).toBe('logo');
    expect(nextSetupStep(clubSetupSteps({ logo: true, branches: 1, models: 1, coaches: 1, lessons: 1, students: 3 }))).toBeNull();
  });

  it('bağımsız yapılan becerileri sayar', () => {
    expect(skillProgress({ 'yuz-sokma': 'bagimsiz', 'takla-donus': 'destekle' })).toEqual({ independent: 1, total: 15, percent: 7 });
  });
});
