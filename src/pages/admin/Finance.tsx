import { useMemo, useState, type FormEvent } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Trash2 } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { financeSummary, toIso } from '../../lib/rules';
import { dateTr, money, toKurus } from '../../lib/format';
import type { Enrollment, Expense, Lesson, LessonPay, SalaryPayment, Student, User } from '../../lib/types';

export default function Finance() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const scope = { clubId };
  const enrollments = useCollection<Enrollment>('enrollments', scope);
  const expenses = useCollection<Expense>('expenses', scope);
  const salaries = useCollection<SalaryPayment>('salaries', scope);
  const lessons = useCollection<Lesson>('lessons', scope);
  const pay = useCollection<LessonPay>('lessonPay', scope);
  const students = useCollection<Student>('students', scope);
  const users = useCollection<User>('users', scope);
  const coaches = users.filter((u) => u.role === 'coach');
  const [expense, setExpense] = useState({ title: '', category: 'Havuz kirası', date: toIso(new Date()), amount: '' });
  const [salary, setSalary] = useState({ coachId: '', date: toIso(new Date()), amount: '' });
  const f = useMemo(() => financeSummary({ plans: enrollments, expenses, salaries }), [enrollments, expenses, salaries]);
  const expected = lessons.reduce((s, l) => s + l.feeKurus * students.filter((x) => x.lessonId === l.id).length, 0);
  const chart = f.monthly.map((m) => ({ month: m.month, Tahsilat: m.collected / 100, Gider: m.expense / 100 }));

  const addExpense = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('expenses', { clubId, title: expense.title.trim(), category: expense.category, date: expense.date, amountKurus: toKurus(expense.amount) });
    setExpense({ ...expense, title: '', amount: '' });
  };
  const addSalary = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('salaries', { clubId, coachId: salary.coachId, date: salary.date, amountKurus: toKurus(salary.amount) });
    setSalary({ ...salary, amount: '' });
  };
  const owed = (coachId: string) => pay.filter((l) => l.coachIds.includes(coachId)).reduce((s, l) => s + l.coachPayKurus, 0);
  const paid = (coachId: string) => salaries.filter((s) => s.coachId === coachId).reduce((t, s) => t + s.amountKurus, 0);

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Kulüp yönetimi</p><h1>Gelir gider</h1></div></header>
      <section className="stats finance">
        <article><span>Ciro</span><strong className="fit">{money(f.revenueKurus)}</strong></article>
        <article><span>Tahsil edilen</span><strong className="fit">{money(f.collectedKurus)}</strong></article>
        <article><span>Tahsil edilecek</span><strong className="fit">{money(f.receivableKurus)}</strong></article>
        <article><span>Gider</span><strong className="fit">{money(f.expenseKurus)}</strong></article>
        <article><span>Ödenen maaş</span><strong className="fit">{money(f.salaryKurus)}</strong></article>
        <article><span>Net kâr</span><strong className="fit">{money(f.profitKurus)}</strong></article>
        <article><span>Öğrenci sayısına göre gelir</span><strong className="fit">{money(expected)}</strong></article>
      </section>
      <section className="card"><h2>Aylık tahsilat ve gider</h2>
        {chart.length === 0 ? <p className="muted">Henüz finans hareketi yok.</p> : <div className="chart"><ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart}><CartesianGrid stroke="#24445f" vertical={false} /><XAxis dataKey="month" stroke="#9db4c5" fontSize={12} /><YAxis stroke="#9db4c5" fontSize={12} width={64} /><Tooltip formatter={(v) => money(Number(v) * 100)} contentStyle={{ background: '#0e2439', border: '1px solid #24445f' }} /><Legend /><Bar dataKey="Tahsilat" fill="#27c4d8" radius={[4, 4, 0, 0]} /><Bar dataKey="Gider" fill="#f28c1e" radius={[4, 4, 0, 0]} /></BarChart>
        </ResponsiveContainer></div>}
      </section>
      <div className="two-col">
        <form className="card stack" onSubmit={addExpense}><h2>Gider ekle</h2>
          <label>Açıklama<input required value={expense.title} onChange={(e) => setExpense({ ...expense, title: e.target.value })} /></label>
          <div className="form-grid">
            <label>Kategori<select value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.target.value })}>{['Havuz kirası', 'Malzeme', 'Personel', 'Ulaşım', 'Yarış', 'Diğer'].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label>Tarih<input type="date" required value={expense.date} onChange={(e) => setExpense({ ...expense, date: e.target.value })} /></label>
            <label>Tutar (TL)<input required inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.target.value })} /></label>
          </div><button className="primary">Gider ekle</button>
        </form>
        <form className="card stack" onSubmit={addSalary}><h2>Maaş ödemesi</h2>
          <label>Antrenör<select required value={salary.coachId} onChange={(e) => setSalary({ ...salary, coachId: e.target.value })}><option value="">Seçin</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <div className="form-grid">
            <label>Tarih<input type="date" required value={salary.date} onChange={(e) => setSalary({ ...salary, date: e.target.value })} /></label>
            <label>Tutar (TL)<input required inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" value={salary.amount} onChange={(e) => setSalary({ ...salary, amount: e.target.value })} /></label>
          </div><button className="primary">Ödemeyi kaydet</button>
        </form>
      </div>
      <section className="card"><h2>Antrenör maaş durumu</h2><div className="table-wrap"><table><thead><tr><th>Antrenör</th><th>Toplam</th><th>Ödenen</th><th>Kalan</th></tr></thead>
        <tbody>{coaches.map((c) => <tr key={c.id}><td>{c.name}</td><td>{money(owed(c.id))}</td><td>{money(paid(c.id))}</td><td>{money(owed(c.id) - paid(c.id))}</td></tr>)}</tbody></table></div></section>
      <section className="card"><h2>Giderler</h2><ul className="simple-list">{expenses.map((x) => <li key={x.id}><span>{x.title}<small>{x.category} · {dateTr(x.date)} · {money(x.amountKurus)}</small></span><button className="ghost icon" aria-label={`${x.title} giderini sil`} onClick={() => db.remove('expenses', x.id)}><Trash2 size={16} /></button></li>)}</ul></section>
    </div>
  );
}
