import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { salaryScope, studentScope } from '../lib/access';
import { toIso } from '../lib/rules';
import { money } from '../lib/format';
import { ROLE_LABEL, type Branch, type Lesson, type LessonPay, type SalaryPayment, type Student } from '../lib/types';
import OwnerDashboard from './super/OwnerDashboard';

export default function Dashboard() {
  const { user } = useSession();
  return user?.role === 'super' ? <OwnerDashboard /> : <ClubDashboard />;
}

function ClubDashboard() {
  const { user, club } = useSession();
  const scope = { clubId: user?.clubId };
  const lessons = useCollection<Lesson>('lessons', scope);
  const students = useCollection<Student>('students', studentScope(user));
  const branches = useCollection<Branch>('branches', scope);
  const salaries = useCollection<SalaryPayment>('salaries', salaryScope(user));
  const pay = useCollection<LessonPay>('lessonPay', user?.role === 'coach' ? { contains: ['coachIds', user.id] } : { skip: true });
  if (!user) return null;

  const now = new Date();
  const today = toIso(now);
  const isParent = user.role === 'parent';
  const visibleStudents = isParent
    ? students.filter((s) => s.parentId === user.id)
    : user.role === 'coach' ? students.filter((s) => s.coachId === user.id) : students;
  // Veli kulübün tüm derslerini değil, yalnız çocuğunun derslerini görür.
  const mine = user.role === 'coach'
    ? lessons.filter((l) => l.coachIds.includes(user.id))
    : isParent ? lessons.filter((l) => visibleStudents.some((s) => s.lessonId === l.id)) : lessons;
  const todays = mine
    .filter((l) => l.weekdays.includes(now.getDay()) && l.startDate <= today && l.endDate >= today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const myBranches = user.role === 'coach' || isParent ? new Set(mine.map((l) => l.branchId)).size : branches.length;
  const countFor = (id: string) => students.filter((s) => s.lessonId === id).length;
  const kidsIn = (id: string) => visibleStudents.filter((s) => s.lessonId === id).map((s) => s.firstName).join(', ');
  const salaryTotal = pay.reduce((s, l) => s + l.coachPayKurus, 0);
  const salaryPaid = salaries.filter((s) => s.coachId === user.id).reduce((t, s) => t + s.amountKurus, 0);

  return (
    <div className="page">
      <header className="page-head">
        <div>{club?.logoUrl && <img src={club.logoUrl} alt={`${club.name} logosu`} style={{ borderRadius: 10, height: 48, marginBottom: 8, width: 48, objectFit: 'cover' }} />}<p className="eyebrow">{ROLE_LABEL[user.role]}</p><h1>Merhaba, {user.name.split(' ')[0]}</h1></div>
        <p className="muted">{club?.name} ·{now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
      </header>
      <section className="stats">
        <article><span>Bugünkü ders</span><strong>{todays.length}{!isParent && <small> · {todays.reduce((s, l) => s + countFor(l.id), 0)} kişi</small>}</strong></article>
        <article><span>{isParent ? 'Sporcum' : 'Öğrenci'}</span><strong>{visibleStudents.length}</strong></article>
        <article><span>{isParent ? 'Ders saati' : 'Aktif ders saati'}</span><strong>{mine.length}</strong></article>
        <article><span>Şube</span><strong>{myBranches}</strong></article>
      </section>
      {user.role === 'coach' && (
        <section className="stats">
          <article><span>Ortalama ders ücreti</span><strong className="fit">{money(mine.length ? Math.round(mine.reduce((s, l) => s + l.feeKurus, 0) / mine.length) : 0)}</strong></article>
          <article><span>Toplam maaş</span><strong className="fit">{money(salaryTotal)}</strong></article>
          <article><span>Aldığım</span><strong className="fit">{money(salaryPaid)}</strong></article>
          <article><span>Alacağım</span><strong className="fit">{money(salaryTotal - salaryPaid)}</strong></article>
        </section>
      )}
      <section className="card">
        <h2>Bugünün programı</h2>
        {todays.length === 0 ? <p className="muted">Bugün planlı ders yok.</p> : (
          <ul className="rows">
            {todays.map((l) => (
              <li key={l.id}>
                <strong>{l.startTime}–{l.endTime}</strong>
                <span>{l.name}<small>{branches.find((b) => b.id === l.branchId)?.name}</small></span>
                <em>{isParent ? kidsIn(l.id) : `${countFor(l.id)}/${l.capacity} kişi`}</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
