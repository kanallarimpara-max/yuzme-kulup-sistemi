// Kronometre motoru saf fonksiyondur. Aynı başlangıç verisi her cihazda aynı ekranı üretir.

export type WorkoutSet = {
  name: string;
  reps: number;
  distance: number;
  stroke: string;
  intervalMs: number;
  restMs: number;
};

export type Step = { kind: 'swim' | 'rest'; setIndex: number; rep: number; durationMs: number; startMs: number };
export type TimerColor = 'green' | 'orange' | 'red' | 'purple' | 'idle';

export type TimerView = {
  phase: 'swim' | 'rest' | 'done';
  color: TimerColor;
  remainingMs: number;
  setIndex: number;
  setCount: number;
  rep: number;
  reps: number;
  set: WorkoutSet | null;
  next: WorkoutSet | null;
  showNext: boolean;
};

export function buildSteps(sets: WorkoutSet[]): Step[] {
  const steps: Step[] = [];
  let startMs = 0;
  const push = (kind: Step['kind'], setIndex: number, rep: number, durationMs: number) => {
    if (durationMs <= 0) return;
    steps.push({ kind, setIndex, rep, durationMs, startMs });
    startMs += durationMs;
  };
  sets.forEach((set, setIndex) => {
    for (let rep = 1; rep <= set.reps; rep += 1) push('swim', setIndex, rep, set.intervalMs);
    push('rest', setIndex, set.reps, set.restMs);
  });
  return steps;
}

export const totalMs = (sets: WorkoutSet[]) => {
  const last = buildSteps(sets).at(-1);
  return last ? last.startMs + last.durationMs : 0;
};

export const setOffsetMs = (sets: WorkoutSet[], setIndex: number) =>
  buildSteps(sets).find((s) => s.setIndex >= setIndex)?.startMs ?? totalMs(sets);

export function timerView(sets: WorkoutSet[], elapsedMs: number): TimerView {
  const steps = buildSteps(sets);
  const step = steps.find((s) => elapsedMs < s.startMs + s.durationMs);
  if (!step) {
    return {
      phase: 'done', color: 'idle', remainingMs: 0, setIndex: Math.max(0, sets.length - 1), setCount: sets.length,
      rep: sets.at(-1)?.reps ?? 0, reps: sets.at(-1)?.reps ?? 0, set: sets.at(-1) ?? null, next: null, showNext: false,
    };
  }
  const remainingMs = step.startMs + step.durationMs - Math.max(elapsedMs, step.startMs);
  const set = sets[step.setIndex];
  const next = sets[step.setIndex + 1] ?? null;
  const color: TimerColor =
    step.kind === 'rest' ? 'purple' : remainingMs <= 5000 ? 'red' : remainingMs <= 10000 ? 'orange' : 'green';
  return {
    phase: step.kind,
    color,
    remainingMs,
    setIndex: step.setIndex,
    setCount: sets.length,
    rep: step.rep,
    reps: set.reps,
    set,
    next,
    // Dinlenmenin son 6. saniyesinden son 3. saniyesine kadar sıradaki set görünür.
    showNext: step.kind === 'rest' && !!next && remainingMs <= 6000 && remainingMs > 3000,
  };
}

export type LaneClock = { status: 'idle' | 'running' | 'paused' | 'done'; startedAt: number | null; offsetMs: number };

export const laneElapsed = (lane: LaneClock, now: number) =>
  lane.status === 'running' && lane.startedAt !== null ? lane.offsetMs + Math.max(0, now - lane.startedAt) : lane.offsetMs;

export const startLane = (lane: LaneClock, now: number): LaneClock => ({ status: 'running', startedAt: now, offsetMs: lane.status === 'done' ? 0 : lane.offsetMs });
export const pauseLane = (lane: LaneClock, now: number): LaneClock => ({ status: 'paused', startedAt: null, offsetMs: laneElapsed(lane, now) });
export const finishLane = (): LaneClock => ({ status: 'done', startedAt: null, offsetMs: 0 });
export const jumpLane = (sets: WorkoutSet[], setIndex: number, now: number): LaneClock => ({ status: 'running', startedAt: now, offsetMs: setOffsetMs(sets, setIndex) });

/** İki kare arasında geçilen sesli uyarıları döndürür. Kare atlansa da uyarı kaybolmaz. */
export function beepsBetween(sets: WorkoutSet[], fromMs: number, toMs: number): Array<'short' | 'final'> {
  if (toMs <= fromMs) return [];
  const out: Array<{ at: number; beep: 'short' | 'final' }> = [];
  for (const step of buildSteps(sets)) {
    const end = step.startMs + step.durationMs;
    for (let sec = 5; sec >= 1; sec -= 1) {
      const at = end - sec * 1000;
      if (at >= step.startMs && at > fromMs && at <= toMs) out.push({ at, beep: 'short' });
    }
    if (end > fromMs && end <= toMs) out.push({ at: end, beep: 'final' });
  }
  return out.sort((a, b) => a.at - b.at).map((b) => b.beep);
}
