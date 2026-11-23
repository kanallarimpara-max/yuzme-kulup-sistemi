import { useSession } from '../../lib/session';
import { useCollection } from '../../lib/store';
import { enrollmentScope, studentScope } from '../../lib/access';
import { paymentSummary, toIso } from '../../lib/rules';
import { dateTr, dayNames, money } from '../../lib/format';
import { useAttendance } from '../../lib/useAttendance';
import type { Branch, Enrollment, Lesson, Notice, Student, User, Workout } from '../../lib/types';

const MARK = { geldi: ['Geldi', 'good'], gelmedi: ['Gelmedi', 'bad'], izinli: ['İzinli', 'warn'] } as const;

export default function ParentHome() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const scope = { clubId };
  const students = useCollection<Student>('students', studentScope(user));
  const enrollments = useCollection<Enrollment>('enrollments', enrollmentScope(user));
  const lessons = useCollection<Lesson>('lessons', scope);
  const branches = useCollection<Branch>('branches', scope);
  const users = useCollection<User>('users', scope);
  const workouts = useCollection<Workout>('workouts', scope);
  const attendance = useAttendance(user);
  const notices = useCollection<Notice>('notices', user ? { contains: ['recipientIds', user.id] } : { skip: true });
  if (!user) return null;
  const today = toIso(new Date());
  const mine = students.filter((s) => s.parentId === user.id);
  const races = notices.filter((n) => n.kind === 'yaris' && n.recipientIds.includes(user.id)).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Veli</p><h1>Sporcularım</h1></div></header>
      {mine.length === 0 && <section className="card"><p className="muted">Kaydınız tamamlandığında sporcu bilgileri burada görünür.</p></section>}
      {mine.map((s) => {
        const lesson = lessons.find((l) => l.id === s.lessonId);
        const plan = enrollments.find((e) => e.studentId === s.id);
        const sum = plan ? paymentSummary(plan.installments, today) : null;
        const marks = attendance.filter((a) => a.marks[s.id]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
        const assigned = workouts.filter((w) => w.lessonId === s.lessonId).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 5);
        return (
          <section className="card stack" key={s.id}>
            <div className="page-head"><div><h2>{s.firstName} {s.lastName}</h2>{lesson && <p className="muted">{lesson.name} · {branches.find((b) => b.id === lesson.branchId)?.name} · {dayNames(lesson.weekdays)} {lesson.startTime} · {users.find((u) => u.id === s.coachId)?.name}</p>}</div></div>
            <div className="stats three">
              <article><span>Toplam aidat</span><strong className="fit">{sum ? money(sum.totalKurus) : '—'}</strong></article>
              <article><span>Ödenen</span><strong className="fit">{sum ? money(sum.paidKurus) : '—'}</strong></article>
              <article><span>Kalan</span><strong className="fit">{sum ? money(sum.remainingKurus) : '—'}</strong></article>
            </div>
            {sum?.next && <p className="muted">Sonraki taksit {dateTr(sum.next.dueDate)} · {money(sum.next.amountKurus)}</p>}
            <div className="two-col">
              <div><h2>Antrenmanlar</h2>{assigned.length === 0 ? <p className="muted">Atanmış antrenman yok.</p> : <ul className="simple-list">{assigned.map((w) => <li key={w.id}><span>{w.title}<small>{w.date ? dateTr(w.date) : ''} · {w.sets.map((x) => `${x.reps}×${x.distance} ${x.stroke}`).join(', ')}</small></span></li>)}</ul>}</div>
              <div><h2>Devam durumu</h2>{marks.length === 0 ? <p className="muted">Henüz yoklama yok.</p> : <ul className="simple-list">{marks.map((a) => <li key={a.id}><span>{dateTr(a.date)}</span><em className={`badge ${MARK[a.marks[s.id]][1]}`}>{MARK[a.marks[s.id]][0]}</em></li>)}</ul>}</div>
            </div>
          </section>
        );
      })}
      <section className="card stack"><h2>TYF canlı sonuçlar</h2><p className="muted">Devam eden yarışların resmi sonuçlarını Türkiye Yüzme Federasyonu sayfasından izleyin.</p><div><a className="button" href="https://www.tyf.gov.tr/canli-sonuc/" target="_blank" rel="noreferrer">Canlı sonuçları aç</a></div></section>
      <section className="card"><h2>Yarış planı</h2>{races.length === 0 ? <p className="muted">Planlı yarış yok.</p> : <ul className="simple-list">{races.map((r) => <li key={r.id}><span>{r.title}<small>{r.date ? dateTr(r.date) : ''} · {r.body}</small></span></li>)}</ul>}</section>
    </div>
  );
}
