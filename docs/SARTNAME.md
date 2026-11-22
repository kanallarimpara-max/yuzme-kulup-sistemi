# Yüzme kulübü sistemi şartnamesi

Web, Android ve Windows'ta çalışır. Tamamen ücretsiz altyapı. Bölümleri başlığa göre ara, bütün dosyayı okuma.

## ORTAK

- Her profile benzersiz etiket (tag). Tag ile arama, iki taraflı istek kabulünden sonra mesajlaşma ve arama.
- Her profilde yazılı, sesli mesaj, fotoğraf, sesli arama.
- Instagram benzeri sosyal alan: fotoğraf, madalya, derece paylaşımı. Açık profiller keşfette görünür. Sosyal alanda ayrı DM yok, sistem sohbeti kullanılır.
- Bildirim filtreleri: sadece antrenör, sadece sekreter, ders saati, seçili öğrenciler, seçili kişiler.
- Antrenör öğrenciyle ilişkilenince ders saati adıyla otomatik sohbet grubu oluşur, veliler otomatik eklenir.

## SUPER ADMIN

- Uygulama tasarımını yönetir. Hangi kulübe ne zaman, hangi ödeme planıyla satıldığını görür. Reklam alanlarını belirler.
- Tüm profillerle yazılı ve sesli iletişim.
- Market: ürün fotoğrafı, fiyatı, kredi fiyatı, açıklaması.
- Kredi yönetimi: antrenöre kredi ekle/sil, yükleme ve bozdurma taleplerini yönet.
- Kredi paketlerini, EFT/havale bilgilerini (banka, hesap sahibi, IBAN) ve bozdurma oranını belirler (örn. 1000 kredi = 50 TL).

## KULUP ADMINI

- Kulüp adı ve logosu, şube ekleme, sekreter ve antrenör atama. Antrenör birden çok şubede çalışabilir, şube filtresi vardır.
- Ders saati: ad (boşsa saat + şube otomatik ad), antrenör maaşı, öğrenci aidatı, kontenjan, başlangıç, haftanın günleri, saat. Bitiş tarihi otomatik hesaplanır. Taksit sayısı ve faiz girilir. Eğitim modeli seçimi zorunlu.
- Antrenör müsaitliğini ders açarken görür, özel veya grup dersi açar. Ders açılınca antrenöre bildirim gider.
- Eğitim modelleri (örn. grup dersi, antrenör başına 5 kişi). Ders açarken ve veli kaydında seçim zorunlu.
- Yarış ve duyuru ekleme, filtreli bildirim. İndirim kodları, kayıtta otomatik uygulanır. Ön kayıt ödeme tercihleri.
- Detaylı gelir gider: ciro, elle gider, öğrenci sayısına göre otomatik gelir, kâr, tahsil edilen ve edilecek, sayı ve tablolar. Maaş ödemesi girişi. Market.

## ANTRENOR

- Dashboard: kulüp adı/logosu, bugünkü ders ve kişi sayısı, toplam öğrenci, ortalama ders ücreti, toplam/ödenen/kalan maaş.
- Dersler: şube, ders adı, kişi sayısı, saat. Altında şube, gün ve saate göre müsaitlik işaretleme.
- Yoklama: tarih ve saate göre aktif dersin öğrencileri otomatik gelir. PDF yoklama raporu.
- Öğrencilerim: şube ve saat bazlı ad, soyad, ders, bitiş günü. Öğrenci yorumu girer, veli performans ekranında görür.
- Derece girişi: seçili sporcu veya şube/saat grubu. Serbest 50/100/200/400/800/1500, kelebek/sırt/kurbağa 50/100/200, karışık 100/200/400.
- TYF: https://www.tyf.gov.tr/canli-sonuc/ ve https://canli.tyf.gov.tr/live/2026/1005927/ gibi sayfalardan sonuçları al, kulübü benzer adla eşleştir, kayıtlı sporcuya lap ve toplam dereceyi otomatik gir.
- Performans raporu: genel, mesafe ve stil gelişimi, AI analiz ve tavsiye, yaşa uygun geçilen barajlar.
- Barajlar: https://www.tyf.gov.tr/haber/2026-2027-sezonu-yuzme-faaliyet-takvimi-yayinda.html reglamanlarından. Başlık (Türkiye Şampiyonası, Milli Takım vb.) > mesafe, stil, yaş.
- Market müşteri ekranı, krediyle alışveriş.
- Antrenman oluştur: set adı, tekrar, mesafe, stil, interval (dk/sn/salise), set sonu dinlenme. Şube, ders saati ve gün seçilir, kaydedince ilgili sporcularla paylaşılır.
- Antrenman satışı: açıklama görünür, setler gizli, fiyatı antrenör belirler, diğer antrenörler krediyle alır.
- Kredi satın alma: paket seç. Kredi/banka kartı "geliştirme aşamasında" der. EFT/havale bilgileri, not, zorunlu dekont, süper admin onayı.
- Kredi bozdurma: bakiye, oran, miktar, otomatik tutar, EFT (IBAN, ad soyad) veya kripto (cüzdan, ağ, koin). Süper admin onaylayınca bakiye düşer, bildirim gider.

## KRONOMETRE

- Antrenman verisine göre geri sayım. Normal yeşil, son 10 sn turuncu, son 5 sn kırmızı, dinlenme mor.
- Birden çok kulvar, ekran her cihazda eşit paylara bölünür, her kulvar farklı antrenman yapabilir.
- Dinlenmenin son 6 saniyesinde, son 3 saniyeye kadar 3 sn boyunca sıradaki mesafe ve tekrar gösterilir.
- Her kulvarın üstünde hareket, set ve tekrar yazar.
- Başka cihazdan ayrı kontrol sayfası: kulvar başlat/durdur/bitir, setten başlat, tümünü başlat/durdur/bitir, tümü set başına, kulvara antrenman ata.
- Ses: son 5 sn kısa dıt, sıfırda arka arkaya dıt dıt dıt.

## SEKRETER

- Kulübe özel ön kayıt linki. Akış: ders türü, şube, öğrenci adı soyadı, doğum yılı, cinsiyet, telefon, veli adı soyadı, e-posta, telefon, şifre ve tekrarı, adres, ödeme tercihi (admin açtıkları).
- Ön kayıt görünümü: üst etiket, tema rengi, başlık (boşsa kulüp adı), açıklama, form logosu, YouTube/Vimeo videosu, kaydet, önizle.
- Ön kayıt sekreter ekranına düşer. "Forma aktar" ile kayıt formu dolar. Şube, saat, antrenör, indirim kodu, taksit seçilir. Faizli toplam, taksit tutarı ve vade tarihleri hesaplanır.
- Öğrenciler: ödeme durumu, tarih, yöntem, tutar, kalan borç, taksit, vadeye kalan süre.
- PDF liste: tümü, saat veya şube filtresiyle ad soyad ve antrenör.

## VELI

- Öğrenci adı, toplam aidat, ödenen, kalan. Etkinlik, duyuru, yarış planı. Atanan antrenmanlar.
- Sadece kendi çocuğunun performans raporu, antrenör yorumları, devam durumu, yaşına uygun barajlar, TYF canlı sonuçları. Market, mesajlaşma, sosyal medya.
