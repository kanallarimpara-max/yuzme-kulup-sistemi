// Instagram kaydırmalı gönderileri (1080x1350): deneme programı, veli kontrol listesi, TYF baraj tablosu, antrenör ipuçları.
// Kullanım: node scripts/tanitim/icerik.mjs   (çıktı: tanitim-videolari/sosyal-medya/gonderiler)
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { BRAND, URL_TEXT, icon, logoSvg } from './motor.mjs';
import { formatSwimTime } from '../../src/lib/rules.ts';

const OUT = resolve('tanitim-videolari', 'sosyal-medya', 'gonderiler');
mkdirSync(OUT, { recursive: true });
const W = 1080; const H = 1350;

const page = (body, accent = ['#43f3ff', '#6a7bff']) => `<!doctype html><html lang="tr"><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#f2fbff;-webkit-font-smoothing:antialiased;position:relative;
background:radial-gradient(900px 600px at 85% 8%,${accent[0]}44,transparent 60%),radial-gradient(900px 700px at 5% 100%,${accent[1]}55,transparent 60%),linear-gradient(165deg,#061a2e,#08243f 55%,#0b1640)}
.lanes{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 178px,rgba(120,220,255,.05) 178px 181px)}
.wrap{position:absolute;left:84px;right:84px;top:96px;bottom:96px;display:flex;flex-direction:column}
.brand{display:flex;align-items:center;gap:18px;font-weight:900;font-size:40px;letter-spacing:-.01em}
.kicker{display:inline-flex;align-items:center;gap:12px;font-size:28px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:${accent[0]}}
h1{font-size:96px;line-height:1.02;font-weight:900;letter-spacing:-.02em}
h2{font-size:64px;line-height:1.08;font-weight:900;letter-spacing:-.01em}
.hl{background:linear-gradient(90deg,${accent[0]},${accent[1]});-webkit-background-clip:text;color:transparent}
.sub{font-size:36px;line-height:1.4;font-weight:600;color:#cfe3ee}
.card{background:rgba(255,255,255,.06);border:1px solid rgba(160,230,255,.18);border-radius:30px;padding:30px 34px}
.row{display:flex;gap:24px;align-items:flex-start}
.num{flex:none;width:68px;height:68px;border-radius:20px;display:grid;place-items:center;font-size:36px;font-weight:900;color:#03101e;background:linear-gradient(135deg,${accent[0]},${accent[1]})}
.ic{flex:none;width:68px;height:68px;border-radius:20px;display:grid;place-items:center;background:linear-gradient(135deg,${accent[0]},${accent[1]})}
.pill{display:inline-flex;align-items:center;gap:12px;border-radius:99px;font-weight:800;font-size:32px;padding:16px 34px;color:#03101e;background:linear-gradient(90deg,${accent[0]},${accent[1]})}
.foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:28px;font-weight:700;color:#9fc3d6}
.swipe{font-size:28px;font-weight:800;color:${accent[0]}}
table{border-collapse:collapse;width:100%;font-variant-numeric:tabular-nums}
th{font-size:22px;font-weight:800;color:${accent[0]};text-align:right;padding:6px 8px;white-space:nowrap;border-bottom:2px solid rgba(160,230,255,.3)}
th:first-child,td:first-child{text-align:left}
td{font-size:24px;font-weight:650;text-align:right;padding:4px 8px;white-space:nowrap;border-bottom:1px solid rgba(160,230,255,.1)}
tr:nth-child(even) td{background:rgba(255,255,255,.03)}
</style><body><div class="lanes"></div><div class="wrap">${body}</div></body></html>`;

