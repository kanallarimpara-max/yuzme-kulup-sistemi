// Sosyal medya kiti: profil fotoğrafı, platform kapakları, tanıtım gönderisi ve hikâye görseli.
// Kullanım: node scripts/tanitim/kit.mjs   (çıktı: tanitim-videolari/sosyal-medya-kiti)
// Görünüm uygulamayla aynı: nötr koyu zemin, tek camgöbeği vurgu, IBM Plex yazı tipi, parlama ve gradyan yok.
import { mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { BRAND, URL_TEXT, icon, logoSvg } from './motor.mjs';

const OUT = resolve('tanitim-videolari', 'sosyal-medya-kiti');
mkdirSync(OUT, { recursive: true });

const C = { bg: '#0c1016', panel: '#12171f', panel2: '#1a212b', line: '#232b36', text: '#e9eef3', text2: '#b3bdc8', muted: '#8b96a4', accent: '#27c4d8', accentInk: '#032026', accentText: '#4fd3e4', pool: '#0d4f62' };
const TAGLINE = 'Yüzme kulüpleri için yönetim sistemi';
const FEATURES = [['UserPlus', 'Ön kayıt'], ['Wallet', 'Taksit ve tahsilat'], ['ClipboardCheck', 'Yoklama'], ['Timer', 'Kronometre'], ['Radio', 'Canlı sonuçlar'], ['CalendarDays', 'Yarış takvimi']];
const RESULTS = [[3, 'Ece Y.', '1:04.32'], [4, 'Defne A.', '1:04.87'], [2, 'Zeynep K.', '1:06.15'], [5, 'Lara T.', '1:07.40']];

const font = (family, file, weight) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(resolve('src/assets/fonts', file)).toString('base64')}) format("woff2")}`;
const FONTS = [
  font('Plex', 'plex-sans-latin-ext-400.woff2', 400), font('Plex', 'plex-sans-latin-400.woff2', 400),
  font('Plex', 'plex-sans-latin-ext-500.woff2', 500), font('Plex', 'plex-sans-latin-500.woff2', 500),
  font('Plex', 'plex-sans-latin-ext-600.woff2', 600), font('Plex', 'plex-sans-latin-600.woff2', 600),
  font('PlexMono', 'plex-mono-latin-400.woff2', 400), font('PlexMono', 'plex-mono-latin-500.woff2', 500),
].join('');

const base = (w, h, body, bg = C.bg) => `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:"Plex",system-ui,sans-serif;color:${C.text};background:${bg};-webkit-font-smoothing:antialiased;position:relative}
.brand{font-weight:600;letter-spacing:-.01em}
.accent{color:${C.accentText}}
.pill{display:inline-flex;align-items:center;gap:.5em;border-radius:.4em;font-weight:600;background:${C.accent};color:${C.accentInk}}
.chip{display:inline-flex;align-items:center;gap:.45em;border-radius:.4em;font-weight:500;background:${C.panel};border:1px solid ${C.line};color:${C.text2}}
.mono{font-family:"PlexMono",monospace;font-variant-numeric:tabular-nums}
.pool{position:absolute;background:${C.pool};background-image:linear-gradient(rgba(255,255,255,.06) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.06) 1px,transparent 1px);overflow:hidden}
.rope{position:absolute;left:0;right:0;background:repeating-linear-gradient(90deg,#e9eef3 0 24px,#c8323c 24px 48px,#e9eef3 48px 72px,#1f5fae 72px 96px);opacity:.85}
.card{position:absolute;background:${C.panel};border:1px solid ${C.line};border-radius:.6em;box-shadow:0 24px 60px rgba(0,0,0,.35)}
.card header{display:flex;justify-content:space-between;align-items:baseline;padding:.9em 1.1em .7em;border-bottom:1px solid ${C.line}}
.card header small{color:${C.muted};font-size:.8em}
.card ol{list-style:none;padding:.4em 1.1em .7em}
.card li{display:grid;grid-template-columns:1.4em 1fr auto;gap:.8em;padding:.42em 0;color:${C.text2}}
.card li span:first-child{color:${C.muted}}
.card li.first b{color:${C.accentText}}
.card b{font-weight:500}
</style><body>${body}</body></html>`;

const center = (inner, style = '') => `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${style}">${inner}</div>`;
const lockup = (logo, text, gap) => `<div style="display:flex;align-items:center;gap:${gap}px">${logoSvg(logo)}<div class="brand" style="font-size:${text}px">${BRAND}</div></div>`;
const chips = (size, list = FEATURES) => `<div style="display:flex;flex-wrap:wrap;gap:${size * 0.45}px">${list.map(([ic, t]) => `<span class="chip" style="font-size:${size}px;padding:${size * 0.42}px ${size * 0.7}px">${icon(ic, size * 1.05, C.accentText, 1.75)}${t}</span>`).join('')}</div>`;

// Havuz: kulvar ipleri ve üstünde canlı sonuç kartı (uygulamadaki tanıtım görseliyle aynı fikir)
const pool = ({ x, y, w, h, lanes, size, cardX, cardY, cardW }) => {
  const gap = h / lanes;
  const ropes = Array.from({ length: lanes - 1 }, (_, i) => `<div class="rope" style="top:${Math.round(gap * (i + 1) - size * 0.09)}px;height:${Math.round(size * 0.18)}px"></div>`).join('');
  const nums = Array.from({ length: lanes }, (_, i) => `<span class="mono" style="position:absolute;left:${size * 0.6}px;top:${Math.round(gap * i + gap / 2 - size * 0.6)}px;font-size:${size}px;color:rgba(233,238,243,.55)">${i + 1}</span>`).join('');
  const card = `<div class="card" style="left:${cardX}px;top:${cardY}px;width:${cardW}px;font-size:${size}px">
    <header><strong style="font-weight:600">100 m serbest · Final</strong><small>Canlı sonuç</small></header>
    <ol>${RESULTS.map(([l, n, t], i) => `<li class="${i === 0 ? 'first' : ''}"><span class="mono">${l}</span><span>${n}</span><b class="mono">${t}</b></li>`).join('')}</ol></div>`;
  return `<div class="pool" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px;border-radius:${size * 0.6}px;background-size:${size * 1.4}px ${size * 1.4}px">${ropes}${nums}</div>${card}`;
};

const ITEMS = [
  // Profil fotoğrafı: zemin logonun zeminiyle aynı, yuvarlak kesimde işaret ortada kalır.
  ['profil-fotografi-1080.png', 1080, 1080, base(1080, 1080, center(logoSvg(860)), '#0f1d29')],
  ['youtube-kapak-2560x1440.png', 2560, 1440, base(2560, 1440, center(`<div style="width:1546px;text-align:center">
    <div style="display:flex;justify-content:center">${lockup(170, 132, 40)}</div>
    <div style="font-size:52px;margin-top:28px;color:${C.text2}">${TAGLINE}</div>
    <div class="mono" style="font-size:38px;margin-top:30px;color:${C.accentText}">${URL_TEXT}</div></div>`))],
  ['x-kapak-1500x500.png', 1500, 500, base(1500, 500, `<div style="position:absolute;right:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right">
    ${lockup(100, 80, 26)}<div style="font-size:32px;margin-top:16px;color:${C.text2}">${TAGLINE}</div>
    <div class="mono" style="font-size:26px;margin-top:18px;color:${C.accentText}">${URL_TEXT}</div></div>`)],
  ['facebook-kapak-1640x624.png', 1640, 624, base(1640, 624, center(`<div style="text-align:center">
    <div style="display:flex;justify-content:center">${lockup(120, 92, 30)}</div>
    <div style="font-size:36px;margin-top:18px;color:${C.text2}">${TAGLINE}</div>
    <div class="mono" style="font-size:28px;margin-top:20px;color:${C.accentText}">${URL_TEXT}</div></div>`))],
  ['linkedin-kapak-1584x396.png', 1584, 396, base(1584, 396, `<div style="position:absolute;right:70px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right">
    ${lockup(88, 70, 22)}<div style="font-size:28px;margin-top:12px;color:${C.text2}">${TAGLINE}</div></div>`)],
  // Tanıtım gönderisi: Instagram ve Facebook dikey gönderi oranı.
  ['tanitim-gonderisi-1080x1350.png', 1080, 1350, base(1080, 1350, `<div style="position:absolute;left:84px;right:84px;top:96px">
    ${lockup(96, 56, 22)}
    <div class="brand" style="font-size:84px;line-height:1.08;margin-top:64px;letter-spacing:-.02em">Kulübünün bütün işleri<br><span class="accent">tek kulvarda</span></div>
    <div style="font-size:34px;margin-top:28px;color:${C.text2};line-height:1.4">Yönetici, sekreter, antrenör ve veli aynı uygulamada</div></div>
    ${pool({ x: 84, y: 640, w: 912, h: 460, lanes: 5, size: 30, cardX: 400, cardY: 790, cardW: 560 })}
    <div style="position:absolute;left:84px;right:84px;bottom:84px;display:flex;justify-content:space-between;align-items:center">
    <span class="mono" style="font-size:30px;color:${C.accentText}">${URL_TEXT}</span><span style="font-size:28px;color:${C.muted}">2 hafta ücretsiz deneme</span></div>`)],
  ['hikaye-1080x1920.png', 1080, 1920, base(1080, 1920, `<div style="position:absolute;left:84px;right:84px;top:250px">
    ${lockup(110, 64, 26)}
    <div class="brand" style="font-size:96px;line-height:1.08;margin-top:80px;letter-spacing:-.02em">Kulübünün bütün işleri <span class="accent">tek kulvarda</span></div>
    <div style="font-size:40px;margin-top:34px;color:${C.text2};line-height:1.4">${TAGLINE}</div>
    <div style="margin-top:56px">${chips(32, FEATURES.slice(0, 3))}</div></div>
    ${pool({ x: 84, y: 990, w: 912, h: 420, lanes: 5, size: 30, cardX: 380, cardY: 1120, cardW: 580 })}
    <div style="position:absolute;left:0;right:0;bottom:150px;text-align:center"><span class="pill" style="font-size:40px;padding:22px 44px">2 hafta ücretsiz dene</span>
    <div class="mono" style="font-size:32px;margin-top:28px;color:${C.muted}">${URL_TEXT}</div></div>`)],
];

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const [file, w, h, html] of ITEMS) {
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  await page.setContent(html);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: join(OUT, file), type: 'png' });
  await page.close();
  console.log('hazır', file);
}
await browser.close();
