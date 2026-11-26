import { useMemo, useState, type FormEvent } from 'react';
import { ArrowLeft, Megaphone, RefreshCw, Users } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, useCollection, type BatchOp } from '../../lib/store';
import { studentScope } from '../../lib/access';
import { toIso } from '../../lib/rules';
import { dateTr } from '../../lib/format';
import { readPdfPages } from '../../lib/tyf';
import { matchStartEntries, parseStartPages } from '../../lib/startList';
import { liveMeet, meetPdf, workerEnabled } from '../../lib/worker';
import { useConfirm } from '../../lib/confirm';
import type { Notice, RaceDay, RaceEntry, RaceEvent, Student, TyfMeet } from '../../lib/types';

const RSVP = { bekliyor: ['Yanıt bekleniyor', 'warn'], katiliyor: ['Katılıyor', 'good'], katilmiyor: ['Katılmıyor', 'bad'] } as const;
const meetIdOf = (url: string) => url.match(/\/live\/(\d{4})\/(\d+)\//)?.slice(1).join('-') ?? '';
const short = (title: string) => (title.length > 48 ? `${title.slice(0, 46)}…` : title);

/** TYF start listesinden antrenörün kendi sporcularının yarış programı; veli yanıtı ve yarışa özel duyuru aynı ekranda. */
export default function RaceDayPage() {
  const { user, club } = useSession();
  const clubId = club?.id ?? '';
  const uid = user?.id ?? '';
  const meets = useCollection<TyfMeet>('tyfMeets');
  const days = useCollection<RaceDay>('raceDays', clubId ? { clubId, eq: ['coachId', uid] } : { skip: true });
  const entries = useCollection<RaceEntry>('raceEntries', clubId ? { clubId, eq: ['coachId', uid] } : { skip: true });
  const sent = useCollection<Notice>('notices', clubId ? { clubId, eq: ['senderId', uid] } : { skip: true });
  const students = useCollection<Student>('students', studentScope(user));
  const [meetUrl, setMeetUrl] = useState('');
  const [preview, setPreview] = useState<Map<string, RaceEvent[]> | null>(null);
  const [progress, setProgress] = useState('');
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState({ meetTime: '', meetPlace: '' });
  const [notice, setNotice] = useState({ title: '', body: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [confirmDialog, confirm] = useConfirm();
  const today = toIso(new Date());
  const mine = useMemo(() => students.filter((s) => user?.role !== 'coach' || s.coachId === uid), [students, user?.role, uid]);
  const upcoming = useMemo(() => meets.filter((m) => (m.endDate || m.startDate) >= today).sort((a, b) => a.startDate.localeCompare(b.startDate)), [meets, today]);
  if (!user || !club) return null;

  const meet = meets.find((m) => m.url === meetUrl);
  const dayId = meet ? `${clubId}_${meetIdOf(meet.url)}_${uid}` : '';
  const day = days.find((d) => d.id === dayId);
  const dayEntries = entries.filter((e) => e.raceDayId === dayId).sort((a, b) => a.studentName.localeCompare(b.studentName, 'tr'));
  const dayNotices = sent.filter((n) => n.raceDayId === dayId).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));

  const open = (url: string) => {
    setMeetUrl(url);
    setPreview(null);
    setStatus('');
    setError('');
    const existing = days.find((d) => d.meetUrl === url);
    setInfo({ meetTime: existing?.meetTime ?? '', meetPlace: existing?.meetPlace ?? '' });
  };

  // Yarışın bütün start listeleri okunur, kulüp sporcularıyla eşleşen satırlar toplanır.
  const scan = async () => {
    if (!meet) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const detail = await liveMeet(meet.url);
      const events = detail.sessions.flatMap((s) => s.events).filter((e) => e.startUrl);
      if (!events.length) throw new Error('Bu yarışın start listesi henüz yayınlanmadı.');
      const found = new Map<string, RaceEvent[]>();
      for (const [i, e] of events.entries()) {
        setProgress(`Start listeleri okunuyor: ${i + 1}/${events.length}`);
        const parsed = parseStartPages(await readPdfPages(await meetPdf(e.startUrl)));
        if (!parsed) continue;
        for (const { athlete, entry } of matchStartEntries(parsed, club.name, mine)) {
          found.set(athlete.id, [...(found.get(athlete.id) ?? []), { no: e.no, name: `${e.name} · ${e.gender}${e.round ? ` · ${e.round}` : ''}`, heat: entry.heat, heats: entry.heats, lane: entry.lane, entryTime: entry.entryTime, date: parsed.date }]);
        }
      }
      setPreview(found);
      setStatus(found.size ? `${found.size} sporcunuz start listesinde bulundu.` : 'Start listelerinde kulübünüzden eşleşen sporcu bulunamadı.');
    } catch (err) {
      setError((err as Error).message || 'Start listeleri okunamadı.');
    } finally {
      setProgress('');
      setBusy(false);
    }
  };

  const save = async () => {
    if (!meet || !preview) return;
    setBusy(true);
    setError('');
    try {
      const now = Date.now();
      const ops: BatchOp[] = [{ name: 'raceDays', id: dayId, data: {
        clubId, coachId: uid, meetId: meetIdOf(meet.url), meetUrl: meet.url, title: meet.title.slice(0, 200), info: meet.info.slice(0, 200),
        startDate: meet.startDate, endDate: meet.endDate || meet.startDate, meetTime: info.meetTime.trim().slice(0, 120), meetPlace: info.meetPlace.trim().slice(0, 200),
        scannedAt: now, ...(day ? {} : { createdAt: now }),
      } }];
      const ids = new Set([...preview.keys(), ...dayEntries.map((e) => e.studentId)]);
      for (const sid of ids) {
        const s = mine.find((x) => x.id === sid);
        if (!s) continue;
        const old = dayEntries.find((e) => e.studentId === sid);
        // Veli yanıtı korunur; listeden çıkan sporcunun yarışları boşalır.
        ops.push({ name: 'raceEntries', id: `${dayId}_${sid}`, data: {
          clubId, raceDayId: dayId, coachId: uid, studentId: sid, parentId: s.parentId, studentName: `${s.firstName} ${s.lastName}`,
          meetTitle: meet.title.slice(0, 200), startDate: meet.startDate, endDate: meet.endDate || meet.startDate,
          meetTime: info.meetTime.trim().slice(0, 120), meetPlace: info.meetPlace.trim().slice(0, 200), events: preview.get(sid) ?? [],
          ...(old ? {} : { rsvp: 'bekliyor', createdAt: now }),
        } });
      }
      for (let i = 0; i < ops.length; i += 400) await db.batch(ops.slice(i, i + 400));
      setPreview(null);
      setStatus('Yarış programı kaydedildi. Veliler yalnız kendi çocuklarının programını görür ve katılımı onaylar.');
    } catch {
      setError('Program kaydedilemedi.');
    } finally {
      setBusy(false);
    }
  };

  const saveInfo = async (e: FormEvent) => {
    e.preventDefault();
    if (!day) return;
    const data = { meetTime: info.meetTime.trim().slice(0, 120), meetPlace: info.meetPlace.trim().slice(0, 200) };
    await db.batch([{ name: 'raceDays', id: day.id, data }, ...dayEntries.map((x) => ({ name: 'raceEntries', id: x.id, data }))]);
    setStatus('Buluşma bilgisi güncellendi.');
  };

  const sendNotice = async (e: FormEvent) => {
    e.preventDefault();
    if (!day) return;
    const parents = [...new Set(dayEntries.filter((x) => x.events.length).map((x) => x.parentId).filter(Boolean))];
    if (!parents.length) return setError('Bu yarışta programı olan sporcu yok.');
    if (!(await confirm({ title: `Duyuru ${parents.length} veliye gönderilsin mi?`, text: 'Yalnız bu yarışta programı olan sporcuların velilerine gider.', ok: 'Gönder' }))) return;
    await db.add('notices', {
      clubId, senderId: uid, kind: 'yaris', raceDayId: day.id, date: day.startDate, recipientIds: parents, readBy: [],
      title: `${short(day.title)}: ${notice.title.trim()}`.slice(0, 200), body: notice.body.trim().slice(0, 2000),
    });
    setNotice({ title: '', body: '' });
    setStatus(`Duyuru ${parents.length} veliye gönderildi.`);
  };

  const listed = (x: RaceEntry) => x.events.length > 0;
  const shown = preview
    ? [...preview.entries()].map(([sid, evs]) => ({ id: sid, name: `${mine.find((s) => s.id === sid)?.firstName ?? ''} ${mine.find((s) => s.id === sid)?.lastName ?? ''}`, events: evs, rsvp: dayEntries.find((x) => x.studentId === sid)?.rsvp }))
    : dayEntries.map((x) => ({ id: x.studentId, name: x.studentName, events: x.events, rsvp: x.rsvp }));

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">Yarış günü</p><h1>{meet ? meet.title : 'Yarış günü programı'}</h1>{meet && <p className="muted">{meet.info}</p>}</div>
        {meet && <button onClick={() => open('')}><ArrowLeft size={16} />Yarışlar</button>}
      </header>
      {error && <p className="error" role="alert">{error}</p>}
      {status && <p className="ok" role="status">{status}</p>}
      {!workerEnabled && <section className="card"><p className="muted">TYF bağlantısı bu ortamda kapalı.</p></section>}

      {!meet && <section className="card stack">
        <h2>Yaklaşan ve süren yarışlar</h2>
        <p className="muted">Yarışı açın; TYF start listelerindeki {user.role === 'coach' ? 'sporcularınız' : 'kulüp sporcuları'} bulunur, seri ve kulvarıyla programa eklenir.</p>
        {upcoming.length === 0 ? <p className="muted">Canlı sonuç sayfası açılmış yaklaşan yarış yok.</p> : <ul className="live-list">{upcoming.map((m) => {
          const saved = days.find((d) => d.meetUrl === m.url);
          return <li key={m.id}><button onClick={() => open(m.url)}><span><strong>{m.title}</strong><small>{m.info}</small></span>
            <span className="live-badges">{saved && <em className="badge good">Program var · {entries.filter((e) => e.raceDayId === saved.id && e.events.length).length} sporcu</em>}</span></button></li>;
        })}</ul>}
      </section>}

      {meet && <>
        <section className="card stack">
          <div className="race-tools"><h2><Users size={18} /> Sporcu programı</h2>
            <button className="primary" disabled={busy || !workerEnabled} onClick={scan}><RefreshCw size={16} />{day ? 'Start listelerini yeniden tara' : 'Start listelerini tara'}</button></div>
          {progress && <p className="muted" role="status">{progress}</p>}
          {shown.length === 0 ? <p className="muted">{day ? 'Kayıtlı programda sporcu yok.' : 'Henüz tarama yapılmadı.'}</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Sporcu</th><th>TYF start listesi</th><th>Yarışlar (seri / kulvar)</th><th>Veli onayı</th></tr></thead>
              <tbody>{shown.map((r) => <tr key={r.id}>
                <td>{r.name}</td>
                <td>{r.events.length ? <em className="badge good">Listede · {r.events.length} yarış</em> : <em className="badge bad">Listede yok</em>}</td>
                <td>{r.events.length ? <ul className="plain race-events">{r.events.map((ev) => <li key={`${ev.no}-${ev.heat}`}><strong>{ev.no}. {ev.name}</strong><small>Seri {ev.heat}/{ev.heats}{ev.lane !== null ? ` · Kulvar ${ev.lane}` : ''}{ev.entryTime ? ` · Giriş ${ev.entryTime}` : ''}{ev.date ? ` · ${dateTr(ev.date)}` : ''}</small></li>)}</ul> : '—'}</td>
                <td>{!r.events.length ? '—' : r.rsvp ? <em className={`badge ${RSVP[r.rsvp][1]}`}>{RSVP[r.rsvp][0]}</em> : <em className="badge">Kaydedilince sorulur</em>}</td>
              </tr>)}</tbody>
            </table></div>
          )}
          {preview && <>
            <div className="form-grid">
              <label>Buluşma saati<input maxLength={120} placeholder="Örnek: 27 Kasım 08.15" value={info.meetTime} onChange={(e) => setInfo({ ...info, meetTime: e.target.value })} /></label>
              <label>Buluşma yeri<input maxLength={200} placeholder="Örnek: Havuzun ana girişi" value={info.meetPlace} onChange={(e) => setInfo({ ...info, meetPlace: e.target.value })} /></label>
            </div>
            <div className="form-actions"><button className="primary" disabled={busy} onClick={save}>Programı kaydet ve velilere göster</button><button onClick={() => setPreview(null)}>Vazgeç</button></div>
          </>}
        </section>

        {day && !preview && <>
          <form className="card stack" onSubmit={saveInfo}>
            <h2>Buluşma bilgisi</h2>
            <div className="form-grid">
              <label>Buluşma saati<input maxLength={120} placeholder="Örnek: 27 Kasım 08.15" value={info.meetTime} onChange={(e) => setInfo({ ...info, meetTime: e.target.value })} /></label>
              <label>Buluşma yeri<input maxLength={200} placeholder="Örnek: Havuzun ana girişi" value={info.meetPlace} onChange={(e) => setInfo({ ...info, meetPlace: e.target.value })} /></label>
            </div>
            <div className="form-actions"><button className="primary">Kaydet</button><span className="muted">{dayEntries.filter((x) => x.rsvp === 'katiliyor').length} katılıyor · {dayEntries.filter((x) => x.rsvp === 'katilmiyor').length} katılmıyor · {dayEntries.filter((x) => listed(x) && x.rsvp === 'bekliyor').length} yanıt bekleniyor</span></div>
          </form>
          <form className="card stack" onSubmit={sendNotice}>
            <h2><Megaphone size={18} /> Bu yarışa özel duyuru</h2>
            <p className="muted">Yalnız bu yarışta programı olan {new Set(dayEntries.filter(listed).map((x) => x.parentId)).size} veliye gider; veli duyuruyu çocuğunun yarış programında görür.</p>
            <label>Başlık<input required maxLength={120} placeholder="Örnek: 100 m serbest buluşma" value={notice.title} onChange={(e) => setNotice({ ...notice, title: e.target.value })} /></label>
            <label>Mesaj<textarea required rows={3} maxLength={2000} placeholder="Örnek: 100 m serbest için buluşma saatimiz 08.15, yerimiz havuzun ana girişi." value={notice.body} onChange={(e) => setNotice({ ...notice, body: e.target.value })} /></label>
            <div className="form-actions"><button className="primary">Duyuruyu gönder</button></div>
            {dayNotices.length > 0 && <ul className="simple-list">{dayNotices.map((n) => <li key={n.id}><span>{n.title}<small>{n.body} · {n.recipientIds.length} veli</small></span></li>)}</ul>}
          </form>
        </>}
      </>}
      {confirmDialog}
    </div>
  );
}
