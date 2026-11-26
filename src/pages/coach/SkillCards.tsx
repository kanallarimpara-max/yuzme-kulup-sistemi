import { useState } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { studentScope } from '../../lib/access';
import { LEVELS, SKILL_GROUPS, skillProgress, type SkillCard, type SkillLevel } from '../../lib/skills';
import type { Lesson, Student } from '../../lib/types';

/** Antrenör her öğrencinin becerilerini işaretler; yönetici bir üst gruba geçişi bu gözlemlerle değerlendirir. */
export default function SkillCards() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const all = useCollection<Student>('students', studentScope(user));
  const cards = useCollection<SkillCard>('skillCards', clubId ? (user?.role === 'coach' ? { clubId, eq: ['coachId', user.id] } : { clubId }) : { skip: true });
  const lessons = useCollection<Lesson>('lessons', { clubId });
  const [lessonId, setLessonId] = useState('');
  const [picked, setPicked] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;
  const students = all.filter((s) => (user.role === 'coach' ? s.coachId === user.id : true) && (!lessonId || s.lessonId === lessonId))
    .sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'tr'));
  const student = students.find((s) => s.id === picked) ?? students[0];
  const cardOf = (id: string) => cards.find((c) => c.studentId === id);
  const marks = (student && cardOf(student.id)?.marks) || {};
  const myLessons = lessons.filter((l) => user.role !== 'coach' || l.coachIds.includes(user.id));

  const mark = async (skill: string, level: SkillLevel | null) => {
    if (!student) return;
    const next = { ...marks };
    if (level) next[skill] = level;
    else delete next[skill];
    try {
      setError('');
      await db.put('skillCards', student.id, { clubId, studentId: student.id, parentId: student.parentId, coachId: student.coachId, marks: next, updatedAt: Date.now(), updatedBy: user.id });
    } catch {
      setError('Kaydedilemedi. Bu öğrencinin antrenörü değilseniz beceri işaretleyemezsiniz.');
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><h1>Yüzme beceri karnesi</h1>
        <p className="muted">Her beceriyi gözleminize göre işaretleyin. Veli, çocuğu yarışa girmese de kazandığı becerileri görür.</p></div></header>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="skill-layout">
        <section className="card stack">
          <label>Ders saati<select value={lessonId} onChange={(e) => { setLessonId(e.target.value); setPicked(''); }}><option value="">Tüm öğrenciler</option>{myLessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          {students.length === 0 ? <p className="muted">Öğrenci yok.</p> : <ul className="skill-students">{students.map((s) => {
            const p = skillProgress(cardOf(s.id)?.marks);
            return <li key={s.id}><button className={s.id === student?.id ? 'on' : ''} aria-pressed={s.id === student?.id} onClick={() => setPicked(s.id)}>
              <span>{s.firstName} {s.lastName}<small>{lessons.find((l) => l.id === s.lessonId)?.name}</small></span>
              <em className={`badge ${p.percent >= 70 ? 'good' : p.percent >= 30 ? 'warn' : ''}`}>{p.independent}/{p.total}</em></button></li>;
          })}</ul>}
        </section>
        {student && <section className="card stack">
          <div className="race-tools"><h2>{student.firstName} {student.lastName}</h2><span className="badge good">{skillProgress(marks).independent}/{skillProgress(marks).total} bağımsız</span></div>
          {SKILL_GROUPS.map((g) => (
            <div key={g.title} className="stack">
              <h3 className="race-month">{g.title}</h3>
              <ul className="skill-list">{g.skills.map((sk) => (
                <li key={sk.id}>
                  <span>{sk.label}</span>
                  <span className="skill-levels" role="radiogroup" aria-label={sk.label}>
                    {LEVELS.map((lv) => <button key={lv.id} role="radio" aria-checked={marks[sk.id] === lv.id} className={marks[sk.id] === lv.id ? `lvl-${lv.id} on` : `lvl-${lv.id}`} onClick={() => mark(sk.id, marks[sk.id] === lv.id ? null : lv.id)}>{lv.short}</button>)}
                  </span>
                </li>
              ))}</ul>
            </div>
          ))}
          <small className="muted">Seçili düzeye tekrar dokunursanız işaret kalkar.</small>
        </section>}
      </div>
    </div>
  );
}
