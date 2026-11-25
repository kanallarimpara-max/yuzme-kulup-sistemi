import { describe, expect, it } from 'vitest';
import { lapSegments, normalizeSplits, validLaps } from './splits';
import { parseTopluPages } from './tyfToplu';
import { parseResultPages, type PdfItem } from './tyf';

const line = (y: number, ...cells: Array<[number, string]>): PdfItem[] => cells.map(([x, text]) => ({ x, y, text }));

describe('Yarış ara süreleri', () => {
  it('eşit aralıklı, artan ve dereceyle tutarlı ara süreleri kabul eder', () => {
    expect(normalizeSplits([{ m: 50, ms: 36170 }, { m: 100, ms: 76360 }], 100, 76360)).toEqual({ lapsMs: [36170, 76360], lapEvery: 50 });
    expect(normalizeSplits([{ m: 100, ms: 86170 }, { m: 200, ms: 173670 }], 200, 173670)).toEqual({ lapsMs: [86170, 173670], lapEvery: 100 });
    // Eksik bölüm, yanlış toplam veya azalan süre kaydedilmez.
    expect(normalizeSplits([{ m: 50, ms: 38770 }, { m: 150, ms: 142050 }, { m: 200, ms: 182490 }], 200, 182490)).toBeNull();
    expect(normalizeSplits([{ m: 50, ms: 36170 }, { m: 100, ms: 79000 }], 100, 76360)).toBeNull();
    expect(normalizeSplits([{ m: 50, ms: 40000 }, { m: 100, ms: 30000 }], 100, 30000)).toBeNull();
    expect(lapSegments([38770, 87000, 142050, 182490])).toEqual([38770, 48230, 55050, 40440]);
  });

  it('kayıt denetimi eski (aralığı yazmayan) kayıtları 50 m sayar', () => {
    expect(validLaps(undefined, undefined, 100, 60000)).toBe(true);
    expect(validLaps([29000, 60000], undefined, 100, 60000)).toBe(true);
    expect(validLaps([29000, 60000], 50, 200, 60000)).toBe(false);
    expect(validLaps([29000, 59000], 50, 100, 60000)).toBe(false);
    expect(validLaps(['29.00', 60000], 50, 100, 60000)).toBe(false);
  });

  it('toplu sonuçta sütun başlıklı bölüm sürelerini ve satır altındaki ayrıntıyı okur', () => {
    const page = [
      ...line(749, [43, 'Yarış 13'], [254, 'Kızlar, 200m Karışık']),
      ...line(737, [43, '3.07.2026 - 16:25']),
      ...line(550, [175, 'YB'], [319, 'Zaman'], [338, 'Derece'], [415, '50m'], [452, '100m'], [493, '150m'], [534, '200m']),
      ...line(516, [68, 'Ece KURGU'], [175, '16'], [201, 'Deniz Spor Kulübü'], [313, '3:02.49'], [348, '326'], [407, '38.77'], [448, '48.23'], [489, '55.05'], [530, '40.44']),
      ...line(500, [43, 'Yarış 16'], [247, 'Erkekler, 400m Serbest']),
      ...line(490, [43, '4.07.2026 - 9:00']),
      ...line(470, [249, 'YB'], [459, 'Zaman Derece']),
      ...line(450, [76, 'Can KURGU'], [249, '14'], [275, 'Deniz Spor Kulübü'], [452, '4:59.33'], [498, '396']),
      ...line(440, [92, '50m:'], [125, '32.73'], [161, '32.73'], [198, '150m:'], [229, '1:47.90'], [273, '38.08'], [309, '250m:'], [341, '3:04.44'], [384, '38.81'], [420, '350m:'], [452, '4:21.73'], [495, '39.13']),
      ...line(430, [87, '100m:'], [118, '1:09.82'], [161, '37.09'], [198, '200m:'], [229, '2:25.63'], [273, '37.73'], [309, '300m:'], [341, '3:42.60'], [384, '38.16'], [420, '400m:'], [452, '4:59.33'], [495, '37.60']),
    ];
    const [im, free] = parseTopluPages([page], new Date('2026-07-10'));
    expect(im.rows[0]).toMatchObject({ timeMs: 182490, lapEvery: 50, lapsMs: [38770, 87000, 142050, 182490] });
    expect(free.rows[0]).toMatchObject({ timeMs: 299330, lapEvery: 50, lapsMs: [32730, 69820, 107900, 145630, 184440, 222600, 261730, 299330] });
  });

  it('canlı sonuçta birkaç satıra yayılan sporcu bloğunu ve kırılan ara süreyi okur', () => {
    const page = [
      ...line(772, [252, 'Sonuçlar'], [299, '21.11.2026']),
      ...line(739, [219, 'Erkekler 200m Kelebek']),
      ...line(716, [35, 'Sıra'], [80, 'K/S'], [223, 'Sporcu'], [381, 'D.Yılı'], [456, 'Derece']),
      ...line(700, [119, 'Ali ***'], [452, '2:26.03']),
      ...line(693, [42, '1'], [119, 'Deniz S.K.'], [381, '2011'], [431, '50m 29.44'], [470, '| 100m'], [500, '1:06.41 |']),
      ...line(683, [428, '150m 1:46.24 |'], [490, '200m 2:26.03']),
      ...line(669, [119, 'Can ***'], [452, '2:37.81']),
      ...line(662, [42, '2'], [381, '2014'], [431, '50m 34.96 | 100m 1:15.04 |']),
      ...line(659, [119, 'Mavi S.K.']),
      ...line(652, [428, '150m 1:57.13 | 200m 2:37.81']),
    ];
    const event = parseResultPages([page])!;
    expect(event.rows.map((r) => [r.rank, r.maskedName, r.club, r.timeMs, r.lapsMs])).toEqual([
      [1, 'Ali ***', 'Deniz S.K.', 146030, [29440, 66410, 106240, 146030]],
      [2, 'Can ***', 'Mavi S.K.', 157810, [34960, 75040, 117130, 157810]],
    ]);
  });
});
