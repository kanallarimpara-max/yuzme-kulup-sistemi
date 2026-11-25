import { useMemo } from 'react';
import data from '../data/calendar.json';
import { useCollection, type Row } from './store';
import { validCalendar, type CalendarEvent } from './tyfCalendar';

type CalendarDoc = Row & { season: string; source: string; payload: string; checkedAt: string; changedAt: string };
const BUNDLED = data as { season: string; source: string; events: CalendarEvent[] };

/** Günde dört kez güncellenen TYF faaliyet takvimi. Sunucuya ulaşılamazsa uygulamayla gelen takvim kullanılır. */
export function useRaceCalendar() {
  const current = useCollection<CalendarDoc>('tyfCalendar', { id: 'current' })[0];
  const payload = current?.payload;
  const events = useMemo(() => {
    if (!payload) return BUNDLED.events;
    try {
      const parsed: unknown = JSON.parse(payload);
      return validCalendar(parsed) ? parsed : BUNDLED.events;
    } catch {
      return BUNDLED.events;
    }
  }, [payload]);
  return { events, season: current?.season ?? BUNDLED.season, source: current?.source ?? BUNDLED.source, checkedAt: current?.checkedAt ?? '' };
}
