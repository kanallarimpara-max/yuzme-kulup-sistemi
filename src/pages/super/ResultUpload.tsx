import { useMemo, useState } from 'react';
import { FileUp } from 'lucide-react';
import { db, useCollection } from '../../lib/store';
import { formatSwimTime } from '../../lib/rules';
import { dateTr, STROKE_LABEL } from '../../lib/format';
import { readPdfPages } from '../../lib/tyf';
import { matchTopluEvents, parseTopluPages, poolFor, topluTitle, type TopluAthlete, type TopluEvent, type TopluResult } from '../../lib/tyfToplu';
import type { Club, Student, SwimResult, TyfMeet } from '../../lib/types';

type Row = TopluResult & { state: 'yeni' | 'iyi' | 'var' };
const STATE_LABEL = { yeni: 'Yeni', iyi: 'Daha iyi derece', var: 'Zaten kayıtlı' } as const;

/** Sistem sahibi TYF biçimindeki toplu sonuç PDF'ini yükler; adı, doğum yılı ve kulübü tutan sporculara derece kendiliğinden yazılır. */
export default function ResultUpload() {
  const clubs = useCollection<Club>('clubs');
  const students = useCollection<Student>('students');
  const meets = useCollection<TyfMeet>('tyfMeets');
  const [fileName, setFileName] = useState('');
  const [events, setEvents] = useState<TopluEvent[]>([]);
  const [meet, setMeet] = useState('');
  const [pool, setPool] = useState<'' | '25m' | '50m'>('');
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  const clubNames = useMemo(() => Object.fromEntries(clubs.map((c) => [c.id, c.name])), [clubs]);
  const byId = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const athletes: TopluAthlete[] = students.filter((s) => s.clubId && s.firstName && s.lastName && s.birthYear && s.gender);
  const toSave = rows.filter((r) => r.state !== 'var');
  const lineCount = events.reduce((n, e) => n + e.rows.length, 0);
  const perClub = Object.entries(rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.clubId]: (acc[r.clubId] ?? 0) + 1 }), {}));

  const read = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setStatus('');
    setRows([]);
    setEvents([]);
    setFileName(file.name);
    try {
      const pages = await readPdfPages(await file.arrayBuffer());
      const parsed = parseTopluPages(pages);
      if (!parsed.length) throw new Error('Bu PDF\'te okunabilir yarış bulunamadı. Taranmış resim olabilir ya da TYF toplu sonuç biçiminde değildir.');
      const title = topluTitle(pages) || file.name.replace(/\.pdf$/i, '');
      setEvents(parsed);
      setMeet(title);
      setPool(poolFor(title, parsed.map((e) => e.date), meets) ?? '');
      const found = matchTopluEvents(parsed, athletes, clubNames, title);
      // Kayıtlı dereceyle karşılaştırılır; daha iyi derece kötüsüyle değiştirilmez.
      const checked: Row[] = [];
      for (let i = 0; i < found.length; i += 20) {
        const part = found.slice(i, i + 20);
        const old = await Promise.all(part.map((r) => db.get<SwimResult>('results', r.id).catch(() => null)));
        part.forEach((r, k) => checked.push({ ...r, state: !old[k] ? 'yeni' : old[k]!.timeMs > r.timeMs || (old[k]!.timeMs === r.timeMs && r.lapsMs && !old[k]!.lapsMs?.length) ? 'iyi' : 'var' }));
      }
      setRows(checked);
    } catch (err) {
      setError((err as Error).message || 'PDF okunamadı.');
    } finally {
      setBusy(false);
    }
  };

  const save = async () => {
    if (!pool) return setError('Havuz boyunu seçin.');
    if (!meet.trim()) return setError('Yarış adını yazın.');
    setBusy(true);
    setError('');
    try {
      for (let i = 0; i < toSave.length; i += 20) {
        await Promise.all(toSave.slice(i, i + 20).map((r) => db.put('results', r.id, {
          clubId: r.clubId, studentId: r.studentId, parentId: byId.get(r.studentId)?.parentId ?? '', stroke: r.stroke, distance: r.distance,
          timeMs: r.timeMs, date: r.date, pool, source: 'tyf', kind: 'yaris', meet: meet.trim().slice(0, 200),
          ...(r.lapsMs ? { lapsMs: r.lapsMs, lapEvery: r.lapEvery } : {}),
        })));
      }
      setStatus(`${toSave.length} yarış derecesi ${perClub.length} kulübe kaydedildi.`);
      setRows((list) => list.map((r) => ({ ...r, state: 'var' })));
    } catch {
      setError('Dereceler kaydedilemedi. Bağlantıyı kontrol edip tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><h1>Yarış sonucu yükle</h1></div></header>
      <section className="card stack">
        <p className="muted">TYF toplu sonuç PDF'ini seçin. Adı soyadı, doğum yılı, cinsiyeti ve kulübü tutan sporculara yarış derecesi kendiliğinden yazılır. Aynı kulüpte iki aday varsa ya da kulüp adı tutmuyorsa derece yazılmaz. TYF sonuçlar sayfasındaki dosyalar her sabah zaten kendiliğinden okunur; bu ekran orada olmayan yarışlar içindir.</p>
        <label className="button upload-button"><FileUp size={18} />PDF seç<input type="file" accept="application/pdf" hidden disabled={busy} onChange={(e) => { void read(e.target.files?.[0]); e.target.value = ''; }} /></label>
        {busy && <p className="muted" role="status">PDF okunuyor ve sporcular eşleştiriliyor…</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {status && <p className="ok" role="status">{status}</p>}
      </section>

      {events.length > 0 && <section className="card stack">
        <h2>{fileName}</h2>
        <div className="stats">
          <article><span>Bireysel yarış</span><strong>{events.length}</strong></article>
          <article><span>Sporcu satırı</span><strong>{lineCount}</strong></article>
          <article><span>Eşleşen derece</span><strong>{rows.length}</strong></article>
          <article><span>Kaydedilecek</span><strong>{toSave.length}</strong></article>
        </div>
        <div className="form-grid">
          <label>Yarış adı<input required maxLength={200} value={meet} onChange={(e) => setMeet(e.target.value)} /></label>
          <label>Havuz<select required value={pool} onChange={(e) => setPool(e.target.value as '' | '25m' | '50m')}><option value="">Seçin</option><option value="25m">25 m</option><option value="50m">50 m</option></select></label>
        </div>
        {rows.length === 0 ? <p className="muted">Bu dosyada sistemdeki kulüplerin sporcularıyla eşleşen derece yok.</p> : <>
          <ul className="simple-list">{perClub.map(([clubId, n]) => <li key={clubId}><span>{clubNames[clubId]}</span><strong>{n} derece</strong></li>)}</ul>
          <div className="table-wrap"><table>
            <thead><tr><th>Sporcu</th><th>Kulüp</th><th>Yarış</th><th>Derece</th><th>Durum</th></tr></thead>
            <tbody>{rows.map((r) => {
              const s = byId.get(r.studentId);
              return <tr key={r.id}><td>{s ? `${s.firstName} ${s.lastName}` : r.studentId}</td><td>{clubNames[r.clubId]}</td><td>{r.distance} m {STROKE_LABEL[r.stroke]}<small> · {dateTr(r.date)}</small></td><td><strong>{formatSwimTime(r.timeMs)}</strong></td><td>{STATE_LABEL[r.state]}</td></tr>;
            })}</tbody>
          </table></div>
          <div className="form-actions"><button className="primary" disabled={busy || !toSave.length} onClick={() => void save()}>Dereceleri sisteme kaydet ({toSave.length})</button></div>
        </>}
      </section>}
    </div>
  );
}
