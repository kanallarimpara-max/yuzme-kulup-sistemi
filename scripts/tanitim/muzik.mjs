// Tanıtım videoları için bu projede sıfırdan üretilen telifsiz, enerjik müzik.
// Dörtlük vuruş, nefes alan (sidechain) akorlar, bas, akılda kalan melodi, yükselme ve düşüş anları.
import { writeFileSync } from 'node:fs';

const RATE = 44100;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);

function rng(seed) {
  let s = (seed * 2654435761) >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

class Biquad {
  constructor(type, f, q = 0.707) { this.type = type; this.x1 = this.x2 = this.y1 = this.y2 = 0; this.set(f, q); }
  set(f, q = this.q) {
    this.q = q;
    const w = (2 * Math.PI * Math.min(Math.max(f, 20), RATE * 0.45)) / RATE; const c = Math.cos(w); const a = Math.sin(w) / (2 * q);
    let b0; let b1; let b2;
    if (this.type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; } else if (this.type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; } else { b0 = a; b1 = 0; b2 = -a; }
    const a0 = 1 + a;
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = (-2 * c) / a0; this.a2 = (1 - a) / a0;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}

const blep = (t, dt) => {
  if (t < dt) { t /= dt; return t + t - t * t - 1; }
  if (t > 1 - dt) { t = (t - 1) / dt; return t * t + t + t + 1; }
  return 0;
};

/** Stereo kanal çifti. */
const bus = (n) => [new Float32Array(n), new Float32Array(n)];

// vi - IV - I - V ilerleyişi (La minör). Ses yerleşimi yumuşak geçiş için ters çevrilmiş.
const CHORDS = [[57, 60, 64, 69], [57, 60, 65, 69], [55, 60, 64, 67], [55, 59, 62, 67]];
const ROOTS = [33, 29, 36, 31];
const MOTIFS = [
  [[76, 2], [72, 1], [74, 1], [76, 2], [79, 1], [76, 1], [77, 2], [76, 1], [72, 1], [74, 2], [72, 1], [69, 1], [72, 2], [76, 1], [79, 1], [81, 2], [79, 1], [76, 1], [74, 2], [71, 1], [74, 1], [79, 2], [76, 1], [74, 1]],
  [[69, 1], [72, 1], [76, 2], [74, 1], [72, 1], [76, 2], [77, 1], [76, 1], [72, 2], [69, 1], [72, 1], [74, 2], [76, 1], [79, 1], [76, 2], [72, 1], [74, 1], [76, 2], [74, 1], [71, 1], [67, 2], [71, 1], [74, 1], [79, 2]],
  [[81, 2], [79, 1], [76, 1], [79, 2], [76, 1], [74, 1], [77, 2], [76, 1], [74, 1], [72, 2], [69, 2], [76, 1], [79, 1], [81, 2], [84, 2], [83, 1], [81, 1], [79, 2], [74, 1], [76, 1], [79, 2], [81, 2]],
];

/**
 * @param file  wav çıktısı
 * @param opts  bpm, energies (her ölçü için 0 sessiz-yumuşak, 1 anlatım altı ritim, 2 dolu ritim, 3 patlama), seed, transpose
 * @returns saniye cinsinden süre
 */
export function compose(file, { bpm, energies, seed = 1, transpose = 0, tail = 2.5 }) {
  const beat = 60 / bpm; const bar = beat * 4;
  const seconds = energies.length * bar + tail;
  const n = Math.ceil(seconds * RATE);
  const rnd = rng(seed);
  const T = (m) => m + transpose;
  const [kL, kR] = bus(n); const [dL, dR] = bus(n); const [pL, pR] = bus(n); const [aL, aR] = bus(n);
  const [lL, lR] = bus(n); const [bL, bR] = bus(n); const [fL, fR] = bus(n);
  const motif = MOTIFS[seed % MOTIFS.length];
  const kicks = [];

  const at = (s) => Math.floor(s * RATE);
  const kick = (t0, vel) => {
    kicks.push(t0);
    let ph = 0; const s = at(t0); const len = Math.min(n - s, at(0.5));
    for (let i = 0; i < len; i += 1) {
      const t = i / RATE; const f = 44 + 120 * Math.exp(-t * 30);
      ph += (2 * Math.PI * f) / RATE;
      const v = (Math.sin(ph) * Math.exp(-t * 6.5) + (rnd() - 0.5) * Math.exp(-t * 400) * 0.6) * vel;
      kL[s + i] += v; kR[s + i] += v;
    }
  };
  const noiseHit = (L, R, t0, { len, decay, type, f, q = 0.8, vel, pan = 0.5, tone = 0, toneDecay = 30 }) => {
    const flt = new Biquad(type, f, q); const s = at(t0); const m = Math.min(n - s, at(len));
    for (let i = 0; i < m; i += 1) {
      const t = i / RATE;
      let v = flt.run(rnd() * 2 - 1) * Math.exp(-t * decay);
      if (tone) v += Math.sin(2 * Math.PI * tone * t) * Math.exp(-t * toneDecay) * 0.6;
      v *= vel; L[s + i] += v * (1 - pan); R[s + i] += v * pan;
    }
  };
  const clap = (t0, vel) => {
    for (const [d, g] of [[0, 0.8], [0.011, 0.7], [0.023, 1]]) noiseHit(dL, dR, t0 + d, { len: d === 0.023 ? 0.35 : 0.02, decay: d === 0.023 ? 16 : 160, type: 'bp', f: 1400, q: 0.9, vel: vel * g, pan: 0.5 });
  };
  const snare = (t0, vel) => noiseHit(dL, dR, t0, { len: 0.2, decay: 26, type: 'bp', f: 2200, q: 0.7, vel, pan: 0.5, tone: 190, toneDecay: 40 });
  const hat = (t0, open, vel, pan) => noiseHit(dL, dR, t0, { len: open ? 0.3 : 0.05, decay: open ? 13 : 75, type: 'hp', f: 7600, q: 0.7, vel, pan });

  const saw = (L, R, t0, len, midi, { vel, voices = 1, detune = 0.18, attack = 0.01, release = 0.12, decay = 0, spread = 0.7 }) => {
    const s = at(t0); const m = Math.min(n - s, at(len + release));
    for (let v = 0; v < voices; v += 1) {
      const off = voices === 1 ? 0 : (v / (voices - 1) - 0.5) * 2 * detune;
      const f = hz(midi + off); const dt = f / RATE; let ph = rnd();
      const pan = voices === 1 ? 0.5 : 0.5 + (v / (voices - 1) - 0.5) * spread;
      const g = vel / Math.sqrt(voices);
      for (let i = 0; i < m; i += 1) {
        const t = i / RATE;
        const env = Math.min(1, t / attack) * (decay ? Math.exp(-t * decay) : 1) * (t > len ? Math.max(0, 1 - (t - len) / release) : 1);
        const x = (2 * ph - 1 - blep(ph, dt)) * env * g;
        ph += dt; if (ph >= 1) ph -= 1;
        L[s + i] += x * (1 - pan); R[s + i] += x * pan;
      }
    }
  };
  const sine = (L, R, t0, len, f0, f1, vel, decay = 0, attack = 0.005) => {
    const s = at(t0); const m = Math.min(n - s, at(len)); let ph = 0;
    for (let i = 0; i < m; i += 1) {
      const t = i / RATE; const f = f0 + (f1 - f0) * (t / len);
      ph += (2 * Math.PI * f) / RATE;
      const v = Math.sin(ph) * vel * Math.min(1, t / attack) * (decay ? Math.exp(-t * decay) : Math.min(1, (len - t) / 0.05));
      L[s + i] += v; R[s + i] += v;
    }
  };
  const riser = (t0, len) => {
    const flt = new Biquad('bp', 300, 1.2); const s = at(t0); const m = Math.min(n - s, at(len));
    for (let i = 0; i < m; i += 1) {
      const p = i / m; if (i % 64 === 0) flt.set(300 * 2 ** (p * 5), 1.4);
      const v = flt.run(rnd() * 2 - 1) * p * p * 0.9;
      fL[s + i] += v * (0.5 + 0.4 * Math.sin(p * 40)); fR[s + i] += v * (0.5 - 0.4 * Math.sin(p * 40));
    }
    sine(fL, fR, t0, len, 180, 900, 0.06, 0, len * 0.9);
  };
  const impact = (t0) => {
    sine(fL, fR, t0, 1.6, 70, 32, 0.75, 2.6);
    noiseHit(fL, fR, t0, { len: 2.2, decay: 2.2, type: 'hp', f: 2800, vel: 0.32, pan: 0.5 });
  };

  energies.forEach((e, b) => {
    const t0 = b * bar; const ci = b % 4; const chord = CHORDS[ci].map(T); const root = T(ROOTS[ci]);
    const next = energies[b + 1] ?? 0; const prev = energies[b - 1] ?? 0;
    const build = next === 3 && e < 3;
    // Akor katmanı: patlamada geniş ve parlak, anlatım altında yumuşak.
    chord.forEach((m) => saw(pL, pR, t0, bar, m, { vel: [0.16, 0.1, 0.17, 0.24][e], voices: e >= 2 ? 7 : 5, detune: e === 3 ? 0.22 : 0.14, attack: e === 0 ? 0.6 : 0.015, release: 0.25 }));
    if (e === 3) saw(pL, pR, t0, bar, chord[0] - 12, { vel: 0.1, voices: 5 });
    // Arpej
    if (e >= 1) {
      const order = [0, 1, 2, 3, 2, 1, 3, 2];
      for (let k = 0; k < 16; k += 1) {
        if (e === 1 && k % 2) continue;
        saw(aL, aR, t0 + (k * beat) / 4, beat / 4, chord[order[k % 8]] + 12, { vel: e === 1 ? 0.2 : 0.17, voices: 2, detune: 0.06, decay: 11, release: 0.05, spread: 0.9 });
      }
    }
    // Davul
    if (e >= 1 && !(build && e < 2)) {
      for (let k = 0; k < 4; k += 1) {
        if (build && k >= 2 && e < 3) break;
        kick(t0 + k * beat, e === 1 ? 0.6 : 0.95);
        if (k % 2) clap(t0 + k * beat, e === 1 ? 0.3 : 0.62);
        hat(t0 + (k + 0.5) * beat, e >= 2, e >= 2 ? 0.2 : 0.1, 0.62);
        if (e >= 2) { hat(t0 + (k + 0.25) * beat, false, 0.08, 0.35); hat(t0 + (k + 0.75) * beat, false, 0.1, 0.4); }
      }
    }
    if (e === 0 && b > 0 && prev >= 2) impact(t0);
    // Bas
    if (e >= 1) sine(bL, bR, t0, bar, hz(root), hz(root), e === 1 ? 0.14 : 0.22);
    if (e >= 2) for (let k = 0; k < 4; k += 1) saw(bL, bR, t0 + (k + 0.5) * beat, beat * 0.42, root + 12, { vel: 0.28, voices: 3, detune: 0.08, decay: 5, release: 0.04 });
    // Melodi: her ölçü 8 sekizlik, dört ölçüde bir motif.
    if (e === 3) {
      const start = (b % 4) * 8; let acc = 0;
      for (const [m, d] of motif) {
        if (acc >= start && acc < start + 8) saw(lL, lR, t0 + ((acc - start) * beat) / 2, ((d * beat) / 2) * 0.9, T(m), { vel: 0.2, voices: 3, detune: 0.07, decay: 1.6, release: 0.08 });
        acc += d;
      }
    }
    // Yükselme ve davul kreşendosu
    if (build) {
      riser(t0, bar);
      for (let k = 0; k < 16; k += 1) snare(t0 + (k * beat) / 4, 0.12 + (k / 16) * 0.42);
      for (let k = 0; k < 4; k += 1) snare(t0 + 3 * beat + (k * beat) / 4 + beat / 8, 0.5);
    }
    if (e === 3 && prev < 3) impact(t0);
  });
  // Bitiş vuruşu ve kuyruk
  impact(energies.length * bar);
  CHORDS[0].map(T).forEach((m) => saw(pL, pR, energies.length * bar, tail - 0.4, m, { vel: 0.16, voices: 5, attack: 0.01, release: 0.4 }));

  // Bus işlemleri: filtre, sidechain, gecikme, yankı
  kicks.sort((a, b) => a - b);
  const pump = new Float32Array(n).fill(1);
  for (const k of kicks) { const s = at(k); for (let i = 0; i < at(0.32) && s + i < n; i += 1) pump[s + i] = Math.min(pump[s + i], 0.18 + 0.82 * Math.min(1, ((i / RATE) / 0.3) ** 1.6)); }
  const lpPad = [new Biquad('lp', 1000, 0.8), new Biquad('lp', 1000, 0.8)];
  const lpArp = [new Biquad('lp', 2400, 0.9), new Biquad('lp', 2400, 0.9)];
  const lpBass = [new Biquad('lp', 900, 0.8), new Biquad('lp', 900, 0.8)];
  const lpLead = [new Biquad('lp', 5200, 0.7), new Biquad('lp', 5200, 0.7)];
  const hpPad = [new Biquad('hp', 140), new Biquad('hp', 140)];
  const cutoff = (i) => {
    const b = Math.min(energies.length - 1, Math.floor(i / RATE / bar)); const e = energies[b] ?? 0;
    const target = [800, 1500, 2700, 6000][e];
    const build = (energies[b + 1] === 3 && e < 3) ? ((i / RATE) % bar) / bar : 0;
    return target * (1 + build * 2.5);
  };
  const delay = at(beat * 0.75); const dlL = new Float32Array(n); const dlR = new Float32Array(n);
  const send = new Float32Array(n);
  const outL = new Float32Array(n); const outR = new Float32Array(n);
  for (let i = 0; i < n; i += 1) {
    if (i % 128 === 0) { const c = cutoff(i); lpPad[0].set(c); lpPad[1].set(c); lpArp[0].set(Math.min(c * 1.3, 7000)); lpArp[1].set(Math.min(c * 1.3, 7000)); }
    const pad = [hpPad[0].run(lpPad[0].run(pL[i])), hpPad[1].run(lpPad[1].run(pR[i]))];
    const arp = [lpArp[0].run(aL[i]), lpArp[1].run(aR[i])];
    const bas = [lpBass[0].run(bL[i]), lpBass[1].run(bR[i])];
    const lead = [lpLead[0].run(lL[i]), lpLead[1].run(lR[i])];
    // Noktalı sekizlik çapraz gecikme
    const dl = i >= delay ? dlR[i - delay] : 0; const dr = i >= delay ? dlL[i - delay] : 0;
    dlL[i] = lead[0] + dr * 0.42; dlR[i] = lead[1] + dl * 0.42;
    const p = pump[i];
    outL[i] = kL[i] * 0.95 + dL[i] * 0.6 + pad[0] * p * 0.55 + arp[0] * p * 0.5 + bas[0] * (0.35 + 0.65 * p) * 0.9 + lead[0] * 0.5 + dl * 0.22 + fL[i] * 0.55;
    outR[i] = kR[i] * 0.95 + dR[i] * 0.6 + pad[1] * p * 0.55 + arp[1] * p * 0.5 + bas[1] * (0.35 + 0.65 * p) * 0.9 + lead[1] * 0.5 + dr * 0.22 + fR[i] * 0.55;
    send[i] = (pad[0] + pad[1]) * 0.12 * p + (lead[0] + lead[1]) * 0.25 + (dL[i] + dR[i]) * 0.12 + (fL[i] + fR[i]) * 0.2 + (arp[0] + arp[1]) * 0.1;
  }
  // Basit Freeverb yankısı
  const combs = [1557, 1617, 1491, 1422, 1277, 1356, 1188, 1116];
  const allp = [556, 441, 341, 225];
  for (const [ch, spread] of [[outL, 0], [outR, 23]]) {
    const wet = new Float32Array(n);
    for (const d0 of combs) {
      const d = d0 + spread; const buf = new Float32Array(d); let idx = 0; let store = 0;
      for (let i = 0; i < n; i += 1) { const y = buf[idx]; store = y * 0.72 + store * 0.28; buf[idx] = send[i] + store * 0.84; idx = (idx + 1) % d; wet[i] += y; }
    }
    for (const d0 of allp) {
      const d = d0 + spread; const buf = new Float32Array(d); let idx = 0;
      for (let i = 0; i < n; i += 1) { const b = buf[idx]; const y = -wet[i] + b; buf[idx] = wet[i] + b * 0.5; idx = (idx + 1) % d; wet[i] = y; }
    }
    for (let i = 0; i < n; i += 1) ch[i] += wet[i] * 0.045;
  }
  // Yumuşak sınırlama ve normalize
  // Önce en yüksek seviyenin %99,9'u 1'e çekilir, sonra yalnız tepeler yumuşakça sınırlanır.
  const step = 97; const sample = [];
  for (let i = 0; i < n; i += step) sample.push(Math.max(Math.abs(outL[i]), Math.abs(outR[i])));
  sample.sort((a, b) => a - b);
  const ref = sample[Math.floor(sample.length * 0.999)] || 1;
  const soft = (x) => (Math.abs(x) < 0.7 ? x : Math.sign(x) * (0.7 + 0.3 * Math.tanh((Math.abs(x) - 0.7) / 0.3)));
  let peak = 0;
  for (let i = 0; i < n; i += 1) { outL[i] = soft(outL[i] / ref); outR[i] = soft(outR[i] / ref); peak = Math.max(peak, Math.abs(outL[i]), Math.abs(outR[i])); }
  if (process.env.MUZIK_RAPOR) {
    const rms = energies.map((e, b) => { let s = 0; const a = at(b * bar); const z = at(bar); for (let i = a; i < a + z; i += 1) s += outL[i] * outL[i]; return `${e}:${(10 * Math.log10(s / z)).toFixed(1)}`; });
    console.log('ölçü dB', rms.join(' '));
  }
  const fadeIn = at(0.03); const fadeOut = at(1.2);
  const data = Buffer.alloc(n * 4);
  for (let i = 0; i < n; i += 1) {
    const g = (0.93 / peak) * Math.min(1, i / fadeIn) * Math.min(1, (n - i) / fadeOut);
    data.writeInt16LE(Math.round(outL[i] * g * 32767), i * 4); data.writeInt16LE(Math.round(outR[i] * g * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
  return seconds;
}
