// Arayüzden bağımsız iş kuralları. Para kuruş, süre milisaniye olarak tutulur.

export type IsoDate = string; // YYYY-MM-DD, yerel takvim günü

const pad = (n: number) => String(n).padStart(2, '0');
const parse = (d: IsoDate) => {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day, 12);
};
export const toIso = (d: Date): IsoDate => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Haftanın günleri JS düzenindedir: 0 pazar, 1 pazartesi ... 6 cumartesi. */
export function lessonDates(start: IsoDate, weekdays: number[], sessionCount: number): IsoDate[] {
  if (!weekdays.length || sessionCount <= 0) return [];
  const days = new Set(weekdays);
  const out: IsoDate[] = [];
  const cursor = parse(start);
  while (out.length < sessionCount) {
    if (days.has(cursor.getDay())) out.push(toIso(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

export const lessonEndDate = (start: IsoDate, weekdays: number[], sessionCount: number): IsoDate | null =>
  lessonDates(start, weekdays, sessionCount).at(-1) ?? null;

/** Ay sonuna denk gelen vadeyi hedef ayın son gününe çeker (31 Ocak -> 28 Şubat). */
export function addMonths(date: IsoDate, months: number): IsoDate {
  const [y, m, d] = date.split('-').map(Number);
  const last = new Date(y, m - 1 + months + 1, 0, 12).getDate();
  return toIso(new Date(y, m - 1 + months, Math.min(d, last), 12));
}

export type Discount = { type: 'percent' | 'amount'; value: number };

export function applyDiscount(priceKurus: number, discount?: Discount | null): number {
  if (!discount) return priceKurus;
  const off = discount.type === 'percent' ? Math.round((priceKurus * discount.value) / 100) : discount.value;
  return Math.max(0, priceKurus - off);
}

export type Installment = { no: number; dueDate: IsoDate; amountKurus: number };

/** Faiz toplam tutara bir kez uygulanır, yuvarlama farkı son taksite eklenir. */
export function buildInstallments(netKurus: number, count: number, interestPercent: number, firstDue: IsoDate) {
  const n = Math.max(1, Math.floor(count));
  const totalKurus = Math.round(netKurus * (1 + (n > 1 ? interestPercent : 0) / 100));
  const base = Math.floor(totalKurus / n);
  const installments: Installment[] = Array.from({ length: n }, (_, i) => ({
    no: i + 1,
    dueDate: addMonths(firstDue, i),
    amountKurus: i === n - 1 ? totalKurus - base * (n - 1) : base,
  }));
  return { totalKurus, installments };
}

export const redeemKurus = (credits: number, rateCredits: number, rateKurus: number) =>
  rateCredits > 0 ? Math.floor((credits * rateKurus) / rateCredits) : 0;

export type LedgerEntry = { delta: number; status?: 'posted' | 'pending' | 'rejected' };
export const creditBalance = (entries: LedgerEntry[]) =>
  entries.reduce((sum, e) => sum + ((e.status ?? 'posted') === 'posted' ? e.delta : 0), 0);

const TR: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u' };
const CLUB_WORDS = new Set(['spor', 'sporlari', 'kulubu', 'kulup', 'sk', 'gsk', 'genclik', 'yuzme', 'ihtisas', 'dernegi']);

export const normalizeName = (value: string) =>
  value
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLowerCase()
    .replace(/[çğıöşü]/g, (c) => TR[c] ?? c)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

const clubCore = (value: string) => {
  const words = normalizeName(value).split(' ').filter(Boolean);
  const core = words.filter((w) => !CLUB_WORDS.has(w));
  return (core.length ? core : words).join('');
};

const bigrams = (s: string) => Array.from({ length: Math.max(0, s.length - 1) }, (_, i) => s.slice(i, i + 2));

export function similarity(a: string, b: string): number {
  if (a === b) return a ? 1 : 0;
  const x = bigrams(a);
  const y = bigrams(b);
  if (!x.length || !y.length) return 0;
  const pool = [...y];
  let hits = 0;
  for (const g of x) {
    const i = pool.indexOf(g);
    if (i >= 0) {
      hits += 1;
      pool.splice(i, 1);
    }
  }
  return (2 * hits) / (x.length + y.length);
}

export const clubMatchScore = (a: string, b: string) => similarity(clubCore(a), clubCore(b));

/** 0.92 üstü otomatik, 0.72-0.92 arası insan onayı, altı eşleşmez. */
export function classifyMatch(score: number): 'auto' | 'review' | 'none' {
  if (score >= 0.92) return 'auto';
  return score >= 0.72 ? 'review' : 'none';
}

/** "1:02.34", "62.34" ve "00:01:02.34" biçimlerini milisaniyeye çevirir. */
export function parseSwimTime(value: string): number | null {
  const m = value.trim().replace(',', '.').match(/^(?:(\d+):)?(?:(\d+):)?(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (!m) return null;
  const parts = [m[1], m[2]].filter((p) => p !== undefined).map(Number);
  const hours = parts.length === 2 ? parts[0] : 0;
  const minutes = parts.length ? parts[parts.length - 1] : 0;
  const seconds = Number(m[3]);
  if (parts.length && seconds >= 60) return null;
  const fraction = m[4] ? Number(m[4].padEnd(3, '0')) : 0;
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + fraction;
}

export function formatSwimTime(ms: number): string {
  const cs = Math.round(ms / 10);
  const min = Math.floor(cs / 6000);
  const sec = Math.floor((cs % 6000) / 100);
  const rest = cs % 100;
  return `${min ? `${min}:${pad(sec)}` : sec}.${pad(rest)}`;
}

const minutes = (time: string) => {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
};

export const timesOverlap = (aStart: string, aEnd: string, bStart: string, bEnd: string) =>
  minutes(aStart) < minutes(bEnd) && minutes(bStart) < minutes(aEnd);

/** Dersin kapsadığı tam saat dilimleri: 17:30-19:00 -> 17, 18. */
export function hourSlots(start: string, end: string): number[] {
  const first = Math.floor(minutes(start) / 60);
  const last = Math.ceil(minutes(end) / 60);
  return Array.from({ length: Math.max(0, last - first) }, (_, i) => first + i);
}

export type AvailabilitySlot = { coachId: string; branchId: string; weekday: number; hour: number };
export type LessonTime = {
  id?: string; coachIds: string[]; weekdays: number[]; startTime: string; endTime: string; startDate: string; endDate: string;
};
export type CoachFit = 'uygun' | 'musait-degil' | 'cakisiyor';

export function coachFit(coachId: string, branchId: string, lesson: LessonTime, slots: AvailabilitySlot[], others: LessonTime[]): CoachFit {
  const busy = others.some((o) =>
    o.id !== lesson.id && o.coachIds.includes(coachId) && o.weekdays.some((d) => lesson.weekdays.includes(d)) &&
    o.startDate <= lesson.endDate && lesson.startDate <= o.endDate && timesOverlap(o.startTime, o.endTime, lesson.startTime, lesson.endTime));
  if (busy) return 'cakisiyor';
  const hours = hourSlots(lesson.startTime, lesson.endTime);
  const free = lesson.weekdays.every((weekday) => hours.every((hour) =>
    slots.some((s) => s.coachId === coachId && s.branchId === branchId && s.weekday === weekday && s.hour === hour)));
  return free ? 'uygun' : 'musait-degil';
}

export type Stroke ='serbest' | 'kelebek' | 'sirt' | 'kurbaga' | 'karisik';
export const EVENTS: Record<Stroke, number[]> = {
  serbest: [50, 100, 200, 400, 800, 1500],
  kelebek: [50, 100, 200],
  sirt: [50, 100, 200],
  kurbaga: [50, 100, 200],
  karisik: [100, 200, 400],
};

export type Standard = {
  title: string;
  gender: 'K' | 'E';
  age: number;
  stroke: Stroke;
  distance: number;
  timeMs: number;
};
export type Result = { stroke: Stroke; distance: number; timeMs: number };

export function passedStandards(
  results: Result[],
  standards: Standard[],
  athlete: { gender: 'K' | 'E'; birthYear: number },
  seasonYear: number,
) {
  const age = seasonYear - athlete.birthYear;
  return standards.flatMap((standard) => {
    if (standard.gender !== athlete.gender || standard.age !== age) return [];
    const times = results
      .filter((r) => r.stroke === standard.stroke && r.distance === standard.distance)
      .map((r) => r.timeMs);
    if (!times.length) return [];
    const bestMs = Math.min(...times);
    return bestMs <= standard.timeMs ? [{ standard, bestMs }] : [];
  });
}
