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
const FS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`;
const str = (v) => ({ stringValue: v });
const list = (a) => ({ arrayValue: { values: a.map(str) } });
const fresh = { integerValue: String(Date.now()) };
const firestore = {
  'notices/n1': { senderId: str('u1'), kind: str('duyuru'), createdAt: fresh, recipientIds: list(['u1', 'p1', 'p2']), title: str('GIZLI BASLIK'), body: str('GIZLI ICERIK') },
  'notices/baskasi': { senderId: str('u9'), createdAt: fresh, recipientIds: list(['p1']) },
  'notices/eski': { senderId: str('u1'), createdAt: { integerValue: String(Date.now() - 3600000) }, recipientIds: list(['p1']) },
  'notices/buyuk': { senderId: str('u1'), createdAt: fresh, recipientIds: list(Array.from({ length: 45 }, (_, i) => `k${String(i).padStart(2, '0')}`)) },
  'messages/m1': { senderId: str('u1'), createdAt: fresh, memberIds: list(['u1', 'p1']), text: str('GIZLI MESAJ') },
};
const logs = new Map();
const sent = [];
const removed = [];
let logVersion = 0;
const devices = () => ['p1', 'p2', ...Array.from({ length: 45 }, (_, i) => `k${String(i).padStart(2, '0')}`)].map((uid) => ({ uid, token: uid === 'p2' ? 'olu-token' : `tok-${uid}`, platform: uid === 'p1' ? 'android' : 'web' }));
async function googleApis(target, init = {}) {
  if (target === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'erisim', expires_in: 3600 });
  if (target.includes('fcm.googleapis.com')) {
    const { message } = JSON.parse(init.body);
    sent.push(message);
    return message.token === 'olu-token' ? new Response('{}', { status: 404 }) : Response.json({ name: 'ok' });
  }
  if (target === `${FS}:runQuery`) {
    const q = JSON.parse(init.body).structuredQuery;
    const wanted = q.where.fieldFilter.value.arrayValue.values.map((v) => v.stringValue);
    return Response.json(devices().filter((d) => wanted.includes(d.uid)).map((d) => ({ document: { name: `projects/x/databases/(default)/documents/pushTokens/${d.uid}`, fields: { uid: str(d.uid), token: str(d.token), platform: str(d.platform) } } })));
  }
  if (target.startsWith(`${FS}/pushLog?documentId=`)) {
    const id = new URL(target).searchParams.get('documentId');
    if (logs.has(id)) return new Response('{}', { status: 409 });
    logs.set(id, { next: 0, updateTime: `v${++logVersion}` });
    return Response.json({ fields: { next: { integerValue: '0' } }, updateTime: logs.get(id).updateTime });
  }
  if (target.startsWith(`${FS}/pushLog/`)) {
    const parsed = new URL(target);
    const id = decodeURIComponent(parsed.pathname.split('/').pop());
    if (init.method === 'PATCH') {
      if (parsed.searchParams.get('currentDocument.updateTime') !== logs.get(id)?.updateTime) return new Response('{}', { status: 400 });
      logs.set(id, { next: Number(JSON.parse(init.body).fields.next.integerValue), updateTime: `v${++logVersion}` });
      return Response.json({});
    }
    const row = logs.get(id);
    return row ? Response.json({ fields: { next: { integerValue: String(row.next) } }, updateTime: row.updateTime }) : new Response('{}', { status: 404 });
  }
  if (init.method === 'DELETE') {
    removed.push(target);
    return Response.json({});
  }
  if (target.startsWith(`${FS}/`)) {
    const row = firestore[target.slice(FS.length + 1)];
    return row ? Response.json({ fields: row }) : new Response('{}', { status: 404 });
  }
  return null;
}

globalThis.fetch = async (url, init) => {
  const target = String(url);
  requested.push(target);
  const google = await googleApis(target, init);
  if (google) return google;
  if (target.includes('googleapis.com')) return Response.json({ keys: [jwk] });
  if (target === page) return new Response('<a href="StartList_1.pdf">b</a><a href="ResultList_7.pdf?v=2">s</a>');
  if (target === `${page}ResultList_7.pdf?v=2`) return new Response(new Uint8Array([37, 80, 68, 70]));
  throw new Error(`beklenmeyen istek: ${target}`);
};

let aiInput;
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', other.privateKey)).toString('base64');
const env = { FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ client_email: 'test@test.invalid', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n` }), AI: { run: async (_model, input) => { aiInput = input; return { response: ' Tavsiye ' }; } } };
const call = async (path, t, init = {}) => worker.fetch(new Request(`https://w.test${path}`, { ...init, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' } }), env);
const meetPath = `/tyf/meet?url=${encodeURIComponent(page)}`;
const valid = await token();
const notify = (collection, id, t = valid) => call('/push/notify', t, { method: 'POST', body: JSON.stringify({ collection, id }) });

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
  ['oturumsuz bildirim reddedilir', async () => assert.equal((await notify('notices', 'n1', null)).status, 401)],
  ['başkasının kaydıyla bildirim gönderilemez', async () => assert.equal((await notify('notices', 'baskasi')).status, 403)],
  ['izin verilmeyen koleksiyon reddedilir', async () => assert.equal((await notify('users', 'u1')).status, 400)],
  ['eski kayıtla bildirim gönderilmez', async () => {
    const before = sent.length;
    assert.deepEqual(await (await notify('notices', 'eski')).json(), { done: true, sent: 0 });
    assert.equal(sent.length, before);
  }],
  ['duyuru alıcılara gider, gönderene gitmez', async () => {
    const res = await (await notify('notices', 'n1')).json();
    assert.deepEqual(res, { done: true, sent: 1 });
    assert.deepEqual(sent.map((m) => m.token).sort(), ['olu-token', 'tok-p1']);
  }],
  ['bildirimde içerik sızmaz', async () => assert.ok(!JSON.stringify(sent).includes('GIZLI'))],
  ['geçersiz cihaz temizlenir', async () => assert.ok(removed.some((u) => u.endsWith('/pushTokens/p2')))],
  ['aynı istek bildirimi çoğaltmaz', async () => {
    const before = sent.length;
    assert.deepEqual(await (await notify('notices', 'n1')).json(), { done: true, sent: 0 });
    assert.equal(sent.length, before);
  }],
  ['mesaj bildirimi içeriksiz gider', async () => {
    sent.length = 0;
    await notify('messages', 'm1');
    assert.equal(sent.length, 1);
    assert.equal(sent[0].notification.title, 'Yeni mesaj');
    assert.ok(!JSON.stringify(sent[0]).includes('GIZLI'));
  }],
  ['büyük duyuru parçalanır ve herkese bir kez gider', async () => {
    sent.length = 0;
    const responses = [];
    for (let i = 0; i < 5; i += 1) {
      const r = await (await notify('notices', 'buyuk')).json();
      responses.push(r);
      if (r.done) break;
    }
    assert.equal(responses.length, 3);
    assert.equal(new Set(sent.map((m) => m.token)).size, 45);
    assert.equal(sent.length, 45);
  }],
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