const brand = `<div class="brand">${logoSvg(64)}<span>${BRAND}</span></div>`;
const foot = (n, total, last = false) => `<div class="foot"><span>@kulvar.360</span>${last ? `<span>${URL_TEXT}</span>` : `<span class="swipe">Kaydır → ${n}/${total}</span>`}</div>`;
const item = (lead, title, text) => `<div class="card row">${lead}<div><div style="font-size:38px;font-weight:850">${title}</div>${text ? `<div class="sub" style="font-size:30px;margin-top:6px">${text}</div>` : ''}</div></div>`;
const num = (n) => `<div class="num">${n}</div>`;
const ic = (name) => `<div class="ic">${icon(name, 38, '#03101e', 2.4)}</div>`;
const list = (items) => `<div style="display:grid;gap:22px;margin-top:44px">${items.join('')}</div>`;

const SETS = {};

// 1) Ücretsiz deneme programı
SETS.deneme = [
  page(`${brand}<div style="margin-top:120px"><div class="kicker">${icon('Gift', 30, 'currentColor', 2.4)}Kulüpler için deneme programı</div>
    <h1 style="margin-top:28px">Kulübünüz için<br><span class="hl">2 hafta ücretsiz</span></h1>
    <p class="sub" style="margin-top:36px">Ön kayıttan tahsilata, yoklamadan TYF sonuçlarına kadar kulübünüzü Kulvar360 ile yönetin. Kontenjan sınırı yok.</p></div>
    <div style="margin-top:60px"><span class="pill">${icon('Sparkles', 32, '#03101e', 2.4)}Denemeyi tamamlayana +2 hafta hediye</span></div>${foot(1, 3)}`),
  page(`${brand}<h2 style="margin-top:70px">Deneme süresince <span class="hl">her şey açık</span></h2>${list([
    item(ic('Building2'), 'Yönetici', 'Gelir-gider, ders programı, personel, duyuru'),
    item(ic('ClipboardList'), 'Sekreter', 'Ön kayıt formu, kesin kayıt, taksit ve tahsilat'),
    item(ic('Timer'), 'Antrenör', 'Akıllı yoklama, antrenman, kronometre, yapay zekâ'),
    item(ic('Heart'), 'Veli', 'Ödeme, devam, gelişim grafiği, barajlar, canlı sonuç'),
  ])}${foot(2, 3)}`),
  page(`${brand}<h2 style="margin-top:70px">Nasıl <span class="hl">katılırım?</span></h2>${list([
    item(num(1), 'Bize mesaj atın', "Instagram'dan DM veya profildeki bağlantı"),
    item(num(2), 'Kulübünüzü aynı gün açalım', 'Kısa bir tanıtımla birlikte'),
    item(num(3), '2 hafta ücretsiz kullanın', 'Tüm roller, tüm özellikler'),
    item(num(4), 'Görüşünüzü paylaşın', 'Ana modelde 2 hafta da bizden hediye'),
  ])}${foot(3, 3, true)}`),
];

// 2) Veliler için yarış günü kontrol listesi
const P = ['#ff9ad5', '#9a7bff'];
SETS['veli-kontrol'] = [
  page(`${brand}<div style="margin-top:150px"><div class="kicker">${icon('Heart', 30, 'currentColor', 2.4)}Yüzücü velileri için</div>
    <h1 style="margin-top:28px">Yarış günü<br><span class="hl">kontrol listesi</span></h1>
    <p class="sub" style="margin-top:36px">Çantayı hazırlarken ve havuz başında unutulanlar. Kaydedin, yarış sabahı açıp bakın.</p></div>${foot(1, 3)}`, P),
  page(`${brand}<h2 style="margin-top:70px">Çantada <span class="hl">olması gerekenler</span></h2>${list([
    item(ic('Glasses'), '2 gözlük, 2 bone', 'Biri yırtılır ya da kayışı kopar'),
    item(ic('Shirt'), 'Havlu, terlik, eşofman', 'Yarışlar arası üşümesin'),
    item(ic('CupSoda'), 'Su ve hafif atıştırmalık', 'Muz, kuru meyve, kraker'),
    item(ic('IdCard'), 'Lisans ve kimlik', 'Kayıt masasında istenebilir'),
  ])}${foot(2, 3)}`, P),
  page(`${brand}<h2 style="margin-top:70px">Havuz <span class="hl">başında</span></h2>${list([
    item(ic('ListOrdered'), 'Start listesine bakın', 'Seri ve kulvar numarasını not alın'),
    item(ic('Clock'), 'Isınmaya erken gidin', 'Isınma saati genelde ilk yarıştan 1 saat önce'),
    item(ic('Smile'), 'Sonuç ne olursa olsun', 'Önce emeğini, sonra derecesini konuşun'),
    item(ic('Radio'), 'Sonuçları canlı izleyin', "Kulvar360'ta start listesi ve sonuçlar tek ekranda"),
  ])}${foot(3, 3, true)}`, P),
];

