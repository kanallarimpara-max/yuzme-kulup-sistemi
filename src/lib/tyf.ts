import { classifyMatch, clubMatchScore, normalizeName, parseSwimTime, toIso, type Stroke } from './rules';

export type PdfItem = { x: number; y: number; text: string };
export type TyfRow = {
  rank: number | null; maskedName: string; birthYear: number; club: string; timeMs: number | null; status: string; lapsMs: number[];
};
export type TyfEvent = { gender: 'K' | 'E'; distance: number; stroke: Stroke; date: string; meet: string; rows: TyfRow[] };

const STROKES: Array<[RegExp, Stroke]> = [
  [/serbest/i, 'serbest'], [/s[ıi]rt/i, 'sirt'], [/kurba/i, 'kurbaga'], [/kelebek/i, 'kelebek'], [/kar[ıi][sş][ıi]k/i, 'karisik'],
];
const TIME = /^(?:\d+:)?\d{1,2}[.,]\d{2}$/;
const STATUS = /^(DSQ|DNS|DNF|DQ|SW|KTL|GİRMEDİ|DİSKALİFİYE)/i;

/** "Kadınlar 100m Serbest" başlığını çözer. Bayrak yarışları bireysel derece olmadığı için atlanır. */
export function parseEventTitle(title: string) {
  if (/\d\s*x\s*\d/i.test(title)) return null;
  const distance = title.match(/(\d{2,4})\s*m/i);
  const stroke = STROKES.find(([re]) => re.test(title))?.[1];
  const gender = /kad[ıi]n|k[ıi]z|bayan/i.test(title) ? 'K' : /erkek/i.test(title) ? 'E' : null;
  return distance && stroke && gender ? { distance: Number(distance[1]), stroke, gender: gender as 'K' | 'E' } : null;
}

const lapsFrom = (texts: string[]) => {
  const laps = new Map<number, number>();
  for (const text of texts) {
    for (const m of text.matchAll(/(\d{2,4})m\s+((?:\d+:)?\d{1,2}[.,]\d{2})/g)) {
      const value = parseSwimTime(m[2]);
      if (value) laps.set(Number(m[1]), value);
    }
  }
  return [...laps.entries()].sort((a, b) => a[0] - b[0]).map(([, ms]) => ms);
};

/** PDF sayfalarındaki konumlu metinden sporcu satırlarını çıkarır. */
export function parseResultPages(pages: PdfItem[][]): TyfEvent | null {
  let header: ReturnType<typeof parseEventTitle> = null;
  let date = '';
  let meet = '';
  const rows: TyfRow[] = [];

  for (const page of pages) {
    const items = page.filter((i) => i.text.trim()).sort((a, b) => b.y - a.y || a.x - b.x);
    const tableTop = items.find((i) => /^Sıra$/i.test(i.text.trim()))?.y ?? Infinity;
    for (const item of items) {
      if (item.y <= tableTop) continue;
      if (!meet && item.y > tableTop + 40) meet = item.text.trim();
      const d = item.text.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (d && !date) date = `${d[3]}-${d[2]}-${d[1]}`;
      header ??= parseEventTitle(item.text);
    }
    const body = items.filter((i) => i.y < tableTop);
    const anchors = body.filter((i) => i.x > 360 && i.x < 420 && /^(19|20)\d{2}$/.test(i.text.trim()));
    anchors.forEach((anchor, index) => {
      const top = anchor.y + 7;
      const next = anchors[index + 1];
      const bottom = next ? next.y + 7 : anchor.y - 30;
      const band = body.filter((i) => i.y <= top && i.y > bottom);
      const nameCells = band.filter((i) => i.x > 100 && i.x < 340).sort((a, b) => b.y - a.y);
      if (!nameCells.length) return;
      const timeCell = band.find((i) => i.x >= 430 && TIME.test(i.text.trim()));
      // TYF diskalifiyeleri sayfa sonunda ayrı listeler; o listedeki DSQ üstteki sporcunun derecesini silmemeli.
      const statusCell = band.find((i) => i.x >= 430 && STATUS.test(i.text.trim()));
      const rankCell = band.find((i) => i.x < 70 && /^\d+$/.test(i.text.trim()));
      rows.push({
        rank: rankCell ? Number(rankCell.text) : null,
        maskedName: nameCells[0].text.trim(),
        birthYear: Number(anchor.text),
        club: nameCells[1]?.text.trim() ?? '',
        timeMs: timeCell ? parseSwimTime(timeCell.text) : null,
        status: statusCell?.text.trim() ?? '',
        lapsMs: lapsFrom(band.filter((i) => i.x >= 400).map((i) => i.text)),
      });
    });
  }
  return header ? { ...header, date: date || toIso(new Date()), meet, rows } : null;
}

