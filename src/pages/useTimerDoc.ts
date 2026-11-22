import { useCallback } from 'react';
import { useSession } from '../lib/session';
import { db, useCollection } from '../lib/store';
import type { TimerDoc, TimerLane, Workout } from '../lib/types';

export function useTimerDoc() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const id = `timer-${user?.id ?? 'none'}`;
  const docs = useCollection<TimerDoc>('timers', { clubId });
  const workouts = useCollection<Workout>('workouts', { clubId });
  const lanes = docs.find((d) => d.id === id)?.lanes ?? [];
  const save = useCallback((next: TimerLane[]) => db.put('timers', id, { clubId, lanes: next }), [id, clubId]);
  return { lanes, workouts, save };
}
