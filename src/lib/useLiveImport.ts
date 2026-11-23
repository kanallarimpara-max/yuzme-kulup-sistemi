import { useEffect, useRef, useState } from 'react';
import { studentScope } from './access';
import { toIso } from './rules';
import { useSession } from './session';
import { db, useCollection } from './store';
import { matchAthletes, readResultPdf, resultKey } from './tyf';
import { meetPool } from './tyfLinks';
import { isMeetLive, type Student, type SwimResult, type TyfMeet } from './types';
import { liveMeet, meetPdf, workerEnabled } from './worker';

const RETRY_MS = 5 * 60000;
const read = (key: string): Record<string, string> => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? '{}') as Record<string, string>;
  } catch {
    return {};
  }
};
const write = (key: string, value: Record<string, string>) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* Kayıt tutulamazsa aynı dosya yeniden okunur, sonuç çoğalmaz. */ }
};

/** Admin uygulaması açıkken devam eden yarışın kesin eşleşen derecelerini sporcu profiline işler. */
export function useLiveImport() {
  const { user, club } = useSession();
  const enabled = workerEnabled && user?.role === 'admin' && Boolean(club);
  const meets = useCollection<TyfMeet>('tyfMeets', enabled ? {} : { skip: true });
  const students = useCollection<Student>('students', enabled ? studentScope(user) : { skip: true });
  const results = useCollection<SwimResult>('results', enabled ? { clubId: club!.id } : { skip: true });
  const [tick, setTick] = useState(0);
  const latest = useRef({ students, results });
  latest.current = { students, results };
  const running = useRef(false);
  const today = toIso(new Date());
  const active = meets.filter((m) => isMeetLive(m, today));
  const signature = active.map((m) => `${m.id}:${m.version ?? ''}`).join('|');

  useEffect(() => {
    if (!enabled || !signature || !students.length || running.current) return;
    running.current = true;
    const doneKey = `tyf-import-${club!.id}`;
    (async () => {
      const done = read(doneKey);
      for (const meet of active) {
        const detail = await liveMeet(meet.url);
        for (const item of detail.sessions.flatMap((s) => s.events).filter((e) => e.resultUrl && !done[e.resultUrl])) {
          const event = await readResultPdf(await meetPdf(item.resultUrl));
          if (event) {
            for (const match of matchAthletes(event, club!.name, latest.current.students).filter((m) => m.confidence === 'auto' && m.row.timeMs)) {
              const id = resultKey(match.athlete.id, event);
              const old = latest.current.results.find((r) => r.id === id);
              // Seri ve final aynı gün olursa en iyi derece kalır.
              if (old && old.timeMs <= match.row.timeMs!) continue;
              const student = latest.current.students.find((s) => s.id === match.athlete.id);
              await db.put('results', id, {
                clubId: club!.id, studentId: match.athlete.id, parentId: student?.parentId ?? '', stroke: event.stroke, distance: event.distance,
                timeMs: match.row.timeMs, date: event.date, pool: meetPool(detail.info), source: 'tyf', kind: 'yaris', meet: event.meet, lapsMs: match.row.lapsMs,
              });
            }
          }
          done[item.resultUrl] = '1';
          write(doneKey, done);
        }
      }
    })().catch(() => {
      window.setTimeout(() => setTick((t) => t + 1), RETRY_MS);
    }).finally(() => {
      running.current = false;
    });
  }, [enabled, signature, students.length, tick]);
}
