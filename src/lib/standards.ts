// Reglaman PDF'lerindeki baraj tablolarını okur. Node betiği de kullandığı için çalışma zamanı içe aktarması yoktur.

export type PdfCell = { x: number; y: number; text: string };
export type StandardRow = {
  title: string; kind: 'katilim' | 'harcirah'; when: string; pool: '25m' | '50m'; gender: 'K' | 'E'; age: number; maxAge?: number;
  stroke: 'serbest' | 'kelebek' | 'sirt' | 'kurbaga' | 'karisik'; distance: number; timeMs: number; source: string;
};

// Bazı reglamanlarda salise ayracı yanlışlıkla ";" yazılmış.
const TIME = /^(\d{1,2}):(\d{2})[,.;](\d{2})$/;
const toMs = (t: string) => {
  const m = t.trim().match(TIME);
  return m ? (Number(m[1]) * 60 + Number(m[2])) * 1000 + Number(m[3]) * 10 : null;
};
const strokeOf = (s: string): StandardRow['stroke'] | null => {
  const t = s.toLocaleLowerCase('tr-TR');
  if (t.includes('serbest')) return 'serbest';
  if (t.includes('sırt') || t.includes('sirt')) return 'sirt';
  if (t.includes('kurba')) return 'kurbaga';
  if (t.includes('kelebek')) return 'kelebek';
  if (t.includes('karış') || t.includes('karis')) return 'karisik';
  return null;
};

function poolOf(cells: PdfCell[]): StandardRow['pool'] | null {
  const heading = cells.filter((c) => /BARAJ/i.test(c.text)).map((c) => c.text).join(' ');
  if (/UZUN|50\s*M/i.test(heading)) return '50m';
  if (/KISA|25\s*M/i.test(heading)) return '25m';
  return null;
}

/** Sütun başındaki yaş etiketlerini okur: "19+", "15", "18 - 17 - 16". */
function agesFor(cells: PdfCell[], colX: number, nextX: number) {
  const nums = cells.filter((c) => c.x >= colX - 4 && c.x < nextX - 4).flatMap((c) => {
    const m = c.text.trim().match(/^(\d{1,2})(\+)?$/);
    return m && Number(m[1]) >= 5 && Number(m[1]) <= 40 ? [{ age: Number(m[1]), open: !!m[2] }] : [];
  });
  if (!nums.length) return null;
  const values = nums.map((n) => n.age);
  return { age: Math.min(...values), maxAge: nums.some((n) => n.open) ? 99 : Math.max(...values) };
}

/** Katılım ve harcırah barajları farklı süreler içerir, asla karıştırılmamalı. */
const kindOf = (cells: PdfCell[]): StandardRow['kind'] => {
  const heading = cells.filter((c) => /BARAJ/i.test(c.text)).map((c) => c.text).join(' ').toLocaleUpperCase('tr-TR');
  const near = cells.filter((c) => /HARCIRAH/i.test(c.text)).length > 0;
  return heading.includes('HARCIRAH') || near ? 'harcirah' : 'katilim';
};

const whenOf = (cells: PdfCell[]) => {
  const lines = new Map<number, PdfCell[]>();
  cells.forEach((c) => {
    const key = Math.round(c.y / 3) * 3;
    lines.set(key, [...(lines.get(key) ?? []), c]);
  });
  for (const [, line] of [...lines.entries()].sort((a, b) => b[0] - a[0])) {
    const text = line.sort((a, b) => a.x - b.x).map((c) => c.text.trim()).join(' ');
    const m = text.match(/\d{1,2}\s*-\s*\d{1,2}\s+\p{Lu}+\s+20\d{2}/u);
    if (m) return m[0].replace(/\s*-\s*/, '-');
  }
  return '';
};

export function parseStandardPage(cells: PdfCell[], title: string, source: string): StandardRow[] {
  const kind = kindOf(cells);
  const when = whenOf(cells);
  const pool = poolOf(cells);
  const men = cells.find((c) => /^ERKEKLER$/i.test(c.text.trim()));
  const women = cells.find((c) => /^KADINLAR$/i.test(c.text.trim()));
  if (!pool || !men || !women) return [];
  const timeCells = cells.filter((c) => TIME.test(c.text.trim()));
  const byLine = new Map<number, PdfCell[]>();
  timeCells.forEach((c) => {
    const key = Math.round(c.y / 3) * 3;
    byLine.set(key, [...(byLine.get(key) ?? []), c]);
  });
  const rows = [...byLine.entries()].filter(([, v]) => v.length >= 4).sort((a, b) => b[0] - a[0]);
  if (!rows.length) return [];
  // Sütunlar tüm satırlardan kümelenir; ilk satırda boş hücre olsa da sütun kaybolmaz.
  const columns = rows.flatMap(([, v]) => v.map((c) => c.x)).sort((a, b) => a - b)
    .reduce<number[][]>((groups, x) => {
      const last = groups.at(-1);
      if (last && x - last[last.length - 1] < 15) last.push(x);
      else groups.push([x]);
      return groups;
    }, [])
    .map((g) => g.reduce((s, x) => s + x, 0) / g.length);
  const headerCells = cells.filter((c) => c.y > rows[0][0] + 12 && c.y < Math.max(men.y, women.y));
  const split = (men.x + women.x) / 2;
  const centerMin = columns.reduce((best, x, i) => (i && x - columns[i - 1] > best.gap ? { gap: x - columns[i - 1], at: columns[i - 1] } : best), { gap: 0, at: 0 }).at;
  const centerMax = columns.find((x) => x > centerMin) ?? split;

  const out: StandardRow[] = [];
  for (const [y, line] of rows) {
    const center = cells.filter((c) => c.x > centerMin + 30 && c.x < centerMax && !TIME.test(c.text.trim()));
    const distanceCell = center.filter((c) => c.y > y - 3 && c.y <= y + 14 && /^\d{2,4}(\s*m)?$/i.test(c.text.trim())).sort((a, b) => a.y - b.y)[0];
    const strokeCell = center.filter((c) => c.y >= y - 14 && c.y <= y + 14 && strokeOf(c.text)).sort((a, b) => Math.abs(a.y - y) - Math.abs(b.y - y))[0];
    if (!distanceCell || !strokeCell) continue;
    const stroke = strokeOf(strokeCell.text)!;
    line.forEach((cell) => {
      const index = columns.findIndex((x) => Math.abs(x - cell.x) < 8);
      const timeMs = toMs(cell.text);
      if (index < 0 || !timeMs) return;
      const ages = agesFor(headerCells, columns[index], columns[index + 1] ?? columns[index] + 45);
      if (!ages) return;
      out.push({ title, kind, when, pool, gender: cell.x < split ? 'E' : 'K', age: ages.age, maxAge: ages.maxAge, stroke, distance: parseInt(distanceCell.text, 10), timeMs, source });
    });
  }
  return out;
}
