// Sosyal medya serisi ve şampiyona reklam filmi.
// Sosyal medya: her video tek bir rolün iki özelliğini anlatır (rol adı açılışı, özellik 1, özellik 2, kapanış).
// Reklam filmi: havuz kenarındaki büyük ekran için yatay, sessiz izlense de anlaşılır, sonda telefonla okutulan karekod.
import { URL_TEXT } from './motor.mjs';

const c = (icon, text) => ({ icon, text });
// İlk özellik müziği hazırlar (sonunda kısa sessizlik), ikinci özellik patlamayla girer.
const f1 = (shot, kicker, title, sub, chips, more = {}) => ({ type: 'device', bars: 4, energy: 2, energies: [2, 2, 1, 2], shot, kicker, title, sub, chips, ...more });
const f2 = (shot, kicker, title, sub, chips, more = {}) => ({ type: 'device', bars: 4, energy: 3, shot, kicker, title, sub, chips, ...more });

const ROLES = {
  yonetici: { role: 'KULÜP YÖNETİCİSİ', icon: 'Building2', theme: ['#3ff0ff', '#4b6bff'], end: 'Kulübünü *tek kulvarda* yönet.' },
  sekreter: { role: 'SEKRETER', icon: 'ClipboardList', theme: ['#ff7eb6', '#a55bff'], end: 'Evrakla değil, *sistemle* çalış.' },
  antrenor: { role: 'ANTRENÖR', icon: 'Timer', theme: ['#b8ff5c', '#14c9a2'], end: 'Sen antrenmana *odaklan.*' },
  veli: { role: 'VELİ', icon: 'Heart', theme: ['#c79bff', '#ff6fae'], end: 'Her kulaçta *yanında.*' },
};

let n = 0;
const post = (key, file, line, a, b) => {
  const r = ROLES[key]; n += 1;
  return {
    dir: 'sosyal-medya', file, wide: false, bpm: 128, seed: 10 + n, transpose: [0, 3, -2, 1, 5, -4][n % 6], tail: 1.6, theme: r.theme,
    scenes: [
      { type: 'roleIntro', bars: 2, energy: 3, role: r.role, icon: r.icon, line },
      a, b,
      { type: 'logo', bars: 2, energy: 3, tagline: r.end, platforms: true, url: URL_TEXT, cta: true },
    ],
  };
};

