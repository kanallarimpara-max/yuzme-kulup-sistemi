import { LEVELS, SKILL_GROUPS, skillProgress, type SkillLevel } from '../../lib/skills';

/** Velinin gördüğü beceri karnesi: yalnız işaretlenmiş beceriler ve düzeyleri. */
export default function SkillSummary({ marks }: { marks?: Record<string, SkillLevel> }) {
  const p = skillProgress(marks);
  const label = (lv: SkillLevel) => LEVELS.find((l) => l.id === lv)?.label ?? '';
  if (!marks || Object.keys(marks).length === 0) return <p className="muted">Antrenör henüz beceri işaretlemedi.</p>;
  return (
    <div className="stack">
      <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={p.total} aria-valuenow={p.independent} aria-label="Bağımsız yapılan beceriler"><span style={{ width: `${p.percent}%` }} /></div>
      <small className="muted">{p.total} becerinin {p.independent} tanesini bağımsız yapıyor.</small>
      {SKILL_GROUPS.map((g) => {
        const done = g.skills.filter((s) => marks[s.id]);
        if (!done.length) return null;
        return <div key={g.title}><h3 className="race-month">{g.title}</h3><ul className="skill-chips">{done.map((s) => <li key={s.id} className={`lvl-${marks[s.id]}`}><span>{s.label}</span><small>{label(marks[s.id])}</small></li>)}</ul></div>;
      })}
    </div>
  );
}
