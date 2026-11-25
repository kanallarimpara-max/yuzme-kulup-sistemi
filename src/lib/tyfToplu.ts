// TYF'nin "Yüzme / Sonuçlar" sayfasındaki toplu sonuç PDF'lerini (Splash Meet Manager) okur ve kulüp sporcularıyla eşleştirir.
// Saf fonksiyonlardır: GitHub'daki günlük iş ve testler aynı kodu kullanır.
import { classifyMatch, clubMatchScore, normalizeName, parseSwimTime, type Stroke } from './rules.ts';
import { parseEventTitle, resultKey, type PdfItem } from './tyf.ts';

export const RESULT_LIST_URL = 'https://www.tyf.gov.tr/spor/yuzme/dosyalar/sonuclar.html';
const FILE_HOST = 'https://dosya.tyf.gov.tr/';

export type ResultFile = { id: string; url: string; title: string; month: string };
export type TopluRow = { name: string; birthYear: number; club: string; timeMs: number | null };
export type TopluEvent = { no: number; gender: 'K' | 'E'; distance: number; stroke: Stroke; date: string; rows: TopluRow[] };

const decode = (s: string) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Dosya kimliği adresten türetilir; aynı dosya iki kez işlenmez. */
export const resultFileId = (url: string) => normalizeName(url.replace(FILE_HOST, '').replace(/\.pdf$/i, '')).replace(/ /g, '-').slice(0, 120);

