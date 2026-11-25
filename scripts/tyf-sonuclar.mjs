// GitHub'daki günlük işte çalışır: TYF "Yüzme / Sonuçlar" sayfasındaki yeni toplu sonuç PDF'lerini okur,
// kulüplerin sporcularıyla eşleşen yarış derecelerini Worker üzerinden kaydeder. Anahtar kullanmaz, kişisel veri yazdırmaz.
// Yerel deneme (hiçbir şey yazmaz): node scripts/tyf-sonuclar.mjs --dosya sonuc.pdf
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { RESULT_LIST_URL, matchTopluEvents, parseResultList, parseTopluPages, poolFor } from '../src/lib/tyfToplu.ts';

const require = createRequire(import.meta.url);
const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);

const MAX_FILES = Number(process.env.MAX_DOSYA ?? 40);
const MAX_BYTES = 40_000_000;
const MONTHS_BACK = 12;
const CHUNK = 200;

async function pagesOf(data) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(data), verbosity: 0, isEvalSupported: false }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.flatMap((i) => ('str' in i ? [{ x: i.transform[4], y: i.transform[5], text: i.str }] : [])));
  }
  await doc.cleanup?.();
  return pages;
}

const local = process.argv.indexOf('--dosya');
if (local > 0) {
  const events = parseTopluPages(await pagesOf(readFileSync(process.argv[local + 1])));
  const rows = events.reduce((n, e) => n + e.rows.length, 0);
  const timed = events.reduce((n, e) => n + e.rows.filter((r) => r.timeMs).length, 0);
  console.log(`${events.length} bireysel yarış, ${rows} sporcu satırı, ${timed} derece`);
  process.exit(0);
}

const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenKey, WORKER_URL: worker } = process.env;
if (!tokenUrl || !tokenKey || !worker) throw new Error('GitHub kimliği veya Worker adresi yok.');
const id = await (await fetch(`${tokenUrl}&audience=yuzme-kulup-worker`, { headers: { Authorization: `Bearer ${tokenKey}` } })).json();
const call = async (path, body) => {
  const res = await fetch(`${worker.replace(/\/$/, '')}${path}`, {
    method: 'POST', headers: { Authorization: `Bearer ${id.value}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`${path} başarısız: ${res.status} ${json.error ?? ''}`);
  return json;
};

const state = await call('/results/athletes', {});
const done = new Map(state.done.map((f) => [f.id, f]));
// Sporcu veya kulüp listesi değişirse eski dosyalar yeniden taranır; yeni kayıt olan sporcunun geçmiş dereceleri de gelir.
const sig = createHash('sha256').update(JSON.stringify([
  state.clubs.map((c) => [c.id, c.name]).sort(),
  state.athletes.map((a) => [a.id, a.clubId, a.firstName, a.lastName, a.birthYear, a.gender]).sort(),
])).digest('hex');
const clubNames = Object.fromEntries(state.clubs.map((c) => [c.id, c.name]));
console.log(`${state.clubs.length} kulüp, ${state.athletes.length} sporcu, daha önce işlenen ${done.size} dosya`);

const listRes = await fetch(RESULT_LIST_URL);
if (!listRes.ok) throw new Error(`Sonuç sayfası açılamadı: ${listRes.status}`);
const since = new Date();
since.setMonth(since.getMonth() - MONTHS_BACK);
const sinceMonth = since.toISOString().slice(0, 7);
const files = parseResultList(await listRes.text()).filter((f) => f.month >= sinceMonth && !done.get(f.id)?.unreadable && done.get(f.id)?.sig !== sig).slice(0, MAX_FILES);
console.log(`Taranacak dosya: ${files.length}`);

for (const file of files) {
  let results = [];
  let note = '';
  let unreadable = false;
  // İndirme hatası geçici olabilir: dosya işaretlenmez, ertesi gün yeniden denenir.
  const res = await fetch(file.url).catch(() => null);
  if (!res?.ok) {
    console.log(`${file.title.slice(0, 80)}: indirilemedi, yarın yeniden denenecek`);
    continue;
  }
  try {
    if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('dosya çok büyük');
    const events = parseTopluPages(await pagesOf(await res.arrayBuffer()));
    const pool = poolFor(file.title, events.map((e) => e.date), state.meets ?? []);
    results = state.athletes.length ? matchTopluEvents(events, state.athletes, clubNames, file.title.slice(0, 200), pool) : [];
    unreadable = events.length === 0;
    note = `${events.length} yarış, ${results.length} eşleşen derece${pool ? `, ${pool} havuz` : ', havuz boyu bilinmiyor'}`;
  } catch (error) {
    // Taranmış görüntü, bozuk veya çok büyük dosya her gün yeniden denenmesin diye okunamadı olarak işaretlenir.
    unreadable = true;
    note = `okunamadı: ${error.message}`;
  }
  for (let i = 0; i < results.length || i === 0; i += CHUNK) {
    const last = i + CHUNK >= results.length;
    const saved = await call('/results/publish', { file: { id: file.id, url: file.url, title: file.title.slice(0, 300), sig, unreadable }, results: results.slice(i, i + CHUNK), last });
    if (last) console.log(`${file.title.slice(0, 80)}: ${note}, yazılan ${saved.written ?? 0}`);
  }
}
