import { EVENTS, type Standard, type Stroke } from './rules';
import type { SwimResult } from './types';
import { isRaceResult } from './types';

export const STROKES = Object.keys(EVENTS) as Stroke[];

/** Aynı mesafede serbeste göre olağan süre oranı. Baraj bulunmayan küçük yaşlarda stiller bununla kıyaslanır. */
const FREE_RATIO: Record<Stroke, number> = { serbest: 1, kelebek: 1.1, sirt: 1.12, kurbaga: 1.25, karisik: 1.13 };

export type Basis = 'baraj' | 'serbest';
export type EventBest = { distance: number; bestMs: number; gapPercent: number | null; basis: Basis | null; count: number };
export type StrokeProfile = { stroke: Stroke; race: EventBest | null; training: EventBest | null; score: number | null; basis: Basis | null };
export type AthleteProfile = {
  studentId: string; age: number; gender: 'K' | 'E';
  strokes: StrokeProfile[]; strongest: Stroke | null; weakest: Stroke | null; untested: Stroke[];
  /** Antrenman en iyisi yarış en iyisinden yüzde kaç yavaş (aynı mesafe, ortalama). */
  raceTrainingGap: number | null;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Sporcunun yaşına ve cinsiyetine uyan en kolay (katılım) barajı. */
function entryStandard(standards: Standard[], athlete: { gender: 'K' | 'E'; birthYear: number }, season: number, stroke: Stroke, distance: number, pool?: string) {
  const fits = standards.filter((s) => {
    const year = Number(s.when?.match(/20\d{2}/)?.[0] ?? season);
    const age = year - athlete.birthYear;
    return s.gender === athlete.gender && s.stroke === stroke && s.distance === distance && age >= s.age && age <= (s.maxAge ?? s.age) && (!s.pool || !pool || s.pool === pool);
  });
  return fits.length ? Math.max(...fits.map((s) => s.timeMs)) : null;
}

function bestOf(list: SwimResult[], stroke: Stroke) {
  const own = list.filter((r) => r.stroke === stroke);
  const byDistance = new Map<number, SwimResult[]>();
  own.forEach((r) => byDistance.set(r.distance, [...(byDistance.get(r.distance) ?? []), r]));
  return [...byDistance.entries()].map(([distance, rs]) => {
    const best = rs.reduce((a, b) => (b.timeMs < a.timeMs ? b : a));
    return { distance, best, count: rs.length };
  });
}

/** Bir sporcunun stillere göre güçlü ve eksik yönleri. Düşük puan daha iyidir. */
export function athleteProfile(
  student: { id: string; gender: 'K' | 'E'; birthYear: number },
  results: SwimResult[],
  standards: Standard[],
  season: number,
): AthleteProfile {
  const own = results.filter((r) => r.studentId === student.id);
  const race = own.filter(isRaceResult);
  const training = own.filter((r) => !isRaceResult(r));
  const freeBest = (list: SwimResult[], distance: number) => {
    const times = list.filter((r) => r.stroke === 'serbest' && r.distance === distance).map((r) => r.timeMs);
    return times.length ? Math.min(...times) : null;
  };

  const pick = (list: SwimResult[], stroke: Stroke): EventBest | null => {
    const events = bestOf(list, stroke).map(({ distance, best, count }) => {
      const standard = entryStandard(standards, student, season, stroke, distance, best.pool);
      if (standard) return { distance, bestMs: best.timeMs, gapPercent: round1(((best.timeMs - standard) / standard) * 100), basis: 'baraj' as Basis, count };
      const free = stroke === 'serbest' ? null : freeBest(list, distance);
      if (free) return { distance, bestMs: best.timeMs, gapPercent: round1(((best.timeMs / (free * FREE_RATIO[stroke])) - 1) * 100), basis: 'serbest' as Basis, count };
      return { distance, bestMs: best.timeMs, gapPercent: null, basis: null, count };
    });
    if (!events.length) return null;
    const scored = events.filter((e) => e.gapPercent !== null).sort((a, b) => a.gapPercent! - b.gapPercent!);
    return scored[0] ?? events.sort((a, b) => b.count - a.count)[0];
  };

  const strokes = STROKES.map((stroke): StrokeProfile => {
    const r = pick(race, stroke);
    const t = pick(training, stroke);
    const main = r?.gapPercent != null ? r : t?.gapPercent != null ? t : null;
    return { stroke, race: r, training: t, score: main?.gapPercent ?? null, basis: main?.basis ?? null };
  });

  // Serbest kendi kendine kıyaslanamaz; yalnız barajla puanlanır. Karşılaştırma aynı ölçüye göre yapılır.
  const scored = strokes.filter((s) => s.score !== null);
  const sameBasis = scored.some((s) => s.basis === 'baraj') ? scored.filter((s) => s.basis === 'baraj') : scored;
  const sorted = [...sameBasis].sort((a, b) => a.score! - b.score!);

  const gaps = STROKES.flatMap((stroke) => bestOf(race, stroke).flatMap(({ distance, best }) => {
    const t = training.filter((x) => x.stroke === stroke && x.distance === distance).map((x) => x.timeMs);
    return t.length ? [((Math.min(...t) - best.timeMs) / best.timeMs) * 100] : [];
  }));

  return {
    studentId: student.id,
    age: season - student.birthYear,
    gender: student.gender,
    strokes,
    strongest: sorted.length >= 2 ? sorted[0].stroke : null,
    weakest: sorted.length >= 2 ? sorted[sorted.length - 1].stroke : null,
    untested: strokes.filter((s) => !s.race && !s.training).map((s) => s.stroke),
    raceTrainingGap: gaps.length ? round1(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null,
  };
}

export type GroupStroke = { stroke: Stroke; average: number | null; measured: number; missing: number };

/** Dersin tamamı için stil bazında ortalama ve eksik ölçüm sayısı. */
export function groupSummary(profiles: AthleteProfile[]) {
  const strokes: GroupStroke[] = STROKES.map((stroke) => {
    const scores = profiles.map((p) => p.strokes.find((s) => s.stroke === stroke)!.score).filter((n): n is number => n !== null);
    const missing = profiles.filter((p) => p.untested.includes(stroke)).length;
    return { stroke, average: scores.length ? round1(scores.reduce((a, b) => a + b, 0) / scores.length) : null, measured: scores.length, missing };
  });
  const ranked = strokes.filter((s) => s.average !== null && s.measured >= Math.max(1, Math.ceil(profiles.length / 3))).sort((a, b) => a.average! - b.average!);
  return {
    strokes,
    strongest: ranked.length >= 2 ? ranked[0].stroke : null,
    weakest: ranked.length >= 2 ? ranked[ranked.length - 1].stroke : null,
    noData: profiles.filter((p) => p.untested.length === STROKES.length).length,
  };
}

/** Yapay zekâya ad ve kimlik gitmez: sporcular yalnız sıra numarasıyla gönderilir. */
export function aiGroupPayload(profiles: AthleteProfile[]) {
  return {
    athleteCount: profiles.length,
    group: groupSummary(profiles).strokes.map((s) => ({ stroke: s.stroke, averageGapPercent: s.average, measured: s.measured, missing: s.missing })),
    athletes: profiles.slice(0, 20).map((p, i) => ({
      no: i + 1, age: p.age, gender: p.gender,
      strongest: p.strongest, weakest: p.weakest, untested: p.untested, trainingSlowerThanRacePercent: p.raceTrainingGap,
      strokes: p.strokes.filter((s) => s.race || s.training).map((s) => ({
        stroke: s.stroke,
        race: s.race && { distance: s.race.distance, bestMs: s.race.bestMs, gapPercent: s.race.gapPercent },
        training: s.training && { distance: s.training.distance, bestMs: s.training.bestMs, gapPercent: s.training.gapPercent },
      })),
    })),
  };
}
