import { describe, expect, it } from 'vitest';
import { buildMonthlyReport, monthName, recentMonths } from './monthlyReport';
import type { AttendanceDoc, CoachComment, SwimResult } from './types';

const att = (date: string, mark: 'geldi' | 'gelmedi' | 'izinli', sid = 's1'): AttendanceDoc => ({ id: date, clubId: 'c', lessonId: 'l', coachId: 'k', date, marks: { [sid]: mark } });
const res = (date: string, timeMs: number, extra: Partial<SwimResult> = {}): SwimResult => ({ id: `${date}-${timeMs}`, clubId: 'c', studentId: 's1', stroke: 'serbest', distance: 50, timeMs, date, source: 'tyf', kind: 'yaris', ...extra });

describe('aylık rapor', () => {
  it('ay adı ve son aylar yıl geçişinde doğru', () => {
    expect(monthName('2026-10')).toBe('Ekim 2026');
    expect(recentMonths('2027-02-03', 4)).toEqual(['2027-02', '2027-01', '2026-12', '2026-11']);
  });

  it('devam yalnız o ayı sayar, izinli yüzdeye katılmaz', () => {
    const r = buildMonthlyReport({ month: '2026-10', today: '2026-11-01', studentId: 's1', results: [], comments: [], installments: [],
      attendance: [att('2026-10-02', 'geldi'), att('2026-10-05', 'geldi'), att('2026-10-07', 'gelmedi'), att('2026-10-09', 'izinli'), att('2026-09-30', 'gelmedi'), att('2026-10-12', 'gelmedi', 's2')] });
    expect(r.attendance).toEqual({ came: 2, missed: 1, excused: 1, total: 4, percent: 67 });
  });

  it('ayın en iyi derecesi önceki en iyiyle karşılaştırılır, yarış ve antrenman ayrı', () => {
    const r = buildMonthlyReport({ month: '2026-10', today: '2026-11-01', studentId: 's1', attendance: [], comments: [], installments: [],
      results: [res('2026-09-10', 36000), res('2026-10-04', 35500), res('2026-10-20', 35100), res('2026-10-21', 40000, { kind: 'antrenman' }), res('2026-10-22', 30000, { studentId: 's2' })] });
    expect(r.results).toHaveLength(2);
    expect(r.results[0]).toMatchObject({ kind: 'yaris', bestMs: 35100, previousMs: 36000, diffMs: -900 });
    expect(r.results[1]).toMatchObject({ kind: 'antrenman', bestMs: 40000, previousMs: null, diffMs: null });
  });

  it('yorum, beceri ve ödeme özetlenir', () => {
    const comments: CoachComment[] = [{ id: 'a', clubId: 'c', studentId: 's1', coachId: 'k', text: 'Dönüşleri iyi', date: '2026-10-15' }, { id: 'b', clubId: 'c', studentId: 's1', coachId: 'k', text: 'eski', date: '2026-09-15' }];
    const r = buildMonthlyReport({ month: '2026-10', today: '2026-11-10', studentId: 's1', attendance: [], results: [], comments,
      skills: { marks: { 'yuz-sokma': 'bagimsiz', 'nefes-verme': 'destekle' }, updatedAt: new Date(2026, 9, 20).getTime() },
      installments: [
        { no: 1, dueDate: '2026-10-01', amountKurus: 1000, paidAt: '2026-10-03' },
        { no: 2, dueDate: '2026-11-01', amountKurus: 1000 },
        { no: 3, dueDate: '2026-12-01', amountKurus: 1500 },
      ] });
    expect(r.comments).toEqual([{ date: '2026-10-15', text: 'Dönüşleri iyi' }]);
    expect(r.skills).toMatchObject({ independent: 1, working: ['Su altında nefes verme (baloncuk)'], next: 'Su altında nefes verme (baloncuk)', updatedInMonth: true });
    expect(r.payment).toEqual({ paidInMonthKurus: 1000, remainingKurus: 2500, overdueKurus: 1000, next: { dueDate: '2026-11-01', amountKurus: 1000 } });
  });
});
