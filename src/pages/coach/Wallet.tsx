import { useState, type FormEvent } from 'react';
import { useSession } from '../../lib/session';
import { db, useCollection } from '../../lib/store';
import { money } from '../../lib/format';
import { redeemKurus } from '../../lib/rules';
import { requestRedeem, uploadFile, useWallet, type CreditPackage, type PlatformSettings } from '../../lib/credits';

const STATUS = { bekliyor: ['Bekliyor', 'warn'], onaylandi: ['Onaylandı', 'good'], reddedildi: ['Reddedildi', 'bad'] } as const;

export default function Wallet() {
  const { user } = useSession();
  const wallet = useWallet(user?.id);
  const packages = useCollection<CreditPackage>('packages');
  const settings = useCollection<PlatformSettings>('settings')[0];
  const [pack, setPack] = useState<CreditPackage | null>(null);
  const [method, setMethod] = useState<'' | 'kart' | 'eft'>('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState<File | null>(null);
  const [amount, setAmount] = useState(0);
  const [payout, setPayout] = useState({ method: 'eft' as 'eft' | 'kripto', name: '', iban: '', wallet: '', network: '', coin: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!user) return null;

  const payoutKurus = settings ? redeemKurus(amount, settings.rateCredits, settings.rateKurus) : 0;
  const sendTopUp = async (e: FormEvent) => {
    e.preventDefault();
    if (!pack || !receipt) return setError('Dekont yüklemek zorunlu.');
    setBusy(true);
    setError('');
    try {
      const receiptUrl = await uploadFile(receipt);
      await db.add('creditRequests', { userId: user.id, type: 'yukleme', packageId: pack.id, credits: pack.credits, kurus: pack.priceKurus, note: note.trim(), receiptUrl, status: 'bekliyor' });
      setPack(null);
      setMethod('');
      setNote('');
      setReceipt(null);
      setStatus('Talebin süper admine iletildi.');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const sendRedeem = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (amount <= 0 || amount > wallet.available) return setError('Bozdurulacak miktar kullanılabilir bakiyeyi aşamaz.');
    const target = payout.method === 'eft'
      ? { method: 'eft' as const, name: payout.name.trim(), iban: payout.iban.trim() }
      : { method: 'kripto' as const, wallet: payout.wallet.trim(), network: payout.network.trim(), coin: payout.coin.trim() };
    try {
      await requestRedeem(user.id, amount, payoutKurus, target);
      setAmount(0);
      setStatus('Bozdurma talebin süper admine iletildi.');
    } catch {
      setError('Bozdurma talebi gönderilemedi, bakiyeni kontrol et.');
    }
  };

  const mine = wallet.requests.filter((r) => r.userId === user.id).sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Antrenör</p><h1>Kredilerim</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}
      <section className="stats three">
        <article><span>Bakiye</span><strong>{wallet.balance}</strong></article>
        <article><span>Bozdurmada bekleyen</span><strong>{wallet.held}</strong></article>
        <article><span>Kullanılabilir</span><strong>{wallet.available}</strong></article>
      </section>
      <section className="card stack">
        <h2>Kredi satın al</h2>
        <div className="product-grid">{packages.map((p) => (
          <button key={p.id} className={pack?.id === p.id ? 'package on' : 'package'} aria-pressed={pack?.id === p.id} onClick={() => { setPack(p); setMethod(''); setStatus(''); }}>
            <strong>{p.name}</strong><span>{p.credits} kredi</span><small>{money(p.priceKurus)}</small>
          </button>
        ))}</div>
        {pack && <div className="form-actions"><button onClick={() => setMethod('kart')}>Kredi kartı</button><button onClick={() => setMethod('kart')}>Banka kartı</button><button className="primary" onClick={() => setMethod('eft')}>EFT / Havale</button></div>}
        {method === 'kart' && <p className="muted" role="status">Bu özellik daha gelişim aşamasında.</p>}
        {packages.length === 0 && <p className="muted">Henüz kredi paketi tanımlanmadı.</p>}
        {pack && method === 'eft' && !settings && <p className="muted" role="status">EFT bilgileri henüz tanımlanmadı. Süper admin ekledikten sonra talep gönderebilirsin.</p>}
        {pack && method === 'eft' && settings && (
          <form className="stack" onSubmit={sendTopUp}>
            <div className="bank-box"><strong>Güncel EFT / Havale Bilgileri</strong><span>Banka: {settings.bank}</span><span>Hesap Sahibi: {settings.holder}</span><span>IBAN: {settings.iban}</span><span>Tutar: {money(pack.priceKurus)}</span></div>
            <label>Açıklama notu<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
            <label>Dekont *<input required type="file" accept="image/*,application/pdf" onChange={(e) => setReceipt(e.target.files?.[0] ?? null)} /></label>
            <div className="form-actions"><button className="primary" disabled={busy}>{busy ? 'Gönderiliyor…' : 'Talebi gönder'}</button></div>
          </form>
        )}
      </section>
      <form className="card stack" onSubmit={sendRedeem}>
        <h2>Kredi bozdur</h2>
        <p className="muted">{settings ? `Oran: ${settings.rateCredits} kredi = ${money(settings.rateKurus)}` : 'Bozdurma oranı henüz tanımlanmadı.'}</p>
        <div className="form-grid">
          <label>Bozdurulacak kredi<input type="number" min={1} max={wallet.available} required value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} /></label>
          <label>Alacağın tutar<input readOnly value={money(payoutKurus)} /></label>
          <label>Ödeme yöntemi<select value={payout.method} onChange={(e) => setPayout({ ...payout, method: e.target.value as 'eft' | 'kripto' })}><option value="eft">EFT</option><option value="kripto">Kripto</option></select></label>
          {payout.method === 'eft' ? <>
            <label>Ad soyad<input required value={payout.name} onChange={(e) => setPayout({ ...payout, name: e.target.value })} /></label>
            <label>IBAN<input required value={payout.iban} onChange={(e) => setPayout({ ...payout, iban: e.target.value })} /></label>
          </> : <>
            <label>Cüzdan adresi<input required value={payout.wallet} onChange={(e) => setPayout({ ...payout, wallet: e.target.value })} /></label>
            <label>Ağ<input required value={payout.network} onChange={(e) => setPayout({ ...payout, network: e.target.value })} /></label>
            <label>Koin<input required value={payout.coin} onChange={(e) => setPayout({ ...payout, coin: e.target.value })} /></label>
          </>}
        </div>
        <div className="form-actions"><button className="primary" disabled={!settings}>Kredi bozdur</button></div>
      </form>
      <section className="card"><h2>Taleplerim</h2>{mine.length === 0 ? <p className="muted">Henüz talep yok.</p> : <ul className="simple-list">{mine.map((r) => (
        <li key={r.id}><span>{r.type === 'yukleme' ? 'Yükleme' : 'Bozdurma'}<small>{r.credits} kredi · {money(r.kurus)}</small></span><em className={`badge ${STATUS[r.status][1]}`}>{STATUS[r.status][0]}</em></li>
      ))}</ul>}</section>
    </div>
  );
}
