import { Link } from 'react-router-dom';
import { Flag, Maximize2, Pause, Play, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { finishLane, jumpLane, pauseLane, startLane } from '../lib/timer';
import type { TimerLane } from '../lib/types';
import { useTimerDoc } from './useTimerDoc';

const idleClock = { status: 'idle' as const, startedAt: null, offsetMs: 0 };

export default function TimerControl() {
  const { lanes, workouts, save } = useTimerDoc();
  const setsOf = (lane: TimerLane) => workouts.find((w) => w.id === lane.workoutId)?.sets ?? [];
  const patch = (id: string, fn: (lane: TimerLane) => TimerLane) => save(lanes.map((l) => (l.id === id ? fn(l) : l)));
  const all = (fn: (lane: TimerLane) => TimerLane) => save(lanes.map((l) => (l.workoutId ? fn(l) : l)));

  const addLane = () => save([...lanes, {
    id: `lane-${Date.now()}`,
    name: `Kulvar ${lanes.length + 1}`,
    workoutId: workouts[0]?.id ?? null,
    clock: idleClock,
  }]);

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">Uzaktan kumanda</p><h1>Kronometre kontrol</h1></div>
        <Link className="button primary" to="/kronometre/ekran"><Maximize2 size={16} />Ekranı aç</Link>
      </header>

      <section className="card toolbar">
        <button className="primary" onClick={() => all((l) => ({ ...l, clock: startLane(l.clock, Date.now()) }))}><Play size={16} />Tümünü başlat</button>
        <button onClick={() => all((l) => (l.clock.status === 'running' ? { ...l, clock: pauseLane(l.clock, Date.now()) } : l))}><Pause size={16} />Tümünü durdur</button>
        <button onClick={() => all((l) => ({ ...l, clock: finishLane() }))}><Flag size={16} />Tümünü bitir</button>
        <button onClick={() => all((l) => ({ ...l, clock: jumpLane(setsOf(l), 0, Date.now()) }))}><RotateCcw size={16} />Tümü baştan</button>
        <button onClick={addLane}><Plus size={16} />Kulvar ekle</button>
      </section>

      {lanes.length === 0 && <section className="card"><p className="muted">Başlamak için bir kulvar ekleyin.</p></section>}
      <div className="lane-controls">
        {lanes.map((lane) => (
          <article className="card" key={lane.id}>
            <div className="lane-control-head">
              <input aria-label="Kulvar adı" value={lane.name} onChange={(e) => patch(lane.id, (l) => ({ ...l, name: e.target.value }))} />
              <button className="ghost icon" aria-label={`${lane.name} kulvarını sil`} title="Kulvarı sil" onClick={() => save(lanes.filter((l) => l.id !== lane.id))}><Trash2 size={16} /></button>
            </div>
            <label>Antrenman
              <select value={lane.workoutId ?? ''} onChange={(e) => patch(lane.id, (l) => ({ ...l, workoutId: e.target.value || null, clock: idleClock }))}>
                <option value="">Seçin</option>
                {workouts.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}
              </select>
            </label>
            <label>Setten başlat
              <select value="" disabled={!lane.workoutId} onChange={(e) => patch(lane.id, (l) => ({ ...l, clock: jumpLane(setsOf(l), Number(e.target.value), Date.now()) }))}>
                <option value="" disabled>Set seçin</option>
                {setsOf(lane).map((s, i) => <option key={i} value={i}>{i + 1}. {s.name} · {s.reps}×{s.distance} m</option>)}
              </select>
            </label>
            <div className="lane-actions">
              <button className="primary" disabled={!lane.workoutId || lane.clock.status === 'running'} onClick={() => patch(lane.id, (l) => ({ ...l, clock: startLane(l.clock, Date.now()) }))}><Play size={15} />Başlat</button>
              <button disabled={lane.clock.status !== 'running'} onClick={() => patch(lane.id, (l) => ({ ...l, clock: pauseLane(l.clock, Date.now()) }))}><Pause size={15} />Durdur</button>
              <button disabled={!lane.workoutId} onClick={() => patch(lane.id, (l) => ({ ...l, clock: finishLane() }))}><Flag size={15} />Bitir</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
