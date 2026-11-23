import { useMemo, useState, type FormEvent } from 'react';
import { useSession } from '../../lib/session';
import { db, newId, useCollection } from '../../lib/store';
import { coachFit, lessonEndDate, toIso, type CoachFit } from '../../lib/rules';
import { dateTr, dayNames, money, toKurus, WEEKDAYS } from '../../lib/format';
import type { Availability, Branch, Lesson, Notice, TrainingModel, User } from '../../lib/types';

const FIT: Record<CoachFit, { label: string; cls: string }> = {
  uygun: { label: 'Müsait', cls: 'good' },
  'musait-degil': { label: 'Müsaitlik işaretlememiş', cls: 'warn' },
  cakisiyor: { label: 'Başka dersi var', cls: 'bad' },
};

const empty = () => ({
  name: '', branchId: '', modelId: '', coachIds: [] as string[], weekdays: [] as number[], startTime: '17:00', endTime: '18:00',
  startDate: toIso(new Date()), sessionCount: 12, capacity: 10, fee: '', coachPay: '', maxInstallments: 1, interestPercent: 0,
});

export default function Lessons() {
  const { user, club } = useSession();
  const clubId = club?.id ?? '';
  const scope = { clubId };
  const lessons = useCollection<Lesson>('lessons', scope);
  const branches = useCollection<Branch>('branches', scope);
  const models = useCollection<TrainingModel>('models', scope);
  const slots = useCollection<Availability>('availability', scope);
  const users = useCollection<User>('users', scope);
  const [form, setForm] = useState(empty);
  // Şube atanmamış antrenör tüm şubelerde seçilebilir.
  const coaches = users.filter((u) => u.role === 'coach' && (!form.branchId || !u.branchIds?.length || u.branchIds.includes(form.branchId)));
  const [message, setMessage] = useState('');
  const set = <K extends keyof ReturnType<typeof empty>>(key: K, value: ReturnType<typeof empty>[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggle = <T,>(list: T[], value: T) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const endDate = lessonEndDate(form.startDate, form.weekdays, form.sessionCount);
  const branchName = branches.find((b) => b.id === form.branchId)?.name ?? '';
  const autoName = branchName ? `${form.startTime}-${form.endTime} ${branchName}` : '';
  const draft = { coachIds: form.coachIds, weekdays: form.weekdays, startTime: form.startTime, endTime: form.endTime, startDate: form.startDate, endDate: endDate ?? form.startDate };
  const fits = useMemo(() => Object.fromEntries(coaches.map((c) => [c.id, coachFit(c.id, form.branchId, draft, slots, lessons)])), [coaches, form, slots, lessons, endDate]);
  const timeValid = form.startTime < form.endTime;
  const canSave = form.branchId && form.modelId && form.coachIds.length > 0 && form.weekdays.length > 0 && endDate && timeValid && form.capacity > 0;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSave || !endDate || !user) return;
    const name = form.name.trim() || autoName;
    const lessonId = newId();
    // Maaş herkese açık ders kaydına yazılmaz.
    await db.batch([
      { name: 'lessons', id: lessonId, data: {
        clubId, branchId: form.branchId, modelId: form.modelId, coachIds: form.coachIds, name, weekdays: form.weekdays,
        startTime: form.startTime, endTime: form.endTime, startDate: form.startDate, endDate, sessionCount: form.sessionCount,
        capacity: form.capacity, feeKurus: toKurus(form.fee),
        maxInstallments: form.maxInstallments, interestPercent: form.interestPercent, createdAt: Date.now(),
      } },
      { name: 'lessonPay', id: lessonId, data: { clubId, coachIds: form.coachIds, coachPayKurus: toKurus(form.coachPay) } },
    ]);
    const notice: Omit<Notice, 'id'> = {
      clubId, senderId: user.id, kind: 'ders', title: 'Yeni ders atandı',
      body: `${name} · ${dayNames(form.weekdays)} ${form.startTime}-${form.endTime} · ${branchName}`,
      recipientIds: form.coachIds, readBy: [],
    };
    await db.add('notices', notice);
    setForm(empty());
    setMessage(`${name} açıldı, antrenöre bildirim gönderildi.`);
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Kulüp yönetimi</p><h1>Ders saatleri</h1></div></header>
      <form className="card stack" onSubmit={submit}>
        <h2>Yeni ders saati</h2>
        <div className="form-grid">
          <label>Ders adı<input placeholder={autoName || 'Boşsa saat ve şubeden oluşur'} value={form.name} onChange={(e) => set('name', e.target.value)} /></label>
          <label>Şube *<select required value={form.branchId} onChange={(e) => set('branchId', e.target.value)}><option value="">Seçin</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
          <label>Eğitim modeli *<select required value={form.modelId} onChange={(e) => {
            const model = models.find((m) => m.id === e.target.value);
            setForm((f) => ({ ...f, modelId: e.target.value, capacity: model ? model.perCoach * Math.max(1, f.coachIds.length) : f.capacity }));
          }}><option value="">Seçin</option>{models.map((m) => <option key={m.id} value={m.id}>{m.name} ({m.perCoach} kişi)</option>)}</select></label>
          <label>Başlangıç tarihi<input type="date" required value={form.startDate} onChange={(e) => set('startDate', e.target.value)} /></label>
          <label>Başlangıç saati<input type="time" required value={form.startTime} onChange={(e) => set('startTime', e.target.value)} /></label>
          <label>Bitiş saati<input type="time" required value={form.endTime} onChange={(e) => set('endTime', e.target.value)} /></label>
          <label>Toplam seans<input type="number" min={1} required value={form.sessionCount} onChange={(e) => set('sessionCount', Number(e.target.value))} /></label>
          <label>Kontenjan<input type="number" min={1} required value={form.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></label>
          <label>Öğrenci aidatı (TL)<input inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" required value={form.fee} onChange={(e) => set('fee', e.target.value)} /></label>
          <label>Antrenör maaşı (TL)<input inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" required value={form.coachPay} onChange={(e) => set('coachPay', e.target.value)} /></label>
          <label>En fazla taksit<input type="number" min={1} max={12} value={form.maxInstallments} onChange={(e) => set('maxInstallments', Number(e.target.value))} /></label>
          <label>Taksit faizi (%)<input type="number" min={0} step="0.01" value={form.interestPercent} onChange={(e) => set('interestPercent', Number(e.target.value))} /></label>
        </div>
        <fieldset><legend>Haftanın günleri *</legend>
          <div className="chips">{WEEKDAYS.map((d) => (
            <button type="button" key={d.value} aria-pressed={form.weekdays.includes(d.value)} className={form.weekdays.includes(d.value) ? 'chip on' : 'chip'} onClick={() => set('weekdays', toggle(form.weekdays, d.value))}>{d.short}</button>
          ))}</div>
        </fieldset>
        <fieldset><legend>Antrenör *</legend>
          <div className="coach-picks">{coaches.map((c) => {
            const fit = FIT[fits[c.id] ?? 'musait-degil'];
            return (
              <label className="check" key={c.id}>
                <input type="checkbox" checked={form.coachIds.includes(c.id)} onChange={() => set('coachIds', toggle(form.coachIds, c.id))} />
                <span>{c.name}</span>
                {form.branchId && form.weekdays.length > 0 && <em className={`badge ${fit.cls}`}>{fit.label}</em>}
              </label>
            );
          })}</div>
        </fieldset>
        {!timeValid && <p className="error" role="alert">Bitiş saati başlangıçtan sonra olmalı.</p>}
        <div className="form-actions">
          <button className="primary" disabled={!canSave}>Ders saatini aç</button>
          <span className="muted">Otomatik bitiş: {endDate ? dateTr(endDate) : 'gün seçin'}</span>
          {message && <span className="ok" role="status">{message}</span>}
        </div>
      </form>
      <section className="card">
        <h2>Açık dersler</h2>
        <div className="table-wrap"><table>
          <thead><tr><th>Ders</th><th>Şube</th><th>Gün / saat</th><th>Tarih</th><th>Kontenjan</th><th>Aidat</th><th>Antrenör</th></tr></thead>
          <tbody>{lessons.map((l) => (
            <tr key={l.id}>
              <td>{l.name}</td><td>{branches.find((b) => b.id === l.branchId)?.name}</td><td>{dayNames(l.weekdays)} {l.startTime}-{l.endTime}</td>
              <td>{dateTr(l.startDate)} – {dateTr(l.endDate)}</td><td>{l.capacity}</td><td>{money(l.feeKurus)}</td>
              <td>{l.coachIds.map((id) => users.find((u) => u.id === id)?.name).join(', ')}</td>
            </tr>
          ))}</tbody>
        </table></div>
      </section>
    </div>
  );
}
