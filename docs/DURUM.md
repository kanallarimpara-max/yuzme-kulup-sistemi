# Proje durumu

## Sıradaki tek görev

Kullanici marka adini secince MARKA ile videolari yeniden uret, sahte kayit korumasini karara bagla

## Modüller

| Modül | Durum |
| --- | --- |
| Devam ve yedek düzeni | Tamam |
| Firebase | Proje, Auth ve Firestore (europe-west3) hazır. Kurallar ve site YAYINLANMADI, kullanıcı yayını en son istiyor |
| Güvenlik kuralları | 159 senaryo emülatörde geçiyor (`npm run test:rules`, JAVA_HOME = LOCALAPPDATA/yuzme-tools/jdk-21*) |
| Rollerin uçtan uca testi | `npm run e2e` emülatörde 5175 portunda açar. Tüm roller ve ana yazma akışları gerçek kurallarla denendi |
| Süper admin | Kulüp ve admin açma, tasarım, satış, reklam, kredi, paket, market, tüm profillerle sohbet çalışıyor |
| Kulüp admini | Kulüp, şube, model, ders, duyuru, finans, maaş, personel, şube atama, çıkarma, indirim çalışıyor |
| Sekreter ve ön kayıt | Ön kayıt, görünüm, forma aktar (atomik), taksit, tahsilat, PDF çalışıyor |
| Antrenör | Dersler, müsaitlik, yoklama, PDF, öğrenciler, yorum, derece, performans, maaş, antrenman, satış çalışıyor |
| Kronometre | Çok kulvar, uzaktan kontrol, ses, sunucu saati eşitleme çalışıyor |
| Kredi ve market | Bakiye `wallets`, atomik işlem ve kurallarla korunuyor, Worker gerekmez |
| Veli | Yalnız kendi çocuğunun verisi, ödeme, antrenman, devam, yarış, baraj, performans, TYF bağlantısı |
| Sohbet ve sosyal | Etiket, istek, grup, medya, sesli arama, grup araması (6 kişi), sosyal akış. Sesli işlevler iki gerçek cihazda denenmedi |
| Worker (`worker/`) | AI, TYF otomatik çekim, kapalı uygulama bildirimi yazıldı, 22 testle doğrulandı. YAYINLANMADI |
| Paketler | Web ve PWA hazır. APK için workflow izni gerekli. Windows exe bu PC'de Uygulama Denetimine takılıyor |

## Kullanıcıdan beklenenler

- Ücretsiz Cloudflare ve Cloudinary hesabı.
- Firebase servis hesabı anahtarı (yalnız `wrangler secret`, repoya yazılmaz) ve FCM web anahtarı.
- GitHub workflow izni: gh auth refresh -h github.com -s workflow. Sonra .git/info/exclude içinden android.yml satırı silinip commit edilir, GitHub vars girilir.
- Açık yayın onayı: firebase deploy --only firestore:rules,hosting. Sonra ilk süper admin kurulur.

## Bilinen riskler

- Cloudinary imzasız yüklemede dekont ve sohbet fotoğrafı bağlantıyı bilen herkese açıktır. Gerçek dekont alınmadan imzalı yükleme Worker'a taşınmalı.
- Toplu sahte hesap ve ön kayıt için App Check veya hız sınırı yok.
- İlk süper admin için kurulum adımı henüz yazılmadı; kurallar istemciden süper admin açılmasına izin vermez.
- Windows Akıllı Uygulama Denetimi imzasız exe dosyasını engelliyor. Güvenlik ayarı değiştirilmez; ücretsiz seçenek PWA kurulumudur.

## Son kayıtlar

