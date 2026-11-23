import { firebaseEnabled } from './store';

const base = (import.meta.env.VITE_WORKER_URL ?? '').replace(/\/$/, '');
export const workerEnabled = Boolean(base && firebaseEnabled);

async function call(path: string, init: RequestInit = {}) {
  const [{ getApp }, { getAuth }] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const token = await getAuth(getApp()).currentUser?.getIdToken();
  if (!token) throw new Error('Oturum gerekli.');
  const res = await fetch(`${base}${path}`, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? 'İşlem tamamlanamadı.');
  return res;
}

export async function meetPdfLinks(url: string): Promise<string[]> {
  return (await (await call(`/tyf/meet?url=${encodeURIComponent(url)}`)).json()).links;
}

export async function meetPdf(url: string) {
  return (await call(`/tyf/pdf?url=${encodeURIComponent(url)}`)).arrayBuffer();
}

export async function pushNotify(collection: string, id: string): Promise<{ done: boolean; retry?: boolean }> {
  const res = await call('/push/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection, id }) });
  return res.json();
}

/** Dosya tarayıcıdan doğrudan Cloudinary'ye gider; Worker yalnız kısa ömürlü imza üretir. */
export async function signedUpload(file: File): Promise<string> {
  const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('audio/') ? 'audio' : file.type === 'application/pdf' ? 'pdf' : '';
  if (!kind) throw new Error('Bu dosya türü desteklenmiyor.');
  if (file.size > 10_000_000) throw new Error('Dosya en fazla 10 MB olabilir.');
  const { url, fields } = await (await call('/files/sign', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind }) })).json() as { url: string; fields: Record<string, string> };
  const body = new FormData();
  Object.entries(fields).forEach(([key, value]) => body.append(key, value));
  body.append('file', file);
  const res = await fetch(url, { method: 'POST', body });
  if (!res.ok) throw new Error('Dosya yüklenemedi.');
  return (await res.json()).secure_url as string;
}

/** Yapay zekâya ad, kulüp veya kimlik gönderilmez; yalnız sayısal özet gider. */
export async function aiAnalysis(summary: object): Promise<string> {
  const res = await call('/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary }) });
  return (await res.json()).text;
}
