import { Link } from 'react-router-dom';
import { ArrowRight, Banknote, ClipboardCheck, Coins, KeyRound, LineChart, Lock, Mail, MessagesSquare, ServerCog, ShieldCheck, Smartphone, Timer, Trophy, UserPlus, Users } from 'lucide-react';
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

/** Tanıtım görselindeki örnek yarış sonucu (kurgusal adlar). */
const POOL_RESULTS: Array<[number, string, string]> = [[3, 'Ece Y.', '1:04.32'], [4, 'Defne A.', '1:04.87'], [2, 'Zeynep K.', '1:06.15'], [5, 'Lara T.', '1:07.40']];

const SECURITY = [
  { icon: Users, title: 'Kulüpler birbirinden ayrı', text: 'Her kulübün öğrencisi, ödemesi, duyurusu ve mesajı yalnız o kulübe aittir. Başka bir kulüp bu kayıtları göremez, değiştiremez.' },
  { icon: ShieldCheck, title: 'Rolüne göre yetki', text: 'Veli yalnız kendi çocuğunu, antrenör kendi derslerini görür. Kurallar sunucuda denetlenir; uygulama değiştirilse bile aşılamaz.' },
  { icon: Lock, title: 'Şifreli bağlantı', text: 'Tüm veri şifreli bağlantıyla (HTTPS) taşınır. Sistem Google Firebase altyapısında çalışır.' },
  { icon: KeyRound, title: 'Şifreni kimse görmez', text: 'Giriş şifreleri Google Firebase kimlik sisteminde güvenli biçimde saklanır; Kulvar360 ekibi dahil kimse şifreni göremez.' },
  { icon: ServerCog, title: 'Kart bilgisi tutulmaz', text: 'Uygulama banka kartı bilgisi almaz ve saklamaz. Aidat tahsilatları kulübün kendi kaydı olarak tutulur.' },
];

const FAQ = [
  { q: 'Kulübümüz sistemi ücretsiz deneyebilir mi?', a: 'Evet. Kulüplere 2 haftalık ücretsiz deneme açıyoruz; tüm özellikler açıktır. Denemeyi tamamlayıp görüşlerini paylaşan kulübe ana modelde 2 hafta da hediye ediyoruz.' },
  { q: 'Hangi cihazlarda çalışır?', a: 'Web tarayıcısında, Android telefon ve tablette, Windows bilgisayarda çalışır. Hepsinde aynı hesapla girilir ve veriler aynıdır.' },
  { q: 'Kurulum gerekiyor mu?', a: 'Hayır. Kulübünüzü biz açarız, yönetici hesabınızı veririz. Şube, ders ve personeli birkaç dakikada eklersiniz.' },
  { q: 'Veliler neyi görür?', a: 'Veli yalnız kendi çocuğunun dersini, ödemesini, devamını, derecelerini ve kulübün ona gönderdiği duyuruları görür. Diğer öğrencileri göremez.' },
  { q: 'TYF yarış sonuçları nasıl gelir?', a: 'Canlı sonuçlar federasyon sitesinden dakikada bir alınır. Yarış sonu sonuç dosyaları düzenli taranır; sporcunun adı ve kulübü eşleşen dereceler kendiliğinden işlenir.' },
  { q: 'Verilerimiz güvende mi?', a: 'Her kulübün verisi ayrı tutulur, her kullanıcı yalnız yetkisi olanı görür ve bağlantılar şifrelidir. Ayrıntılar bu sayfadaki Güvenlik bölümündedir.' },
  { q: 'Bir sorun yaşarsam kime ulaşırım?', a: 'Sayfanın altındaki destek e-posta adresine yazabilirsiniz; kulübünüzün adını ve sorunu kısaca yazmanız yeterli.' },
];

/** Uygulama karma (#) yönlendirme kullandığı için bölüme kaydırma elle yapılır. */
const jump = (id: string) => (e: React.MouseEvent) => { e.preventDefault(); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }); };

export default function Landing() {
  const { appName, logoUrl, supportEmail } = useAppDesign();
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
          <h1>Kulübünün bütün işleri tek kulvarda</h1>
          <p className="landing-lead">Kayıttan yarış sonucuna, aidattan antrenmana kadar yönetici, sekreter, antrenör ve veli aynı sistemde buluşur.</p>
          <div className="landing-cta">
            <Link className="button primary" to="/giris">Sisteme giriş yap <ArrowRight size={18} /></Link>
            <button onClick={() => document.getElementById('ozellikler')?.scrollIntoView({ behavior: 'smooth' })}>Neler yapabilirsin?</button>
          </div>
        </div>
        <div className="landing-pool" aria-hidden="true">
          {[1, 2, 3, 4, 5].map((lane) => (
            <div className="pool-lane" key={lane}>
              <span className="pool-no">{lane}</span>
              <span className="pool-floor" />
            </div>
          ))}
          <div className="pool-card">
            <header><strong>100 m serbest · Final</strong><small>Canlı sonuç</small></header>
            <ol>
              {POOL_RESULTS.map(([lane, name, time], i) => <li key={lane} className={i === 0 ? 'first' : ''}><span>{lane}</span><span>{name}</span><b>{time}</b></li>)}
            </ol>
          </div>
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

      <section className="landing-section" id="guvenlik">
        <p className="eyebrow">Güvenlik</p>
        <h2>Kulübünün verisi yalnız kulübüne ait</h2>
        <div className="landing-features">
          {SECURITY.map(({ icon: Icon, title, text }) => (
            <article key={title}><Icon size={22} /><h3>{title}</h3><p>{text}</p></article>
          ))}
        </div>
      </section>

      <section className="landing-section" id="hakkimizda">
        <p className="eyebrow">Hakkımızda</p>
        <h2>Havuz başında doğan bir fikir</h2>
        <div className="landing-about">
          <p>{appName}, yüzme kulüplerinin kâğıt, Excel tablosu ve mesaj grupları arasında dağılan işlerini tek yerde toplamak için geliştirildi. Kayıt, aidat, yoklama, antrenman, yarış sonucu ve veli iletişimi aynı sistemde buluşur.</p>
          <p>Amacımız antrenörün zamanını havuza, yöneticinin zamanını kulübüne, velinin ilgisini de çocuğunun gelişimine bırakmak. Sistemi kulüplerden gelen görüşlerle sürekli geliştiriyoruz.</p>
        </div>
      </section>

      <section className="landing-section" id="sss">
        <p className="eyebrow">Sık sorulan sorular</p>
        <h2>Merak edilenler</h2>
        <div className="landing-faq">
          {FAQ.map(({ q, a }) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}
        </div>
      </section>

      <section className="landing-final">
        <Smartphone size={28} />
        <h2>Web, Android ve Windows'ta aynı sistem</h2>
        <p>Hangi cihazdan girersen gir, kulübünün verisi seninle gelir.</p>
        <Link className="button primary" to="/giris">Giriş ekranına geç <ArrowRight size={18} /></Link>
      </section>

      <footer className="landing-foot">
        {supportEmail && <a className="landing-support" href={`mailto:${supportEmail}`}><Mail size={16} />Destek: {supportEmail}</a>}
        <nav aria-label="Sayfa bölümleri"><a href="#guvenlik" onClick={jump('guvenlik')}>Güvenlik</a><a href="#hakkimizda" onClick={jump('hakkimizda')}>Hakkımızda</a><a href="#sss" onClick={jump('sss')}>Sık sorulan sorular</a></nav>
        <span>© {new Date().getFullYear()} {appName}</span>
      </footer>
    </div>
  );
}
