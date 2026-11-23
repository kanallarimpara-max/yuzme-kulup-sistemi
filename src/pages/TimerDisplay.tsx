import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import { serverNow } from '../lib/clock';
import { beepsBetween, laneElapsed, laneGrid, timerView } from '../lib/timer';
import type { TimerLane, Workout } from '../lib/types';
import { useTimerDoc } from './useTimerDoc';

const clockText = (ms: number) => {
  const total = Math.ceil(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

function playBeeps(ctx: AudioContext, beeps: Array<'short' | 'final'>) {
  let at = ctx.currentTime;
  const tone = (start: number, length: number, frequency: number) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.35, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + length);
    osc.connect(gain).connect(ctx.destination);
    osc.start(start);
    osc.stop(start + length);
  };
  beeps.forEach((beep) => {
    if (beep === 'short') {
      tone(at, 0.1, 880);
      at += 0.12;
    } else {
      [0, 0.18, 0.36].forEach((d) => tone(at + d, 0.14, 1320));
      at += 0.54;
    }
  });
}

function Lane({ lane, workout, now }: { lane: TimerLane; workout?: Workout; now: number }) {
  if (!workout) {
    return <section className="lane lane-idle"><header><strong>{lane.name}</strong></header><div className="lane-clock small">Antrenman seçilmedi</div></section>;
  }
  const view = timerView(workout.sets, laneElapsed(lane.clock, now));
  const idle = lane.clock.status === 'idle' || lane.clock.status === 'done' || view.phase === 'done';
  const color = idle ? 'idle' : view.color;
  return (
    <section className={`lane lane-${color}`}>
      <header>
        <strong>{lane.name}</strong>
        <span>{workout.title}</span>
        {view.set && <span>{view.set.name} · {view.set.distance} m {view.set.stroke} · Set {view.setIndex + 1}/{view.setCount} · Tekrar {view.rep}/{view.reps}</span>}
      </header>
      {view.showNext && view.next ? (
        <div className="lane-next"><small>SIRADAKİ</small><b>{view.next.reps} × {view.next.distance} m</b><span>{view.next.stroke}</span></div>
      ) : (
        <div className="lane-clock">{view.phase === 'done' || lane.clock.status === 'done' ? 'BİTTİ' : clockText(view.remainingMs)}</div>
      )}
      <footer>{lane.clock.status === 'paused' ? 'DURAKLATILDI' : view.phase === 'rest' && !idle ? 'DİNLENME' : lane.clock.status === 'idle' ? 'HAZIR' : ''}</footer>
    </section>
  );
}

export default function TimerDisplay() {
  const { lanes, workouts } = useTimerDoc();
  const [now, setNow] = useState(() => serverNow());
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  const [sound, setSound] = useState(false);
  const audio = useRef<AudioContext | null>(null);
  const previous = useRef<Record<string, number>>({});

  useEffect(() => {
    const tick = window.setInterval(() => setNow(serverNow()), 100);
    const resize = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', resize);
    return () => {
      window.clearInterval(tick);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const beeps: Array<'short' | 'final'> = [];
    lanes.forEach((lane) => {
      const elapsed = laneElapsed(lane.clock, now);
      const before = previous.current[lane.id];
      const workout = workouts.find((w) => w.id === lane.workoutId);
      if (workout && lane.clock.status === 'running' && before !== undefined) beeps.push(...beepsBetween(workout.sets, before, elapsed));
      previous.current[lane.id] = elapsed;
    });
    if (sound && audio.current && beeps.length) playBeeps(audio.current, beeps.slice(0, 8));
  }, [now, lanes, workouts, sound]);

  const toggleSound = async () => {
    audio.current ??= new AudioContext();
    await audio.current.resume();
    setSound((s) => !s);
  };

  const grid = laneGrid(lanes.length, size.w, size.h);
  return (
    <div className="timer-screen" style={{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))` }}>
      {lanes.length === 0 && <div className="center-screen">Kontrol ekranından kulvar ekleyin.</div>}
      {lanes.map((lane) => <Lane key={lane.id} lane={lane} now={now} workout={workouts.find((w) => w.id === lane.workoutId)} />)}
      <div className="timer-tools">
        <Link to="/kronometre/kontrol" aria-label="Kontrol ekranına dön" title="Kontrol ekranı"><ArrowLeft size={18} /></Link>
        <button onClick={toggleSound} aria-label={sound ? 'Sesi kapat' : 'Sesi aç'} title={sound ? 'Sesi kapat' : 'Sesi aç'}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
      </div>
    </div>
  );
}
