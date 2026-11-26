import { useEffect, useState, type FormEvent } from 'react';
import { KeyRound, LogOut, Mail, Moon, Palette, Bell, Sun, UserRound } from 'lucide-react';
import { useSession } from '../lib/session';
import { useAppDesign } from '../lib/design';
import { firebaseEnabled } from '../lib/store';
import { pushAvailable, usePushToggle } from '../lib/push';
import { setTheme, useTheme } from '../lib/theme';
import { PasswordInput } from '../lib/PasswordInput';
import { ROLE_LABEL } from '../lib/types';

const WEAK = /^(.)\1+$|^(12345678|password|sifre123|qwerty12)$/i;

export default function Settings() {
  const { user, club, signOut, accountEmail, changePassword, resetPassword } = useSession();
  const { supportEmail } = useAppDesign();
  const theme = useTheme();
  const push = usePushToggle(user?.id);
  const [email, setEmail] = useState('');
  const [form, setForm] = useState({ current: '', next: '', again: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmOut, setConfirmOut] = useState(false);

  useEffect(() => { accountEmail().then(setEmail).catch(() => undefined); }, [accountEmail]);
  if (!user) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setStatus('');
    setError('');
    if (form.next.length < 8) return setError('Yeni şifre en az 8 karakter olmalı.');
    if (WEAK.test(form.next)) return setError('Bu şifre çok kolay tahmin edilir, başka bir şifre seç.');
    if (form.next !== form.again) return setError('Yeni şifreler birbirini tutmuyor.');
    if (form.next === form.current) return setError('Yeni şifre eskisiyle aynı olamaz.');
    setBusy(true);
    try {
      await changePassword(form.current, form.next);
      setForm({ current: '', next: '', again: '' });
      setStatus('Şifren değiştirildi.');
    } catch (err) {
      const code = (err as { code?: string }).code ?? '';
      setError(/wrong-password|invalid-credential/.test(code) ? 'Mevcut şifre hatalı.' : /too-many/.test(code) ? 'Çok fazla deneme yapıldı, biraz sonra tekrar dene.' : 'Şifre değiştirilemedi. Tekrar dene.');
    } finally {
      setBusy(false);
    }
  };

  const sendReset = async () => {
    setStatus('');
    setError('');
    if (!email) return;
    await resetPassword(email).catch(() => undefined);
    setStatus(`Şifre yenileme bağlantısı ${email} adresine gönderildi. Spam klasörünü de kontrol et.`);
  };

  return (
    <div className="page settings-page">
      <header className="page-head"><div><h1>Ayarlar</h1></div></header>
      {status && <p className="ok" role="status">{status}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <section className="card stack">
        <h2><UserRound size={19} /> Hesap bilgileri</h2>
        <dl className="info-list">
          <div><dt>Ad soyad</dt><dd>{user.name}</dd></div>
          <div><dt>Kullanıcı etiketi</dt><dd>{user.tag}</dd></div>
          <div><dt>Rol</dt><dd>{ROLE_LABEL[user.role]}</dd></div>
          {club && <div><dt>Kulüp</dt><dd>{club.name}</dd></div>}
          {email && <div><dt>Giriş e-postası</dt><dd>{email}</dd></div>}
        </dl>
        <p className="muted">Adını veya e-postanı değiştirmek için kulüp yöneticine{supportEmail ? ' ya da destek ekibine' : ''} yaz.</p>
      </section>

      <section className="card stack">
        <h2><Palette size={19} /> Görünüm ve tema</h2>
        <div className="segmented" role="radiogroup" aria-label="Tema">
          <button role="radio" aria-checked={theme === 'light'} className={theme === 'light' ? 'primary' : ''} onClick={() => setTheme('light')}><Sun size={17} />Aydınlık</button>
          <button role="radio" aria-checked={theme === 'dark'} className={theme === 'dark' ? 'primary' : ''} onClick={() => setTheme('dark')}><Moon size={17} />Karanlık</button>
        </div>
      </section>

      {pushAvailable && <section className="card stack">
        <h2><Bell size={19} /> Bildirimler</h2>
        <label className="check"><input type="checkbox" checked={push.on} disabled={push.busy} onChange={push.toggle} /><span>Bu cihazda duyuru, mesaj ve arama bildirimlerini al</span></label>
        {push.error && <p className="error" role="alert">{push.error}</p>}
      </section>}

      {firebaseEnabled && <section className="card stack">
        <h2><KeyRound size={19} /> Şifre</h2>
        {user.tempPassword && <p className="warn-note">Hesabın geçici bir şifreyle açıldı. Güvenliğin için kendi şifreni belirlemeni öneririz.</p>}
        <form className="stack" onSubmit={save}>
          <label>Mevcut şifre<PasswordInput required autoComplete="current-password" value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} /></label>
          <label>Yeni şifre<PasswordInput required minLength={8} autoComplete="new-password" value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} /></label>
          <label>Yeni şifre tekrar<PasswordInput required minLength={8} autoComplete="new-password" value={form.again} onChange={(e) => setForm({ ...form, again: e.target.value })} /></label>
          <div className="form-actions">
            <button className="primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Şifreyi değiştir'}</button>
            {email && <button type="button" onClick={sendReset}>Mevcut şifremi hatırlamıyorum</button>}
          </div>
        </form>
      </section>}

      {supportEmail && <section className="card stack">
        <h2><Mail size={19} /> Destek</h2>
        <p>Bir sorun yaşarsan veya önerin varsa bize yaz: <a href={`mailto:${supportEmail}`}>{supportEmail}</a></p>
      </section>}

      <section className="card stack">
        {!confirmOut
          ? <button className="danger-outline" onClick={() => setConfirmOut(true)}><LogOut size={17} />Çıkış yap</button>
          : <div className="confirm-box" role="alertdialog" aria-label="Çıkış onayı">
            <p>Bu cihazdaki oturumun kapanacak. Emin misin?</p>
            <div className="form-actions"><button className="primary" onClick={signOut}>Evet, çıkış yap</button><button onClick={() => setConfirmOut(false)}>Vazgeç</button></div>
          </div>}
      </section>
    </div>
  );
}
