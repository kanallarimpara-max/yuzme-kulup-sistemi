// GitHub'daki günlük baraj işi sonucu buraya gönderir. Kimlik GitHub'ın imzalı kısa ömürlü belgesidir, saklanan anahtar yoktur.
import { validPacked } from '../src/lib/standardSet.ts';
import { firestoreToken } from './push.js';

const ISSUER = 'https://token.actions.githubusercontent.com';
const AUDIENCE = 'yuzme-kulup-worker';
const MAX_PAYLOAD = 900_000;

const bytes = (text) => Uint8Array.from(atob(text.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(text.length / 4) * 4, '=')), (c) => c.charCodeAt(0));
const part = (text) => JSON.parse(new TextDecoder().decode(bytes(text)));

/** Yalnız bu depodaki, ana daldaki belirtilen iş dosyasının imzalı kimliği kabul edilir. */
export async function verifyGithub(request, env, workflowFile = 'barajlar.yml') {
  const token = request.headers.get('Authorization')?.match(/^Bearer (.+)$/)?.[1];
  if (!token || !env.GITHUB_REPOSITORY) return false;
  try {
    const [rawHeader, rawPayload, rawSignature] = token.split('.');
    const header = part(rawHeader);
    const claims = part(rawPayload);
    const now = Math.floor(Date.now() / 1000);
    const workflow = `${env.GITHUB_REPOSITORY}/.github/workflows/${workflowFile}@refs/heads/main`;
    if (header.alg !== 'RS256' || claims.iss !== ISSUER || claims.aud !== AUDIENCE || claims.repository !== env.GITHUB_REPOSITORY
      || claims.ref !== 'refs/heads/main' || claims.workflow_ref !== workflow || claims.exp <= now || (claims.nbf ?? 0) > now + 60) return false;
    const keys = await (await fetch(`${ISSUER}/.well-known/jwks`, { cf: { cacheTtl: 3600 } })).json();
    const jwk = keys.keys?.find((k) => k.kid === header.kid);
    if (!jwk) return false;
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, bytes(rawSignature), new TextEncoder().encode(`${rawHeader}.${rawPayload}`));
  } catch {
    return false;
  }
}

const sha256 = async (text) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map((b) => b.toString(16).padStart(2, '0')).join('');

export async function handleStandards(request, env, json) {
  if (!(await verifyGithub(request, env))) return json({ error: 'Yetkisiz.' }, 401);
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Servis ayarlanmadı.' }, 503);
  const body = await request.json().catch(() => null);
  if (!validPacked(body?.packed) || typeof body?.season !== 'string' || !/^\d{4}-\d{4}$/.test(body.season)
    || typeof body?.source !== 'string' || !body.source.startsWith('https://www.tyf.gov.tr/')) return json({ error: 'Baraj verisi geçersiz.' }, 400);
  const payload = JSON.stringify(body.packed);
  if (payload.length > MAX_PAYLOAD) return json({ error: 'Baraj verisi çok büyük.' }, 413);

  const url = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/standardSets/current`;
  const auth = { Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' };
  const hash = await sha256(payload);
  const existing = await fetch(`${url}?mask.fieldPaths=hash`, { headers: auth });
  const changed = !existing.ok || (await existing.json()).fields?.hash?.stringValue !== hash;
  const now = new Date().toISOString();
  const fields = changed
    ? { season: body.season, source: body.source, payload, hash, checkedAt: now, changedAt: now }
    : { checkedAt: now };
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&');
  const saved = await fetch(`${url}?${mask}`, {
    method: 'PATCH', headers: auth,
    body: JSON.stringify({ fields: Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, { stringValue: v }])) }),
  });
  if (!saved.ok) return json({ error: 'Barajlar kaydedilemedi.' }, 502);
  return json({ changed, count: body.packed.rows.length });
}
