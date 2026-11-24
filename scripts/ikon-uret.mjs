// Kulvar360 logosundan web, Android ve Windows simgelerini üretir: node scripts/ikon-uret.mjs
// Logo: turkuazdan mora geçen yuvarlak kare, içinde kronometre halkası, dalga ve yukarı bakan ibre.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { chromium } from 'playwright-core';

const GRAD = '<linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43f3ff"/><stop offset=".55" stop-color="#3d8bff"/><stop offset="1" stop-color="#6a4bff"/></linearGradient>';
const GLYPH = `<rect x="52" y="17" width="16" height="9" rx="3" fill="#fff"/><path d="M60 26v6" stroke="#fff" stroke-width="6"/>
<circle cx="60" cy="66" r="34" fill="none" stroke="#fff" stroke-width="7.5"/>
<g clip-path="url(#c)"><path d="M22 72c6-8 12-8 18 0s12 8 18 0 12-8 18 0 12 8 18 0 12-8 18 0" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round"/><path d="M22 72c6-8 12-8 18 0s12 8 18 0 12-8 18 0 12 8 18 0 12-8 18 0V110H22Z" fill="rgba(255,255,255,.22)"/></g>
<path d="M60 66l12-14" stroke="#fff" stroke-width="6" stroke-linecap="round"/>`;
const CLIP = '<clipPath id="c"><circle cx="60" cy="66" r="29"/></clipPath>';

/** shape: 'kare' yuvarlak kare, 'tam' kenarsız (maskelenebilir), 'yuvarlak' daire, 'zemin' yalnız renk, 'isaret' şeffaf zeminde işaret */
export function logo(shape = 'kare', scale = 1) {
  const bg = {
    kare: '<rect x="2" y="2" width="116" height="116" rx="32" fill="url(#g)"/><rect x="2" y="2" width="116" height="58" rx="32" fill="rgba(255,255,255,.12)"/>',
    tam: '<rect width="120" height="120" fill="url(#g)"/>',
    yuvarlak: '<circle cx="60" cy="60" r="60" fill="url(#g)"/>',
    zemin: '<rect width="120" height="120" fill="url(#g)"/>',
    isaret: '',
  }[shape];
  const glyph = shape === 'zemin' ? '' : `<g transform="translate(60 60) scale(${scale}) translate(-60 -60)">${GLYPH}</g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><defs>${GRAD}${CLIP}</defs>${bg}${glyph}</svg>`;
}

const ANDROID = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
const jobs = [
  ['public/icon-192.png', 192, logo('kare')],
  ['public/icon-512.png', 512, logo('kare')],
  ['public/icon-maskable-512.png', 512, logo('tam', 0.74)],
  ['public/apple-touch-icon.png', 180, logo('tam', 0.82)],
  ['build/icon.png', 512, logo('kare')],
  ['electron/icon.png', 256, logo('kare')],
  ...Object.entries(ANDROID).flatMap(([d, k]) => [
    [`android-res/mipmap-${d}/ic_launcher.png`, 48 * k, logo('kare')],
    [`android-res/mipmap-${d}/ic_launcher_round.png`, 48 * k, logo('yuvarlak', 0.8)],
    // Uyarlanabilir simge: 108dp tuval, işaret 66dp güvenli alanın içinde kalır.
    [`android-res/mipmap-${d}/ic_launcher_foreground.png`, 108 * k, logo('isaret', 0.72)],
    [`android-res/mipmap-${d}/ic_launcher_background.png`, 108 * k, logo('zemin')],
  ]),
];

writeFileSync('public/icon.svg', `${logo('kare')}\n`);
const adaptive = '<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n';
mkdirSync('android-res/mipmap-anydpi-v26', { recursive: true });
writeFileSync('android-res/mipmap-anydpi-v26/ic_launcher.xml', adaptive);
writeFileSync('android-res/mipmap-anydpi-v26/ic_launcher_round.xml', adaptive);

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 600, height: 600 } });
for (const [file, size, svg] of jobs) {
  mkdirSync(dirname(file), { recursive: true });
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${size}px;height:${size}px}</style>${svg}`);
  await page.locator('svg').screenshot({ path: join(file), omitBackground: true });
}
await browser.close();
console.log(`${jobs.length} simge uretildi`);
