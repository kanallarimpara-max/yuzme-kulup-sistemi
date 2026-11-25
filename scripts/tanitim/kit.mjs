// Sosyal medya kiti: profil fotoğrafı, platform kapakları, tanıtım gönderisi ve hikâye görseli.
// Kullanım: node scripts/tanitim/kit.mjs   (çıktı: tanitim-videolari/sosyal-medya-kiti)
import { mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { BRAND, URL_TEXT, icon, logoSvg } from './motor.mjs';

const OUT = resolve('tanitim-videolari', 'sosyal-medya-kiti');
mkdirSync(OUT, { recursive: true });

const TAGLINE = 'Yüzme kulüpleri için hepsi bir arada yönetim sistemi';
const FEATURES = [['UserPlus', 'Ön kayıt'], ['Wallet', 'Taksit ve tahsilat'], ['ClipboardCheck', 'Akıllı yoklama'], ['Timer', 'Kronometre'], ['Sparkles', 'Yapay zekâ'], ['Radio', 'Canlı sonuçlar']];

const base = (w, h, body, extra = '') => `<!doctype html><html lang="tr"><meta charset="utf-8"><style>
*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#f2fbff;-webkit-font-smoothing:antialiased;
background:radial-gradient(1200px 700px at 78% 18%,rgba(67,243,255,.28),transparent 60%),radial-gradient(1000px 700px at 12% 95%,rgba(106,75,255,.35),transparent 60%),linear-gradient(160deg,#061a2e,#08243f 55%,#0b1640);position:relative}
.lanes{position:absolute;inset:0;background:repeating-linear-gradient(90deg,transparent 0 ${Math.round(h / 6)}px,rgba(120,220,255,.06) ${Math.round(h / 6)}px ${Math.round(h / 6) + 3}px);mask-image:linear-gradient(180deg,transparent,#000 40%,#000 70%,transparent)}
.brand{font-weight:900;letter-spacing:-.02em}
.hl{background:linear-gradient(90deg,#43f3ff,#7c8bff);-webkit-background-clip:text;color:transparent}
.pill{display:inline-flex;align-items:center;gap:.5em;border-radius:99px;font-weight:800;background:linear-gradient(90deg,#43f3ff,#6a7bff);color:#03101e}
.chip{display:inline-flex;align-items:center;gap:.45em;border-radius:99px;font-weight:700;background:rgba(255,255,255,.08);border:1px solid rgba(160,230,255,.25);color:#e6f6ff}
${extra}</style><body><div class="lanes"></div>${body}</body></html>`;

const center = (inner, style = '') => `<div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;${style}">${inner}</div>`;
const lockup = (logo, text, gap) => `<div style="display:flex;align-items:center;gap:${gap}px">${logoSvg(logo)}<div class="brand" style="font-size:${text}px">${BRAND}</div></div>`;
const chips = (size, list = FEATURES) => `<div style="display:flex;flex-wrap:wrap;gap:${size * 0.5}px">${list.map(([ic, t]) => `<span class="chip" style="font-size:${size}px;padding:${size * 0.45}px ${size * 0.8}px">${icon(ic, size * 1.1, '#6ff2ff', 2.4)}${t}</span>`).join('')}</div>`;

const ITEMS = [
  // Profil fotoğrafı: bütün platformlar yuvarlak keser, işaret ortada güvenli alanda kalır.
  ['profil-fotografi-1080.png', 1080, 1080, base(1080, 1080, center(`<div style="filter:drop-shadow(0 40px 90px rgba(67,200,255,.55))">${logoSvg(700)}</div>`))],
  ['youtube-kapak-2560x1440.png', 2560, 1440, base(2560, 1440, center(`<div style="width:1546px;text-align:center">
    <div style="display:flex;justify-content:center">${lockup(190, 150, 46)}</div>
    <div style="font-size:54px;font-weight:700;margin-top:26px;color:#cfe9f6">${TAGLINE}</div>
    <div style="margin-top:34px"><span class="pill" style="font-size:40px;padding:14px 38px">${URL_TEXT}</span></div></div>`))],
  ['x-kapak-1500x500.png', 1500, 500, base(1500, 500, `<div style="position:absolute;right:80px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right">
    ${lockup(110, 92, 28)}<div style="font-size:34px;font-weight:700;margin-top:16px;color:#cfe9f6">${TAGLINE}</div>
    <div style="margin-top:22px"><span class="pill" style="font-size:28px;padding:10px 28px">${URL_TEXT}</span></div></div>`)],
  ['facebook-kapak-1640x624.png', 1640, 624, base(1640, 624, center(`<div style="text-align:center">
    <div style="display:flex;justify-content:center">${lockup(130, 104, 32)}</div>
    <div style="font-size:38px;font-weight:700;margin-top:18px;color:#cfe9f6">${TAGLINE}</div>
    <div style="margin-top:24px"><span class="pill" style="font-size:30px;padding:10px 30px">${URL_TEXT}</span></div></div>`))],
  ['linkedin-kapak-1584x396.png', 1584, 396, base(1584, 396, `<div style="position:absolute;right:70px;top:0;bottom:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-end;text-align:right">
    ${lockup(96, 80, 24)}<div style="font-size:30px;font-weight:700;margin-top:12px;color:#cfe9f6">${TAGLINE}</div></div>`)],
  // İlk gönderi: Instagram ve Facebook dikey gönderi oranı.
  ['tanitim-gonderisi-1080x1350.png', 1080, 1350, base(1080, 1350, `<div style="position:absolute;left:90px;right:90px;top:130px">
    ${lockup(150, 120, 34)}
    <div class="brand" style="font-size:96px;line-height:1.05;margin-top:80px">Kulübünüzü<br><span class="hl">tek kulvarda</span><br>yönetin.</div>
    <div style="font-size:40px;font-weight:600;margin-top:40px;color:#cfe9f6;line-height:1.35">Yönetici, sekreter, antrenör ve veli aynı uygulamada.</div>
    <div style="margin-top:56px">${chips(30)}</div></div>
    <div style="position:absolute;left:90px;bottom:100px"><span class="pill" style="font-size:36px;padding:14px 36px">${URL_TEXT}</span></div>`)],
  ['hikaye-1080x1920.png', 1080, 1920, base(1080, 1920, `<div style="position:absolute;left:80px;right:80px;top:360px;text-align:center">
    <div style="display:flex;justify-content:center;filter:drop-shadow(0 40px 90px rgba(67,200,255,.5))">${logoSvg(300)}</div>
    <div class="brand" style="font-size:130px;margin-top:50px">${BRAND}</div>
    <div style="font-size:50px;font-weight:700;margin-top:30px;color:#cfe9f6;line-height:1.3">${TAGLINE}</div>
    <div style="margin-top:80px;display:flex;justify-content:center">${chips(34, FEATURES.slice(0, 4))}</div></div>
    <div style="position:absolute;left:0;right:0;bottom:300px;text-align:center"><div class="brand" style="font-size:64px">Hemen dene</div>
    <div style="margin-top:28px"><span class="pill" style="font-size:42px;padding:16px 42px">${URL_TEXT}</span></div></div>`)],
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