// 3) TYF Kulüpler Arası Kısa Kulvar Şampiyonası katılım barajları (25 m havuz dereceleri)
const T = ['#3ff0ff', '#4b6bff'];
const std = JSON.parse(readFileSync(resolve('src/data/standards.json'), 'utf8'));
const champ = std.standards.filter((s) => /KULÜPLER ARASI KISA KULVAR/.test(s.title) && s.kind === 'katilim' && s.pool === '25m');
const ORDER = ['serbest', 'sirt', 'kurbaga', 'kelebek', 'karisik'];
const LABEL = { serbest: 'Serbest', sirt: 'Sırt', kurbaga: 'Kurbağa', kelebek: 'Kelebek', karisik: 'Karışık' };
const ageKey = (s) => `${s.age}-${s.maxAge ?? s.age}`;
const ageLabel = (k) => { const [a, b] = k.split('-').map(Number); return b >= 99 ? `${a}+` : a === b ? `${a}` : `${a}-${b}`; };
const table = (gender) => {
  const rows = champ.filter((s) => s.gender === gender);
  const ages = [...new Set(rows.map(ageKey))].sort((a, b) => Number(a.split('-')[0]) - Number(b.split('-')[0]));
  const events = [...new Set(rows.map((s) => `${s.stroke}|${s.distance}`))].sort((a, b) => {
    const [sa, da] = a.split('|'); const [sb, db] = b.split('|');
    return ORDER.indexOf(sa) - ORDER.indexOf(sb) || Number(da) - Number(db);
  });
  const cell = (ev, age) => rows.find((s) => `${s.stroke}|${s.distance}` === ev && ageKey(s) === age);
  return `<table><tr><th>Yarış</th>${ages.map((a) => `<th>${ageLabel(a)} yaş</th>`).join('')}</tr>${events.map((ev) => {
    const [st, d] = ev.split('|');
    // TYF reglamanının 25 m tablosunda 100 m karışık, 100 m sırtüstü ile aynı yazılmış; olduğu gibi aktarılır ve işaretlenir.
    const same = rows.some((s) => s.stroke === 'karisik' && s.distance === 100) && st === 'karisik' && d === '100';
    return `<tr><td>${d} m ${LABEL[st]}</td>${ages.map((a) => `<td>${cell(ev, a) ? formatSwimTime(cell(ev, a).timeMs) : '—'}</td>`).join('')}</tr>`;
  }).join('')}</table>`;
};
const when = champ[0]?.when ?? '';
SETS['tyf-baraj'] = [
  page(`${brand}<div style="margin-top:130px"><div class="kicker">${icon('Target', 30, 'currentColor', 2.4)}TYF · ${when}</div>
    <h1 style="margin-top:28px;font-size:64px;line-height:1.08">Türkiye Sportive Kulüpler Arası <span class="hl">Kısa Kulvar</span> Yıldız, Genç ve Açık Yaş Yüzme Şampiyonası</h1><div style="font-size:52px;font-weight:900;margin-top:22px">Katılım barajları</div>
    <p class="sub" style="margin-top:30px">25 m havuz dereceleri, kızlar ve erkekler ayrı tabloda. Kaydedin, sporcunuzla birlikte bakın.</p></div>${foot(1, 3)}`, T),
  page(`${brand}<h2 style="margin-top:30px;font-size:50px">Kızlar · <span class="hl">katılım barajları</span></h2><div class="sub" style="font-size:24px;margin:4px 0 12px">25 m havuz · ${when}</div>${table('K')}
    <div class="sub" style="font-size:20px;margin-top:10px;line-height:1.3">Kaynak: TYF reglamanı (Revize 28.10.2026).</div>${foot(2, 3)}`, T),
  page(`${brand}<h2 style="margin-top:30px;font-size:50px">Erkekler · <span class="hl">katılım barajları</span></h2><div class="sub" style="font-size:24px;margin:4px 0 12px">25 m havuz · ${when}</div>${table('E')}
    <div class="sub" style="font-size:20px;margin-top:10px;line-height:1.3">Kulvar360 veli ekranında barajlar her gün güncellenir.</div>${foot(3, 3, true)}`, T),
];

