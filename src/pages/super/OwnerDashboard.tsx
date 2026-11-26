import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Coins, MessagesSquare, ShoppingBag } from 'lucide-react';
import { useSession } from '../../lib/session';
import { useCollection, type Row } from '../../lib/store';
import { dateTr, money } from '../../lib/format';
import type { CreditRequest } from '../../lib/credits';
import type { Ad } from '../../lib/design';
import type { Branch, Club, Lesson, Student, TrainingModel, User } from '../../lib/types';
import { clubSetupSteps, nextSetupStep } from '../../lib/setup';

type Sale = Row & { clubName: string; date: string; plan: string; amountKurus: number };

type SortKey = 'kurulum' | 'ad' | 'satis-yeni' | 'satis-eski' | 'personel' | 'veli' | 'ogrenci';
const SORTS: Array<[SortKey, string]> = [['ad', 'Alfabetik (A-Z)'], ['kurulum', 'Kurulumu eksik olan önce'], ['satis-yeni', 'Satış tarihi (yeniden eskiye)'], ['satis-eski', 'Satış tarihi (eskiden yeniye)'], ['personel', 'Personel sayısı'], ['veli', 'Veli sayısı'], ['ogrenci', 'Öğrenci sayısı']];

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
  const branches = useCollection<Branch>('branches');
  const models = useCollection<TrainingModel>('models');
  const lessons = useCollection<Lesson>('lessons');
  const [sort, setSort] = useState<SortKey>('ad');
  if (!user) return null;

  const count = (role: User['role']) => users.filter((u) => u.role === role).length;
  const pending = requests.filter((r) => r.status === 'bekliyor');
  const topups = pending.filter((r) => r.type === 'yukleme');
  const payouts = pending.filter((r) => r.type === 'bozdurma');
  const recentSales = [...sales].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const rows = clubs.map((c) => {
    const members = users.filter((u) => u.clubId === c.id);
    return {
      club: c,
      sale: sales.filter((x) => sameName(x.clubName, c.name)).sort((a, b) => b.date.localeCompare(a.date))[0],
      staff: members.filter((u) => u.role !== 'parent').length,
      parents: members.filter((u) => u.role === 'parent').length,
      kids: students.filter((x) => x.clubId === c.id).length,
      setup: clubSetupSteps({
        logo: Boolean(c.logoUrl), branches: branches.filter((b) => b.clubId === c.id).length, models: models.filter((m) => m.clubId === c.id).length,
        coaches: members.filter((u) => u.role === 'coach').length, lessons: lessons.filter((l) => l.clubId === c.id).length, students: students.filter((x) => x.clubId === c.id).length,
      }),
    };
  });
  const byName = (a: (typeof rows)[number], b: (typeof rows)[number]) => a.club.name.localeCompare(b.club.name, 'tr');
  const sorted = [...rows].sort((a, b) => {
    if (sort === 'kurulum') return a.setup.filter((x) => x.done).length - b.setup.filter((x) => x.done).length || byName(a, b);
    if (sort === 'personel') return b.staff - a.staff || byName(a, b);
    if (sort === 'veli') return b.parents - a.parents || byName(a, b);
    if (sort === 'ogrenci') return b.kids - a.kids || byName(a, b);
    if (sort === 'satis-yeni' || sort === 'satis-eski') {
      // Satışı olmayan kulüpler her iki sırada da sonda kalır.
      const da = a.sale?.date ?? '';
      const dbb = b.sale?.date ?? '';
      if (!da || !dbb) return (da ? -1 : dbb ? 1 : 0) || byName(a, b);
      return (sort === 'satis-yeni' ? dbb.localeCompare(da) : da.localeCompare(dbb)) || byName(a, b);
    }
    return byName(a, b);
  });

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
        <div className="race-tools"><h2>Kulüpler</h2><label className="inline-label">Sırala<select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}>{SORTS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></label></div>
        {clubs.length === 0 ? <p className="muted">Henüz kulüp yok. İlk kulübü Platform ekranından açabilirsin.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>Kulüp</th><th>Kurulum</th><th>Satış tarihi</th><th>Plan</th><th>Personel</th><th>Veli</th><th>Öğrenci</th></tr></thead>
            <tbody>{sorted.map(({ club: c, sale, staff, parents, kids, setup }) => {
              const next = nextSetupStep(setup);
              return (
              <tr key={c.id}>
                <td>{c.name}</td>
                <td>{next ? <span className="setup-cell"><em className="badge warn">{setup.filter((x) => x.done).length}/{setup.length}</em><small>Sıradaki: {next.label}</small></span> : <em className="badge good">Tamam</em>}</td>
                <td>{sale ? dateTr(sale.date) : '—'}</td>
                <td>{sale?.plan ?? '—'}</td>
                <td>{staff}</td>
                <td>{parents}</td>
                <td>{kids}</td>
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
