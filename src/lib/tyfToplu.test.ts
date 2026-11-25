import { describe, expect, it } from 'vitest';
import { fullBirthYear, matchTopluEvents, parseResultList, parseTopluPages, poolFor, resultFileId, type TopluAthlete } from './tyfToplu';
import type { PdfItem } from './tyf';

// Splash Meet Manager toplu sonuç sayfasının konumlu metni; adlar ve kulüpler kurgusaldır.
const line = (y: number, ...cells: Array<[number, string]>): PdfItem[] => cells.map(([x, text]) => ({ x, y, text }));
const page1: PdfItem[] = [
  ...line(790, [103, 'TÜRKİYE YÜZME FEDERASYONU KURGU MÜSABAKASI']),
  ...line(749, [43, 'Yarış 1'], [252, 'Kızlar, 100m Serbest'], [468, '10 - 12 yaşları arası']),
  ...line(737, [43, '3.07.2026 - 9:00'], [515, 'Sonuçlar']),
  ...line(696, [198, 'YB'], [377, 'ZamanDerece'], [492, '50m']),
  ...line(680, [43, '10 yaş']),
  ...line(662, [71, 'Deniz KURGU'], [198, '16'], [224, 'Mavi Dalga Spor Kulübü'], [371, '1:16.36'], [412, '310'], [484, '36.17']),
  ...line(651, [71, '10 YAŞ KATILIM BARAJINI GEÇTİ']),
  ...line(636, [71, 'Ada, ÖRNEK'], [198, '15'], [224, 'Başka Spor Kulübü'], [371, '1:20.00']),
  ...line(619, [71, 'Ece DENEME'], [198, '16'], [224, 'Mavi Dalga Spor Kulübü']),
  ...line(608, [71, 'SW 7.7 - Dönüşte duvara dokunmadı']),
  ...line(560, [43, 'Yarış 2'], [241, 'Erkekler, 4 x 50m Serbest'], [524, '10 yaş']),
  ...line(540, [76, 'Mavi Dalga Spor Kulübü 1'], [275, 'Mavi Dalga Spor Kulübü'], [452, '2:19.95']),
  ...line(530, [76, 'Can KURGU'], [202, '16'], [308, 'Ali DENEME'], [434, '16']),
];
const page2: PdfItem[] = [
  ...line(759, [43, 'Yarış 1, Kızlar, 100m Serbest, 11 yaş']),
  ...line(736, [198, 'YB'], [377, 'ZamanDerece']),
  ...line(721, [71, 'Zehra TEST'], [198, '15'], [224, 'Mavi Dalga Spor Kulübü'], [371, '1:26.04']),
  ...line(34, [43, 'Splash Meet Manager, 11.84754'], [471, '5.07.2026 16:31 - Sayfa 2']),
];

describe('TYF toplu sonuç PDF okuma', () => {
  const events = parseTopluPages([page1, page2], new Date('2026-11-25'));

  it('bireysel yarışı sayfalar boyunca birleştirir, bayrağı atlar', () => {
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ no: 1, gender: 'K', distance: 100, stroke: 'serbest', date: '2026-07-03' });
    expect(events[0].rows.map((r) => r.name)).toEqual(['Deniz KURGU', 'Ada ÖRNEK', 'Ece DENEME', 'Zehra TEST']);
  });

  it('derece, doğum yılı ve kulübü okur; diskalifiyede derece boştur', () => {
    expect(events[0].rows[0]).toEqual({ name: 'Deniz KURGU', birthYear: 2016, club: 'Mavi Dalga Spor Kulübü', timeMs: 76360 });
    expect(events[0].rows[2].timeMs).toBeNull();
  });

  it('iki haneli doğum yılını çevirir', () => {
    const now = new Date('2026-11-25');
    expect(fullBirthYear('16', now)).toBe(2016);
    expect(fullBirthYear('85', now)).toBe(1985);
    expect(fullBirthYear('2014', now)).toBe(2014);
  });
});

