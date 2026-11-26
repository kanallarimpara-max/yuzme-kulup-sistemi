import { useState, type FormEvent } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { db, useCollection } from '../../lib/store';
import { toIso } from '../../lib/rules';
import { dateTr, STROKE_LABEL } from '../../lib/format';
import { totalMs } from '../../lib/timer';
import type { Workout } from '../../lib/types';
import { useCoachData } from './useCoachData';

type Draft = { name: string; reps: number; distance: number; stroke: string; min: number; sec: number; cs: number; restMin: number; restSec: number };
const blank = (): Draft => ({ name: '', reps: 4, distance: 100, stroke: 'Serbest', min: 2, sec: 0, cs: 0, restMin: 0, restSec: 30 });

export default function WorkoutBuilder() {
  const { user, clubId, lessons, students, branchName } = useCoachData();
  const workouts = useCollection<Workout>('workouts', { clubId });
  const [title, setTitle] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [date, setDate] = useState(toIso(new Date()));
  const [drafts, setDrafts] = useState<Draft[]>([blank()]);
  const [status, setStatus] = useState('');
  if (!user) return null;

  const patch = (i: number, change: Partial<Draft>) => setDrafts((list) => list.map((d, n) => (n === i ? { ...d, ...change } : d)));
  const num = (i: number, key: keyof Draft, label: string, min = 0) => (
    <label>{label}<input type="number" min={min} value={drafts[i][key]} onChange={(e) => patch(i, { [key]: Number(e.target.value) })} /></label>
  );
  const sets = drafts.map((d, i) => ({
    name: d.name.trim() || `Set ${i + 1}`, reps: d.reps, distance: d.distance, stroke: d.stroke,
    intervalMs: d.min * 60000 + d.sec * 1000 + d.cs * 10, restMs: d.restMin * 60000 + d.restSec * 1000,
  }));
  const valid = title.trim() && lessonId && sets.every((s) => s.reps > 0 && s.distance > 0 && s.intervalMs > 0);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    await db.add('workouts', { clubId, coachId: user.id, title: title.trim(), lessonId, date, sets });
    const recipientIds = [...new Set(students.filter((s) => s.lessonId === lessonId).map((s) => s.parentId))];
    if (recipientIds.length) {
      await db.add('notices', { clubId, senderId: user.id, kind: 'ders', title: 'Yeni antrenman paylaşıldı', body: `${title.trim()} · ${dateTr(date)}`, recipientIds, readBy: [] });
    }
    setTitle('');
    setDrafts([blank()]);
    setStatus(`Antrenman kaydedildi, ${recipientIds.length} veliye bildirildi.`);
  };

  const mine = workouts.filter((w) => w.coachId === user.id);
  return (
    <div className="page">
      <header className="page-head"><div><h1>Antrenman oluştur</h1></div></header>
      <form className="card stack" onSubmit={submit}>
        <div className="form-grid">
          <label>Antrenman adı<input required value={title} onChange={(e) => setTitle(e.target.value)} /></label>
          <label>Şube ve ders saati<select required value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Seçin</option>{lessons.map((l) => <option key={l.id} value={l.id}>{branchName(l.branchId)} · {l.name}</option>)}</select></label>
          <label>Yapılacak gün<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        {drafts.map((d, i) => (
          <fieldset className="set-card" key={i}>
            <legend>{i + 1}. set</legend>
            <div className="set-grid">
              <label className="wide">Set adı<input value={d.name} onChange={(e) => patch(i, { name: e.target.value })} /></label>
              {num(i, 'reps', 'Tekrar', 1)}
              {num(i, 'distance', 'Mesafe (m)', 1)}
              <label>Stil<select value={d.stroke} onChange={(e) => patch(i, { stroke: e.target.value })}>{Object.values(STROKE_LABEL).map((s) => <option key={s}>{s}</option>)}</select></label>
              {num(i, 'min', 'İnterval dk')}
              {num(i, 'sec', 'İnterval sn')}
              {num(i, 'cs', 'Salise')}
              {num(i, 'restMin', 'Dinlenme dk')}
              {num(i, 'restSec', 'Dinlenme sn')}
            </div>
            {drafts.length > 1 && <button type="button" className="ghost" onClick={() => setDrafts(drafts.filter((_, n) => n !== i))}><Trash2 size={15} />Seti sil</button>}
          </fieldset>
        ))}
        <div className="form-actions">
          <button type="button" onClick={() => setDrafts([...drafts, blank()])}><Plus size={16} />Set ekle</button>
          <button className="primary" disabled={!valid}>Antrenmanı kaydet</button>
          <span className="muted">Toplam {Math.round(totalMs(sets) / 60000)} dk · {sets.reduce((s, x) => s + x.reps * x.distance, 0)} m</span>
          {status && <span className="ok" role="status">{status}</span>}
        </div>
      </form>
      <section className="card"><h2>Antrenmanlarım</h2><ul className="simple-list">{mine.map((w) => (
        <li key={w.id}><span>{w.title}<small>{w.sets.length} set · {w.sets.reduce((s, x) => s + x.reps * x.distance, 0)} m{w.date ? ` · ${dateTr(w.date)}` : ''}</small></span></li>
      ))}</ul></section>
    </div>
  );
}
