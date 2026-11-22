# Yeni AI oturumu: buradan başla

Projeyi baştan tarama. Token harcamadan devam etmek için sırayla:

1. `node scripts/devam.mjs` çalıştır. Durumu, sıradaki görevi ve son commitleri tek çıktıda verir.
2. Yalnızca sıradaki görevin modülünü aç. Hangi dosyanın nerede olduğu `docs/HARITA.md` içinde.
3. `docs/SARTNAME.md` dosyasını bütün okuma. Modül başlığını `Grep` ile bulup sadece o bölümü oku.

## Değişmez kurallar

- Yalnızca ücretsiz, kart gerektirmeyen servisler. Firebase Blaze, Firebase Storage ve Cloud Functions kullanılmaz.
- Altyapı: Firebase Auth + Firestore + Hosting, Cloudinary (dosya), Cloudflare Workers (AI, bildirim), GitHub Actions (TYF, APK).
- Tek kod tabanı: React + TypeScript + Vite. Android Capacitor, Windows Electron.
- Arayüz dili Türkçe. Para kuruş olarak tamsayı, kredi hareketleri defter kaydı olarak tutulur.
- Sır, API anahtarı ve kişisel veri repoya ve devir notlarına yazılmaz.
- `eski-main` dalı ve `eski-depo` uzak deposu eski çalışmadır. Değiştirme, gönderme.

## Limit bitmeden kayıt düzeni

Her küçük, çalışan işten sonra hiç beklemeden:

```bash
node scripts/yedekle.mjs "ne yapıldı" "sıradaki tek görev"
```

Bu komut `docs/DURUM.md` dosyasını günceller, commit atar ve GitHub'a gönderir. İş yarımsa ikinci metne dosya adını, kalan adımı ve hatayı yaz.
