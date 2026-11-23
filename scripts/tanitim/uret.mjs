// Ekranlardan sahne, Türkçe seslendirme ve özgün müzikle film ve rol videolarını üretir.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { FILM, REELS } from './senaryo.mjs';

const ROOT = resolve('tanitim-videolari');
const SRC = join(ROOT, 'kaynak');
for (const d of ['sahne', 'ses', 'klip', 'muzik']) mkdirSync(join(SRC, d), { recursive: true });
const only = process.env.ONLY;
const jobs = [{ ...FILM, wide: true }, ...REELS.map((r) => ({ ...r, wide: false }))].filter((j) => !only || j.file === only);
const hash = (x) => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 14);
const ff = (...args) => execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: ['ignore', 'ignore', 'inherit'], maxBuffer: 1e8 });
const duration = (f) => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }));
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const CSS = `*{box-sizing:border-box;margin:0}body{font-family:"Segoe UI",system-ui,sans-serif;color:#eef7fb;background:#061525;overflow:hidden;position:relative}
.bg{position:absolute;inset:0;background:radial-gradient(circle at 12% 12%,#14607c 0,transparent 42%),radial-gradient(circle at 92% 88%,#0f6f83 0,transparent 38%),#061525}
.w{position:absolute;left:-5%;right:-5%;height:2px;background:linear-gradient(90deg,transparent,#27c4d855,transparent)}
.k{color:#49dcee;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.t{font-weight:800;letter-spacing:-.025em;line-height:1.06}.p{list-style:none;padding:0;display:grid}
.p li{display:flex;align-items:center;color:#d8e8f0;font-weight:600}.p li:before{content:"";flex:none;background:#27c4d8;border-radius:50%}
.brand{position:absolute;display:flex;align-items:center;font-weight:800}.brand i{display:block;background:#27c4d8;border-radius:28%;position:relative}.brand i:after{content:"";position:absolute;left:20%;right:20%;top:46%;height:9%;background:#04202a;border-radius:9px;box-shadow:0 -.34em 0 #04202a,0 .34em 0 #04202a}
.shot{position:absolute;overflow:hidden;background:#07182b;box-shadow:0 34px 90px #0009,0 0 0 2px #2d5a78}.shot img{display:block;width:100%}`;
const brand = (x, y, size) => `<div class="brand" style="left:${x}px;top:${y}px;font-size:${size}px;gap:${size * 0.55}px"><i style="width:${size * 1.8}px;height:${size * 1.8}px;font-size:${size * 0.55}px"></i>Yüzme Kulüp Sistemi</div>`;
const waves = [18, 36, 62, 84].map((y) => `<div class="w" style="top:${y}%"></div>`).join('');

function slide(scene, wide, n, total) {
  const img = scene.shot ? `data:image/png;base64,${readFileSync(join(SRC, 'ekran', `${wide ? 'film' : 'reel'}-${scene.shot}.png`)).toString('base64')}` : '';
  const pts = scene.points.map((p) => `<li>${esc(p)}</li>`).join('');
  if (scene.cover) {
    return wide
      ? `<div class="bg"></div>${waves}${brand(90, 70, 34)}<div style="position:absolute;left:150px;right:150px;top:330px"><div class="k" style="font-size:34px">${esc(scene.kicker)}</div><div class="t" style="font-size:112px;margin:26px 0 34px">${esc(scene.title)}</div><div style="font-size:42px;color:#b9d2df;font-weight:600">${esc(scene.points[0])}</div></div>`
      : `<div class="bg"></div>${waves}${brand(70, 110, 36)}<div style="position:absolute;left:76px;right:76px;top:640px"><div class="k" style="font-size:42px">${esc(scene.kicker)}</div><div class="t" style="font-size:112px;margin:32px 0 42px">${esc(scene.title)}</div><div style="font-size:44px;color:#b9d2df;font-weight:600;overflow-wrap:anywhere">${esc(scene.points[0])}</div></div>`;
  }
  const bar = `<div style="position:absolute;left:0;bottom:0;height:7px;background:#27c4d8;width:${Math.round((n / total) * 100)}%"></div>`;
  return wide
    ? `<div class="bg"></div>${waves}${brand(60, 52, 25)}<div style="position:absolute;left:60px;top:300px;width:490px"><div class="k" style="font-size:24px">${esc(scene.kicker)}</div><div class="t" style="font-size:60px;margin:18px 0 38px">${esc(scene.title)}</div><ul class="p" style="gap:20px;font-size:29px">${pts}</ul></div><div class="shot" style="left:600px;top:112px;width:1270px;height:715px;border-radius:18px"><img src="${img}"></div><style>.p li{gap:15px}.p li:before{width:12px;height:12px}</style><div style="position:absolute;left:600px;right:50px;top:855px;color:#8fb0c2;font-size:22px;font-weight:600">Görüntüler gerçek uygulama ekranıdır, veriler kurgusaldır.</div>${bar}`
    : `<div class="bg"></div>${brand(64, 58, 30)}<div style="position:absolute;left:64px;right:64px;top:140px"><div class="k" style="font-size:32px">${esc(scene.kicker)}</div><div class="t" style="font-size:74px;margin-top:12px">${esc(scene.title)}</div></div><div class="shot" style="left:130px;top:370px;width:820px;height:1190px;border-radius:52px;border:12px solid #0b2a3e"><img src="${img}"></div><ul class="p" style="position:absolute;left:70px;right:70px;top:1600px;gap:14px;font-size:40px">${pts}</ul><style>.p li{gap:18px}.p li:before{width:16px;height:16px}</style><div style="position:absolute;left:70px;bottom:32px;color:#8fb0c2;font-size:24px;font-weight:600">Gerçek ekran, kurgusal veri</div>${bar}`;
}

