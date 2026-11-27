// Türkiye Finali (Ankara) için 15 saniyelik dikey Reels: canlı sonuçlar, roller ve "girişte bizi bul" çağrısı.
// Kullanım: node scripts/tanitim/final-reels.mjs   (çıktı: tanitim-videolari/sosyal-medya/yukleme/final-ankara-canli-sonuc.mp4)
// Görünüm uygulamayla aynı: nötr koyu zemin, tek camgöbeği vurgu, IBM Plex. Sonuç kartındaki adlar örnektir, gerçek sporcu değildir.
import { mkdirSync, readFileSync, rmSync } from 'node:fs';
import { spawn, execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright-core';
import { URL_TEXT, icon, logoSvg } from './motor.mjs';
import { compose } from './muzik.mjs';

const OUT = resolve('tanitim-videolari', 'sosyal-medya', 'yukleme');
mkdirSync(OUT, { recursive: true });
const FILE = resolve(OUT, 'final-ankara-canli-sonuc.mp4');
const W = 1080; const H = 1920; const FPS = 30; const SECONDS = 15;

const C = { bg: '#0c1016', panel: '#12171f', line: '#232b36', text: '#e9eef3', text2: '#b3bdc8', muted: '#8b96a4', accent: '#27c4d8', accentInk: '#032026', accentText: '#4fd3e4', pool: '#0d4f62', live: '#e5484d' };
const font = (family, file, weight) => `@font-face{font-family:"${family}";font-weight:${weight};src:url(data:font/woff2;base64,${readFileSync(resolve('src/assets/fonts', file)).toString('base64')}) format("woff2")}`;
const FONTS = [
  font('Plex', 'plex-sans-latin-ext-400.woff2', 400), font('Plex', 'plex-sans-latin-400.woff2', 400),
  font('Plex', 'plex-sans-latin-ext-500.woff2', 500), font('Plex', 'plex-sans-latin-500.woff2', 500),
  font('Plex', 'plex-sans-latin-ext-600.woff2', 600), font('Plex', 'plex-sans-latin-600.woff2', 600),
  font('PlexMono', 'plex-mono-latin-400.woff2', 400), font('PlexMono', 'plex-mono-latin-500.woff2', 500),
].join('');

const RESULTS = [[4, 'Ece Y.', '1:04.32'], [5, 'Defne A.', '1:04.87'], [3, 'Zeynep K.', '1:06.15'], [6, 'Lara T.', '1:07.40'], [2, 'Mira S.', '1:08.02']];
const ROLES = [['Users', 'Veli', 'Çocuğunun derecesini anında görür'], ['Timer', 'Antrenör', 'Derece performans sayfasına işlenir'], ['Building2', 'Kulüp', 'Bütün sporcular tek listede']];

const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${FONTS}
*{margin:0;box-sizing:border-box}html,body{width:${W}px;height:${H}px;overflow:hidden}
body{font-family:"Plex",system-ui,sans-serif;color:${C.text};background:${C.bg};-webkit-font-smoothing:antialiased;position:relative}
.s{position:absolute;inset:0;opacity:0}
.mono{font-family:"PlexMono",monospace;font-variant-numeric:tabular-nums}
.acc{color:${C.accentText}}
.chip{display:inline-flex;align-items:center;gap:14px;border-radius:12px;font-weight:500;background:${C.panel};border:1px solid ${C.line};color:${C.text2};font-size:34px;padding:16px 26px}
.pool{position:absolute;left:0;right:0;background:${C.pool};background-image:linear-gradient(rgba(255,255,255,.06) 2px,transparent 2px),linear-gradient(90deg,rgba(255,255,255,.06) 2px,transparent 2px);background-size:56px 56px;overflow:hidden}
.rope{position:absolute;height:10px;left:0;width:100%;background:repeating-linear-gradient(90deg,#e9eef3 0 28px,#c8323c 28px 56px,#e9eef3 56px 84px,#1f5fae 84px 112px);opacity:.85}
h1{font-weight:600;letter-spacing:-.02em;line-height:1.04}
.card{position:absolute;left:84px;right:84px;background:${C.panel};border:1px solid ${C.line};border-radius:24px;box-shadow:0 30px 80px rgba(0,0,0,.45);font-size:40px}
.card header{display:flex;justify-content:space-between;align-items:center;padding:34px 40px 26px;border-bottom:1px solid ${C.line}}
.live{display:inline-flex;align-items:center;gap:12px;font-size:30px;color:${C.text2}}
.dot{width:16px;height:16px;border-radius:50%;background:${C.live}}
.row{display:grid;grid-template-columns:60px 1fr auto;gap:24px;padding:20px 40px;color:${C.text2};opacity:0}
.row b{font-weight:500}
.row.first b,.row.first .rk{color:${C.accentText}}
.role{display:flex;gap:28px;align-items:center;background:${C.panel};border:1px solid ${C.line};border-radius:24px;padding:34px 38px;opacity:0}
.ic{flex:none;width:96px;height:96px;border-radius:20px;display:grid;place-items:center;background:${C.accent}}
.pill{display:inline-flex;align-items:center;gap:16px;border-radius:14px;font-weight:600;background:${C.accent};color:${C.accentInk};font-size:44px;padding:26px 40px}
</style><body>
<div class="s" id="a">
  <div class="pool" id="poolA" style="top:1180px;height:740px">${[1, 2, 3, 4, 5].map((i) => `<div class="rope" style="top:${i * 123}px"></div>`).join('')}</div>
  <div style="position:absolute;left:84px;right:84px;top:300px">
    <span class="chip" id="a1">${icon('MapPin', 34, C.accentText, 1.75)}Ankara · Türkiye Finali</span>
    <h1 id="a2" style="font-size:150px;margin-top:56px">Final<br>havuzu <span class="acc">canlı</span></h1>
    <p id="a3" style="font-size:46px;line-height:1.35;color:${C.text2};margin-top:44px;max-width:860px">Sonuçlar TYF'de yayınlandığı anda Kulvar360'ta</p>
  </div>
</div>
<div class="s" id="b">
  <div style="position:absolute;left:84px;right:84px;top:250px">
    <h1 style="font-size:96px">Sonuç geldi,<br><span class="acc">telefonunda</span></h1>
  </div>
  <div class="card" id="card" style="top:620px">
    <header><strong style="font-weight:600">100 m serbest · Final</strong><span class="live"><span class="dot" id="dot"></span>Canlı</span></header>
    <div style="padding:14px 0 22px">${RESULTS.map(([l, n, t], i) => `<div class="row ${i === 0 ? 'first' : ''}" id="r${i}"><span class="mono rk">${i + 1}</span><span>${n} <small class="mono" style="color:${C.muted};font-size:28px">· kulvar ${l}</small></span><b class="mono" id="t${i}" data-t="${t}">${t}</b></div>`).join('')}</div>
  </div>
  <p style="position:absolute;left:84px;right:84px;top:1420px;font-size:34px;color:${C.muted}">Örnek görünüm</p>
</div>
<div class="s" id="c">
  <div style="position:absolute;left:84px;right:84px;top:260px">
    <h1 style="font-size:104px">Herkes aynı anda<br><span class="acc">görür</span></h1>
  </div>
  <div style="position:absolute;left:84px;right:84px;top:720px;display:flex;flex-direction:column;gap:30px">
    ${ROLES.map(([ic, t, d], i) => `<div class="role" id="k${i}"><span class="ic">${icon(ic, 52, C.accentInk, 2)}</span><span><strong style="font-size:50px;font-weight:600;display:block">${t}</strong><span style="font-size:36px;color:${C.text2}">${d}</span></span></div>`).join('')}
  </div>
</div>
<div class="s" id="d">
  <div class="pool" style="top:1380px;height:540px">${[1, 2, 3, 4].map((i) => `<div class="rope" style="top:${i * 110}px"></div>`).join('')}</div>
  <div style="position:absolute;left:84px;right:84px;top:300px">
    <div id="d1" style="display:flex;align-items:center;gap:26px">${logoSvg(110)}<span style="font-size:72px;font-weight:600">Kulvar360</span></div>
    <h1 id="d2" style="font-size:108px;margin-top:80px">Finaldeysen<br><span class="acc">girişte bizi bul</span></h1>
    <p id="d3" style="font-size:44px;line-height:1.4;color:${C.text2};margin-top:44px">Kulübüne 2 hafta ücretsiz deneme.<br>Sistemi yerinde gösterelim.</p>
    <div id="d4" style="margin-top:64px"><span class="pill">${icon('ArrowRight', 44, C.accentInk, 2.2)}${URL_TEXT}</span></div>
  </div>
</div>
<script>
const clamp=(x)=>Math.max(0,Math.min(1,x));
const ease=(x)=>1-Math.pow(1-clamp(x),3);
const $=(id)=>document.getElementById(id);
const scene=(id,from,to,t)=>{const fi=ease((t-from)/0.35),fo=clamp((to-t)/0.3);const v=Math.min(fi,to>=15?1:fo);$(id).style.opacity=v;return v;};
const rise=(el,t0,t,dist=60)=>{const k=ease((t-t0)/0.6);el.style.opacity=k;el.style.transform='translateY('+(1-k)*dist+'px)';};
window.render=(t)=>{
  scene('a',0,3.4,t);rise($('a1'),0.1,t);rise($('a2'),0.3,t,90);rise($('a3'),0.8,t);
  $('poolA').style.transform='translateY('+(1-ease(t/1.2))*300+'px)';
  scene('b',3.4,8.6,t);
  $('card').style.transform='translateY('+(1-ease((t-3.5)/0.6))*120+'px)';
  for(let i=0;i<5;i++){const el=$('r'+i);const t0=4.0+i*0.45;rise(el,t0,t,30);
    const tt=$('t'+i);const target=tt.dataset.t;const k=clamp((t-t0)/0.5);
    if(k<1){const [m,s]=target.split(':');const total=Number(m)*60+Number(s);const shown=total*(0.6+0.4*k);const mm=Math.floor(shown/60),ss=(shown-mm*60).toFixed(2).padStart(5,'0');tt.textContent=mm+':'+ss;}else tt.textContent=target;}
  $('dot').style.opacity=0.35+0.65*Math.abs(Math.sin(t*3.2));
  scene('c',8.6,11.8,t);for(let i=0;i<3;i++)rise($('k'+i),8.9+i*0.35,t,50);
  scene('d',11.8,15,t);rise($('d1'),11.9,t);rise($('d2'),12.1,t,90);rise($('d3'),12.6,t);rise($('d4'),13.0,t);
};
</script></body></html>`;

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: W, height: H } });
await page.setContent(html);
await page.evaluate(() => document.fonts.ready);
const silent = `${FILE}.video.mp4`;
const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-pix_fmt', 'yuv420p', '-r', String(FPS), silent], { stdio: ['pipe', 'ignore', 'inherit'] });
const done = new Promise((ok, fail) => ff.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}`)))));
for (let f = 0; f < FPS * SECONDS; f += 1) {
  await page.evaluate((t) => window.render(t), f / FPS);
  ff.stdin.write(await page.screenshot({ type: 'jpeg', quality: 92 }));
}
ff.stdin.end();
await done;
await browser.close();

// 128 vuruş/dk: 8 ölçü = 15 sn; açılış, sonuç kartı, roller ve kapanış enerjisi
const music = `${FILE}.wav`;
compose(music, { bpm: 128, energies: [1, 2, 2, 3, 3, 2, 3, 3], seed: 27, transpose: 0, tail: 1.5 });
execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', silent, '-i', music, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', `afade=t=out:st=${SECONDS - 1.2}:d=1.2,loudnorm=I=-14:TP=-1.2:LRA=11`, '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-t', String(SECONDS), '-movflags', '+faststart', FILE]);
rmSync(silent); rmSync(music);
console.log(FILE);
