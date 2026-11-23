import { useState, type FormEvent } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection, type Row } from '../../lib/store';
import { postCredit, useWallet } from '../../lib/credits';
import type { User, Workout } from '../../lib/types';

// İlan belgesinde setler bulunmaz. Alıcı setleri yalnız satın aldıktan sonra görür.
type Listing = Row & { sellerId: string; workoutId: string; title: string; description: string; priceCredits: number; setCount: number; meters: number };
type Purchase = Row & { buyerId: string; listingId: string };

export default function WorkoutStore() {
  const { user } = useSession();
  const workouts = useCollection<Workout>('workouts', user?.clubId ? { clubId: user.clubId } : { skip: true });
  const listings = useCollection<Listing>('listings');
  const purchases = useCollection<Purchase>('purchases', user ? { eq: ['buyerId', user.id] } : { skip: true });
  const users = useCollection<User>('users');
  const wallet = useWallet(user?.id);
  const [form, setForm] = useState({ workoutId: '', description: '', price: 100 });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  if (!user) return null;

  const mine = workouts.filter((w) => w.coachId === user.id);
  const publish = async (e: FormEvent) => {
    e.preventDefault();
    const w = mine.find((x) => x.id === form.workoutId);
    if (!w || form.price < 1) return;
    await db.add('listings', { sellerId: user.id, workoutId: w.id, title: w.title, description: form.description.trim(), priceCredits: form.price, setCount: w.sets.length, meters: w.sets.reduce((s, x) => s + x.reps * x.distance, 0) });
    setForm({ workoutId: '', description: '', price: 100 });
    setStatus('Antrenman satışa çıkarıldı.');
  };
  const buy = async (l: Listing) => {
    setError('');
    setStatus('');
    if (purchases.some((p) => p.buyerId === user.id && p.listingId === l.id)) return setError('Bu antrenmanı zaten aldın.');
    if (wallet.available < l.priceCredits) return setError('Kredi bakiyen yetersiz.');
    const source = workouts.find((w) => w.id === l.workoutId);
    if (!source) return setError('Antrenman artık mevcut değil.');
    await postCredit(user.id, -l.priceCredits, `Antrenman alımı: ${l.title}`);
    await postCredit(l.sellerId, l.priceCredits, `Antrenman satışı: ${l.title}`);
    await db.add('purchases', { buyerId: user.id, listingId: l.id });
    await db.add('workouts', { clubId: user.clubId, coachId: user.id, title: `${l.title} (satın alındı)`, sets: source.sets, description: l.description });
    setStatus(`${l.title} antrenmanlarına eklendi.`);
  };

  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Antrenör</p><h1>Antrenman pazarı</h1></div><span className="badge good">{wallet.available} kredi</span></header>
      {status && <p className="ok" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <form className="card form-grid" onSubmit={publish}>
        <label>Antrenmanım<select required value={form.workoutId} onChange={(e) => setForm({ ...form, workoutId: e.target.value })}><option value="">Seçin</option>{mine.map((w) => <option key={w.id} value={w.id}>{w.title}</option>)}</select></label>
        <label>Satış açıklaması<input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
        <label>Kredi fiyatı<input type="number" min={1} required value={form.price} onChange={(e) => setForm({ ...form, price: Number(e.target.value) })} /></label>
        <div className="form-actions"><button className="primary">Satışa çıkar</button></div>
      </form>
      <section className="product-grid">{listings.map((l) => {
        const own = l.sellerId === user.id;
        const bought = purchases.some((p) => p.buyerId === user.id && p.listingId === l.id);
        return (
          <article className="card product" key={l.id}>
            <h2>{l.title}</h2><p className="muted">{l.description}</p>
            <small>{users.find((u) => u.id === l.sellerId)?.name} · {l.setCount} set · {l.meters} m</small>
            <strong>{l.priceCredits} kredi</strong>
            {own ? <button onClick={() => db.remove('listings', l.id)}>Satıştan kaldır</button> : <button className="primary" disabled={bought} onClick={() => buy(l)}>{bought ? 'Satın alındı' : 'Satın al'}</button>}
          </article>
        );
      })}</section>
    </div>
  );
}
