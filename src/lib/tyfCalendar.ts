// TYF sezon faaliyet takvimi PDF'inden yarış listesi çıkarır. Tablo sütunları x konumuna göre ayrılır:
// tarih | müsabaka adı | 25/50 m | kategori | yer. Bir yarışın yazıları tarih satırının biraz üstüne ve altına taşabilir.

export type CalendarItem = { x: number; y: number; w?: number; text: string };
export type CalendarEvent = {
  id: string;
  title: string;
  dateText: string;
  startDate: string;
  endDate: string;
  pool: string;
  category: string;
  place: string;
  international: boolean;
};

const MONTHS = ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'];
const MONTH_RE = new RegExp(`(${MONTHS.join('|')})`);
const COLUMNS = [
  { key: 'date', to: 100 },
  { key: 'title', to: 279 },
  { key: 'pool', to: 318 },
  { key: 'category', to: 463 },
  { key: 'place', to: Infinity },
] as const;
type Column = (typeof COLUMNS)[number]['key'];
type Line = { y: number; cells: Record<Column, string> };
const INTERNATIONAL = /DÜNYA|AVRUPA|MULTINATIONS|OLİMPİYAT|EYOF|COMEN|CENTRAL EUROPEAN|AKDENİZ|BALKAN|İSLAM/;

const columnOf = (x: number): Column => COLUMNS.find((c) => x < c.to)!.key;
const tidy = (s: string) => s.replace(/\s+/g, ' ').replace(/\s*-\s*/g, ' - ').trim();

/** Aynı satırdaki yazıları sütunlara böler. Bitişik parçalar ("202" + "6") boşluksuz birleşir. */
function toLines(items: CalendarItem[]): Line[] {
  const rows: { y: number; items: CalendarItem[] }[] = [];
  for (const item of items) {
    if (!item.text.trim()) continue;
    const row = rows.find((r) => Math.abs(r.y - item.y) <= 2);
    if (row) row.items.push(item);
    else rows.push({ y: item.y, items: [item] });
  }
  return rows.map(({ y, items: parts }) => {
    const cells = { date: '', title: '', pool: '', category: '', place: '' } as Record<Column, string>;
    const ends = {} as Record<Column, number>;
    for (const p of [...parts].sort((a, b) => a.x - b.x)) {
      const col = columnOf(p.x);
      const glued = p.w !== undefined && ends[col] !== undefined && p.x - ends[col] < 0.8;
      cells[col] = cells[col] ? `${cells[col]}${glued ? '' : ' '}${p.text.trim()}` : p.text.trim();
      ends[col] = p.x + (p.w ?? 0);
    }
    return { y, cells };
  }).sort((a, b) => b.y - a.y);
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const lastDay = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** "1 - 3 EKİM 2026", "29 HAZİRAN - 4 TEMMUZ 2027", "EKİM 2027" biçimlerini tarihe çevirir. */
export function parseCalendarDate(text: string): { startDate: string; endDate: string } | null {
  // PDF'te bölünen sayılar ("202 6", "1 7") birleştirilir; tire ile ayrılanlar ayrı kalır.
  const t = tidy(text.toLocaleUpperCase('tr-TR')).replace(/(\d)\s+(?=\d)/g, '$1');
  const year = Number(t.match(/(20\d\d)\s*$/)?.[1] ?? t.match(/20\d\d/)?.[0]);
  if (!year) return null;
  const parts = [...t.matchAll(new RegExp(`(?:(\\d{1,2})\\s*)?${MONTH_RE.source}`, 'g'))];
  if (!parts.length) return null;
  const month = (name: string) => MONTHS.indexOf(name) + 1;
  const last = parts[parts.length - 1];
  const endMonth = month(last[2]);
  const first = parts[0];
  const startMonth = month(first[2]);
  const range = t.match(/^(\d{1,2})\s*-\s*(\d{1,2})\s*\D/);
  let startDay: number;
  let endDay: number;
  if (parts.length > 1) {
    startDay = Number(first[1] ?? 1);
    endDay = Number(last[1] ?? lastDay(year, endMonth));
  } else if (range) {
    startDay = Number(range[1]);
    endDay = Number(range[2]);
  } else if (first[1]) {
    startDay = endDay = Number(first[1]);
  } else {
    startDay = 1;
    endDay = lastDay(year, endMonth);
  }
  const startYear = startMonth > endMonth ? year - 1 : year;
  if (startDay < 1 || startDay > 31 || endDay < 1 || endDay > 31) return null;
  return { startDate: iso(startYear, startMonth, startDay), endDate: iso(year, endMonth, endDay) };
}

const eventId = (title: string, startDate: string) => {
  let h = 0x811c9dc5;
  const key = `${startDate}|${title}`;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 0x01000193);
  return `${startDate}-${(h >>> 0).toString(36)}`;
};

