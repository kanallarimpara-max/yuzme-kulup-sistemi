import { useCallback, useEffect } from 'react';
import { syncClock } from '../lib/clock';
import { useSession } from '../lib/session';
import { db, useCollection } from '../lib/store';
import type { TimerDoc, TimerLane, Workout } from '../lib/types';

export function useTimerDoc() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const id = `timer-${user?.id ?? 'none'}`;
  const docs = useCollection<TimerDoc>('timers', { clubId });
  const workouts = useCollection<Workout>('workouts', { clubId });
  const current = docs.find((d) => d.id === id);
  const lanes = current?.lanes ?? [];
  const touchLocked = current?.touchLocked === true;
  useEffect(() => {
    if (user?.id) void syncClock(user.id);
  }, [user?.id]);
  // Birleştirerek yazılır; kulvar kaydı başka cihazın koyduğu dokunma kilidini silmez.
  const save = useCallback((next: TimerLane[]) => db.batch([{ name: 'timers', id, data: { clubId, lanes: next } }]), [id, clubId]);
  const setTouchLocked = useCallback((on: boolean) => db.batch([{ name: 'timers', id, data: { clubId, touchLocked: on } }]), [id, clubId]);
  return { lanes, workouts, save, touchLocked, setTouchLocked };
}
