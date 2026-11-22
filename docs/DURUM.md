# Proje durumu

## Sıradaki tek görev

Windows paketini doğrula. Workflow izni gelince Android APK'yı Actions ile derle. Sonra Firebase'i bağla ve kuralları emülatörde test et.

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
| Web, Windows, Android paketleri | Başlamadı |

## Kullanıcıdan beklenenler

- Firebase projesi, Cloudinary ve Cloudflare hesapları henüz bağlanmadı.
- GitHub oturumuna workflow izni verilmeli: gh auth refresh -h github.com -s workflow. Sonra .git/info/exclude içinden android.yml satırı silinip dosya commit edilmeli. APK ancak bundan sonra derlenir.

## Bilinen riskler

- firestore.rules yazıldı ama emülatörde test edilmedi. Test edilmeden gerçek veri girilmemeli.
- Kredi harcama ve antrenman kopyalama istemciden yazılıyor. Firebase'de güvenli olması için Cloudflare Worker'a taşınmalı.
- Kronometre farklı cihazlarda cihaz saatine bağlı, sunucu saat farkı düzeltmesi eklenmeli.

## Son kayıtlar

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
