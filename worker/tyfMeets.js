// Yeni TYF yarışlarını 30 dakikada bir arar, devam eden yarışları dakikada bir kontrol eder.
import { meetDates, meetIdsFrom, meetVersion, normalizeMeetUrl, parseMeetPage } from '../src/lib/tyfLinks.ts';
import { firestoreToken } from './push.js';

const LIST_URL = 'https://www.tyf.gov.tr/spor/yuzme/yarismalar.html';
const KNOWN = ['https://canli.tyf.gov.tr/live/2026/1005927/'];
const MAX_PROBES = 20;
const MAX_ACTIVE = 6;

const root = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const headers = async (env) => ({ Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' });
const strings = (row) => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { stringValue: v }]));
const meetId = (url) => {
  const m = url.match(/\/live\/(\d{4})\/(\d+)\//);
  return m ? `${m[1]}-${m[2]}` : null;
};

export const meetRecord = (url, page, html = '') => {
  const { startDate, endDate } = meetDates(page.info);
  return { url, title: page.title, info: page.info, startDate, endDate, version: meetVersion(html), updatedAt: new Date().toISOString() };
};

/** Yarış daha önce kaydedildiyse dokunulmaz; günlük ücretsiz yazma hakkı korunur. */
export async function saveMeet(env, url, page, html = '') {
  const id = meetId(url);
  if (!env.FIREBASE_SERVICE_ACCOUNT || !page.title || !id) return;
  await fetch(`${root(env)}/tyfMeets?documentId=${id}`, {
    method: 'POST', headers: await headers(env), body: JSON.stringify({ fields: strings(meetRecord(url, page, html)) }),
  });
}

/**
 * Denenecek yarış adresleri. Sayfadaki doğrudan canlı sonuç bağlantıları (o an süren yarış) önce gelir.
 * Canlı sayfası henüz açılmamış yarışlar her turda başta kalıp sırayı tıkamasın diye kalanlar her turda kaydırılır.
 */
export function meetCandidates(html, year, saved, at = Date.now()) {
  const direct = [...html.matchAll(/https:\/\/canli\.tyf\.gov\.tr\/live\/\d{4}\/\d+\/?/g)].map((m) => normalizeMeetUrl(m[0]));
  const listed = meetIdsFrom(html).map((id) => `https://canli.tyf.gov.tr/live/${year}/${id}/`);
  const fresh = (list) => [...new Set(list)].filter((u) => u && !saved.has(u));
  const first = fresh([...direct, ...KNOWN]);
  const rest = fresh(listed).filter((u) => !first.includes(u));
  const shift = rest.length ? (Math.floor(at / 1800000) * MAX_PROBES) % rest.length : 0;
  return [...first, ...rest.slice(shift), ...rest.slice(0, shift)].slice(0, MAX_PROBES);
}

async function discover(env, at) {
  const year = new Date(at).getUTCFullYear();
  const listRes = await fetch(LIST_URL);
  if (!listRes.ok) return;
  const html = await listRes.text();
  const savedRes = await fetch(`${root(env)}/tyfMeets?pageSize=300&mask.fieldPaths=url`, { headers: await headers(env) });
  const saved = new Set(savedRes.ok ? ((await savedRes.json()).documents ?? []).map((d) => d.fields?.url?.stringValue) : []);
  for (const url of meetCandidates(html, year, saved, at)) {
    const res = await fetch(url, { redirect: 'manual' }).catch(() => null);
    if (res?.ok) {
      const page = await res.text();
      await saveMeet(env, url, parseMeetPage(page, url), page);
    }
  }
}

/** Yalnız sonuç listesi değişince yazar; ekranlar bu değişikliği anında alır. */
async function refreshActive(env) {
  const today = new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 10);
  const auth = await headers(env);
  const query = await fetch(`${root(env)}:runQuery`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'tyfMeets' }],
      where: { fieldFilter: { field: { fieldPath: 'endDate' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: today } } },
      orderBy: [{ field: { fieldPath: 'endDate' }, direction: 'ASCENDING' }],
      limit: 30,
    } }),
  });
  if (!query.ok) return;
  const active = (await query.json()).filter((r) => r.document && (r.document.fields?.startDate?.stringValue ?? '') <= today).slice(0, MAX_ACTIVE);
  for (const { document } of active) {
    const url = document.fields?.url?.stringValue;
    if (!normalizeMeetUrl(url ?? '')) continue;
    const res = await fetch(url, { redirect: 'manual', cf: { cacheTtl: 0 } }).catch(() => null);
    if (!res?.ok) continue;
    const version = meetVersion(await res.text());
    if (version === document.fields?.version?.stringValue) continue;
    await fetch(`https://firestore.googleapis.com/v1/${document.name}?updateMask.fieldPaths=version&updateMask.fieldPaths=updatedAt`, {
      method: 'PATCH', headers: auth, body: JSON.stringify({ fields: strings({ version, updatedAt: new Date().toISOString() }) }),
    });
  }
}

export async function syncMeets(env, at = Date.now()) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return;
  if (new Date(at).getUTCMinutes() % 30 === 0) await discover(env, at).catch(() => undefined);
  await refreshActive(env);
}
