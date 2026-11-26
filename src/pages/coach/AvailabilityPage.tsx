import { useState } from 'react';
import { db, useCollection } from '../../lib/store';
import { dateTr, dayNames, WEEKDAYS } from '../../lib/format';
import type { Availability } from '../../lib/types';
import { useCoachData } from './useCoachData';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export default function AvailabilityPage() {
  const { user, clubId, lessons, students, branches, branchName } = useCoachData();
  const slots = useCollection<Availability>('availability', { clubId });
  const [picked, setPicked] = useState('');
  const branchId = picked || branches[0]?.id || '';
  if (!user) return null;

  const idOf = (weekday: number, hour: number) => `${user.id}_${branchId}_${weekday}_${hour}`;
  const has = (weekday: number, hour: number) => slots.some((s) => s.id === idOf(weekday, hour));
  const toggle = (weekday: number, hour: number) => (has(weekday, hour)
    ? db.remove('availability', idOf(weekday, hour))
    : db.put('availability', idOf(weekday, hour), { clubId, coachId: user.id, branchId, weekday, hour }));

  return (
    <div className="page">
      <header className="page-head">
        <div><h1>Dersler ve müsaitlik</h1></div>
      </header>
      <section className="card">
        <h2>Aktif derslerim</h2>
        {lessons.length === 0 ? <p className="muted">Atanmış ders yok.</p> : <div className="table-wrap"><table>
          <thead><tr><th>Şube</th><th>Ders</th><th>Kişi</th><th>Günler</th><th>Saat</th><th>Bitiş</th></tr></thead>
          <tbody>{lessons.map((l) => <tr key={l.id}><td>{branchName(l.branchId)}</td><td>{l.name}</td><td>{students.filter((s) => s.lessonId === l.id).length}/{l.capacity}</td><td>{dayNames(l.weekdays)}</td><td>{l.startTime}–{l.endTime}</td><td>{dateTr(l.endDate)}</td></tr>)}</tbody>
        </table></div>}
      </section>
      <section className="card">
        <div className="page-head"><h2>Müsaitlik saatlerim</h2><label>Şube<select value={branchId} onChange={(e) => setPicked(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label></div>
        <p className="muted">Uygun olduğun saatlere dokun. Yönetici ders açarken bu bilgiyi otomatik görür.</p>
        <div className="table-wrap"><table className="slot-table">
          <thead><tr><th>Saat</th>{WEEKDAYS.map((d) => <th key={d.value}>{d.short}</th>)}</tr></thead>
          <tbody>{HOURS.map((hour) => (
            <tr key={hour}>
              <th>{String(hour).padStart(2, '0')}:00</th>
              {WEEKDAYS.map((d) => {
                const on = has(d.value, hour);
                return <td key={d.value}><button className={on ? 'slot on' : 'slot'} aria-pressed={on} aria-label={`${d.long} ${hour}:00 ${on ? 'müsait' : 'müsait değil'}`} onClick={() => toggle(d.value, hour)}>{on ? '✓' : ''}</button></td>;
              })}
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
