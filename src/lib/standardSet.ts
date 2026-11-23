import type { Standard } from './rules';

// Barajlar tek belgeye sığsın ve uygulama güncellemesi gerekmesin diye sıkıştırılmış tutulur.
export type TitledStandard = Standard & { title: string; when: string; source: string };
type PackedRow = [number, 'katilim' | 'harcirah', '25m' | '50m', 'K' | 'E', number, number | null, Standard['stroke'], number, number];
export type PackedStandards = { sources: Array<[string, string, string]>; rows: PackedRow[] };

export function packStandards(list: TitledStandard[]): PackedStandards {
  const sources: Array<[string, string, string]> = [];
  const index = new Map<string, number>();
  const rows = list.map((s): PackedRow => {
    const key = `${s.title}\n${s.when}\n${s.source}`;
    if (!index.has(key)) {
      index.set(key, sources.length);
      sources.push([s.title, s.when, s.source]);
    }
    return [index.get(key)!, s.kind!, s.pool!, s.gender, s.age, s.maxAge ?? null, s.stroke, s.distance, s.timeMs];
  });
  return { sources, rows };
}

export function unpackStandards(packed: PackedStandards): TitledStandard[] {
  return packed.rows.map(([src, kind, pool, gender, age, maxAge, stroke, distance, timeMs]) => {
    const [title, when, source] = packed.sources[src];
    return { title, when, source, kind, pool, gender, age, ...(maxAge === null ? {} : { maxAge }), stroke, distance, timeMs } as TitledStandard;
  });
}

const STROKES = new Set(['serbest', 'sirt', 'kurbaga', 'kelebek', 'karisik']);

/** Bozuk veya eksik reglaman çıktısı canlı barajların yerine geçemez. */
export function validPacked(value: unknown): value is PackedStandards {
  const p = value as PackedStandards;
  if (!p || !Array.isArray(p.sources) || !Array.isArray(p.rows) || p.rows.length < 100 || p.rows.length > 20000 || p.sources.length > 100) return false;
  if (!p.sources.every((s) => Array.isArray(s) && s.length === 3 && s.every((x) => typeof x === 'string' && x.length < 400))
    || !p.sources.every((s) => s[2].startsWith('https://dosya.tyf.gov.tr/'))) return false;
  return p.rows.every((r) => Array.isArray(r) && r.length === 9 && Number.isInteger(r[0]) && r[0] >= 0 && r[0] < p.sources.length
    && (r[1] === 'katilim' || r[1] === 'harcirah') && (r[2] === '25m' || r[2] === '50m') && (r[3] === 'K' || r[3] === 'E')
    && Number.isInteger(r[4]) && r[4] > 0 && r[4] < 100 && (r[5] === null || (Number.isInteger(r[5]) && r[5] >= r[4]))
    && STROKES.has(r[6]) && Number.isInteger(r[7]) && r[7] >= 25 && r[7] <= 1500 && Number.isInteger(r[8]) && r[8] > 5000 && r[8] < 3600000);
}
