// Kapalı uygulamaya bildirim. Metinde mesaj içeriği, ad veya çocuk bilgisi bulunmaz.
const SCOPES = 'https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/firebase.messaging';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
// Ücretsiz Worker istek başına 50 alt istekle sınırlıdır; büyük duyurular parça parça gönderilir.
const RECIPIENTS_PER_CALL = 20;
const MAX_SENDS_PER_CALL = 35;
const MAX_CLEANUPS = 4;
const MAX_AGE_MS = 10 * 60 * 1000;
const BODY = 'Görmek için dokunun.';

let cached = null;
const b64 = (data) => btoa(String.fromCharCode(...new Uint8Array(data))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const text64 = (value) => b64(new TextEncoder().encode(JSON.stringify(value)));

export const resetPushCache = () => { cached = null; };

async function accessToken(env) {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.exp > now + 60) return cached.token;
  const account = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const pem = account.private_key.replace(/-----[^-]+-----/g, '').replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const unsigned = `${text64({ alg: 'RS256', typ: 'JWT' })}.${text64({ iss: account.client_email, scope: SCOPES, aud: TOKEN_URL, iat: now, exp: now + 3600 })}`;
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${b64(signature)}` }),
  });
  if (!res.ok) throw new Error('Google oturumu açılamadı');
  const body = await res.json();
  cached = { token: body.access_token, exp: now + (body.expires_in ?? 3600) };
  return cached.token;
}

export const firestoreToken = accessToken;

const value = (field) => {
  if (!field) return undefined;
  if ('stringValue' in field) return field.stringValue;
  if ('integerValue' in field) return Number(field.integerValue);
  if ('doubleValue' in field) return field.doubleValue;
  if ('arrayValue' in field) return (field.arrayValue.values ?? []).map(value);
  return undefined;
};
const fieldsOf = (doc) => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, value(v)]));

/** Alıcılar istemciden alınmaz; yalnız veritabanındaki kayıttan ve gerçek göndericiye göre belirlenir. */
export function pushTarget(collection, row) {
  const unique = (ids, sender) => [...new Set((ids ?? []).filter((id) => typeof id === 'string' && id !== sender))].sort();
  if (collection === 'notices') {
    const title = row.kind === 'yaris' ? 'Yeni yarış duyurusu' : row.kind === 'ders' ? 'Yeni ders bildirimi' : 'Yeni duyuru';
    return { sender: row.senderId, recipients: unique(row.recipientIds, row.senderId), title, link: '#/duyurular', ttl: 86400 };
  }
  if (collection === 'messages') return { sender: row.senderId, recipients: unique(row.memberIds, row.senderId), title: 'Yeni mesaj', link: '#/mesajlar', ttl: 86400 };
  if (collection === 'calls') return { sender: row.callerId, recipients: unique([row.calleeId], row.callerId), title: 'Gelen arama', link: '#/mesajlar', ttl: 30 };
  return null;
}

const AI_DAILY_LIMIT = 10;

/** Ücretsiz AI kotasını tek kullanıcının tüketmesini önler. Sayaç sunucuda atomik artar. */
export const consumeAiQuota = (env, uid) => consumeQuota(env, uid, AI_DAILY_LIMIT);

export async function consumeQuota(env, key, limit) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return false;
  const day = new Date().toISOString().slice(0, 10);
  const base = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const res = await fetch(`https://firestore.googleapis.com/v1/${base}:commit`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${await accessToken(env)}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ writes: [{ transform: {
      document: `${base}/aiQuota/${key}_${day}`,
      fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
    } }] }),
  });
  if (!res.ok) return false;
  const count = Number((await res.json()).writeResults?.[0]?.transformResults?.[0]?.integerValue ?? Infinity);
  return count <= limit;
}

export async function handlePush(request, env, uid, json) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Bildirim servisi ayarlanmadı.' }, 503);
  const input = await request.json().catch(() => null);
  const collection = input?.collection;
  const id = input?.id;
  if (!['notices', 'messages', 'calls'].includes(collection) || typeof id !== 'string' || !/^[\w-]{1,128}$/.test(id)) return json({ error: 'Geçersiz istek.' }, 400);

  const auth = { Authorization: `Bearer ${await accessToken(env)}` };
  const root = `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const docRes = await fetch(`${root}/${collection}/${id}`, { headers: auth });
  if (docRes.status === 404) return json({ error: 'Kayıt bulunamadı.' }, 404);
  if (!docRes.ok) return json({ error: 'Kayıt okunamadı.' }, 502);
  const row = fieldsOf(await docRes.json());
  const target = pushTarget(collection, row);
  if (target.sender !== uid) return json({ error: 'Bu kayıt için bildirim gönderemezsiniz.' }, 403);
  if (!row.createdAt || Math.abs(Date.now() - row.createdAt) > MAX_AGE_MS) return json({ done: true, sent: 0 });
  if (!target.recipients.length) return json({ done: true, sent: 0 });

  // Her alıcı parçası bir kez işlenir; aynı istek tekrar edilse de bildirim çoğalmaz.
  const logId = `${collection}_${id}`;
  let logRes = await fetch(`${root}/pushLog/${logId}`, { headers: auth });
  if (logRes.status === 404) {
    logRes = await fetch(`${root}/pushLog?documentId=${logId}`, {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { next: { integerValue: '0' } } }),
    });
    if (logRes.status === 409) return json({ done: false, retry: true });
  }
  if (!logRes.ok) return json({ error: 'Bildirim kaydı açılamadı.' }, 502);
  const log = await logRes.json();
  const next = Number(log.fields?.next?.integerValue ?? 0);
  if (next >= target.recipients.length) return json({ done: true, sent: 0 });
  const end = next + RECIPIENTS_PER_CALL;
  const claim = await fetch(`${root}/pushLog/${logId}?updateMask.fieldPaths=next&currentDocument.updateTime=${encodeURIComponent(log.updateTime)}`, {
    method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ fields: { next: { integerValue: String(end) } } }),
  });
  if (!claim.ok) return json({ done: false, retry: true });

  const chunk = target.recipients.slice(next, end);
  const query = await fetch(`${root}:runQuery`, {
    method: 'POST',
    headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: {
      from: [{ collectionId: 'pushTokens' }],
      where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'IN', value: { arrayValue: { values: chunk.map((v) => ({ stringValue: v })) } } } },
      limit: MAX_SENDS_PER_CALL,
    } }),
  });
  if (!query.ok) return json({ error: 'Cihazlar okunamadı.' }, 502);
  const devices = (await query.json()).filter((r) => r.document).map((r) => ({ name: r.document.name, ...fieldsOf(r.document) }));

  const send = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
  const results = await Promise.all(devices.map(async (device) => {
    const message = device.platform === 'android'
      ? { token: device.token, notification: { title: target.title, body: BODY }, data: { link: target.link }, android: { priority: 'high', ttl: `${target.ttl}s` } }
      : { token: device.token, data: { title: target.title, body: BODY, link: target.link }, webpush: { headers: { Urgency: 'high', TTL: String(target.ttl) } } };
    const res = await fetch(send, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
    return { device, ok: res.ok, gone: res.status === 404 };
  }));
  // Kaldırılmış uygulamaların kayıtları temizlenir.
  await Promise.all(results.filter((r) => r.gone).slice(0, MAX_CLEANUPS).map((r) => {
    const path = r.device.name.split('/documents/')[1];
    return fetch(`${root}/${path}`, { method: 'DELETE', headers: auth });
  }));
  return json({ done: end >= target.recipients.length, sent: results.filter((r) => r.ok).length });
}
