// Tanıtım filmini ve rol videolarını üretir: müzik, kare kare görüntü ve ekran yazılarının listesi.
// Kullanım: e2e sunucusu açıkken önce veri.mjs ve cek.mjs, sonra: node scripts/tanitim/uret.mjs   (ONLY=dosya-adi ile tek video)
// Marka adı değişirse: $env:MARKA="Yeni Ad"; node scripts/tanitim/uret.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { BRAND, finish, renderVideo } from './motor.mjs';
import { compose } from './muzik.mjs';
import { FILM, REELS } from './senaryo2.mjs';

const ROOT = resolve('tanitim-videolari');
const MUSIC = join(ROOT, 'muzik');
mkdirSync(MUSIC, { recursive: true });
const videos = [FILM, ...REELS].filter((v) => !process.env.ONLY || v.file === process.env.ONLY);

const tc = (s, ms = true) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(ms ? 1 : 0).padStart(ms ? 4 : 2, '0')}`;

const shown = (s) => (s.title ?? s.answer ?? s.tagline ?? s.lines?.map((l) => l.text ?? l).join(' ') ?? '').replace(/\*/g, '');

function timeline(v) {
  const bar = (60 / v.bpm) * 4; let at = 0;
  return v.scenes.map((s, i) => { const start = at * bar; at += s.bars; const endT = at * bar + (i === v.scenes.length - 1 ? v.tail : 0); return { s, start, end: endT }; });
}

// Ekrandaki yazıların listesi: dil kontrolü ve paylaşım metni için.
const doc = [`# ${BRAND} tanıtım videolarındaki yazılar\n\nVideolarda seslendirme yoktur; her şey ekrandaki başlık, açıklama ve maddelerle anlatılır.`];
for (const v of videos) {
  const tl = timeline(v);
  const total = tl[tl.length - 1].end;
  doc.push(`\n## ${v.file}.mp4 (${v.wide ? 'yatay 1920x1080' : 'dikey 1080x1920'}, ${tc(total, false)})\n`);
  tl.forEach(({ s, start, end }, i) => {
    const parts = [s.kicker, shown(s), s.sub, s.items?.length && typeof s.items[0] === 'string' ? s.items.join(' / ') : null, s.points?.length ? s.points.join(' / ') : null, s.chips?.length ? s.chips.map((x) => x.text).join(' / ') : null, s.lines?.length && typeof s.lines[0] === 'string' ? s.lines.join(' / ') : null].filter(Boolean);
    doc.push(`${i + 1}. [${tc(start)} - ${tc(end)}] ${parts.join(' — ')}`);
  });
}
writeFileSync(resolve('docs', 'tanitim-metinleri.md'), `${doc.join('\n')}\n`, 'utf8');
console.log('ekran yazilari yazildi');
if (process.env.SADECE_METIN) process.exit(0);

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const queue = [...videos];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
  for (let v = queue.shift(); v; v = queue.shift()) {
    const energies = v.scenes.flatMap((s) => s.energies ?? Array(s.bars).fill(s.energy));
    const music = join(MUSIC, `${v.file}.wav`);
    compose(music, { bpm: v.bpm, energies, seed: v.seed, transpose: v.transpose, tail: v.tail });
    const clips = await renderVideo(browser, v);
    if (process.env.ONIZLEME) continue;
    finish(v, clips, music);
    console.log('HAZIR', v.file);
  }
}));
await browser.close();
