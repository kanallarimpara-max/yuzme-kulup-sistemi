// Tanıtım filmi ve rol videolarının sahne akışı. Her sahne müziğin ölçüsüne (bar) oturur.
// Seslendirme yoktur: her şey ekrandaki başlık, açıklama (sub) ve maddelerle anlatılır.
// energy: 1 sakin ritim, 2 dolu ritim, 3 patlama.
import { BRAND, URL_TEXT } from './motor.mjs';

const dev = (shot, kicker, title, sub, points, more = {}) => ({ type: 'device', bars: 4, energy: 1, shot, kicker, title, sub, points, ...more });
const chapter = (no, title, sub, icon, color) => ({ type: 'chapter', bars: 2, energy: 2, no, title, sub, icon, color });

export const FILM = {
  file: 'tanitim-filmi', wide: true, bpm: 118, seed: 2, transpose: 0, tail: 2.5,
  scenes: [
    { type: 'strike', bars: 4, energy: 1, items: ['Defterler', 'Excel tabloları', 'Mesaj grupları', 'Kaybolan dekontlar'], answer: 'Hepsi artık *tek uygulamada.*' },
    { type: 'logo', bars: 4, energy: 3, tagline: 'Yüzme kulüpleri için *hepsi bir arada* yönetim sistemi', platforms: true },
    { type: 'trio', bars: 3, energy: 2, laptop: 'admin-panel', tablet: 'krono-ekran', phone: 'veli-performans', title: 'Bilgisayarda, tablette, telefonda *aynı sistem*' },
    dev('tanitim', 'Görünüm', 'Karanlık ve aydınlık mod', 'Gözünüzü yormayan görünümü tek dokunuşla seçin.', ['Tek dokunuşla değişir', 'Cihazınızın ayarına uyar', 'Seçiminiz hatırlanır'], { device: 'laptop', light: 'tanitim-acik', kIcon: 'SunMoon', icons: ['MousePointerClick', 'MonitorSmartphone', 'Save'], tap: false, push: 1.0 }),
    { type: 'roles', bars: 4, energy: 1, title: 'Beş rol, *herkese kendi ekranı*', items: [['Crown', 'Sistem sahibi', 'Platformu yönetir', '#ffd166'], ['Building2', 'Yönetici', 'Kulübü yönetir', '#3ff0ff'], ['ClipboardList', 'Sekreter', 'Kayıt ve ödemeleri yürütür', '#ff7eb6'], ['Timer', 'Antrenör', 'Dersleri ve sporcuları çalıştırır', '#b8ff5c'], ['Heart', 'Veli', 'Çocuğunun gelişimini izler', '#b48cff']] },

    chapter('01', 'Sistem sahibi', 'Bütün kulüpleri tek panelden yönetir', 'Crown', '#ffd166'),
    dev('super-panel', 'Sistem sahibi', 'Bütün kulüpler tek ekranda', 'Kulüp, kullanıcı ve satış bilgilerini anlık olarak görün.', ['Kulüp ve kullanıcı sayıları', 'Satış ve gelir özeti', 'Onay bekleyen talepler'], { kIcon: 'Crown', icons: ['Users', 'TrendingUp', 'BellRing'] }),
    dev('super-platform', 'Sistem sahibi', 'Yeni kulüp açın, uygulamayı tasarlayın', 'Kulübü ve yöneticisini birkaç adımda sisteme ekleyin.', ['Kulüp ve yönetici hesabı açma', 'Uygulama adı, logo ve renkler', 'Reklam alanlarını yönetme'], { flip: true, kIcon: 'Palette', icons: ['Building2', 'Palette', 'Megaphone'] }),
    dev('super-kredi', 'Kredi yönetimi', 'Dekontları tek yerden onaylayın', 'Kredi yükleme dekontlarını kontrol edip tek dokunuşla onaylayın.', ['Kredi yükleme talepleri', 'Kredi paketleri', 'Bozdurma talepleri'], { kIcon: 'Coins', icons: ['Receipt', 'Package', 'ArrowLeftRight'] }),

    chapter('02', 'Kulüp yöneticisi', 'Kulübün tamamı kontrolünüz altında', 'Building2', '#3ff0ff'),
    dev('admin-panel', 'Yönetici paneli', 'Günün özeti tek bakışta', 'Bugünkü dersleri, öğrenci ve şube sayılarını açılışta görün.', ['Bugünkü dersler', 'Öğrenci ve şube sayıları', 'Günün programı'], { device: 'tablet', flip: true, kIcon: 'LayoutDashboard', icons: ['CalendarDays', 'Users', 'Clock'] }),
    dev('admin-dersler', 'Ders saatleri', 'Ders programını kolayca kurun', 'Günü, saati ve kontenjanı seçin; gerisini sistem hesaplasın.', ['Gün, saat ve kontenjan', 'Antrenörün uygunluğu kontrol edilir', 'Bitiş tarihi kendiliğinden hesaplanır'], { kIcon: 'BookOpen', icons: ['CalendarClock', 'UserCheck', 'CalendarCheck'] }),
    dev('admin-finans', 'Gelir ve gider', 'Kulübünüzün parasını anlık izleyin', 'Tahsilatlar, giderler ve maaşlar tek ekranda toplanır.', ['Ciro ve tahsilat', 'Gider ve maaş ödemeleri', 'Aylık kâr grafiği'], { flip: true, kIcon: 'Banknote', icons: ['Wallet', 'Receipt', 'ChartLine'] }),
    dev('admin-derece', 'Yarış dereceleri', 'Yarış derecelerini yönetici girer', 'Girilen dereceler barajlara ve performans raporlarına işlenir.', ['Barajlar kendiliğinden güncellenir', 'Performans grafiğine eklenir', 'Antrenman derecelerinden ayrı tutulur'], { kIcon: 'Medal', icons: ['Target', 'ChartLine', 'Split'] }),

    chapter('03', 'Sekreter', 'Ön kayıttan tahsilata bütün işler', 'ClipboardList', '#ff7eb6'),
    dev('onkayit-formu', 'Ön kayıt', 'Kulübünüze özel başvuru formu', 'Bağlantıyı paylaşın, veliler başvuruyu telefondan yapsın.', ['Bağlantıyla paylaşılır', 'Kulübünüzün logosu ve renkleriyle', 'Veli hesabı başvuruyla birlikte açılır'], { device: 'phone', scroll: true, kIcon: 'Link', icons: ['Share2', 'Palette', 'UserPlus'] }),
    dev('sekreter-kayit', 'Kesin kayıt', 'Başvuruyu tek dokunuşla kayda çevirin', 'Başvurudaki bilgiler kayıt formuna kendiliğinden aktarılır.', ['Gelen başvurular listelenir', 'Bilgiler forma aktarılır', 'İndirim ve taksit planı eklenir'], { flip: true, kIcon: 'UserPlus', icons: ['Inbox', 'FileInput', 'Percent'] }),
    dev('sekreter-taksit', 'Tahsilat', 'Kim ne kadar ödedi, anında görün', 'Vadesi gelen ve geciken taksitler ayrı ayrı listelenir.', ['Vade takibi', 'Geciken ödemeler', 'Tek dokunuşla tahsilat'], { device: 'phone', kIcon: 'Wallet', icons: ['CalendarClock', 'AlertTriangle', 'CircleCheck'] }),

    chapter('04', 'Antrenör', 'Havuz başında ihtiyacınız olan her şey', 'Timer', '#b8ff5c'),
    dev('antrenor-yoklama', 'Akıllı yoklama', 'Yoklama ders saatinde kendiliğinden açılır', 'Telefonun saatine göre o anki dersin öğrenci listesi gelir.', ['O anki ders kendiliğinden seçilir', 'Öğrenci listesi hazır gelir', 'Tek düğmeyle kaydedilir'], { device: 'phone', flip: true, kIcon: 'ClipboardCheck', icons: ['Clock', 'Users', 'Save'] }),
    dev('antrenor-rapor', 'Devam raporu', 'Her öğrencinin ders ders devam tablosu', 'Öğrencinin hangi derse gelip gelmediği tek tabloda görünür.', ['1., 2., 3. ders sırasıyla', 'Yoklaması girilmeyen dersler belirtilir', 'PDF olarak indirilebilir'], { kIcon: 'Table', icons: ['ListOrdered', 'EyeOff', 'FileDown'] }),
    dev('antrenor-antrenman', 'Antrenman', 'Antrenmanınızı set set hazırlayın', 'Tekrarı, mesafeyi ve dinlenme süresini girip derse atayın.', ['Tekrar ve mesafe', 'Çıkış ve dinlenme süresi', 'Derse atanır, velilere bildirilir'], { flip: true, kIcon: 'Dumbbell', icons: ['Repeat', 'TimerReset', 'Send'] }),
    { type: 'remote', bars: 4, energy: 3, tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Kronometre', title: 'Büyük ekran havuzda, *kumanda telefonunuzda*', sub: 'Her kulvarın süresini ve sıradaki çıkışı telefondan izleyin.', chips: [{ icon: 'Radio', text: 'Cihazlar anlık eşitlenir' }, { icon: 'Volume2', text: 'Her kulvarın çıkış sesi ayrı' }] },
    dev('krono-kilit', 'Dokunma kilidi', 'Ekrana su sıçrasa da kronometre durmaz', 'Kilit açıkken ekran hiçbir dokunuşa tepki vermez.', ['Dokunmalar engellenir', 'Kilit telefondan açılır', 'Ekran uykuya geçmez'], { device: 'tablet', flip: true, energy: 2, kIcon: 'Lock', icons: ['Hand', 'Smartphone', 'Sun'] }),
    { type: 'ai', bars: 4, energy: 3, shot: 'ders-analizi', device: 'laptop', kicker: 'Yapay zekâ', title: 'Dersteki sporcuları *stil stil analiz eder*', sub: 'Yarış ve antrenman derecelerine göre güçlü ve eksik yönleri bulur.', points: [], flip: true, tap: false, push: 1.0, lines: ['En güçlü stil: serbest', 'Geliştirilmesi gereken stil: kurbağa', 'Kelebek 2 sporcuda henüz ölçülmedi', 'Öncelik: kurbağa tekniği ve dönüşler'] },
    dev('ders-program', 'Yapay zekâ', 'Günlük, haftalık ya da aylık program önerisi', 'İsteğinizi yazın, eksik stillere odaklanan bir program hazırlansın.', ['İsteğinize göre hazırlanır', 'Eksik stillere öncelik verir', 'Kaydedip paylaşabilirsiniz'], { device: 'phone', energy: 2, kIcon: 'Sparkles', icons: ['MessageSquareText', 'Target', 'Save'], tap: false }),
    dev('antrenor-pazar', 'Antrenman pazarı', 'Hazırladığınız antrenmanları paylaşın', 'Antrenmanlarınızı kredi karşılığında diğer antrenörlere sunun.', ['Kredi karşılığında satış', 'Hazır antrenman satın alma', 'Kazancı nakde çevirme'], { kIcon: 'Store', icons: ['Coins', 'ShoppingCart', 'ArrowLeftRight'] }),

    chapter('05', 'Veli', 'Çocuğunuzun gelişimi cebinizde', 'Heart', '#b48cff'),
    dev('veli-sporcular', 'Sporcularım', 'Ders, ödeme ve devam tek ekranda', 'Veli yalnızca kendi çocuğunun bilgilerini görür.', ['Ders ve antrenör bilgisi', 'Ödeme durumu', 'Devam takibi'], { device: 'phone', flip: true, kIcon: 'Baby', icons: ['ShieldCheck', 'Wallet', 'CalendarCheck'] }),
    dev('veli-performans', 'Performans', 'Gelişimi grafikle izleyin', 'Dereceler, antrenör yorumları ve öneriler tek raporda toplanır.', ['Gelişim grafiği', 'Antrenör yorumları', 'Yapay zekâ önerileri'], { device: 'phone', scroll: true, kIcon: 'ChartLine', icons: ['TrendingUp', 'MessageCircle', 'Sparkles'] }),
    dev('veli-barajlar', 'Barajlar', 'Yaşına uygun TYF barajları', 'Federasyon barajları her gün kontrol edilir, yenileri kendiliğinden eklenir.', ['Her gün güncellenir', 'Yaşa ve cinsiyete göre gösterilir', 'Geçilen barajlar işaretlenir'], { device: 'phone', flip: true, kIcon: 'Target', icons: ['RefreshCw', 'Users', 'BadgeCheck'] }),
    dev('canli-sonuc', 'Canlı sonuçlar', 'Yarış sonuçları uygulamanın içinde', 'Başka bir siteye gitmeden sonuçları anında takip edin.', ['Sonuçlar kendiliğinden yenilenir', 'Kulübünüzün sporcuları öne çıkar', 'Sporcu ve kulüp araması'], { device: 'tablet', energy: 2, kIcon: 'Radio', icons: ['RefreshCw', 'Highlighter', 'Search'] }),
    dev('antrenor-mesaj', 'İletişim', 'Mesajlaşma ve sesli arama', 'Antrenörünüze ve kulübünüze uygulamanın içinden ulaşın.', ['Yazılı ve sesli mesaj', 'Ders grupları', 'Sesli ve grup araması'], { device: 'phone', flip: true, kIcon: 'MessagesSquare', icons: ['Mic', 'Users', 'Phone'] }),
    dev('sosyal', 'Sosyal', 'Başarılar kulüp akışında paylaşılır', 'Fotoğraf, derece ve madalyalar kulübün akışında yer alır.', ['Fotoğraf, derece ve madalya', 'Beğeni ve yorum', 'Açık veya gizli profil'], { device: 'phone', kIcon: 'Camera', icons: ['Image', 'Heart', 'Lock'] }),

    { type: 'wall', bars: 4, energy: 3, title: 'Hepsi *tek uygulamada*', items: [['UserPlus', 'Ön kayıt'], ['Wallet', 'Taksit ve tahsilat'], ['ClipboardCheck', 'Akıllı yoklama'], ['Dumbbell', 'Antrenman'], ['Timer', 'Kronometre'], ['Sparkles', 'Yapay zekâ'], ['Radio', 'Canlı sonuçlar'], ['Target', 'TYF barajları'], ['ChartLine', 'Performans'], ['MessagesSquare', 'Mesaj ve arama'], ['Camera', 'Sosyal akış'], ['ShoppingBag', 'Market']] },
    { type: 'stats', bars: 3, energy: 3, title: `Rakamlarla ${BRAND}`, items: [[5, 'kullanıcı rolü'], [3, 'platform'], [2060, 'güncel TYF barajı', '+']] },
    { type: 'logo', bars: 4, energy: 3, tagline: 'Kulübünüzü *tek kulvarda* yönetin.', platforms: true, url: URL_TEXT },
  ],
};

const end = (tagline) => ({ type: 'logo', bars: 2, energy: 3, tagline, platforms: true, url: URL_TEXT });
const r = (shot, kicker, title, sub, chips, more = {}) => ({ type: 'device', bars: 3, energy: 3, shot, kicker, title, sub, chips, ...more });
const c = (icon, text) => ({ icon, text });

export const REELS = [
  {
    file: 'reels-1-kulup-yoneticisi', wide: false, bpm: 124, seed: 4, transpose: 0, tail: 1.6,
    scenes: [
      { type: 'strike', bars: 2, energy: 2, items: ['Defter', 'Excel tablosu', 'Mesaj grupları'], answer: 'Kulübünü *tek uygulamadan* yönet.' },
      r('admin-panel', 'Yönetici paneli', 'Günün özeti *tek bakışta*', 'Bugünkü dersler, öğrenciler ve şubeler açılışta önünde.', [c('CalendarDays', 'Bugünkü dersler'), c('Users', 'Öğrenci sayısı')], { kIcon: 'LayoutDashboard' }),
      r('admin-finans', 'Gelir ve gider', 'Kârını *anlık* takip et', 'Tahsilat, gider ve maaşlar kendiliğinden hesaplanır.', [c('Wallet', 'Tahsilatlar'), c('ChartLine', 'Aylık kâr')], { kIcon: 'Banknote', scroll: true, flip: true }),
      r('admin-dersler', 'Ders saatleri', 'Ders programını *dakikalar içinde* kur', 'Antrenörün o saatte uygun olup olmadığını sistem kontrol eder.', [c('UserCheck', 'Uygunluk kontrolü'), c('CalendarCheck', 'Bitiş tarihi hazır')], { kIcon: 'BookOpen', scroll: true }),
      r('admin-derece', 'Yarış dereceleri', 'Yarış derecelerini *sen gir*', 'Dereceler barajlara ve performans raporlarına işlenir.', [c('Target', 'Barajlar güncellenir'), c('ChartLine', 'Performansa eklenir')], { kIcon: 'Medal', flip: true }),
      r('canli-sonuc', 'Canlı sonuçlar', 'Yarışı *uygulamadan* izle', 'Sonuçlar kendiliğinden yenilenir, kulübünün sporcuları öne çıkar.', [c('Radio', 'Canlı sonuçlar'), c('Highlighter', 'Kulübün vurgulu')], { device: 'tablet', kIcon: 'Radio' }),
      end('Kulübünü *tek kulvarda* yönet.'),
    ],
  },
  {
    file: 'reels-2-sekreter', wide: false, bpm: 124, seed: 5, transpose: 3, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Sekreter', icon: 'ClipboardList', lines: [{ text: 'Kayıt ve tahsilat' }, { text: '*dakikalar*', at: 1.5, size: 150 }, { text: 'içinde.', at: 2.5 }] },
      r('onkayit-formu', 'Ön kayıt', 'Ön kayıt bağlantını *paylaş*', 'Veliler başvuruyu telefondan birkaç dakikada yapar.', [c('Link', 'Kulübüne özel form'), c('UserPlus', 'Veli hesabı da açılır')], { kIcon: 'Link', scroll: true }),
      r('sekreter-kayit', 'Kesin kayıt', 'Başvuruyu *tek dokunuşla* kayda çevir', 'Başvurudaki bilgiler kayıt formuna kendiliğinden aktarılır.', [c('Percent', 'İndirim'), c('CalendarClock', 'Taksit planı')], { kIcon: 'UserPlus', flip: true }),
      r('sekreter-ogrenci', 'Ödemeler', 'Kim ne kadar ödedi, *anında gör*', 'Ödenen, kalan ve geciken tutarlar tek listede.', [c('CircleCheck', 'Ödenen'), c('AlertTriangle', 'Geciken')], { kIcon: 'Users', scroll: true }),
      r('sekreter-taksit', 'Tahsilat', 'Taksiti *tek dokunuşla* tahsil et', 'Vadesi gelen taksitler ayrıca listelenir.', [c('CalendarClock', 'Vade takibi'), c('Banknote', 'Ödeme yöntemi')], { kIcon: 'Wallet', flip: true }),
      end('Evrakla değil, *sistemle* çalış.'),
    ],
  },
  {
    file: 'reels-3-antrenor', wide: false, bpm: 124, seed: 6, transpose: -2, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Antrenör', icon: 'Timer', lines: [{ text: 'Havuz başındaki' }, { text: '*en iyi*', at: 1.5, size: 160 }, { text: 'yardımcın.', at: 2.5 }] },
      r('antrenor-yoklama', 'Akıllı yoklama', 'Yoklama *kendiliğinden* açılır', 'Ders saatinde öğrenci listesi hazır gelir, tek düğmeyle kaydedersin.', [c('Clock', 'Saate göre ders'), c('Save', 'Tek düğmeyle kaydet')], { kIcon: 'ClipboardCheck' }),
      { type: 'ai', bars: 3, energy: 3, shot: 'ders-analizi', device: 'phone', scroll: true, kicker: 'Yapay zekâ', title: 'Dersini *stil stil* analiz eder', sub: 'Güçlü ve eksik stilleri derecelere bakarak bulur.', lines: ['En güçlü stil: serbest', 'Geliştirilecek stil: kurbağa', 'Öncelik: dönüş çalışması'] },
      r('ders-program', 'Yapay zekâ', 'Haftalık programını *hazırlar*', 'Ne istediğini yaz, eksik stillere odaklanan program gelsin.', [c('CalendarDays', 'Günlük, haftalık, aylık'), c('Save', 'Kaydet ve paylaş')], { kIcon: 'Sparkles', tap: false, flip: true }),
      { type: 'remote', bars: 3, energy: 3, tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Kronometre', title: 'Kronometrenin kumandası *cebinde*', sub: 'Tablette büyük ekran, telefonda kumanda.', chips: [c('Radio', 'Anlık eşitleme')] },
      r('krono-kilit', 'Dokunma kilidi', 'Su sıçrasa da *kronometre durmaz*', 'Kilit açıkken ekran dokunuşlara tepki vermez.', [c('Hand', 'Dokunmalar engellenir'), c('Smartphone', 'Kilidi telefondan aç')], { device: 'tablet', kIcon: 'Lock' }),
      r('antrenor-antrenman', 'Antrenman', 'Antrenmanını *set set* hazırla', 'Tekrar, mesafe ve dinlenme süresini gir, derse ata.', [c('Repeat', 'Tekrar ve mesafe'), c('Send', 'Derse ata')], { kIcon: 'Dumbbell', scroll: true }),
      end('Sen antrenmana *odaklan.*'),
    ],
  },
  {
    file: 'reels-4-veli', wide: false, bpm: 124, seed: 7, transpose: 1, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Veli', icon: 'Heart', lines: [{ text: 'Çocuğunun gelişimi' }, { text: '*cebinde.*', at: 1.5, size: 170 }] },
      r('veli-sporcular', 'Sporcularım', 'Ders, ödeme ve devam *tek ekranda*', 'Yalnızca kendi çocuğunun bilgilerini görürsün.', [c('Wallet', 'Ödeme durumu'), c('CalendarCheck', 'Devam takibi')], { kIcon: 'Baby' }),
      r('veli-performans', 'Performans', 'Gelişimini *grafikle* izle', 'Dereceler ve antrenör yorumları tek raporda.', [c('TrendingUp', 'Gelişim grafiği'), c('MessageCircle', 'Antrenör yorumu')], { kIcon: 'ChartLine', scroll: true, flip: true }),
      r('veli-barajlar', 'Barajlar', 'Yaşına uygun *barajları* gör', 'Federasyon barajları her gün güncellenir.', [c('RefreshCw', 'Her gün güncel'), c('BadgeCheck', 'Geçilenler işaretli')], { kIcon: 'Target', scroll: true }),
      r('canli-sonuc', 'Canlı sonuçlar', 'Yarış sonuçlarını *anında* takip et', 'Sonuçlar uygulamanın içinde, kendiliğinden yenilenir.', [c('Radio', 'Canlı sonuçlar'), c('Search', 'Sporcunu ara')], { kIcon: 'Radio', flip: true }),
      r('antrenor-mesaj', 'İletişim', 'Antrenörüne *kolayca* ulaş', 'Yazılı mesaj, sesli mesaj ve sesli arama.', [c('Mic', 'Sesli mesaj'), c('Phone', 'Sesli arama')], { kIcon: 'MessagesSquare' }),
      end('Her kulaçta *yanında.*'),
    ],
  },
];
