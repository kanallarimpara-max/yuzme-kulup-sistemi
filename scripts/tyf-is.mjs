import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const pdfjs = await import(pathToFileURL(require.resolve('pdfjs-dist/legacy/build/pdf.mjs')).href);

export async function pagesOf(data) {
  const task = pdfjs.getDocument({ data: new Uint8Array(data), verbosity: 0, isEvalSupported: false });
  const doc = await task.promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n += 1) {
    const { items } = await (await doc.getPage(n)).getTextContent();
    pages.push(items.flatMap((i) => ('str' in i ? [{ x: i.transform[4], y: i.transform[5], text: i.str }] : [])));
  }
  await task.destroy();
  return pages;
}

export async function jobClient() {
  const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenKey, WORKER_URL: worker } = process.env;
  if (!tokenUrl || !tokenKey || !worker) throw new Error('GitHub kimliği veya Worker adresi yok.');
  let id;
  let refreshAt = 0;
  return async (path, body) => {
    if (Date.now() >= refreshAt) {
      id = await (await fetch(`${tokenUrl}&audience=yuzme-kulup-worker`, { headers: { Authorization: `Bearer ${tokenKey}` } })).json();
      refreshAt = Date.now() + 120000;
    }
    const res = await fetch(`${worker.replace(/\/$/, '')}${path}`, {
      method: 'POST', headers: { Authorization: `Bearer ${id.value}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`${path} başarısız: ${res.status} ${json.error ?? ''}`);
    return json;
  };
}
