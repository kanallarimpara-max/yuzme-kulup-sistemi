import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, ClipboardCheck, Coins, LineChart, MessagesSquare, Smartphone, Timer, Trophy, UserPlus } from 'lucide-react';
import { useAppDesign } from '../lib/design';
import { ThemeToggle } from '../lib/theme';

const FEATURES = [
  { icon: Timer, title: 'Çok kulvarlı kronometre', text: 'Her kulvara ayrı antrenman ata, başka bir cihazdan başlat, durdur ve seti yönet.' },
  { icon: UserPlus, title: 'Ön kayıttan kesin kayda', text: 'Kulübüne özel bağlantıyla başvuruları topla, tek dokunuşla kayıt formuna aktar.' },
  { icon: Banknote, title: 'Aidat ve finans', text: 'Taksit, vade, tahsilat, gider, maaş ve kâr tek ekranda, güncel olarak görünür.' },
  { icon: ClipboardCheck, title: 'Yoklama ve raporlar', text: 'Ders saatine göre öğrenciler otomatik gelir. Listeler PDF olarak hazırlanır.' },
  { icon: Trophy, title: 'TYF sonuçları ve barajlar', text: 'Yarış sonuçlarını sporcuyla eşleştir, yaşına uygun barajları anında gör.' },
  { icon: LineChart, title: 'Performans analizi', text: 'Mesafe ve stil gelişimini grafiklerle izle, yapay zekâdan öneri al.' },
  { icon: MessagesSquare, title: 'Kulüp içi iletişim', text: 'Ders grupları, yazılı ve sesli mesaj, sesli arama ve hedefli duyurular.' },
  { icon: Coins, title: 'Antrenman pazarı', text: 'Antrenörler antrenmanlarını paylaşır, kredi ile alır ve kazancını yönetir.' },
];

const ROLES = [
  { title: 'Kulüp yöneticisi', text: 'Şube, ders, personel ve finansı yönetir.' },
  { title: 'Sekreter', text: 'Ön kayıt, kayıt, taksit ve tahsilatı yürütür.' },
  { title: 'Antrenör', text: 'Ders, yoklama, derece ve antrenman girer.' },
  { title: 'Veli', text: 'Yalnız kendi çocuğunun gelişimini ve ödemesini izler.' },
];

export default function Landing() {
  const { appName, logoUrl } = useAppDesign();
  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="landing-brand">
          <span className={logoUrl ? 'brand-mark' : 'brand-mark logo'}><img src={logoUrl || './icon.svg'} alt="" /></span>
          <strong>{appName}</strong>
        </span>
        <span className="landing-actions"><ThemeToggle /><Link className="button primary" to="/giris">Giriş yap</Link></span>
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">Yüzme kulüpleri için yönetim sistemi</p>
          <h1>Kulübünün bütün işleri tek kulvarda.</h1>
          <p className="landing-lead">Kayıttan yarış sonucuna, aidattan antrenmana kadar yönetici, sekreter, antrenör ve veli aynı sistemde buluşur.</p>
          <div className="landing-cta">
            <Link className="button primary" to="/giris">Sisteme giriş yap <ArrowRight size={18} /></Link>
            <button onClick={() => document.getElementById('ozellikler')?.scrollIntoView({ behavior: 'smooth' })}>Neler yapabilirsin?</button>
          </div>
        </div>
        <div className="landing-pool" aria-hidden="true">
          {[1, 2, 3, 4].map((lane) => (
            <div className="pool-lane" key={lane}>
              <span className="pool-no">{lane}</span>
              <span className={`pool-swimmer s${lane}`} />
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section" id="ozellikler">
        <p className="eyebrow">Özellikler</p>
        <h2>Havuz başından ofise, ihtiyacın olan her şey</h2>
        <div className="landing-features">
          {FEATURES.map(({ icon: Icon, title, text }) => (
            <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <p className="eyebrow">Herkese kendi ekranı</p>
        <h2>Herkes yalnız kendi işini görür</h2>
        <div className="landing-roles">
          {ROLES.map((r, i) => <article key={r.title}><span>{i + 1}</span><div><h3>{r.title}</h3><p>{r.text}</p></div></article>)}
        </div>
      </section>

      <section className="landing-final">
        <Smartphone size={28} />
        <h2>Web, Android ve Windows'ta aynı sistem</h2>
        <p>Hangi cihazdan girersen gir, kulübünün verisi seninle gelir.</p>
        <Link className="button primary" to="/giris">Giriş ekranına geç <ArrowRight size={18} /></Link>
      </section>

      <footer className="landing-foot">© {new Date().getFullYear()} {appName}</footer>
    </div>
  );
}
