import { useEffect, useMemo, useState } from 'react';
import { Copy, Save, Sparkles, Trash2 } from 'lucide-react';
import { db, useCollection } from '../../lib/store';
import { athleteRecordScope } from '../../lib/access';
import { formatSwimTime, lessonsAt, toIso } from '../../lib/rules';
import { dateTr, STROKE_LABEL } from '../../lib/format';
import { useStandards } from '../../lib/useStandards';
import { aiGroupPayload, athleteProfile, groupSummary, STROKES, type EventBest } from '../../lib/sessionAnalysis';
import { aiSession, workerEnabled, type SessionAiRequest } from '../../lib/worker';
import type { Row } from '../../lib/store';
import type { SwimResult } from '../../lib/types';
import { useCoachData } from './useCoachData';

type Period = NonNullable<SessionAiRequest['period']>;
type AiProgram = Row & { clubId: string; coachId: string; lessonId: string; period: Period; text: string; date: string };
const PERIOD_LABEL: Record<Period, string> = { gunluk: 'Günlük', haftalik: 'Haftalık', aylik: 'Aylık' };

const pct = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}%${Math.abs(n).toLocaleString('tr-TR')}`;
const tone = (n: number | null) => (n === null ? '' : n <= 0 ? 'good' : n <= 8 ? 'warn' : 'bad');

function Cell({ best, kind }: { best: EventBest | null; kind: string }) {
  if (!best) return null;
  return (
    <div className="analysis-cell">
      <small>{kind} · {best.distance} m</small>
      <strong>{formatSwimTime(best.bestMs)}</strong>
      {best.gapPercent !== null && <span className={`badge ${tone(best.gapPercent)}`} title={best.basis === 'baraj' ? 'Katılım barajına uzaklık' : 'Kendi serbestine göre beklenen süreye uzaklık'}>{pct(best.gapPercent)}{best.basis === 'serbest' ? ' S' : ''}</span>}
    </div>
  );
}

export default function SessionAnalysis() {
  const { user, clubId, lessons, students, branchName } = useCoachData();
  const results = useCollection<SwimResult>('results', athleteRecordScope(user));
  const programs = useCollection<AiProgram>('aiPrograms', { clubId, eq: ['coachId', user?.id ?? ''], skip: !user });
  const { standards } = useStandards();
  const [now, setNow] = useState(() => new Date());
  const [picked, setPicked] = useState('');
  const [busy, setBusy] = useState<'' | 'analiz' | 'program'>('');
  const [error, setError] = useState('');
  const [analysisText, setAnalysisText] = useState({ lessonId: '', text: '' });
  const [program, setProgram] = useState({ lessonId: '', text: '', period: 'gunluk' as Period });
  const [period, setPeriod] = useState<Period>('gunluk');
  const [minutes, setMinutes] = useState(60);
  const [daysPerWeek, setDaysPerWeek] = useState(3);
  const [pool, setPool] = useState<'25m' | '50m'>('25m');
  const [note, setNote] = useState('');
  const [status, setStatus] = useState('');
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(t);
  }, []);

  const { todays, actives, time } = lessonsAt(lessons, now);
  const auto = actives[0] ?? todays.find((l) => l.startTime > time) ?? todays[0] ?? lessons[0];
  const lesson = lessons.find((l) => l.id === picked) ?? auto;
  const roster = useMemo(() => (lesson ? students.filter((s) => s.lessonId === lesson.id) : []).sort((a, b) => a.firstName.localeCompare(b.firstName, 'tr')), [students, lesson]);
  const season = now.getFullYear();
  const profiles = useMemo(() => roster.map((s) => athleteProfile(s, results, standards, season)), [roster, results, standards, season]);
  const group = useMemo(() => groupSummary(profiles), [profiles]);
  if (!user) return null;

  if (!lesson) return <div className="page"><h1>Ders analizi</h1><section className="card"><p className="muted">Size atanmış ders yok.</p></section></div>;
  const state = actives.some((l) => l.id === lesson.id) ? 'Şu an aktif ders' : todays.some((l) => l.id === lesson.id) ? 'Bugünkü ders' : 'Seçili ders';
  const hasData = profiles.some((p) => p.untested.length < STROKES.length);
  const name = (id: string) => { const s = roster.find((x) => x.id === id); return s ? `${s.firstName} ${s.lastName}` : ''; };
  // Yapay zekâ "Sporcu 3" der; ekranda gerçek adla gösterilir.
  const withNames = (text: string) => text.replace(/Sporcu\s+(\d+)/g, (m, n) => { const p = profiles[Number(n) - 1]; return p ? name(p.studentId) : m; });

  const ask = async (task: 'analiz' | 'program') => {
    setBusy(task);
    setError('');
    setStatus('');
    try {
      const text = await aiSession({ task, period, minutes, daysPerWeek: period === 'gunluk' ? 1 : daysPerWeek, pool, note: note.trim(), group: aiGroupPayload(profiles) });
      if (task === 'analiz') setAnalysisText({ lessonId: lesson.id, text });
      else setProgram({ lessonId: lesson.id, text, period });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy('');
    }
  };
  const shownAnalysis = analysisText.lessonId === lesson.id ? withNames(analysisText.text) : '';
  const shownProgram = program.lessonId === lesson.id ? withNames(program.text) : '';
  const save = async () => {
    try {
      await db.add('aiPrograms', { clubId, coachId: user.id, lessonId: lesson.id, period: program.period, text: shownProgram.slice(0, 12000), date: toIso(new Date()) });
      setStatus('Program kaydedildi.');
    } catch {
      setError('Program kaydedilemedi, bağlantını kontrol et.');
    }
  };
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setStatus('Kopyalandı.');
    } catch {
      setError('Kopyalanamadı.');
    }
  };
  const saved = programs.filter((p) => p.lessonId === lesson.id).sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">{state}</p><h1>Ders analizi</h1></div>
        <label>Ders<select value={lesson.id} onChange={(e) => setPicked(e.target.value)}>{lessons.map((l) => <option key={l.id} value={l.id}>{l.startTime}-{l.endTime} · {l.name}{branchName(l.branchId) ? ` · ${branchName(l.branchId)}` : ''}</option>)}</select></label>
      </header>
      <section className="stats">
        <article><span>Sporcu</span><strong>{roster.length}</strong></article>
        <article><span>En güçlü stil</span><strong>{group.strongest ? STROKE_LABEL[group.strongest] : '—'}</strong></article>
        <article><span>En eksik stil</span><strong>{group.weakest ? STROKE_LABEL[group.weakest] : '—'}</strong></article>
        <article><span>Derecesi olmayan</span><strong>{group.noData}</strong></article>
      </section>

      <section className="card stack">
        <h2>Grubun stilleri</h2>
        <p className="muted">Yüzde, yaşa uygun katılım barajına uzaklıktır; eksi değer barajı geçtiğini gösterir. Baraj olmayan yaşta sporcunun kendi serbestine göre hesaplanır (S). Yarış derecesi yoksa antrenman derecesi kullanılır.</p>
        <div className="table-wrap"><table>
          <thead><tr><th>Stil</th><th>Ortalama</th><th>Ölçülen</th><th>Hiç ölçülmeyen</th></tr></thead>
          <tbody>{group.strokes.map((s) => (
            <tr key={s.stroke}><td>{STROKE_LABEL[s.stroke]}{s.stroke === group.strongest && <span className="badge good"> güçlü</span>}{s.stroke === group.weakest && <span className="badge bad"> eksik</span>}</td>
              <td>{s.average === null ? '—' : <span className={`badge ${tone(s.average)}`}>{pct(s.average)}</span>}</td><td>{s.measured}</td><td>{s.missing}</td></tr>
          ))}</tbody>
        </table></div>
      </section>

      <section className="card stack">
        <h2>Sporcular</h2>
        {roster.length === 0 ? <p className="muted">Bu derste öğrenci yok.</p> : <div className="table-wrap"><table className="analysis-table">
          <thead><tr><th>Sporcu</th><th>Güçlü</th><th>Eksik</th>{STROKES.map((s) => <th key={s}>{STROKE_LABEL[s]}</th>)}<th>Antrenman / yarış</th></tr></thead>
          <tbody>{profiles.map((p) => (
            <tr key={p.studentId}>
              <td><strong>{name(p.studentId)}</strong><small className="muted"> {p.age} yaş</small></td>
              <td>{p.strongest ? STROKE_LABEL[p.strongest] : '—'}</td>
              <td>{p.weakest ? STROKE_LABEL[p.weakest] : p.untested.length === STROKES.length ? 'Derece yok' : '—'}</td>
              {p.strokes.map((s) => <td key={s.stroke}>{!s.race && !s.training ? <span className="muted">Ölçülmedi</span> : <><Cell best={s.race} kind="Yarış" /><Cell best={s.training} kind="Antrenman" /></>}</td>)}
              <td>{p.raceTrainingGap === null ? '—' : `%${p.raceTrainingGap.toLocaleString('tr-TR')} yavaş`}</td>
            </tr>
          ))}</tbody>
        </table></div>}
      </section>

      {!workerEnabled ? <section className="card"><p className="muted">Yapay zekâ bu ortamda kapalı.</p></section> : <div className="two-col ai-col">
        <section className="card stack">
          <h2><Sparkles size={18} /> Yapay zekâ analizi</h2>
          <p className="muted">Bu dersin sporcularını stil stil değerlendirir. Ad ve kimlik gönderilmez.</p>
          <div><button className="primary" disabled={!hasData || busy !== ''} onClick={() => ask('analiz')}>{busy === 'analiz' ? 'Analiz ediliyor…' : 'Dersi analiz et'}</button></div>
          {!hasData && <p className="muted">Analiz için bu dersteki sporculara derece girilmeli.</p>}
          {shownAnalysis && <div><p className="ai-text">{shownAnalysis}</p><small className="muted">Yapay zekâ önerisidir, antrenör değerlendirmesinin yerini tutmaz.</small></div>}
        </section>
        <section className="card stack">
          <h2>Antrenman programı önerisi</h2>
          <div className="chips" role="group" aria-label="Program süresi">{(Object.keys(PERIOD_LABEL) as Period[]).map((p) => <button key={p} type="button" className={period === p ? 'chip on' : 'chip'} aria-pressed={period === p} onClick={() => setPeriod(p)}>{PERIOD_LABEL[p]}</button>)}</div>
          <div className="form-grid">
            <label>Ders süresi (dk)<input type="number" min={20} max={180} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} /></label>
            {period !== 'gunluk' && <label>Haftada kaç gün<input type="number" min={1} max={7} value={daysPerWeek} onChange={(e) => setDaysPerWeek(Number(e.target.value))} /></label>}
            <label>Havuz<select value={pool} onChange={(e) => setPool(e.target.value as '25m' | '50m')}><option value="25m">25 m</option><option value="50m">50 m</option></select></label>
          </div>
          <label>İsteğin (isteğe bağlı)<textarea maxLength={300} rows={2} placeholder="Örnek: yarışa 2 hafta var, kurbağa dönüşlerine ağırlık ver" value={note} onChange={(e) => setNote(e.target.value)} /></label>
          <div><button className="primary" disabled={!hasData || busy !== ''} onClick={() => ask('program')}>{busy === 'program' ? 'Program hazırlanıyor…' : `${PERIOD_LABEL[period]} program öner`}</button></div>
          {shownProgram && <div className="stack">
            <p className="ai-text">{shownProgram}</p>
            <div className="form-actions"><button onClick={save}><Save size={16} />Kaydet</button><button onClick={() => copy(shownProgram)}><Copy size={16} />Kopyala</button></div>
            <small className="muted">Programı uygulamadan önce sporcuların yaşına ve sağlık durumuna göre gözden geçir.</small>
          </div>}
        </section>
      </div>}
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p className="ok" role="status">{status}</p>}

      {saved.length > 0 && <section className="card stack"><h2>Kayıtlı programlar</h2>
        {saved.map((p) => (
          <details key={p.id}><summary>{PERIOD_LABEL[p.period]} program · {dateTr(p.date)}</summary>
            <p className="ai-text">{p.text}</p>
            <div className="form-actions"><button onClick={() => copy(p.text)}><Copy size={16} />Kopyala</button><button className="ghost" onClick={() => db.remove('aiPrograms', p.id)}><Trash2 size={15} />Sil</button></div>
          </details>
        ))}
      </section>}
    </div>
  );
}
