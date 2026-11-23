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

/** Yapay zekâya ad, kulüp veya kimlik gönderilmez; yalnız sayısal özet gider. */
export async function aiAnalysis(summary: object): Promise<string> {
  const res = await call('/ai/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary }) });
  return (await res.json()).text;
}
