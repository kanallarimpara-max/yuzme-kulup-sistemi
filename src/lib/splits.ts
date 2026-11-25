// Yarış ara süreleri (lap). Kayıtta her zaman toplam (kümülatif) süre olarak tutulur:
// lapsMs[i] = yarışın başından (i+1) * lapEvery metreye kadar geçen süre. Son değer bitiş derecesidir.
// Eski kayıtlarda lapEvery yoktur; o kayıtlar 50 m aralıklıdır.

export type Split = { m: number; ms: number };
export const LAP_STEPS = [25, 50, 100] as const;
const TOLERANCE_MS = 100;

/** Okunan ara süreleri denetler: eşit aralıklı, artan ve bitiş derecesiyle tutarlı olmalı. Tutmuyorsa hiç kaydedilmez. */
export function normalizeSplits(splits: Split[], distance: number, timeMs: number | null): { lapsMs: number[]; lapEvery: number } | null {
  if (!timeMs || splits.length < 2) return null;
  const sorted = [...new Map(splits.map((s) => [s.m, s.ms])).entries()].sort((a, b) => a[0] - b[0]);
  const step = sorted[0][0];
  if (!LAP_STEPS.includes(step as (typeof LAP_STEPS)[number])) return null;
  if (sorted.length * step !== distance || sorted.some(([m], i) => m !== step * (i + 1))) return null;
  const lapsMs = sorted.map(([, ms]) => ms);
  if (lapsMs.some((ms, i) => ms <= (lapsMs[i - 1] ?? 0))) return null;
  if (Math.abs(lapsMs[lapsMs.length - 1] - timeMs) > TOLERANCE_MS) return null;
  lapsMs[lapsMs.length - 1] = timeMs;
  return { lapsMs, lapEvery: step };
}

/** Her bölümün kendi süresi (ör. 2. 50 m'yi kaç saniyede yüzdü). */
export const lapSegments = (lapsMs: number[]) => lapsMs.map((ms, i) => ms - (lapsMs[i - 1] ?? 0));

/** Kayıttaki ara süreler geçerli mi (Worker ve ekran aynı denetimi kullanır). */
export function validLaps(lapsMs: unknown, lapEvery: unknown, distance: number, timeMs: number) {
  if (lapsMs === undefined && lapEvery === undefined) return true;
  const every = lapEvery ?? 50;
  return Array.isArray(lapsMs) && lapsMs.length >= 2 && lapsMs.length <= 60 && LAP_STEPS.includes(every as (typeof LAP_STEPS)[number])
    && lapsMs.length * (every as number) === distance && lapsMs.every((v, i) => Number.isInteger(v) && v > (lapsMs[i - 1] ?? 0))
    && lapsMs[lapsMs.length - 1] === timeMs;
}
