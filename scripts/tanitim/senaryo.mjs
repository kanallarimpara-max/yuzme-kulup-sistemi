// Film ve rol videolarının metinleri. Her sahne gerçek uygulama ekranını gösterir, veriler kurgusaldır.
const s = (shot, kicker, title, points, speak) => ({ shot, kicker, title, points, speak });
const cover = (kicker, title, sub, speak) => ({ cover: true, kicker, title, points: [sub], speak });

export const FILM = {
  file: 'tanitim-filmi', music: { root: 146.83, bpm: 92, seed: 1 },
  scenes: [
    cover('Yüzme kulüpleri için', 'Kulübünün bütün işleri tek kulvarda.', 'Web, Android ve Windows', 'Kayıt, aidat, antrenman, yoklama, yarış ve iletişim. Bir yüzme kulübünün bütün işleri artık tek bir sistemde.'),
    s('tanitim', 'Başlangıç', 'Tek sistem, her cihaz', ['Web sitesi', 'Android uygulaması', 'Windows programı'], 'Sistem web sitesinde, Android telefonda ve Windows bilgisayarda aynı şekilde çalışır.'),
    s('tanitim-acik', 'Görünüm', 'Karanlık ve aydınlık mod', ['Tek dokunuşla değişir', 'Cihaz ayarını izler', 'Seçimin saklanır'], 'Karanlık ve aydınlık mod arasında tek dokunuşla geçebilirsin.'),
    s('giris', 'Güvenli giriş', 'Herkes yalnız kendi ekranını görür', ['Beş ayrı rol', 'Rol bazlı veri yetkisi', 'Şifre yenileme'], 'Sistem sahibi, kulüp yöneticisi, sekreter, antrenör ve veli. Herkes yalnız yetkili olduğu bilgiyi görür.'),
    cover('Bölüm 1', 'Sistem sahibi', 'Bütün kulüpler tek panelde', 'İlk durağımız, platformun sahibi olan süper admin.'),
    s('super-panel', 'Süper admin', 'Platform özeti', ['Kulüp ve kullanıcı sayıları', 'Satışlar', 'Bekleyen talepler'], 'Platform özetinde kulüpleri, kullanıcıları, satışları ve bekleyen talepleri tek bakışta görürsün.'),
    s('super-platform', 'Süper admin', 'Kulüp aç, tasarımı yönet', ['Kulüp ve yönetici açma', 'Uygulama adı, logo, renk', 'Satış ve reklam alanları'], 'Yeni kulüp ve yönetici açar, uygulamanın adını, logosunu, renklerini ve reklam alanlarını yönetirsin.'),
    s('super-kredi', 'Süper admin', 'Kredi yönetimi', ['Dekont onayı', 'Kredi paketleri', 'Bozdurma talepleri'], 'Kredi yükleme dekontlarını onaylar, paketleri ve bozdurma taleplerini yönetirsin.'),
    cover('Bölüm 2', 'Kulüp yöneticisi', 'Kulübün tamamı kontrol altında', 'Sırada kulübün sahibi olan yönetici var.'),
    s('admin-panel', 'Yönetici', 'Günün özeti', ['Bugünkü dersler', 'Öğrenci ve şube sayısı', 'Günün programı'], 'Yönetici paneli bugünün derslerini, öğrenci ve şube sayılarını gösterir.'),
    s('admin-kulup', 'Yönetici', 'Kulüp ayarları', ['Şubeler', 'Eğitim modelleri', 'Ödeme yöntemleri'], 'Şubelerini, eğitim modellerini ve ödeme yöntemlerini buradan kurarsın.'),
    s('admin-dersler', 'Yönetici', 'Ders saatleri', ['Gün, saat ve kontenjan', 'Antrenör uygunluğu', 'Otomatik bitiş tarihi'], 'Ders açarken antrenörün uygunluğu kontrol edilir, bitiş tarihi kendiliğinden hesaplanır.'),
    s('admin-finans', 'Yönetici', 'Gelir ve gider', ['Ciro ve tahsilat', 'Gider ve maaş', 'Net kâr grafiği'], 'Ciro, tahsilat, gider, maaş ve net kâr her an güncel olarak önünde.'),
    s('admin-personel', 'Yönetici', 'Personel', ['Antrenör ve sekreter açma', 'Şube atama', 'İndirim kodları'], 'Antrenör ve sekreter hesaplarını açar, şubelere atarsın.'),
    s('admin-derece', 'Yönetici', 'Yarış dereceleri', ['Yarış derecesini yönetici girer', 'Barajlara otomatik yansır', 'Antrenman derecesinden ayrıdır'], 'Yarış derecelerini yönetici girer. Barajlar yalnızca yarış dereceleriyle hesaplanır.'),
    cover('Bölüm 3', 'Sekreter', 'Ön kayıttan tahsilata', 'Şimdi kayıt ve ödeme işlerini yürüten sekretere bakalım.'),
    s('onkayit-formu', 'Ön kayıt', 'Kulübüne özel başvuru formu', ['Bağlantıyla paylaşılır', 'Logo, renk ve video', 'Veli hesabı birlikte açılır'], 'Kulübüne özel ön kayıt formunu bağlantıyla paylaşırsın. Veli hesabı başvuruyla birlikte açılır.'),
    s('sekreter-kayit', 'Sekreter', 'Tek dokunuşla kesin kayıt', ['Başvurular listelenir', 'Forma otomatik aktarılır', 'İndirim ve taksit'], 'Gelen başvuru tek dokunuşla kayıt formuna aktarılır, indirim ve taksit planı oluşturulur.'),
    s('sekreter-taksit', 'Sekreter', 'Taksit ve tahsilat', ['Vade takibi', 'Geciken ödemeler', 'Tek tuşla tahsil'], 'Taksitleri, vadeleri ve geciken ödemeleri izler, tahsilatı tek tuşla işlersin.'),
    cover('Bölüm 4', 'Antrenör', 'Havuz başında her şey elinin altında', 'Sıra havuz başındaki antrenörde.'),
    s('antrenor-yoklama', 'Antrenör', 'Akıllı yoklama', ['Ders saatinde otomatik açılır', 'Öğrenciler kendiliğinden gelir', 'Tek kaydet düğmesi'], 'Yoklama, telefonun tarih ve saatine göre o anki dersi otomatik açar.'),
    s('antrenor-rapor', 'Antrenör', 'Ders ders yoklama raporu', ['Birinci, ikinci, üçüncü ders', 'Girilmeyen dersler görünür', 'PDF olarak indir'], 'Rapor, öğrenci sayfasında ders ders tablo halinde görünür ve PDF olarak indirilir.'),
    s('antrenor-ogrenci', 'Antrenör', 'Öğrenci yorumları', ['Geçmiş yorumlar', 'Yeni yorum', 'Veli performansta görür'], 'Her öğrenciye yaptığın yorumları görür, yenisini eklersin. Veli de bu yorumları izler.'),
    s('antrenor-derece', 'Antrenör', 'Antrenman dereceleri', ['Tüm grup tek ekranda', 'Stil, mesafe, havuz', 'Gelişim grafiğine işlenir'], 'Antrenman derecelerini grup halinde hızlıca girersin.'),
    s('antrenor-antrenman', 'Antrenör', 'Antrenman oluşturucu', ['Set, tekrar ve mesafe', 'Çıkış ve dinlenme süresi', 'Derse atama'], 'Set, tekrar, mesafe ve dinlenme süreleriyle antrenmanını hazırlayıp derse atarsın.'),
    s('krono-ekran', 'Kronometre', 'Çok kulvarlı dev ekran', ['Her kulvara ayrı antrenman', 'Renkli süre uyarıları', 'Sesli çıkış'], 'Çok kulvarlı kronometrede her kulvar kendi antrenmanını yapar, ekran renkleriyle yüzücüyü yönlendirir.'),
    s('krono-kontrol', 'Kronometre', 'Başka cihazdan uzaktan kontrol', ['Kulvar ne yapıyor', 'Sıradaki çıkış saati', 'Kulvar başına ses'], 'Başka bir cihazdan her kulvarın durumunu, sıradaki çıkışı ve bitiş saatini canlı izlersin.'),
    s('krono-kilit', 'Kronometre', 'Dokunma kilidi', ['Su damlası ekranı etkilemez', 'Kilit kumandadan açılır', 'Ekran uykuya geçmez'], 'Dokunma kilidi açıkken ekrana sıçrayan su uygulamayı etkilemez.'),
    s('antrenor-pazar', 'Antrenör', 'Antrenman pazarı', ['Antrenmanını sat', 'Kredi ile satın al', 'Kazancını bozdur'], 'Antrenörler hazırladıkları antrenmanları kredi karşılığında paylaşabilir.'),
    cover('Bölüm 5', 'Veli', 'Çocuğunun gelişimi cebinde', 'Ve son olarak veli.'),
    s('veli-sporcular', 'Veli', 'Sporcularım', ['Ders ve antrenör', 'Ödeme durumu', 'Devam takibi'], 'Veli yalnızca kendi çocuğunun dersini, ödemesini ve devam durumunu görür.'),
    s('veli-performans', 'Veli', 'Performans raporu', ['Gelişim grafiği', 'Antrenör yorumları', 'Yapay zekâ önerisi'], 'Gelişim grafikleri, antrenör yorumları ve yapay zekâ önerileri tek raporda.'),
    s('veli-barajlar', 'Barajlar', 'Yaşına uygun TYF barajları', ['Her gün kontrol edilir', 'Yeni reglaman otomatik gelir', 'Geçilen barajlar işaretlenir'], 'Federasyon barajları her gün kontrol edilir, sporcunun yaşına göre gösterilir.'),
    s('canli-program', 'Canlı sonuçlar', 'Yarışlar uygulamanın içinde', ['Siteye gitmeye gerek yok', 'Gün ve seans programı', 'Yeni sonuçlar otomatik gelir'], 'Canlı sonuçlar başka bir siteye gitmeden uygulamanın içinde açılır.'),
    s('canli-sonuc', 'Canlı sonuçlar', 'Kulübün öne çıkar', ['Sıralama ve derece', 'Sporcu ve kulüp arama', 'Yalnız kulübüm filtresi'], 'Kulübünün sporcuları tabloda vurgulanır, arama ve filtreyle hemen bulunur.'),
    s('antrenor-mesaj', 'İletişim', 'Mesaj ve sesli arama', ['Yazılı ve sesli mesaj', 'Ders grupları', 'Sesli ve grup araması'], 'Yazılı ve sesli mesaj, ders grupları ve sesli arama sistemin içinde.'),
    s('sosyal', 'Sosyal', 'Kulüp akışı', ['Fotoğraf, derece, madalya', 'Beğeni ve yorum', 'Açık veya gizli profil'], 'Kulüp akışında başarılarını paylaşır, beğenir ve yorum yaparsın.'),
    s('veli-market', 'Market', 'Kulüp marketi', ['Bone, gözlük, ekipman', 'Sipariş takibi', 'Kredi veya TL'], 'Kulüp marketinden ekipman siparişi verirsin.'),
    cover('Yüzme Kulüp Sistemi', 'Kulübünü tek kulvarda yönet.', 'yuzme-kulup-sistemi.web.app', 'Yüzme Kulüp Sistemi. Kulübünü tek kulvarda yönet.'),
  ],
};