/** TYF'nin yıldızlı adını kayıtlı adla harf harf karşılaştırır: "Ay** Y***z" = "Ayşe Yılmaz". */
export function maskedNameMatches(masked: string, fullName: string) {
  const a = masked.trim().toLocaleLowerCase('tr-TR').split(/\s+/);
  const b = fullName.trim().toLocaleLowerCase('tr-TR').split(/\s+/);
  if (a.length !== b.length) return false;
  return a.every((word, w) => {
    const target = [...b[w]];
    const pattern = [...word];
    return pattern.length === target.length && pattern.every((c, i) => c === '*' || c === target[i]);
  });
}

export type Athlete = { id: string; firstName: string; lastName: string; birthYear: number; gender: 'K' | 'E' };
export type TyfMatch = { row: TyfRow; athlete: Athlete; confidence: 'auto' | 'review'; clubScore: number };

/** Kulüp, doğum yılı, cinsiyet ve ad deseni birlikte tutmalı. Birden çok aday varsa insan onayına düşer. */
export function matchAthletes(event: TyfEvent, clubName: string, athletes: Athlete[]): TyfMatch[] {
  const out: TyfMatch[] = [];
  for (const row of event.rows) {
    const clubScore = clubMatchScore(row.club, clubName);
    const clubClass = classifyMatch(clubScore);
    if (clubClass === 'none' || row.timeMs === null) continue;
    const candidates = athletes.filter((a) => a.gender === event.gender && a.birthYear === row.birthYear && maskedNameMatches(row.maskedName, `${a.firstName} ${a.lastName}`));
    if (!candidates.length) continue;
    out.push({ row, athlete: candidates[0], clubScore, confidence: clubClass === 'auto' && candidates.length === 1 ? 'auto' : 'review' });
  }
  return out;
}

export const resultKey = (studentId: string, e: Pick<TyfEvent, 'date' | 'stroke' | 'distance'>) =>
  normalizeName(`tyf ${studentId} ${e.date} ${e.stroke} ${e.distance}`).replace(/ /g, '-');

/** Bayrak ve start listesi gibi tabloya çevrilemeyen resmi PDF'i uygulamanın içinde çizer. */
export async function drawPdf(data: ArrayBuffer, host: HTMLElement) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data }).promise;
  host.replaceChildren();
  for (let n = 1; n <= doc.numPages; n += 1) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement('canvas');
    canvas.width = Math.floor(viewport.width);
    canvas.height = Math.floor(viewport.height);
    canvas.setAttribute('aria-label', `Resmi liste sayfa ${n}`);
    host.append(canvas);
    await page.render({ canvas, canvasContext: canvas.getContext('2d')!, viewport }).promise;
  }
}

/** Tarayıcıda seçilen sonuç PDF'ini okur. */
export async function readResultPdf(data: ArrayBuffer): Promise<TyfEvent | null> {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
  const doc = await pdfjs.getDocument({ data }).promise;
  const pages: PdfItem[][] = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.flatMap((i) => ('str' in i ? [{ x: i.transform[4], y: i.transform[5], text: i.str }] : [])));
  }
  return parseResultPages(pages);
}