// 4) Antrenörler için zaman kazandıran 5 alışkanlık
const C = ['#b8ff5c', '#14c9a2'];
SETS['antrenor-ipucu'] = [
  page(`${brand}<div style="margin-top:150px"><div class="kicker">${icon('Timer', 30, 'currentColor', 2.4)}Antrenörler için</div>
    <h1 style="margin-top:28px">Haftada saatler<br>kazandıran <span class="hl">5 alışkanlık</span></h1>
    <p class="sub" style="margin-top:36px">Kâğıt, Excel ve mesaj gruplarıyla geçen zamanı havuza geri verin.</p></div>${foot(1, 3)}`, C),
  page(`${brand}<h2 style="margin-top:70px">İlk <span class="hl">üçü</span></h2>${list([
    item(num(1), 'Yoklamayı telefondan alın', 'Ders saatinde liste hazır gelsin, tek dokunuşla kaydedin'),
    item(num(2), 'Antrenmanı set set yazın', 'Tekrar, mesafe, çıkış süresi; veliye kendiliğinden gitsin'),
    item(num(3), 'Dereceyi havuz başında girin', 'Gelişim grafiği kendiliğinden güncellensin'),
  ])}${foot(2, 3)}`, C),
  page(`${brand}<h2 style="margin-top:70px">Ve <span class="hl">son ikisi</span></h2>${list([
    item(num(4), 'Kronometreyi telefondan yönetin', 'Tablette büyük ekran, cebinizde kumanda'),
    item(num(5), 'Eksik stili verilerle görün', 'Yapay zekâ dersinizi stil stil analiz etsin, program önersin'),
  ])}<div style="margin-top:56px"><span class="pill">${icon('Sparkles', 32, '#03101e', 2.4)}Hepsi Kulvar360'ta</span></div>${foot(3, 3, true)}`, C),
];

