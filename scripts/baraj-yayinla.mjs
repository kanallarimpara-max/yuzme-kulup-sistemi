// GitHub'daki günlük işte çalışır: okunan barajları denetleyip Worker'a gönderir. Anahtar kullanmaz.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { packStandards, validPacked } from '../src/lib/standardSet.ts';

const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenKey, WORKER_URL: worker } = process.env;
if (!tokenUrl || !tokenKey || !worker) throw new Error('GitHub kimliği veya Worker adresi yok.');

const next = JSON.parse(readFileSync('src/data/standards.json', 'utf8'));
const before = JSON.parse(execFileSync('git', ['show', 'HEAD:src/data/standards.json'], { encoding: 'utf8', maxBuffer: 20_000_000 }));
if (next.standards.length < before.standards.length * 0.5) throw new Error(`Baraj sayısı şüpheli düştü: ${before.standards.length} -> ${next.standards.length}`);
const packed = packStandards(next.standards);
if (!validPacked(packed)) throw new Error('Okunan baraj verisi geçersiz.');

const id = await (await fetch(`${tokenUrl}&audience=yuzme-kulup-worker`, { headers: { Authorization: `Bearer ${tokenKey}` } })).json();
const res = await fetch(`${worker.replace(/\/$/, '')}/standards/publish`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${id.value}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ season: next.season, source: next.source, packed }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok) throw new Error(`Yayın başarısız: ${res.status} ${body.error ?? ''}`);
console.log(body.changed ? `Barajlar güncellendi: ${body.count}` : `Değişiklik yok: ${body.count}`);
