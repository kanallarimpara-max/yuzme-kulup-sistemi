// TYF canlı sonuç sayfasındaki start listesi PDF'ini okur ve kulübün öğrencileriyle eşleştirir.
import { classifyMatch, clubMatchScore, type Stroke } from './rules.ts';
import { maskedNameMatches, parseEventTitle, type PdfItem } from './tyf.ts';

export type StartEntry = { heat: number; heats: number; lane: number | null; maskedName: string; birthYear: number; club: string; entryTime: string };
export type StartEvent = { gender: 'K' | 'E'; distance: number; stroke: Stroke; title: string; date: string; entries: StartEntry[] };

const TIME = /^(?:\d+:)?\d{1,2}[.,]\d{2}$/;

/** Start listesi sayfalarından seri, kulvar ve sporcu satırlarını çıkarır. Bayrak yarışları atlanır. */
export function parseStartPages(pages: PdfItem[][]): StartEvent | null {
  let header: ReturnType<typeof parseEventTitle> = null;
  let title = '';
  let date = '';
  let heat = 0;
  let heats = 0;
  let lastLane: number | null = null;
  const entries: StartEntry[] = [];
  for (const page of pages) {
    const rows = new Map<number, PdfItem[]>();
    for (const item of page) {
      if (!item.text.trim()) continue;
      const key = [...rows.keys()].find((y) => Math.abs(y - item.y) <= 2) ?? item.y;
      rows.set(key, [...(rows.get(key) ?? []), item]);
    }
    for (const [, cells] of [...rows.entries()].sort((a, b) => b[0] - a[0])) {
      cells.sort((a, b) => a.x - b.x);
      const text = cells.map((c) => c.text.trim()).join(' ');
      const d = text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (d && !date) date = `${d[3]}-${d[2]}-${d[1]}`;
      if (!header) {
        const parsed = parseEventTitle(text);
        if (parsed) { header = parsed; title = text; continue; }
      }
      const h = text.match(/^Seri\s+(\d+)\s*\/\s*(\d+)/i);
      if (h) { heat = Number(h[1]); heats = Number(h[2]); lastLane = null; continue; }
      if (!heat) continue;
      const year = cells.find((c) => c.x > 250 && c.x < 310 && /^(19|20)\d{2}$/.test(c.text.trim()));
      if (!year) continue;
      const laneCell = cells.find((c) => c.x < 65 && /^\d{1,2}$/.test(c.text.trim()));
      // Sıfırıncı kulvarın numarası yazılmaz; serinin ilk satırı numarasızsa 0. kulvardır.
      const lane: number | null = laneCell ? Number(laneCell.text) : lastLane === null ? 0 : null;
      lastLane = lane ?? lastLane;
      const name = cells.filter((c) => c.x >= 65 && c.x < year.x - 4).map((c) => c.text.trim()).join(' ');
      const club = cells.filter((c) => c.x > year.x + 20 && c.x < 500).map((c) => c.text.trim()).join(' ');
      const entry = cells.find((c) => c.x >= 500 && TIME.test(c.text.trim()))?.text.trim() ?? '';
      if (name) entries.push({ heat, heats, lane, maskedName: name, birthYear: Number(year.text), club, entryTime: entry });
    }
  }
  return header ? { ...header, title, date, entries } : null;
}

export type StartAthlete = { id: string; firstName: string; lastName: string; birthYear: number; gender: 'K' | 'E' };

/** Kulüp adı, doğum yılı ve yıldızlı ad birlikte tutan, tek adaylı satırları eşleştirir. */
export function matchStartEntries(event: StartEvent, clubName: string, athletes: StartAthlete[]) {
  const out: Array<{ athlete: StartAthlete; entry: StartEntry }> = [];
  for (const entry of event.entries) {
    if (classifyMatch(clubMatchScore(entry.club, clubName)) !== 'auto') continue;
    const candidates = athletes.filter((a) => a.gender === event.gender && a.birthYear === entry.birthYear && maskedNameMatches(entry.maskedName, `${a.firstName} ${a.lastName}`));
    if (candidates.length === 1) out.push({ athlete: candidates[0], entry });
  }
  return out;
}
