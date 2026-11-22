import { useMemo, useState } from 'react';
import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { EVENTS, formatSwimTime, type Stroke } from '../lib/rules';
import { STROKE_LABEL } from '../lib/format';
import { groupLabel, STANDARD_SEASON, STANDARD_SOURCE, STANDARDS } from '../lib/standardData';
import type { Student } from '../lib/types';

const ageText = (a: number, b?: number) => (b === 99 ? `${a}+` : b && b !== a ? `${a}-${b}` : String(a));

export default function Standards() {
  const { user } = useSession();
  const students = useCollection<Student>('students', { clubId: user?.clubId ?? '__none__' });
  const groups = useMemo(() => [...new Set(STANDARDS.map(groupLabel))], []);
  const [group, setGroup] = useState(groups[0]);
  const [pool, setPool] = useState<'25m' | '50m'>('25m');
  const [kind, setKind] = useState<'katilim' | 'harcirah'>('katilim');
  const [gender, setGender] = useState<'K' | 'E'>('K');
  const child = user?.role === 'parent' ? students.find((s) => s.parentId === user.id) : undefined;

  const rows = STANDARDS.filter((s) => groupLabel(s) === group && s.pool === pool && s.kind === kind && s.gender === (child?.gender ?? gender));
  const year = Number(group.match(/20\d{2}/)?.[0] ?? new Date().getFullYear());
  const childAge = child ? year - child.birthYear : null;
  const ages = [...new Map(rows.map((r) => [`${r.age}-${r.maxAge}`, { age: r.age, maxAge: r.maxAge }])).values()]
    .sort((a, b) => a.age - b.age)
    .filter((a) => childAge === null || (childAge >= a.age && childAge <= (a.maxAge ?? a.age)));
  const cell = (stroke: Stroke, distance: number, age: number) => rows.find((r) => r.stroke === stroke && r.distance === distance && r.age === age);
  const events = (Object.keys(EVENTS) as Stroke[]).flatMap((stroke) => EVENTS[stroke].map((distance) => ({ stroke, distance }))).filter((e) => rows.some((r) => r.stroke === e.stroke && r.distance === e.distance));

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">{STANDARD_SEASON} sezonu</p><h1>Barajlar</h1></div><a className="button" href={STANDARD_SOURCE} target="_blank" rel="noreferrer">TYF kaynağı</a></header>
      <section className="card form-grid">
        <label>Yarış<select value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label>Havuz<select value={pool} onChange={(e) => setPool(e.target.value as '25m' | '50m')}><option value="25m">25 m</option><option value="50m">50 m</option></select></label>
        <label>Baraj türü<select value={kind} onChange={(e) => setKind(e.target.value as 'katilim' | 'harcirah')}><option value="katilim">Katılım</option><option value="harcirah">Harcırah</option></select></label>
        {!child && <label>Cinsiyet<select value={gender} onChange={(e) => setGender(e.target.value as 'K' | 'E')}><option value="K">Kadın</option><option value="E">Erkek</option></select></label>}
      </section>
      {child && <p className="muted">{child.firstName} için {childAge} yaş barajları gösteriliyor.</p>}
      <section className="card">
        {rows.length === 0 || ages.length === 0 ? <p className="muted">Bu seçim için reglamanda baraj yok.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Branş</th>{ages.map((a) => <th key={a.age}>{ageText(a.age, a.maxAge)} yaş</th>)}</tr></thead>
          <tbody>{events.map((e) => <tr key={`${e.stroke}-${e.distance}`}><th>{e.distance} m {STROKE_LABEL[e.stroke]}</th>{ages.map((a) => { const c = cell(e.stroke, e.distance, a.age); return <td key={a.age}>{c ? formatSwimTime(c.timeMs) : '—'}</td>; })}</tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  );
}
