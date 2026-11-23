import { useState, type FormEvent } from 'react';
import { db } from '../../lib/store';
import { toIso } from '../../lib/rules';
import { dateTr, dayNames } from '../../lib/format';
import AttendanceReport from './AttendanceReport';
import { useCoachData } from './useCoachData';

export default function MyStudents() {
  const { user, clubId, lessons, students, branches, branchName } = useCoachData();
  const [branchId, setBranchId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  if (!user) return null;

  const lessonOf = (id: string) => lessons.find((l) => l.id === id);
  const rows = students.filter((s) => (!branchId || lessonOf(s.lessonId)?.branchId === branchId) && (!lessonId || s.lessonId === lessonId));
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentFor || !text.trim()) return;
    await db.add('comments', { clubId, studentId: commentFor, parentId: students.find((s) => s.id === commentFor)?.parentId ?? '', coachId: user.id, text: text.trim(), date: toIso(new Date()) });
    setText('');
    setCommentFor(null);
    setStatus('Yorum kaydedildi, veli performans ekranında görür.');
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Antrenör</p><h1>Öğrencilerim</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      <section className="card form-grid">
        <label>Şube<select value={branchId} onChange={(e) => { setBranchId(e.target.value); setLessonId(''); }}><option value="">Tümü</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Ders saati<select value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Tümü</option>{lessons.filter((l) => !branchId || l.branchId === branchId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      </section>
      {commentFor && (
        <form className="card stack" onSubmit={save}>
          <label>Öğrenci yorumu<textarea required rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
          <div className="form-actions"><button className="primary">Kaydet</button><button type="button" onClick={() => setCommentFor(null)}>Vazgeç</button></div>
        </form>
      )}
      <section className="card"><div className="table-wrap"><table>
        <thead><tr><th>Ad soyad</th><th>Şube</th><th>Ders</th><th>Gün / saat</th><th>Bitiş</th><th /></tr></thead>
        <tbody>{rows.map((s) => {
          const l = lessonOf(s.lessonId);
          return <tr key={s.id}><td>{s.firstName} {s.lastName}</td><td>{l && branchName(l.branchId)}</td><td>{l?.name}</td><td>{l && `${dayNames(l.weekdays)} ${l.startTime}`}</td><td>{l && dateTr(l.endDate)}</td><td><button onClick={() => { setCommentFor(s.id); setStatus(''); }}>Yorum yaz</button></td></tr>;
        })}</tbody>
      </table></div></section>
      <AttendanceReport lessons={lessons.filter((l) => !branchId || l.branchId === branchId)} students={students} lessonId={lessonId || undefined} />
    </div>
  );
}
