import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { buildMonthlyReport, monthName, recentMonths, type ResultLine } from '../../lib/monthlyReport';
import { downloadMonthlyReportPdf } from '../../lib/pdf';
import { formatSwimTime, toIso } from '../../lib/rules';
import { STROKE_LABEL, dateTr, money } from '../../lib/format';
import type { SkillCard } from '../../lib/skills';
import type { AttendanceDoc, CoachComment, Enrollment, Student, SwimResult } from '../../lib/types';

type Props = {
  student: Student; clubName: string; lessonName: string; coachName: string;
  attendance: AttendanceDoc[]; results: SwimResult[]; comments: CoachComment[]; skills?: SkillCard; enrollment?: Enrollment;
};

const event = (r: ResultLine) => `${r.distance} m ${STROKE_LABEL[r.stroke] ?? r.stroke}`;
// Yüzmede süre azalırsa gelişmedir: eksi fark iyi haber.
const diffText = (r: ResultLine) => (r.diffMs === null ? 'İlk derece' : r.diffMs < 0 ? `${(-r.diffMs / 1000).toFixed(2)} sn daha hızlı` : r.diffMs > 0 ? `${(r.diffMs / 1000).toFixed(2)} sn daha yavaş` : 'Aynı');

/** Velinin seçtiği ay için çocuğun aylık raporu; varsayılan geçen aydır. */
export default function MonthlyReport({ student, clubName, lessonName, coachName, attendance, results, comments, skills, enrollment }: Props) {
  const today = toIso(new Date());
  const months = recentMonths(today, 6);
  const [month, setMonth] = useState(months[1]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const r = buildMonthlyReport({ month, today, studentId: student.id, attendance, results, comments, installments: enrollment?.installments ?? [],
    skills: skills ? { marks: skills.marks, updatedAt: skills.updatedAt } : undefined });
  const name = `${student.firstName} ${student.lastName}`;
  const a = r.attendance;
  const hasSkills = Object.keys(skills?.marks ?? {}).length > 0;

  const pdf = async () => {
    setError('');
    setBusy(true);
    try {
      await downloadMonthlyReportPdf(`${student.firstName}-${month}-rapor.pdf`.toLocaleLowerCase('tr-TR').replace(/\s+/g, '-'), {
        clubName, studentName: name, monthName: monthName(month), lessonName, coachName,
        attendance: a.total ? [['Gelinen ders', String(a.came)], ['Gelinmeyen ders', String(a.missed)], ['İzinli', String(a.excused)], ['Devam oranı', a.percent === null ? '—' : `%${a.percent}`]] : [],
        results: r.results.map((x) => [event(x), x.kind === 'yaris' ? 'Yarış' : 'Antrenman', `${formatSwimTime(x.bestMs)} (${dateTr(x.date)})`, x.previousMs === null ? '—' : formatSwimTime(x.previousMs), diffText(x)]),
        skills: hasSkills ? [
          ['Bağımsız yapılan', `${r.skills.total} becerinin ${r.skills.independent} tanesi (%${r.skills.percent})`],
          ['Üzerinde çalışılan', r.skills.working.join(', ') || '—'],
          ['Sıradaki hedef', r.skills.next ?? 'Tüm beceriler tamam'],
        ] : [],
        comments: r.comments.map((c) => [dateTr(c.date), c.text]),
        payment: enrollment ? [
          ['Bu ay ödenen', money(r.payment.paidInMonthKurus)], ['Kalan borç', money(r.payment.remainingKurus)],
          ['Geciken', money(r.payment.overdueKurus)], ['Sonraki taksit', r.payment.next ? `${dateTr(r.payment.next.dueDate)} · ${money(r.payment.next.amountKurus)}` : 'Yok'],
        ] : [],
      });
    } catch {
      setError('Rapor PDF oluşturulamadı, tekrar deneyin.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="stack monthly-report">
      <div className="page-head">
        <h2>Aylık rapor</h2>
        <span className="form-actions">
          <select aria-label="Rapor ayı" value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m, i) => <option key={m} value={m}>{monthName(m)}{i === 0 ? ' (sürüyor)' : ''}</option>)}
          </select>
          <button onClick={pdf} disabled={busy}><FileDown size={15} />{busy ? 'Hazırlanıyor' : 'PDF indir'}</button>
        </span>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="stats three">
        <article><span>Devam oranı</span><strong>{a.percent === null ? '—' : `%${a.percent}`}</strong><small className="muted">{a.total ? `${a.came} geldi · ${a.missed} gelmedi · ${a.excused} izinli` : 'Yoklama yok'}</small></article>
        <article><span>Derece</span><strong>{r.results.length}</strong><small className="muted">{r.results.filter((x) => (x.diffMs ?? 0) < 0).length} branşta gelişme</small></article>
        <article><span>Bağımsız beceri</span><strong>{r.skills.independent}/{r.skills.total}</strong><small className="muted">{!hasSkills ? 'Henüz işaretlenmedi' : r.skills.next ? `Sıradaki: ${r.skills.next}` : 'Tamamlandı'}</small></article>
      </div>
      {r.results.length > 0 && <ul className="simple-list">{r.results.map((x) => (
        <li key={`${x.kind}-${x.stroke}-${x.distance}`} className="wrap-row"><span>{event(x)} · {x.kind === 'yaris' ? 'Yarış' : 'Antrenman'}<small>{dateTr(x.date)}{x.meet ? ` · ${x.meet}` : ''}{x.previousMs !== null ? ` · önceki en iyi ${formatSwimTime(x.previousMs)}` : ''}</small></span>
          <span className="form-actions"><strong className="mono">{formatSwimTime(x.bestMs)}</strong><em className={`badge ${x.diffMs === null ? '' : x.diffMs < 0 ? 'good' : x.diffMs > 0 ? 'warn' : ''}`}>{diffText(x)}</em></span></li>
      ))}</ul>}
      {r.comments.length > 0 && <div><h3>Antrenör yorumları</h3><ul className="simple-list">{r.comments.map((c, i) => <li key={i}><span>{c.text}<small>{dateTr(c.date)}</small></span></li>)}</ul></div>}
      {enrollment && <p className="muted">Bu ay ödenen {money(r.payment.paidInMonthKurus)} · kalan {money(r.payment.remainingKurus)}{r.payment.overdueKurus ? ` · geciken ${money(r.payment.overdueKurus)}` : ''}</p>}
    </div>
  );
}
