// TYF canlı sonuç yarışlarını dakikada bir arar ve süren yarışların sonuç/start listesi değişikliğini dakikada bir yazar.
// Firestore ücretsiz okuma hakkı korunsun diye kayıtlı yarışların özeti tek bir belgede (tyfIndex/meets) tutulur.
import { meetDates, meetVersion, normalizeMeetUrl, parseMeetPage } from '../src/lib/tyfLinks.ts';
import { firestoreToken } from './push.js';

const LIST_URL = 'https://www.tyf.gov.tr/spor/yuzme/yarismalar.html';
const LIVE = 'https://canli.tyf.gov.tr/live';
// 26.11.2026 taramasında canlı sayfası açık bulunan yarışlar. Kaydedilmemiş olanlar ilk turlarda içeri alınır.
const SEED = [1005445, 1005527, 1005598, 1005599, 1005659, 1005674, 1005675, 1005798, 1005812, 1005816, 1005817, 1005818, 1005819, 1005826, 1005828,
  1005833, 1005842, 1005845, 1005846, 1005860, 1005861, 1005863, 1005864, 1005865, 1005870, 1005871, 1005875, 1005880, 1005881, 1005883, 1005889,
  1005890, 1005891, 1005892, 1005893, 1005894, 1005898, 1005900, 1005901, 1005902, 1005903, 1005904, 1005905, 1005906, 1005907, 1005908, 1005909,
  1005912, 1005914, 1005915, 1005916, 1005921, 1005922, 1005924, 1005927, 1005929, 1005934, 1005935, 1005939, 1005951, 1005954, 1005962, 1005968]
  .map((id) => `${LIVE}/2026/${id}/`);
// Bir turda en fazla bu kadar adres denenir (Cloudflare ücretsiz planda tur başına 50 dış istek sınırı var).
const TAKE = { soon: 4, seed: 6, head: 4, sweep: 2 };
const HEAD_BACK = 30;
const HEAD_AHEAD = 40;
const SWEEP_SPAN = 800;
const MAX_ACTIVE = 8;

