import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { toIso } from '../lib/rules';
import { ROLE_LABEL, type Branch, type Lesson, type Student } from '../lib/types';

export default function Dashboard() {
  const { user, club } = useSession();
  const scope = { clubId: user?.clubId };
  const lessons = useCollection<Lesson>('lessons', scope);
  const students = useCollection<Student>('students', scope);
  const branches = useCollection<Branch>('branches', scope);
  if (!user) return null;

  const now = new Date();
  const today = toIso(now);
  const mine = user.role === 'coach' ? lessons.filter((l) => l.coachIds.includes(user.id)) : lessons;
  const todays = mine
    .filter((l) => l.weekdays.includes(now.getDay()) && l.startDate <= today && l.endDate >= today)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const visibleStudents = user.role === 'parent'
    ? students.filter((s) => s.parentId === user.id)
    : user.role === 'coach' ? students.filter((s) => s.coachId === user.id) : students;
  const countFor = (id: string) => students.filter((s) => s.lessonId === id).length;

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">{ROLE_LABEL[user.role]}</p><h1>Merhaba, {user.name.split(' ')[0]}</h1></div>
        <p className="muted">{club?.name ?? 'Platform yönetimi'} · {now.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
      </header>
      <section className="stats">
        <article><span>Bugünkü ders</span><strong>{todays.length}</strong></article>
        <article><span>{user.role === 'parent' ? 'Sporcum' : 'Öğrenci'}</span><strong>{visibleStudents.length}</strong></article>
        <article><span>Aktif ders saati</span><strong>{mine.length}</strong></article>
        <article><span>Şube</span><strong>{branches.length}</strong></article>
      </section>
      <section className="card">
        <h2>Bugünün programı</h2>
        {todays.length === 0 ? <p className="muted">Bugün planlı ders yok.</p> : (
          <ul className="rows">
            {todays.map((l) => (
              <li key={l.id}>
                <strong>{l.startTime}–{l.endTime}</strong>
                <span>{l.name}<small>{branches.find((b) => b.id === l.branchId)?.name}</small></span>
                <em>{countFor(l.id)}/{l.capacity} kişi</em>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