/** Tamamen bu projede üretilen özgün müzik: yumuşak akor, arpej ve hafif ritim. */
function music(file, seconds, { root, bpm, seed }) {
  if (existsSync(file)) return;
  const rate = 44100; const n = Math.ceil(seconds * rate); const L = new Float32Array(n); const R = new Float32Array(n);
  const beat = 60 / bpm; const progressions = [[0, 7, 9, 5], [0, 5, 9, 7], [9, 5, 0, 7], [0, 9, 5, 7]];
  const prog = progressions[seed % 4]; const scale = [0, 2, 4, 7, 9, 12, 14, 16];
  let rnd = seed * 7919; const r = () => { rnd = (rnd * 16807) % 2147483647; return rnd / 2147483647; };
  const f = (semi) => root * 2 ** (semi / 12);
  const add = (start, len, freq, gain, pan, attack, decay) => {
    const a = Math.floor(start * rate); const m = Math.min(n - a, Math.floor(len * rate));
    for (let i = 0; i < m; i += 1) {
      const t = i / rate; const env = Math.min(1, t / attack) * Math.exp(-t * decay) * Math.min(1, (len - t) / 0.08);
      const v = (Math.sin(2 * Math.PI * freq * t) + 0.28 * Math.sin(4 * Math.PI * freq * t) + 0.08 * Math.sin(6 * Math.PI * freq * t)) * env * gain;
      L[a + i] += v * (1 - pan); R[a + i] += v * pan;
    }
  };
  for (let bar = 0; bar * 4 * beat < seconds; bar += 1) {
    const at = bar * 4 * beat; const base = prog[bar % 4]; const minor = base === 9;
    for (const [k, semi] of [0, minor ? 3 : 4, 7, 12].entries()) { add(at, 4 * beat + 0.3, f(base + semi) * (1 + (k - 1.5) * 0.0015), 0.038, 0.32 + k * 0.12, 0.45, 0.12); }
    add(at, 2 * beat, f(base - 12), 0.11, 0.5, 0.02, 0.8); add(at + 2.5 * beat, 1.2 * beat, f(base - 12), 0.08, 0.5, 0.02, 1.2);
    for (let s = 0; s < 8; s += 1) if (s % 2 === 0 || r() > 0.42) add(at + (s * beat) / 2, 0.55, f(base + 12 + scale[Math.floor(r() * scale.length)]), 0.032, 0.2 + r() * 0.6, 0.006, 5);
    if (at > 4 * beat) for (let b = 0; b < 4; b += 1) {
      const k = Math.floor((at + b * beat) * rate); for (let i = 0; i < 0.16 * rate && k + i < n; i += 1) { const t = i / rate; const v = Math.sin(2 * Math.PI * (48 + 70 * Math.exp(-t * 34)) * t) * Math.exp(-t * 20) * (b % 2 ? 0.07 : 0.12); L[k + i] += v; R[k + i] += v; }
      const h = Math.floor((at + (b + 0.5) * beat) * rate); for (let i = 0; i < 0.04 * rate && h + i < n; i += 1) { const v = (r() - 0.5) * Math.exp(-(i / rate) * 130) * 0.035; L[h + i] += v; R[h + i] += v * 0.8; }
    }
  }
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) { data.writeInt16LE(Math.round(Math.tanh(L[i] * 1.1) * 30000), i * 4); data.writeInt16LE(Math.round(Math.tanh(R[i] * 1.1) * 30000), i * 4 + 2); }
  const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
}

