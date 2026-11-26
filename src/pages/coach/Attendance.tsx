import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { db, useCollection } from '../../lib/store';
import { lessonsAt } from '../../lib/rules';
import { dateTr } from '../../lib/format';
import type { AttendanceDoc, AttendanceMark } from '../../lib/types';
import { useCoachData } from './useCoachData';

const MARKS: Array<[AttendanceMark, string]> = [['geldi', 'Geldi'], ['gelmedi', 'Gelmedi'], ['izinli', 'İzinli']];

export default function Attendance() {
  const { user, clubId, lessons, students, branchName } = useCoachData();
  const docs = useCollection<AttendanceDoc>('attendance', { clubId });
  const [now, setNow] = useState(() => new Date());
  const [picked, setPicked] = useState('');
  // Kaydedilmemiş yoklama varken ders saati bitse de ekran kapanmaz.
  const [held, setHeld] = useState<{ lessonId: string; date: string } | null>(null);
  const [draft, setDraft] = useState<Record<string, AttendanceMark>>({});
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const t = window.setInterval(tick, 15000);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', tick);
    };
  }, []);
  if (!user) return null;

  const { today, time, todays, actives } = lessonsAt(lessons, now);
  const heldLesson = held ? lessons.find((l) => l.id === held.lessonId) : undefined;
  const lesson = heldLesson ?? actives.find((l) => l.id === picked) ?? actives[0] ?? null;
  const date = heldLesson ? held!.date : today;
  const ended = Boolean(lesson) && !actives.some((l) => l.id === lesson!.id);
  const next = todays.find((l) => l.startTime > time);
  const roster = lesson ? students.filter((s) => s.lessonId === lesson.id) : [];
  const docId = lesson ? `${lesson.id}_${date}_${user.id}` : '';
  const saved = Object.assign({}, ...docs.filter((d) => d.lessonId === lesson?.id && d.date === date).map((d) => d.marks)) as Record<string, AttendanceMark>;
  const marks = { ...saved, ...draft };
  const dirty = Object.keys(draft).length > 0;
  const complete = roster.length > 0 && roster.every((s) => saved[s.id]);

  const mark = (studentId: string, value: AttendanceMark) => {
    if (!lesson) return;
    setStatus('');
    setError('');
    setHeld({ lessonId: lesson.id, date });
    setDraft((d) => ({ ...d, [studentId]: value }));
  };
  const save = async () => {
    if (!lesson) return;
    const missing = roster.filter((s) => !marks[s.id]);
    if (missing.length) return setError(`${missing.length} öğrenci için durum seçin: ${missing.map((s) => s.firstName).join(', ')}`);
    const rosterMarks = Object.fromEntries(roster.map((s) => [s.id, marks[s.id]]));
    setBusy(true);
    setError('');
    try {
      // Veli sınıfın tamamını değil, yalnız kendi çocuğunun kaydını okur.
      await db.batch([
        { name: 'attendance', id: docId, data: { clubId, lessonId: lesson.id, coachId: user.id, date, marks: rosterMarks } },
        ...roster.map((s) => ({ name: 'attendanceMarks', id: `${docId}_${s.id}`, data: { clubId, studentId: s.id, parentId: s.parentId, lessonId: lesson.id, date, mark: marks[s.id] } })),
      ]);
      setDraft({});
      setHeld(null);
      setStatus('Yoklama kaydedildi.');
    } catch {
      setError('Yoklama kaydedilemedi, bağlantını kontrol edip tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Yoklama</h1><p className="page-meta">{lesson ? (ended ? 'Ders saati bitti' : 'Şu an aktif ders') : dateTr(today)}</p></div>
        {lesson && <p className="muted">{dateTr(date)} · {lesson.startTime}-{lesson.endTime}</p>}
      </header>
      {!lesson ? (
        <section className="card stack">
          <p><strong>Şuan dersiniz görünmüyor.</strong></p>
          <p className="muted">{next ? `Bugünkü sonraki dersiniz ${next.startTime}: ${next.name}. Yoklama ders saatinde açılır.` : 'Yoklama, ders saatiniz geldiğinde burada otomatik açılır.'}</p>
        </section>
      ) : (
        <section className="card stack">
          {actives.length > 1 && !heldLesson
            ? <label>Aktif ders<select value={lesson.id} onChange={(e) => setPicked(e.target.value)}>{actives.map((l) => <option key={l.id} value={l.id}>{l.startTime}-{l.endTime} · {l.name} · {branchName(l.branchId)}</option>)}</select></label>
            : <div><h2>{lesson.name}</h2><p className="muted">{branchName(lesson.branchId)}</p></div>}
          {ended && dirty && <p className="error" role="alert">Ders saati bitti. Girdiğin yoklamayı kaybetmemek için kaydet.</p>}
          {roster.length === 0 ? <p className="muted">Bu derste öğrenci yok.</p> : <>
            <ul className="simple-list">{roster.map((s) => (
              <li key={s.id} className="wrap-row">
                <span>{s.firstName} {s.lastName}</span>
                <div className="chips">{MARKS.map(([value, text]) => (
                  <button key={value} className={marks[s.id] === value ? `chip on mark-${value}` : 'chip'} aria-pressed={marks[s.id] === value} aria-label={`${s.firstName} ${s.lastName} ${text}`} onClick={() => mark(s.id, value)}>{text}</button>
                ))}</div>
              </li>
            ))}</ul>
            {error && <p className="error" role="alert">{error}</p>}
            {status && !dirty && <p className="ok" role="status">{status}</p>}
            {complete && !dirty && !status && <p className="ok" role="status">Bu dersin yoklaması kayıtlı. Değiştirip tekrar kaydedebilirsin.</p>}
            <button className="primary attendance-save" disabled={busy || (!dirty && complete)} onClick={save}><Save size={17} />{busy ? 'Kaydediliyor…' : 'Yoklamayı kaydet'}</button>
          </>}
        </section>
      )}
    </div>
  );
}
