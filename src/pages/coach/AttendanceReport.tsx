import { useMemo, useState } from 'react';
import { FileDown } from 'lucide-react';
import { useSession } from '../../lib/session';
import { sessionDates, sessionState } from '../../lib/rules';
import { dateTr } from '../../lib/format';
import { downloadTablePdf } from '../../lib/pdf';
import { useAttendance } from '../../lib/useAttendance';
import type { AttendanceMark, Lesson, Student } from '../../lib/types';

const MARK: Record<AttendanceMark, [string, string]> = { geldi: ['Geldi', 'good'], gelmedi: ['Gelmedi', 'bad'], izinli: ['İzinli', 'warn'] };
const MISSING = 'Yoklama girilmedi';

/** Öğrenci sayfasındaki ders ders yoklama tablosu. */
export default function AttendanceReport({ lessons, students, lessonId }: { lessons: Lesson[]; students: Student[]; lessonId?: string }) {
  const { user } = useSession();
  const attendance = useAttendance(user);
  const [picked, setPicked] = useState('');
  const [error, setError] = useState('');
  const withStudents = lessons.filter((l) => students.some((s) => s.lessonId === l.id));
  const lesson = lessons.find((l) => l.id === lessonId) ?? withStudents.find((l) => l.id === picked) ?? withStudents[0];
  const dates = useMemo(() => (lesson ? sessionDates(lesson) : []), [lesson?.id, lesson?.startDate, lesson?.endDate, lesson?.weekdays.join()]);
  if (!lesson) return null;

  const now = new Date();
  const roster = students.filter((s) => s.lessonId === lesson.id);
  const markOf = (studentId: string, date: string) => attendance.find((d) => d.lessonId === lesson.id && d.date === date && d.marks[studentId])?.marks[studentId];
  const textOf = (studentId: string, date: string) => {
    const mark = markOf(studentId, date);
    if (mark) return MARK[mark][0];
    return sessionState(date, lesson.endTime, false, now) === 'girilmedi' ? MISSING : '—';
  };
  const pdf = async () => {
    setError('');
    try {
      await downloadTablePdf('yoklama-raporu.pdf', `${lesson.name} yoklama raporu`, `${lesson.startTime}-${lesson.endTime} · ${dateTr(lesson.startDate)} - ${dateTr(lesson.endDate)}`,
        ['Ders', 'Tarih', 'Öğrenci', 'Durum'],
        dates.flatMap((date, i) => roster.map((s) => [`${i + 1}. ders`, dateTr(date), `${s.firstName} ${s.lastName}`, textOf(s.id, date)])));
    } catch {
      setError('PDF oluşturulamadı.');
    }
  };

  return (
    <section className="card stack">
      <div className="page-head">
        <div><h2>Yoklama raporu</h2><p className="muted">{lesson.name} · {lesson.startTime}-{lesson.endTime}</p></div>
        <button onClick={pdf} disabled={!roster.length || !dates.length}><FileDown size={16} />Rapor PDF</button>
      </div>
      {!lessonId && withStudents.length > 1 && <label>Ders<select value={lesson.id} onChange={(e) => setPicked(e.target.value)}>{withStudents.map((l) => <option key={l.id} value={l.id}>{l.name} · {l.startTime}</option>)}</select></label>}
      {error && <p className="error" role="alert">{error}</p>}
      {roster.length === 0 ? <p className="muted">Bu derste öğrenci yok.</p> : dates.length === 0 ? <p className="muted">Bu dersin takvimi yok.</p> : (
        <div className="table-wrap"><table className="attendance-grid">
          <thead><tr><th>Öğrenci</th>{dates.map((d, i) => <th key={d}>{i + 1}. ders<small>{dateTr(d)}</small></th>)}</tr></thead>
          <tbody>{roster.map((s) => (
            <tr key={s.id}>
              <th scope="row">{s.firstName} {s.lastName}</th>
              {dates.map((d) => {
                const mark = markOf(s.id, d);
                const text = textOf(s.id, d);
                return <td key={d}>{mark ? <em className={`badge ${MARK[mark][1]}`}>{text}</em> : text === MISSING ? <small className="not-taken">{MISSING}</small> : <span className="muted">—</span>}</td>;
              })}
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </section>
  );
}
