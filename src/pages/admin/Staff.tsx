import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useSession, createStaffAccount } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { ROLE_LABEL, type DiscountCode, type User } from '../../lib/types';

const METHODS = ['Kredi kartı', 'Nakit', 'EFT / Havale'];

export default function Staff() {
  const { club } = useSession();
  const clubId = club?.id ?? '';
  const users = useCollection<User>('users', { clubId });
  const discounts = useCollection<DiscountCode>('discounts', { clubId });
  const [person, setPerson] = useState({ name: '', email: '', password: '', role: 'coach' as 'coach' | 'secretary' });
  const [code, setCode] = useState({ code: '', type: 'percent' as 'percent' | 'amount', value: 10 });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  if (!club) return null;
  const staff = users.filter((u) => u.role === 'coach' || u.role === 'secretary');
  const methods = club.paymentMethods ?? [];

  const addPerson = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (person.password.length < 8) return setError('Geçici şifre en az 8 karakter olmalı.');
    try {
      await createStaffAccount(clubId, person.name.trim(), person.email.trim(), person.password, person.role);
      setPerson({ name: '', email: '', password: '', role: person.role });
      setStatus('Personel eklendi.');
    } catch {
      setError('Personel eklenemedi. E-posta kullanımda olabilir.');
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
          <label>Geçici şifre<input required type="password" autoComplete="new-password" minLength={8} value={person.password} onChange={(e) => setPerson({ ...person, password: e.target.value })} /></label>
          <label>Rol<select value={person.role} onChange={(e) => setPerson({ ...person, role: e.target.value as 'coach' | 'secretary' })}><option value="coach">Antrenör</option><option value="secretary">Sekreter</option></select></label>
          <button className="primary">Personel ekle</button>
          <ul className="simple-list">{staff.map((u) => <li key={u.id}><span>{u.name}<small>{ROLE_LABEL[u.role]} · {u.tag}</small></span></li>)}</ul>
        </form>
        <section className="stack">
          <form className="card stack" onSubmit={addCode}><h2>İndirim kodları</h2>
            <div className="form-grid">
              <label>Kod<input required value={code.code} onChange={(e) => setCode({ ...code, code: e.target.value })} /></label>
              <label>Tür<select value={code.type} onChange={(e) => setCode({ ...code, type: e.target.value as 'percent' | 'amount' })}><option value="percent">Yüzde</option><option value="amount">Tutar (TL)</option></select></label>
              <label>Değer<input type="number" min={0.01} step="0.01" value={code.value} onChange={(e) => setCode({ ...code, value: Number(e.target.value) })} /></label>
            </div>
            <button className="primary">Kod oluştur</button>
            <ul className="simple-list">{discounts.map((d) => <li key={d.id}><span>{d.code}<small>{d.type === 'percent' ? `%${d.value}` : `${d.value / 100} TL`} · {d.active ? 'Aktif' : 'Kapalı'}</small></span><span className="form-actions"><button onClick={(e) => { e.preventDefault(); db.update('discounts', d.id, { active: !d.active }); }}>{d.active ? 'Kapat' : 'Aç'}</button><button type="button" className="ghost icon" aria-label={`${d.code} kodunu sil`} onClick={() => db.remove('discounts', d.id)}><Trash2 size={16} /></button></span></li>)}</ul>
          </form>
          <section className="card"><h2>Ön kayıt ödeme tercihleri</h2><div className="chips">{METHODS.map((m) => <button key={m} className={methods.includes(m) ? 'chip on' : 'chip'} aria-pressed={methods.includes(m)} onClick={() => toggleMethod(m)}>{m}</button>)}</div></section>
        </section>
      </div>
    </div>
  );
}