describe('Kulüp sporcusuyla eşleştirme', () => {
  const events = parseTopluPages([page1, page2], new Date('2026-11-25'));
  const clubs = { c1: 'Mavi Dalga Spor Kulübü', c2: 'Kırmızı Kulvar Spor Kulübü' };
  const athletes: TopluAthlete[] = [
    { id: 's1', clubId: 'c1', firstName: 'Deniz', lastName: 'Kurgu', birthYear: 2016, gender: 'K' },
    { id: 's2', clubId: 'c1', firstName: 'Ece', lastName: 'Deneme', birthYear: 2016, gender: 'K' },
    { id: 's3', clubId: 'c2', firstName: 'Ada', lastName: 'Örnek', birthYear: 2015, gender: 'K' },
    { id: 's4', clubId: 'c1', firstName: 'Zehra', lastName: 'Test', birthYear: 2014, gender: 'K' },
  ];
  const found = matchTopluEvents(events, athletes, clubs, 'Kurgu Müsabakası', '50m');

  it('ad, yıl, cinsiyet ve kulüp tutunca dereceyi kendi kulübüne yazar', () => {
    expect(found).toEqual([expect.objectContaining({ clubId: 'c1', studentId: 's1', stroke: 'serbest', distance: 100, timeMs: 76360, date: '2026-07-03', pool: '50m' })]);
  });

  it('başka kulübün sporcusuna, diskalifiyeye ve yanlış doğum yılına derece yazılmaz', () => {
    expect(found.map((r) => r.studentId)).not.toContain('s3');
    expect(found.map((r) => r.studentId)).not.toContain('s2');
    expect(found.map((r) => r.studentId)).not.toContain('s4');
  });

  it('aynı kulüpte iki aynı aday varsa yazılmaz', () => {
    const twin = [...athletes, { id: 's5', clubId: 'c1', firstName: 'Deniz', lastName: 'Kurgu', birthYear: 2016, gender: 'K' as const }];
    expect(matchTopluEvents(events, twin, clubs, 'x')).toEqual([]);
  });
});

describe('TYF sonuçlar sayfası', () => {
  const html = `<table><tr><td><a href="https://dosya.tyf.gov.tr/public/upload/0/2026-07/NIGDE-Toplu-Sonuclar.pdf" title="İndir">KURGU MÜSABAKASI NİĞDE, 3. - 5.7.2026</a></td>
    <td><a href="https://dosya.tyf.gov.tr/public/upload/0/2026-07/NIGDE-Toplu-Sonuclar.pdf" title="İndir"><i class="fa"></i></a></td></tr>
    <tr><td><a href="https://dosya.tyf.gov.tr/public/upload/0/2025-12/1766996971.pdf">KISA KULVAR ŞAMPİYONASI</a></td></tr>
    <tr><td><a href="https://baska.site/x.pdf">Başka</a></td></tr></table>`;

  it('PDF bağlantılarını başlığı ve ayıyla bir kez çıkarır', () => {
    const files = parseResultList(html);
    expect(files.map((f) => [f.title, f.month])).toEqual([['KURGU MÜSABAKASI NİĞDE, 3. - 5.7.2026', '2026-07'], ['KISA KULVAR ŞAMPİYONASI', '2025-12']]);
    expect(files[0].id).toBe(resultFileId(files[0].url));
    expect(files[0].id).toMatch(/^[\w-]+$/);
  });

  it('havuz boyunu başlıktan ya da aynı şehir ve tarihteki canlı yarıştan bulur', () => {
    expect(poolFor('KISA KULVAR ŞAMPİYONASI', [], [])).toBe('25m');
    const meets = [{ title: 'UGL', info: 'Niğde | 03.07.2026 - 05.07.2026 | 50 Metre Havuz', startDate: '2026-07-03', endDate: '2026-07-05' }];
    expect(poolFor('KURGU MÜSABAKASI NİĞDE, 3. - 5.7.2026', ['2026-07-04'], meets)).toBe('50m');
    expect(poolFor('KURGU MÜSABAKASI SİVAS', ['2026-07-04'], meets)).toBeUndefined();
  });
});
