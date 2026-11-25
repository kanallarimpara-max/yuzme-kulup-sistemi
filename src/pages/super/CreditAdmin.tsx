import { useEffect, useState, type FormEvent } from 'react';
import { Trash2 } from 'lucide-react';
import { useSession } from '../../lib/session';
import { db, firebaseEnabled, useCollection } from '../../lib/store';
import { money } from '../../lib/format';
import { useConfirm } from '../../lib/confirm';
import { adjustCredit, creditsToKurus, settleRequest, walletNumbers, type CreditPackage, type CreditRequest, type PlatformSettings, type WalletRow } from '../../lib/credits';
import type { Notice, User } from '../../lib/types';

export default function CreditAdmin() {
  const { user } = useSession();
  const users = useCollection<User>('users');
  const wallets = useCollection<WalletRow>('wallets');
  const numbersOf = (id: string) => walletNumbers(wallets.find((w) => w.id === id));
  const requests = useCollection<CreditRequest>('creditRequests');
  const packages = useCollection<CreditPackage>('packages');
  const settings = useCollection<PlatformSettings>('settings')[0];
  const [form, setForm] = useState({ bank: '', holder: '', iban: '' });
  const [pack, setPack] = useState({ name: '', credits: 500 });
  const [confirmDialog, confirm] = useConfirm();
  const [manual, setManual] = useState({ userId: '', amount: 100, reason: '' });
  const [status, setStatus] = useState('');
  const coaches = users.filter((u) => u.role === 'coach');

  useEffect(() => {
    if (settings) setForm({ bank: settings.bank, holder: settings.holder, iban: settings.iban });
  }, [settings?.id]);

  const tell = (target: User | undefined, title: string, body: string) => target?.clubId && user
    ? db.add('notices', { clubId: target.clubId, senderId: user.id, kind: 'duyuru', title, body, recipientIds: [target.id], readBy: [] } satisfies Omit<Notice, 'id'>)
    : undefined;

  const decide = async (r: CreditRequest, approve: boolean) => {
    const owner = users.find((u) => u.id === r.userId);
    if (approve && r.type === 'bozdurma' && numbersOf(r.userId).balance < r.credits) {
      setStatus('Bakiye yetersiz, talep onaylanamaz.');
      return;
    }
    await settleRequest(r, approve);
    const label = r.type === 'yukleme' ? 'Kredi yüklemeniz' : 'Kredi bozdurma talebiniz';
    await tell(owner, approve ? (r.type === 'yukleme' ? 'Krediniz yüklendi' : 'Krediniz bozuldu') : `${label} reddedildi`, `${r.credits} kredi · ${money(r.kurus)}`);
    setStatus('Talep güncellendi.');
  };

  const saveSettings = async (e: FormEvent) => {
    e.preventDefault();
    // Oran sabittir: 1 kredi = 1 TL.
    await db.put('settings', 'platform', { bank: form.bank, holder: form.holder, iban: form.iban, rateCredits: 1, rateKurus: creditsToKurus(1) });
    setStatus('Ödeme ayarları kaydedildi.');
  };
  const addPack = async (e: FormEvent) => {
    e.preventDefault();
    await db.add('packages', { name: pack.name.trim(), credits: pack.credits, priceKurus: creditsToKurus(pack.credits) });
    setPack({ name: '', credits: 500 });
  };
  const adjust = async (sign: 1 | -1) => {
    if (!manual.userId || manual.amount <= 0) return;
    const who = users.find((u) => u.id === manual.userId)?.name ?? 'Antrenör';
    if (!(await confirm({ title: sign > 0 ? 'Kredi eklensin mi?' : 'Kredi silinsin mi?', text: `${who} · ${manual.amount} kredi (${money(creditsToKurus(manual.amount))})`, ok: sign > 0 ? 'Evet, ekle' : 'Evet, sil', danger: sign < 0 }))) return;
    if (sign < 0 && numbersOf(manual.userId).available < manual.amount) {
      setStatus('Silinecek miktar kullanılabilir bakiyeden fazla.');
      return;
    }
    await adjustCredit(manual.userId, sign * manual.amount, manual.reason.trim() || 'Yönetici düzeltmesi');
    setStatus('Bakiye güncellendi.');
  };

  const pending = requests.filter((r) => r.status === 'bekliyor');
  return (
    <div className="page">
      <header className="page-head"><div><p className="eyebrow">Süper admin</p><h1>Kredi yönetimi</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      <section className="card">
        <h2>Bekleyen talepler ({pending.length})</h2>
        {pending.length === 0 ? <p className="muted">Bekleyen talep yok.</p> : <ul className="simple-list">{pending.map((r) => (
          <li key={r.id} className="wrap-row">
            <span><strong>{users.find((u) => u.id === r.userId)?.name} · {r.type === 'yukleme' ? 'Yükleme' : 'Bozdurma'}</strong>
              <small>{r.credits} kredi · {money(r.kurus)}{r.note ? ` · ${r.note}` : ''}</small>
              {r.payout && <small>{r.payout.method === 'eft' ? `EFT: ${r.payout.name} · ${r.payout.iban}` : `Kripto: ${r.payout.coin} · ${r.payout.network} · ${r.payout.wallet}`}</small>}
              {r.receiptUrl && (/^https:\/\/res\.cloudinary\.com\//.test(r.receiptUrl) || (!firebaseEnabled && r.receiptUrl.startsWith('data:'))) && <a href={r.receiptUrl} target="_blank" rel="noreferrer" download="dekont">Dekontu aç</a>}</span>
            <span className="form-actions"><button className="primary" onClick={() => decide(r, true)}>Onayla</button><button onClick={() => decide(r, false)}>Reddet</button></span>
          </li>
        ))}</ul>}
      </section>
      <div className="two-col">
        <section className="card stack">
          <h2>Antrenör bakiyesi</h2>
          <label>Antrenör<select value={manual.userId} onChange={(e) => setManual({ ...manual, userId: e.target.value })}><option value="">Seçin</option>{coaches.map((c) => <option key={c.id} value={c.id}>{c.name} · {numbersOf(c.id).balance} kredi</option>)}</select></label>
          <label>Miktar<input type="number" min={1} value={manual.amount} onChange={(e) => setManual({ ...manual, amount: Number(e.target.value) })} /></label>
          <label>Açıklama<input value={manual.reason} onChange={(e) => setManual({ ...manual, reason: e.target.value })} /></label>
          <div className="form-actions"><button className="primary" onClick={() => adjust(1)}>Kredi ekle</button><button onClick={() => adjust(-1)}>Kredi sil</button></div>
        </section>
        <form className="card stack" onSubmit={saveSettings}>
          <h2>EFT ve bozdurma ayarı</h2>
          <label>Banka<input required value={form.bank} onChange={(e) => setForm({ ...form, bank: e.target.value })} /></label>
          <label>Hesap sahibi<input required value={form.holder} onChange={(e) => setForm({ ...form, holder: e.target.value })} /></label>
          <label>IBAN<input required value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></label>
          <p className="muted">Kredi değeri sabittir: <strong>1 kredi = 1 TL</strong>. Yükleme, bozdurma ve market fiyatları buna göre hesaplanır.</p>
          <button className="primary">Kaydet</button>
        </form>
      </div>
      <section className="card">
        <h2>Kredi paketleri</h2>
        <form className="inline-form wrap" onSubmit={addPack}>
          <input aria-label="Paket adı" required placeholder="Paket adı" value={pack.name} onChange={(e) => setPack({ ...pack, name: e.target.value })} />
          <input aria-label="Kredi" type="number" min={1} value={pack.credits} onChange={(e) => setPack({ ...pack, credits: Number(e.target.value) })} />
          <span className="muted">Fiyat: {money(creditsToKurus(pack.credits || 0))}</span>
          <button className="primary">Paket ekle</button>
        </form>
        <ul className="simple-list">{packages.map((p) => <li key={p.id}><span>{p.name}<small>{p.credits} kredi · {money(p.priceKurus)}</small></span><button className="ghost icon" aria-label={`${p.name} paketini sil`} onClick={async () => { if (await confirm({ title: `${p.name} paketi silinsin mi?`, text: 'Bu işlem geri alınamaz.', ok: 'Evet, sil', danger: true })) await db.remove('packages', p.id); }}><Trash2 size={16} /></button></li>)}</ul>
      </section>
      {confirmDialog}
    </div>
  );
}
