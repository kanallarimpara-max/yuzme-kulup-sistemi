import { firebaseEnabled } from './store';
import type { LiveMeet } from './tyfLinks';

const base = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '');
export const workerEnabled = Boolean(base && firebaseEnabled);

async function call(path: string, init: RequestInit = {}) {
  const [{ getApp }, { getAuth }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const token = await getAuth(getApp()).currentUser?.getIdToken();
  if (!token) throw new Error('Oturum gerekli.');
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } })
    .catch(() => { throw new Error('Sunucuya ulaşılamadı. İnternet bağlantını kontrol et.'); });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'İşlem tamamlanamadı.');
  return res;
}

export async function liveMeet(url: string): Promise<LiveMeet & { url: string }> {
  return (await call(`/tyf/meet-detail?url=${encodeURIComponent(url)}`)).json();
}

export async function meetPdf(url: string) {
  return (await call(`/tyf/pdf?url=${encodeURIComponent(url)}`)).arrayBuffer();
}

export async function pushNotify(collection: string, id: string): Promise<{ done: boolean; retry?: boolean }> {
  const res = await call('/push/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection, id }) });
  return res.json();
}

/** Dosya Worker üzerinden yüklenir; oturum, tür, boyut ve günlük hak orada denetlenir. */
export async function signedUpload(file: File): Promise<string> {
  if (file.size > 10_000_000) throw new Error('Dosya en fazla 10 MB olabilir.');
  const body = new FormData();
  body.append('file', file);
  return (await (await call('/files/upload', { method: 'POST', body })).json()).url as string;
}

/** Yapay zekâya ad, kulüp veya kimlik gönderilmez; yalnız sayısal özet gider. */
export async function aiAnalysis(summary: object): Promise<string> {
  const res = await call('/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary }) });
  return (await res.json()).text;
}

export type SessionAiRequest = { task: 'analiz' | 'program'; period?: 'gunluk' | 'haftalik' | 'aylik'; minutes?: number; daysPerWeek?: number; pool?: '25m' | '50m'; note?: string; group: object };

/** Dersteki sporcular numarayla gider; ad ve kimlik gönderilmez. */
export async function aiSession(request: SessionAiRequest): Promise<string> {
  const res = await call('/ai/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request) });
  return String((await res.json()).text ?? '').replace(/\*\*|^#+\s*/gm, '');
}
