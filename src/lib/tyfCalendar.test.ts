import { describe, expect, it } from 'vitest';
import data from '../data/calendar.json';
import { parseCalendarDate, parseCalendarPages, validCalendar, type CalendarItem } from './tyfCalendar';

// PDF'te bir yazı birden çok parçaya bölünür; genişlik bitişik parçaları birleştirmeye yarar.
const at = (x: number, y: number, text: string, w = text.length * 4): CalendarItem => ({ x, y, w, text });

describe('TYF faaliyet takvimi', () => {
  it('tarih biçimlerini okur', () => {
    expect(parseCalendarDate('26 - 29 KASIM 2026')).toEqual({ startDate: '2026-11-26', endDate: '2026-11-29' });
    expect(parseCalendarDate('1 EKİM - 31 ARALIK 2026')).toEqual({ startDate: '2026-10-01', endDate: '2026-12-31' });
    expect(parseCalendarDate('29 HAZİRAN - 4 TEMMUZ 2027')).toEqual({ startDate: '2027-06-29', endDate: '2027-07-04' });
    expect(parseCalendarDate('1 7 - 2 0 ARALIK 202 6')).toEqual({ startDate: '2026-12-17', endDate: '2026-12-20' });
    expect(parseCalendarDate('EKİM 2027')).toEqual({ startDate: '2027-10-01', endDate: '2027-10-31' });
    expect(parseCalendarDate('ŞUBAT 2027')).toEqual({ startDate: '2027-02-01', endDate: '2027-02-28' });
    expect(parseCalendarDate('2027')).toBeNull();
  });

  it('tarih satırının üstüne ve altına taşan adı ve yeri aynı yarışa toplar', () => {
    const page = [
      at(51, 897, 'TARİH'), at(169, 897, 'MÜSABAKA'),
      at(144, 760, 'TÜRKİYE YÜZME FEDERASYONU'),
      at(32, 753, '26'), at(39, 753, '-'), at(41, 753, '29'), at(49, 753, 'KASIM 202', 28), at(77, 753, '6', 4),
      at(144, 753, '11'), at(151, 753, '-'), at(153, 753, '12 YAŞ ULUSAL GELİŞİM LİGİ'), at(291, 753, '50M'),
      at(354, 753, '201', 10), at(364, 753, '4'), at(383, 753, 'Kadın'), at(474, 753, 'ANKARA'),
      at(166, 746, 'TÜRKİYE FİNALİ'),
      at(467, 855, 'AZERBAYCAN'),
      at(38, 850, '1'), at(41, 850, '-'), at(43, 850, '3 EKİM 2026'), at(146, 850, 'DÜNYA YÜZME KUPASI SERİ 1'), at(291, 850, '25M'), at(374, 850, 'Açık Yaş'),
      at(478, 846, 'BAKÜ'),
      // Ay yazmayan satır (milli takım kampı) yarış sayılmaz.
      at(50, 518, '2027'), at(148, 518, '2026 FEDERASYON KARMASI'),
    ];
    const events = parseCalendarPages([page]);
    expect(events.map((e) => [e.startDate, e.endDate, e.title, e.place, e.international])).toEqual([
      ['2026-10-01', '2026-10-03', 'DÜNYA YÜZME KUPASI SERİ 1', 'AZERBAYCAN BAKÜ', true],
      ['2026-11-26', '2026-11-29', 'TÜRKİYE YÜZME FEDERASYONU 11 - 12 YAŞ ULUSAL GELİŞİM LİGİ TÜRKİYE FİNALİ', 'ANKARA', false],
    ]);
    expect(events[1].category).toBe('2014 Kadın');
    expect(validCalendar(events)).toBe(true);
  });

  it('uygulamayla gelen takvim geçerli ve yurt içi şampiyonaları içerir', () => {
    expect(validCalendar(data.events)).toBe(true);
    const titles = data.events.filter((e) => !e.international).map((e) => e.title);
    expect(titles).toContain('TÜRKİYE KULÜPLER ARASI KISA KULVAR YILDIZ, GENÇ VE AÇIK YAŞ YÜZME ŞAMPİYONASI');
  });

  it('bozuk veriyi kabul etmez', () => {
    expect(validCalendar([])).toBe(false);
    expect(validCalendar([{ ...data.events[0], startDate: '2026-13' }])).toBe(false);
    expect(validCalendar([{ ...data.events[0], endDate: '2020-01-01' }])).toBe(false);
  });
});