const voiceFile = (text) => join(SRC, 'ses', `${hash(text)}.wav`);
const list = join(SRC, 'ses', 'liste.txt');
writeFileSync(list, [...new Set(jobs.flatMap((j) => j.scenes.map((x) => x.speak)))].map((t) => `${voiceFile(t)}\t${t}`).join('\n'), 'utf8');
execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve('scripts/tanitim/ses.ps1'), '-List', list], { stdio: 'inherit' });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const job of jobs) {
  const [W, H] = job.wide ? [1920, 1080] : [1080, 1920];
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const clips = [];
  for (const [i, scene] of job.scenes.entries()) {
    const html = `<!doctype html><meta charset=utf-8><style>${CSS}body{width:${W}px;height:${H}px}</style>${slide(scene, job.wide, i + 1, job.scenes.length)}`;
    const id = hash([html.length, scene, job.wide]);
    const png = join(SRC, 'sahne', `${id}.png`);
    if (!existsSync(png)) { await page.setContent(html, { waitUntil: 'load' }); await page.waitForTimeout(90); await page.screenshot({ path: png }); }
    const wav = voiceFile(scene.speak);
    const d = Math.round((duration(wav) + (scene.cover ? 1.25 : 1.0)) * 30) / 30;
    const clip = join(SRC, 'klip', `${id}-${Math.round(d * 30)}.mp4`);
    if (!existsSync(clip)) {
      const zoom = i % 2 ? `1.035-0.035*t/${d}` : `1+0.035*t/${d}`;
      ff('-loop', '1', '-framerate', '30', '-t', String(d), '-i', png, '-i', wav,
        '-filter_complex', `[0:v]scale=w='trunc(${W}*(${zoom})/2)*2':h='trunc(${H}*(${zoom})/2)*2':eval=frame:flags=bicubic,crop=${W}:${H},fade=in:st=0:d=0.28,fade=out:st=${(d - 0.28).toFixed(3)}:d=0.28,format=yuv420p[v];[1:a]adelay=320|320,aresample=48000,aformat=channel_layouts=stereo,apad,atrim=0:${d}[a]`,
        '-map', '[v]', '-map', '[a]', '-r', '30', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-c:a', 'aac', '-b:a', '160k', clip);
    }
    clips.push(clip);
    console.log(job.file, `${i + 1}/${job.scenes.length}`);
  }
  await page.close();
  const concat = join(SRC, `${job.file}.txt`);
  writeFileSync(concat, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
  const joined = join(SRC, `${job.file}-birlesik.mp4`);
  ff('-f', 'concat', '-safe', '0', '-i', concat, '-c', 'copy', joined);
  const total = duration(joined);
  const track = join(SRC, 'muzik', `${job.file}-${Math.ceil(total)}.wav`);
  music(track, Math.ceil(total) + 1, job.music);
  ff('-i', joined, '-i', track, '-filter_complex',
    `[1:a]volume=0.62,asplit=1[m];[0:a]asplit=2[sc][vo];[m][sc]sidechaincompress=threshold=0.025:ratio=7:attack=25:release=420[d];[vo]volume=1.5[v2];[d][v2]amix=inputs=2:duration=first:normalize=0,afade=t=in:d=0.6,afade=t=out:st=${(total - 1.4).toFixed(2)}:d=1.4,loudnorm=I=-15:TP=-1.5:LRA=9,aresample=48000[a]`,
    '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-t', String(total), join(ROOT, `${job.file}.mp4`));
  rmSync(joined, { force: true });
  console.log('HAZIR', job.file, total.toFixed(1));
}
await browser.close();
