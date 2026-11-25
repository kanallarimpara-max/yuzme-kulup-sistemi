import { useState, type FormEvent } from 'react';
import { db } from '../../lib/store';
import { EVENTS, parseSwimTime, toIso, type Stroke } from '../../lib/rules';
import { STROKE_LABEL } from '../../lib/format';
import { useCoachData } from './useCoachData';

/** Antrenör antrenman derecesi girer. Yarış dereceleri elle girilmez: TYF sonuçlarından ve süper adminin yüklediği PDF'ten gelir. */
export default function ResultsEntry() {
  const { user, clubId, lessons, students } = useCoachData();
  const [lessonId, setLessonId] = useState('');
  const [stroke, setStroke] = useState<Stroke>('serbest');
  const [distance, setDistance] = useState(50);
  const [pool, setPool] = useState<'25m' | '50m'>('25m');
  const [date, setDate] = useState(toIso(new Date()));
  const [times, setTimes] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;

  const rows = students.filter((s) => !lessonId || s.lessonId === lessonId);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('');
    const filled = rows.filter((s) => times[s.id]?.trim());
    const parsed = filled.map((s) => ({ s, timeMs: parseSwimTime(times[s.id]) }));
    const bad = parsed.find((p) => !p.timeMs);
    if (!filled.length) return setError('En az bir derece girin.');
    if (bad) return setError(`${bad.s.firstName} ${bad.s.lastName} için süre geçersiz. Örnek: 1:02.34`);
    setError('');
    await Promise.all(parsed.map(({ s, timeMs }) => db.add('results', { clubId, studentId: s.id, parentId: s.parentId, stroke, distance, timeMs, date, pool, source: 'manuel', kind: 'antrenman' })));
    setTimes({});
    setStatus(`${parsed.length} antrenman derecesi kaydedildi.`);
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Antrenör</p><h1>Antrenman derecesi</h1></div></header>
      <form className="card stack" onSubmit={submit}>
        <div className="form-grid">
          <label>Grup<select value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Tüm öğrencilerim</option>{lessons.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
          <label>Stil<select value={stroke} onChange={(e) => { const next = e.target.value as Stroke; setStroke(next); setDistance(EVENTS[next][0]); }}>{(Object.keys(EVENTS) as Stroke[]).map((s) => <option key={s} value={s}>{STROKE_LABEL[s]}</option>)}</select></label>
          <label>Mesafe<select value={distance} onChange={(e) => setDistance(Number(e.target.value))}>{EVENTS[stroke].map((d) => <option key={d} value={d}>{d} m</option>)}</select></label>
          <label>Havuz<select value={pool} onChange={(e) => setPool(e.target.value as '25m' | '50m')}><option value="25m">25 m</option><option value="50m">50 m</option></select></label>
          <label>Tarih<input type="date" required value={date} onChange={(e) => setDate(e.target.value)} /></label>
        </div>
        <ul className="simple-list">{rows.map((s) => (
          <li key={s.id}><span>{s.firstName} {s.lastName}</span><input className="time-input" aria-label={`${s.firstName} ${s.lastName} derecesi`} placeholder="1:02.34" value={times[s.id] ?? ''} onChange={(e) => setTimes({ ...times, [s.id]: e.target.value })} /></li>
        ))}</ul>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="form-actions"><button className="primary">Dereceleri kaydet</button>{status && <span className="ok" role="status">{status}</span>}</div>
      </form>
    </div>
  );
}