- 2026-11-24: Tanitim videolari yeniden uretildi: cihaz cerceveli (telefon, tablet, dizustu) hareketli sahneler, projeye ozgu telifsiz enerjik muzik, seslendirmesiz. Seslendirme metinleri sureleriyle docs/seslendirme-metinleri.md icinde, her video icin altyazi dosyasi
- 2026-11-24: Antrenor icin Ders analizi eklendi: aktif ders saatindeki sporcularin stil bazli guclu ve eksik yonleri yaris ve antrenman derecelerine gore, yapay zeka grup analizi ve gunluk haftalik aylik program onerisi, programlar kaydedilir. 183 kural, 60 test, 33 Worker testi gecti, yayinlandi
- 2026-11-24: Tum roller 168 sayfa, form ve dugme denetiminden gecti. Baraj sayfasi bos acilma hatasi duzeltildi, tanitim filmi ve 5 rol videosu uretildi, son surum yayinlandi. 173 kural, 56 test, 30 Worker testi gecti
- 2026-11-24: Karanlik ve aydinlik mod eklendi, cihaz ayarini izler, secim saklanir. Tum sayfalar iki temada kontrast testinden gecti
- 2026-11-24: Canli sonuc gercek Worker'da duzeltildi: TYF cekimi yonlendirme hatasi giderildi, yeni yarislar 30 dakikada bir, aktif yarislar dakikada bir kontrol edilir, admin acikken dereceler otomatik islenir
- 2026-11-24: Antrenor yapilan yorumlari gorur, sosyal paylasim hata mesajlari ve fotograf kucultme duzeltildi, barajlar her gun TYF sayfasindan otomatik guncellenir. 173 kural, 55 test, 30 Worker testi gecti
- 2026-11-24: Kronometre kontrolune canli kulvar panosu, sonraki cikis ve bitis saati, dokunma kilidi ve kulvar basina cikis sesi eklendi. Iki cihazla denendi, 53 test gecti
- 2026-11-24: Telefon alt menusundeki kaydirma cubugu kaldirildi, deneme sunucusu suresi uzatildi
- 2026-11-24: Yoklama telefon tarih ve saatine baglandi: ders disinda Suan dersiniz gorunmuyor, ders saatinde otomatik acilir, altta kaydet. Rapor ogrenci sayfasinda 1. 2. ders tablosu ve Yoklama girilmedi. 52 test gecti
- 2026-11-24: Canli sonuclar uygulama icine alindi: TYF yarislari otomatik bulunur, tablo, kulup filtresi, resmi liste. Yaris derecesi yalniz admin, antrenor yalniz antrenman derecesi. Baraj yalniz yaris derecesiyle. 171 kural, 51 test gecti
- 2026-11-24: Windows paketi CI'da acildi ve giris ekrani dogrulandi. Android acilis testinde emulator disk alani ve APK kaydi duzeltildi
- 2026-11-24: Sesli arama, grup aramasi ve kayit iki kullaniciyla denendi. Android mikrofon izni eklendi, cevapsiz ve kopuk arama uyarisi, AI kisa Turkce yanit, 18 gercek TYF dosyasi dogrulandi, Android ve Windows acilis testi CI'a eklendi
- 2026-11-23: Tum roller gercek kullanici senaryosuyla denendi. Para girisi, kronometre, veli paneli, bos kredi ekrani, baglanti, arama uyarisi, sifre yenileme, gorsel yukleme ve mobil menu duzeltildi
- 2026-11-23: Super admin sistem sahibi ekrani, tanitim sayfasi, ilk yorum kural hatasi duzeltmesi ve Windows is akisi eklendi. Web yayinlandi, tum roller emulatorde gezildi, 160/160 kural testi gecti
- 2026-11-23: AI modeli Turkce icin mistral-small-3.1 yapildi ve yayinlandi, bu model canli yanitla henuz dogrulanmadi cunku oturum kapandi
- 2026-11-23: Canli denendi: super admin girisi, gorsel ve PDF yukleme (Cloudinary PDF teslimi acildi, imzasiz 401), AI analiz. Kaldirilmis AI modeli llama-3.3 ile degistirildi
- 2026-11-23: Firestore kurallari ve site kullanici onayiyla yayinlandi. 37 test, kural testleri ve build gecti. Canli giris henuz denenmedi
- 2026-11-23: GitHub Actions APK derleme sonucu kontrol edildi
- 2026-11-23: APK is akisi GitHub'a eklendi, Firebase Android kaydi ve depo ayarlari tamamlandi
- 2026-11-23: Ilk super admin hesabi ve profil kaydi canli Firebase'de olusturuldu, sifre yalniz kullanicida. Giris henuz denenmedi cunku canli kurallar yayinlanmadi
- 2026-11-23: FCM web bildirim anahtari olusturuldu ve yerel ayara eklendi, build gecti. Gercek bildirim henuz denenmedi
- 2026-11-23: Firebase servis anahtari Worker secret olarak kaydedildi, indirilen kopya silindi. AI, bildirim ve yukleme kotasi gercek oturumla henuz denenmedi
- 2026-11-23: Dosya yukleme API secret gerektirmeden Worker uzerinden kuruldu. Cloudinary ozel yukleme gercekte denendi: imzali adres 200, imzasiz 401. 29 Worker testi, 37 test, build gecti
- 2026-11-23: Cloudinary ve Firebase anahtarlarini gizli kaydeden kurulum araclari eklendi. Worker secret listesi hala bos
- 2026-11-23: Dosyalar Worker imzasiyla ozel yukleniyor, gunluk 30 yukleme siniri eklendi, Worker yayinlandi. 27 Worker testi, 37 test, build gecti. Cloudinary anahtarlari henuz Worker'a girilmedi
- 2026-11-23: Cloudflare hesabi acildi, Worker yayinda ve oturumsuz istekleri 401 ile reddediyor. Servis anahtari henuz eklenmedi, AI ve bildirim kapali
- 2026-11-23: Site guvenlik basliklari yerel sunucuda dogrulandi: satir ici script engelleniyor, giris ekrani ihlalsiz aciliyor
- 2026-11-23: Tum roller gercek kurallarla emulatorde gezildi, on kayit basari mesaji hatasi duzeltildi, e2e komutu eklendi. 37 test, 22 Worker testi, 159/159 kural testi, build gecti
- 2026-11-23: Electron, site guvenlik basliklari, AI gunluk kotasi, atomik kayit ve yoklama, personel sube atama ve kulupten cikarma, antrenor dersler ekrani eklendi
- 2026-11-23: Guvenlik denetimi: 36 gercek acik kapatildi (kulupler arasi yazma, acik maas, sohbet ele gecirme, sahte kayit, kullanici listeleme). Benzersiz etiket, lessonPay, parentAccess eklendi. 37 test, 151/151 kural testi gecti
- 2026-11-23: Kapali uygulama bildirimi yazildi: FCM, Worker gonderimi, web service worker, Android eklentisi, cihaz kaydi kurallari. APK is akisi gercek Firebase ayarlarini alacak sekilde duzeltildi (yerelde, workflow izni bekliyor). 37 test, 21 Worker testi, 93/93 kural testi, build gecti. Gercek cihazda bildirim denenmedi
- 2026-11-23: Cloudflare Worker yazildi: Firebase oturumu dogrulamali AI analiz ve TYF yarisindan otomatik PDF cekme, ekranlara baglandi. 37 test, 11 Worker testi, build, 85/85 kural testi gecti. Worker yayinlanmadi, gercek AI cagrilmadi
- 2026-11-23: Kronometre sunucu saatiyle esitlendi, sunucusuz grup sesli arama eklendi (en fazla 6 kisi). 33 test, build, 85/85 kural testi gecti; arama iki gercek cihazda denenmedi
- 2026-11-23: Kredi harcama Worker gerektirmeden atomik islem + Firestore kurallariyla yazildi (wallets, listingSets). Secili ogrenci bildirimi, super admin istek beklemeden sohbet, antrenor paneli kisi sayisi ve logo eklendi. 31 test, build, 75/75 kural testi gecti
- 2026-11-23: Super admin: kulup+admin acma, uygulama tasarimi. Reklam gosterimi, veli TYF canli sonuc, kurulabilir web uygulamasi (PWA) eklendi. tsc, 31 test, build, 56/56 kural testi gecti. Yayin izin denetiminde durdu
- 2026-11-23: Veli verisi kapatildi (sonuc, yorum, yoklama yalniz kendi cocugu). Kural testi eklendi: 49/49 emulatorde gecti, JDK kullanici klasorunde (LOCALAPPDATA/yuzme-tools), test icin JAVA_HOME oraya ayarlanir
- 2026-11-23: Firestore (default) europe-west3 konumunda yeniden kuruldu. Sorgular rol bazli kurallarla uyumlu yapildi (lib/access.ts), on kayit oturum sirasi ve enrollments.parentId duzeltildi. tsc, 31 test ve build gecti; kurallar henuz yayinlanmadi ve emulatorde test edilmedi
- 2026-11-23: E-posta/sifre girisi ve Firestore acildi. DIKKAT: veritabani CLI ile otomatik nam5 (ABD) konumunda olustu, bos
- 2026-11-23: Firebase projesi yuzme-kulup-sistemi ve web uygulamasi olusturuldu, yerel .env yazildi (repoya girmez)
- 2026-11-23: Firebase CLI projeye eklendi
- 2026-11-23: Paketleme durumu ve kalan eksikler kaydedildi
- 2026-11-23: TYF sonuç aktarımı, resmi barajlar ve Firestore kuralları eklendi
- 2026-11-23: TYF sonuç aktarımı, resmi barajlar, Firestore kuralları ve APK iş akışı eklendi
- 2026-11-23: Etiketli sohbet, grup, medya, sesli arama altyapısı ve sosyal akış eklendi
- 2026-11-23: Finans, maaş, personel, indirim kodu ve veli ekranı eklendi
- 2026-11-23: Süper admin, kredi, dekont, bozdurma, market ve antrenman pazarı eklendi
- 2026-11-23: Antrenör yoklama, derece, yorum, antrenman, performans ve rol koruması eklendi
- 2026-11-23: Sekreter ön kayıt, kayıt, taksit, tahsilat ve Türkçe PDF akışı eklendi
- 2026-11-23: Kulüp ayarları, eğitim modeli, müsaitlikli ders açma ve hedefli bildirim eklendi
- 2026-11-23: Giriş, rol menüsü, panel ve çok kulvarlı kronometre çalışır hale getirildi
- 2026-11-23: Proje altyapısı, iş kuralları ve kronometre motoru testlerle eklendi
- 2026-11-22: Şartname, devam ve yedek düzenini kur
- 2026-11-23: Yeni gizli depo ve devam düzeni kuruldu.