export const SOSYAL = [
  // Kulüp yöneticisi
  post('yonetici', 'yonetici-1-panel-ve-ders-programi', 'Günün özeti ve ders programı.',
    f1('admin-panel', 'Yönetici paneli', 'Günün özeti *tek bakışta*', 'Bugünkü dersler, öğrenciler ve şubeler açılışta önünde.', [c('CalendarDays', 'Bugünkü dersler'), c('Users', 'Öğrenci sayısı')], { kIcon: 'LayoutDashboard' }),
    f2('admin-dersler', 'Ders saatleri', 'Ders programını *dakikalar içinde* kur', 'Antrenörün o saatte uygun olup olmadığını sistem kontrol eder.', [c('UserCheck', 'Uygunluk kontrolü'), c('CalendarCheck', 'Bitiş tarihi hazır')], { kIcon: 'BookOpen', scroll: true, flip: true })),
  post('yonetici', 'yonetici-2-finans-ve-personel', 'Para ve personel tek yerde.',
    f1('admin-finans', 'Gelir ve gider', 'Kârını *anlık* takip et', 'Tahsilat, gider ve maaşlar kendiliğinden hesaplanır.', [c('Wallet', 'Tahsilatlar'), c('ChartLine', 'Aylık kâr')], { kIcon: 'Banknote', scroll: true }),
    f2('admin-personel', 'Personel', 'Antrenör ve sekreterini *hemen* ekle', 'Her biri kendi hesabıyla girer, yalnız kendi ekranını görür.', [c('UserPlus', 'Hesap hemen açılır'), c('MapPin', 'Şubeye atanır')], { kIcon: 'Users', flip: true })),
  post('yonetici', 'yonetici-3-duyuru-ve-canli-sonuc', 'Duyurular ve canlı yarış sonuçları.',
    f1('admin-duyuru', 'Duyuru', 'Duyurunu *herkese anında* ulaştır', 'Tüm kulübe ya da seçtiğin gruba bildirim olarak gider.', [c('Bell', 'Telefona bildirim'), c('Users', 'Hedefli gönderim')], { kIcon: 'Megaphone' }),
    f2('canli-sonuc', 'Canlı sonuçlar', 'Yarışı *uygulamadan* izle', 'Sonuçlar kendiliğinden yenilenir, kulübünün sporcuları öne çıkar.', [c('Radio', 'Canlı sonuçlar'), c('Highlighter', 'Kulübün vurgulu')], { device: 'tablet', kIcon: 'Radio', flip: true })),

  // Sekreter
  post('sekreter', 'sekreter-1-on-kayit-formu', 'Kulübüne özel ön kayıt formu.',
    f1('sekreter-onkayit', 'Form tasarımı', 'Ön kayıt formunu *kulübüne göre* tasarla', 'Logo, renk, başlık ve tanıtım videosu ekle.', [c('Palette', 'Kulübünün rengi'), c('Link', 'Paylaşılabilir bağlantı')], { kIcon: 'Palette', scroll: true }),
    f2('onkayit-formu', 'Ön kayıt', 'Veliler başvuruyu *telefondan* yapar', 'Bağlantıyı paylaş, başvurular birkaç dakikada gelsin.', [c('Smartphone', 'Telefondan başvuru'), c('UserPlus', 'Veli hesabı da açılır')], { kIcon: 'Link', scroll: true, flip: true })),
  post('sekreter', 'sekreter-2-kayit-ve-tahsilat', 'Kesin kayıt ve taksit takibi.',
    f1('sekreter-kayit', 'Kesin kayıt', 'Başvuruyu *tek dokunuşla* kayda çevir', 'Başvurudaki bilgiler kayıt formuna kendiliğinden aktarılır.', [c('Percent', 'İndirim'), c('CalendarClock', 'Taksit planı')], { kIcon: 'UserPlus' }),
    f2('sekreter-taksit', 'Tahsilat', 'Taksiti *tek dokunuşla* tahsil et', 'Vadesi gelen ve geciken taksitler ayrı ayrı listelenir.', [c('AlertTriangle', 'Geciken ödemeler'), c('Banknote', 'Ödeme yöntemi')], { kIcon: 'Wallet', flip: true })),

  // Antrenör
  post('antrenor', 'antrenor-1-yoklama-ve-devam', 'Yoklama ve devam takibi.',
    f1('antrenor-yoklama', 'Akıllı yoklama', 'Yoklama *kendiliğinden* açılır', 'Ders saatinde öğrenci listesi hazır gelir, tek düğmeyle kaydedersin.', [c('Clock', 'Saate göre ders'), c('Save', 'Tek düğmeyle kaydet')], { kIcon: 'ClipboardCheck' }),
    f2('antrenor-rapor', 'Devam raporu', 'Her öğrencinin *devam tablosu*', 'Hangi derse gelip gelmediği tek tabloda görünür.', [c('ListOrdered', '1., 2., 3. ders'), c('FileDown', 'PDF olarak indir')], { kIcon: 'Table', flip: true })),
  post('antrenor', 'antrenor-2-yapay-zeka', 'Yapay zekâ yardımcın.',
    { type: 'ai', bars: 4, energy: 2, energies: [2, 2, 1, 2], shot: 'ders-analizi', device: 'phone', scroll: true, kicker: 'Yapay zekâ', title: 'Dersini *stil stil* analiz eder', sub: 'Güçlü ve eksik stilleri derecelere bakarak bulur.', lines: ['En güçlü stil: serbest', 'Geliştirilecek stil: kurbağa', 'Öncelik: dönüş çalışması'] },
    f2('ders-program', 'Program önerisi', 'Haftalık programını *hazırlar*', 'Ne istediğini yaz, eksik stillere odaklanan program gelsin.', [c('CalendarDays', 'Günlük, haftalık, aylık'), c('Save', 'Kaydet ve paylaş')], { kIcon: 'Sparkles', tap: false, flip: true })),
  post('antrenor', 'antrenor-3-kronometre', 'Havuz başında kronometre.',
    { type: 'remote', bars: 4, energy: 2, energies: [2, 2, 1, 2], tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Kronometre', title: 'Kronometrenin kumandası *cebinde*', sub: 'Tablette büyük ekran, telefonda kumanda.', chips: [c('Radio', 'Anlık eşitleme'), c('Volume2', 'Kulvar başına çıkış sesi')] },
    f2('krono-kilit', 'Dokunma kilidi', 'Su sıçrasa da *kronometre durmaz*', 'Kilit açıkken ekran dokunuşlara tepki vermez.', [c('Hand', 'Dokunmalar engellenir'), c('Smartphone', 'Kilidi telefondan aç')], { device: 'tablet', kIcon: 'Lock' })),
  post('antrenor', 'antrenor-4-antrenman-ve-pazar', 'Antrenmanını hazırla, paylaş.',
    f1('antrenor-antrenman', 'Antrenman', 'Antrenmanını *set set* hazırla', 'Tekrar, mesafe ve dinlenme süresini gir, derse ata.', [c('Repeat', 'Tekrar ve mesafe'), c('Send', 'Velilere bildirilir')], { kIcon: 'Dumbbell', scroll: true }),
    f2('antrenor-pazar', 'Antrenman pazarı', 'Antrenmanlarını *kredi karşılığında* sun', 'Hazırladığın antrenmanları diğer antrenörlerle paylaş.', [c('Coins', 'Kredi kazan'), c('ShoppingCart', 'Hazır antrenman al')], { kIcon: 'Store', flip: true })),
  post('antrenor', 'antrenor-5-musaitlik-ve-derece', 'Müsaitlik ve antrenman dereceleri.',
    f1('antrenor-musait', 'Müsaitlik', 'Uygun saatlerini *dokunarak* işaretle', 'Yönetici ders açarken uygunluğunu kendiliğinden görür.', [c('CalendarCheck', 'Haftalık takvim'), c('UserCheck', 'Otomatik kontrol')], { kIcon: 'CalendarClock', scroll: true }),
    f2('antrenor-derece', 'Antrenman derecesi', 'Dereceleri *havuz başında* gir', 'Stili, mesafeyi ve havuzu seç; grubun sürelerini yaz.', [c('Users', 'Grup grup giriş'), c('ChartLine', 'Gelişim grafiğine işlenir')], { kIcon: 'Timer', scroll: true, flip: true })),

  // Veli
  post('veli', 'veli-1-sporcu-ve-performans', 'Çocuğunun gelişimi cebinde.',
    f1('veli-sporcular', 'Sporcularım', 'Ders, ödeme ve devam *tek ekranda*', 'Yalnızca kendi çocuğunun bilgilerini görürsün.', [c('Wallet', 'Ödeme durumu'), c('CalendarCheck', 'Devam takibi')], { kIcon: 'Baby' }),
    f2('veli-performans', 'Performans', 'Gelişimini *grafikle* izle', 'Dereceler ve antrenör yorumları tek raporda.', [c('TrendingUp', 'Gelişim grafiği'), c('MessageCircle', 'Antrenör yorumu')], { kIcon: 'ChartLine', scroll: true, flip: true })),
  post('veli', 'veli-2-barajlar-ve-canli-sonuc', 'Yarış günü yanında.',
    f1('veli-barajlar', 'Barajlar', 'Yaşına uygun *barajları* gör', 'Federasyon barajları her gün güncellenir.', [c('RefreshCw', 'Her gün güncel'), c('BadgeCheck', 'Geçilenler işaretli')], { kIcon: 'Target', scroll: true }),
    f2('canli-sonuc', 'Canlı sonuçlar', 'Yarış sonuçlarını *anında* takip et', 'Sonuçlar uygulamanın içinde, kendiliğinden yenilenir.', [c('Radio', 'Canlı sonuçlar'), c('Search', 'Sporcunu ara')], { kIcon: 'Radio', flip: true })),
  post('veli', 'veli-3-iletisim-ve-sosyal', 'Antrenörüne ve kulübüne yakın.',
    f1('antrenor-mesaj', 'İletişim', 'Antrenörüne *kolayca* ulaş', 'Yazılı mesaj, sesli mesaj ve sesli arama.', [c('Mic', 'Sesli mesaj'), c('Phone', 'Sesli arama')], { kIcon: 'MessagesSquare' }),
    f2('sosyal', 'Sosyal akış', 'Başarıları *kulüp akışında* paylaş', 'Fotoğraf, derece ve madalyalar akışta yer alır.', [c('Heart', 'Beğeni ve yorum'), c('Lock', 'Gizli profil seçeneği')], { kIcon: 'Camera', scroll: true, flip: true })),
];

// Türkiye Şampiyonası büyük ekran reklamı: yaklaşık 1 dakika, yatay 1920x1080.
const ad = (shot, kicker, kIcon, title, sub, more = {}) => ({ type: 'device', bars: 2, energy: 3, shot, kicker, kIcon, title, sub, points: [], tap: false, ...more });
export const REKLAM = {
  file: 'reklam-filmi-sampiyona', wide: true, punchy: true, bpm: 124, seed: 3, transpose: 2, tail: 2.5, theme: ['#3ff0ff', '#4b6bff'],
  scenes: [
    { type: 'hook', bars: 3, energy: 1, lines: [{ text: 'Havuzda *her saniye* önemli.', at: 0 }, { text: 'Havuzun dışında da.', at: 5 }], icon: 'Waves' },
    { type: 'strike', bars: 3, energy: 1, energies: [1, 2, 2], items: ['Kâğıt yoklamalar', 'Excel tabloları', 'Dağınık mesajlar', 'Kaybolan dekontlar'], answer: 'Hepsi artık *tek kulvarda.*' },
    { type: 'logo', bars: 3, energy: 3, tagline: 'Yüzme kulüpleri için *hepsi bir arada* yönetim sistemi', platforms: true },
    ad('admin-finans', 'Kulüp yöneticisi', 'Building2', 'Kulübün parası *anlık* önünüzde', 'Tahsilat, gider ve maaşlar tek ekranda.', { device: 'laptop', energy: 2 }),
    ad('onkayit-formu', 'Sekreter', 'ClipboardList', 'Ön kayıt *telefondan*, kayıt *tek dokunuşla*', 'Başvurular kayıt formuna kendiliğinden aktarılır.', { device: 'phone', scroll: true, flip: true, energy: 2, energies: [2, 1] }),
    { type: 'remote', bars: 3, energy: 3, tablet: 'krono-ekran', phone: 'krono-kontrol', kicker: 'Antrenör', title: 'Kronometrenin kumandası *cebinizde*', sub: 'Tablette büyük ekran, telefonda kumanda. Kulvarlar anlık eşitlenir.', chips: [c('Radio', 'Anlık eşitleme'), c('Lock', 'Dokunma kilidi')] },
    { type: 'ai', bars: 3, energy: 3, shot: 'ders-analizi', device: 'laptop', kicker: 'Yapay zekâ', kIcon: 'Sparkles', title: 'Sporcularınızı *stil stil* analiz eder', sub: 'Eksik stillere göre antrenman programı önerir.', points: [], flip: true, tap: false, push: 1.0, lines: ['En güçlü stil: serbest', 'Geliştirilmesi gereken stil: kurbağa', 'Öncelik: kurbağa tekniği ve dönüşler'] },
    ad('veli-performans', 'Veli', 'Heart', 'Çocuğunuzun gelişimi *cebinizde*', 'Dereceler, devam ve antrenör yorumları tek yerde.', { device: 'phone', scroll: true }),
    ad('canli-sonuc', 'Canlı sonuçlar', 'Radio', 'Yarış sonuçları *uygulamanın içinde*', 'TYF yarışları ve barajları kendiliğinden güncellenir.', { device: 'tablet', flip: true }),
    { type: 'wall', bars: 3, energy: 3, title: 'Hepsi *tek uygulamada*', items: [['UserPlus', 'Ön kayıt'], ['Wallet', 'Taksit ve tahsilat'], ['ClipboardCheck', 'Akıllı yoklama'], ['Dumbbell', 'Antrenman'], ['Timer', 'Kronometre'], ['Sparkles', 'Yapay zekâ'], ['Radio', 'Canlı sonuçlar'], ['Target', 'TYF barajları'], ['ChartLine', 'Performans'], ['MessagesSquare', 'Mesaj ve arama'], ['Camera', 'Sosyal akış'], ['ShoppingBag', 'Market']] },
    { type: 'finale', bars: 5, energy: 3, tagline: 'Kulübünüzü *tek kulvarda* yönetin.', url: URL_TEXT, qrTitle: 'Hemen deneyin', qrSub: 'Telefonunuzun kamerasıyla okutun' },
  ],
};
