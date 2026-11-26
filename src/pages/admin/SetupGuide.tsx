import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Circle } from 'lucide-react';
import { useCollection } from '../../lib/store';
import { clubSetupSteps, nextSetupStep } from '../../lib/setup';
import type { Branch, Club, Lesson, Student, TrainingModel, User } from '../../lib/types';

/** Kulüp yöneticisinin panelinde: kurulum adımları ve sıradaki işin ekranına giden düğme. Hepsi bitince gizlenir. */
export default function SetupGuide({ club }: { club: Club }) {
  const scope = { clubId: club.id };
  const branches = useCollection<Branch>('branches', scope);
  const models = useCollection<TrainingModel>('models', scope);
  const lessons = useCollection<Lesson>('lessons', scope);
  const users = useCollection<User>('users', scope);
  const students = useCollection<Student>('students', scope);
  const steps = clubSetupSteps({
    logo: Boolean(club.logoUrl), branches: branches.length, models: models.length,
    coaches: users.filter((u) => u.role === 'coach').length, lessons: lessons.length, students: students.length,
  });
  const next = nextSetupStep(steps);
  if (!next) return null;
  const done = steps.filter((s) => s.done).length;
  return (
    <section className="card stack setup-guide" aria-label="Kulüp açılış rehberi">
      <div className="race-tools">
        <h2>Kulüp kurulumu</h2>
        <span className="badge">{done}/{steps.length} adım tamam</span>
      </div>
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={done}><span style={{ width: `${(done / steps.length) * 100}%` }} /></div>
      <ol className="setup-list">
        {steps.map((s) => (
          <li key={s.key} className={s.done ? 'done' : s.key === next.key ? 'current' : ''}>
            {s.done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
            <span><strong>{s.label}</strong>{!s.done && <small>{s.help}</small>}</span>
            {s.key === next.key && <Link className="button primary" to={s.to}>{s.cta} <ArrowRight size={15} /></Link>}
          </li>
        ))}
      </ol>
    </section>
  );
}