/** Takvim sayfalarındaki yarışları tarih sırasıyla döndürür. Ayı yazmayan satırlar (milli takım kampları) alınmaz. */
export function parseCalendarPages(pages: CalendarItem[][]): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  for (const items of pages) {
    const lines = toLines(items).filter((l) => !/TARİH|SEZONU|www\./.test(`${l.cells.date} ${l.cells.title} ${l.cells.place}`) || MONTH_RE.test(l.cells.date));
    // Tarihinde ay adı geçen satır bir yarışı başlatır. Yalnız yıl yazan satır, yılı eksik tarihin devamıdır ya da ayrı bir kamptır.
    const anchors: { line: Line; parts: Line[]; keep: boolean }[] = [];
    for (const line of lines) {
      const d = line.cells.date.replace(/\s/g, '');
      if (MONTH_RE.test(line.cells.date)) anchors.push({ line, parts: [line], keep: true });
      else if (/^20\d\d$|^202\d?$/.test(d)) {
        const prev = anchors[anchors.length - 1];
        if (prev && prev.line.y - line.y <= 10 && !/20\d\d/.test(prev.line.cells.date.replace(/\s/g, ''))) prev.parts.push(line);
        else anchors.push({ line, parts: [line], keep: false });
      }
    }
    if (!anchors.length) continue;
    for (const line of lines) {
      if (anchors.some((a) => a.parts.includes(line))) continue;
      const nearest = anchors.reduce((best, a) => (Math.abs(a.line.y - line.y) < Math.abs(best.line.y - line.y) ? a : best));
      if (Math.abs(nearest.line.y - line.y) <= 26) nearest.parts.push(line);
    }
    for (const a of anchors.filter((x) => x.keep)) {
      const sorted = [...a.parts].sort((p, q) => q.y - p.y);
      const join = (col: Column) => tidy(sorted.map((p) => p.cells[col]).filter(Boolean).join(' '));
      const dateText = join('date').replace(/(\d)\s+(?=\d)/g, '$1');
      const dates = parseCalendarDate(dateText);
      const title = join('title').replace(/\bY ÜZME\b/g, 'YÜZME').replace(/YAŞULUSAL/g, 'YAŞ ULUSAL').replace(/\bYILIDIZ\b/g, 'YILDIZ');
      if (!dates || !title) continue;
      const place = join('place');
      events.push({
        id: eventId(title, dates.startDate), title, dateText, ...dates,
        pool: join('pool').replace(/\s/g, '').replace('/', ' / '), category: join('category').replace(/(\d)\s+(?=\d)/g, '$1'), place,
        international: INTERNATIONAL.test(title),
      });
    }
  }
  return [...new Map(events.map((e) => [e.id, e])).values()].sort((a, b) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title, 'tr'));
}

/** Gelen takvim verisinin biçimi doğru mu (sunucuya gönderilmeden ve uygulamada okunurken bakılır). */
export function validCalendar(events: unknown): events is CalendarEvent[] {
  const date = /^20\d\d-\d\d-\d\d$/;
  const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
  return Array.isArray(events) && events.length > 0 && events.length <= 300 && events.every((e) => e && typeof e === 'object'
    && text(e.id, 40) && text(e.title, 200) && e.title.length > 0 && text(e.dateText, 80) && date.test(e.startDate) && date.test(e.endDate)
    && e.startDate <= e.endDate && text(e.pool, 20) && text(e.category, 200) && text(e.place, 80) && typeof e.international === 'boolean');
}
