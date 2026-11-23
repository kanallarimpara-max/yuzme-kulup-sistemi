import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { db, useCollection, type Row } from '../../lib/store';
import { dateTr, money, toKurus } from '../../lib/format';
import { toIso } from '../../lib/rules';
import { createStaffAccount } from '../../lib/session';
import { DEFAULT_DESIGN, type Ad, type AppDesign } from '../../lib/design';
import ImageField from '../../lib/ImageField';
import { preRegLink } from '../../lib/links';
import type { Club } from '../../lib/types';

type Sale = Row & { clubName: string; date: string; plan: string; amountKurus: number };

const slugOf = (name: string) => name.toLocaleLowerCase('tr-TR')
  .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export default function Platform() {
  const clubs = useCollection<Club>('clubs');
  const sales = useCollection<Sale>('sales');
  const ads = useCollection<Ad>('ads');
  const [sale, setSale] = useState({ clubName: '', date: toIso(new Date()), plan: 'Yıllık', amount: '' });
  const [ad, setAd] = useState({ title: '', imageUrl: '', linkUrl: '', slot: 'panel' });

  const saved = useCollection<AppDesign>('appDesign', { id: 'main' })[0];
  const [look, setLook] = useState<typeof DEFAULT_DESIGN | null>(null);
  const shownLook = look ?? { ...DEFAULT_DESIGN, ...saved };
  const [newClub, setNewClub] = useState({ name: '', adminName: '', email: '', password: '' });
  const [clubStatus, setClubStatus] = useState('');
  const [clubError, setClubError] = useState('');
  const [busy, setBusy] = useState(false);

  const addClub = async (e: FormEvent) => {
    e.preventDefault();
    setClubStatus('');
    setClubError('');
    const name = newClub.name.trim();
    const slug = slugOf(name);
    if (!slug) return setClubError('Kulüp adını kontrol edin.');
    if (clubs.some((c) => c.slug === slug)) return setClubError('Bu adla bir kulüp zaten var.');
    if (newClub.password.length < 8) return setClubError('Şifre en az 8 karakter olmalı.');
    setBusy(true);
    try {
      const clubId = await db.add('clubs', { name, slug, color: DEFAULT_DESIGN.accent, paymentMethods: ['Nakit', 'EFT/Havale'] });
      try {
        await createStaffAccount(clubId, newClub.adminName.trim(), newClub.email.trim(), newClub.password, 'admin');
      } catch (error) {
        // Yöneticisiz kulüp kalmasın.
        await db.remove('clubs', clubId);
        throw error;
      }
      setNewClub({ name: '', adminName: '', email: '', password: '' });
      setClubStatus(`${name} ve kulüp admini oluşturuldu. Ön kayıt adresi: ${preRegLink(slug)}`);
    } catch {
      setClubError('Kulüp açılamadı. E-posta kayıtlı olabilir.');
    } finally {
      setBusy(false);
    }
  };
  const saveLook = async (e: FormEvent) => {
    e.preventDefault();
    await db.put('appDesign', 'main', { ...shownLook, appName: shownLook.appName.trim() || DEFAULT_DESIGN.appName });
    setLook(null);
  };

  const addSale = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('sales', { clubName: sale.clubName.trim(), date: sale.date, plan: sale.plan, amountKurus: toKurus(sale.amount) });
    setSale({ ...sale, clubName: '', amount: '' });
  };
  const addAd = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('ads', { ...ad, title: ad.title.trim(), active: true });
    setAd({ title: '', imageUrl: '', linkUrl: '', slot: 'panel' });
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Süper admin</p><h1>Platform yönetimi</h1></div></header>
      <section className="stats">
        <article><span>Kulüp</span><strong>{clubs.length}</strong></article>
        <article><span>Satış</span><strong>{sales.length}</strong></article>
        <article><span>Toplam satış</span><strong className="fit">{money(sales.reduce((s, x) => s + x.amountKurus, 0))}</strong></article>
        <article><span>Aktif reklam</span><strong>{ads.filter((a) => a.active).length}</strong></article>
      </section>
      <section className="card stack">
        <h2>Yeni kulüp ve admin</h2>
        <form className="form-grid" onSubmit={addClub}>
          <label>Kulüp adı<input required value={newClub.name} onChange={(e) => setNewClub({ ...newClub, name: e.target.value })} /></label>
          <label>Admin adı soyadı<input required value={newClub.adminName} onChange={(e) => setNewClub({ ...newClub, adminName: e.target.value })} /></label>
          <label>Admin e-postası<input type="email" required autoComplete="off" value={newClub.email} onChange={(e) => setNewClub({ ...newClub, email: e.target.value })} /></label>
          <label>Geçici şifre<input type="password" required minLength={8} autoComplete="new-password" value={newClub.password} onChange={(e) => setNewClub({ ...newClub, password: e.target.value })} /></label>
          <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Açılıyor…' : 'Kulübü aç'}</button></div>
        </form>
        {clubStatus && <p className="ok" role="status">{clubStatus}</p>}
        {clubError && <p className="error" role="alert">{clubError}</p>}
        <ul className="simple-list">{clubs.map((c) => <li key={c.id}><span>{c.name}<small>{preRegLink(c.slug)}</small></span></li>)}</ul>
      </section>
      <section className="card stack">
        <h2>Uygulama tasarımı</h2>
        <form className="form-grid" onSubmit={saveLook}>
          <label>Uygulama adı<input required value={shownLook.appName} onChange={(e) => setLook({ ...shownLook, appName: e.target.value })} /></label>
          <ImageField label="Uygulama logosu" value={shownLook.logoUrl} onChange={(logoUrl) => setLook({ ...shownLook, logoUrl })} />
          <label>Vurgu rengi<input type="color" value={shownLook.accent} onChange={(e) => setLook({ ...shownLook, accent: e.target.value })} /></label>
          <label>Arka plan<input type="color" value={shownLook.background} onChange={(e) => setLook({ ...shownLook, background: e.target.value })} /></label>
          <label>Kart rengi<input type="color" value={shownLook.panel} onChange={(e) => setLook({ ...shownLook, panel: e.target.value })} /></label>
          <div className="form-actions"><button className="primary">Tasarımı kaydet</button><button type="button" onClick={() => setLook({ ...DEFAULT_DESIGN })}>Varsayılana dön</button></div>
        </form>
      </section>
      <section className="card stack">
        <h2>Kulüp satışları</h2>
        <form className="form-grid" onSubmit={addSale}>
          <label>Kulüp<input required value={sale.clubName} onChange={(e) => setSale({ ...sale, clubName: e.target.value })} /></label>
          <label>Satış tarihi<input type="date" required value={sale.date} onChange={(e) => setSale({ ...sale, date: e.target.value })} /></label>
          <label>Ödeme planı<select value={sale.plan} onChange={(e) => setSale({ ...sale, plan: e.target.value })}><option>Aylık</option><option>Yıllık</option><option>Taksitli</option></select></label>
          <label>Tutar (TL)<input required inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" value={sale.amount} onChange={(e) => setSale({ ...sale, amount: e.target.value })} /></label>
          <div className="form-actions"><button className="primary">Satış ekle</button></div>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Kulüp</th><th>Tarih</th><th>Plan</th><th>Tutar</th></tr></thead>
          <tbody>{sales.map((s) => <tr key={s.id}><td>{s.clubName}</td><td>{dateTr(s.date)}</td><td>{s.plan}</td><td>{money(s.amountKurus)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="card stack">
        <h2>Reklam alanları</h2>
        <form className="form-grid" onSubmit={addAd}>
          <label>Başlık<input required value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} /></label>
          <ImageField label="Reklam görseli" required value={ad.imageUrl} onChange={(imageUrl) => setAd({ ...ad, imageUrl })} />
          <label>Bağlantı<input type="url" value={ad.linkUrl} onChange={(e) => setAd({ ...ad, linkUrl: e.target.value })} /></label>
          <label>Alan<select value={ad.slot} onChange={(e) => setAd({ ...ad, slot: e.target.value })}><option value="panel">Panel</option><option value="market">Market</option><option value="sosyal">Sosyal</option></select></label>
          <div className="form-actions"><button className="primary">Reklam ekle</button></div>
        </form>
        <ul className="simple-list">{ads.map((a) => (
          <li key={a.id}><span>{a.title}<small>{a.slot}</small></span><span className="form-actions"><button onClick={() => db.update('ads', a.id, { active: !a.active })}>{a.active ? 'Yayından al' : 'Yayınla'}</button><button className="ghost icon" aria-label={`${a.title} reklamını sil`} onClick={() => db.remove('ads', a.id)}><Trash2 size={16} /></button></span></li>
        ))}</ul>
      </section>
    </div>
  );
}
