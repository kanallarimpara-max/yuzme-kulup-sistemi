import { describe, expect, it } from 'vitest';
import { aiGroupPayload, athleteProfile, groupSummary } from './sessionAnalysis';
import type { Standard } from './rules';
import type { SwimResult } from './types';

const r = (studentId: string, stroke: SwimResult['stroke'], distance: number, timeMs: number, kind?: 'antrenman'): SwimResult =>
  ({ id: `${studentId}${stroke}${distance}${timeMs}`, clubId: 'c', studentId, stroke, distance, timeMs, date: '2026-10-01', source: 'manuel', kind, pool: '25m' });
const std = (stroke: Standard['stroke'], distance: number, timeMs: number): Standard => ({ title: 'Kurgu', gender: 'K', age: 12, maxAge: 12, stroke, distance, timeMs, pool: '25m' });
const ayse = { id: 'a', gender: 'K' as const, birthYear: 2014 };

describe('ders analizi', () => {
  it('barajla stilleri sıralar, güçlü ve eksik stili bulur', () => {
    const standards = [std('serbest', 50, 35000), std('kurbaga', 50, 45000), std('sirt', 50, 40000)];
    const p = athleteProfile(ayse, [r('a', 'serbest', 50, 34000), r('a', 'kurbaga', 50, 50000), r('a', 'sirt', 50, 41000)], standards, 2026);
    expect(p.strongest).toBe('serbest');
    expect(p.weakest).toBe('kurbaga');
    expect(p.strokes.find((s) => s.stroke === 'serbest')!.score).toBe(-2.9);
    expect(p.untested).toEqual(['kelebek', 'karisik']);
  });

  it('baraj yoksa kendi serbestine göre kıyaslar', () => {
    const p = athleteProfile(ayse, [r('a', 'serbest', 50, 40000), r('a', 'kelebek', 50, 44000), r('a', 'kurbaga', 50, 60000)], [], 2026);
    expect(p.strokes.find((s) => s.stroke === 'kelebek')!.basis).toBe('serbest');
    expect(p.strongest).toBe('kelebek');
    expect(p.weakest).toBe('kurbaga');
  });

  it('yarış yoksa antrenman derecesi kullanılır ve fark hesaplanır', () => {
    const results = [r('a', 'serbest', 50, 34000), r('a', 'serbest', 50, 36000, 'antrenman'), r('a', 'kurbaga', 50, 47000, 'antrenman')];
    const p = athleteProfile(ayse, results, [std('serbest', 50, 35000), std('kurbaga', 50, 45000)], 2026);
    expect(p.strokes.find((s) => s.stroke === 'kurbaga')!.score).toBe(4.4);
    expect(p.raceTrainingGap).toBe(5.9);
  });

  it('grup özeti ve yapay zekâ verisi ad içermez', () => {
    const profiles = [athleteProfile(ayse, [r('a', 'serbest', 50, 34000)], [std('serbest', 50, 35000)], 2026), athleteProfile({ ...ayse, id: 'b' }, [], [], 2026)];
    const g = groupSummary(profiles);
    expect(g.noData).toBe(1);
    expect(g.strokes.find((s) => s.stroke === 'serbest')!.average).toBe(-2.9);
    const payload = JSON.stringify(aiGroupPayload(profiles));
    expect(payload).not.toContain('"a"');
    expect(payload).toContain('"no":2');
  });
});
