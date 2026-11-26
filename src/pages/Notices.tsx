import { useState, type FormEvent } from 'react';
import { useSession } from '../lib/session';
import { db, useCollection, useMerged } from '../lib/store';
import { noticeScope, studentScope } from '../lib/access';
import { dateTr } from '../lib/format';
import { usePeople } from '../lib/people';
import { ROLE_LABEL, type Lesson, type Notice, type Student } from '../lib/types';

type Audience = 'herkes' | 'antrenor' | 'sekreter' | 'ders' | 'ogrenciler' | 'kisiler';

export default function Notices() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const scope = { clubId };
  const uid = user?.id;
  const notices = useMerged<Notice>('notices', uid ? noticeScope(user) : { skip: true }, uid ? { eq: ['senderId', uid] } : { skip: true });
  // Açık profiller başka kulüplerden de listelenir; duyuru yalnız bu kulübün kişilerine gider.
  const users = usePeople(user).filter((u) => u.clubId === clubId);
  const lessons = useCollection<Lesson>('lessons', scope);
  const students = useCollection<Student>('students', studentScope(user));
  const [form, setForm] = useState({ kind: 'duyuru' as Notice['kind'], title: '', body: '', date: '' });
  const [audience, setAudience] = useState<Audience>('herkes');
  const [lessonId, setLessonId] = useState('');
  const [people, setPeople] = useState<string[]>([]);
  const [pickedStudents, setPickedStudents] = useState<string[]>([]);
  const [status, setStatus] = useState('');
  if (!user) return null;

  const canPost = user.role === 'admin' || user.role === 'coach';
  const recipients = (): string[] => {
    const others = users.filter((u) => u.id !== user.id);
    if (audience === 'antrenor') return others.filter((u) => u.role === 'coach').map((u) => u.id);
    if (audience === 'sekreter') return others.filter((u) => u.role === 'secretary').map((u) => u.id);
    if (audience === 'kisiler') return people;
    if (audience === 'ogrenciler') return [...new Set(students.filter((s) => pickedStudents.includes(s.id)).map((s) => s.parentId))];
    if (audience === 'ders') {
      const lesson = lessons.find((l) => l.id === lessonId);
      const parents = students.filter((s) => s.lessonId === lessonId).map((s) => s.parentId);
      return [...new Set([...(lesson?.coachIds ?? []), ...parents])].filter((id) => id !== user.id);
    }
    return others.map((u) => u.id);
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const recipientIds = recipients();
    if (!recipientIds.length) {
      setStatus('Seçilen hedefte alıcı yok.');
      return;
    }
    await db.add('notices', { clubId, senderId: user.id, ...form, title: form.title.trim(), body: form.body.trim(), recipientIds, readBy: [] });
    setForm({ kind: 'duyuru', title: '', body: '', date: '' });
    setStatus(`${recipientIds.length} kişiye bildirim gönderildi.`);
  };

  const visible = notices
    .filter((n) => n.recipientIds.includes(user.id) || n.senderId === user.id)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  return (
    <div className="page">
      <header className="page-head"><div><h1>Duyuru ve yarışlar</h1></div></header>
      {canPost && (
        <form className="card stack" onSubmit={submit}>
          <div className="form-grid">
            <label>Tür<select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as Notice['kind'] })}><option value="duyuru">Duyuru</option><option value="yaris">Yarış</option></select></label>
            <label>Başlık<input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
            <label>Tarih<input type="date" required={form.kind === 'yaris'} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></label>
            <label>Kime<select value={audience} onChange={(e) => setAudience(e.target.value as Audience)}><option value="herkes">Tüm kulüp</option><option value="antrenor">Sadece antrenörler</option><option value="sekreter">Sadece sekreterler</option><option value="ders">Bir ders saati</option><option value="ogrenciler">Seçili öğrenciler</option><option value="kisiler">Seçili kişiler</option></select></label>
            {audience === 'ders' && <label>Ders<select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Seçin</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>}
          </div>
          {audience === 'ogrenciler' && <div className="coach-picks">{students.map((s) => (
            <label className="check" key={s.id}><input type="checkbox" checked={pickedStudents.includes(s.id)} onChange={() => setPickedStudents((p) => (p.includes(s.id) ? p.filter((x) => x !== s.id) : [...p, s.id]))} /><span>{s.firstName} {s.lastName}</span></label>
          ))}</div>}
          {audience === 'kisiler' && <div className="coach-picks">{users.filter((u) => u.id !== user.id).map((u) => (
            <label className="check" key={u.id}><input type="checkbox" checked={people.includes(u.id)} onChange={() => setPeople((p) => (p.includes(u.id) ? p.filter((x) => x !== u.id) : [...p, u.id]))} /><span>{u.name}</span><em className="badge">{ROLE_LABEL[u.role]}</em></label>
          ))}</div>}
          <label>Mesaj<textarea required rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <div className="form-actions"><button className="primary">Yayınla ve bildir</button>{status && <span className="ok" role="status">{status}</span>}</div>
        </form>
      )}
      <section className="card">
        <h2>Gelen bildirimler</h2>
        {visible.length === 0 ? <p className="muted">Henüz bildirim yok.</p> : (
          <ul className="simple-list">{visible.map((n) => (
            <li key={n.id}><span><strong>{n.title}</strong><small>{n.body}{n.date ? ` · ${dateTr(n.date)}` : ''}</small></span><em className="badge">{n.kind === 'yaris' ? 'Yarış' : n.kind === 'ders' ? 'Ders' : n.kind === 'odeme' ? 'Ödeme' : 'Duyuru'}</em></li>
          ))}</ul>
        )}
      </section>
    </div>
  );
}