/** Sonuçlar sayfasındaki PDF bağlantılarını başlıklarıyla birlikte, sayfadaki sırayla (en yeni önce) çıkarır. */
export function parseResultList(html: string): ResultFile[] {
  const out = new Map<string, ResultFile>();
  for (const m of html.matchAll(/<a\s+href="(https:\/\/dosya\.tyf\.gov\.tr\/[^"]+?\.pdf)"[^>]*>([^<]{3,400})<\/a>/gi)) {
    const url = m[1];
    const title = decode(m[2]);
    if (out.has(url) || !title) continue;
    out.set(url, { id: resultFileId(url), url, title, month: url.match(/\/(\d{4}-\d{2})\//)?.[1] ?? '' });
  }
  return [...out.values()];
}

type Line = { y: number; cells: PdfItem[]; text: string };

const linesOf = (page: PdfItem[]): Line[] => {
  const rows = new Map<number, PdfItem[]>();
  for (const item of page) {
    if (!item.text.trim()) continue;
    const y = Math.round(item.y);
    rows.set(y, [...(rows.get(y) ?? []), item]);
  }
  return [...rows.entries()].sort((a, b) => b[0] - a[0]).map(([y, cells]) => {
    const sorted = cells.sort((a, b) => a.x - b.x);
    return { y, cells: sorted, text: sorted.map((c) => c.text.trim()).join(' ') };
  });
};

const TIME = /^(?:\d+:)?\d{1,2}[.,]\d{2}$/;

/** "16" gibi iki haneli doğum yılını tam yıla çevirir. */
export function fullBirthYear(text: string, now = new Date()) {
  const n = Number(text);
  if (text.length === 4) return n;
  const yy = now.getFullYear() % 100;
  return n <= yy + 1 ? 2000 + n : 1900 + n;
}

/** Toplu sonuç PDF'inin bütün sayfalarından bireysel yarışları çıkarır. Bayrak yarışları atlanır. */
export function parseTopluPages(pages: PdfItem[][], now = new Date()): TopluEvent[] {
  const events = new Map<number, TopluEvent>();
  let current: TopluEvent | null = null;
  let ybX = 0;
  let timeX = 0;
  // Bazı dosyalarda doğum yılı (YB) yerine yaş yazar; TYF yaşı yarış yılı eksi doğum yılıdır.
  let ageColumn = false;
  for (const page of pages) {
    for (const line of linesOf(page)) {
      const head = line.text.match(/^Yarış\s+(\d+)\b/i);
      if (head) {
        const no = Number(head[1]);
        const title = parseEventTitle(line.text.replace(/^Yarış\s+\d+\s*,?/i, ''));
        current = title ? (events.get(no) ?? { no, ...title, date: '', rows: [] }) : null;
        if (current) events.set(no, current);
        continue;
      }
      if (!current) continue;
      const date = line.text.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
      if (date && !current.date) {
        current.date = `${date[3]}-${date[2].padStart(2, '0')}-${date[1].padStart(2, '0')}`;
        continue;
      }
      const yb = line.cells.find((c) => /^(YB|Yaş)$/i.test(c.text.trim()));
      if (yb) {
        ybX = yb.x;
        ageColumn = /^Yaş$/i.test(yb.text.trim());
        timeX = line.cells.find((c) => /Zaman/i.test(c.text))?.x ?? 0;
        continue;
      }
      if (!ybX || !timeX) continue;
      const year = line.cells.find((c) => Math.abs(c.x - ybX) <= 8 && (ageColumn ? /^\d{1,2}$/ : /^(\d{2}|\d{4})$/).test(c.text.trim()));
      if (!year) continue;
      const name = line.cells.filter((c) => c.x < ybX - 4 && !/^\d+\.?$/.test(c.text.trim())).map((c) => c.text.trim()).join(' ').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
      const club = line.cells.filter((c) => c.x > ybX + 6 && c.x < timeX - 15).map((c) => c.text.trim()).join(' ').trim();
      const time = line.cells.find((c) => c.x >= timeX - 18 && c.x <= timeX + 25 && TIME.test(c.text.trim()));
      if (!name || !club) continue;
      const birthYear = ageColumn ? Number((current.date || now.toISOString()).slice(0, 4)) - Number(year.text) : fullBirthYear(year.text.trim(), now);
      current.rows.push({ name, birthYear, club, timeMs: time ? parseSwimTime(time.text) : null });
    }
  }
  return [...events.values()].filter((e) => e.rows.length && e.date);
}

export type TopluAthlete = { id: string; clubId: string; parentId?: string; firstName: string; lastName: string; birthYear: number; gender: 'K' | 'E' };
export type TopluResult = {
  id: string; clubId: string; studentId: string; stroke: Stroke; distance: number; timeMs: number; date: string; meet: string; pool?: '25m' | '50m';
};

const nameKey = (s: string) => normalizeName(s).split(' ').filter(Boolean).sort().join(' ');

/** Tam ad, doğum yılı, cinsiyet ve kulüp birlikte tutmalı; aynı kulüpte iki aday varsa hiçbiri yazılmaz. */
export function matchTopluEvents(events: TopluEvent[], athletes: TopluAthlete[], clubNames: Record<string, string>, meet: string, pool?: '25m' | '50m'): TopluResult[] {
  const byKey = new Map<string, TopluAthlete[]>();
  for (const a of athletes) {
    const key = `${nameKey(`${a.firstName} ${a.lastName}`)}|${a.birthYear}|${a.gender}`;
    byKey.set(key, [...(byKey.get(key) ?? []), a]);
  }
  const best = new Map<string, TopluResult>();
  for (const event of events) {
    for (const row of event.rows) {
      if (!row.timeMs) continue;
      const candidates = (byKey.get(`${nameKey(row.name)}|${row.birthYear}|${event.gender}`) ?? [])
        .filter((a) => clubNames[a.clubId] && classifyMatch(clubMatchScore(row.club, clubNames[a.clubId])) === 'auto');
      if (candidates.length !== 1) continue;
      const a = candidates[0];
      const id = resultKey(a.id, event);
      const prev = best.get(id);
      if (prev && prev.timeMs <= row.timeMs) continue;
      best.set(id, { id, clubId: a.clubId, studentId: a.id, stroke: event.stroke, distance: event.distance, timeMs: row.timeMs, date: event.date, meet, ...(pool ? { pool } : {}) });
    }
  }
  return [...best.values()];
}

export type MeetHint = { title: string; info: string; startDate: string; endDate?: string };

/** Havuz boyu PDF'te yazmaz: başlıktaki "uzun/kısa kulvar" ya da aynı şehir ve tarihteki canlı sonuç kaydı kullanılır. Bulunamazsa boş kalır. */
export function poolFor(title: string, dates: string[], meets: MeetHint[]): '25m' | '50m' | undefined {
  const t = normalizeName(title);
  if (/\bkisa kulvar\b/.test(t)) return '25m';
  if (/\buzun kulvar\b/.test(t)) return '50m';
  for (const m of meets) {
    const city = normalizeName(m.info.split('|')[0] ?? '');
    const sameDay = dates.some((d) => m.startDate <= d && d <= (m.endDate || m.startDate));
    if (!city || !sameDay || !` ${t} `.includes(` ${city} `)) continue;
    const pool = m.info.match(/(25|50)\s*Metre/i)?.[1];
    if (pool) return pool === '25' ? '25m' : '50m';
  }
  return undefined;
}

/** Yarış adını ilk sayfanın en üstündeki satırlardan ("... MÜSABAKASI" + "NİĞDE, 3. - 5.7.2026") alır. */
export function topluTitle(pages: PdfItem[][]): string {
  const lines = linesOf(pages[0] ?? []);
  const stop = lines.findIndex((l) => /^(Yarış\s+\d+|\d+\s*-\s*\d+\.\s*GÜN)/i.test(l.text));
  return lines.slice(0, stop > 0 ? Math.min(stop, 3) : 2).map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim().slice(0, 200);
}
