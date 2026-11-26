import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useCollection } from '../lib/store';
import { toIso } from '../lib/rules';
import { drawPdf } from '../lib/tyf';
import { normalizeMeetUrl, type LiveEvent, type LiveMeet } from '../lib/tyfLinks';
import { liveMeet, meetPdf, workerEnabled } from '../lib/worker';
import { isMeetLive, type TyfMeet } from '../lib/types';

const REFRESH_MS = 60000;
const ACTIVE_MS = 2 * 3600000;

export default function LiveResults() {
  const meets = useCollection<TyfMeet>('tyfMeets');
  const [meetUrl, setMeetUrl] = useState('');
  const [typed, setTyped] = useState('');
  const [detail, setDetail] = useState<LiveMeet | null>(null);
  const [eventNo, setEventNo] = useState('');
  // Yarışın hem sonucu hem start listesi varsa ikisi arasında geçilir.
  const [view, setView] = useState<'sonuc' | 'start'>('sonuc');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [updated, setUpdated] = useState('');
  const pdfHost = useRef<HTMLDivElement>(null);

  // Yalnız bugün süren yarışlar listelenir; bitenlerin dereceleri sporcu performansına zaten işlenmiştir.
  // Son 2 saatte yeni sonuç veya start listesi gelen yarışlar "Canlı" olarak en üstte durur.
  const today0 = toIso(new Date());
  const isActive = (m: TyfMeet) => Boolean(m.version) && Date.now() - Date.parse(m.updatedAt ?? '') < ACTIVE_MS;
  const sorted = useMemo(() => meets.filter((m) => isMeetLive(m, today0))
    .sort((a, b) => Number(isActive(b)) - Number(isActive(a)) || (b.updatedAt ?? '').localeCompare(a.updatedAt ?? '') || a.title.localeCompare(b.title, 'tr')), [meets, today0]);
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

  // Sonuç ve start listesi federasyonun resmi PDF'i olarak gösterilir; uygulama kendi tablosunu üretmez.
  // PDF adresindeki sürüm değişince seçili yarış kendiliğinden yeniden çizilir.
  useEffect(() => {
    if (!pdfUrl) return;
    let alive = true;
    setBusy(true);
    if (pdfHost.current) pdfHost.current.replaceChildren();
    (async () => {
      try {
        const data = await meetPdf(pdfUrl);
        if (!alive || !pdfHost.current) return;
        pdfHost.current.replaceChildren();
        await drawPdf(data, pdfHost.current);
        if (alive) setError('');
      } catch {
        if (alive) setError('Resmi liste gösterilemedi.');
      } finally {
        if (alive) setBusy(false);
      }
    })();
    return () => { alive = false; };
  }, [pdfUrl]);

  const openMeet = (url: string) => {
    setDetail(null);
    setEventNo('');
    setError('');
    setMeetUrl(url);
  };
  const openEvent = (no: string, next: 'sonuc' | 'start' = 'sonuc') => {
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
        <div><h1>{event ? `${event.name} · ${event.gender}` : detail?.title ?? 'Canlı sonuçlar'}</h1>{detail && <p className="muted">{event ? `${event.age} · ${event.round}` : detail.info}</p>}</div>
        {meetUrl && <button onClick={() => (event ? setEventNo('') : openMeet(''))}><ArrowLeft size={16} />{event ? 'Yarış programı' : 'Tüm yarışlar'}</button>}
      </header>
      {error && <p className="error" role="alert">{error}</p>}

      {!meetUrl && <>
        <section className="card stack">
          <h2>Süren yarışlar</h2>
          {sorted.length === 0 ? <p className="muted">Şu an süren yarış yok. Federasyon yeni bir canlı sonuç sayfası açınca burada kendiliğinden görünür. Biten yarışların dereceleri sporcuların performans ekranına işlenir.</p> : (
            <ul className="live-list">{sorted.map((m) => <li key={m.id}><button onClick={() => openMeet(m.url)}><span><strong>{m.title}</strong><small>{m.info}</small></span>
              <span className="live-badges">{isActive(m) ? <em className="badge good live-dot">Canlı</em> : <em className="badge">Bugün</em>}</span></button></li>)}</ul>
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
        <div className="live-pdf" ref={pdfHost} aria-label={showingResult ? 'Resmi sonuç listesi' : 'Resmi start listesi'} />
      </section>}
    </div>
  );
}
