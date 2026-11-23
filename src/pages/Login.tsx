import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Waves } from 'lucide-react';
import { useAppDesign } from '../lib/design';
import { useSession } from '../lib/session';
import { ThemeToggle } from '../lib/theme';
import { firebaseEnabled, useCollection } from '../lib/store';
import { ROLE_LABEL, type User } from '../lib/types';

export default function Login() {
  const { signIn, signInDemo, resetPassword } = useSession();
  const { appName } = useAppDesign();
  const [info, setInfo] = useState('');
  // Rol kartları yalnız demo içindir; gerçek sistemde kullanıcı listesi girişte okunmaz.
  const users = useCollection<User>('users', { skip: firebaseEnabled });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch {
      setError('E-posta veya şifre hatalı.');
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError('');
    setInfo('');
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError('Önce e-posta adresini yaz.');
    // Hesabın var olup olmadığı dışarıya söylenmez.
    await resetPassword(email.trim()).catch(() => undefined);
    setInfo('Bu e-posta kayıtlıysa şifre yenileme bağlantısı gönderildi. Spam klasörünü de kontrol et.');
  };

  return (
    <div className="login">
      <section className="login-card">
        <ThemeToggle className="ghost icon login-theme" />
        <span className="brand-mark large"><Waves size={28} /></span>
        <h1>{appName}</h1>
        <Link className="login-back" to="/"><ArrowLeft size={15} />Ana sayfaya dön</Link>
        {firebaseEnabled ? (
          <form onSubmit={submit} className="stack">
            <label>E-posta<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Şifre<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            {info && <p className="ok" role="status">{info}</p>}
            <button className="primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
            <button type="button" className="ghost" onClick={forgot}>Şifremi unuttum</button>
          </form>
        ) : (
          <>
            <p className="muted">Demo modu. Veriler yalnızca bu tarayıcıda tutulur. Bir rol seçin.</p>
            <div className="role-list">
              {users.map((u) => (
                <button key={u.id} onClick={() => signInDemo(u.id)}>
                  <strong>{ROLE_LABEL[u.role]}</strong><small>{u.name}</small>
                </button>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
