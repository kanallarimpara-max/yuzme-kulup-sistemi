# Proje durumu

## Sıradaki tek görev

Kullanici: Cloudflare ve Cloudinary hesabi, gh workflow izni, acik yayin onayi. Sonra wrangler deploy, VITE_WORKER_URL, firebase deploy, ilk super admin. Kapali uygulamaya bildirim henuz yazilmadi

## Modüller

| Modül | Durum |
| --- | --- |
| Devam ve yedek düzeni | Tamam |
| Uygulama iskeleti, giriş, roller | Demo modunda çalışıyor, Firebase bağlantısı bekliyor |
| Süper admin | Satış, reklam, kredi, paket, EFT, oran, market çalışıyor. Tasarım yönetimi yok |
| Kulüp admini | Kulüp, şube, model, ders, duyuru, finans, maaş, personel, indirim çalışıyor |
| Sekreter ve ön kayıt | Ön kayıt, görünüm, forma aktar, taksit, tahsilat, PDF çalışıyor |
| Antrenör, yoklama, derece | Müsaitlik, yoklama, PDF, öğrencilerim, yorum, derece, performans ve maaş özeti çalışıyor |
| Antrenman ve kronometre | Antrenman yazma, paylaşma, kronometre ve kontrol çalışıyor. Satış yok |
| Kredi ve market | Yükleme, dekont, bozdurma, market, antrenman pazarı demo modunda çalışıyor |
| Veli | Ödeme, antrenman, devam, yarış, performans çalışıyor. Baraj ve canlı sonuç TYF modülünü bekliyor |
| Sohbet, sesli arama, sosyal akış | Etiket, istek, grup, fotoğraf, akış, keşfet çalışıyor. Mikrofonla sesli mesaj ve arama iki gerçek cihazda test edilmedi |
| TYF sonuç ve baraj aktarımı | PDF ile sonuç aktarımı ve 2.060 resmi baraj çalışıyor. Otomatik çekim Worker veya Actions + Firebase bekliyor |
| Web, Windows, Android paketleri | Web yerelde çalışıyor. Windows klasör paketi derlendi ama bu PC imzasız exe dosyasını engelliyor, çalıştırılamadı. APK derlenmedi |

## Kullanıcıdan beklenenler

- Firebase projesi, Cloudinary ve Cloudflare hesapları henüz bağlanmadı.
- GitHub oturumuna workflow izni verilmeli: gh auth refresh -h github.com -s workflow. Sonra .git/info/exclude içinden android.yml satırı silinip dosya commit edilmeli. APK ancak bundan sonra derlenir.

## Bilinen riskler

- firestore.rules yazıldı ama emülatörde test edilmedi. Test edilmeden gerçek veri girilmemeli.
- Kredi harcama ve antrenman kopyalama istemciden yazılıyor. Firebase'de güvenli olması için Cloudflare Worker'a taşınmalı.
- Kredi harcama (market, antrenman pazarı) Firestore kurallarında kapalı, Cloudflare Worker yazılmalı.
- Eksikler: gerçek AI modeli (şu an kural tabanlı analiz), TYF otomatik çekim, kapalı uygulamaya bildirim, reklamların ekranlarda gösterimi, süper admin tasarım yönetimi, grup sesli arama.
- Windows Akıllı Uygulama Denetimi imzasız exe dosyasını engelliyor. Güvenlik ayarı değiştirilmez; ücretsiz seçenek PWA kurulumudur.
- Kronometre farklı cihazlarda cihaz saatine bağlı, sunucu saat farkı düzeltmesi eklenmeli.

## Son kayıtlar

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
