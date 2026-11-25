// Worker'ı Cloudflare hesabı olmadan, ağ çağrılarını taklit ederek dener: npm run test:worker
import assert from 'node:assert/strict';
import worker from './index.js';
import { sameClubRecipients } from './push.js';
import { pickWrites, validResult } from './results.js';
import { meetCandidates } from './tyfMeets.js';

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
  'notices/n1': { clubId: str('c1'), senderId: str('u1'), kind: str('duyuru'), createdAt: fresh, recipientIds: list(['u1', 'p1', 'p2']), title: str('GIZLI BASLIK'), body: str('GIZLI ICERIK') },
  'notices/baskasi': { senderId: str('u9'), createdAt: fresh, recipientIds: list(['p1']) },
  'notices/eski': { senderId: str('u1'), createdAt: { integerValue: String(Date.now() - 3600000) }, recipientIds: list(['p1']) },
  'notices/buyuk': { clubId: str('c1'), senderId: str('u1'), createdAt: fresh, recipientIds: list(Array.from({ length: 45 }, (_, i) => `k${String(i).padStart(2, '0')}`)) },
  'messages/m1': { senderId: str('u1'), createdAt: fresh, memberIds: list(['u1', 'p1']), text: str('GIZLI MESAJ') },
};
const logs = new Map();
const sent = [];
const removed = [];
let logVersion = 0;
let aiCount = 0;
const devices = () => ['p1', 'p2', ...Array.from({ length: 45 }, (_, i) => `k${String(i).padStart(2, '0')}`)].map((uid) => ({ uid, token: uid === 'p2' ? 'olu-token' : `tok-${uid}`, platform: uid === 'p1' ? 'android' : 'web' }));
async function googleApis(target, init = {}) {
  if (target === 'https://oauth2.googleapis.com/token') return Response.json({ access_token: 'erisim', expires_in: 3600 });
  if (target.includes('fcm.googleapis.com')) {
    const { message } = JSON.parse(init.body);
    sent.push(message);
    return message.token === 'olu-token' ? new Response('{}', { status: 404 }) : Response.json({ name: 'ok' });
  }
  if (target === `${FS}:commit`) {
    aiCount += 1;
    return Response.json({ writeResults: [{ transformResults: [{ integerValue: String(aiCount) }] }] });
  }
  // Duyuru alıcılarının kulübü okunur; testte herkes c1 kulübündedir.
  if (target === `${FS}:batchGet`) {
    const docs = JSON.parse(init.body).documents;
    return Response.json(docs.map((name) => ({ found: { name, fields: { clubId: str('c1'), role: str('admin') } } })));
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
  if (target.startsWith('https://api.cloudinary.com/v1_1/bulut/')) {
    uploaded = { target, preset: init.body.get('upload_preset') };
    return Response.json({ secure_url: 'https://res.cloudinary.com/bulut/image/authenticated/s--x--/v1/abc.pdf' });
  }
  if (target === page) return new Response('<a href="StartList_1.pdf">b</a><a href="ResultList_7.pdf?v=2">s</a>');
  if (target === `${page}ResultList_7.pdf?v=2`) return new Response(new Uint8Array([37, 80, 68, 70]));
  throw new Error(`beklenmeyen istek: ${target}`);
};

let aiInput;
let uploaded = null;
const pkcs8 = Buffer.from(await crypto.subtle.exportKey('pkcs8', other.privateKey)).toString('base64');
const env = { FIREBASE_PROJECT_ID: PROJECT, FIREBASE_SERVICE_ACCOUNT: JSON.stringify({ client_email: 'test@test.invalid', private_key: `-----BEGIN PRIVATE KEY-----\n${pkcs8}\n-----END PRIVATE KEY-----\n` }), AI: { run: async (_model, input) => { aiInput = input; return { response: ' Tavsiye ' }; } } };
const call = async (path, t, init = {}) => worker.fetch(new Request(`https://w.test${path}`, { ...init, headers: { ...(t ? { Authorization: `Bearer ${t}` } : {}), 'Content-Type': 'application/json' } }), env);
const meetPath = `/tyf/meet?url=${encodeURIComponent(page)}`;
const valid = await token();
const notify = (collection, id, t = valid) => call('/push/notify', t, { method: 'POST', body: JSON.stringify({ collection, id }) });
const cloudinary = { CLOUDINARY_CLOUD_NAME: 'bulut', CLOUDINARY_UPLOAD_PRESET: 'gizli-ayar-adi' };
const upload = async (type, size = 10, t = valid) => {
  const body = new FormData();
  body.append('file', new File([new Uint8Array(size)], 'dosya', { type }));
  return worker.fetch(new Request('https://w.test/files/upload', { method: 'POST', body, headers: t ? { Authorization: `Bearer ${t}` } : {} }), env);
};

const checks = [
  ['TYF sonuç satırı denetlenir', () => {
    const r = { id: 'tyf-s1-2026-07-03-serbest-100', clubId: 'c1', studentId: 's1', stroke: 'serbest', distance: 100, timeMs: 76360, date: '2026-07-03', meet: 'Yarış' };
    assert.equal(validResult(r), true);
    assert.equal(validResult({ ...r, stroke: 'uçmak' }), false);
    assert.equal(validResult({ ...r, timeMs: 12.5 }), false);
    assert.equal(validResult({ ...r, id: '../users/x' }), false);
    assert.equal(validResult({ ...r, pool: '33m' }), false);
  }],
  ['TYF sonucu yalnız doğru kulübe ve daha iyiyse yazılır', () => {
    const base = { stroke: 'serbest', distance: 100, date: '2026-07-03', meet: 'Yarış' };
    const rows = [{ ...base, id: 'a', clubId: 'c1', studentId: 's1', timeMs: 70000 }, { ...base, id: 'b', clubId: 'c1', studentId: 's2', timeMs: 70000 }, { ...base, id: 'c', clubId: 'c1', studentId: 's3', timeMs: 70000 }, { ...base, id: 'd', clubId: 'c1', studentId: 's4', timeMs: 70000 }];
    const students = { s1: { clubId: 'c1', parentId: 'v1' }, s2: { clubId: 'c2', parentId: 'v2' }, s3: { clubId: 'c1', parentId: 'v3' }, s4: { clubId: 'c1', parentId: 'v4' } };
    const written = pickWrites(rows, students, { c: { timeMs: 65000 }, d: { timeMs: 75000 } });
    assert.deepEqual(written.map((r) => [r.id, r.parentId]), [['a', 'v1'], ['d', 'v4']]);
  }],
  ['TYF sonuç ucu GitHub kimliği olmadan çalışmaz', async () => {
    const res = await worker.fetch(new Request('https://w.test/results/athletes', { method: 'POST', body: '{}' }), { GITHUB_REPOSITORY: 'a/b', FIREBASE_SERVICE_ACCOUNT: 'x' });
    assert.equal(res.status, 401);
  }],
  ['duyuru bildirimi başka kulübe gitmez', () => {
    const profiles = { a: { clubId: 'c1' }, b: { clubId: 'c2' }, c: { clubId: 'c1' }, d: {} };
    assert.deepEqual(sameClubRecipients(['a', 'b', 'c', 'd', 'x'], profiles, 'c1', false), ['a', 'c']);
    assert.deepEqual(sameClubRecipients(['a', 'b'], profiles, 'c1', true), ['a', 'b']);
  }],
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
  ['ders analizi grubu saniyeyle gönderir', async () => {
    const group = { athleteCount: 1, athletes: [{ no: 1, age: 11, strokes: [{ stroke: 'kelebek', race: { distance: 50, bestMs: 41230, gapPercent: 6.1 } }] }] };
    const res = await call('/ai/session', valid, { method: 'POST', body: JSON.stringify({ task: 'analiz', group }) });
    assert.deepEqual(await res.json(), { text: 'Tavsiye' });
    assert.ok(aiInput.messages[1].content.includes('"bestSaniye":41.23'));
    assert.ok(aiInput.messages[1].content.includes('Bu ders grubunu analiz et'));
  }],
  ['haftalık program isteği süreyi ve isteği iletir', async () => {
    await call('/ai/session', valid, { method: 'POST', body: JSON.stringify({ task: 'program', period: 'haftalik', minutes: 999, daysPerWeek: 4, note: 'dönüşler', group: { athleteCount: 0 } }) });
    const text = aiInput.messages[1].content;
    assert.ok(text.includes('haftalık') && text.includes('180 dakika') && text.includes('haftada 4 gün') && text.includes('dönüşler'));
    assert.equal(aiInput.max_tokens, 1300);
  }],
  ['aşırı büyük ders verisi reddedilir', async () => assert.equal((await call('/ai/session', valid, { method: 'POST', body: JSON.stringify({ group: 'x'.repeat(15000) }) })).status, 400)],
  ['baraj yayını kullanıcı oturumuyla yapılamaz', async () => assert.equal((await call('/standards/publish', valid, { method: 'POST', body: '{}' })).status, 401)],
  ['aşırı büyük AI verisi reddedilir', async () => assert.equal((await call('/ai/analyze', valid, { method: 'POST', body: JSON.stringify({ summary: 'x'.repeat(5000) }) })).status, 400)],
  ['günlük AI hakkı aşılamaz', async () => {
    aiCount = 10;
    const res = await call('/ai/analyze', valid, { method: 'POST', body: JSON.stringify({ summary: { age: 12 } }) });
    assert.equal(res.status, 429);
  }],
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
  ['oturumsuz dosya yüklenemez', async () => assert.equal((await upload('image/png', 10, null)).status, 401)],
  ['Cloudinary ayarı yoksa yükleme kapalıdır', async () => assert.equal((await upload('image/png')).status, 503)],
  ['izinsiz dosya türü hak harcamadan reddedilir', async () => {
    Object.assign(env, cloudinary);
    aiCount = 0;
    for (const type of ['application/x-msdownload', 'text/html']) assert.equal((await upload(type)).status, 400);
    assert.equal(aiCount, 0);
  }],
  ['10 MB üstü dosya reddedilir', async () => assert.equal((await upload('image/png', 10_000_001)).status, 413)],
  ['dosya yüklenir, ayar adı istemciye sızmaz', async () => {
    const res = await upload('application/pdf');
    const raw = await res.text();
    assert.equal(res.status, 200);
    assert.deepEqual(JSON.parse(raw), { url: 'https://res.cloudinary.com/bulut/image/authenticated/s--x--/v1/abc.pdf' });
    assert.ok(!raw.includes(cloudinary.CLOUDINARY_UPLOAD_PRESET));
    assert.equal(uploaded.target, 'https://api.cloudinary.com/v1_1/bulut/image/upload');
    assert.equal(uploaded.preset, cloudinary.CLOUDINARY_UPLOAD_PRESET);
  }],
  ['ses dosyası doğru kaynağa gider', async () => {
    await upload('audio/webm');
    assert.equal(uploaded.target, 'https://api.cloudinary.com/v1_1/bulut/video/upload');
  }],
  ['günlük yükleme hakkı aşılamaz', async () => {
    aiCount = 30;
    uploaded = null;
    assert.equal((await upload('image/png')).status, 429);
    assert.equal(uploaded, null);
  }],
  ['Süren yarışın canlı bağlantısı, açılmamış yarışların önüne geçer', () => {
    const ids = Array.from({ length: 25 }, (_, i) => `<span data-section="yarisma_info" data-id="10059${String(i + 10)}">`).join('');
    const html = `<a href="https://canli.tyf.gov.tr/live/2026/1005890/">Canlı Sonuçlar</a>${ids}<span data-section="yarisma_info" data-id="1005890">`;
    const got = meetCandidates(html, 2026, new Set(['https://canli.tyf.gov.tr/live/2026/1005927/']), 0);
    assert.equal(got[0], 'https://canli.tyf.gov.tr/live/2026/1005890/');
    assert.equal(got.length, 20);
    assert.equal(new Set(got).size, got.length);
    assert.ok(!got.includes('https://canli.tyf.gov.tr/live/2026/1005927/'));
  }],
  ['Açılmamış yarışlar her turda kaydırılır, listedeki her yarış sırayla denenir', () => {
    const html = Array.from({ length: 30 }, (_, i) => `<span data-section="yarisma_info" data-id="${2000 + i}">`).join('');
    const seen = new Set();
    for (let run = 0; run < 3; run++) meetCandidates(html, 2026, new Set(['https://canli.tyf.gov.tr/live/2026/1005927/']), run * 1800000).forEach((u) => seen.add(u));
    assert.equal(seen.size, 30);
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
