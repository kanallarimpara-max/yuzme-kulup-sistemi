// TYF yarış listesinden canlı sonuç sayfası açılanları bulup kaydeder. Biten yarışlar da uygulamada kalır.
import { meetIdsFrom, normalizeMeetUrl, parseMeetPage } from '../src/lib/tyfLinks.ts';
import { firestoreToken } from './push.js';

const LIST_URL = 'https://www.tyf.gov.tr/spor/yuzme/yarismalar.html';
const KNOWN = ['https://canli.tyf.gov.tr/live/2026/1005927/'];
const MAX_PROBES = 20;

const root = (env) => `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;

const startDate = (info) => {
  const m = info.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : '';
};

export const meetRecord = (url, page) => ({ url, title: page.title, info: page.info, startDate: startDate(page.info) });

/** Yarış daha önce kaydedildiyse dokunulmaz; günlük ücretsiz yazma hakkı korunur. */
export async function saveMeet(env, url, page) {
  if (!env.FIREBASE_SERVICE_ACCOUNT || !page.title) return;
  const id = url.match(/\/live\/(\d{4})\/(\d+)\//);
  if (!id) return;
  const row = meetRecord(url, page);
  const fields = Object.fromEntries(Object.entries(row).map(([k, v]) => [k, { stringValue: v }]));
  await fetch(`${root(env)}/tyfMeets?documentId=${id[1]}-${id[2]}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields }),
  });
}

export async function syncMeets(env) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return;
  const year = new Date().getUTCFullYear();
  const listRes = await fetch(LIST_URL);
  if (!listRes.ok) return;
  const candidates = [...KNOWN, ...meetIdsFrom(await listRes.text()).map((id) => `https://canli.tyf.gov.tr/live/${year}/${id}/`)];
  const savedRes = await fetch(`${root(env)}/tyfMeets?pageSize=300&mask.fieldPaths=url`, {
    headers: { Authorization: `Bearer ${await firestoreToken(env)}` },
  });
  const saved = new Set(savedRes.ok ? ((await savedRes.json()).documents ?? []).map((d) => d.fields?.url?.stringValue) : []);
  for (const url of candidates.filter((u) => !saved.has(u) && normalizeMeetUrl(u)).slice(0, MAX_PROBES)) {
    const res = await fetch(url, { redirect: 'error' }).catch(() => null);
    if (res?.ok) await saveMeet(env, url, parseMeetPage(await res.text(), url));
  }
}
