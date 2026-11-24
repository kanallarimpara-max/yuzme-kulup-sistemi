// Tanıtım videosu motoru: her sahne HTML/CSS animasyonu olarak kurulur, kare kare çekilip ffmpeg ile birleştirilir.
// Uygulama ekranları gerçek ekran görüntüsüdür; telefon, tablet ve dizüstü çerçeveleri CSS ile çizilir.
import { execFileSync, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as Lucide from 'lucide-react';

export const FPS = 30;
export const BRAND = process.env.MARKA || 'Kulvar360';
export const URL_TEXT = 'yuzme-kulup-sistemi.web.app';
const ROOT = resolve('tanitim-videolari');
const SHOTS = join(ROOT, 'kaynak', 'ekran');
const WORK = join(ROOT, 'kaynak', 'v2');
mkdirSync(join(WORK, 'sahne'), { recursive: true });
const BOXES = existsSync(join(SHOTS, 'kutular.json')) ? JSON.parse(readFileSync(join(SHOTS, 'kutular.json'), 'utf8')) : {};

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
const hash = (x) => createHash('sha1').update(typeof x === 'string' ? x : JSON.stringify(x)).digest('hex').slice(0, 16);
export const icon = (name, size = 24, color = 'currentColor', stroke = 2.2) => renderToStaticMarkup(createElement(Lucide[name] ?? Lucide.Sparkles, { size, color, strokeWidth: stroke }));

/** animation kısaltması */
const A = (...list) => `animation:${list.map(([name, dur, delay = 0, ease = 'cubic-bezier(.16,1,.3,1)', extra = 'both']) => `${name} ${dur}s ${ease} ${delay}s ${extra}`).join(',')};`;

// ---- Ekran görüntüleri ----
const sizeCache = new Map();
function shot(device, id, tall = false) {
  const file = join(SHOTS, `${device}-${id}${tall ? '-tam' : ''}.png`);
  if (!existsSync(file)) throw new Error(`Ekran yok: ${file}`);
  if (!sizeCache.has(file)) {
    const b = readFileSync(file);
    let top = '#0b1622';
    try {
      const px = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-i', file, '-vf', 'crop=1:1:6:6', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 1e6 });
      top = `rgb(${px[0]},${px[1]},${px[2]})`;
    } catch { /* varsayılan renk */ }
    sizeCache.set(file, { w: b.readUInt32BE(16), h: b.readUInt32BE(20), top });
  }
  return { url: pathToFileURL(file).href, ...sizeCache.get(file), boxes: BOXES[`${device}-${id}`] ?? [] };
}

// ---- Ortak stil ----
const CSS = (W, H, beat) => `
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;background:#020812}
body{font-family:"Segoe UI",system-ui,sans-serif;color:#f2fbff;-webkit-font-smoothing:antialiased;text-rendering:geometricPrecision}
.stage{position:absolute;inset:0;overflow:hidden}
.bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 110%,#0a3a5e 0,transparent 70%),linear-gradient(180deg,#05132a 0,#020914 100%)}
.blob{position:absolute;border-radius:50%}
.rope{position:absolute;left:-10%;width:120%;border-radius:99px;background:repeating-linear-gradient(90deg,#ff4d6d 0 34px,#f4f8ff 34px 68px,#3a86ff 68px 102px);opacity:.16}
.bub{position:absolute;border-radius:50%;border:2px solid rgba(160,240,255,.35);background:radial-gradient(circle at 30% 30%,rgba(255,255,255,.35),transparent 55%)}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgba(120,200,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(120,200,255,.05) 1px,transparent 1px);background-size:80px 80px;mask-image:radial-gradient(ellipse at 50% 40%,#000 0,transparent 75%)}
.cam,.beat{position:absolute;inset:0;transform-origin:50% 50%}
.flash{position:absolute;inset:0;background:#dff9ff;pointer-events:none;mix-blend-mode:screen}
.vig{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 45%,transparent 55%,rgba(0,0,0,.55) 100%);pointer-events:none}
:root{--a1:#3ff0ff;--a2:#4b6bff}
.hl{background:linear-gradient(92deg,var(--a1) 0%,var(--a2) 40%,#fff 50%,var(--a2) 60%,var(--a1) 100%);background-size:250% 100%;-webkit-background-clip:text;background-clip:text;color:transparent;animation:hlShine 2.6s linear infinite}
@keyframes hlShine{from{background-position:100% 0}to{background-position:-150% 0}}
.sweep{position:absolute;top:-30%;bottom:-30%;left:0;width:40%;background:linear-gradient(100deg,transparent,rgba(255,255,255,.3),transparent);transform:translateX(-160%) skewX(-18deg);z-index:5;pointer-events:none;animation:sweep 1.1s cubic-bezier(.6,0,.3,1) .85s both}
@keyframes sweep{from{transform:translateX(-160%) skewX(-18deg)}to{transform:translateX(320%) skewX(-18deg)}}
.fx{position:absolute;inset:0;pointer-events:none;overflow:hidden}
.ring{position:absolute;border-radius:50%;border:4px solid var(--a1);opacity:0}
.streak{position:absolute;width:4px;height:620px;background:linear-gradient(180deg,transparent,var(--a1),transparent);opacity:.45;transform:rotate(30deg)}
.dpulse{position:absolute;inset:0;background:radial-gradient(ellipse at 50% 50%,var(--a1),transparent 70%);opacity:0;mix-blend-mode:screen}
.seg{position:absolute;top:40px;height:7px;border-radius:9px;background:rgba(255,255,255,.22);overflow:hidden}
.seg i{position:absolute;inset:0;background:#fff;transform-origin:0 50%}
.ltr{display:inline-block;background:linear-gradient(180deg,#fff 30%,var(--a1));-webkit-background-clip:text;background-clip:text;color:transparent}
.ghost{position:absolute;inset:0;mix-blend-mode:screen}
.orbit{position:absolute;left:50%;top:50%;width:0;height:0}
.orbit b{position:absolute;width:16px;height:16px;margin:-8px;border-radius:50%;background:var(--a1);box-shadow:0 0 18px var(--a1)}
@keyframes ringOut{0%{opacity:.75;transform:scale(.35)}100%{opacity:0;transform:scale(1.7)}}
@keyframes streak{from{transform:translate(-300px,700px) rotate(30deg)}to{transform:translate(900px,-1400px) rotate(30deg)}}
@keyframes dpulse{0%{opacity:.28}18%{opacity:0}100%{opacity:0}}
@keyframes segFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes ltrIn{0%{opacity:0;transform:translateY(-70%) scale(1.9);filter:blur(10px)}60%{opacity:1;filter:blur(0)}100%{opacity:1;transform:none;filter:none}}
@keyframes ghostL{0%{opacity:.9;transform:translateX(-18px)}100%{opacity:0;transform:none}}
@keyframes ghostR{0%{opacity:.9;transform:translateX(18px)}100%{opacity:0;transform:none}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
@keyframes trZoom{from{transform:scale(1.35);opacity:0;filter:blur(10px)}to{transform:none;opacity:1;filter:none}}
@keyframes trWhip{from{transform:translateX(42%) skewX(-14deg);opacity:.2;filter:blur(16px)}to{transform:none;opacity:1;filter:none}}
@keyframes trCircle{from{clip-path:circle(0% at 50% 55%)}to{clip-path:circle(80% at 50% 55%)}}
@keyframes trUp{from{transform:translateY(32%) scale(.9) rotate(-4deg);opacity:0}to{transform:none;opacity:1}}
@keyframes trSpin{from{transform:rotate(-9deg) scale(1.3);opacity:0;filter:blur(8px)}to{transform:none;opacity:1;filter:none}}
@keyframes trOut{from{transform:none;filter:none;opacity:1}to{transform:translateX(-36%) skewX(12deg);filter:blur(14px);opacity:.3}}
.ww{display:inline-block;overflow:hidden;vertical-align:top;padding:.14em .02em .1em;margin:-.14em -.02em -.1em}
.ww>span{display:inline-block}
.kicker{display:inline-flex;align-items:center;gap:.5em;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--a1);background:rgba(60,220,255,.1);border:1.5px solid rgba(90,230,255,.35);border-radius:99px}
.kicker svg{flex:none}
.title{font-weight:900;letter-spacing:-.035em;line-height:1.02}
.sub{color:#a9c5d6;font-weight:600}
.chip{position:absolute;display:flex;align-items:center;gap:.6em;white-space:nowrap;font-weight:700;color:#fff;border-radius:22px;background:linear-gradient(135deg,rgba(18,44,72,.96),rgba(9,24,44,.96));border:1.5px solid rgba(110,225,255,.4);box-shadow:0 18px 50px rgba(0,0,0,.5),0 0 0 1px rgba(0,0,0,.3),inset 0 1px 0 rgba(255,255,255,.12)}
.chip .ic{display:grid;place-items:center;border-radius:14px;background:linear-gradient(135deg,var(--a1),var(--a2));color:#03101e;flex:none}
.shadow{position:absolute;border-radius:50%;background:radial-gradient(ellipse at center,rgba(0,0,0,.65) 0,transparent 70%)}
/* Cihazlar */
.phone{position:relative;background:linear-gradient(150deg,#59636f 0%,#1a1f26 18%,#0b0e12 50%,#1d232b 82%,#4d5763 100%);box-shadow:inset 0 0 0 2px rgba(255,255,255,.12),0 50px 120px rgba(0,0,0,.6)}
.phone .scr{position:relative;overflow:hidden;background:#000;height:100%}
.phone .status{display:flex;justify-content:space-between;align-items:center;font-weight:700;color:#fff;position:relative;z-index:2}
.phone .isl{position:absolute;left:50%;transform:translateX(-50%);background:#000;border-radius:99px;z-index:3}
.phone .side{position:absolute;background:linear-gradient(90deg,#2a3038,#5a646f);border-radius:3px}
.vp{position:relative;overflow:hidden}
.vp img{display:block;width:100%}
.glare{position:absolute;inset:0;background:linear-gradient(118deg,rgba(255,255,255,.16) 0%,rgba(255,255,255,.04) 26%,transparent 42%);pointer-events:none;z-index:4}
.tablet{position:relative;background:linear-gradient(150deg,#4b5560,#14181d 20%,#0a0d10 50%,#1b2027 80%,#45505b);box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),0 50px 120px rgba(0,0,0,.6)}
.tablet .scr{position:relative;overflow:hidden;background:#000}
.cam-dot{position:absolute;border-radius:50%;background:radial-gradient(circle at 40% 40%,#2c4a66,#05080c 60%)}
.laptop{position:relative}
.laptop .lid{position:relative;background:linear-gradient(180deg,#1c2229,#0b0e12);box-shadow:inset 0 0 0 2px rgba(255,255,255,.1),0 40px 110px rgba(0,0,0,.55)}
.laptop .scr{position:relative;overflow:hidden;background:#000}
.laptop .base{position:relative;margin:0 auto;background:linear-gradient(180deg,#b9c2cc 0%,#7d8792 35%,#4a525b 100%)}
.laptop .notch{position:absolute;left:50%;top:0;transform:translateX(-50%);background:linear-gradient(180deg,#59626c,#8a939d)}
.tap{position:absolute;width:0;height:0;z-index:5}
.tap i{position:absolute;left:-60px;top:-60px;width:120px;height:120px;border-radius:50%;border:5px solid rgba(255,255,255,.95);box-shadow:0 0 30px rgba(90,240,255,.9)}
.tap b{position:absolute;left:-26px;top:-26px;width:52px;height:52px;border-radius:50%;background:rgba(255,255,255,.55);box-shadow:0 0 0 3px rgba(255,255,255,.4)}
.brandbug{position:absolute;display:flex;align-items:center;font-weight:800;color:#eaf8ff;letter-spacing:-.01em}
.card3{position:absolute;border-radius:28px;background:linear-gradient(160deg,rgba(20,48,78,.97),rgba(8,22,40,.97));border:1.5px solid rgba(110,225,255,.35);box-shadow:0 30px 80px rgba(0,0,0,.55)}
.strike{position:absolute;left:-2%;top:54%;height:.11em;width:104%;background:#ff4d6d;border-radius:9px;transform-origin:0 50%}
@keyframes wordUp{from{transform:translateY(115%) rotate(5deg)}to{transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:none}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes fadeOut{from{opacity:1}to{opacity:0}}
@keyframes pop{0%{opacity:0;transform:scale(.3)}55%{opacity:1;transform:scale(1.1)}100%{opacity:1;transform:scale(1)}}
@keyframes stamp{0%{opacity:0;transform:scale(2.2)}60%{opacity:1;transform:scale(.94)}100%{opacity:1;transform:scale(1)}}
@keyframes slideL{from{opacity:0;transform:translateX(-90px)}to{opacity:1;transform:none}}
@keyframes slideR{from{opacity:0;transform:translateX(90px)}to{opacity:1;transform:none}}
@keyframes flash{0%{opacity:var(--flash,.6)}100%{opacity:0}}
@keyframes sceneIn{from{transform:scale(1.12);opacity:.35}to{transform:none;opacity:1}}
@keyframes sceneOut{from{transform:none;filter:brightness(1)}to{transform:scale(1.07);filter:brightness(1.6)}}
@keyframes punch{0%{transform:scale(1.022)}100%{transform:scale(1)}}
@keyframes drift1{from{transform:translate(0,0)}to{transform:translate(160px,90px)}}
@keyframes drift2{from{transform:translate(0,0)}to{transform:translate(-140px,-70px)}}
@keyframes rope{from{transform:translateX(0)}to{transform:translateX(-204px)}}
@keyframes rise{from{transform:translateY(0)}to{transform:translateY(-${H + 300}px)}}
@keyframes tapRing{0%{opacity:0;transform:scale(.25)}25%{opacity:1}100%{opacity:0;transform:scale(1.6)}}
@keyframes tapDot{0%{opacity:0;transform:scale(.4)}30%{opacity:1;transform:scale(1)}75%{opacity:1}100%{opacity:0;transform:scale(.8)}}
@keyframes strike{from{transform:scaleX(0)}to{transform:scaleX(1)}}
@keyframes dim{to{opacity:.35}}
@keyframes draw{from{stroke-dashoffset:var(--len)}to{stroke-dashoffset:0}}
@keyframes spinIn{from{opacity:0;transform:rotate(-120deg) scale(.4)}to{opacity:1;transform:none}}
@keyframes shine{from{background-position:-200% 0}to{background-position:200% 0}}
@keyframes pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
@keyframes travel{from{offset-distance:0%}to{offset-distance:100%}}
@keyframes wipe{from{clip-path:inset(0 100% 0 0)}to{clip-path:inset(0 0 0 0)}}
@keyframes barGrow{from{transform:scaleX(0)}to{transform:scaleX(1)}}
`;

// ---- Parçalar ----
/** Kelime kelime gelen başlık; *yıldızlı* kelimeler renkli olur. */
function words(text, t0, step = 0.07, anim = 'wordUp', dur = 0.65) {
  let on = false;
  return text.split(' ').map((raw, i) => {
    const start = raw.startsWith('*'); if (start) on = true;
    const hl = on; if (/\*[.,!?:…]*$/.test(raw)) on = false;
    return `<span class="ww"><span class="${hl ? 'hl' : ''}" style="${A([anim, dur, t0 + i * step])}">${esc(raw.replace(/\*/g, ''))}</span></span>`;
  }).join(' ');
}

function background(W, H, d, accent = ['#1287b8', '#3b3fd8']) {
  const bubbles = Array.from({ length: 16 }, (_, i) => {
    const s = 8 + ((i * 37) % 28); const x = (i * 211) % W; const dur = 6 + (i % 5) * 1.6;
    return `<div class="bub" style="width:${s}px;height:${s}px;left:${x}px;top:${H + 40}px;opacity:${0.25 + (i % 4) * 0.12};${A(['rise', dur, -((i * 1.37) % dur), 'linear', 'infinite'])}"></div>`;
  }).join('');
  return `<div class="bg"></div>
  <div class="blob" style="width:${W * 0.9}px;height:${W * 0.9}px;left:${-W * 0.3}px;top:${-W * 0.35}px;background:radial-gradient(circle,${accent[0]}66 0,transparent 62%);${A(['drift1', d + 1, 0, 'ease-in-out'])}"></div>
  <div class="blob" style="width:${W * 0.8}px;height:${W * 0.8}px;right:${-W * 0.3}px;bottom:${-W * 0.3}px;background:radial-gradient(circle,${accent[1]}55 0,transparent 62%);${A(['drift2', d + 1, 0, 'ease-in-out'])}"></div>
  <div class="grid"></div>
  <div class="rope" style="height:${Math.round(H * 0.012)}px;top:${Math.round(H * 0.06)}px;${A(['rope', 3.2, 0, 'linear', 'infinite'])}"></div>
  <div class="rope" style="height:${Math.round(H * 0.012)}px;bottom:${Math.round(H * 0.05)}px;${A(['rope', 2.6, -1, 'linear', 'infinite reverse'])}"></div>
  ${bubbles}`;
}

export function logoSvg(size, t0 = null) {
  const draw = (len, delay) => (t0 === null ? '' : `style="--len:${len};stroke-dasharray:${len};${A(['draw', 0.9, t0 + delay, 'cubic-bezier(.65,0,.35,1)'])}"`);
  return `<svg width="${size}" height="${size}" viewBox="0 0 120 120"><defs><linearGradient id="lg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#43f3ff"/><stop offset=".55" stop-color="#3d8bff"/><stop offset="1" stop-color="#6a4bff"/></linearGradient><clipPath id="cp"><circle cx="60" cy="66" r="29"/></clipPath></defs>
  <rect x="2" y="2" width="116" height="116" rx="32" fill="url(#lg)"/><rect x="2" y="2" width="116" height="58" rx="32" fill="rgba(255,255,255,.12)"/>
  <rect x="52" y="17" width="16" height="9" rx="3" fill="#fff"/><path d="M60 26v6" stroke="#fff" stroke-width="6"/>
  <circle cx="60" cy="66" r="34" fill="none" stroke="#fff" stroke-width="7.5" ${draw(214, 0)} transform="rotate(-90 60 66)"/>
  <g clip-path="url(#cp)"><path d="M22 72c6-8 12-8 18 0s12 8 18 0 12-8 18 0 12 8 18 0 12-8 18 0" fill="none" stroke="#fff" stroke-width="6.5" stroke-linecap="round" ${draw(130, 0.35)}/><path d="M22 72c6-8 12-8 18 0s12 8 18 0 12-8 18 0 12 8 18 0 12-8 18 0V110H22Z" fill="rgba(255,255,255,.22)"/></g>
  <path d="M60 66l12-14" stroke="#fff" stroke-width="6" stroke-linecap="round" ${draw(20, 0.6)}/></svg>`;
}

const brandBug = (x, y, size, align = 'left') => `<div class="brandbug" style="${align === 'center' ? `left:0;right:0;justify-content:center` : `left:${x}px`};top:${y}px;font-size:${size}px;gap:${size * 0.5}px;${A(['fadeIn', 0.6, 0.1])}">${logoSvg(size * 1.6)}<span>${esc(BRAND)}</span></div>`;

function chip(c, x, y, scale, delay, side) {
  return `<div class="chip" style="left:${x}px;top:${y}px;font-size:${30 * scale}px;padding:${14 * scale}px ${24 * scale}px ${14 * scale}px ${14 * scale}px;transform-origin:${side === 'r' ? '0' : '100%'} 50%;${A(['pop', 0.55, delay])}"><span class="ic" style="width:${54 * scale}px;height:${54 * scale}px">${icon(c.icon ?? 'Check', 30 * scale, '#03101e', 2.6)}</span>${esc(c.text)}</div>`;
}

function taps(boxes, list) {
  return list.map(({ box = 0, at, x, y }) => {
    const b = boxes[box] ?? { x: x ?? 0.5, y: y ?? 0.6 };
    return `<div class="tap" style="left:${(x ?? b.x) * 100}%;top:${(y ?? b.y) * 100}%"><i style="${A(['tapRing', 0.75, at, 'ease-out'])}"></i><b style="${A(['tapDot', 0.65, at, 'ease-out'])}"></b></div>`;
  }).join('');
}

/** Telefon: genişlik w, ekran 390x800 oranında; isteğe bağlı kayan uzun ekran ve dokunma. */
function phone(id, w, { tall = false, d, tapList = [], scrollFrom = 0.25, scrollTo = 0.92 } = {}) {
  const pad = w * 0.032; const sw = w - pad * 2; const vh = sw * (800 / 390); const sh = sw * 0.12; const h = vh + sh + pad * 2;
  const s = shot('reel', id); const t = tall ? shot('reel', id, true) : null;
  let img = `<img src="${s.url}">`;
  let extraCss = '';
  if (t) {
    const ih = (t.h / t.w) * sw; const dist = Math.max(0, ih - vh);
    const name = `sc${hash([id, dist, d])}`;
    extraCss = `@keyframes ${name}{from{transform:translateY(0)}to{transform:translateY(-${dist.toFixed(1)}px)}}`;
    img = `<img src="${t.url}" style="${A([name, d * (scrollTo - scrollFrom), d * scrollFrom, 'cubic-bezier(.65,0,.35,1)'])}">`;
  }
  const html = `<div class="phone" style="width:${w}px;height:${h}px;border-radius:${w * 0.155}px;padding:${pad}px">
    <div class="side" style="left:-${w * 0.008}px;top:${h * 0.2}px;width:${w * 0.012}px;height:${h * 0.06}px"></div>
    <div class="side" style="left:-${w * 0.008}px;top:${h * 0.29}px;width:${w * 0.012}px;height:${h * 0.1}px"></div>
    <div class="side" style="right:-${w * 0.008}px;top:${h * 0.26}px;width:${w * 0.012}px;height:${h * 0.13}px"></div>
    <div class="scr" style="border-radius:${w * 0.125}px">
      <div class="status" style="height:${sh}px;padding:0 ${sw * 0.09}px;font-size:${sw * 0.042}px;background:${s.top}"><span>17:30</span><span style="display:flex;gap:${sw * 0.015}px;align-items:center">${icon('Signal', sw * 0.045, '#fff', 2.6)}${icon('Wifi', sw * 0.045, '#fff', 2.6)}${icon('BatteryFull', sw * 0.055, '#fff', 2.2)}</span></div>
      <div class="isl" style="top:${sh * 0.2}px;width:${sw * 0.3}px;height:${sh * 0.6}px"></div>
      <div class="vp" style="height:${vh}px">${img}${t ? '' : taps(s.boxes, tapList)}</div>
      <div class="glare"></div><div class="sweep"></div>
    </div></div>`;
  return { html, h, w, css: extraCss };
}

function tablet(id, w, { tapList = [] } = {}) {
  const pad = w * 0.028; const sw = w - pad * 2; const sh = sw * (820 / 1180); const h = sh + pad * 2;
  const s = shot('tablet', id);
  const html = `<div class="tablet" style="width:${w}px;height:${h}px;border-radius:${w * 0.045}px;padding:${pad}px">
    <div class="cam-dot" style="left:${pad * 0.38}px;top:${h / 2 - pad * 0.12}px;width:${pad * 0.24}px;height:${pad * 0.24}px"></div>
    <div class="scr" style="height:${sh}px;border-radius:${w * 0.018}px"><div class="vp" style="height:${sh}px"><img src="${s.url}">${taps(s.boxes, tapList)}</div><div class="glare"></div><div class="sweep"></div></div></div>`;
  return { html, h, w, css: '' };
}

function laptop(id, w, { tapList = [], light = null, d = 0, wipeAt = 0 } = {}) {
  const bz = w * 0.022; const sw = w - bz * 2; const sh = sw * (810 / 1440); const lidH = sh + bz * 1.9;
  const s = shot('film', id);
  const second = light ? `<img src="${shot('film', light).url}" style="position:absolute;inset:0;${A(['wipe', 1.1, wipeAt, 'cubic-bezier(.77,0,.18,1)'])}">` : '';
  const html = `<div class="laptop" style="width:${w * 1.14}px">
    <div class="lid" style="width:${w}px;height:${lidH}px;margin:0 auto;border-radius:${w * 0.022}px ${w * 0.022}px ${w * 0.006}px ${w * 0.006}px;padding:${bz}px ${bz}px ${bz * 0.9}px">
      <div class="cam-dot" style="left:${w / 2 - bz * 0.15}px;top:${bz * 0.35}px;width:${bz * 0.3}px;height:${bz * 0.3}px"></div>
      <div class="scr" style="height:${sh}px;border-radius:${w * 0.004}px"><div class="vp" style="height:${sh}px"><img src="${s.url}">${second}${taps(s.boxes, tapList)}</div><div class="glare"></div><div class="sweep"></div></div></div>
    <div class="base" style="width:${w * 1.14}px;height:${w * 0.028}px;border-radius:0 0 ${w * 0.03}px ${w * 0.03}px"><div class="notch" style="width:${w * 0.16}px;height:${w * 0.009}px;border-radius:0 0 ${w * 0.01}px ${w * 0.01}px"></div></div></div>`;
  return { html, h: lidH + w * 0.028, w: w * 1.14, css: '' };
}

/** Cihazı 3B duruşla sahneye uçurur, sonra hafifçe süzülür. */
function placeDevice(dev, x, y, { d, delay = 0, from = 'bottom', tilt = [8, -16], tiltTo = [4, -6], push = 1.0, pushAt = 0.5, origin = '50% 50%' }) {
  const start = { bottom: `translateY(${dev.h * 0.9}px) rotateX(30deg) rotateY(${tilt[1] * 1.6}deg)`, right: `translateX(${dev.w * 1.2}px) rotateY(-50deg)`, left: `translateX(-${dev.w * 1.2}px) rotateY(50deg)`, zoom: 'scale(.6) rotateX(20deg)' }[from];
  const name = `dv${hash([x, y, from, tilt, delay, dev.w])}`;
  const fl = `fl${hash([tilt, tiltTo, d])}`;
  const pu = `pu${hash([push, origin])}`;
  const css = `@keyframes ${name}{from{opacity:0;transform:${start}}to{opacity:1;transform:none}}
  @keyframes ${fl}{from{transform:rotateX(${tilt[0]}deg) rotateY(${tilt[1]}deg)}to{transform:rotateX(${tiltTo[0]}deg) rotateY(${tiltTo[1]}deg) translateY(-12px)}}
  @keyframes ${pu}{from{transform:scale(1)}to{transform:scale(${push})}}${dev.css}`;
  return {
    css,
    html: `<div class="shadow" style="left:${x + dev.w * 0.08}px;top:${y + dev.h * 0.96}px;width:${dev.w * 0.84}px;height:${dev.h * 0.08}px;${A(['fadeIn', 0.8, delay + 0.3])}"></div>
    <div style="position:absolute;left:${x}px;top:${y}px;width:${dev.w}px;height:${dev.h}px;perspective:2400px;transform-origin:${origin};${push !== 1 ? A([pu, d * (1 - pushAt) - 0.2, d * pushAt, 'cubic-bezier(.65,0,.35,1)']) : ''}">
      <div style="transform-style:preserve-3d;${A([name, 0.9, delay, 'cubic-bezier(.16,1,.3,1)'])}"><div style="${A([fl, d, 0, 'ease-in-out'])}">${dev.html}</div></div></div>`,
  };
}

// ---- Sahne şablonları ----
// Her şablon { html, css } döndürür. g: { W, H, wide, d, beat }
const T = {};

/** Telefon, tablet veya dizüstü üzerinde bir özellik. */
T.device = (g, s) => {
  const { W, H, wide, d, beat } = g;
  let css = '';
  let body = '';
  const kind = s.device ?? (wide ? 'laptop' : 'phone');
  const tapList = s.tap === false ? [] : [{ box: s.tapBox ?? 0, at: s.tapAt ?? beat * 3 }];
  if (wide) {
    const right = !s.flip;
    let dev;
    if (kind === 'laptop') dev = laptop(s.shot, 960, { tapList, light: s.light, wipeAt: beat * 3 });
    else if (kind === 'tablet') dev = tablet(s.shot, 960, { tapList });
    else dev = phone(s.shot, 390, { tall: s.scroll, d, tapList });
    const x = right ? W - dev.w - (kind === 'phone' ? 300 : 80) : (kind === 'phone' ? 300 : 80);
    const y = (H - dev.h) / 2 + (kind === 'laptop' ? 40 : 30);
    const p = placeDevice(dev, x, y, { d, from: right ? 'right' : 'left', tilt: right ? [6, -14] : [6, 14], tiltTo: right ? [3, -5] : [3, 5], push: s.push ?? (kind === 'laptop' ? 1.08 : 1.04), pushAt: 0.55, origin: s.origin ?? (right ? '35% 45%' : '65% 45%') });
    css += p.css; body += p.html;
    const tx = right ? 100 : W - 680;
    const pts = (s.points ?? []).map((t, i) => `<li style="display:flex;gap:18px;align-items:center;${A(['slideL', 0.6, beat * (2 + i)])}"><span class="ic" style="display:grid;place-items:center;width:46px;height:46px;border-radius:14px;background:rgba(80,230,255,.14);color:#6ff2ff;flex:none">${icon(s.icons?.[i] ?? 'Check', 26, '#6ff2ff', 2.6)}</span>${esc(t)}</li>`).join('');
    body += `<div style="position:absolute;left:${tx}px;top:${H * 0.24}px;width:580px">
      <div class="kicker" style="font-size:22px;padding:10px 20px;${A(['fadeUp', 0.6, 0.05])}">${icon(s.kIcon ?? 'Sparkles', 22, 'currentColor', 2.4)}${esc(s.kicker)}</div>
      <div class="title" style="font-size:${s.title.length > 30 ? 58 : s.title.length > 22 ? 64 : 74}px;margin:26px 0 ${s.sub ? 18 : 34}px">${words(s.title, 0.15)}</div>
      ${s.sub ? `<div class="sub" style="font-size:29px;line-height:1.38;margin-bottom:34px;color:#bcd6e4;${A(['fadeUp', 0.6, 0.7])}">${esc(s.sub)}</div>` : ''}
      <ul style="list-style:none;display:grid;gap:20px;font-size:30px;font-weight:650;color:#dcecf5">${pts}</ul></div>`;
    (s.chips ?? []).forEach((c, i) => { body += chip(c, right ? x + dev.w - 120 - i * 60 : x - 140 + i * 60, y + 80 + i * 150, 0.85, beat * (2.5 + i * 1.5), right ? 'r' : 'l'); });
  } else {
    let dev;
    if (kind === 'laptop') dev = laptop(s.shot, 880, { tapList });
    else if (kind === 'tablet') dev = tablet(s.shot, 900, { tapList });
    else dev = phone(s.shot, 500, { tall: s.scroll, d, tapList });
    const x = (W - dev.w) / 2; const y = kind === 'phone' ? (s.sub ? 700 : 600) : (s.sub ? 880 : 820);
    const p = placeDevice(dev, x, y, { d, from: 'bottom', tilt: [10, s.flip ? 16 : -16], tiltTo: [4, s.flip ? 6 : -6], push: s.push ?? (kind === 'phone' ? 1.04 : 1.12), pushAt: 0.5, origin: s.origin ?? '50% 30%' });
    css += p.css; body += p.html;
    body += `<div style="position:absolute;left:70px;right:70px;top:190px;text-align:center">
      <div class="kicker" style="font-size:30px;padding:12px 26px;${A(['fadeUp', 0.5, 0.05])}">${icon(s.kIcon ?? 'Sparkles', 30, 'currentColor', 2.4)}${esc(s.kicker)}</div>
      <div class="title" style="font-size:${s.title.length > 30 ? 74 : s.title.length > 22 ? 82 : 96}px;margin-top:24px">${words(s.title, 0.12, 0.06)}</div>
      ${s.sub ? `<div class="sub" style="font-size:38px;line-height:1.32;margin-top:20px;color:#c4dceb;${A(['fadeUp', 0.6, 0.6])}">${esc(s.sub)}</div>` : ''}</div>`;
    (s.chips ?? []).forEach((c, i) => {
      const left = i % 2 === 0;
      body += chip(c, left ? 40 : W - 520, y + 260 + i * 210, 1, beat * (1.5 + i), left ? 'l' : 'r');
    });
  }
  return { html: body, css };
};

/** Büyük, vuruşa düşen cümleler (reel kancası). */
T.hook = (g, s) => {
  const { W, wide, beat } = g;
  const size = wide ? 120 : 118;
  const lines = s.lines.map((l, i) => `<div class="title" style="font-size:${l.size ?? size}px;margin-bottom:24px;transform-origin:50% 60%;${A(['stamp', 0.5, beat * (l.at ?? i), 'cubic-bezier(.2,1.4,.4,1)'])}">${l.text.replace(/\*(.+?)\*/g, '<span class="hl">$1</span>')}</div>`).join('');
  return { html: `<div style="position:absolute;left:${wide ? 160 : 70}px;right:${wide ? 160 : 70}px;top:${wide ? 300 : 560}px;text-align:center">${s.kicker ? `<div class="kicker" style="font-size:${wide ? 26 : 32}px;padding:12px 26px;margin-bottom:40px;${A(['fadeUp', 0.5, 0])}">${esc(s.kicker)}</div>` : ''}${lines}</div>
    ${s.icon ? `<div style="position:absolute;left:50%;top:${wide ? 540 : 960}px;transform:translate(-50%,-50%);opacity:.07">${icon(s.icon, W * 0.75, '#9ff', 1.2)}</div>` : ''}`, css: '' };
};

/** Üstü çizilen eski yöntemler, ardından çözüm. */
T.strike = (g, s) => {
  const { wide, beat } = g;
  const fs = wide ? 92 : 96;
  const items = s.items.map((t, i) => `<div style="position:relative;display:inline-block;margin:0 auto 18px;font-size:${fs}px;${A(['stamp', 0.45, beat * i, 'cubic-bezier(.2,1.4,.4,1)'], ['dim', 0.3, beat * s.items.length])}"><span class="title" style="font-size:${fs}px;color:#cfe3ee">${esc(t)}</span><span class="strike" style="${A(['strike', 0.3, beat * i + beat * 0.55, 'ease-out'])}"></span></div>`).join('<br>');
  const at = beat * (s.items.length + 0.5);
  return { html: `<div style="position:absolute;left:0;right:0;top:${wide ? 170 : 470}px;text-align:center">${items}
    <div class="title" style="font-size:${wide ? 108 : 112}px;margin-top:${wide ? 30 : 60}px;padding:0 60px">${words(s.answer, at, 0.09, 'wordUp', 0.6)}</div></div>`, css: '' };
};

/** Bölüm kartı */
T.chapter = (g, s) => {
  const { W, H, wide, beat } = g;
  return { html: `<div style="position:absolute;left:${wide ? 160 : 80}px;top:${wide ? 250 : 620}px;right:80px">
    <div style="font-size:${wide ? 300 : 260}px;font-weight:900;line-height:.8;color:transparent;-webkit-text-stroke:3px rgba(120,230,255,.55);${A(['slideL', 0.8, 0])}">${esc(s.no)}</div>
    <div style="display:flex;align-items:center;gap:28px;margin-top:30px;${A(['fadeUp', 0.6, beat * 0.5])}"><span style="display:grid;place-items:center;width:${wide ? 110 : 120}px;height:${wide ? 110 : 120}px;border-radius:32px;background:linear-gradient(135deg,${s.color ?? '#3ff0ff'},#4b6bff)">${icon(s.icon, wide ? 60 : 66, '#03101e', 2.4)}</span>
    <div class="title" style="font-size:${wide ? 130 : 120}px">${words(s.title, beat * 0.6)}</div></div>
    <div class="sub" style="font-size:${wide ? 40 : 46}px;margin-top:26px;${A(['fadeUp', 0.6, beat * 1.4])}">${esc(s.sub)}</div>
    <div style="height:8px;width:${wide ? 900 : 700}px;margin-top:44px;border-radius:9px;background:linear-gradient(90deg,${s.color ?? '#3ff0ff'},transparent);transform-origin:0 50%;${A(['barGrow', 1.2, beat * 0.8])}"></div></div>
    <div style="position:absolute;right:${wide ? -120 : -260}px;top:${wide ? 140 : 1100}px;opacity:.06">${icon(s.icon, wide ? 900 : 900, '#bff', 1)}</div>`, css: '' };
};

/** Üç platform birlikte */
T.trio = (g, s) => {
  const { W, H, wide, d, beat } = g;
  let css = ''; let html = '';
  if (wide) {
    const lap = placeDevice(laptop(s.laptop, 980), (W - 980 * 1.14) / 2 + 40, 250, { d, from: 'zoom', tilt: [6, 0], tiltTo: [2, 0] });
    const tab = placeDevice(tablet(s.tablet, 560), 120, 420, { d, delay: beat, from: 'left', tilt: [6, 18], tiltTo: [3, 8] });
    const ph = placeDevice(phone(s.phone, 250), W - 430, 360, { d, delay: beat * 2, from: 'right', tilt: [6, -18], tiltTo: [3, -8] });
    css = lap.css + tab.css + ph.css; html = lap.html + tab.html + ph.html;
    html += `<div style="position:absolute;left:0;right:0;top:70px;text-align:center"><div class="title" style="font-size:78px">${words(s.title, 0.1)}</div></div>`;
    html += ['Globe:Web', 'Smartphone:Android', 'Monitor:Windows'].map((x, i) => { const [ic, t] = x.split(':'); return chip({ icon: ic, text: t }, 560 + i * 300, 960, 0.9, beat * (3 + i * 0.5), 'r'); }).join('');
  } else {
    const lap = placeDevice(laptop(s.laptop, 820), (W - 820 * 1.14) / 2, 640, { d, from: 'zoom', tilt: [8, 0], tiltTo: [3, 0] });
    const tab = placeDevice(tablet(s.tablet, 520), 40, 1100, { d, delay: beat, from: 'left', tilt: [8, 16], tiltTo: [3, 6] });
    const ph = placeDevice(phone(s.phone, 300), W - 360, 1040, { d, delay: beat * 2, from: 'right', tilt: [8, -16], tiltTo: [3, -6] });
    css = lap.css + tab.css + ph.css; html = lap.html + tab.html + ph.html;
    html += `<div style="position:absolute;left:60px;right:60px;top:220px;text-align:center"><div class="title" style="font-size:96px">${words(s.title, 0.1)}</div>
      <div class="sub" style="font-size:42px;margin-top:22px;${A(['fadeUp', 0.6, beat * 2.5])}">Web · Android · Windows</div></div>`;
  }
  return { html, css };
};

/** Kronometre: tablet dev ekran, telefon kumanda, aralarında canlı bağlantı. */
T.remote = (g, s) => {
  const { W, H, wide, d, beat } = g;
  const tw = wide ? 900 : 960; const pw = wide ? 330 : 340;
  const tab = tablet(s.tablet, tw); const ph = phone(s.phone, pw);
  const tx = wide ? 90 : (W - tw) / 2; const ty = wide ? 380 : 660;
  const px = wide ? W - pw - 170 : W - pw - 70; const py = wide ? 150 : 1150;
  const a = placeDevice(tab, tx, ty, { d, from: 'left', tilt: [5, 10], tiltTo: [2, 4] });
  const b = placeDevice(ph, px, py, { d, delay: beat, from: 'right', tilt: [6, -14], tiltTo: [3, -6] });
  const sx = wide ? tx + tw - 40 : W / 2; const sy = wide ? ty + tab.h / 2 : ty + tab.h - 30;
  const ex = wide ? px + 30 : px + pw / 2; const ey = wide ? py + ph.h / 2 : py + 40;
  const path = `M${sx} ${sy} C ${(sx + ex) / 2} ${sy - 160}, ${(sx + ex) / 2} ${ey + 160}, ${ex} ${ey}`;
  const dots = [0, 1, 2].map((i) => `<div style="position:absolute;left:0;top:0;width:22px;height:22px;margin:-11px;border-radius:50%;background:#5ff6ff;box-shadow:0 0 24px #5ff6ff;offset-path:path('${path}');${A(['travel', beat * 2, beat * 2 + i * beat * 0.66, 'linear', 'infinite reverse'])}"></div>`).join('');
  const title = `<div style="position:absolute;${wide ? 'left:110px;top:100px;width:1180px' : 'left:60px;right:60px;top:200px;text-align:center'}"><div class="kicker" style="font-size:${wide ? 22 : 30}px;padding:10px 22px;${A(['fadeUp', 0.5, 0])}">${icon('Timer', wide ? 22 : 30, 'currentColor')}${esc(s.kicker)}</div><div class="title" style="font-size:${wide ? 64 : 84}px;margin-top:20px">${words(s.title, 0.12)}</div>${s.sub ? `<div class="sub" style="font-size:${wide ? 28 : 38}px;margin-top:14px;color:#c4dceb;${A(['fadeUp', 0.6, 0.6])}">${esc(s.sub)}</div>` : ''}</div>`;
  const chips = (s.chips ?? []).map((c, i) => chip(c, wide ? 1130 : (i % 2 ? W - 520 : 40), wide ? 905 + i * 85 : 1560 + i * 120, wide ? 0.8 : 0.95, beat * (3 + i), 'r')).join('');
  return { html: a.html + b.html + `<svg style="position:absolute;inset:0;overflow:visible" width="${W}" height="${H}"><path d="${path}" fill="none" stroke="rgba(95,246,255,.55)" stroke-width="4" stroke-dasharray="14 14" style="--len:600;${A(['fadeIn', 0.6, beat * 1.5])}"/></svg><div style="${A(['fadeIn', 0.3, beat * 2])}">${dots}</div>` + title + chips, css: a.css + b.css };
};

/** Yapay zekâ: cihaz üstünde yazılan analiz kartı */
T.ai = (g, s) => {
  const { W, H, wide, d, beat } = g;
  const base = T.device(g, { ...s, chips: [] });
  const lines = s.lines;
  const cw = wide ? 640 : 900; const cx = wide ? (s.flip ? W - cw - 90 : 90) : (W - cw) / 2; const cy = wide ? 600 : 1300;
  const start = beat * 3;
  const card = `<div class="card3" style="left:${cx}px;top:${cy}px;width:${cw}px;padding:${wide ? 28 : 34}px;${A(['pop', 0.6, start - 0.4])}">
    <div style="display:flex;align-items:center;gap:14px;font-weight:800;font-size:${wide ? 26 : 32}px;color:#8ff3ff;margin-bottom:16px">${icon('Sparkles', wide ? 30 : 36, 'currentColor')}Yapay zekâ analizi<span data-dots style="color:#6aa">…</span></div>
    <div style="position:relative;font-size:${wide ? 24 : 31}px;line-height:1.45;font-weight:600;color:#e6f6ff;white-space:pre-line"><div style="visibility:hidden">${esc(lines.join('\n'))}</div><div data-type="${esc(JSON.stringify({ start, cps: 46 }))}" style="position:absolute;inset:0">${esc(lines.join('\n'))}</div></div></div>`;
  return { html: base.html + card, css: base.css };
};

/** Özellik duvarı */
T.wall = (g, s) => {
  const { W, wide, beat } = g;
  const cols = wide ? 4 : 2; const cw = wide ? 380 : 450; const ch = wide ? 150 : 170; const gap = 26;
  const x0 = (W - (cols * cw + (cols - 1) * gap)) / 2; const y0 = wide ? 300 : 520;
  const tiles = s.items.map(([ic, t], i) => {
    const x = x0 + (i % cols) * (cw + gap); const y = y0 + Math.floor(i / cols) * (ch + gap);
    return `<div class="card3" style="left:${x}px;top:${y}px;width:${cw}px;height:${ch}px;display:flex;align-items:center;gap:22px;padding:0 28px;font-size:${wide ? 30 : 36}px;font-weight:750;${A(['pop', 0.5, beat * 0.5 + i * (beat / 2)])}"><span style="display:grid;place-items:center;width:${wide ? 72 : 84}px;height:${wide ? 72 : 84}px;border-radius:22px;background:linear-gradient(135deg,var(--a1),var(--a2));flex:none">${icon(ic, wide ? 38 : 44, '#03101e', 2.4)}</span>${esc(t)}</div>`;
  }).join('');
  return { html: `<div style="position:absolute;left:0;right:0;top:${wide ? 110 : 250}px;text-align:center"><div class="title" style="font-size:${wide ? 80 : 92}px;padding:0 60px">${words(s.title, 0)}</div></div>${tiles}`, css: '' };
};

/** Sayılar */
T.stats = (g, s) => {
  const { W, wide, beat } = g;
  const items = s.items.map(([n, label, suffix = ''], i) => `<div style="text-align:center;${A(['pop', 0.6, beat * (0.5 + i)])}"><div class="title hl" style="font-size:${wide ? 170 : 190}px" data-count="${esc(JSON.stringify({ to: n, start: beat * (0.5 + i), dur: beat * 1.5, suffix }))}">0</div><div class="sub" style="font-size:${wide ? 36 : 44}px;margin-top:6px">${esc(label)}</div></div>`).join('');
  return { html: `<div style="position:absolute;left:0;right:0;top:${wide ? 120 : 260}px;text-align:center"><div class="title" style="font-size:${wide ? 72 : 88}px">${words(s.title, 0)}</div></div>
    <div style="position:absolute;left:80px;right:80px;top:${wide ? 380 : 620}px;display:grid;grid-template-columns:repeat(${wide ? s.items.length : 1},1fr);gap:${wide ? 40 : 70}px">${items}</div>`, css: '' };
};

/** Logo açılışı / kapanış */
T.logo = (g, s) => {
  const { W, H, wide, beat } = g;
  const ls = wide ? 230 : 300;
  return { html: `<div style="position:absolute;left:0;right:0;top:${wide ? 200 : 520}px;text-align:center">
    <div style="display:inline-block;filter:drop-shadow(0 30px 80px rgba(60,200,255,.45));${A(['spinIn', 1, 0, 'cubic-bezier(.2,1.3,.4,1)'])}">${logoSvg(ls, 0.2)}</div>
    <div class="title" style="font-size:${wide ? 120 : 112}px;margin-top:40px;padding:0 50px">${words(BRAND, beat * 1.2, 0.12)}</div>
    <div class="sub" style="font-size:${wide ? 44 : 50}px;margin-top:22px;padding:0 60px;${A(['fadeUp', 0.7, beat * 2.2])}">${s.tagline.replace(/\*(.+?)\*/g, '<span class="hl">$1</span>')}</div>
    ${s.platforms ? `<div style="display:flex;justify-content:center;gap:${wide ? 26 : 20}px;margin-top:${wide ? 54 : 70}px;flex-wrap:wrap">${['Globe:Web', 'Smartphone:Android', 'Monitor:Windows'].map((x, i) => { const [ic, t] = x.split(':'); return `<div class="kicker" style="font-size:${wide ? 26 : 32}px;padding:14px 26px;letter-spacing:.06em;${A(['pop', 0.5, beat * (3 + i * 0.5)])}">${icon(ic, wide ? 28 : 34, 'currentColor')}${t}</div>`; }).join('')}</div>` : ''}
    ${s.cta ? `<div class="title" style="font-size:64px;margin-top:70px;${A(["stamp", 0.5, beat * 4, "cubic-bezier(.2,1.4,.4,1)"])}">Hemen dene</div>` : ""}
    ${s.url ? `<div style="font-size:${wide ? 36 : 42}px;font-weight:800;margin-top:${wide ? 50 : s.cta ? 30 : 70}px;color:#fff;${A(['fadeUp', 0.6, beat * 4.5])}"><span style="padding:16px 34px;border-radius:99px;background:linear-gradient(90deg,var(--a1),var(--a2));color:#03101e">${esc(s.url)}</span></div>` : ''}</div>`, css: '' };
};

/** Roller */
T.roles = (g, s) => {
  const { W, wide, beat } = g;
  const cards = s.items.map(([ic, t, sub, color], i) => `<div class="card3" style="position:relative;padding:${wide ? 34 : 30}px;display:flex;${wide ? 'flex-direction:column;' : ''}gap:22px;align-items:${wide ? 'flex-start' : 'center'};${A(['pop', 0.55, beat * (0.5 + i * 0.5)])}"><span style="display:grid;place-items:center;width:${wide ? 92 : 96}px;height:${wide ? 92 : 96}px;border-radius:26px;background:linear-gradient(135deg,${color},#4b6bff);flex:none">${icon(ic, wide ? 48 : 52, '#03101e', 2.4)}</span><div><div style="font-size:${wide ? 36 : 44}px;font-weight:850">${esc(t)}</div><div class="sub" style="font-size:${wide ? 24 : 30}px;margin-top:6px">${esc(sub)}</div></div></div>`).join('');
  return { html: `<div style="position:absolute;left:0;right:0;top:${wide ? 110 : 230}px;text-align:center"><div class="title" style="font-size:${wide ? 80 : 92}px;padding:0 60px">${words(s.title, 0)}</div></div>
    <div style="position:absolute;left:${wide ? 90 : 60}px;right:${wide ? 90 : 60}px;top:${wide ? 330 : 520}px;display:grid;grid-template-columns:repeat(${wide ? s.items.length : 1},1fr);gap:${wide ? 24 : 28}px">${cards}</div>`, css: '' };
};

/** Rol videosunun açılışı: rol adı harf harf düşer, simge döner, şok dalgaları vuruşla yayılır. */
T.roleIntro = (g, s) => {
  const { W, H, wide, beat } = g;
  const cx = W / 2; const cy = wide ? 330 : 760; const is = wide ? 190 : 260;
  const words = s.role.split(' '); const longest = Math.max(...words.map((w) => w.length));
  const fs = Math.min(wide ? 210 : 230, Math.floor((W - 120) / (longest * 0.66)));
  let k = 0;
  const nameHtml = (anim) => words.map((w) => `<div style="white-space:nowrap">${[...w].map((ch) => { const delay = beat * 0.5 + (k++) * 0.05; return `<span class="ltr" style="${A([anim, 0.55, delay, 'cubic-bezier(.2,1.4,.4,1)'])}">${esc(ch)}</span>`; }).join('')}</div>`).join('');
  const main = nameHtml('ltrIn'); const reveal = beat * 0.5 + k * 0.05;
  const rings = [0, 0.14, 0.28, beat * 2, beat * 2 + 0.14].map((dl, i) => `<div class="ring" style="left:${cx - is}px;top:${cy - is}px;width:${is * 2}px;height:${is * 2}px;border-width:${i % 2 ? 3 : 6}px;${A(['ringOut', 1.1, dl, 'cubic-bezier(.1,.7,.3,1)'])}"></div>`).join('');
  const orbit = Array.from({ length: 6 }, (_, i) => `<b style="transform:rotate(${i * 60}deg) translateX(${is * 0.82}px)"></b>`).join('');
  const ghost = (color, anim) => `<div class="ghost" style="color:${color}">${words.map((w) => `<div style="white-space:nowrap;-webkit-text-fill-color:${color};${A([anim, 0.4, reveal, 'ease-out'])}">${esc(w)}</div>`).join('')}</div>`;
  return { html: `${rings}
    <div style="position:absolute;left:${cx - is / 2}px;top:${cy - is / 2}px;width:${is}px;height:${is}px">
      <div class="orbit" style="${A(['spin', beat * 8, 0, 'linear', 'infinite'], ['fadeIn', 0.4, 0.3])}">${orbit}</div>
      <div style="width:${is}px;height:${is}px;border-radius:${is * 0.28}px;display:grid;place-items:center;background:linear-gradient(135deg,var(--a1),var(--a2));box-shadow:0 0 90px var(--a1),0 30px 80px rgba(0,0,0,.5);${A(['spinIn', 0.8, 0, 'cubic-bezier(.2,1.4,.4,1)'])}">${icon(s.icon, is * 0.52, '#03101e', 2.2)}</div></div>
    <div style="position:absolute;left:0;right:0;top:${cy + is * 0.85}px;text-align:center">
      <div style="position:relative;display:inline-block;margin-top:${wide ? 14 : 26}px;font-size:${fs}px;font-weight:900;letter-spacing:-.02em;line-height:.98">${main}${ghost('#ff3d77', 'ghostL')}${ghost('var(--a1)', 'ghostR')}</div>
      <div class="title" style="font-size:${wide ? 56 : 66}px;margin-top:${wide ? 26 : 46}px;padding:0 60px">${wordsOf(s.line, beat * 2.5)}</div></div>`, css: '' };
};
const wordsOf = (t, t0) => words(t, t0, 0.08);

// ---- Sahne kurulumu ----
function buildScene(g, s, index, total) {
  const { W, H, wide, d, beat, energy, theme, seg, last } = g;
  const part = T[s.type](g, s);
  const out = Math.max(0, d - 0.2);
  const bar = beat * 4;
  const progress = wide && s.progress !== false ? `<div style="position:absolute;left:0;bottom:0;height:6px;background:linear-gradient(90deg,var(--a1),var(--a2));width:${((index + 1) / total) * 100}%"></div>` : '';
  const bug = s.type === 'logo' || s.type === 'roleIntro' ? '' : (wide ? brandBug(60, 44, 24) : brandBug(0, 86, 30, 'center'));
  // Dikey videolarda her sahne farklı bir geçişle, müziğin ölçü başında girer.
  const TR = ['trZoom', 'trWhip', 'trCircle', 'trUp', 'trSpin'];
  const camAnim = wide
    ? A(['sceneIn', 0.55, 0], ['sceneOut', 0.2, out, 'ease-in'])
    : A([index === 0 ? 'trZoom' : TR[index % TR.length], 0.45, 0], ...(last ? [] : [['trOut', 0.17, d - 0.17, 'ease-in']]));
  // Hikâye çubuğu: kaçıncı özellikte olunduğunu gösterir.
  const segs = !wide && seg ? Array.from({ length: seg.n }, (_, i) => {
    const w = (W - 120 - (seg.n - 1) * 10) / seg.n; const x = 60 + i * (w + 10);
    const fill = i < seg.i ? 'transform:none' : i === seg.i ? A(['segFill', d, 0, 'linear']) : 'transform:scaleX(0)';
    return `<div class="seg" style="left:${x}px;width:${w}px"><i style="${fill}"></i></div>`;
  }).join('') : '';
  // Vuruşa göre parlayan halkalar, ışık çizgileri ve ölçü başı nabzı.
  const beatFx = !wide && energy >= 2 ? `<div class="fx">
    ${[0, 0.5].map((o) => `<div class="ring" style="left:${W / 2 - 420}px;top:${H * 0.62 - 420}px;width:840px;height:840px;border-width:3px;${A(['ringOut', beat * 2, beat * o * 2, 'cubic-bezier(.1,.7,.3,1)', 'infinite'])}"></div>`).join('')}
    ${Array.from({ length: 6 }, (_, i) => `<div class="streak" style="left:${(i * 197) % W}px;top:${H * 0.3 + ((i * 271) % 700)}px;${A(['streak', beat * 2, -i * beat * 0.37, 'linear', 'infinite'])}"></div>`).join('')}
    ${energy >= 3 ? `<div class="dpulse" style="${A(['dpulse', bar, 0, 'linear', 'infinite'])}"></div>` : ''}</div>` : '';
  const [a1, a2] = theme ?? ['#3ff0ff', '#4b6bff'];
  const html = `<!doctype html><html lang="tr"><meta charset="utf-8"><style>${CSS(W, H, beat)}:root{--a1:${a1};--a2:${a2}}${part.css}</style>
  <div class="stage">${background(W, H, d, s.accent ?? [a1, a2])}${beatFx}
    <div class="cam" style="${camAnim}">
      <div class="beat" style="${energy >= 2 ? A(['punch', beat, 0, 'cubic-bezier(.2,.8,.3,1)', 'infinite']) : ''}">${part.html}</div>
    </div>${bug}${progress}${segs}
    <div class="vig"></div><div class="flash" style="--flash:${wide ? (energy >= 3 ? 0.4 : 0.12) : (energy >= 3 ? 0.55 : 0.3)};background:${wide ? '#dff9ff' : a1};${A(['flash', wide ? 0.4 : 0.3, 0, 'ease-out'])}"></div></div>
  <script>
  const typers=[...document.querySelectorAll('[data-type]')].map(e=>({e,full:e.textContent,o:JSON.parse(e.dataset.type)}));
  const counters=[...document.querySelectorAll('[data-count]')].map(e=>({e,o:JSON.parse(e.dataset.count)}));
  const dots=document.querySelector('[data-dots]');
  window.__seek=(t)=>{
    for(const a of document.getAnimations()){a.pause();a.currentTime=t*1000;}
    for(const {e,full,o} of typers){const n=Math.max(0,Math.floor((t-o.start)*o.cps));e.textContent=full.slice(0,n)+(n>0&&n<full.length&&Math.floor(t*3)%2?'▍':'');}
    for(const {e,o} of counters){const p=Math.min(1,Math.max(0,(t-o.start)/o.dur));const v=Math.round(o.to*(1-Math.pow(1-p,3)));e.textContent=v.toLocaleString('tr-TR')+o.suffix;}
    if(dots){dots.textContent='.'.repeat(1+Math.floor(t*3)%3);}
  };
  </script>`;
  return html;
}

/** Bir videonun bütün sahnelerini kare kare çeker. */
export async function renderVideo(browser, video) {
  const { file, wide, bpm } = video;
  const [W, H] = wide ? [1920, 1080] : [1080, 1920];
  const beat = 60 / bpm; const bar = beat * 4;
  const clips = []; let barAt = 0;
  for (const [i, s] of video.scenes.entries()) {
    const last = i === video.scenes.length - 1;
    const startF = Math.round(barAt * bar * FPS);
    const endF = Math.round(((barAt + s.bars) * bar + (last ? video.tail : 0)) * FPS);
    barAt += s.bars;
    const frames = endF - startF; const d = frames / FPS;
    const feats = video.scenes.filter((x) => !["roleIntro", "logo", "hook", "strike"].includes(x.type));
    const seg = feats.includes(s) ? { i: feats.indexOf(s), n: feats.length } : null;
    const html = buildScene({ W, H, wide, d, beat, energy: s.energy, theme: video.theme, seg, last }, s, i, video.scenes.length);
    const id = hash([html, frames, W]);
    const mp4 = join(WORK, 'sahne', `${file}-${String(i).padStart(2, '0')}-${id}.mp4`);
    clips.push(mp4);
    const preview = process.env.ONIZLEME;
    if (existsSync(mp4) && !preview) continue;
    const htmlFile = join(WORK, 'sahne', `${id}.html`);
    writeFileSync(htmlFile, html);
    const page = await browser.newPage({ viewport: { width: W, height: H } });
    await page.goto(pathToFileURL(htmlFile).href);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => [...document.images].every((im) => im.complete && im.naturalWidth > 0), null, { timeout: 20000 });
    if (preview) {
      // Hızlı kontrol: sahnenin verilen oranındaki tek kare.
      mkdirSync(join(WORK, 'onizleme'), { recursive: true });
      for (const r of preview.split(',').map(Number)) {
        await page.evaluate((t) => window.__seek(t), d * r);
        await page.screenshot({ path: join(WORK, 'onizleme', `${file}-${String(i).padStart(2, '0')}-${Math.round(r * 100)}.jpg`), type: 'jpeg', quality: 80 });
      }
      await page.close();
      continue;
    }
    const ff = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-r', String(FPS), mp4 + '.tmp.mp4'], { stdio: ['pipe', 'ignore', 'inherit'] });
    const done = new Promise((ok, fail) => ff.on('close', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}`)))));
    for (let f = 0; f < frames; f += 1) {
      await page.evaluate((t) => window.__seek(t), f / FPS);
      const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    }
    ff.stdin.end();
    await done;
    await page.close();
    execFileSync('powershell.exe', ['-NoProfile', '-Command', `Move-Item -Force -LiteralPath '${mp4}.tmp.mp4' -Destination '${mp4}'`]);
    console.log(file, `${i + 1}/${video.scenes.length}`, s.type, s.shot ?? '', `${d.toFixed(2)} sn`);
  }
  return clips;
}

export function finish(video, clips, musicFile) {
  const list = join(WORK, `${video.file}.txt`);
  writeFileSync(list, clips.map((c) => `file '${c.replace(/\\/g, '/')}'`).join('\n'));
  const joined = join(WORK, `${video.file}-goruntu.mp4`);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
  execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', joined, '-i', musicFile, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-af', 'loudnorm=I=-14:TP=-1.2:LRA=11', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', join(ROOT, `${video.file}.mp4`)]);
  return joined;
}
