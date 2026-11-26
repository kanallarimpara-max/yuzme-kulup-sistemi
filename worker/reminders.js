// Her sabah 09:00'da (Türkiye) vadesi yaklaşan ve geciken taksitler için veliye uygulama içi bildirim yazar
// ve kapalı uygulamaya kısa bir uyarı gönderir. Bildirim kimliği sabit olduğu için aynı hatırlatma iki kez gitmez.
import { dueReminders, monthName, reminderText } from '../src/lib/reminders.ts';
import { firestoreToken } from './push.js';

// Ücretsiz Worker çağrı başına 50 alt istekle sınırlıdır: okuma ve yazma 5, cihaz sorgusu en çok 2, gönderim en çok 35.
const MAX_SENDS = 35;
const IN_LIMIT = 30;

const decode = (f) => {
  if (!f) return undefined;
  if ('stringValue' in f) return f.stringValue;
  if ('integerValue' in f) return Number(f.integerValue);
  if ('doubleValue' in f) return f.doubleValue;
  if ('booleanValue' in f) return f.booleanValue;
  if ('nullValue' in f) return null;
  if ('arrayValue' in f) return (f.arrayValue.values ?? []).map(decode);
  if ('mapValue' in f) return Object.fromEntries(Object.entries(f.mapValue.fields ?? {}).map(([k, v]) => [k, decode(v)]));
  return undefined;
};
const docFields = (doc) => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, decode(v)]));
const idOf = (name) => name.split('/').pop();

/** Türkiye saatine göre bugünün tarihi (UTC+3, yaz saati yok). */
export const trToday = (at) => new Date(at + 3 * 3600000).toISOString().slice(0, 10);

export async function sendPaymentReminders(env, at = Date.now()) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return { written: 0, sent: 0 };
  const auth = { Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' };
  const base = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const root = `https://firestore.googleapis.com/v1/${base}`;

  // Hatırlatmayı kapatan kulüpler atlanır.
  const clubsRes = await fetch(`${root}/clubs?pageSize=300&mask.fieldPaths=reminderOff`, { headers: auth });
  if (!clubsRes.ok) return { written: 0, sent: 0 };
  const skip = ((await clubsRes.json()).documents ?? []).filter((d) => docFields(d).reminderOff === true).map((d) => idOf(d.name));

  const q = await fetch(`${root}:runQuery`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'enrollments' }], select: { fields: ['clubId', 'studentId', 'parentId', 'installments'].map((fieldPath) => ({ fieldPath })) } } }),
  });
  if (!q.ok) return { written: 0, sent: 0 };
  const enrollments = (await q.json()).filter((r) => r.document).map((r) => ({ id: idOf(r.document.name), ...docFields(r.document) }));
  const reminders = dueReminders(enrollments, trToday(at), skip);
  if (!reminders.length) return { written: 0, sent: 0 };

  const studentIds = [...new Set(reminders.map((r) => r.studentId).filter(Boolean))];
  const names = {};
  if (studentIds.length) {
    const got = await fetch(`${root}:batchGet`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ documents: studentIds.map((s) => `${base}/students/${s}`), mask: { fieldPaths: ['firstName', 'lastName'] } }),
    });
    if (got.ok) (await got.json()).filter((r) => r.found).forEach((r) => { const s = docFields(r.found); names[idOf(r.found.name)] = `${s.firstName ?? ''} ${s.lastName ?? ''}`; });
  }

  // batchWrite her yazmayı ayrı uygular; "yoksa oluştur" koşulu daha önce gönderilmiş hatırlatmayı reddeder.
  const str = (v) => ({ stringValue: v });
  const writes = reminders.map((r) => {
    const { title, body } = reminderText(r, names[r.studentId] ?? '');
    return {
      update: { name: `${base}/notices/${r.id}`, fields: {
        clubId: str(r.clubId), senderId: str('sistem'), kind: str('odeme'), title: str(title), body: str(body),
        recipientIds: { arrayValue: { values: [str(r.parentId)] } }, readBy: { arrayValue: { values: [] } },
        enrollmentId: str(r.enrollmentId), createdAt: { integerValue: String(at) },
      } },
      currentDocument: { exists: false },
    };
  });
  const written = [];
  for (let i = 0; i < writes.length; i += 500) {
    const res = await fetch(`${root}:batchWrite`, { method: 'POST', headers: auth, body: JSON.stringify({ writes: writes.slice(i, i + 500) }) });
    if (!res.ok) continue;
    const status = (await res.json()).status ?? [];
    status.forEach((s, k) => { if (!s.code) written.push(reminders[i + k]); });
  }
  if (!written.length) return { written: 0, sent: 0 };

  // Kapalı uygulamaya içerik içermeyen kısa uyarı; tutar ve ad yalnız uygulamada görünür.
  const sent = await notifyDevices(env, root, auth, written.map((r) => r.parentId), 'Ödeme hatırlatması', '#/duyurular');
  return { written: written.length, sent };
}

