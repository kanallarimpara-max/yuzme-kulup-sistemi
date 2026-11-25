import { useMemo, useState } from 'react';
import { CalendarPlus, CalendarX, ChevronLeft, ChevronRight, MapPin } from 'lucide-react';
import { useSession } from '../lib/session';
import { db, useCollection } from '../lib/store';
import { toIso } from '../lib/rules';
import { useRaceCalendar } from '../lib/useRaceCalendar';
import type { CalendarEvent } from '../lib/tyfCalendar';
import type { ClubRace } from '../lib/types';

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const titleCase = (s: string) => s.toLocaleLowerCase('tr-TR').replace(/(^|[\s(,-])(\p{L})/gu, (_, a: string, b: string) => a + b.toLocaleUpperCase('tr-TR'))
  .replace(/ (Ve|İle|De) /g, (w) => w.toLocaleLowerCase('tr-TR')).replace(/\b(Tyf|Eyof|Comen)\b/g, (w) => w.toLocaleUpperCase('tr-TR'));
const monthKey = (iso: string) => iso.slice(0, 7);
const monthLabel = (key: string) => `${MONTHS[Number(key.slice(5, 7)) - 1]} ${key.slice(0, 4)}`;
const shiftMonth = (key: string, by: number) => {
  const d = new Date(Number(key.slice(0, 4)), Number(key.slice(5, 7)) - 1 + by, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
type Race = Pick<ClubRace, 'title' | 'dateText' | 'startDate' | 'endDate' | 'pool' | 'category' | 'place'> & { id: string };

/** Ay görünümü: kulüp takvimindeki yarış günleri işaretlenir. */
function MonthGrid({ month, races, today, onMonth }: { month: string; races: Race[]; today: string; onMonth: (m: string) => void }) {
  const first = new Date(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1);
  const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells = [...Array(lead).fill(null), ...Array.from({ length: days }, (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`)];
  return (
    <section className="card stack">
      <div className="cal-head">
        <button aria-label="Önceki ay" onClick={() => onMonth(shiftMonth(month, -1))}><ChevronLeft size={18} /></button>
        <h2>{monthLabel(month)}</h2>
        <button aria-label="Sonraki ay" onClick={() => onMonth(shiftMonth(month, 1))}><ChevronRight size={18} /></button>
      </div>
      <div className="cal-grid" role="grid" aria-label={`${monthLabel(month)} yarış takvimi`}>
        {DAYS.map((d) => <span key={d} className="cal-day-name">{d}</span>)}
        {cells.map((day, i) => {
          if (!day) return <span key={`b${i}`} />;
          const on = races.filter((r) => r.startDate <= day && r.endDate >= day);
          return (
            <span key={day} className={`cal-cell${on.length ? ' has-race' : ''}${day === today ? ' today' : ''}`} title={on.map((r) => titleCase(r.title)).join('\n') || undefined}>
              {Number(day.slice(8))}
            </span>
          );
        })}
      </div>
    </section>
  );
}

function RaceRow({ race, today, children }: { race: Race; today: string; children?: React.ReactNode }) {
  const past = race.endDate < today;
  const now = race.startDate <= today && race.endDate >= today;
  return (
    <li className={`race-row${past ? ' past' : ''}`}>
      <div className="race-date"><strong>{race.dateText}</strong>{now && <em className="badge good">Sürüyor</em>}{past && <em className="badge">Geçti</em>}</div>
      <div className="race-body">
        <strong>{titleCase(race.title)}</strong>
        <small><MapPin size={13} /> {titleCase(race.place) || 'Yer belirtilmedi'} · {race.pool}</small>
        {race.category && <small>{race.category}</small>}
      </div>
      {children}
    </li>
  );
}

export default function RaceCalendar() {
  const { user, club } = useSession();
  const staff = user?.role === 'admin' || user?.role === 'coach';
  const clubId = user?.clubId ?? '';
  const today = toIso(new Date());
  const { events, source } = useRaceCalendar();
  const chosen = useCollection<ClubRace>('clubRaces', clubId ? { clubId } : { skip: true });
  const [tab, setTab] = useState<'kulup' | 'tyf'>('kulup');
  const [showIntl, setShowIntl] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [month, setMonth] = useState(monthKey(today));
  const [busy, setBusy] = useState('');

  const clubRaces = useMemo(() => [...chosen].sort((a, b) => a.startDate.localeCompare(b.startDate)), [chosen]);
  const added = useMemo(() => new Set(chosen.map((r) => r.eventId)), [chosen]);
  const list = useMemo(() => events.filter((e) => (showIntl || !e.international) && (showPast || e.endDate >= today)), [events, showIntl, showPast, today]);
  const upcoming = clubRaces.filter((r) => showPast || r.endDate >= today);
  const byMonth = (rows: Race[]) => rows.reduce<Record<string, Race[]>>((acc, r) => ({ ...acc, [monthKey(r.startDate)]: [...(acc[monthKey(r.startDate)] ?? []), r] }), {});

  const add = async (e: CalendarEvent) => {
    if (!user || !clubId) return;
    setBusy(e.id);
    try {
      await db.put('clubRaces', `${clubId}_${e.id}`, {
        clubId, eventId: e.id, title: e.title, dateText: e.dateText, startDate: e.startDate, endDate: e.endDate,
        pool: e.pool, category: e.category, place: e.place, approvedBy: user.id, createdAt: Date.now(),
      });
    } finally {
      setBusy('');
    }
  };
  const drop = async (eventId: string) => {
    setBusy(eventId);
    try {
      await db.remove('clubRaces', `${clubId}_${eventId}`);
    } finally {
      setBusy('');
    }
  };

  const grouped = (rows: Race[], action?: (r: Race) => React.ReactNode) => Object.entries(byMonth(rows)).map(([key, items]) => (
    <section key={key} className="stack">
      <h3 className="race-month">{monthLabel(key)}</h3>
      <ul className="race-list">{items.map((r) => <RaceRow key={r.id} race={r} today={today}>{action?.(r)}</RaceRow>)}</ul>
    </section>
  ));

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">{club?.name ?? 'Kulüp'}</p><h1>Yarış takvimi</h1>
          <p className="muted">{staff ? 'TYF faaliyet takviminden kulübünüzün katılacağı yarışları seçin. Seçtikleriniz velilerin takviminde görünür.' : 'Kulübünüzün katılacağı yarışlar.'}</p></div>
      </header>

      {staff && <div className="segmented" role="tablist" aria-label="Takvim">
        <button role="tab" aria-selected={tab === 'kulup'} className={tab === 'kulup' ? 'primary' : ''} onClick={() => setTab('kulup')}>Kulüp takvimi ({clubRaces.length})</button>
        <button role="tab" aria-selected={tab === 'tyf'} className={tab === 'tyf' ? 'primary' : ''} onClick={() => setTab('tyf')}>TYF faaliyet takvimi</button>
      </div>}

      {(tab === 'kulup' || !staff) && <>
        <MonthGrid month={month} races={clubRaces} today={today} onMonth={setMonth} />
        <section className="card stack">
          <div className="race-tools"><h2>Katılacağımız yarışlar</h2><label className="check"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Geçmiş yarışları göster</label></div>
          {upcoming.length === 0
            ? <p className="muted">{staff ? 'Henüz yarış seçilmedi. "TYF faaliyet takvimi" sekmesinden yarış ekleyin.' : 'Kulübünüz henüz takvime yarış eklemedi.'}</p>
            : grouped(upcoming, staff ? (r) => <button disabled={busy === (r as ClubRace).eventId} onClick={() => drop((r as ClubRace).eventId)}><CalendarX size={16} />Çıkar</button> : undefined)}
        </section>
      </>}

      {staff && tab === 'tyf' && <section className="card stack">
        <div className="race-tools">
          <h2>TYF 2026-2027 faaliyet takvimi</h2>
          <div className="toolbar">
            <label className="check"><input type="checkbox" checked={showIntl} onChange={(e) => setShowIntl(e.target.checked)} /> Uluslararası ve milli takım yarışları</label>
            <label className="check"><input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Geçmiş yarışlar</label>
          </div>
        </div>
        {list.length === 0 ? <p className="muted">Gösterilecek yarış yok.</p> : grouped(list, (r) => {
          const e = r as CalendarEvent;
          return added.has(e.id)
            ? <button disabled={busy === e.id} onClick={() => drop(e.id)}><CalendarX size={16} />Takvimden çıkar</button>
            : <button className="primary" disabled={busy === e.id} onClick={() => add(e)}><CalendarPlus size={16} />Takvime ekle</button>;
        })}
        <p className="muted">Kaynak: <a href={source} target="_blank" rel="noreferrer">TYF faaliyet takvimi (PDF)</a>. Takvim günde dört kez kendiliğinden güncellenir.</p>
      </section>}
    </div>
  );
}
