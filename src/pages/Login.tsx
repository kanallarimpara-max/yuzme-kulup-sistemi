import { useState, type FormEvent } from 'react';
import { Waves } from 'lucide-react';
import { useSession } from '../lib/session';
import { firebaseEnabled, useCollection } from '../lib/store';
import { ROLE_LABEL, type User } from '../lib/types';

export default function Login() {
  const { signIn, signInDemo } = useSession();
  const users = useCollection<User>('users');
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

  return (
    <div className="login">
      <section className="login-card">
        <span className="brand-mark large"><Waves size={28} /></span>
        <h1>Yüzme Kulüp Sistemi</h1>
        {firebaseEnabled ? (
          <form onSubmit={submit} className="stack">
            <label>E-posta<input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
            <label>Şifre<input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
            {error && <p className="error" role="alert">{error}</p>}
            <button className="primary" disabled={busy}>{busy ? 'Giriş yapılıyor…' : 'Giriş yap'}</button>
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
