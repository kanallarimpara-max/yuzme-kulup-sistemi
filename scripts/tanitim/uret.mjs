// Tanıtım filmini ve rol reelslerini üretir: müzik, kare kare görüntü, seslendirme metni ve altyazı.
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
const srtTime = (s) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = Math.floor(s % 60); const msx = Math.round((s % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(msx).padStart(3, '0')}`; };
const shown = (s) => (s.title ?? s.answer ?? s.tagline ?? s.lines?.map((l) => l.text ?? l).join(' ') ?? '').replace(/\*/g, '');

function timeline(v) {
  const bar = (60 / v.bpm) * 4; let at = 0;
  return v.scenes.map((s, i) => { const start = at * bar; at += s.bars; const endT = at * bar + (i === v.scenes.length - 1 ? v.tail : 0); return { s, start, end: endT }; });
}

// Seslendirme metni ve altyazı
const doc = [`# Seslendirme metinleri\n\nMarka: ${BRAND}. Her satırın başındaki süre, o cümlenin videoda başladığı ve bittiği andır.`,
  'Kayıt önerisi: sessiz bir odada telefonu ağızdan bir karış uzakta tut, her sahneyi ayrı kaydet ve cümleyi süresinin içinde bitir. Videodaki müzik, sesin altında kalacak şekilde kısılabilir; müzik ayrıca muzik klasöründe.\n'];
for (const v of videos) {
  const tl = timeline(v);
  const total = tl[tl.length - 1].end;
  doc.push(`\n## ${v.file}.mp4 (${v.wide ? 'yatay 1920x1080' : 'dikey 1080x1920'}, ${tc(total, false)})\n`);
  tl.forEach(({ s, start, end }, i) => {
    const words = s.vo.split(/\s+/).length; const room = end - start;
    doc.push(`${i + 1}. [${tc(start)} - ${tc(end)}] (${room.toFixed(1)} sn, ${words} kelime)\n   Ekranda: ${shown(s)}\n   Seslendirme: ${s.vo}\n`);
  });
  writeFileSync(join(ROOT, `${v.file}.srt`), tl.map(({ s, start, end }, i) => `${i + 1}\n${srtTime(start + 0.15)} --> ${srtTime(end - 0.1)}\n${s.vo}\n`).join('\n'), 'utf8');
}
writeFileSync(join(ROOT, 'seslendirme-metinleri.md'), doc.join('\n'), 'utf8');
writeFileSync(resolve('docs', 'seslendirme-metinleri.md'), doc.join('\n'), 'utf8');
console.log('seslendirme metinleri yazildi');
if (process.env.SADECE_METIN) process.exit(0);

const browser = await chromium.launch({ channel: 'msedge', headless: true, args: ['--disable-gpu-vsync', '--force-color-profile=srgb'] });
const queue = [...videos];
await Promise.all(Array.from({ length: Math.min(3, queue.length) }, async () => {
  for (let v = queue.shift(); v; v = queue.shift()) {
    const energies = v.scenes.flatMap((s) => Array(s.bars).fill(s.energy));
    const music = join(MUSIC, `${v.file}.wav`);
    compose(music, { bpm: v.bpm, energies, seed: v.seed, transpose: v.transpose, tail: v.tail });
    const clips = await renderVideo(browser, v);
    if (process.env.ONIZLEME) continue;
    finish(v, clips, music);
    console.log('HAZIR', v.file);
  }
}));
await browser.close();
