// TYF Arena 11-12 Yaş UGL Türkiye Finali (Ankara, 26-29.11.2026) 1. ve 2. gün şampiyonları: 8 görsellik kaydırmalı gönderi.
// Veri: canli.tyf.gov.tr/live/2026/1005890 resmi sonuç PDF'leri, uygulamanın TYF okuyucusuyla çıkarıldı ve elle doğrulandı.
// Sporcular 11-12 yaşında olduğu için ad yazılmaz; yalnız kulüp, branş ve derece.
// Kullanım: node scripts/tanitim/final-sampiyonlar.mjs   (çıktı: tanitim-videolari/sosyal-medya/gonderiler/final-sampiyonlar-1..8.png)
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { URL_TEXT, icon, logoSvg } from './motor.mjs';

const OUT = resolve('tanitim-videolari', 'sosyal-medya', 'gonderiler');
mkdirSync(OUT, { recursive: true });
const W = 1080; const H = 1350;
const C = { bg: '#0c1016', panel: '#12171f', line: '#232b36', text: '#e9eef3', text2: '#b3bdc8', muted: '#8b96a4', accent: '#27c4d8', accentInk: '#032026', accentText: '#4fd3e4', gold: '#e3b341', pool: '#0d4f62' };
const font = (family, file, weight) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(resolve('src/assets/fonts', file)).toString('base64')}) format("woff2")}`;
const FONTS = [
  font('Plex', 'plex-sans-latin-ext-400.woff2', 400), font('Plex', 'plex-sans-latin-400.woff2', 400),
  font('Plex', 'plex-sans-latin-ext-500.woff2', 500), font('Plex', 'plex-sans-latin-500.woff2', 500),
  font('Plex', 'plex-sans-latin-ext-600.woff2', 600), font('Plex', 'plex-sans-latin-600.woff2', 600),
  font('PlexMono', 'plex-mono-latin-400.woff2', 400), font('PlexMono', 'plex-mono-latin-500.woff2', 500),
].join('');

// [branş, 11 yaş kulüp, derece, 12 yaş kulüp, derece]
const GIRLS = [
  ['50 m serbest', 'Dragos SK', '28.01', 'Uludağ Oksijen SK', '28.19'],
  ['100 m serbest', 'Dragos SK', '1:02.99', 'Enka SK', '1:00.82'],
  ['200 m serbest', 'Toroslar Yüzme SK', '2:14.72', 'Antalyaspor', '2:10.65'],
  ['50 m kurbağalama', 'Manavgat Yüzme Akademi', '36.52', 'Çorlu Belediyesi SK', '36.00'],
  ['100 m kelebek', 'Dragos SK', '1:08.52', 'Enka SK', '1:06.17'],
  ['200 m kelebek', null, null, 'Enka SK', '2:24.90'],
  ['200 m sırtüstü', 'Yıldız Su Sporları SK', '2:35.04', 'Albatros Yüzme Akademisi', '2:28.33'],
  ['200 m karışık', 'Manavgat Yüzme Akademi', '2:35.39', 'Enka SK', '2:32.41'],
];
const BOYS = [
  ['50 m serbest', 'Ortakçı SK', '28.34', 'TED Ankara Kolejliler SK', '26.63'],
  ['100 m serbest', 'Ortakçı SK', '59.77', 'Denizli Kumsal SK', '58.39'],
  ['200 m serbest', 'Ortakçı SK', '2:10.04', 'TED Mersin Koleji SK', '2:04.91'],
  ['50 m kurbağalama', 'Ferdi', '36.66', 'Enka SK', '33.56'],
  ['100 m kelebek', 'Denizyıldızları SK', '1:07.26', 'Kınalıada Su Sporları SK', '1:03.52'],
  ['200 m kelebek', null, null, 'TED Mersin Koleji SK', '2:21.33'],
  ['200 m sırtüstü', 'Ege Ocean Yüzme İhtisas SK', '2:32.04', 'Yıldız Su Sporları SK', '2:22.63'],
  ['200 m karışık', 'Ege Ocean Yüzme İhtisas SK', '2:31.60', 'TED Mersin Koleji SK', '2:22.24'],
];
const RELAYS = [
  ['Kızlar 4×50 m karışık', 'İTÜ SK', '2:14.48', 'Enka SK', '2:08.68'],
  ['Erkekler 4×50 m karışık', 'Göztepe SK · Vamos SK', '2:13.84', 'Enka SK', '2:04.91'],
  ['Kızlar 4×100 m serbest', 'İTÜ SK', '4:20.58', 'Enka SK', '4:08.41'],
  ['Erkekler 4×100 m serbest', 'Göztepe SK', '4:21.20', 'TED Ankara Kolejliler SK', '4:06.37'],
];
// Altın sayısı yukarıdaki tablolardan hesaplanır (eşit birincilikte iki kulüp de altın alır)
const golds = new Map();
for (const [, a, , b] of [...GIRLS, ...BOYS, ...RELAYS]) for (const c of [a, b]) if (c) c.split(' · ').forEach((k) => golds.set(k, (golds.get(k) ?? 0) + 1));
const TABLE = [...golds.entries()].sort((x, y) => y[1] - x[1] || x[0].localeCompare(y[0], 'tr'));
const TOTAL = TABLE.reduce((t, [, n]) => t + n, 0);

const SLIDES = 8;
const base = (body) => `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Plex",system-ui,sans-serif;color:${C.text};background:${C.bg};-webkit-font-smoothing:antialiased;position:relative}
.wrap{position:absolute;left:72px;right:72px;top:68px;bottom:60px;display:flex;flex-direction:column}
.top{display:flex;justify-content:space-between;align-items:center;font-size:26px;color:${C.muted}}
.brand{display:flex;align-items:center;gap:14px;font-size:30px;font-weight:600;color:${C.text}}
h1{font-weight:600;letter-spacing:-.025em;line-height:1}
h2{font-weight:600;font-size:64px;letter-spacing:-.02em;line-height:1.05}
.acc{color:${C.accentText}}.gold{color:${C.gold}}
.mono{font-family:"PlexMono",monospace;font-variant-numeric:tabular-nums}
.meta{font-size:28px;color:${C.text2};margin-top:14px}
.foot{margin-top:auto;display:flex;justify-content:space-between;font-size:24px;color:${C.muted};padding-top:18px}
.chip{display:inline-flex;align-items:center;gap:12px;border-radius:10px;background:${C.panel};border:1px solid ${C.line};color:${C.text2};font-size:28px;padding:12px 20px}
.pool{position:absolute;left:0;right:0;background:${C.pool};background-image:linear-gradient(rgba(255,255,255,.06) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.06) 2px,transparent 2px);background-size:56px 56px}
.rope{position:absolute;height:9px;left:0;width:100%;background:repeating-linear-gradient(90deg,#e9eef3 0 26px,#c8323c 26px 52px,#e9eef3 52px 78px,#1f5fae 78px 104px);opacity:.85}
.win{display:grid;grid-template-columns:64px 1fr auto;align-items:center;gap:22px;background:${C.panel};border:1px solid ${C.line};border-radius:18px;padding:20px 26px;margin-top:14px}
.win .m{width:64px;height:64px;border-radius:50%;display:grid;place-items:center;background:rgba(227,179,65,.14);border:1px solid rgba(227,179,65,.4)}
.win .ev{font-size:24px;color:${C.muted}}
.win .club{font-size:33px;font-weight:600;line-height:1.15;margin-top:2px}
.win .t{font-family:"PlexMono",monospace;font-size:38px;color:${C.accentText}}
.pod{display:flex;align-items:flex-end;gap:18px;margin-top:24px}
.pod div.col{flex:1;display:flex;flex-direction:column;align-items:center;text-align:center}
.pod .name{font-size:27px;font-weight:600;line-height:1.2;min-height:66px;display:flex;align-items:flex-end;justify-content:center}
.pod .block{width:100%;margin-top:14px;border-radius:16px 16px 0 0;display:flex;flex-direction:column;align-items:center;justify-content:flex-start;padding-top:18px;background:${C.panel};border:1px solid ${C.line};border-bottom:0}
.pod .num{font-family:"PlexMono",monospace;font-size:64px;color:${C.gold};line-height:1}
.pod .lbl{font-size:22px;color:${C.muted};margin-top:6px}
.rank{display:grid;grid-template-columns:56px 1fr auto;align-items:center;gap:18px;padding:12px 0;border-bottom:1px solid ${C.line};font-size:28px}
.rank .n{color:${C.muted};font-family:"PlexMono",monospace}
.rank .g{font-family:"PlexMono",monospace;color:${C.gold};font-size:30px;display:flex;align-items:center;gap:10px}
.dense .win{padding:13px 24px;margin-top:10px}.dense .win .m{width:54px;height:54px}.dense .win .club{font-size:31px}.dense .win .t{font-size:35px}.dense h2{font-size:58px}
.pill{display:inline-flex;align-items:center;gap:14px;border-radius:12px;font-weight:600;background:${C.accent};color:${C.accentInk};font-size:36px;padding:22px 34px}
</style><body>${body}</body></html>`;

const top = (n) => `<div class="top"><span class="brand">${logoSvg(44)}Kulvar360</span><span class="mono">${n}/${SLIDES}</span></div>`;
const foot = (right = 'Kaynak: TYF canlı sonuçlar') => `<div class="foot"><span>@kulvar.360</span><span>${right}</span></div>`;
const medal = (s = 30) => icon('Medal', s, C.gold, 1.9);
const ropes = (top, h, n, gap) => `<div class="pool" style="top:${top}px;height:${h}px">${Array.from({ length: n }, (_, i) => `<div class="rope" style="top:${(i + 1) * gap}px"></div>`).join('')}</div>`;
// Bir yaş grubunun şampiyonları: her branş büyük bir kart, telefonda rahat okunur
const winners = (n, who, age, rows) => { const dense = rows.length > 7; return base(`<div class="wrap ${dense ? 'dense' : ''}">${top(n)}
  <span class="chip" style="margin-top:40px;align-self:flex-start">${medal(28)}${age} yaş · altın madalya</span>
  <h2 style="margin-top:22px">${who} <span class="acc">${age} yaş</span> şampiyonları</h2>
  <div style="margin-top:22px">${rows.map(([ev, club, time]) => `<div class="win"><span class="m">${medal(34)}</span><span><div class="ev">${ev}</div><div class="club">${club}</div></span><span class="t">${time}</span></div>`).join('')}</div>
  ${foot()}</div>`); };
const pick = (rows, age) => rows.filter((r) => r[age === 11 ? 1 : 3]).map((r) => [r[0], r[age === 11 ? 1 : 3], r[age === 11 ? 2 : 4]]);
const first = TABLE[0];
const next3 = TABLE.filter(([, g]) => g === TABLE[1][1]);

const slides = [
  base(`${ropes(860, 490, 3, 120)}
  <div class="wrap">${top(1)}
    <span class="chip" style="margin-top:80px;align-self:flex-start">${icon('MapPin', 30, C.accentText, 1.75)}Ankara · 26-29 Kasım 2026</span>
    <h1 style="font-size:118px;margin-top:40px">Türkiye Finali<br><span class="acc">şampiyonları</span></h1>
    <div style="display:flex;align-items:center;gap:22px;margin-top:44px">${medal(76)}<span class="mono gold" style="font-size:96px;line-height:1">${TOTAL}</span><span style="font-size:32px;color:${C.text2};line-height:1.3">altın madalya<br>1. ve 2. gün</span></div>
    <p style="margin-top:auto;font-size:30px;color:${C.text};position:relative;display:flex;align-items:center;gap:12px">Arena 11-12 Yaş UGL · Kaydır, kulübünü bul ${icon('ArrowRight', 30, C.accentText, 2)}</p>
  </div>`),
  base(`<div class="wrap">${top(2)}
    <h2 style="margin-top:44px">Altın <span class="gold">kürsüsü</span></h2>
    <p class="meta">Kulüplerin 1. ve 2. gündeki altın madalya sayısı</p>
    <div class="pod">
      ${[next3[0], first, next3[1]].map((row, i) => `<div class="col"><div class="name">${row[0]}</div><div class="block" style="height:${i === 1 ? 260 : 170}px${i === 1 ? `;border-color:rgba(227,179,65,.45);background:rgba(227,179,65,.08)` : ''}">${i === 1 ? medal(44) : ''}<span class="num" style="margin-top:${i === 1 ? 10 : 0}px">${row[1]}</span><span class="lbl">altın</span></div></div>`).join('')}
    </div>
    <div style="border-top:1px solid ${C.line}">${TABLE.slice(1).filter(([c]) => c !== next3[0][0] && c !== next3[1][0]).filter(([, g]) => g > 1).map(([c, g]) => `<div class="rank"><span class="n">${String(1 + TABLE.filter(([, x]) => x > g).length).padStart(2, '0')}</span><span>${c}</span><span class="g">${medal(26)}${g}</span></div>`).join('')}</div>
    <p style="margin-top:20px;font-size:24px;line-height:1.5;color:${C.text2}"><span class="gold">1 altın:</span> ${TABLE.filter(([, g]) => g === 1).map(([c]) => c).join(' · ')}</p>
    ${foot()}</div>`),
  winners(3, 'Kızlar', 11, pick(GIRLS, 11)),
  winners(4, 'Kızlar', 12, pick(GIRLS, 12)),
  winners(5, 'Erkekler', 11, pick(BOYS, 11)),
  winners(6, 'Erkekler', 12, pick(BOYS, 12)),
  base(`<div class="wrap">${top(7)}
    <span class="chip" style="margin-top:40px;align-self:flex-start">${icon('Users', 28, C.accentText, 1.75)}Bayrak · takım altınları</span>
    <h2 style="margin-top:22px">Bayrak <span class="acc">şampiyonları</span></h2>
    <div style="margin-top:22px">${RELAYS.flatMap(([ev, a, at, b, bt]) => [[`${ev} · 11 yaş`, a, at], [`${ev} · 12 yaş`, b, bt]]).map(([ev, club, time]) => `<div class="win" style="padding:12px 22px;margin-top:10px"><span class="m" style="width:56px;height:56px">${medal(30)}</span><span><div class="ev">${ev}</div><div class="club" style="font-size:30px">${club}</div></span><span class="t" style="font-size:34px">${time}</span></div>`).join('')}</div>
    ${foot()}</div>`),
  base(`${ropes(960, 390, 3, 98)}
  <div class="wrap">${top(8)}
    <h1 style="font-size:96px;margin-top:110px">Bütün sonuçlar<br><span class="acc">anında cebinde</span></h1>
    <p class="meta" style="font-size:36px;line-height:1.4;margin-top:34px">Kulvar360, TYF sonuçlarını yayınlandığı anda gösterir; sporcunun derecesi kendiliğinden performans sayfasına işlenir.</p>
    <div style="margin-top:48px"><span class="pill">${icon('ArrowRight', 36, C.accentInk, 2.2)}${URL_TEXT}</span></div>
    <p style="margin-top:28px;font-size:30px;color:${C.text2}">Kulüplere 2 hafta ücretsiz deneme</p>
  </div>`),
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
for (const [i, html] of slides.entries()) {
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => [...document.querySelectorAll('.wrap *')].some((e) => e.getBoundingClientRect().bottom > 1350 - 40));
  if (overflow) console.warn(`Uyarı: ${i + 1}. görselde taşma var`);
  await page.screenshot({ path: resolve(OUT, `final-sampiyonlar-${i + 1}.png`) });
}
await browser.close();
console.log(TABLE.map(([c, g]) => `${g} ${c}`).join('\n'));
console.log(`toplam ${TOTAL}`);
