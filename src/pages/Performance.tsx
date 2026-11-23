import { useMemo, useState } from 'react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { athleteRecordScope, studentScope } from '../lib/access';
import { useAttendance } from '../lib/useAttendance';
import { aiAnalysis, workerEnabled } from '../lib/worker';
import { analyzeAthlete, formatSwimTime, passedStandards } from '../lib/rules';
import { dateTr, STROKE_LABEL } from '../lib/format';
import { groupLabel, STANDARDS } from '../lib/standardData';
import type { CoachComment, Student, SwimResult } from '../lib/types';

export default function Performance() {
  const { user } = useSession();
  const allStudents = useCollection<Student>('students', studentScope(user));
  const results = useCollection<SwimResult>('results', athleteRecordScope(user));
  const comments = useCollection<CoachComment>('comments', athleteRecordScope(user));
  const attendance = useAttendance(user);
  const [picked, setPicked] = useState('');
  const [eventKey, setEventKey] = useState('');
  const [ai, setAi] = useState({ studentId: '', text: '' });
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState('');

  // Veli yalnız kendi çocuğunu, antrenör yalnız kendi öğrencisini görür.
  const students = allStudents.filter((s) => (user?.role === 'parent' ? s.parentId === user.id : user?.role === 'coach' ? s.coachId === user.id : true));
  const student = students.find((s) => s.id === picked) ?? students[0];
  const own = useMemo(() => results.filter((r) => r.studentId === student?.id).sort((a, b) => a.date.localeCompare(b.date)), [results, student?.id]);
  const analysis = useMemo(() => analyzeAthlete(own), [own]);
  if (!student) return <div className="page"><h1>Performans</h1><section className="card"><p className="muted">Görüntülenecek sporcu yok.</p></section></div>;

  const activeKey = analysis.trends.some((t) => `${t.stroke}-${t.distance}` === eventKey) ? eventKey : analysis.trends[0] ? `${analysis.trends[0].stroke}-${analysis.trends[0].distance}` : '';
  const chart = own.filter((r) => `${r.stroke}-${r.distance}` === activeKey).map((r) => ({ date: dateTr(r.date), ms: r.timeMs }));
  const season = new Date().getFullYear();
  const passed = passedStandards(own, STANDARDS, student, season);
  const marks = attendance.flatMap((d) => (d.marks[student.id] ? [{ date: d.date, mark: d.marks[student.id] }] : []));
  const present = marks.filter((m) => m.mark === 'geldi').length;
  const notes = comments.filter((c) => c.studentId === student.id).sort((a, b) => b.date.localeCompare(a.date));
  const aiText = ai.studentId === student.id ? ai.text : '';
  const runAi = async () => {
    setAiBusy(true);
    setAiError('');
    try {
      // Ad, kulüp ve kimlik gönderilmez.
      const text = await aiAnalysis({
        age: season - student.birthYear,
        gender: student.gender,
        attendancePercent: marks.length ? Math.round((present / marks.length) * 100) : null,
        passedStandards: passed.length,
        events: analysis.trends.map((t) => ({ stroke: t.stroke, distance: t.distance, bestMs: t.bestMs, lastMs: t.lastMs, changePercent: t.changePercent, count: t.count })).slice(0, 18),
      });
      setAi({ studentId: student.id, text });
    } catch (err) {
      setAiError((err as Error).message);
    } finally {
      setAiBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">Performans raporu</p><h1>{student.firstName} {student.lastName}</h1></div>
        {students.length > 1 && <label>Sporcu<select value={student.id} onChange={(e) => setPicked(e.target.value)}>{students.map((s) => <option key={s.id} value={s.id}>{s.firstName} {s.lastName}</option>)}</select></label>}
      </header>
      <section className="stats">
        <article><span>Derece</span><strong>{own.length}</strong></article>
        <article><span>Branş</span><strong>{analysis.trends.length}</strong></article>
        <article><span>Devam</span><strong>{marks.length ? `%${Math.round((present / marks.length) * 100)}` : '—'}</strong></article>
        <article><span>Geçilen baraj</span><strong>{passed.length}</strong></article>
      </section>
      <section className="card">
        <div className="page-head"><h2>Gelişim</h2>{analysis.trends.length > 0 && <select aria-label="Branş" className="auto" value={activeKey} onChange={(e) => setEventKey(e.target.value)}>{analysis.trends.map((t) => <option key={`${t.stroke}-${t.distance}`} value={`${t.stroke}-${t.distance}`}>{t.distance} m {STROKE_LABEL[t.stroke]}</option>)}</select>}</div>
        {chart.length === 0 ? <p className="muted">Henüz derece yok.</p> : (
          <div className="chart"><ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ left: 8, right: 16, top: 10 }}>
              <CartesianGrid stroke="#24445f" vertical={false} />
              <XAxis dataKey="date" stroke="#9db4c5" fontSize={12} />
              <YAxis reversed domain={['auto', 'auto']} tickFormatter={formatSwimTime} stroke="#9db4c5" fontSize={12} width={62} />
              <Tooltip formatter={(v) => [formatSwimTime(Number(v)), 'Süre']} contentStyle={{ background: '#0e2439', border: '1px solid #24445f' }} />
              <Line type="monotone" dataKey="ms" stroke="#27c4d8" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer></div>
        )}
      </section>
      <div className="two-col">
        <section className="card stack"><h2>Otomatik analiz</h2><ul className="plain">{analysis.advice.map((a) => <li key={a}>{a}</li>)}</ul>
          {workerEnabled && own.length > 0 && <div><button className="primary" disabled={aiBusy} onClick={runAi}>{aiBusy ? 'Analiz ediliyor…' : 'Yapay zekâ ile analiz et'}</button></div>}
          {aiError && <p className="error" role="alert">{aiError}</p>}
          {aiText && <div><p style={{ whiteSpace: 'pre-line' }}>{aiText}</p><small className="muted">Yapay zekâ önerisidir, antrenör değerlendirmesinin yerini tutmaz.</small></div>}
        </section>
        <section className="card"><h2>Antrenör yorumları</h2>{notes.length === 0 ? <p className="muted">Henüz yorum yok.</p> : <ul className="plain">{notes.map((c) => <li key={c.id}>{c.text}<small>{dateTr(c.date)}</small></li>)}</ul>}</section>
      </div>
      <section className="card"><h2>Geçilen barajlar</h2>
        {passed.length === 0 ? <p className="muted">Yaşına uygun geçilen baraj henüz yok.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Yarış</th><th>Tür</th><th>Branş</th><th>Havuz</th><th>Baraj</th><th>En iyi</th></tr></thead>
          <tbody>{passed.map(({ standard: b, bestMs }, i) => <tr key={i}><td>{groupLabel(b)}</td><td>{b.kind === 'harcirah' ? 'Harcırah' : 'Katılım'}</td><td>{b.distance} m {STROKE_LABEL[b.stroke]}</td><td>{b.pool}</td><td>{formatSwimTime(b.timeMs)}</td><td>{formatSwimTime(bestMs)}</td></tr>)}</tbody>
        </table></div>}
      </section>
      <section className="card"><h2>En iyi dereceler</h2><div className="table-wrap"><table>
        <thead><tr><th>Branş</th><th>En iyi</th><th>Son</th><th>Değişim</th><th>Ölçüm</th></tr></thead>
        <tbody>{analysis.trends.map((t) => <tr key={`${t.stroke}-${t.distance}`}><td>{t.distance} m {STROKE_LABEL[t.stroke]}</td><td>{formatSwimTime(t.bestMs)}</td><td>{formatSwimTime(t.lastMs)}</td><td>{t.count > 1 ? `%${t.changePercent}` : '—'}</td><td>{t.count}</td></tr>)}</tbody>
      </table></div></section>
    </div>
  );
}
