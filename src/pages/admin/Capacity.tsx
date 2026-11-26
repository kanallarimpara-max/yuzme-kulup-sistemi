import { Fragment, useState } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { toIso } from '../../lib/rules';
import { dateTr, dayNames } from '../../lib/format';
import type { Branch, Lesson, PreReg, Renewal, Student, TrainingModel } from '../../lib/types';

const SOON_DAYS = 45;
const addDays = (iso: string, days: number) => toIso(new Date(Date.parse(`${iso}T12:00:00`) + days * 86400000));

/** Gelecek dönemin doluluğu: mevcut öğrenci, dönemi bitenler, devam yanıtları ve bekleyen başvurular ders saati bazında. */
export default function Capacity() {
  const { user, club } = useSession();
  const clubId = club?.id ?? '';
  const scope = { clubId };
  const lessons = useCollection<Lesson>('lessons', scope);
  const students = useCollection<Student>('students', scope);
  const renewals = useCollection<Renewal>('renewals', scope);
  const prereg = useCollection<PreReg>('prereg', scope);
  const branches = useCollection<Branch>('branches', scope);
  const models = useCollection<TrainingModel>('models', scope);
  const [open, setOpen] = useState('');
  if (!club || !user) return null;
  const today = toIso(new Date());
  const soon = addDays(today, SOON_DAYS);
  const waiting = prereg.filter((p) => p.status === 'yeni');
  const answerOf = (s: Student) => renewals.find((r) => r.studentId === s.id && r.lessonId === s.lessonId)?.status;
  const setAnswer = (s: Student, status: Renewal['status']) => db.put('renewals', s.id, {
    clubId, studentId: s.id, parentId: s.parentId, lessonId: s.lessonId, status, updatedAt: Date.now(), updatedBy: user.id,
  });

  const rows = lessons.filter((l) => l.endDate >= today).sort((a, b) => a.endDate.localeCompare(b.endDate) || a.startTime.localeCompare(b.startTime)).map((l) => {
    const kids = students.filter((s) => s.lessonId === l.id);
    const ending = l.endDate <= soon;
    const stay = kids.filter((s) => answerOf(s) === 'devam').length;
    const leave = kids.filter((s) => answerOf(s) === 'ayrilacak').length;
    const unknown = kids.length - stay - leave;
    const queue = waiting.filter((p) => p.branchId === l.branchId && p.modelId === l.modelId).length;
    // Yanıt vermeyenlerin yeri korunur; kesin boş yer yalnız ayrılacaklar ve boş kontenjandır.
    const demand = stay + unknown + queue;
    const verdict = demand > l.capacity ? ['bad', 'Yeni grup gerekebilir'] : leave > 0 ? ['good', `${leave} yer açılıyor`] : kids.length >= l.capacity ? ['warn', 'Dolu'] : ['good', `${l.capacity - kids.length} boş yer`];
    return { l, kids, ending, stay, leave, unknown, queue, demand, verdict };
  });
  const unmatched = waiting.filter((p) => !lessons.some((l) => l.endDate >= today && l.branchId === p.branchId && l.modelId === p.modelId));

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Kulüp yönetimi</p><h1>Gelecek dönem doluluğu</h1>
        <p className="muted">Dönemi {SOON_DAYS} gün içinde biten derslerde velilere "devam edecek misiniz?" sorusu gösterilir. Bekleyen başvurular aynı şube ve eğitim modeline göre sayılır.</p></div></header>
      <section className="card"><div className="table-wrap"><table className="capacity-table">
        <thead><tr><th>Ders saati</th><th>Dönem sonu</th><th>Kontenjan</th><th>Mevcut</th><th>Devam edecek</th><th>Ayrılacak</th><th>Yanıt yok</th><th>Bekleyen başvuru</th><th>Değerlendirme</th></tr></thead>
        <tbody>{rows.length === 0 ? <tr><td colSpan={9} className="muted">Açık ders saati yok.</td></tr> : rows.map((r) => (
          <Fragment key={r.l.id}>
            <tr>
              <td><button className="link" onClick={() => setOpen(open === r.l.id ? '' : r.l.id)} aria-expanded={open === r.l.id}><strong>{r.l.name}</strong></button>
                <small>{branches.find((b) => b.id === r.l.branchId)?.name} · {models.find((m) => m.id === r.l.modelId)?.name ?? '—'} · {dayNames(r.l.weekdays)} {r.l.startTime}</small></td>
              <td>{dateTr(r.l.endDate)}{r.ending && <em className="badge warn">Yaklaşıyor</em>}</td>
              <td>{r.l.capacity}</td>
              <td>{r.kids.length}</td>
              <td>{r.stay}</td>
              <td>{r.leave}</td>
              <td>{r.unknown}</td>
              <td>{r.queue}</td>
              <td><em className={`badge ${r.verdict[0]}`}>{r.verdict[1]}</em><small>Talep {r.demand}/{r.l.capacity}</small></td>
            </tr>
            {open === r.l.id && <tr><td colSpan={9}>
              {r.kids.length === 0 ? <p className="muted">Bu derste öğrenci yok.</p> : <ul className="simple-list">{r.kids.map((s) => {
                const a = answerOf(s);
                return <li key={s.id}><span>{s.firstName} {s.lastName}<small>{a === 'devam' ? 'Devam edecek' : a === 'ayrilacak' ? 'Ayrılacak' : 'Veli henüz yanıt vermedi'}</small></span>
                  <span className="form-actions"><button className={a === 'devam' ? 'primary' : ''} onClick={() => setAnswer(s, 'devam')}>Devam</button><button className={a === 'ayrilacak' ? 'primary' : ''} onClick={() => setAnswer(s, 'ayrilacak')}>Ayrılacak</button></span></li>;
              })}</ul>}
            </td></tr>}
          </Fragment>
        ))}</tbody>
      </table></div></section>
      {unmatched.length > 0 && <section className="card stack">
        <h2>Uygun ders saati olmayan başvurular ({unmatched.length})</h2>
        <p className="muted">Bu başvuruların şube ve eğitim modelinde açık ders yok; yeni bir ders saati açmayı düşünebilirsiniz.</p>
        <ul className="simple-list">{Object.entries(unmatched.reduce<Record<string, number>>((acc, p) => {
          const key = `${branches.find((b) => b.id === p.branchId)?.name ?? 'Şube yok'} · ${models.find((m) => m.id === p.modelId)?.name ?? 'Model yok'}`;
          return { ...acc, [key]: (acc[key] ?? 0) + 1 };
        }, {})).map(([k, n]) => <li key={k}><span>{k}</span><em className="badge warn">{n} başvuru</em></li>)}</ul>
      </section>}
    </div>
  );
}
