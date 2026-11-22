import { useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { db, useCollection, type Row } from '../../lib/store';
import { dateTr, money, toKurus } from '../../lib/format';
import { toIso } from '../../lib/rules';
import type { Club } from '../../lib/types';

type Sale = Row & { clubName: string; date: string; plan: string; amountKurus: number };
type Ad = Row & { title: string; imageUrl: string; linkUrl: string; slot: string; active: boolean };

export default function Platform() {
  const clubs = useCollection<Club>('clubs');
  const sales = useCollection<Sale>('sales');
  const ads = useCollection<Ad>('ads');
  const [sale, setSale] = useState({ clubName: '', date: toIso(new Date()), plan: 'Yıllık', amount: '' });
  const [ad, setAd] = useState({ title: '', imageUrl: '', linkUrl: '', slot: 'panel' });

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
        <h2>Kulüp satışları</h2>
        <form className="form-grid" onSubmit={addSale}>
          <label>Kulüp<input required value={sale.clubName} onChange={(e) => setSale({ ...sale, clubName: e.target.value })} /></label>
          <label>Satış tarihi<input type="date" required value={sale.date} onChange={(e) => setSale({ ...sale, date: e.target.value })} /></label>
          <label>Ödeme planı<select value={sale.plan} onChange={(e) => setSale({ ...sale, plan: e.target.value })}><option>Aylık</option><option>Yıllık</option><option>Taksitli</option></select></label>
          <label>Tutar (TL)<input required inputMode="decimal" value={sale.amount} onChange={(e) => setSale({ ...sale, amount: e.target.value })} /></label>
          <div className="form-actions"><button className="primary">Satış ekle</button></div>
        </form>
        <div className="table-wrap"><table><thead><tr><th>Kulüp</th><th>Tarih</th><th>Plan</th><th>Tutar</th></tr></thead>
          <tbody>{sales.map((s) => <tr key={s.id}><td>{s.clubName}</td><td>{dateTr(s.date)}</td><td>{s.plan}</td><td>{money(s.amountKurus)}</td></tr>)}</tbody></table></div>
      </section>
      <section className="card stack">
        <h2>Reklam alanları</h2>
        <form className="form-grid" onSubmit={addAd}>
          <label>Başlık<input required value={ad.title} onChange={(e) => setAd({ ...ad, title: e.target.value })} /></label>
          <label>Görsel adresi<input type="url" required value={ad.imageUrl} onChange={(e) => setAd({ ...ad, imageUrl: e.target.value })} /></label>
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