// 5) Tek özellik tanıtımı: gerçek uygulama ekranı telefon çerçevesinde (yönetici, antrenör, veli).
const SHOT = (name) => `data:image/png;base64,${readFileSync(resolve('tanitim-videolari/kaynak/ekran', `reel-${name}.png`)).toString('base64')}`;
const ROLE = {
  yonetici: { label: 'Kulüp yöneticisi', icon: 'Building2', accent: ['#3ff0ff', '#4b6bff'] },
  antrenor: { label: 'Antrenör', icon: 'Timer', accent: ['#b8ff5c', '#14c9a2'] },
  veli: { label: 'Veli', icon: 'Heart', accent: ['#c79bff', '#ff6fae'] },
};
const feature = (role, shot, title, points) => {
  const r = ROLE[role];
  return page(`${brand}<div class="kicker" style="margin-top:40px">${icon(r.icon, 30, 'currentColor', 2.4)}${r.label}</div>
    <h2 style="margin-top:16px;font-size:60px">${title}</h2>
    <div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:24px">${points.map(([ic2, t]) => `<span style="display:inline-flex;align-items:center;gap:10px;font-size:26px;font-weight:750;padding:10px 18px;border-radius:99px;background:rgba(255,255,255,.08);border:1px solid rgba(160,230,255,.22)">${icon(ic2, 26, r.accent[0], 2.4)}${t}</span>`).join('')}</div>
    <div style="position:absolute;left:50%;transform:translateX(-50%);top:${points.length > 2 ? 470 : 430}px;width:600px;height:1000px;border-radius:64px 64px 0 0;background:#0b1220;padding:16px 16px 0;box-shadow:0 0 0 3px rgba(160,230,255,.25),0 40px 90px rgba(0,0,0,.55),0 0 120px ${r.accent[0]}33;overflow:hidden">
      <div style="width:100%;height:100%;border-radius:50px 50px 0 0;overflow:hidden;background:url('${SHOT(shot)}') top center/100% auto no-repeat"></div></div>
    <div style="position:absolute;left:-84px;right:-84px;bottom:-96px;height:230px;background:linear-gradient(180deg,transparent,#0a1838 55%)"></div>
    <div class="foot" style="position:absolute;left:0;right:0;bottom:0;z-index:2"><span>@kulvar.360</span><span>${URL_TEXT}</span></div>`, r.accent);
};
SETS.ozellik = [
  feature('antrenor', 'krono-kontrol', 'Kronometrenin kumandası <span class="hl">cebinizde</span>', [['Radio', 'Cihazlar anlık eşitlenir'], ['Volume2', 'Kulvar başına çıkış sesi'], ['Lock', 'Dokunma kilidi']]),
  feature('veli', 'veli-barajlar', 'Yaşına uygun <span class="hl">TYF barajları</span>', [['RefreshCw', 'Her gün güncel'], ['BadgeCheck', 'Geçilenler işaretli'], ['Users', 'Yaşa ve cinsiyete göre']]),
  feature('yonetici', 'admin-finans', 'Kulübün parası <span class="hl">tek ekranda</span>', [['Wallet', 'Tahsilat'], ['Receipt', 'Gider ve maaş'], ['ChartLine', 'Aylık kâr grafiği']]),
  feature('veli', 'veli-performans', 'Gelişimini <span class="hl">grafikle</span> izleyin', [['TrendingUp', 'Derece grafiği'], ['MessageCircle', 'Antrenör yorumları'], ['Sparkles', 'Yapay zekâ önerisi']]),
  feature('antrenor', 'ders-analizi', 'Dersinizi <span class="hl">stil stil</span> analiz eder', [['Target', 'Eksik stil'], ['Medal', 'Yarış ve antrenman derecesi'], ['CalendarDays', 'Program önerisi']]),
  feature('yonetici', 'admin-personel', 'Antrenör ve sekreteri <span class="hl">hemen ekleyin</span>', [['UserPlus', 'Hesap hemen açılır'], ['MapPin', 'Şubeye atanır'], ['ShieldCheck', 'Herkes kendi ekranını görür']]),
  feature('veli', 'canli-sonuc', 'Yarış sonuçları <span class="hl">uygulamada</span>', [['Radio', 'Canlı yenilenir'], ['ListOrdered', 'Start listesi'], ['Search', 'Sporcunu ara']]),
  feature('antrenor', 'antrenor-pazar', 'Antrenmanlarınızı <span class="hl">paylaşın</span>', [['Coins', 'Kredi karşılığında'], ['ShoppingCart', 'Hazır antrenman al'], ['Dumbbell', 'Set set hazırla']]),
  feature('yonetici', 'admin-duyuru', 'Duyurunuz <span class="hl">herkese anında</span>', [['Bell', 'Telefona bildirim'], ['Users', 'Ders veya kişi seçerek'], ['ShieldCheck', 'Yalnız kendi kulübünüze']]),
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [name, slides] of Object.entries(SETS)) {
  for (const [i, html] of slides.entries()) {
    const p = await browser.newPage({ viewport: { width: W, height: H } });
    await p.setContent(html);
    await p.evaluate(() => document.fonts.ready);
    const file = join(OUT, `${name}-${i + 1}.png`);
    await p.screenshot({ path: file, type: 'png' });
    await p.close();
    console.log('hazır', file.split(/[\\/]/).pop());
  }
}
await browser.close();
