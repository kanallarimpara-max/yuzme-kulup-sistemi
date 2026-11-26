import { useState } from 'react';
import { FileDown, History, Pencil } from 'lucide-react';
import { useConfirm } from '../../lib/confirm';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { paymentSummary, toIso } from '../../lib/rules';
import { dateTr, money } from '../../lib/format';
import { downloadTablePdf } from '../../lib/pdf';
import type { Branch, Enrollment, Lesson, PaymentLog, Student, User } from '../../lib/types';
import AttendanceReport from '../coach/AttendanceReport';

const STATUS = { odendi: ['Ödendi', 'good'], gecikti: ['Gecikti', 'bad'], bekliyor: ['Bekliyor', 'warn'] } as const;

export default function StudentsPayments() {
  const { club, user } = useSession();
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
  const [status, setStatus] = useState('');
  const [fix, setFix] = useState<{ enrollmentId: string; no: number; paidAt: string; method: string; reason: string; undo: boolean } | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  const today = toIso(new Date());
  const methods = club?.paymentMethods ?? [];
  const payMethod = method || methods[0] || 'Nakit';

  const lessonOf = (s: Student) => lessons.find((l) => l.id === s.lessonId);
  const coachOf = (s: Student) => users.find((u) => u.id === s.coachId)?.name ?? '';
  const rows = students.filter((s) => (!branchId || lessonOf(s)?.branchId === branchId) && (!lessonId || s.lessonId === lessonId));

  const log = (e: Enrollment, entry: Omit<PaymentLog, 'at' | 'byId' | 'byName'>): PaymentLog[] => [...(e.history ?? []), { ...entry, at: Date.now(), byId: user?.id ?? '', byName: user?.name ?? '' }];
  const nameOf = (id: string) => students.find((x) => x.id === id);
  // Tahsilat işlenir, geçmişe yazılır ve veliye makbuzunu indirebileceği bildirim gider.
  const pay = async (enrollment: Enrollment, no: number) => {
    const inst = enrollment.installments.find((i) => i.no === no);
    const kid = nameOf(enrollment.studentId);
    if (!inst || !(await confirm({ title: 'Tahsilat işlensin mi?', text: `${kid?.firstName ?? ''} ${kid?.lastName ?? ''} · ${no}. taksit · ${money(inst.amountKurus)} · ${payMethod}`, ok: 'Tahsil et' }))) return;
    await db.update('enrollments', enrollment.id, {
      installments: enrollment.installments.map((i) => (i.no === no ? { ...i, paidAt: today, method: payMethod } : i)),
      history: log(enrollment, { no, action: 'tahsilat', after: { paidAt: today, method: payMethod } }),
    });
    if (enrollment.parentId && user) {
      await db.add('notices', { clubId, senderId: user.id, kind: 'odeme', title: 'Ödemeniz alındı', recipientIds: [enrollment.parentId], readBy: [],
        body: `${kid?.firstName ?? 'Sporcu'} ${kid?.lastName ?? ''} · ${no}/${enrollment.installments.length}. taksit · ${money(inst.amountKurus)} (${payMethod}). Makbuzu Sporcularım ekranından indirebilirsiniz.` }).catch(() => undefined);
    }
    setStatus(`${no}. taksit tahsil edildi, veliye makbuz bildirimi gönderildi.`);
  };
  const saveFix = async () => {
    const e = enrollments.find((x) => x.id === fix?.enrollmentId);
    const inst = e?.installments.find((i) => i.no === fix?.no);
    if (!fix || !e || !inst) return;
    if (fix.reason.trim().length < 3) return setError('Düzeltmenin gerekçesini yazın.');
    if (!(await confirm({ title: fix.undo ? 'Tahsilat geri alınsın mı?' : 'Tahsilat düzeltilsin mi?', text: `${fix.no}. taksit · Gerekçe: ${fix.reason.trim()}. İlk işlem ve düzeltme geçmişte kalır.`, ok: 'Kaydet', danger: fix.undo }))) return;
    const after = fix.undo ? {} : { paidAt: fix.paidAt, method: fix.method };
    await db.update('enrollments', e.id, {
      installments: e.installments.map((i) => {
        if (i.no !== fix.no) return i;
        const { paidAt: _p, method: _m, ...rest } = i;
        return fix.undo ? rest : { ...rest, ...after };
      }),
      history: log(e, { no: fix.no, action: fix.undo ? 'iptal' : 'duzeltme', reason: fix.reason.trim().slice(0, 300), before: { paidAt: inst.paidAt, method: inst.method }, after }),
    });
    setFix(null);
    setError('');
    setStatus('Düzeltme kaydedildi.');
  };

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
      {status && <p className="ok" role="status">{status}</p>}
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
              <li key={i.no} className="wrap-row">
                <span>{i.no}. taksit · {money(i.amountKurus)}<small>Vade {dateTr(i.dueDate)}{i.paidAt ? ` · ${dateTr(i.paidAt)} tarihinde ${i.method} ile ödendi` : ''}{(enrollment.history ?? []).some((h) => h.no === i.no && h.action !== 'tahsilat') ? ' · düzeltildi' : ''}</small></span>
                {!i.paidAt && <button className="primary" onClick={() => pay(enrollment, i.no)}>Tahsil et</button>}
                {i.paidAt && fix?.enrollmentId !== enrollment.id && <button onClick={() => setFix({ enrollmentId: enrollment.id, no: i.no, paidAt: i.paidAt!, method: i.method ?? payMethod, reason: '', undo: false })}><Pencil size={15} />Düzelt</button>}
                {fix?.enrollmentId === enrollment.id && fix.no === i.no && <div className="fix-box stack">
                  <label className="check"><input type="checkbox" checked={fix.undo} onChange={(e) => setFix({ ...fix, undo: e.target.checked })} /><span>Bu tahsilat hatalı, ödenmedi olarak geri al</span></label>
                  {!fix.undo && <div className="form-grid">
                    <label>Ödeme tarihi<input type="date" value={fix.paidAt} onChange={(e) => setFix({ ...fix, paidAt: e.target.value })} /></label>
                    <label>Yöntem<select value={fix.method} onChange={(e) => setFix({ ...fix, method: e.target.value })}>{[...new Set([...methods, fix.method])].map((m) => <option key={m}>{m}</option>)}</select></label>
                  </div>}
                  <label>Gerekçe *<input required maxLength={300} placeholder="Örnek: Kardeşin taksitine yanlış işlendi" value={fix.reason} onChange={(e) => setFix({ ...fix, reason: e.target.value })} /></label>
                  <div className="form-actions"><button className="primary" onClick={saveFix}>Düzeltmeyi kaydet</button><button onClick={() => setFix(null)}>Vazgeç</button></div>
                </div>}
              </li>
            ))}</ul>
            {(enrollment.history ?? []).length > 0 && <details className="pay-history"><summary><History size={15} /> İşlem geçmişi ({enrollment.history!.length})</summary>
              <ul className="simple-list">{[...enrollment.history!].reverse().map((h, k) => <li key={k}><span>{h.no}. taksit · {h.action === 'tahsilat' ? 'Tahsilat' : h.action === 'iptal' ? 'Tahsilat geri alındı' : 'Düzeltme'}
                <small>{new Date(h.at).toLocaleString('tr-TR')} · {h.byName}{h.before?.paidAt ? ` · önce: ${dateTr(h.before.paidAt)} ${h.before.method ?? ''}` : ''}{h.after?.paidAt ? ` · sonra: ${dateTr(h.after.paidAt)} ${h.after.method ?? ''}` : ''}{h.reason ? ` · Gerekçe: ${h.reason}` : ''}</small></span></li>)}</ul>
            </details>}</td></tr>
          )];
        })}</tbody>
      </table></div></section>
      <AttendanceReport lessons={lessons.filter((l) => !branchId || l.branchId === branchId)} students={students} lessonId={lessonId || undefined} />
      {confirmDialog}
    </div>
  );
}
