// Worker'ı Cloudflare hesabı olmadan, ağ çağrılarını taklit ederek dener: npm run test:worker
import assert from 'node:assert/strict';
import worker from './index.js';

const PROJECT = 'test-projesi';
const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid: 'k1' };
const enc = (v) => Buffer.from(typeof v === 'string' ? v : JSON.stringify(v)).toString('base64url');
const now = Math.floor(Date.now() / 1000);
const good = { aud: PROJECT, iss: `https://securetoken.google.com/${PROJECT}`, sub: 'u1', iat: now - 10, exp: now + 600 };
async function token(payload = good, key = pair.privateKey, header = { alg: 'RS256', kid: 'k1' }) {
  const head = `${enc(header)}.${enc(payload)}`;
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(head));
  return `${head}.${Buffer.from(sig).toString('base64url')}`;
}

const page = 'https://canli.tyf.gov.tr/live/2026/1005927/';
const requested = [];
globalThis.fetch = async (url) => {
  const target = String(url);
  requested.push(target);
  if (target.includes('googleapis.com')) return Response.json({ keys: [jwk] });
  if (target === page) return new Response('<a href="StartList_1.pdf">b</a><a href="ResultList_7.pdf?v=2">s</a>');
  if (target === `${page}ResultList_7.pdf?v=2`) return new Response(new Uint8Array([37, 80, 68, 70]));
  throw new Error(`beklenmeyen istek: ${target}`);
};

let aiInput;
const env = { FIREBASE_PROJECT_ID: PROJECT, AI: { run: async (_model, input) => { aiInput = input; return { response: ' Tavsiye ' }; } } };
const call = async (path, t, init = {}) => worker.fetch(new Request(`https://w.test${path}`, { ...init, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' } }), env);
const meetPath = `/tyf/meet?url=${encodeURIComponent(page)}`;
const valid = await token();

const checks = [
  ['oturumsuz istek reddedilir', async () => assert.equal((await call(meetPath)).status, 401)],
  ['süresi dolmuş token reddedilir', async () => assert.equal((await call(meetPath, await token({ ...good, exp: now - 1 }))).status, 401)],
  ['başka proje tokenı reddedilir', async () => assert.equal((await call(meetPath, await token({ ...good, aud: 'baska' }))).status, 401)],
  ['sahte imza reddedilir', async () => assert.equal((await call(meetPath, await token(good, other.privateKey))).status, 401)],
  ['imzasız token reddedilir', async () => assert.equal((await call(meetPath, `${enc({ alg: 'none', kid: 'k1' })}.${enc(good)}.`)).status, 401)],
  ['yarış PDF listesi gelir', async () => assert.deepEqual(await (await call(meetPath, valid)).json(), { links: [`${page}ResultList_7.pdf?v=2`] })],
  ['başka site çekilemez', async () => {
    const before = requested.length;
    assert.equal((await call(`/tyf/meet?url=${encodeURIComponent('https://evil.test/live/2026/1/')}`, valid)).status, 400);
    assert.ok(!requested.slice(before).some((u) => u.includes('evil.test')));
  }],
  ['başka PDF çekilemez', async () => assert.equal((await call(`/tyf/pdf?url=${encodeURIComponent('https://evil.test/live/2026/1/ResultList_1.pdf')}`, valid)).status, 400)],
  ['sonuç PDF indirilir', async () => {
    const res = await call(`/tyf/pdf?url=${encodeURIComponent(`${page}ResultList_7.pdf?v=2`)}`, valid);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('Content-Type'), 'application/pdf');
  }],
  ['AI analizi döner', async () => {
    const res = await call('/ai/analyze', valid, { method: 'POST', body: JSON.stringify({ summary: { age: 12, trends: [] } }) });
    assert.deepEqual(await res.json(), { text: 'Tavsiye' });
    assert.ok(aiInput.messages[1].content.includes('"age":12'));
  }],
  ['aşırı büyük AI verisi reddedilir', async () => assert.equal((await call('/ai/analyze', valid, { method: 'POST', body: JSON.stringify({ summary: 'x'.repeat(5000) }) })).status, 400)],
];

let failed = 0;
for (const [label, run] of checks) {
  try {
    await run();
    console.log(`GEÇTİ  ${label}`);
  } catch (error) {
    failed += 1;
    console.log(`KALDI  ${label}: ${error.message}`);
  }
}
console.log(`\n${checks.length - failed}/${checks.length} Worker testi geçti.`);
process.exit(failed ? 1 : 0);
