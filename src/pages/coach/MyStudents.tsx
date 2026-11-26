import { useEffect, useRef, useState, type FormEvent } from 'react';
import { db, useCollection } from '../../lib/store';
import { athleteRecordScope } from '../../lib/access';
import { toIso } from '../../lib/rules';
import { dateTr, dayNames } from '../../lib/format';
import type { CoachComment } from '../../lib/types';
import AttendanceReport from './AttendanceReport';
import { useCoachData } from './useCoachData';

export default function MyStudents() {
  const { user, clubId, lessons, students, branches, branchName } = useCoachData();
  const comments = useCollection<CoachComment>('comments', athleteRecordScope(user));
  const [branchId, setBranchId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [commentFor, setCommentFor] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (commentFor) formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [commentFor]);
  if (!user) return null;

  const lessonOf = (id: string) => lessons.find((l) => l.id === id);
  const rows = students.filter((s) => (!branchId || lessonOf(s.lessonId)?.branchId === branchId) && (!lessonId || s.lessonId === lessonId));
  const notesOf = (id: string) => comments.filter((c) => c.studentId === id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0) || b.date.localeCompare(a.date));
  const selected = students.find((s) => s.id === commentFor);
  const notes = commentFor ? notesOf(commentFor) : [];
  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected || !text.trim()) return;
    setBusy(true);
    setError('');
    try {
      await db.add('comments', { clubId, studentId: selected.id, parentId: selected.parentId, coachId: user.id, text: text.trim(), date: toIso(new Date()) });
      setText('');
      setStatus('Yorum kaydedildi, veli performans ekranında görür.');
    } catch {
      setError('Yorum kaydedilemedi, bağlantını kontrol edip tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><h1>Öğrencilerim</h1></div></header>
      <section className="card form-grid">
        <label>Şube<select value={branchId} onChange={(e) => { setBranchId(e.target.value); setLessonId(''); }}><option value="">Tümü</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Ders saati<select value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Tümü</option>{lessons.filter((l) => !branchId || l.branchId === branchId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
      </section>
      {selected && (
        <form className="card stack" onSubmit={save} ref={formRef}>
          <h2>{selected.firstName} {selected.lastName} yorumları</h2>
          <div>
            <p className="muted">Yapılan yorumlar ({notes.length})</p>
            {notes.length === 0 ? <p className="muted">Bu öğrenciye henüz yorum yapılmadı.</p> : <ul className="comment-history">{notes.map((c) => <li key={c.id}><p>{c.text}</p><small>{dateTr(c.date)}</small></li>)}</ul>}
          </div>
          <label>Yeni yorum<textarea required rows={3} maxLength={2000} value={text} onChange={(e) => { setText(e.target.value); setStatus(''); }} /></label>
          {error && <p className="error" role="alert">{error}</p>}
          {status && <p className="ok" role="status">{status}</p>}
          <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button><button type="button" onClick={() => { setCommentFor(null); setText(''); setStatus(''); setError(''); }}>Kapat</button></div>
        </form>
      )}
      <section className="card"><div className="table-wrap"><table>
        <thead><tr><th>Ad soyad</th><th>Şube</th><th>Ders</th><th>Gün / saat</th><th>Bitiş</th><th>Son yorum</th><th /></tr></thead>
        <tbody>{rows.map((s) => {
          const l = lessonOf(s.lessonId);
          const list = notesOf(s.id);
          return <tr key={s.id}><td>{s.firstName} {s.lastName}</td><td>{l && branchName(l.branchId)}</td><td>{l?.name}</td><td>{l && `${dayNames(l.weekdays)} ${l.startTime}`}</td><td>{l && dateTr(l.endDate)}</td><td className="last-comment">{list[0] ? <>{list[0].text}<small>{dateTr(list[0].date)}</small></> : <span className="muted">Yorum yok</span>}</td><td><button onClick={() => { setCommentFor(s.id); setText(''); setStatus(''); setError(''); }}>Yorumlar ({list.length})</button></td></tr>;
        })}</tbody>
      </table></div></section>
      <AttendanceReport lessons={lessons.filter((l) => !branchId || l.branchId === branchId)} students={students} lessonId={lessonId || undefined} />
    </div>
  );
}
