# Proje durumu

## Sıradaki tek görev

Admin finans, maaş, personel, indirim kodu ve veli ana ekranı.

## Modüller

| Modül | Durum |
| --- | --- |
| Devam ve yedek düzeni | Tamam |
| Uygulama iskeleti, giriş, roller | Demo modunda çalışıyor, Firebase bağlantısı bekliyor |
| Süper admin | Satış, reklam, kredi, paket, EFT, oran, market çalışıyor. Tasarım yönetimi yok |
| Kulüp admini | Kulüp, şube, model, ders açma, duyuru çalışıyor. Finans, indirim, personel atama yok |
| Sekreter ve ön kayıt | Ön kayıt, görünüm, forma aktar, taksit, tahsilat, PDF çalışıyor |
| Antrenör, yoklama, derece | Müsaitlik, yoklama, PDF, öğrencilerim, yorum, derece, performans çalışıyor. Maaş özeti yok |
| Antrenman ve kronometre | Antrenman yazma, paylaşma, kronometre ve kontrol çalışıyor. Satış yok |
| Kredi ve market | Yükleme, dekont, bozdurma, market, antrenman pazarı demo modunda çalışıyor |
| Veli | Başlamadı |
| Sohbet, sesli arama, sosyal akış | Başlamadı |
| TYF sonuç ve baraj aktarımı | Başlamadı |
| Web, Windows, Android paketleri | Başlamadı |

## Kullanıcıdan beklenenler

- Firebase projesi, Cloudinary ve Cloudflare hesapları henüz bağlanmadı.

## Bilinen riskler

- session.tsx Firestore'da tüm users koleksiyonunu izliyor. Firebase bağlanmadan önce tek belge okumaya çevrilmeli.
- firestore.rules henüz yok. Kurallar yazılmadan gerçek veri girilmemeli.
- Kredi harcama ve antrenman kopyalama istemciden yazılıyor. Firebase'de güvenli olması için Cloudflare Worker'a taşınmalı.
- Kronometre farklı cihazlarda cihaz saatine bağlı, sunucu saat farkı düzeltmesi eklenmeli.

## Son kayıtlar

- 2026-11-23: Süper admin, kredi, dekont, bozdurma, market ve antrenman pazarı eklendi
- 2026-11-23: Antrenör yoklama, derece, yorum, antrenman, performans ve rol koruması eklendi
- 2026-11-23: Sekreter ön kayıt, kayıt, taksit, tahsilat ve Türkçe PDF akışı eklendi
- 2026-11-23: Kulüp ayarları, eğitim modeli, müsaitlikli ders açma ve hedefli bildirim eklendi
- 2026-11-23: Giriş, rol menüsü, panel ve çok kulvarlı kronometre çalışır hale getirildi
- 2026-11-23: Proje altyapısı, iş kuralları ve kronometre motoru testlerle eklendi
- 2026-11-22: Şartname, devam ve yedek düzenini kur
- 2026-11-23: Yeni gizli depo ve devam düzeni kuruldu.
