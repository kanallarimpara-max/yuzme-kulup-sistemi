import { useMemo, useState } from 'react';
import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { studentScope } from '../lib/access';
import { EVENTS, formatSwimTime, type Stroke } from '../lib/rules';
import { STROKE_LABEL } from '../lib/format';
import { groupLabel } from '../lib/standardData';
import { useStandards } from '../lib/useStandards';
import type { Student } from '../lib/types';

const ageText = (a: number, b?: number) => (b === 99 ? `${a}+` : b && b !== a ? `${a}-${b}` : String(a));

export default function Standards() {
  const { user } = useSession();
  const students = useCollection<Student>('students', user?.clubId ? studentScope(user) : { skip: true });
  const { standards, season, source, checkedAt, changedAt } = useStandards();
  const groups = useMemo(() => [...new Set(standards.map(groupLabel))], [standards]);
  const [pickedGroup, setGroup] = useState('');
  const [pickedPool, setPool] = useState<'25m' | '50m'>('25m');
  const [kind, setKind] = useState<'katilim' | 'harcirah'>('katilim');
  const [gender, setGender] = useState<'K' | 'E'>('K');
  const child = user?.role === 'parent' ? students.find((s) => s.parentId === user.id) : undefined;
  // Veli ilk açılışta çocuğunun yaşına baraj bulunan yarışı görür.
  const fitsChild = (g: string) => !child || standards.some((s) => {
    const age = Number(g.match(/20\d{2}/)?.[0] ?? new Date().getFullYear()) - child.birthYear;
    return groupLabel(s) === g && s.gender === child.gender && age >= s.age && age <= (s.maxAge ?? s.age);
  });
  const group = groups.includes(pickedGroup) ? pickedGroup : groups.find(fitsChild) ?? groups[0];
  // Uzun kulvar yarışında 25 m seçili kalıp tablo boş görünmez.
  const pools = [...new Set(standards.filter((s) => groupLabel(s) === group).map((s) => s.pool))];
  const pool = pools.includes(pickedPool) ? pickedPool : (pools[0] ?? pickedPool);

  const rows = standards.filter((s) => groupLabel(s) === group && s.pool === pool && s.kind === kind && s.gender === (child?.gender ?? gender));
  const year = Number(group.match(/20\d{2}/)?.[0] ?? new Date().getFullYear());
  const childAge = child ? year - child.birthYear : null;
  const ages = [...new Map(rows.map((r) => [`${r.age}-${r.maxAge}`, { age: r.age, maxAge: r.maxAge }])).values()]
    .sort((a, b) => a.age - b.age)
    .filter((a) => childAge === null || (childAge >= a.age && childAge <= (a.maxAge ?? a.age)));
  const cell = (stroke: Stroke, distance: number, age: number) => rows.find((r) => r.stroke === stroke && r.distance === distance && r.age === age);
  const events = (Object.keys(EVENTS) as Stroke[]).flatMap((stroke) => EVENTS[stroke].map((distance) => ({ stroke, distance }))).filter((e) => rows.some((r) => r.stroke === e.stroke && r.distance === e.distance));

  return (
    <div className="page">
      <header className="page-head"><div><h1>Barajlar</h1><p className="page-meta">{season} sezonu</p>{checkedAt && <p className="muted">TYF son kontrol {new Date(checkedAt).toLocaleDateString('tr-TR')}{changedAt ? ` · son değişiklik ${new Date(changedAt).toLocaleDateString('tr-TR')}` : ''}</p>}</div><a className="button" href={source} target="_blank" rel="noreferrer">TYF kaynağı</a></header>
      <section className="card form-grid">
        <label>Yarış<select value={group} onChange={(e) => setGroup(e.target.value)}>{groups.map((g) => <option key={g}>{g}</option>)}</select></label>
        <label>Havuz<select value={pool} onChange={(e) => setPool(e.target.value as '25m' | '50m')}><option value="25m" disabled={!pools.includes('25m')}>25 m</option><option value="50m" disabled={!pools.includes('50m')}>50 m</option></select></label>
        <label>Baraj türü<select value={kind} onChange={(e) => setKind(e.target.value as 'katilim' | 'harcirah')}><option value="katilim">Katılım</option><option value="harcirah">Harcırah</option></select></label>
        {!child && <label>Cinsiyet<select value={gender} onChange={(e) => setGender(e.target.value as 'K' | 'E')}><option value="K">Kadın</option><option value="E">Erkek</option></select></label>}
      </section>
      {child && <p className="muted">{child.firstName} için {childAge} yaş barajları gösteriliyor.</p>}
      <section className="card">
        {rows.length === 0 || ages.length === 0 ? <p className="muted">{child ? `${child.firstName} (${childAge} yaş) için bu yarışta baraj yok. Başka bir yarış seçebilirsin.` : 'Bu seçim için reglamanda baraj yok.'}</p> : <div className="table-wrap"><table>
          <thead><tr><th>Branş</th>{ages.map((a) => <th key={a.age}>{ageText(a.age, a.maxAge)} yaş</th>)}</tr></thead>
          <tbody>{events.map((e) => <tr key={`${e.stroke}-${e.distance}`}><th>{e.distance} m {STROKE_LABEL[e.stroke]}</th>{ages.map((a) => { const c = cell(e.stroke, e.distance, a.age); return <td key={a.age}>{c ? formatSwimTime(c.timeMs) : '—'}</td>; })}</tr>)}</tbody>
        </table></div>}
      </section>
    </div>
  );
}
