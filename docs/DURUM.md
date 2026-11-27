# Proje durumu

## Sıradaki tek görev

Hikayeleri kullanici telefondan paylasacak; erisim sonuclarina 24 saat sonra bak

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

- 2026-11-27: Instagram buyume: Turkiye Finali Reels'i uretildi ve paylasildi (scripts/tanitim/final-reels.mjs, 15 sn, konum Ankara, #turkiyefinali), TYF gonderisine tebrik yorumu, telefondan paylasim icin 2 hikaye gorseli (tanitim-videolari/sosyal-medya/hikaye)
- 2026-11-27: Instagram: 27 Kas yeni tanitim gonderisi paylasildi (profilde 11 gonderi). Kayseri Su Sporlari yanit verdi: musabakadalar, donunce iletisime gececekler
- 2026-11-27: Surum surum-2026-11-27 yayinlandi (commit 9d81e12): Android APK + Windows exe GitHub surumunde, yerel kopya tanitim-videolari/uygulamalar/2026-11-27
- 2026-11-27: Veri dinleyicisi izin hatasinda kalici bos kalmiyor: hesap yeni acildiginda veya hesap degistirildiginde yetki gec ulasirsa 1,5 / 4 / 10 sn sonra yeniden baglanir, sayfa kapaninca durur (emulatorde denendi). Web yayinda
- 2026-11-26: Veliye aylik rapor: Sporcularim ekraninda her cocuk icin Aylik rapor (son 6 ay secilir, varsayilan gecen ay): devam orani (izinli haric), ayin en iyi dereceleri ve onceki en iyiye gore fark (yaris/antrenman ayri), beceri karnesi ve siradaki hedef, antrenor yorumlari, odenen/kalan/geciken; Turkce PDF indirme. Worker her ayin 1'inde 09:00'da veliye 'Ekim 2026 aylik raporu hazir' bildirimi yazar (tek kimlik, tekrar gitmez). 90 birim, 45 Worker testi; web ve Worker yayinda
- 2026-11-26: Taksit hatirlatma: Worker her sabah 09:00 (TR) vadeye 1-3 gun kala, vade gunu, 1-6 ve 7-30 gun gecikmede veliye birer kez bildirim yazar (sabit kimlik, tekrar gitmez) ve kapali uygulamaya iceriksiz uyari gonderir; kulup Personel ve kayit ayarlarindan kapatabilir (reminderOff). Ogrenciler ekraninda Odeme durumu suzgeci (Gecikenler / 7 gun icinde), geciken ozet satiri ve elle Hatirlat dugmesi. 86 birim, 44 Worker, 337 kural testi; web, kurallar ve Worker yayinda
- 2026-11-26: Tum platformlar kaydedildi: web yayinda, GitHub surumu surum-2026-11-26 (Android APK + Windows exe, commit 5f98af3), yerel kopya tanitim-videolari/uygulamalar/2026-11-26
- 2026-11-26: Kulup ayarlari egitim modelleri: bilgi kutucuklari kaldirildi; model adinda ture gore koyu gri ornek metin, ogrenci sayisi bos baslar ve ornek sayi gosterir; denetim: bos/uzun/ayni ad, yalniz rakam, 1-100 tam sayi, cift tiklama ve kayit hatasi mesaji; duzenlemede ayni kurallar. Web yayinda
- 2026-11-26: Canli sonuclar: yaris sonucuna basinca dogrudan TYF resmi listesi (PDF) gosterilir; uygulamanin kendi urettigi tablo, arama, Yalniz kulubum ve Resmi liste/Tabloya don dugmesi kaldirildi; PDF telefonda daha net cizilir. Web yayinda
- 2026-11-26: Instagram haftalik paket basladi: biyografi guncellendi, 10 yeni kulube onayli deneme mesaji, 13 resmi hesap takip edildi (TYF dahil), gunluk 19:00 paylasim gorevi kuruldu; Heybeliada sunum istedi
- 2026-11-26: Tasarim gecisleri (typeset, layout, colorize, polish): baslik ustu etiketler kaldirildi, bilgi tasiyanlar basligin altina (page-meta); govde 16px, yazi olcegi 12/13/14/15/16/18/28, h3 tanimli, agirlik en cok 600; bosluklar 4px duzeninde, kose yaricaplari tek olcekte; yan serit vurgular tam kenarlikla; beyaz yazili dolu zeminler 4.5:1 (danger/ok-fill), acik temada odak rengi koyu camgobegi, yoklama secimleri anlam renginde ton. 82 test gecti, web yayinda
- 2026-11-26: Sosyal medya kiti yeni duz logo ve uygulamayla ayni sade tasarimla yeniden uretildi (kit.mjs, motor.mjs logoSvg duz); Instagram profil fotografi yeni logoyla degisti; haftalik paket taslagi docs/sosyal-medya-haftalik-paket.md
- 2026-11-26: Tasarim yenilendi (unslop): duz yeni logo ve tum ikonlar, IBM Plex Sans/Mono yazi tipleri (pakete gomulu), notr koyu/acik palet tek camgobegi vurgu, parlama/gradyan/bulaniklik kaldirildi, menude sakin secili durum, rakamlar mono, rozetler etiket, panel basligi gunun tarihi, tanitimda kulvar ve canli sonuc karti. Duzen ve islevler ayni; 82 test gecti, web yayinda
- 2026-11-26: Gorsel iyilestirme (yalniz styles.css): yeni token'lar (--field, --line-strong, --label, --accent-soft, --radius*, --shadow-*), acik temada beyaz form alanlari ve guclu kenarlik, kartlara olculu golge; menude secili sayfa dolu vurgu yerine yumusak ton (ana eylem one cikar); govde satir yuksekligi 1.5, sabit baslik olcegi (h1 1.75/1.5rem, h2 1.125rem), etiketler daha okunur; buton/alan hover-active-focus-hata durumlari, tablo basligi ve satir vurgusu, secim/imlec/kaydirma cubugu marka renginde. Yerlesim, kirilim, bosluk olculeri degismedi. 82 test gecti, web yayinda
- 2026-11-26: 26 kulubun resmi Instagram hesabina deneme programi mesaji gonderildi (kullanici onayli metin); liste docs/sosyal-medya-profili.md
- 2026-11-26: 6 yeni ozellik: (1) kulup acilis rehberi: yonetici panelinde kurulum adimlari ve siradaki isin dugmesi (or. Ilk dersi olustur), sistem sahibinde Kurulum sutunu ve siralamasi; (2) Donem dolulugu ekrani (/doluluk): mevcut, donemi biten, devam/ayrilacak/yanitsiz, bekleyen basvuru, degerlendirme; veliye 45 gun kala devam sorusu (renewals); (3) taksit makbuzu PDF ve duzeltme gecmisi: tahsilat/duzeltme/iptal gerekceyle, kim yaptiysa sona eklenir, kural silmeyi engeller, veliye odeme bildirimi; (4) yuzme beceri karnesi (/beceri, skillCards) 15 beceri 3 duzey, veli ekraninda ozet; (5) TYF start listesinden yaris gunu programi (/yaris-gunu): seri/kulvar, bulusma, veli katilim onayi ayri; (6) yarisa ozel duyuru (raceDayId). 334 kural, 82 birim, 43 Worker testi; web ve kurallar yayinda
- 2026-11-26: Canli sonuclar: yalniz bugun suren yarislar listelenir, son 2 saatte sonuc/start listesi gelenler Canli etiketiyle en ustte. Ara sureler (lap): canli sonuc PDF'i (satira yayilan blok ve kirilan ara sure duzeltildi, 200m+ derece okunmuyordu), toplu sonuc PDF'inin iki bicimi okunur; toplam sure olarak lapsMs + lapEvery kaydedilir, dereceyle tutarsizsa yazilmaz. Worker diziyi denetler ve yazar, ayni derecede ara suresi eksik kayit tamamlanir; PARSER_VERSION 3 ile eski dosyalar yeniden taranir. Performans ekraninda brans bazli Yaris ara sureleri tablosu (en hizli/yavas bolum). 78 birim, 43 Worker testi gecti; web ve Worker yayinda
- 2026-11-26: Giris sayfasi kartlarindaki bulaniklik (backdrop-filter) kaldirildi; Android test emulatoru bu efektle cokuyordu. Yari saydam gorunum kaldi
- 2026-11-26: Duzenleme 2. kisim: 1 kredi = 1 TL (oran alani kalkti, paket ve urun fiyati otomatik, bozdurma kuralda kontrol), sosyal: yorum silme, onayli gonderi silme, engelleme (kuralda yorum engeli), ilgilenmiyorum ve icerik turu tercihi, super admin moderasyonu; mesajlar: geri alma, basa sabitleme, toplu mesaj, antrenor/yonetici/sekreter grup olusturma, alfabetik kisi listesi, en fazla 3 kisi onerisi; super admin kulup tablosu siralama; personel duzenleme ve e-posta dogrulama; sube/model duzenleme, 7 model turu ve aciklamalari; ders saatlerinde on kosul yonlendirmesi; onemli islemlerde onay penceresi. 296 kural, 74 birim, 42 Worker testi gecti; web ve kurallar yayinda
- 2026-11-26: Duzenleme 1. kisim: giris sayfasina Guvenlik, Hakkimizda, SSS ve destek e-postasi (super admin tasarimdan girer); kartlara hafif cam gorunumu. Sol alttaki etiket/tema/bildirim/cikis kaldirildi, Ayarlar sayfasi (hesap bilgileri, tema, bildirim, sifre degistirme, destek, onayli cikis). Tum sifre alanlarina goster/gizle dugmesi. Gecici sifreyle acilan personele kapatilabilir sifre degistirme onerisi. Kurallar: tempPassword alani, yonetici personel adi/rolunu duzenleyebilir
- 2026-11-26: Yaris takvimi: TYF 2026-2027 faaliyet takvimi PDF'i okunuyor (28 yaris, 10 yurt ici), gunde 4 kez barajlar.yml ile Worker /calendar/publish uzerinden tyfCalendar/current belgesine yaziliyor. Yonetici ve antrenor /takvim ekraninda yarislari kulup takvimine ekler (clubRaces), ayni kulubun velisi ay gorunumu ve listede gorur. Kurallar: yalniz admin/antrenor ekler-cikarir, baska kulup goremez (266 kural, 74 birim, 42 Worker testi). Web, kurallar ve Worker yayinda
- 2026-11-26: Canli sonuclar anlik: Worker artik dakikada bir TYF'yi tarar (Canli Sonuclar baglantisi, tarihi yaklasan yarislar, en yeni numaralar, geriye dogru tarama). 2026'da acik 63 canli sonuc sayfasi bulundu ve hepsi uygulamaya alindi, bugun suren 7 yaris canli. Surum artik start listelerini de izler, ozet tek belgede (tyfIndex/meets) tutulur, Firestore okuma hakki korunur. Sonuc PDF isi 2 saatte bir, baraj isi gunde 4 kez. 40 Worker, 70 birim testi gecti
- 2026-11-26: Canli sonuc hatasi duzeltildi: Worker yeni yarislari ararken acilmamis yarislar 12 deneme hakkini dolduruyor, suren UGL Turkiye Finali (1005890) hic denenmiyordu. TYF sayfasindaki dogrudan canli sonuc baglantisi artik once denenir, kalanlar her turda kaydirilir; aktif yaris sorgusu bitis tarihine gore siralanir. Worker yayinlandi, 39 Worker testi gecti
- 2026-11-25: Instagram: duzeltilmis Kulupler Arasi Kisa Kulvar baraj gonderisi (tam yaris adi, notsuz) ve 26-29 Kasim Arena 11-12 Yas UGL Turkiye Finali katilim barajlari (25 m ve 50 m, TYF reglamani Revize 03.11.2026) paylasildi; profilde 11 gonderi
- 2026-11-25: Demo kulup kurulum araci (scripts/demo-kulup.mjs): 4 personel, 8 veli, 16 ogrenci, 4 ders, taksitler, yoklama, antrenman ve yaris dereceleri, yorum, antrenman, duyuru, gider, maas, ders grubu mesajlari; her kayit ilgili rolun hesabiyla yazilir, emulatorde dogrulandi. Performans analizinde stil adlari Turkce yazildi, web yayinlandi
- 2026-11-25: TYF baraj gonderisi duzeltildi: yildizli not kaldirildi, yarisin tam adi yazildi (Turkiye Sportive Kulupler Arasi Kisa Kulvar Yildiz, Genc ve Acik Yas Yuzme Sampiyonasi)
- 2026-11-25: Instagram 2. tur: 9 ozellik gorseli uretildi (icerik.mjs), tum videolarin 10 MB alti kopyalari hazir. Deneme programi, veli 1, TYF barajlari, antrenor 2 paylasildi; profilde 7 gonderi
- 2026-11-25: Instagram isletme hesabina cevrildi. Bu haftanin icerik paketi uretildi: deneme programi, TYF Kulupler Arasi Kisa Kulvar barajlari, veli kontrol listesi, antrenor ipuclari (scripts/tanitim/icerik.mjs). 11 yuzme kulubu hesabi bulundu, mesaj taslagi hazir
- 2026-11-25: Instagram @kulvar.360 kuruldu: profil fotografi ve biyografi; tanitim gorseli, yonetici ve antrenor Reels videolari kullanici onayiyla paylasildi (3 gonderi). Kayit docs/sosyal-medya-profili.md
- 2026-11-25: Sosyal medya kullanici adi kulvar360app secildi (Instagram'da kulvar360 Kahramanmarasta bir yuzme dersi hesabina ait). Instagram, TikTok ve YouTube kayit sayfalari uygulama ici tarayicida acildi
- 2026-11-25: Sosyal medya kiti: profil fotografi, YouTube, Facebook, X ve LinkedIn kapaklari, tanitim gonderisi ve hikaye gorseli (scripts/tanitim/kit.mjs), profil aciklamalari ve 5 haftalik paylasim takvimi docs/sosyal-medya-profili.md
- 2026-11-25: Yoneticinin elle yaris derecesi girisi kaldirildi, kurallar elle yaris derecesini reddeder (yalniz TYF kaynakli). Super admin icin Sonuc yukle ekrani: TYF toplu sonuc PDF'i yuklenir, adi, dogum yili, cinsiyeti ve kulubu tutan sporculara yaris derecesi yazilir. Nigde ornek PDF'iyle emulatorde denendi: 8 derece 2 kulube dogru yazildi, ikinci yuklemede tekrar yazmadi. 70 test, 249 kural, 37 Worker testi gecti
- 2026-11-25: Elle TYF sonuc aktarim ekrani (TYF aktarim menusu) kaldirildi; yaris dereceleri artik TYF Sonuclar sayfasindan her sabah otomatik gelir. 69 test, 37 Worker testi gecti, web yayinlandi
- 2026-11-25: Kulup ayrimi icin 56 yeni kural testi: baska kulubun yoneticisi 17 kulube ozel kaydi okuyamaz, 16 listeyi goremez, 19 tureden kayit ekleyemez, kulup ayarlarini degistiremez. 244/244 kural testi gecti
- 2026-11-25: Yeni APK ve Windows programi uretildi: kulube ozel duyurular, canli sonuclarda sonuc ve start listesi gecisi. TYF Sonuclari isi canlida calisti: 15 dosyanin 13'u okundu, 2'si taranmis goruntu
- 2026-11-25: Kulup ayrimi: duyurular yalniz kendi kulubune gider ve okunur (kural, ekran ve telefon bildirimi). TYF Yuzme/Sonuclar sayfasindaki toplu sonuc PDF'leri her gun GitHub isinde okunur, kulup sporcularinin yaris dereceleri kendiliginden kaydedilir. Canli sonuclarda sonuc ve start listesi ayri sekmeyle gosterilir. 68 test, 188 kural, 37 Worker testi gecti; kurallar, site ve Worker yayinlandi
- 2026-11-25: Sosyal medya serisi (13 dikey video, her birinde ayni rolun iki ozelligi, paylasim metinleri docs/sosyal-medya-paylasimlari.md) ve Turkiye Sampiyonasi icin 1 dakikalik yatay reklam filmi (karekodlu kapanis) uretildi. Android alt menu gezinme tuslarinin ustune alindi, cikis dugmesi duzeltildi; web yayinlandi, yeni APK ve exe CI'da uretildi
- 2026-11-25: Tanitim videolarindan sistem sahibi ve yoneticinin yaris derecesi sahnesi cikarildi. Rol videolari rol adiyla acilir, her rolun kendi rengi, vurusa gore gecisler, isik ve halka efektleri, hikaye cubugu var; muzikte 808 bas, drop oncesi sessizlik ve vokal kesitler eklendi. Turkce buyuk harfler duzeltildi
- 2026-11-25: Tanitim videolarindaki butun yazilar duzgun Turkceyle yeniden yazildi, her sahneye aciklama satiri eklendi, seslendirme kaldirildi. Ana film (4:39) ve yonetici, sekreter, antrenor, veli videolari uretildi. Ekran yazilari docs/tanitim-metinleri.md
- 2026-11-24: Kulvar360 logosu uygulama simgesi oldu: site, sekme simgesi, telefona kurulan web uygulamasi, bildirim, Android uyarlanabilir simge ve Windows program simgesi. Simgeler scripts/ikon-uret.mjs ile uretilir
- 2026-11-24: Uygulamanin adi Kulvar360 yapildi: site basligi, giris ve tanitim ekrani, telefona kurulan web uygulamasi, Android ve Windows paket adi. Uygulama kimligi ve site adresi degismedi. 60 test gecti, web yayinlandi
- 2026-11-24: Marka adi Kulvar360 secildi: film, 5 rol videosu ve seslendirme metinleri yeni adla uretildi
- 2026-11-24: Tanitim filminde sahne gecis parlamasi yumusatildi, film yeniden uretildi (3:44)
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