const docs = (env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const root = (env) => `https://firestore.googleapis.com/v1/${docs(env)}`;
const headers = async (env) => ({ Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' });
const strings = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { stringValue: v ?? '' }]));
const parts = (url) => url.match(/\/live\/(\d{4})\/(\d+)\//);
const meetId = (url) => {
  const m = parts(url);
  return m ? `${m[1]}-${m[2]}` : null;
};
const indexKey = (url) => {
  const m = parts(url);
  return m ? `y${m[1]}_${m[2]}` : null;
};
/** Yüzlerce liste olabildiği için sürüm kısa bir parmak izi olarak saklanır. */
export const versionOf = (html) => {
  const text = meetVersion(html);
  if (!text) return '';
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return `${text.split(',').length}-${(h >>> 0).toString(36)}`;
};
const trToday = (at) => new Date(at + 3 * 3600000).toISOString().slice(0, 10);
const shiftDays = (iso, days) => new Date(Date.parse(`${iso}T00:00:00Z`) + days * 86400000).toISOString().slice(0, 10);

export const meetRecord = (url, page, html = '') => {
  const { startDate, endDate } = meetDates(page.info);
  return { url, title: page.title, info: page.info, startDate, endDate, version: versionOf(html), updatedAt: new Date().toISOString() };
};

const indexWrite = (env, key, entry, fields) => ({
  update: { name: `${docs(env)}/tyfIndex/meets`, fields: { m: { mapValue: { fields: { [key]: { mapValue: { fields: strings(entry) } } } } } } },
  updateMask: { fieldPaths: fields.map((f) => `m.${key}${f ? `.${f}` : ''}`) },
});

/** Yarış daha önce kaydedildiyse dokunulmaz; özet belgesine de aynı anda eklenir. */
export async function saveMeet(env, url, page, html = '') {
  const id = meetId(url);
  const key = indexKey(url);
  if (!env.FIREBASE_SERVICE_ACCOUNT || !page.title || !id) return false;
  const record = meetRecord(url, page, html);
  const res = await fetch(`${root(env)}:commit`, {
    method: 'POST', headers: await headers(env), body: JSON.stringify({ writes: [
      { update: { name: `${docs(env)}/tyfMeets/${id}`, fields: strings(record) }, currentDocument: { exists: false } },
      indexWrite(env, key, { url, start: record.startDate, end: record.endDate, version: record.version }, ['']),
    ] }),
  });
  return res.ok;
}

/** Özet belgesi yoksa kayıtlı yarışlardan bir kez kurulur. */
async function loadIndex(env) {
  const auth = await headers(env);
  const res = await fetch(`${root(env)}/tyfIndex/meets`, { headers: auth });
  if (res.ok) {
    const fields = (await res.json()).fields?.m?.mapValue?.fields ?? {};
    return Object.entries(fields).map(([key, v]) => {
      const f = v.mapValue?.fields ?? {};
      return { key, url: f.url?.stringValue ?? '', start: f.start?.stringValue ?? '', end: f.end?.stringValue ?? '', version: f.version?.stringValue ?? '' };
    });
  }
  if (res.status !== 404) return null;
  const list = await fetch(`${root(env)}/tyfMeets?pageSize=300`, { headers: auth });
  if (!list.ok) return null;
  const entries = ((await list.json()).documents ?? []).map((d) => {
    const f = d.fields ?? {};
    const url = f.url?.stringValue ?? '';
    return { key: indexKey(url), url, start: f.startDate?.stringValue ?? '', end: f.endDate?.stringValue ?? '', version: f.version?.stringValue ?? '' };
  }).filter((e) => e.key);
  const m = Object.fromEntries(entries.map(({ key, ...e }) => [key, { mapValue: { fields: strings(e) } }]));
  await fetch(`${root(env)}/tyfIndex/meets`, { method: 'PATCH', headers: auth, body: JSON.stringify({ fields: { m: { mapValue: { fields: m } } } }) });
  return entries;
}

/** Yarışmalar sayfasındaki satırlar: yarış numarası ve yanındaki ilk tarih. */
export function listedMeets(html) {
  return [...html.matchAll(/data-section="yarisma_info" data-id="(\d+)"([\s\S]{0,2500}?)(\d{2})\/(\d{2})\/(\d{4})/g)]
    .map((m) => ({ id: Number(m[1]), date: `${m[5]}-${m[4]}-${m[3]}` }));
}

const rotate = (list, n, turn) => {
  if (list.length <= n) return list;
  const start = (turn * n) % list.length;
  return [...list.slice(start), ...list.slice(0, start)].slice(0, n);
};

/**
 * Bu turda denenecek adresler, önem sırasıyla:
 * sayfadaki "Canlı Sonuçlar" bağlantısı, tarihi yaklaşan liste yarışları, ilk taramada bulunanlar,
 * en yeni numaraların çevresi (yeni açılan yarış) ve geriye doğru yavaş tarama (listede hiç görünmeyen yarışlar).
 */
export function meetCandidates({ html, known, at = Date.now() }) {
  const today = trToday(at);
  const year = today.slice(0, 4);
  const turn = Math.floor(at / 60000);
  const url = (id) => `${LIVE}/${year}/${id}/`;
  const fresh = (list) => [...new Set(list)].filter((u) => u && !known.has(u));
  const direct = fresh([...html.matchAll(/https:\/\/canli\.tyf\.gov\.tr\/live\/\d{4}\/\d+\/?/g)].map((m) => normalizeMeetUrl(m[0])));
  const rows = listedMeets(html);
  const soon = fresh(rows.filter((r) => r.date >= shiftDays(today, -5) && r.date <= shiftDays(today, 2)).map((r) => url(r.id)));
  const seed = fresh(SEED);
  const ids = [...rows.map((r) => r.id), ...[...known, ...SEED].map((u) => Number(parts(u)?.[2]))].filter((n) => n > 0);
  const top = Math.max(...ids.filter((n) => n >= Math.max(...ids) - 5000));
  const range = (from, to) => Array.from({ length: Math.max(0, to - from) }, (_, i) => url(from + i + 1));
  // En yeni numaranın hemen ardından gelen üç numara her tur denenir; çevresi sırayla taranır.
  const next = fresh(range(top, top + 3));
  const head = fresh(range(top - HEAD_BACK, top + HEAD_AHEAD)).filter((u) => !next.includes(u));
  const sweep = fresh(range(top - SWEEP_SPAN, top - HEAD_BACK));
  return [...new Set([
    ...direct, ...soon.slice(0, TAKE.soon), ...next, ...seed.slice(0, TAKE.seed), ...rotate(head, TAKE.head, turn), ...rotate(sweep, TAKE.sweep, turn),
  ])];
}

/** Süren yarışlar: bugün başlangıç ile bitiş arasında olanlar. Çoksa her tur sırayla bakılır. */
export function activeMeets(index, at = Date.now()) {
  const today = trToday(at);
  const live = index.filter((e) => e.url && e.start && e.start <= today && (e.end || e.start) >= today);
  return rotate(live, MAX_ACTIVE, Math.floor(at / 60000));
}

/** Yalnız sonuç ya da start listesi değişince yazar; ekranlar bu değişikliği anında alır. */
async function refreshActive(env, index, at) {
  for (const entry of activeMeets(index, at)) {
    if (!normalizeMeetUrl(entry.url)) continue;
    const res = await fetch(entry.url, { redirect: 'manual', cf: { cacheTtl: 0 } }).catch(() => null);
    if (!res?.ok) continue;
    const version = versionOf(await res.text());
    if (version === entry.version) continue;
    const updatedAt = new Date().toISOString();
    await fetch(`${root(env)}:commit`, {
      method: 'POST', headers: await headers(env), body: JSON.stringify({ writes: [
        { update: { name: `${docs(env)}/tyfMeets/${meetId(entry.url)}`, fields: strings({ version, updatedAt }) }, updateMask: { fieldPaths: ['version', 'updatedAt'] } },
        indexWrite(env, entry.key, { version }, ['version']),
      ] }),
    });
  }
}

async function discover(env, index, at) {
  const listRes = await fetch(LIST_URL).catch(() => null);
  const html = listRes?.ok ? await listRes.text() : '';
  const known = new Set(index.map((e) => e.url));
  for (const url of meetCandidates({ html, known, at })) {
    const res = await fetch(url, { redirect: 'manual' }).catch(() => null);
    if (!res?.ok) continue;
    const page = await res.text();
    await saveMeet(env, url, parseMeetPage(page, url), page);
  }
}

export async function syncMeets(env, at = Date.now()) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return;
  const index = await loadIndex(env).catch(() => null);
  if (!index) return;
  await refreshActive(env, index, at).catch(() => undefined);
  await discover(env, index, at).catch(() => undefined);
}