const reel = (file, music, label, hook, hookSpeak, scenes, end) => ({
  file, music,
  scenes: [cover(label, hook, 'Yüzme Kulüp Sistemi', hookSpeak), ...scenes, cover(label, end, 'yuzme-kulup-sistemi.web.app', end)],
});

export const REELS = [
  reel('reels-1-sistem-sahibi', { root: 130.81, bpm: 104, seed: 2 }, 'Sistem sahibi', 'Bütün kulüpler tek ekranda.', 'Birden çok kulübü tek ekrandan mı yönetmek istiyorsun?', [
    s('super-panel', 'Platform özeti', 'Her şey bir bakışta', ['Kulüpler', 'Kullanıcılar', 'Satışlar'], 'Kulüpler, kullanıcılar ve satışlar tek bakışta.'),
    s('super-platform', 'Platform', 'Kulüp aç, tasarla', ['Yönetici aç', 'Logo ve renk', 'Reklam alanı'], 'Yeni kulüp aç, tasarımı ve reklamları yönet.'),
    s('super-kredi', 'Kredi', 'Dekontları onayla', ['Yükleme', 'Paketler', 'Bozdurma'], 'Kredi taleplerini tek yerden onayla.'),
    s('super-market', 'Market', 'Ürün ve sipariş', ['Ürün ekle', 'Fiyatı belirle', 'Siparişi izle'], 'Marketi ve siparişleri yönet.'),
  ], 'Platformun kontrolü sende.'),
  reel('reels-2-kulup-yoneticisi', { root: 164.81, bpm: 98, seed: 3 }, 'Kulüp yöneticisi', 'Kulübünü cebinden yönet.', 'Kulübünü hâlâ defterle mi yönetiyorsun?', [
    s('admin-panel', 'Panel', 'Günün özeti', ['Dersler', 'Öğrenciler', 'Şubeler'], 'Günün bütün özeti tek ekranda.'),
    s('admin-dersler', 'Dersler', 'Ders planı kolay', ['Saat ve kontenjan', 'Antrenör uygunluğu'], 'Dersleri, saatleri ve antrenörleri planla.'),
    s('admin-finans', 'Finans', 'Kârını anlık gör', ['Tahsilat', 'Gider', 'Net kâr'], 'Tahsilatını, giderini ve kârını anlık gör.'),
    s('admin-derece', 'Yarış', 'Yarış derecelerini işle', ['Barajlara yansır', 'Performansa işlenir'], 'Yarış dereceleri barajlara ve performansa işlenir.'),
    s('canli-sonuc', 'Canlı sonuç', 'Yarışı uygulamada izle', ['Kulübün vurgulu', 'Otomatik güncellenir'], 'Yarış sonuçlarını uygulamadan çıkmadan izle.'),
  ], 'Kulübün tek kulvarda.'),
  reel('reels-3-sekreter', { root: 196, bpm: 110, seed: 4 }, 'Sekreter', 'Kayıt işleri artık dakikalar içinde.', 'Kayıt ve aidat takibi seni yoruyor mu?', [
    s('onkayit-formu', 'Ön kayıt', 'Bağlantıyı paylaş', ['Kulübüne özel form', 'Veli hesabı açılır'], 'Ön kayıt bağlantını paylaş, başvurular gelsin.'),
    s('sekreter-kayit', 'Kayıt', 'Tek dokunuşla aktar', ['İndirim', 'Taksit planı'], 'Başvuruyu tek dokunuşla kayda çevir.'),
    s('sekreter-ogrenci', 'Öğrenciler', 'Kim ne kadar ödedi?', ['Ödenen', 'Kalan', 'Geciken'], 'Kimin ne kadar ödediğini anında gör.'),
    s('sekreter-taksit', 'Tahsilat', 'Tek tuşla tahsil et', ['Vade takibi', 'Ödeme yöntemi'], 'Taksiti tek tuşla tahsil et.'),
  ], 'Evrak değil, kulüp yönet.'),
  reel('reels-4-antrenor', { root: 110, bpm: 118, seed: 5 }, 'Antrenör', 'Havuz başındaki en iyi yardımcın.', 'Antrenör, bu uygulama tam sana göre.', [
    s('antrenor-yoklama', 'Yoklama', 'Ders saatinde otomatik', ['Öğrenciler hazır', 'Tek kaydet'], 'Yoklama ders saatinde kendiliğinden açılır.'),
    s('antrenor-rapor', 'Rapor', 'Ders ders tablo', ['Girilmeyen ders görünür', 'PDF indir'], 'Devam raporu ders ders hazır.'),
    s('antrenor-antrenman', 'Antrenman', 'Setlerini kur', ['Tekrar ve mesafe', 'Dinlenme süresi'], 'Antrenmanını setleriyle kur.'),
    s('krono-ekran', 'Kronometre', 'Çok kulvarlı ekran', ['Renkli uyarılar', 'Sesli çıkış'], 'Her kulvara ayrı antrenman başlat.'),
    s('krono-kontrol', 'Kumanda', 'Telefondan yönet', ['Sıradaki çıkış', 'Kulvar sesi'], 'Kulvarları telefonundan yönet.'),
    s('krono-kilit', 'Dokunma kilidi', 'Su ekranı bozmaz', ['Dokunmalar engellenir', 'Kumandadan açılır'], 'Dokunma kilidiyle su bile ekranı bozamaz.'),
  ], 'Sen antrenmana odaklan.'),
  reel('reels-5-veli', { root: 174.61, bpm: 88, seed: 6 }, 'Veli', 'Çocuğunun gelişimi cebinde.', 'Çocuğunun yüzmede nasıl ilerlediğini merak ediyor musun?', [
    s('veli-sporcular', 'Sporcularım', 'Ders, ödeme, devam', ['Yalnız kendi çocuğun', 'Her şey güncel'], 'Ders, ödeme ve devam durumu tek ekranda.'),
    s('veli-performans', 'Performans', 'Gelişimini izle', ['Grafik', 'Antrenör yorumu'], 'Gelişim grafiğini ve antrenör yorumlarını izle.'),
    s('veli-barajlar', 'Barajlar', 'Yaşına uygun barajlar', ['Her gün kontrol edilir'], 'Yaşına uygun barajları gör.'),
    s('canli-sonuc', 'Canlı sonuç', 'Yarışı anında takip et', ['Uygulamanın içinde'], 'Yarış sonuçlarını uygulamanın içinde takip et.'),
    s('antrenor-mesaj', 'Mesaj', 'Antrenöre kolayca ulaş', ['Yazılı ve sesli'], 'Antrenörüne kolayca ulaş.'),
  ], 'Her kulaçta yanında.'),
];
