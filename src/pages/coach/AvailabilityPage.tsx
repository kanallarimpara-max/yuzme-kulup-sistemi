import { useState } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { WEEKDAYS } from '../../lib/format';
import type { Availability, Branch } from '../../lib/types';

const HOURS = Array.from({ length: 17 }, (_, i) => i + 6);

export default function AvailabilityPage() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const branches = useCollection<Branch>('branches', { clubId });
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
        <div><p className="eyebrow">Antrenör</p><h1>Müsaitlik saatlerim</h1></div>
        <label>Şube<select value={branchId} onChange={(e) => setPicked(e.target.value)}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
      </header>
      <section className="card">
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
