// Veliye aylık rapor: seçilen ayın devamı, dereceleri, beceri karnesi, antrenör yorumları ve ödeme durumu.
// Rapor saklanmaz; velinin zaten görebildiği kayıtlardan her açılışta hesaplanır.
import { ALL_SKILLS, skillProgress, type SkillLevel } from './skills';
import type { AttendanceDoc, CoachComment, SwimResult } from './types';
import type { PaidInstallment } from './rules';

export { MONTHS_TR, monthName } from './reminders';
/** Bugünden geriye n ay: ["2026-11", "2026-10", ...] */
export function recentMonths(today: string, n: number) {
  let y = Number(today.slice(0, 4));
  let m = Number(today.slice(5, 7));
  return Array.from({ length: n }, () => {
    const out = `${y}-${String(m).padStart(2, '0')}`;
    m -= 1;
    if (m === 0) { m = 12; y -= 1; }
    return out;
  });
}

export type ResultLine = { stroke: SwimResult['stroke']; distance: number; kind: 'yaris' | 'antrenman'; bestMs: number; date: string; meet?: string; previousMs: number | null; diffMs: number | null };
export type MonthlyReport = {
  month: string;
  attendance: { came: number; missed: number; excused: number; total: number; percent: number | null };
  results: ResultLine[];
  skills: { independent: number; total: number; percent: number; working: string[]; next: string | null; updatedInMonth: boolean };
  comments: Array<{ date: string; text: string }>;
  payment: { paidInMonthKurus: number; remainingKurus: number; overdueKurus: number; next: { dueDate: string; amountKurus: number } | null };
};

type Input = {
  month: string; today: string; studentId: string;
  attendance: AttendanceDoc[]; results: SwimResult[]; comments: CoachComment[];
  skills?: { marks: Record<string, SkillLevel>; updatedAt?: number };
  installments: PaidInstallment[];
};

const inMonth = (date: string | undefined, month: string) => Boolean(date) && date!.slice(0, 7) === month;

export function buildMonthlyReport(i: Input): MonthlyReport {
  const marks = i.attendance.filter((a) => inMonth(a.date, i.month) && a.marks[i.studentId]).map((a) => a.marks[i.studentId]);
  const came = marks.filter((m) => m === 'geldi').length;
  const missed = marks.filter((m) => m === 'gelmedi').length;
  const excused = marks.filter((m) => m === 'izinli').length;
  // İzinli dersler devam yüzdesine katılmaz.
  const counted = came + missed;

  // Her branş ve tür için ayın en iyi derecesi, ay öncesindeki en iyi dereceyle karşılaştırılır.
  const own = i.results.filter((r) => r.studentId === i.studentId && r.timeMs > 0);
  const groups = new Map<string, ResultLine>();
  for (const r of own.filter((x) => inMonth(x.date, i.month))) {
    const kind = r.kind === 'antrenman' ? 'antrenman' : 'yaris';
    const key = `${kind}-${r.stroke}-${r.distance}`;
    const cur = groups.get(key);
    if (!cur || r.timeMs < cur.bestMs) groups.set(key, { stroke: r.stroke, distance: r.distance, kind, bestMs: r.timeMs, date: r.date, meet: r.meet, previousMs: null, diffMs: null });
  }
  const results = [...groups.values()].map((g) => {
    const before = own.filter((r) => r.date < `${i.month}-01` && r.stroke === g.stroke && r.distance === g.distance && (r.kind === 'antrenman' ? 'antrenman' : 'yaris') === g.kind);
    const previousMs = before.length ? Math.min(...before.map((r) => r.timeMs)) : null;
    return { ...g, previousMs, diffMs: previousMs === null ? null : g.bestMs - previousMs };
  }).sort((a, b) => (a.kind === b.kind ? a.distance - b.distance || a.stroke.localeCompare(b.stroke) : a.kind === 'yaris' ? -1 : 1));

  const sm = i.skills?.marks ?? {};
  const p = skillProgress(sm);
  const working = ALL_SKILLS.filter((s) => sm[s.id] && sm[s.id] !== 'bagimsiz').map((s) => s.label);
  const next = ALL_SKILLS.find((s) => sm[s.id] !== 'bagimsiz')?.label ?? null;
  const updated = i.skills?.updatedAt ? new Date(i.skills.updatedAt) : null;
  const updatedMonth = updated ? `${updated.getFullYear()}-${String(updated.getMonth() + 1).padStart(2, '0')}` : '';

  const comments = i.comments.filter((c) => c.studentId === i.studentId && inMonth(c.date, i.month))
    .sort((a, b) => a.date.localeCompare(b.date)).map((c) => ({ date: c.date, text: c.text }));

  const unpaid = i.installments.filter((x) => !x.paidAt).sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  const payment = {
    paidInMonthKurus: i.installments.filter((x) => inMonth(x.paidAt, i.month)).reduce((t, x) => t + x.amountKurus, 0),
    remainingKurus: unpaid.reduce((t, x) => t + x.amountKurus, 0),
    overdueKurus: unpaid.filter((x) => x.dueDate < i.today).reduce((t, x) => t + x.amountKurus, 0),
    next: unpaid[0] ? { dueDate: unpaid[0].dueDate, amountKurus: unpaid[0].amountKurus } : null,
  };

  return {
    month: i.month,
    attendance: { came, missed, excused, total: marks.length, percent: counted ? Math.round((came / counted) * 100) : null },
    results,
    skills: { ...p, working, next, updatedInMonth: updatedMonth === i.month },
    comments,
    payment,
  };
}
