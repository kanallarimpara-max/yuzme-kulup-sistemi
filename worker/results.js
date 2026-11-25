// GitHub'daki günlük "TYF Sonuçları" işi için iki uç: eşleştirme verisini verir ve bulunan dereceleri kaydeder.
// Kimlik GitHub'ın imzalı kısa ömürlü belgesidir; başka hiçbir istek bu uçlara erişemez.
import { firestoreToken } from './push.js';
import { verifyGithub } from './standards.js';

const WORKFLOW = 'sonuclar.yml';
const STROKES = ['serbest', 'sirt', 'kurbaga', 'kelebek', 'karisik'];
const DISTANCES = [25, 50, 100, 200, 400, 800, 1500];
const ID = /^[\w-]{1,140}$/;
const MAX_RESULTS = 250;

const base = (env) => `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`;
const api = 'https://firestore.googleapis.com/v1';
const value = (f) => (f?.stringValue ?? (f?.integerValue !== undefined ? Number(f.integerValue) : f?.doubleValue));
const fields = (doc) => Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, value(v)]));
const typed = (row) => Object.fromEntries(Object.entries(row).filter(([, v]) => v !== undefined)
  .map(([k, v]) => [k, typeof v === 'number' ? { integerValue: String(Math.round(v)) } : { stringValue: String(v) }]));

/** İşten gelen derece satırını denetler; biçimi bozuk satır yazılmaz. */
export function validResult(r) {
  return Boolean(r) && ID.test(r.id ?? '') && ID.test(r.clubId ?? '') && ID.test(r.studentId ?? '') && STROKES.includes(r.stroke)
    && DISTANCES.includes(r.distance) && Number.isInteger(r.timeMs) && r.timeMs >= 9000 && r.timeMs <= 3_600_000
    && /^\d{4}-\d{2}-\d{2}$/.test(r.date ?? '') && typeof r.meet === 'string' && r.meet.length <= 200
    && (r.pool === undefined || r.pool === '25m' || r.pool === '50m');
}

/** Yeni derece yalnız kayıt yoksa ya da eskisinden iyiyse yazılır. */
export function pickWrites(results, students, existing) {
  return results.filter((r) => {
    const s = students[r.studentId];
    if (!s || s.clubId !== r.clubId) return false;
    const old = existing[r.id];
    return !old || !(old.timeMs <= r.timeMs);
  }).map((r) => ({ ...r, parentId: students[r.studentId].parentId ?? '' }));
}

async function list(env, auth, collection, mask, pageSize = 300) {
  const rows = [];
  let token = '';
  for (let i = 0; i < 20; i += 1) {
    const q = `${api}/${base(env)}/${collection}?pageSize=${pageSize}${mask.map((m) => `&mask.fieldPaths=${m}`).join('')}${token ? `&pageToken=${token}` : ''}`;
    const res = await fetch(q, { headers: auth });
    if (!res.ok) throw new Error(collection);
    const body = await res.json();
    rows.push(...(body.documents ?? []).map((d) => ({ id: d.name.split('/').pop(), ...fields(d) })));
    if (!body.nextPageToken) break;
    token = encodeURIComponent(body.nextPageToken);
  }
  return rows;
}

async function batchGet(env, auth, collection, ids, mask) {
  if (!ids.length) return {};
  const res = await fetch(`${api}/${base(env)}:batchGet`, {
    method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
    body: JSON.stringify({ documents: ids.map((id) => `${base(env)}/${collection}/${id}`), mask: { fieldPaths: mask } }),
  });
  if (!res.ok) throw new Error(collection);
  return Object.fromEntries((await res.json()).filter((r) => r.found).map((r) => [r.found.name.split('/').pop(), fields(r.found)]));
}

export async function handleResults(request, env, json, path) {
  if (!(await verifyGithub(request, env, WORKFLOW))) return json({ error: 'Yetkisiz.' }, 401);
  if (!env.FIREBASE_SERVICE_ACCOUNT) return json({ error: 'Servis ayarlanmadı.' }, 503);
  const auth = { Authorization: `Bearer ${await firestoreToken(env)}` };

  if (path === '/results/athletes') {
    const [clubs, athletes, files, meets] = await Promise.all([
      list(env, auth, 'clubs', ['name']),
      list(env, auth, 'students', ['clubId', 'parentId', 'firstName', 'lastName', 'birthYear', 'gender']),
      list(env, auth, 'tyfResultFiles', ['url']),
      list(env, auth, 'tyfMeets', ['title', 'info', 'startDate', 'endDate']),
    ]);
    return json({
      clubs: clubs.filter((c) => c.name).map((c) => ({ id: c.id, name: c.name })),
      athletes: athletes.filter((a) => a.clubId && a.firstName && a.lastName && a.birthYear && a.gender),
      done: files.map((f) => f.id),
      meets: meets.map((m) => ({ title: m.title ?? '', info: m.info ?? '', startDate: m.startDate ?? '', endDate: m.endDate ?? '' })),
    });
  }

  const body = await request.json().catch(() => null);
  const file = body?.file;
  const results = Array.isArray(body?.results) ? body.results : null;
  if (!file || !ID.test(file.id ?? '') || typeof file.url !== 'string' || !file.url.startsWith('https://dosya.tyf.gov.tr/')
    || typeof file.title !== 'string' || file.title.length > 300 || !results || results.length > MAX_RESULTS || !results.every(validResult)) {
    return json({ error: 'Sonuç verisi geçersiz.' }, 400);
  }
  // Öğrencinin kulübü ve velisi veritabanından alınır; işten gelen kulüp bilgisine güvenilmez.
  const students = await batchGet(env, auth, 'students', [...new Set(results.map((r) => r.studentId))], ['clubId', 'parentId']);
  const existing = await batchGet(env, auth, 'results', [...new Set(results.map((r) => r.id))], ['timeMs']);
  const now = Date.now();
  const writes = pickWrites(results, students, existing).map((r) => ({
    update: { name: `${base(env)}/results/${r.id}`, fields: typed({ ...r, id: undefined, source: 'tyf', kind: 'yaris', createdAt: now }) },
  }));
  if (body.last === true) {
    writes.push({ update: { name: `${base(env)}/tyfResultFiles/${file.id}`, fields: typed({ url: file.url, title: file.title, at: new Date(now).toISOString() }) } });
  }
  if (writes.length) {
    const saved = await fetch(`${api}/${base(env)}:commit`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify({ writes }) });
    if (!saved.ok) return json({ error: 'Sonuçlar kaydedilemedi.' }, 502);
  }
  return json({ written: writes.length - (body.last === true ? 1 : 0) });
}