async function notifyDevices(env, root, auth, uids, title, link) {
  const str = (v) => ({ stringValue: v });
  const parents = [...new Set(uids)].slice(0, IN_LIMIT * 2);
  const devices = [];
  for (let i = 0; i < parents.length; i += IN_LIMIT) {
    const res = await fetch(`${root}:runQuery`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'pushTokens' }],
        where: { fieldFilter: { field: { fieldPath: 'uid' }, op: 'IN', value: { arrayValue: { values: parents.slice(i, i + IN_LIMIT).map(str) } } } },
        limit: MAX_SENDS,
      } }),
    });
    if (res.ok) devices.push(...(await res.json()).filter((r) => r.document).map((r) => docFields(r.document)));
  }
  const send = `https://fcm.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/messages:send`;
  const results = await Promise.all(devices.slice(0, MAX_SENDS).map(async (d) => {
    const message = d.platform === 'android'
      ? { token: d.token, notification: { title, body: 'Görmek için dokunun.' }, data: { link }, android: { priority: 'high', ttl: '86400s' } }
      : { token: d.token, data: { title, body: 'Görmek için dokunun.', link }, webpush: { headers: { Urgency: 'normal', TTL: '86400' } } };
    const res = await fetch(send, { method: 'POST', headers: auth, body: JSON.stringify({ message }) }).catch(() => null);
    return Boolean(res?.ok);
  }));
  return results.filter(Boolean).length;
}

/** "2026-11-01" → "2026-10": raporu hazırlanan geçen ay. */
export const previousMonth = (today) => {
  const y = Number(today.slice(0, 4));
  const m = Number(today.slice(5, 7));
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

/** Her ayın 1'inde, sporcusu olan her veliye "geçen ayın raporu hazır" bildirimi. Rapor uygulamada hesaplanır. */
export async function sendMonthlyReportNotices(env, at = Date.now()) {
  if (!env.FIREBASE_SERVICE_ACCOUNT) return { written: 0, sent: 0 };
  const auth = { Authorization: `Bearer ${await firestoreToken(env)}`, 'Content-Type': 'application/json' };
  const base = `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
  const root = `https://firestore.googleapis.com/v1/${base}`;
  const month = previousMonth(trToday(at));
  const q = await fetch(`${root}:runQuery`, {
    method: 'POST', headers: auth,
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'students' }], select: { fields: [{ fieldPath: 'clubId' }, { fieldPath: 'parentId' }] } } }),
  });
  if (!q.ok) return { written: 0, sent: 0 };
  const parents = new Map();
  (await q.json()).filter((r) => r.document).map((r) => docFields(r.document))
    .forEach((s) => { if (s.parentId && s.clubId && !parents.has(s.parentId)) parents.set(s.parentId, s.clubId); });
  const name = monthName(month);
  const str = (v) => ({ stringValue: v });
  const entries = [...parents.entries()];
  const written = [];
  for (let i = 0; i < entries.length; i += 500) {
    const part = entries.slice(i, i + 500);
    const res = await fetch(`${root}:batchWrite`, {
      method: 'POST', headers: auth,
      body: JSON.stringify({ writes: part.map(([parentId, clubId]) => ({
        update: { name: `${base}/notices/rapor-${parentId}-${month}`, fields: {
          clubId: str(clubId), senderId: str('sistem'), kind: str('duyuru'), title: str(`${name} aylık raporu hazır`),
          body: str(`${name} ayının devam, derece, beceri ve ödeme özeti hazır. Sporcularım ekranındaki Aylık rapor bölümünden görüp PDF indirebilirsiniz.`),
          recipientIds: { arrayValue: { values: [str(parentId)] } }, readBy: { arrayValue: { values: [] } }, createdAt: { integerValue: String(at) },
        } },
        currentDocument: { exists: false },
      })) }),
    });
    if (!res.ok) continue;
    ((await res.json()).status ?? []).forEach((s, k) => { if (!s.code) written.push(part[k][0]); });
  }
  if (!written.length) return { written: 0, sent: 0 };
  const sent = await notifyDevices(env, root, auth, written, 'Aylık rapor hazır', '#/sporcularim');
  return { written: written.length, sent };
}
