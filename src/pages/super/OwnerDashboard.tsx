import { Link } from 'react-router-dom';
import { Building2, Coins, MessagesSquare, ShoppingBag } from 'lucide-react';
import { useSession } from '../../lib/session';
import { useCollection, type Row } from '../../lib/store';
import { dateTr, money } from '../../lib/format';
import type { CreditRequest } from '../../lib/credits';
import type { Ad } from '../../lib/design';
import type { Club, Student, User } from '../../lib/types';

type Sale = Row & { clubName: string; date: string; plan: string; amountKurus: number };

const sameName = (a: string, b: string) => a.trim().toLocaleLowerCase('tr-TR') === b.trim().toLocaleLowerCase('tr-TR');

/** Sistem sahibinin ekranı: tek kulübün dersleri değil, bütün platformun durumu. */
export default function OwnerDashboard() {
  const { user } = useSession();
  const clubs = useCollection<Club>('clubs');
  const users = useCollection<User>('users');
  const students = useCollection<Student>('students');
  const sales = useCollection<Sale>('sales');
  const requests = useCollection<CreditRequest>('creditRequests');
  const ads = useCollection<Ad>('ads');
  if (!user) return null;

  const count = (role: User['role']) => users.filter((u) => u.role === role).length;
  const pending = requests.filter((r) => r.status === 'bekliyor');
  const topups = pending.filter((r) => r.type === 'yukleme');
  const payouts = pending.filter((r) => r.type === 'bozdurma');
  const recentSales = [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);

  return (
    <div className="page">
      <header className="page-head">
        <div><p className="eyebrow">Sistem sahibi</p><h1>Platform özeti</h1></div>
        <p className="muted">{new Date().toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' })}</p>
      </header>
      <section className="stats">
        <article><span>Kulüp</span><strong>{clubs.length}</strong></article>
        <article><span>Toplam kullanıcı</span><strong>{users.length}</strong></article>
        <article><span>Toplam satış</span><strong className="fit">{money(sales.reduce((s, x) => s + x.amountKurus, 0))}</strong></article>
        <article><span>Bekleyen talep</span><strong>{pending.length}</strong></article>
      </section>
      <section className="stats">
        <article><span>Kulüp yöneticisi</span><strong>{count('admin')}</strong></article>
        <article><span>Sekreter</span><strong>{count('secretary')}</strong></article>
        <article><span>Antrenör</span><strong>{count('coach')}</strong></article>
        <article><span>Veli</span><strong>{count('parent')}</strong></article>
      </section>
      <section className="card stack">
        <h2>Hızlı işlemler</h2>
        <div className="owner-actions">
          <Link className="button" to="/platform"><Building2 size={17} />Kulüp aç ve yönet</Link>
          <Link className="button" to="/kredi-yonetimi"><Coins size={17} />Kredi talepleri ({pending.length})</Link>
          <Link className="button" to="/market"><ShoppingBag size={17} />Market</Link>
          <Link className="button" to="/mesajlar"><MessagesSquare size={17} />Mesajlar</Link>
        </div>
      </section>
      <section className="card stack">
        <h2>Kulüpler</h2>
        {clubs.length === 0 ? <p className="muted">Henüz kulüp yok. İlk kulübü Platform ekranından açabilirsin.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Kulüp</th><th>Satış tarihi</th><th>Plan</th><th>Personel</th><th>Veli</th><th>Öğrenci</th></tr></thead>
            <tbody>{clubs.map((c) => {
              const sale = sales.filter((s) => sameName(s.clubName, c.name)).sort((a, b) => b.date.localeCompare(a.date))[0];
              const members = users.filter((u) => u.clubId === c.id);
              return (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{sale ? dateTr(sale.date) : '—'}</td>
                  <td>{sale?.plan ?? '—'}</td>
                  <td>{members.filter((u) => u.role !== 'parent').length}</td>
                  <td>{members.filter((u) => u.role === 'parent').length}</td>
                  <td>{students.filter((s) => s.clubId === c.id).length}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </section>
      <div className="owner-grid">
        <section className="card stack">
          <h2>Bekleyen kredi işleri</h2>
          <ul className="simple-list">
            <li><span>Kredi yükleme onayı</span><strong>{topups.length}</strong></li>
            <li><span>Kredi bozdurma onayı</span><strong>{payouts.length}</strong></li>
            <li><span>Yayındaki reklam</span><strong>{ads.filter((a) => a.active).length}</strong></li>
          </ul>
        </section>
        <section className="card stack">
          <h2>Son satışlar</h2>
          {recentSales.length === 0 ? <p className="muted">Henüz satış kaydı yok.</p> : (
            <ul className="simple-list">{recentSales.map((s) => <li key={s.id}><span>{s.clubName}<small>{dateTr(s.date)} · {s.plan}</small></span><strong>{money(s.amountKurus)}</strong></li>)}</ul>
          )}
        </section>
      </div>
    </div>
  );
}
