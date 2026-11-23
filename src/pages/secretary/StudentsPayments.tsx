import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { paymentSummary, toIso } from '../../lib/rules';
import { dateTr, money } from '../../lib/format';
import { downloadTablePdf } from '../../lib/pdf';
import type { Branch, Enrollment, Lesson, Student, User } from '../../lib/types';
import AttendanceReport from '../coach/AttendanceReport';

const STATUS = { odendi: ['Ödendi', 'good'], gecikti: ['Gecikti', 'bad'], bekliyor: ['Bekliyor', 'warn'] } as const;

export default function StudentsPayments() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const scope = { clubId };
  const students = useCollection<Student>('students', scope);
  const enrollments = useCollection<Enrollment>('enrollments', scope);
  const lessons = useCollection<Lesson>('lessons', scope);
  const branches = useCollection<Branch>('branches', scope);
  const users = useCollection<User>('users', scope);
  const [branchId, setBranchId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [method, setMethod] = useState('');
  const [error, setError] = useState('');
  const today = toIso(new Date());
  const methods = club?.paymentMethods ?? [];
  const payMethod = method || methods[0] || 'Nakit';

  const lessonOf = (s: Student) => lessons.find((l) => l.id === s.lessonId);
  const coachOf = (s: Student) => users.find((u) => u.id === s.coachId)?.name ?? '';
  const rows = students.filter((s) => (!branchId || lessonOf(s)?.branchId === branchId) && (!lessonId || s.lessonId === lessonId));

  const pay = (enrollment: Enrollment, no: number) => db.update('enrollments', enrollment.id, {
    installments: enrollment.installments.map((i) => (i.no === no ? { ...i, paidAt: today, method: payMethod } : i)),
  });

  const pdf = async () => {
    setError('');
    try {
      const scopeName = [branches.find((b) => b.id === branchId)?.name, lessons.find((l) => l.id === lessonId)?.name].filter(Boolean).join(' · ') || 'Tüm öğrenciler';
      await downloadTablePdf('ogrenci-listesi.pdf', `${club?.name} öğrenci listesi`, `${scopeName} · ${dateTr(today)}`, ['Ad', 'Soyad', 'Ders', 'Antrenör'],
        rows.map((s) => [s.firstName, s.lastName, lessonOf(s)?.name ?? '', coachOf(s)]));
    } catch {
      setError('PDF oluşturulamadı.');
    }
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Sekreter</p><h1>Öğrenciler</h1></div><button className="primary" onClick={pdf} disabled={!rows.length}><FileDown size={16} />PDF indir</button></header>
      {error && <p className="error" role="alert">{error}</p>}
      <section className="card form-grid">
        <label>Şube<select value={branchId} onChange={(e) => { setBranchId(e.target.value); setLessonId(''); }}><option value="">Tümü</option>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Ders saati<select value={lessonId} onChange={(e) => setLessonId(e.target.value)}><option value="">Tümü</option>{lessons.filter((l) => !branchId || l.branchId === branchId).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label>Tahsilat yöntemi<select value={payMethod} onChange={(e) => setMethod(e.target.value)}>{methods.map((m) => <option key={m}>{m}</option>)}</select></label>
      </section>
      <section className="card"><div className="table-wrap"><table>
        <thead><tr><th>Öğrenci</th><th>Ders</th><th>Antrenör</th><th>Toplam</th><th>Ödenen</th><th>Kalan</th><th>Sonraki vade</th><th>Durum</th><th /></tr></thead>
        <tbody>{rows.flatMap((s) => {
          const enrollment = enrollments.find((e) => e.studentId === s.id);
          const sum = enrollment ? paymentSummary(enrollment.installments, today) : null;
          const row = (
            <tr key={s.id}>
              <td>{s.firstName} {s.lastName}</td><td>{lessonOf(s)?.name}</td><td>{coachOf(s)}</td>
              <td>{sum ? money(sum.totalKurus) : '—'}</td><td>{sum ? money(sum.paidKurus) : '—'}</td><td>{sum ? money(sum.remainingKurus) : '—'}</td>
              <td>{sum?.next ? `${dateTr(sum.next.dueDate)} (${sum.daysToDue} gün)` : '—'}</td>
              <td>{sum ? <em className={`badge ${STATUS[sum.status][1]}`}>{STATUS[sum.status][0]}</em> : <em className="badge">Plan yok</em>}</td>
              <td>{enrollment && <button onClick={() => setOpen(open === s.id ? null : s.id)}>Taksitler</button>}</td>
            </tr>
          );
          if (open !== s.id || !enrollment) return [row];
          return [row, (
            <tr key={`${s.id}-plan`}><td colSpan={9}><ul className="simple-list">{enrollment.installments.map((i) => (
              <li key={i.no}>
                <span>{i.no}. taksit · {money(i.amountKurus)}<small>Vade {dateTr(i.dueDate)}{i.paidAt ? ` · ${dateTr(i.paidAt)} tarihinde ${i.method} ile ödendi` : ''}</small></span>
                {!i.paidAt && <button className="primary" onClick={() => pay(enrollment, i.no)}>Tahsil et</button>}
              </li>
            ))}</ul></td></tr>
          )];
        })}</tbody>
      </table></div></section>
      <AttendanceReport lessons={lessons.filter((l) => !branchId || l.branchId === branchId)} students={students} lessonId={lessonId || undefined} />
    </div>
  );
}
