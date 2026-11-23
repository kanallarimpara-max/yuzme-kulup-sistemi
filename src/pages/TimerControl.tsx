import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Flag, Lock, LockOpen, Maximize2, Pause, Play, Plus, RotateCcw, Trash2, Volume2, VolumeX } from 'lucide-react';
import { serverNow } from '../lib/clock';
import { clockText, finishLane, jumpLane, laneStatus, pauseLane, startLane, type WorkoutSet } from '../lib/timer';
import type { TimerLane } from '../lib/types';
import { useTimerDoc } from './useTimerDoc';

const idleClock = { status: 'idle' as const, startedAt: null, offsetMs: 0 };

const hour = (ms: number | null) => (ms === null ? '—' : new Date(ms).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

/** Sayaç yalnız bu panoyu yeniler; kulvar adı yazılırken form etkilenmez. */
function LaneBoard({ lanes, setsOf }: { lanes: TimerLane[]; setsOf: (lane: TimerLane) => WorkoutSet[] }) {
  const [now, setNow] = useState(() => serverNow());
  useEffect(() => {
    const t = window.setInterval(() => setNow(serverNow()), 250);
    return () => window.clearInterval(t);
  }, []);
  return (
    <section className="card stack" aria-label="Kulvar durumları">
      <div className="page-head"><h2>Kulvarlar şu an</h2><strong className="board-now">{hour(now)}</strong></div>
      <ul className="lane-board">{lanes.map((lane) => {
        const s = laneStatus(setsOf(lane), lane.clock, now);
        return (
          <li key={lane.id} className={`board-${s.state}`}>
            <div className="board-main">
              <strong>{lane.name}</strong>
              <em>{s.label}</em>
              {lane.muted ? <VolumeX size={15} aria-label="Çıkış sesi kapalı" /> : <Volume2 size={15} aria-label="Çıkış sesi açık" />}
              <small>{s.detail || 'Set bilgisi yok'}</small>
            </div>
            <b className="board-clock">{s.state === 'bitti' || s.state === 'secilmedi' ? '—' : clockText(s.remainingMs)}</b>
            <dl><div><dt>Sıradaki çıkış</dt><dd>{hour(s.nextAt)}</dd></div><div><dt>Bitiş</dt><dd>{hour(s.endAt)}</dd></div></dl>
          </li>
        );
      })}</ul>
    </section>
  );
}

export default function TimerControl() {
  const { lanes, workouts, save, touchLocked, setTouchLocked } = useTimerDoc();
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
        <button className="primary" onClick={() => all((l) => ({ ...l, clock: startLane(l.clock, serverNow()) }))}><Play size={16} />Tümünü başlat</button>
        <button onClick={() => all((l) => (l.clock.status === 'running' ? { ...l, clock: pauseLane(l.clock, serverNow()) } : l))}><Pause size={16} />Tümünü durdur</button>
        <button onClick={() => all((l) => ({ ...l, clock: finishLane() }))}><Flag size={16} />Tümünü bitir</button>
        <button onClick={() => all((l) => ({ ...l, clock: jumpLane(setsOf(l), 0, serverNow()) }))}><RotateCcw size={16} />Tümü baştan</button>
        <button onClick={addLane}><Plus size={16} />Kulvar ekle</button>
        <button className={touchLocked ? 'primary' : ''} aria-pressed={touchLocked} onClick={() => setTouchLocked(!touchLocked)}>{touchLocked ? <LockOpen size={16} /> : <Lock size={16} />}{touchLocked ? 'Ekran kilidini aç' : 'Ekranı dokunmaya kilitle'}</button>
      </section>
      {touchLocked && <p className="ok" role="status">Kronometre ekranı kilitli, hiçbir dokunmayı kabul etmiyor. Kilidi buradan açabilirsin.</p>}
      {lanes.length > 0 && <LaneBoard lanes={lanes} setsOf={setsOf} />}

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
              <select value="" disabled={!lane.workoutId} onChange={(e) => patch(lane.id, (l) => ({ ...l, clock: jumpLane(setsOf(l), Number(e.target.value), serverNow()) }))}>
                <option value="" disabled>Set seçin</option>
                {setsOf(lane).map((s, i) => <option key={i} value={i}>{i + 1}. {s.name} · {s.reps}×{s.distance} m</option>)}
              </select>
            </label>
            <button aria-pressed={!lane.muted} onClick={() => patch(lane.id, (l) => ({ ...l, muted: !l.muted }))}>{lane.muted ? <VolumeX size={15} /> : <Volume2 size={15} />}Çıkış sesi: {lane.muted ? 'Kapalı' : 'Açık'}</button>
            <div className="lane-actions">
              <button className="primary" disabled={!lane.workoutId || lane.clock.status === 'running'} onClick={() => patch(lane.id, (l) => ({ ...l, clock: startLane(l.clock, serverNow()) }))}><Play size={15} />Başlat</button>
              <button disabled={lane.clock.status !== 'running'} onClick={() => patch(lane.id, (l) => ({ ...l, clock: pauseLane(l.clock, serverNow()) }))}><Pause size={15} />Durdur</button>
              <button disabled={!lane.workoutId} onClick={() => patch(lane.id, (l) => ({ ...l, clock: finishLane() }))}><Flag size={15} />Bitir</button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
