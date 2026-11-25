// GitHub'daki baraj işi TYF faaliyet takvimini buraya gönderir. Takvim tek belgede tutulur, uygulama tek okumayla alır.
import { validCalendar } from '../src/lib/tyfCalendar.ts';
import { firestoreToken } from './push.js';
import { verifyGithub } from './standards.js';

const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function handleCalendar(request, env, json) {
  if (!(await verifyGithub(request, env, 'barajlar.yml'))) return json({ error: 'Yetkisiz.' }, 401);
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Servis ayarlanmadı.' }, 503);
  const body = await request.json().catch(() => null);
  if (!validCalendar(body?.events) || typeof body?.season !== 'string' || !/^\d{4}-\d{4}$/.test(body.season)
    || typeof body?.source !== 'string' || !body.source.startsWith('https://dosya.tyf.gov.tr/')) return json({ error: 'Takvim verisi geçersiz.' }, 400);
  const payload = JSON.stringify(body.events);
  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/tyfCalendar/current`;
  const auth = { Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' };
  const hash = await sha256(payload);
  const existing = await fetch(`${url}?mask.fieldPaths=hash`, { headers: auth });
  const changed = !existing.ok || (await existing.json()).fields?.hash?.stringValue !== hash;
  const now = new Date().toISOString();
  const fields = changed ? { season: body.season, source: body.source, payload, hash, checkedAt: now, changedAt: now } : { checkedAt: now };
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const saved = await fetch(`${url}?${mask}`, {
    method: 'PATCH', headers: auth,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])) }),
  });
  if (!saved.ok) return json({ error: 'Takvim kaydedilemedi.' }, 502);
  return json({ changed, count: body.events.length });
}
