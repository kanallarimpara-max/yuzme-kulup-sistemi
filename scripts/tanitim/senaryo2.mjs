// Tanıtım filmi ve rol reelslerinin sahne akışı. Her sahne müziğin ölçüsüne (bar) oturur.
// energy: 1 anlatım altı ritim, 2 dolu ritim, 3 patlama. vo: kullanıcının seslendireceği metin.
import { BRAND, URL_TEXT } from './motor.mjs';

const dev = (bars, energy, shot, kicker, title, points, vo, more = {}) => ({ type: 'device', bars, energy, shot, kicker, title, points, vo, ...more });
const chapter = (no, title, sub, icon, color, vo) => ({ type: 'chapter', bars: 2, energy: 2, no, title, sub, icon, color, vo });

export const FILM = {
  file: 'tanitim-filmi', wide: true, bpm: 118, seed: 2, transpose: 0, tail: 2.5,
  scenes: [
    { type: 'strike', bars: 4, energy: 1, items: ['Defterler.', 'Tablolar.', 'Mesaj grupları.', 'Kayıp dekontlar.'], answer: 'Artık hepsi *tek kulvarda.*', vo: 'Bir yüzme kulübünü yönetmek; defterler, tablolar, onlarca mesaj grubu ve kaybolan dekontlar demekti. Artık değil.' },
    { type: 'logo', bars: 4, energy: 3, tagline: 'Kulübünün bütün işleri *tek uygulamada.*', platforms: true, vo: `Karşınızda ${BRAND}. Kulübünüzün bütün işleri tek uygulamada.` },
    { type: 'trio', bars: 3, energy: 2, laptop: 'admin-panel', tablet: 'krono-ekran', phone: 'veli-performans', title: 'Her cihazda *aynı sistem.*', vo: 'Web sitesinde, Android telefonda ve Windows bilgisayarda aynı sistem, aynı veriler.' },
    dev(3, 1, 'tanitim', 'Görünüm', 'Karanlık ve aydınlık mod', ['Tek dokunuşla değişir', 'Cihaz ayarını izler', 'Seçimin saklanır'], 'Gece karanlık, gündüz aydınlık. Görünüm tek dokunuşla değişir.', { device: 'laptop', light: 'tanitim-acik', kIcon: 'SunMoon', icons: ['MousePointerClick', 'MonitorSmartphone', 'Save'], tap: false, push: 1.0 }),
    { type: 'roles', bars: 3, energy: 1, title: 'Beş rol, *herkes kendi ekranında.*', items: [['Crown', 'Sistem sahibi', 'Tüm platform', '#ffd166'], ['Building2', 'Yönetici', 'Kulübün sahibi', '#3ff0ff'], ['ClipboardList', 'Sekreter', 'Kayıt ve ödeme', '#ff7eb6'], ['Timer', 'Antrenör', 'Havuz başı', '#b8ff5c'], ['Heart', 'Veli', 'Çocuğun gelişimi', '#b48cff']], vo: 'Sistem sahibi, yönetici, sekreter, antrenör ve veli. Herkes yalnızca yetkili olduğu bilgiyi görür.' },

    chapter('01', 'Sistem sahibi', 'Bütün kulüpler tek panelde', 'Crown', '#ffd166', 'İlk durak, platformun sahibi.'),
    dev(3, 1, 'super-panel', 'Sistem sahibi', 'Platformun nabzı tek ekranda', ['Kulüp ve kullanıcı sayıları', 'Satışlar', 'Bekleyen talepler'], 'Bütün kulüpleri, kullanıcıları, satışları ve bekleyen talepleri tek bakışta görürsünüz.', { kIcon: 'Crown', icons: ['Users', 'TrendingUp', 'BellRing'] }),
    dev(3, 1, 'super-platform', 'Sistem sahibi', 'Kulüp aç, uygulamayı tasarla', ['Kulüp ve yönetici açma', 'Ad, logo ve renkler', 'Reklam alanları'], 'Yeni kulüp ve yönetici açar; uygulamanın adını, logosunu, renklerini ve reklam alanlarını yönetirsiniz.', { flip: true, kIcon: 'Palette', icons: ['Building2', 'Palette', 'Megaphone'] }),
    dev(3, 1, 'super-kredi', 'Kredi', 'Dekontlar tek yerden onaylanır', ['Kredi yükleme', 'Kredi paketleri', 'Bozdurma talepleri'], 'Kredi yükleme dekontlarını onaylar, paketleri ve bozdurma taleplerini tek yerden yönetirsiniz.', { kIcon: 'Coins', icons: ['Receipt', 'Package', 'ArrowLeftRight'] }),

    chapter('02', 'Kulüp yöneticisi', 'Kulübün tamamı kontrol altında', 'Building2', '#3ff0ff', 'Sırada kulübün sahibi: yönetici.'),
    dev(3, 1, 'admin-panel', 'Yönetici', 'Günün özeti cebinde', ['Bugünkü dersler', 'Öğrenci ve şube sayısı', 'Günün programı'], 'Bugünün dersleri, öğrenci ve şube sayıları, günün programı. Hepsi ilk ekranda.', { device: 'tablet', flip: true, kIcon: 'LayoutDashboard', icons: ['CalendarDays', 'Users', 'Clock'] }),
    dev(3, 1, 'admin-dersler', 'Yönetici', 'Ders planı dakikalar içinde', ['Gün, saat ve kontenjan', 'Antrenör uygunluğu kontrol edilir', 'Bitiş tarihi kendiliğinden'], 'Ders açarken antrenörün uygunluğu kontrol edilir, bitiş tarihi kendiliğinden hesaplanır.', { kIcon: 'BookOpen', icons: ['CalendarClock', 'UserCheck', 'CalendarCheck'] }),
    dev(3, 1, 'admin-finans', 'Finans', 'Kârını anlık gör', ['Ciro ve tahsilat', 'Gider ve maaş', 'Net kâr grafiği'], 'Ciro, tahsilat, gider, maaş ve net kâr; her an güncel, her an önünüzde.', { flip: true, kIcon: 'Banknote', icons: ['Wallet', 'Receipt', 'ChartLine'] }),
    dev(3, 1, 'admin-derece', 'Yarış', 'Yarış derecesi yöneticiden', ['Barajlara otomatik yansır', 'Performansa işlenir', 'Antrenman derecesinden ayrı'], 'Yarış derecelerini yönetici girer; barajlar ve performans raporları kendiliğinden güncellenir.', { kIcon: 'Medal', icons: ['Target', 'ChartLine', 'Split'] }),

    chapter('03', 'Sekreter', 'Ön kayıttan tahsilata', 'ClipboardList', '#ff7eb6', 'Şimdi kayıt ve ödeme işlerine bakalım.'),
    dev(3, 1, 'onkayit-formu', 'Ön kayıt', 'Kulübüne özel başvuru formu', ['Bağlantıyla paylaşılır', 'Logo, renk ve video', 'Veli hesabı birlikte açılır'], 'Kulübünüze özel ön kayıt formunu bir bağlantıyla paylaşırsınız. Veli hesabı başvuruyla birlikte açılır.', { device: 'phone', scroll: true, kIcon: 'Link', icons: ['Share2', 'Palette', 'UserPlus'] }),
    dev(3, 1, 'sekreter-kayit', 'Kayıt', 'Tek dokunuşla kesin kayıt', ['Başvurular listelenir', 'Forma otomatik aktarılır', 'İndirim ve taksit planı'], 'Gelen başvuru tek dokunuşla kayda dönüşür; indirim ve taksit planı hazır olur.', { flip: true, kIcon: 'UserPlus', icons: ['Inbox', 'FileInput', 'Percent'] }),
    dev(3, 1, 'sekreter-taksit', 'Tahsilat', 'Kim ne kadar ödedi, anında gör', ['Vade takibi', 'Geciken ödemeler', 'Tek tuşla tahsil'], 'Taksitleri, vadeleri ve geciken ödemeleri izler, tahsilatı tek tuşla işlersiniz.', { device: 'phone', kIcon: 'Wallet', icons: ['CalendarClock', 'AlertTriangle', 'CircleCheck'] }),

    chapter('04', 'Antrenör', 'Havuz başında her şey elinin altında', 'Timer', '#b8ff5c', 'Sıra havuz başındaki antrenörde.'),
    dev(3, 1, 'antrenor-yoklama', 'Akıllı yoklama', 'Ders saatinde kendiliğinden açılır', ['Telefonun saatine bakar', 'Öğrenciler hazır gelir', 'Tek kaydet düğmesi'], 'Yoklama, telefonun tarih ve saatine bakarak o anki dersi kendiliğinden açar.', { device: 'phone', flip: true, kIcon: 'ClipboardCheck', icons: ['Clock', 'Users', 'Save'] }),
    dev(3, 1, 'antrenor-rapor', 'Rapor', 'Ders ders yoklama tablosu', ['Birinci, ikinci, üçüncü ders', 'Girilmeyen ders görünür', 'PDF olarak indir'], 'Devam raporu, öğrencinin sayfasında ders ders tablo halinde hazırdır.', { kIcon: 'Table', icons: ['ListOrdered', 'EyeOff', 'FileDown'] }),
    dev(3, 1, 'antrenor-antrenman', 'Antrenman', 'Setlerini saniyesine kadar kur', ['Tekrar ve mesafe', 'Çıkış ve dinlenme', 'Derse ata, veliye bildir'], 'Set, tekrar, mesafe ve dinlenme süreleriyle antrenmanınızı kurar, derse atarsınız.', { flip: true, kIcon: 'Dumbbell', icons: ['Repeat', 'TimerReset', 'Send'] }),
    { type: 'remote', bars: 3, energy: 3, tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Kronometre', title: 'Dev ekran havuzda, *kumanda cebinde.*', chips: [{ icon: 'Radio', text: 'Canlı eşitleme' }, { icon: 'Volume2', text: 'Kulvar başına çıkış sesi' }], vo: 'Çok kulvarlı kronometre tablette, kumandası telefonunuzda. Her kulvarı canlı izlersiniz.' },
    dev(3, 2, 'krono-kilit', 'Dokunma kilidi', 'Su sıçrasa da ekran bozulmaz', ['Dokunmalar engellenir', 'Kilit kumandadan açılır', 'Ekran uykuya geçmez'], 'Dokunma kilidi açıkken ekrana sıçrayan su bile uygulamayı etkilemez.', { device: 'tablet', flip: true, kIcon: 'Lock', icons: ['Hand', 'Smartphone', 'Sun'] }),
    { type: 'ai', bars: 3, energy: 3, shot: 'ders-analizi', device: 'laptop', kicker: 'Yapay zekâ', title: 'O saatteki dersi *analiz eder.*', points: [], flip: true, tap: false, push: 1.0, lines: ['En güçlü stil: serbest', 'En eksik stil: kurbağa, barajdan %9,6 uzak', 'Kelebek 2 sporcuda hiç ölçülmedi', 'Öncelik: kurbağa tekniği ve dönüşler'], vo: 'Yapay zekâ, o saatteki dersi derecelere göre stil stil analiz eder.' },
    dev(3, 2, 'ders-program', 'Yapay zekâ', 'Günlük, haftalık, aylık program', ['Antrenörün isteğine göre', 'Eksik stile öncelik', 'Kaydet, kopyala'], 'İsterseniz eksik stillere odaklanan günlük, haftalık ya da aylık antrenman programı önerir.', { device: 'phone', kIcon: 'Sparkles', icons: ['MessageSquareText', 'Target', 'Save'], tap: false }),
    dev(3, 1, 'antrenor-pazar', 'Antrenman pazarı', 'Antrenmanını paylaş, kazan', ['Kredi ile satış', 'Hazır antrenman satın al', 'Kazancını bozdur'], 'Antrenörler hazırladıkları antrenmanları kredi karşılığında paylaşabilir.', { kIcon: 'Store', icons: ['Coins', 'ShoppingCart', 'ArrowLeftRight'] }),

    chapter('05', 'Veli', 'Çocuğunun gelişimi cebinde', 'Heart', '#b48cff', 'Ve son olarak veli.'),
    dev(3, 1, 'veli-sporcular', 'Sporcularım', 'Ders, ödeme, devam tek ekranda', ['Yalnız kendi çocuğu', 'Ödeme durumu', 'Devam takibi'], 'Veli yalnızca kendi çocuğunun dersini, ödemesini ve devam durumunu görür.', { device: 'phone', flip: true, kIcon: 'Baby', icons: ['ShieldCheck', 'Wallet', 'CalendarCheck'] }),
    dev(3, 1, 'veli-performans', 'Performans', 'Gelişimi grafikle izle', ['Gelişim grafiği', 'Antrenör yorumları', 'Yapay zekâ önerisi'], 'Gelişim grafikleri, antrenör yorumları ve yapay zekâ önerileri tek raporda.', { device: 'phone', scroll: true, kIcon: 'ChartLine', icons: ['TrendingUp', 'MessageCircle', 'Sparkles'] }),
    dev(3, 1, 'veli-barajlar', 'Barajlar', 'Yaşına uygun TYF barajları', ['Her gün kontrol edilir', 'Yeni reglaman kendiliğinden gelir', 'Geçilenler işaretlenir'], 'Federasyon barajları her gün kontrol edilir ve sporcunun yaşına göre gösterilir.', { device: 'phone', flip: true, kIcon: 'Target', icons: ['RefreshCw', 'FileText', 'BadgeCheck'] }),
    dev(3, 2, 'canli-sonuc', 'Canlı sonuçlar', 'Yarış uygulamanın içinde', ['Başka siteye gitmeden', 'Kulübün vurgulanır', 'Yeni sonuçlar kendiliğinden'], 'Canlı yarış sonuçları başka bir siteye gitmeden uygulamada açılır, kulübünüz öne çıkar.', { device: 'tablet', kIcon: 'Radio', icons: ['Smartphone', 'Highlighter', 'RefreshCw'] }),
    dev(3, 1, 'antrenor-mesaj', 'İletişim', 'Mesaj ve sesli arama içeride', ['Yazılı ve sesli mesaj', 'Ders grupları', 'Sesli ve grup araması'], 'Yazılı ve sesli mesaj, ders grupları ve sesli arama sistemin içinde.', { device: 'phone', flip: true, kIcon: 'MessagesSquare', icons: ['Mic', 'Users', 'Phone'] }),
    dev(3, 1, 'sosyal', 'Sosyal', 'Başarılar kulüp akışında', ['Fotoğraf, derece, madalya', 'Beğeni ve yorum', 'Açık veya gizli profil'], 'Kulüp akışında başarılar paylaşılır, beğenilir, yorumlanır.', { device: 'phone', kIcon: 'Camera', icons: ['Image', 'Heart', 'Lock'] }),

    { type: 'wall', bars: 3, energy: 3, title: 'Hepsi *tek uygulamada.*', items: [['UserPlus', 'Ön kayıt'], ['Wallet', 'Taksit ve tahsilat'], ['ClipboardCheck', 'Akıllı yoklama'], ['Dumbbell', 'Antrenman'], ['Timer', 'Kronometre'], ['Sparkles', 'Yapay zekâ'], ['Radio', 'Canlı sonuçlar'], ['Target', 'TYF barajları'], ['ChartLine', 'Performans'], ['MessagesSquare', 'Mesaj ve arama'], ['Camera', 'Sosyal akış'], ['ShoppingBag', 'Market']], vo: 'Ön kayıttan kronometreye, yapay zekâdan canlı sonuçlara. Hepsi tek uygulamada.' },
    { type: 'stats', bars: 3, energy: 3, title: 'Rakamlarla', items: [[5, 'rol'], [3, 'platform'], [2060, 'TYF barajı', '+']], vo: 'Beş rol, üç platform ve her gün güncellenen iki binden fazla federasyon barajı.' },
    { type: 'logo', bars: 4, energy: 3, tagline: 'Kulübünü *tek kulvarda* yönet.', platforms: true, url: URL_TEXT, vo: `${BRAND}. Kulübünüzü tek kulvarda yönetin.` },
  ],
};

const end = (vo) => ({ type: 'logo', bars: 2, energy: 3, tagline: 'Web · Android · Windows', url: URL_TEXT, vo });
const r = (shot, kicker, title, chips, vo, more = {}) => ({ type: 'device', bars: 2, energy: 3, shot, kicker, title, chips, vo, ...more });
const c = (icon, text) => ({ icon, text });

export const REELS = [
  {
    file: 'reels-1-sistem-sahibi', wide: false, bpm: 124, seed: 3, transpose: 2, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Sistem sahibi', icon: 'Crown', lines: [{ text: 'Bütün kulüpler' }, { text: '*tek ekranda.*', at: 1.5, size: 140 }, { text: 'Gerçekten.', at: 4, size: 80 }], vo: 'Bütün kulüplerini tek ekrandan yönetmek ister misin?' },
      r('super-panel', 'Platform', 'Nabız *tek bakışta*', [c('Building2', 'Kulüpler'), c('TrendingUp', 'Satışlar')], 'Kulüpler, kullanıcılar, satışlar tek bakışta.', { device: 'laptop', kIcon: 'Crown' }),
      r('super-platform', 'Tasarım', 'Kulüp aç, *tasarla*', [c('Palette', 'Logo ve renk'), c('Megaphone', 'Reklam alanı')], 'Yeni kulüp aç, uygulamayı tasarla.', { kIcon: 'Palette', scroll: true }),
      r('super-kredi', 'Kredi', 'Dekont *tek tıkla* onay', [c('Receipt', 'Dekont'), c('Package', 'Paketler')], 'Kredi dekontlarını tek tıkla onayla.', { kIcon: 'Coins', flip: true }),
      r('super-market', 'Market', 'Ürün ve *sipariş*', [c('ShoppingBag', 'Ürün ekle'), c('Truck', 'Siparişi izle')], 'Marketi ve siparişleri yönet.', { kIcon: 'ShoppingBag' }),
      end('Platformun kontrolü sende.'),
    ],
  },
  {
    file: 'reels-2-kulup-yoneticisi', wide: false, bpm: 124, seed: 4, transpose: 0, tail: 1.6,
    scenes: [
      { type: 'strike', bars: 2, energy: 2, items: ['Defter.', 'Tablo.', 'Mesaj grubu.'], answer: 'Hepsi *tek uygulamada.*', vo: 'Defter, tablo, mesaj grubu... Hepsi tek uygulamada.' },
      r('admin-panel', 'Panel', 'Günün özeti *cebinde*', [c('CalendarDays', 'Bugünkü dersler'), c('Users', 'Öğrenciler')], 'Günün özeti cebinde.', { kIcon: 'LayoutDashboard' }),
      r('admin-finans', 'Finans', 'Kârını *anlık* gör', [c('Wallet', 'Tahsilat'), c('ChartLine', 'Net kâr')], 'Tahsilatını ve kârını anlık gör.', { kIcon: 'Banknote', scroll: true, flip: true }),
      r('admin-dersler', 'Dersler', 'Ders planı *dakikalar* içinde', [c('UserCheck', 'Antrenör uygun mu?'), c('CalendarCheck', 'Bitiş otomatik')], 'Dersleri dakikalar içinde planla.', { kIcon: 'BookOpen', scroll: true }),
      r('canli-sonuc', 'Canlı sonuç', 'Yarış *uygulamanın içinde*', [c('Radio', 'Canlı'), c('Highlighter', 'Kulübün vurgulu')], 'Yarışı uygulamadan çıkmadan izle.', { device: 'tablet', kIcon: 'Radio' }),
      end('Kulübün tek kulvarda.'),
    ],
  },
  {
    file: 'reels-3-sekreter', wide: false, bpm: 124, seed: 5, transpose: 3, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Sekreter', icon: 'ClipboardList', lines: [{ text: 'Kayıt işleri' }, { text: '*dakikalar*', at: 1.5, size: 150 }, { text: 'içinde.', at: 2.5 }], vo: 'Kayıt ve aidat takibi artık dakikalar içinde.' },
      r('onkayit-formu', 'Ön kayıt', 'Bağlantıyı *paylaş*', [c('Link', 'Kulübüne özel'), c('UserPlus', 'Veli hesabı açılır')], 'Ön kayıt bağlantını paylaş.', { kIcon: 'Link', scroll: true }),
      r('sekreter-kayit', 'Kayıt', '*Tek dokunuşla* kayıt', [c('FileInput', 'Forma aktarılır'), c('Percent', 'İndirim ve taksit')], 'Başvuruyu tek dokunuşla kayda çevir.', { kIcon: 'UserPlus', flip: true }),
      r('sekreter-ogrenci', 'Öğrenciler', 'Kim ne kadar *ödedi?*', [c('CircleCheck', 'Ödenen'), c('AlertTriangle', 'Geciken')], 'Kimin ne kadar ödediğini anında gör.', { kIcon: 'Users', scroll: true }),
      r('sekreter-taksit', 'Tahsilat', '*Tek tuşla* tahsil et', [c('CalendarClock', 'Vade takibi'), c('Banknote', 'Ödeme yöntemi')], 'Taksiti tek tuşla tahsil et.', { kIcon: 'Wallet', flip: true }),
      end('Evrak değil, kulüp yönet.'),
    ],
  },
  {
    file: 'reels-4-antrenor', wide: false, bpm: 124, seed: 6, transpose: -2, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Antrenör', icon: 'Timer', lines: [{ text: 'Havuz başındaki' }, { text: '*en iyi*', at: 1.5, size: 160 }, { text: 'yardımcın.', at: 2.5 }], vo: 'Antrenör, bu uygulama tam sana göre.' },
      r('antrenor-yoklama', 'Yoklama', 'Ders saatinde *kendiliğinden*', [c('Clock', 'Saate bakar'), c('Save', 'Tek kaydet')], 'Yoklama ders saatinde kendiliğinden açılır.', { kIcon: 'ClipboardCheck' }),
      { type: 'ai', bars: 2, energy: 3, shot: 'ders-analizi', device: 'phone', scroll: true, kicker: 'Yapay zekâ', title: 'Dersini *analiz eder*', lines: ['En güçlü stil: serbest', 'En eksik: kurbağa', 'Öncelik: dönüşler'], vo: 'Yapay zekâ dersini stil stil analiz eder.' },
      r('ders-program', 'Program', 'Haftalık program *önerir*', [c('Target', 'Eksik stile odak'), c('Save', 'Kaydet')], 'Haftalık programını bile önerir.', { kIcon: 'Sparkles', tap: false, flip: true }),
      { type: 'remote', bars: 2, energy: 3, tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Kronometre', title: 'Kumanda *cebinde*', chips: [c('Radio', 'Canlı eşitleme')], vo: 'Çok kulvarlı kronometreyi telefonundan yönet.' },
      r('krono-kilit', 'Dokunma kilidi', 'Su *ekranı bozamaz*', [c('Hand', 'Dokunma engelli'), c('Smartphone', 'Kumandadan aç')], 'Su sıçrasa bile ekran bozulmaz.', { device: 'tablet', kIcon: 'Lock' }),
      r('antrenor-antrenman', 'Antrenman', 'Setlerini *kur*', [c('Repeat', 'Tekrar, mesafe'), c('Send', 'Derse ata')], 'Antrenmanını setleriyle kur.', { kIcon: 'Dumbbell', scroll: true }),
      end('Sen antrenmana odaklan.'),
    ],
  },
  {
    file: 'reels-5-veli', wide: false, bpm: 124, seed: 7, transpose: 1, tail: 1.6,
    scenes: [
      { type: 'hook', bars: 2, energy: 2, kicker: 'Veli', icon: 'Heart', lines: [{ text: 'Çocuğunun gelişimi' }, { text: '*cebinde.*', at: 1.5, size: 170 }], vo: 'Çocuğunun yüzmede nasıl ilerlediğini merak ediyor musun?' },
      r('veli-sporcular', 'Sporcularım', 'Ders, ödeme, *devam*', [c('ShieldCheck', 'Yalnız senin çocuğun'), c('CalendarCheck', 'Devam takibi')], 'Ders, ödeme ve devam tek ekranda.', { kIcon: 'Baby' }),
      r('veli-performans', 'Performans', 'Gelişimini *izle*', [c('TrendingUp', 'Grafik'), c('MessageCircle', 'Antrenör yorumu')], 'Gelişim grafiğini ve antrenör yorumlarını izle.', { kIcon: 'ChartLine', scroll: true, flip: true }),
      r('veli-barajlar', 'Barajlar', 'Yaşına uygun *barajlar*', [c('RefreshCw', 'Her gün güncel'), c('BadgeCheck', 'Geçilenler işaretli')], 'Yaşına uygun barajları gör.', { kIcon: 'Target', scroll: true }),
      r('canli-sonuc', 'Canlı sonuç', 'Yarışı *anında* takip et', [c('Radio', 'Canlı'), c('Search', 'Sporcunu bul')], 'Yarış sonuçlarını anında takip et.', { kIcon: 'Radio', flip: true }),
      r('antrenor-mesaj', 'Mesaj', 'Antrenöre *kolayca* ulaş', [c('Mic', 'Sesli mesaj'), c('Phone', 'Sesli arama')], 'Antrenörüne kolayca ulaş.', { kIcon: 'MessagesSquare' }),
      end('Her kulaçta yanında.'),
    ],
  },
];
