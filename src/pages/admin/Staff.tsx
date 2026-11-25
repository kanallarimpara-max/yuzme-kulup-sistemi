import { useState, type FormEvent } from 'react';
import { PasswordInput } from '../../lib/PasswordInput';
import { Pencil, Trash2 } from 'lucide-react';
import { accountError, validEmail } from '../../lib/format';
import { useConfirm } from '../../lib/confirm';
import { useSession, createStaffAccount } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { ROLE_LABEL, type Branch, type DiscountCode, type User } from '../../lib/types';

const METHODS = ['Kredi kartı', 'Nakit', 'EFT / Havale'];

export default function Staff() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const users = useCollection<User>('users', { clubId });
  const discounts = useCollection<DiscountCode>('discounts', { clubId });
  const branches = useCollection<Branch>('branches', { clubId });
  const [person, setPerson] = useState({ name: '', email: '', password: '', role: 'coach' as 'coach' | 'secretary' });
  const [code, setCode] = useState({ code: '', type: 'percent' as 'percent' | 'amount', value: 10 });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: string; name: string; role: 'coach' | 'secretary' } | null>(null);
  const [confirmDialog, confirm] = useConfirm();
  if (!club) return null;
  const staff = users.filter((u) => u.role === 'coach' || u.role === 'secretary');
  const methods = club.paymentMethods ?? [];

  const addPerson = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!validEmail(person.email)) return setError('Geçerli bir e-posta adresi yaz (örnek: ad@ornek.com).');
    if (person.password.length < 8) return setError('Geçici şifre en az 8 karakter olmalı.');
    try {
      await createStaffAccount(clubId, person.name.trim(), person.email.trim(), person.password, person.role);
      setPerson({ name: '', email: '', password: '', role: person.role });
      setStatus('Personel eklendi. İlk girişte kendi şifresini belirlemesi önerilecek.');
    } catch (err) {
      setError(accountError(err) || 'Personel eklenemedi. Tekrar dene.');
    }
  };
  const toggleBranch = (u: User, branchId: string) => db.update('users', u.id, {
    branchIds: u.branchIds?.includes(branchId) ? u.branchIds.filter((b) => b !== branchId) : [...(u.branchIds ?? []), branchId],
  });
  const removeStaff = async (u: User) => {
    if (!(await confirm({ title: `${u.name} kulüpten çıkarılsın mı?`, text: 'Sisteme erişimi hemen kapanır. Bu işlem geri alınamaz.', ok: 'Evet, çıkar', danger: true }))) return;
    try {
      setError('');
      await db.remove('users', u.id);
      setStatus(`${u.name} kulüpten çıkarıldı.`);
    } catch {
      setError('Personel çıkarılamadı.');
    }
  };
  const saveEdit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || !editing.name.trim()) return;
    try {
      setError('');
      await db.update('users', editing.id, { name: editing.name.trim().slice(0, 100), role: editing.role });
      setEditing(null);
      setStatus('Personel bilgileri güncellendi.');
    } catch {
      setError('Personel güncellenemedi.');
    }
  };
  const addCode = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    const normalized = code.code.trim().toLocaleUpperCase('tr-TR');
    if (discounts.some((d) => d.code === normalized)) return setError('Bu indirim kodu zaten var.');
    if (code.value <= 0 || (code.type === 'percent' && code.value > 100)) return setError('İndirim değeri geçersiz.');
    await db.add('discounts', { clubId, code: normalized, type: code.type, value: code.type === 'amount' ? Math.round(code.value * 100) : code.value, active: true });
    setCode({ code: '', type: 'percent', value: 10 });
    setStatus('İndirim kodu oluşturuldu.');
  };
  const toggleMethod = (m: string) => db.update('clubs', club.id, { paymentMethods: methods.includes(m) ? methods.filter((x) => x !== m) : [...methods, m] });

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Kulüp yönetimi</p><h1>Personel ve kayıt ayarları</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="two-col">
        <form className="card stack" onSubmit={addPerson}><h2>Antrenör veya sekreter ata</h2>
          <label>Ad soyad<input required value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} /></label>
          <label>E-posta<input required type="email" autoComplete="off" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} /></label>
          <label>Geçici şifre<PasswordInput required autoComplete="new-password" minLength={8} value={person.password} onChange={(e) => setPerson({ ...person, password: e.target.value })} /></label>
          <label>Rol<select value={person.role} onChange={(e) => setPerson({ ...person, role: e.target.value as 'coach' | 'secretary' })}><option value="coach">Antrenör</option><option value="secretary">Sekreter</option></select></label>
          <button className="primary">Personel ekle</button>
          <ul className="simple-list">{staff.map((u) => editing?.id === u.id ? <li key={u.id} className="wrap-row edit-row">
            <span className="stack">
              <label>Ad soyad<input required maxLength={100} value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} /></label>
              <label>Rol<select value={editing.role} onChange={(e) => setEditing({ ...editing, role: e.target.value as 'coach' | 'secretary' })}><option value="coach">Antrenör</option><option value="secretary">Sekreter</option></select></label>
              <small className="muted">Giriş e-postası güvenlik nedeniyle buradan değiştirilemez; gerekirse destekle iletişime geç.</small>
              <span className="form-actions"><button type="button" className="primary" onClick={saveEdit}>Kaydet</button><button type="button" onClick={() => setEditing(null)}>Vazgeç</button></span>
            </span>
          </li> : <li key={u.id} className="wrap-row"><span>{u.name}<small>{ROLE_LABEL[u.role]} · {u.tag}</small>
            {u.role === 'coach' && <span className="chips">{branches.map((b) => <button type="button" key={b.id} className={u.branchIds?.includes(b.id) ? 'chip on' : 'chip'} aria-pressed={!!u.branchIds?.includes(b.id)} onClick={() => toggleBranch(u, b.id)}>{b.name}</button>)}</span>}</span>
            <span className="row-actions"><button type="button" className="ghost icon" aria-label={`${u.name} bilgilerini düzenle`} title="Düzenle" onClick={() => setEditing({ id: u.id, name: u.name, role: u.role as 'coach' | 'secretary' })}><Pencil size={16} /></button>
            <button type="button" className="ghost icon" aria-label={`${u.name} kişisini kulüpten çıkar`} title="Kulüpten çıkar" onClick={() => removeStaff(u)}><Trash2 size={16} /></button></span></li>)}</ul>
        </form>
        <section className="stack">
          <form className="card stack" onSubmit={addCode}><h2>İndirim kodları</h2>
            <div className="form-grid">
              <label>Kod<input required value={code.code} onChange={(e) => setCode({ ...code, code: e.target.value })} /></label>
              <label>Tür<select value={code.type} onChange={(e) => setCode({ ...code, type: e.target.value as 'percent' | 'amount' })}><option value="percent">Yüzde</option><option value="amount">Tutar (TL)</option></select></label>
              <label>Değer<input type="number" min={0.01} step="0.01" value={code.value} onChange={(e) => setCode({ ...code, value: Number(e.target.value) })} /></label>
            </div>
            <button className="primary">Kod oluştur</button>
            <ul className="simple-list">{discounts.map((d) => <li key={d.id}><span>{d.code}<small>{d.type === 'percent' ? `%${d.value}` : `${d.value / 100} TL`} · {d.active ? 'Aktif' : 'Kapalı'}</small></span><span className="form-actions"><button onClick={(e) => { e.preventDefault(); db.update('discounts', d.id, { active: !d.active }); }}>{d.active ? 'Kapat' : 'Aç'}</button><button type="button" className="ghost icon" aria-label={`${d.code} kodunu sil`} onClick={async () => { if (await confirm({ title: `${d.code} kodu silinsin mi?`, text: 'Bu işlem geri alınamaz.', ok: 'Evet, sil', danger: true })) await db.remove('discounts', d.id); }}><Trash2 size={16} /></button></span></li>)}</ul>
          </form>
          <section className="card"><h2>Ön kayıt ödeme tercihleri</h2><div className="chips">{METHODS.map((m) => <button key={m} className={methods.includes(m) ? 'chip on' : 'chip'} aria-pressed={methods.includes(m)} onClick={() => toggleMethod(m)}>{m}</button>)}</div></section>
        </section>
      </div>
      {confirmDialog}
    </div>
  );
}
