import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, FileText, RefreshCw, Search } from 'lucide-react';
import { useSession } from '../lib/session';
import { useCollection } from '../lib/store';
import { classifyMatch, clubMatchScore, formatSwimTime, toIso } from '../lib/rules';
import { drawPdf, readResultPdf, type TyfEvent } from '../lib/tyf';
import { normalizeMeetUrl, type LiveEvent, type LiveMeet } from '../lib/tyfLinks';
import { liveMeet, meetPdf, workerEnabled } from '../lib/worker';
import { isMeetLive, type TyfMeet } from '../lib/types';

const REFRESH_MS = 60000;

export default function LiveResults() {
  const { club } = useSession();
  const meets = useCollection<TyfMeet>('tyfMeets');
  const [meetUrl, setMeetUrl] = useState('');
  const [typed, setTyped] = useState('');
  const [detail, setDetail] = useState<LiveMeet | null>(null);
  const [eventNo, setEventNo] = useState('');
  // Yarışın hem sonucu hem start listesi varsa ikisi arasında geçilir.
  const [view, setView] = useState<'sonuc' | 'start'>('sonuc');
  const [table, setTable] = useState<TyfEvent | null>(null);
  const [official, setOfficial] = useState(false);
  const [onlyClub, setOnlyClub] = useState(false);
  const [query, setQuery] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const pdfHost = useRef<HTMLDivElement>(null);
  const pdfData = useRef<ArrayBuffer | null>(null);

  const sorted = useMemo(() => [...meets].sort((a, b) => b.startDate.localeCompare(a.startDate)), [meets]);
  const event: LiveEvent | undefined = detail?.sessions.flatMap((s) => s.events).find((e) => e.no === eventNo);
  const both = Boolean(event?.resultUrl && event?.startUrl);
  const pdfUrl = event ? (view === 'start' && event.startUrl ? event.startUrl : event.resultUrl || event.startUrl) : '';
  const showingResult = Boolean(event?.resultUrl) && pdfUrl === event?.resultUrl;

  const tracked = meets.find((m) => m.url === meetUrl);
  const today = toIso(new Date());

  // Takip edilen yarışta yeni sonuç sunucudan anında gelir. Listede olmayan yarış dakikada bir yenilenir.
  useEffect(() => {
    if (!meetUrl) return;
    let alive = true;
    const load = async () => {
      if (document.hidden && detail) return;
      try {
        const next = await liveMeet(meetUrl);
        if (!alive) return;
        setDetail(next);
        setError('');
        setUpdated(new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }));
      } catch (err) {
        if (alive) setError((err as Error).message);
      }
    };
    void load();
    const timer = tracked ? 0 : window.setInterval(load, REFRESH_MS);
    const onVisible = () => { if (!document.hidden) void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      alive = false;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [meetUrl, Boolean(tracked), tracked?.version]);

  // PDF adresindeki sürüm değişince seçili yarış kendiliğinden güncellenir.
  useEffect(() => {
    if (!pdfUrl) return;
    let alive = true;
    setBusy(true);
    (async () => {
      try {
        const data = await meetPdf(pdfUrl);
        if (!alive) return;
        pdfData.current = data.slice(0);
        // Start listesi tabloya çevrilmez, resmi hâliyle gösterilir.
        const parsed = showingResult ? await readResultPdf(data).catch(() => null) : null;
        if (!alive) return;
        setTable(parsed?.rows.length ? parsed : null);
        setOfficial(!parsed?.rows.length);
        setError('');
      } catch (err) {
        if (alive) setError((err as Error).message);
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [pdfUrl]);

  useEffect(() => {
    if (!official || busy || !pdfData.current || !pdfHost.current) return;
    drawPdf(pdfData.current.slice(0), pdfHost.current).catch(() => setError('Resmi liste gösterilemedi.'));
  }, [official, busy, pdfUrl]);

  const isOurs = (name: string) => Boolean(club) && classifyMatch(clubMatchScore(name, club!.name)) !== 'none';
  const text = query.trim().toLocaleLowerCase('tr-TR');
  const rows = (table?.rows ?? []).filter((r) => (!onlyClub || isOurs(r.club))
    && (!text || `${r.maskedName} ${r.club}`.toLocaleLowerCase('tr-TR').includes(text)));

  const openMeet = (url: string) => {
    setDetail(null);
    setEventNo('');
    setTable(null);
    setError('');
    setMeetUrl(url);
  };
  const openEvent = (no: string, next: 'sonuc' | 'start' = 'sonuc') => {
    pdfData.current = null;
    setTable(null);
    setOfficial(false);
    setQuery('');
    setView(next);
    setEventNo(no);
  };
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const url = normalizeMeetUrl(typed);
    if (!url) return setError('Adres şu biçimde olmalı: https://canli.tyf.gov.tr/live/2026/1005927/');
    setTyped('');
    openMeet(url);
  };

  if (!workerEnabled) return <div className="page"><h1>Canlı sonuçlar</h1><section className="card"><p className="muted">Canlı sonuç servisi bu ortamda kapalı.</p></section></div>;

  return (
    <div className="page live-page">
      <header className="page-head">
        <div><p className="eyebrow">TYF</p><h1>{event ? `${event.name} · ${event.gender}` : detail?.title ?? 'Canlı sonuçlar'}</h1>{detail && <p className="muted">{event ? `${event.age} · ${event.round}` : detail.info}</p>}</div>
        {meetUrl && <button onClick={() => (event ? setEventNo('') : openMeet(''))}><ArrowLeft size={16} />{event ? 'Yarış programı' : 'Tüm yarışlar'}</button>}
      </header>
      {error && <p className="error" role="alert">{error}</p>}

      {!meetUrl && <>
        <section className="card stack">
          <h2>Yarışlar</h2>
          {sorted.length === 0 ? <p className="muted">Canlı sonuç sayfası açılan yarışlar burada görünür.</p> : (
            <ul className="live-list">{sorted.map((m) => <li key={m.id}><button onClick={() => openMeet(m.url)}><span><strong>{m.title}</strong><small>{m.info}</small></span>{isMeetLive(m, today) && <em className="badge good">Canlı</em>}</button></li>)}</ul>
          )}
        </section>
        <section className="card stack">
          <h2>Listede olmayan yarış</h2>
          <form className="inline-form wrap" onSubmit={submit}><input aria-label="TYF yarış adresi" type="url" required placeholder="https://canli.tyf.gov.tr/live/2026/1005927/" value={typed} onChange={(e) => setTyped(e.target.value)} /><button className="primary">Uygulamada aç</button></form>
        </section>
      </>}

      {meetUrl && !detail && !error && <section className="card"><p className="muted" role="status">Yarış programı yükleniyor…</p></section>}

      {detail && !event && <>
        {updated && <p className="muted live-updated"><RefreshCw size={14} />Son güncelleme {updated} · {tracked && isMeetLive(tracked, today) ? 'yeni sonuçlar otomatik gelir' : tracked ? 'yarış tamamlandı' : 'dakikada bir yenilenir'}</p>}
        {detail.sessions.length === 0 && <section className="card"><p className="muted">Bu yarışın programı henüz yayınlanmadı.</p></section>}
        {detail.sessions.map((s) => (
          <section className="card stack" key={s.title}>
            <h2>{s.title}</h2>
            <ul className="live-list">{s.events.map((e) => (
              <li key={`${e.no}-${e.name}`}><button disabled={!e.resultUrl && !e.startUrl} onClick={() => openEvent(e.no)}>
                <span><strong>{e.no}. {e.name}</strong><small>{e.gender} · {e.age} · {e.round}</small></span>
                <span className="live-badges">
                  {e.startUrl && <em className="badge">Start listesi</em>}
                  {e.resultUrl && <em className="badge good">Sonuç</em>}
                  {!e.resultUrl && !e.startUrl && <em className="badge">Bekleniyor</em>}
                </span>
              </button></li>
            ))}</ul>
          </section>
        ))}
      </>}

      {event && <section className="card stack">
        {both && <div className="segmented" role="tablist" aria-label="Liste türü">
          <button role="tab" aria-selected={showingResult} className={showingResult ? 'primary' : ''} onClick={() => !showingResult && openEvent(event.no, 'sonuc')}>Sonuçlar</button>
          <button role="tab" aria-selected={!showingResult} className={!showingResult ? 'primary' : ''} onClick={() => showingResult && openEvent(event.no, 'start')}>Start listesi</button>
        </div>}
        {!both && !showingResult && <p className="muted">Bu yarışın sonucu henüz yayınlanmadı, start listesi gösteriliyor.</p>}
        {busy && <p className="muted" role="status">{showingResult ? 'Sonuçlar yükleniyor…' : 'Start listesi yükleniyor…'}</p>}
        {table && <>
          <div className="live-tools">
            <label className="live-search"><Search size={15} /><input aria-label="Sporcu veya kulüp ara" placeholder="Sporcu veya kulüp ara" value={query} onChange={(e) => setQuery(e.target.value)} /></label>
            <button className={onlyClub ? 'primary' : ''} aria-pressed={onlyClub} onClick={() => setOnlyClub((v) => !v)}>Yalnız kulübüm</button>
            <button aria-pressed={official} onClick={() => setOfficial((v) => !v)}><FileText size={15} />{official ? 'Tabloya dön' : 'Resmi liste'}</button>
          </div>
          {!official && (rows.length === 0 ? <p className="muted">Bu filtreye uyan sonuç yok.</p> : <div className="table-wrap"><table className="live-table">
            <thead><tr><th>Sıra</th><th>Sporcu</th><th>Derece</th></tr></thead>
            <tbody>{rows.map((r, i) => <tr key={`${r.maskedName}-${i}`} className={isOurs(r.club) ? 'ours' : ''}><td>{r.rank ?? '—'}</td><td>{r.maskedName}<small>{r.birthYear} · {r.club}</small></td><td><strong>{r.timeMs ? formatSwimTime(r.timeMs) : r.status || '—'}</strong>{r.lapsMs.length > 1 && <small>{r.lapsMs.map(formatSwimTime).join(' / ')}</small>}</td></tr>)}</tbody>
          </table></div>)}
          {!official && <p className="muted">Diskalifiye olan sporcular resmi listede yer alır.</p>}
        </>}
        {official && <div className="live-pdf" ref={pdfHost} />}
      </section>}
    </div>
  );
}
