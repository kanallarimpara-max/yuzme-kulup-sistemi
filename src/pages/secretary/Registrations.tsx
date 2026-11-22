import { useMemo, useState, type FormEvent } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { applyDiscount, buildInstallments, toIso } from '../../lib/rules';
import { dateTr, dayNames, money } from '../../lib/format';
import type { Branch, Chat, DiscountCode, Lesson, PreReg, Student, TrainingModel, User } from '../../lib/types';

export default function Registrations() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const scope = { clubId };
  const preregs = useCollection<PreReg>('prereg', scope);
  const lessons = useCollection<Lesson>('lessons', scope);
  const branches = useCollection<Branch>('branches', scope);
  const models = useCollection<TrainingModel>('models', scope);
  const users = useCollection<User>('users', scope);
  const students = useCollection<Student>('students', scope);
  const discounts = useCollection<DiscountCode>('discounts', scope);
  const chats = useCollection<Chat>('chats', scope);
  const [current, setCurrent] = useState<PreReg | null>(null);
  const [branchId, setBranchId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [coachId, setCoachId] = useState('');
  const [code, setCode] = useState('');
  const [count, setCount] = useState(1);
  const [firstDue, setFirstDue] = useState(toIso(new Date()));
  const [status, setStatus] = useState('');

  const lesson = lessons.find((l) => l.id === lessonId);
  const options = lessons.filter((l) => l.branchId === branchId && (!current || l.modelId === current.modelId || !l.modelId));
  const taken = lesson ? students.filter((s) => s.lessonId === lesson.id).length : 0;
  const isFull = !!lesson && taken >= lesson.capacity;
  const discount = discounts.find((d) => d.active && d.code.toLocaleUpperCase('tr-TR') === code.trim().toLocaleUpperCase('tr-TR'));
  const net = lesson ? applyDiscount(lesson.feeKurus, discount) : 0;
  const plan = useMemo(() => buildInstallments(net, count, lesson?.interestPercent ?? 0, firstDue), [net, count, lesson?.interestPercent, firstDue]);

  const transfer = (p: PreReg) => {
    setCurrent(p);
    setBranchId(p.branchId);
    setLessonId('');
    setCoachId('');
    setCode('');
    setCount(1);
    setStatus('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!current || !lesson || !coachId || isFull) return;
    const studentId = await db.add('students', {
      clubId, parentId: current.parentId, lessonId: lesson.id, coachId, firstName: current.firstName, lastName: current.lastName,
      birthYear: current.birthYear, gender: current.gender,
    });
    await db.add('enrollments', {
      clubId, studentId, lessonId: lesson.id, coachId, listKurus: lesson.feeKurus, netKurus: net, totalKurus: plan.totalKurus,
      discountCode: discount?.code ?? '', installments: plan.installments,
    });
    await db.update('prereg', current.id, { status: 'kayitli' });

    // Ders ve antrenör için tek sohbet grubu tutulur, veli otomatik eklenir.
    const chatId = `lesson-${lesson.id}-${coachId}`;
    const chat = chats.find((c) => c.id === chatId);
    const memberIds = [...new Set([...(chat?.memberIds ?? [coachId]), current.parentId])];
    await db.put('chats', chatId, { clubId, name: lesson.name, lessonId: lesson.id, memberIds });

    setStatus(`${current.firstName} ${current.lastName} kaydedildi ve ders grubuna eklendi.`);
    setCurrent(null);
    setLessonId('');
  };

  const waiting = preregs.filter((p) => p.status === 'yeni');
  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Sekreter</p><h1>Kayıt ekranı</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      <section className="card">
        <h2>Bekleyen ön kayıtlar ({waiting.length})</h2>
        {waiting.length === 0 ? <p className="muted">Bekleyen başvuru yok.</p> : (
          <ul className="simple-list">{waiting.map((p) => (
            <li key={p.id}>
              <span><strong>{p.firstName} {p.lastName}</strong><small>{p.birthYear} · {models.find((m) => m.id === p.modelId)?.name} · {branches.find((b) => b.id === p.branchId)?.name} · Veli: {p.parentName} {p.parentPhone} · {p.paymentMethod}</small></span>
              <button className="primary" onClick={() => transfer(p)}>Forma aktar</button>
            </li>
          ))}</ul>
        )}
      </section>
      {current && (
        <form className="card stack" onSubmit={submit}>
          <h2>{current.firstName} {current.lastName} kaydı</h2>
          <div className="form-grid">
            <label>Şube<select required value={branchId} onChange={(e) => { setBranchId(e.target.value); setLessonId(''); setCoachId(''); }}>{branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
            <label>Ders saati<select required value={lessonId} onChange={(e) => {
              const next = lessons.find((l) => l.id === e.target.value);
              setLessonId(e.target.value);
              setCoachId(next?.coachIds.length === 1 ? next.coachIds[0] : '');
              setCount(1);
            }}><option value="">Seçin</option>{options.map((l) => <option key={l.id} value={l.id}>{l.name} · {dayNames(l.weekdays)} {l.startTime}</option>)}</select></label>
            <label>Antrenör<select required value={coachId} onChange={(e) => setCoachId(e.target.value)}><option value="">Seçin</option>{lesson?.coachIds.map((id) => <option key={id} value={id}>{users.find((u) => u.id === id)?.name}</option>)}</select></label>
            <label>İndirim kodu<input value={code} onChange={(e) => setCode(e.target.value)} /></label>
            <label>Taksit sayısı<input type="number" min={1} max={lesson?.maxInstallments ?? 1} value={count} onChange={(e) => setCount(Math.min(Math.max(1, Number(e.target.value)), lesson?.maxInstallments ?? 1))} /></label>
            <label>İlk vade<input type="date" required value={firstDue} onChange={(e) => setFirstDue(e.target.value)} /></label>
          </div>
          {code.trim() && <p className={discount ? 'ok' : 'error'}>{discount ? `${discount.code} uygulandı` : 'Geçersiz indirim kodu'}</p>}
          {isFull && <p className="error" role="alert">Bu ders saatinin kontenjanı dolu.</p>}
          {lesson && (
            <div className="table-wrap"><table>
              <thead><tr><th>Taksit</th><th>Vade</th><th>Tutar</th></tr></thead>
              <tbody>{plan.installments.map((i) => <tr key={i.no}><td>{i.no}</td><td>{dateTr(i.dueDate)}</td><td>{money(i.amountKurus)}</td></tr>)}</tbody>
              <tfoot><tr><th colSpan={2}>Liste {money(lesson.feeKurus)} · İndirimli {money(net)}</th><th>Toplam {money(plan.totalKurus)}</th></tr></tfoot>
            </table></div>
          )}
          <div className="form-actions"><button className="primary" disabled={!lesson || !coachId || isFull}>Kaydı tamamla</button><button type="button" onClick={() => setCurrent(null)}>Vazgeç</button></div>
        </form>
      )}
    </div>
  );
}
