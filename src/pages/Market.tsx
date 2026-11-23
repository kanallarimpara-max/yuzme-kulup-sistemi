import { useState, type FormEvent } from 'react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import { useSession } from '../lib/session';
import { db, useCollection, type Row } from '../lib/store';
import { ownScope } from '../lib/access';
import { money, toKurus } from '../lib/format';
import { buyProductWithCredits, uploadFile, useWallet, type Product } from '../lib/credits';
import type { User } from '../lib/types';

type Order = Row & { userId: string; productId: string; productName: string; pay: 'kredi' | 'tl'; credits: number; kurus: number; status: string };

const ORDER_STATUS = ['Ödeme bekliyor', 'Hazırlanıyor', 'Teslim edildi'];

export default function Market() {
  const { user } = useSession();
  const products = useCollection<Product>('products');
  const orders = useCollection<Order>('orders', ownScope(user, 'userId'));
  const users = useCollection<User>('users', user?.role === 'super' ? {} : { skip: true });
  const wallet = useWallet(user?.id);
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '', price: '', credits: 0 });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;
  const isSuper = user.role === 'super';
  const canUseCredits = user.role === 'coach';

  const add = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('products', { name: form.name.trim(), description: form.description.trim(), imageUrl: form.imageUrl, priceKurus: toKurus(form.price), priceCredits: form.credits });
    setForm({ name: '', description: '', imageUrl: '', price: '', credits: 0 });
  };
  const image = async (file?: File) => {
    if (!file) return;
    try {
      setError('');
      const imageUrl = await uploadFile(file);
      setForm((f) => ({ ...f, imageUrl }));
    } catch (err) {
      setError((err as Error).message);
    }
  };
  const buy = async (p: Product, pay: Order['pay']) => {
    setError('');
    setStatus('');
    try {
      if (pay === 'kredi') {
        if (wallet.available < p.priceCredits) return setError('Kredi bakiyen yetersiz.');
        await buyProductWithCredits(user.id, p);
      } else {
        await db.add('orders', { userId: user.id, productId: p.id, productName: p.name, pay, credits: 0, kurus: p.priceKurus, status: 'Ödeme bekliyor' });
      }
      setStatus(`${p.name} siparişin alındı.`);
    } catch {
      setError('Sipariş tamamlanamadı, bakiyeni kontrol edip tekrar dene.');
    }
  };

  const visibleOrders = (isSuper ? orders : orders.filter((o) => o.userId === user.id)).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Market</p><h1>{isSuper ? 'Market yönetimi' : 'Ürünler'}</h1></div>{canUseCredits && <span className="badge good">{wallet.available} kredi</span>}</header>
      {status && <p className="ok" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      {isSuper && (
        <form className="card form-grid" onSubmit={add}>
          <label>Ürün adı<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label>Açıklama<input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <label>Fotoğraf<input type="file" accept="image/*" onChange={(e) => image(e.target.files?.[0])} /></label>
          <label>Fiyat (TL)<input required inputMode="decimal" pattern="[0-9₺ ]+([.,][0-9]+)*" title="Örnek: 1.500 veya 1.500,50" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} /></label>
          <label>Kredi fiyatı<input type="number" min={0} value={form.credits} onChange={(e) => setForm({ ...form, credits: Number(e.target.value) })} /></label>
          <div className="form-actions"><button className="primary">Ürün ekle</button></div>
        </form>
      )}
      <section className="product-grid">{products.map((p) => (
        <article className="card product" key={p.id}>
          <div className="product-img">{p.imageUrl ? <img src={p.imageUrl} alt={p.name} /> : <ShoppingBag size={34} />}</div>
          <h2>{p.name}</h2><p className="muted">{p.description}</p>
          <strong>{money(p.priceKurus)}{p.priceCredits > 0 ? ` · ${p.priceCredits} kredi` : ''}</strong>
          {isSuper ? <button className="ghost" onClick={() => db.remove('products', p.id)}><Trash2 size={15} />Sil</button> : (
            <div className="form-actions">
              <button className="primary" onClick={() => buy(p, 'tl')}>Sipariş ver</button>
              {canUseCredits && p.priceCredits > 0 && <button onClick={() => buy(p, 'kredi')}>Krediyle al</button>}
            </div>
          )}
        </article>
      ))}</section>
      <section className="card"><h2>{isSuper ? 'Tüm siparişler' : 'Siparişlerim'}</h2>
        {visibleOrders.length === 0 ? <p className="muted">Henüz sipariş yok.</p> : <ul className="simple-list">{visibleOrders.map((o) => (
          <li key={o.id}><span>{o.productName}<small>{isSuper ? `${users.find((u) => u.id === o.userId)?.name} · ` : ''}{o.pay === 'kredi' ? `${o.credits} kredi` : money(o.kurus)}</small></span>{isSuper ? <select aria-label={`${o.productName} sipariş durumu`} className="auto" value={o.status} onChange={(e) => db.update('orders', o.id, { status: e.target.value })}>{[...new Set([o.status, ...ORDER_STATUS])].map((s) => <option key={s}>{s}</option>)}</select> : <em className="badge">{o.status}</em>}</li>
        ))}</ul>}
      </section>
    </div>
  );
}
