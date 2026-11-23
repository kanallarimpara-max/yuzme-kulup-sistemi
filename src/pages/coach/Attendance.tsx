import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { db, useCollection } from '../../lib/store';
import { lessonsAt } from '../../lib/rules';
import { dateTr } from '../../lib/format';
import { downloadTablePdf } from '../../lib/pdf';
import type { AttendanceDoc, AttendanceMark } from '../../lib/types';
import { useCoachData } from './useCoachData';

const MARKS: Array<[AttendanceMark, string]> = [['geldi', 'Geldi'], ['gelmedi', 'Gelmedi'], ['izinli', 'İzinli']];

export default function Attendance() {
  const { user, clubId, lessons, students, branchName } = useCoachData();
  const docs = useCollection<AttendanceDoc>('attendance', { clubId });
  const [now, setNow] = useState(() => new Date());
  const [picked, setPicked] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);
  if (!user) return null;

  const { today, todays, active } = lessonsAt(lessons, now);
  const lesson = todays.find((l) => l.id === picked) ?? active ?? todays[0] ?? null;
  const roster = lesson ? students.filter((s) => s.lessonId === lesson.id) : [];
  const docId = lesson ? `${lesson.id}_${today}_${user.id}` : '';
  const marks = docs.find((d) => d.id === docId)?.marks ?? {};
  const mark = async (studentId: string, value: AttendanceMark) => {
    if (!lesson) return;
    await db.put('attendance', docId, { clubId, lessonId: lesson.id, coachId: user.id, date: today, marks: { ...marks, [studentId]: value } });
    // Veli sınıfın tamamını değil, yalnız kendi çocuğunun kaydını okur.
    const parentId = students.find((s) => s.id === studentId)?.parentId ?? '';
    await db.put('attendanceMarks', `${docId}_${studentId}`, { clubId, studentId, parentId, lessonId: lesson.id, date: today, mark: value });
  };

  const report = async () => {
    setError('');
    const label = (m?: AttendanceMark) => MARKS.find(([k]) => k === m)?.[1] ?? 'Girilmedi';
    const body = docs
      .filter((d) => lessons.some((l) => l.id === d.lessonId))
      .sort((a, b) => b.date.localeCompare(a.date))
      .flatMap((d) => students.filter((s) => s.lessonId === d.lessonId).map((s) => [
        dateTr(d.date), lessons.find((l) => l.id === d.lessonId)?.name ?? '', `${s.firstName} ${s.lastName}`, label(d.marks[s.id]),
      ]));
    try {
      await downloadTablePdf('yoklama-raporu.pdf', 'Yoklama raporu', `${user.name} · ${dateTr(today)}`, ['Tarih', 'Ders', 'Öğrenci', 'Durum'], body);
    } catch {
      setError('PDF oluşturulamadı.');
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">{active ? 'Şu an aktif ders' : 'Bugün'}</p><h1>Yoklama</h1></div>
        <button onClick={report} disabled={!docs.length}><FileDown size={16} />Rapor PDF</button>
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      {!lesson ? <section className="card"><p className="muted">Bugün yoklama alınacak ders yok.</p></section> : (
        <section className="card stack">
          <label>Seans<select value={lesson.id} onChange={(e) => setPicked(e.target.value)}>{todays.map((l) => <option key={l.id} value={l.id}>{l.startTime}-{l.endTime} · {l.name} · {branchName(l.branchId)}</option>)}</select></label>
          {roster.length === 0 ? <p className="muted">Bu derste öğrenci yok.</p> : (
            <ul className="simple-list">{roster.map((s) => (
              <li key={s.id} className="wrap-row">
                <span>{s.firstName} {s.lastName}</span>
                <div className="chips">{MARKS.map(([value, text]) => (
                  <button key={value} className={marks[s.id] === value ? `chip on mark-${value}` : 'chip'} aria-pressed={marks[s.id] === value} onClick={() => mark(s.id, value)}>{text}</button>
                ))}</div>
              </li>
            ))}</ul>
          )}
        </section>
      )}
    </div>
  );
}
