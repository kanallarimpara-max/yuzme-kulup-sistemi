import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileDown } from 'lucide-react';
import { db } from '../../lib/store';
import { downloadReceiptPdf } from '../../lib/pdf';
import { type SkillCard } from '../../lib/skills';
import SkillSummary from './SkillSummary';
import { useSession } from '../../lib/session';
import { useCollection } from '../../lib/store';
import { enrollmentScope, noticeScope, studentScope } from '../../lib/access';
import { paymentSummary, toIso } from '../../lib/rules';
import { dateTr, dayNames, money } from '../../lib/format';
import { useAttendance } from '../../lib/useAttendance';
import { usePeople } from '../../lib/people';
import type { Branch, Enrollment, Lesson, Notice, RaceEntry, Renewal, Student, Workout } from '../../lib/types';

const MARK = { geldi: ['Geldi', 'good'], gelmedi: ['Gelmedi', 'bad'], izinli: ['İzinli', 'warn'] } as const;

export default function ParentHome() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const scope = { clubId };
  const students = useCollection<Student>('students', studentScope(user));
  const enrollments = useCollection<Enrollment>('enrollments', enrollmentScope(user));
  const lessons = useCollection<Lesson>('lessons', scope);
  const branches = useCollection<Branch>('branches', scope);
  const users = usePeople(user, students.map((s) => s.coachId));
  const lessonIds = [...new Set(students.map((s) => s.lessonId))].sort();
  const workouts = useCollection<Workout>('workouts', lessonIds.length ? { clubId, within: ['lessonId', lessonIds] } : { skip: true });
  const attendance = useAttendance(user);
  const notices = useCollection<Notice>('notices', user ? noticeScope(user) : { skip: true });
  const own = user ? { clubId, eq: ['parentId', user.id] as [string, string] } : { skip: true };
  const renewals = useCollection<Renewal>('renewals', own);
  const skills = useCollection<SkillCard>('skillCards', own);
  const raceEntries = useCollection<RaceEntry>('raceEntries', own);
  const { club } = useSession();
  const [error, setError] = useState('');
  if (!user) return null;
  const today = toIso(new Date());
  const mine = students.filter((s) => s.parentId === user.id);
  const races = notices.filter((n) => n.kind === 'yaris' && !n.raceDayId && n.recipientIds.includes(user.id)).sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const programs = raceEntries.filter((e) => e.endDate >= today && e.events.length > 0).sort((a, b) => a.startDate.localeCompare(b.startDate));
  const soonEnd = new Date(Date.now() + 45 * 86400000).toISOString().slice(0, 10);
  const answer = (s: Student, status: Renewal['status']) => db.put('renewals', s.id, { clubId, studentId: s.id, parentId: user.id, lessonId: s.lessonId, status, updatedAt: Date.now(), updatedBy: user.id })
    .catch(() => setError('Yanıt kaydedilemedi.'));
  const rsvp = (e: RaceEntry, value: RaceEntry['rsvp']) => db.update('raceEntries', e.id, { rsvp: value, rsvpAt: Date.now() }).catch(() => setError('Yanıt kaydedilemedi.'));
  const receipt = async (s: Student, plan: Enrollment, no: number) => {
    const inst = plan.installments.find((i) => i.no === no);
    const lesson = lessons.find((l) => l.id === s.lessonId);
    if (!inst?.paidAt) return;
    const remaining = plan.installments.filter((i) => !i.paidAt).reduce((t, i) => t + i.amountKurus, 0);
    const fixed = (plan.history ?? []).filter((h) => h.no === no && h.action !== 'tahsilat').at(-1);
    try {
      await downloadReceiptPdf(`makbuz-${s.firstName}-${no}.pdf`.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-'), {
        clubName: club?.name ?? '', receiptNo: `${plan.id.slice(-8).toUpperCase()}-${no}`, studentName: `${s.firstName} ${s.lastName}`, parentName: user.name,
        lessonName: lesson?.name ?? '', period: lesson ? `${dateTr(lesson.startDate)} – ${dateTr(lesson.endDate)}` : '', installmentText: `${no} / ${plan.installments.length}`,
        dueDate: dateTr(inst.dueDate), paidDate: dateTr(inst.paidAt), method: inst.method ?? '', amount: money(inst.amountKurus), remaining: money(remaining),
        corrected: fixed ? `${new Date(fixed.at).toLocaleDateString('tr-TR')} tarihinde düzeltildi${fixed.reason ? `: ${fixed.reason}` : ''}` : undefined,
      });
    } catch {
      setError('Makbuz oluşturulamadı.');
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Veli</p><h1>Sporcularım</h1></div></header>
      {error && <p className="error" role="alert">{error}</p>}
      {programs.length > 0 && <section className="card stack"><h2>Yarış programı</h2>{programs.map((e) => {
        const related = notices.filter((n) => n.raceDayId === e.raceDayId).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
        return <article key={e.id} className="race-card">
          <div className="lap-head"><strong>{e.studentName} · {e.meetTitle}</strong><small>{dateTr(e.startDate)}{e.endDate !== e.startDate ? ` – ${dateTr(e.endDate)}` : ''}{e.meetTime ? ` · Buluşma: ${e.meetTime}` : ''}{e.meetPlace ? ` · ${e.meetPlace}` : ''}</small></div>
          <p className="muted"><em className="badge good">TYF start listesinde</em> {e.events.length} yarışa yazılmış.</p>
          <ul className="plain race-events">{e.events.map((ev) => <li key={`${ev.no}-${ev.heat}`}><strong>{ev.no}. {ev.name}</strong><small>Seri {ev.heat}/{ev.heats}{ev.lane !== null ? ` · Kulvar ${ev.lane}` : ''}{ev.date ? ` · ${dateTr(ev.date)}` : ''}</small></li>)}</ul>
          {related.map((n) => <p key={n.id} className="help-note"><strong>{n.title}</strong><br />{n.body}</p>)}
          <div className="race-tools"><span>Yarışa katılım: <em className={`badge ${e.rsvp === 'katiliyor' ? 'good' : e.rsvp === 'katilmiyor' ? 'bad' : 'warn'}`}>{e.rsvp === 'katiliyor' ? 'Katılıyor' : e.rsvp === 'katilmiyor' ? 'Katılmıyor' : 'Yanıt bekleniyor'}</em></span>
            <span className="form-actions"><button className={e.rsvp === 'katiliyor' ? 'primary' : ''} onClick={() => rsvp(e, 'katiliyor')}>Katılacak</button><button className={e.rsvp === 'katilmiyor' ? 'primary' : ''} onClick={() => rsvp(e, 'katilmiyor')}>Katılmayacak</button></span></div>
        </article>;
      })}</section>}
      {mine.length === 0 && <section className="card"><p className="muted">Kaydınız tamamlandığında sporcu bilgileri burada görünür.</p></section>}
      {mine.map((s) => {
        const lesson = lessons.find((l) => l.id === s.lessonId);
        const plan = enrollments.find((e) => e.studentId === s.id);
        const sum = plan ? paymentSummary(plan.installments, today) : null;
        const marks = attendance.filter((a) => a.marks[s.id]).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8);
        const assigned = workouts.filter((w) => w.lessonId === s.lessonId).sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')).slice(0, 5);
        return (
          <section className="card stack" key={s.id}>
            <div className="page-head"><div><h2>{s.firstName} {s.lastName}</h2>{lesson && <p className="muted">{lesson.name} · {branches.find((b) => b.id === lesson.branchId)?.name} · {dayNames(lesson.weekdays)} {lesson.startTime} · {users.find((u) => u.id === s.coachId)?.name}</p>}</div></div>
            <div className="stats three">
              <article><span>Toplam aidat</span><strong className="fit">{sum ? money(sum.totalKurus) : '—'}</strong></article>
              <article><span>Ödenen</span><strong className="fit">{sum ? money(sum.paidKurus) : '—'}</strong></article>
              <article><span>Kalan</span><strong className="fit">{sum ? money(sum.remainingKurus) : '—'}</strong></article>
            </div>
            {sum?.next && <p className="muted">Sonraki taksit {dateTr(sum.next.dueDate)} · {money(sum.next.amountKurus)}</p>}
            {lesson && lesson.endDate >= today && lesson.endDate <= soonEnd && (() => {
              const r = renewals.find((x) => x.studentId === s.id && x.lessonId === s.lessonId);
              return <div className="help-note renew-box"><span>Dönem {dateTr(lesson.endDate)} tarihinde bitiyor. {s.firstName} gelecek dönem devam edecek mi?</span>
                <span className="form-actions"><button className={r?.status === 'devam' ? 'primary' : ''} onClick={() => answer(s, 'devam')}>Evet, devam edecek</button><button className={r?.status === 'ayrilacak' ? 'primary' : ''} onClick={() => answer(s, 'ayrilacak')}>Hayır</button></span></div>;
            })()}
            {plan && plan.installments.some((i) => i.paidAt) && <details className="pay-history"><summary>Ödenen taksitler ve makbuzlar</summary>
              <ul className="simple-list">{plan.installments.filter((i) => i.paidAt).map((i) => <li key={i.no}><span>{i.no}/{plan.installments.length}. taksit · {money(i.amountKurus)}<small>{dateTr(i.paidAt!)} · {i.method}</small></span><button onClick={() => receipt(s, plan, i.no)}><FileDown size={15} />Makbuz</button></li>)}</ul>
            </details>}
            <div><h2>Beceri karnesi</h2><SkillSummary marks={skills.find((k) => k.studentId === s.id)?.marks} /></div>
            <div className="two-col">
              <div><h2>Antrenmanlar</h2>{assigned.length === 0 ? <p className="muted">Atanmış antrenman yok.</p> : <ul className="simple-list">{assigned.map((w) => <li key={w.id}><span>{w.title}<small>{w.date ? dateTr(w.date) : ''} · {w.sets.map((x) => `${x.reps}×${x.distance} ${x.stroke}`).join(', ')}</small></span></li>)}</ul>}</div>
              <div><h2>Devam durumu</h2>{marks.length === 0 ? <p className="muted">Henüz yoklama yok.</p> : <ul className="simple-list">{marks.map((a) => <li key={a.id}><span>{dateTr(a.date)}</span><em className={`badge ${MARK[a.marks[s.id]][1]}`}>{MARK[a.marks[s.id]][0]}</em></li>)}</ul>}</div>
            </div>
          </section>
        );
      })}
      <section className="card stack"><h2>TYF canlı sonuçlar</h2><p className="muted">Yarış sonuçlarını uygulamadan çıkmadan izleyin.</p><div><Link className="button" to="/canli-sonuclar">Canlı sonuçları aç</Link></div></section>
      <section className="card"><h2>Diğer yarış duyuruları</h2>{races.length === 0 ? <p className="muted">Planlı yarış duyurusu yok.</p> : <ul className="simple-list">{races.map((r) => <li key={r.id}><span>{r.title}<small>{r.date ? dateTr(r.date) : ''} · {r.body}</small></span></li>)}</ul>}</section>
    </div>
  );
}
