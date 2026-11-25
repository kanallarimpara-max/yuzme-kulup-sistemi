// TYF sezon faaliyet takvimini okur, src/data/calendar.json dosyasına yazar.
// GitHub işinde (WORKER_URL ve GitHub kimliği varsa) sonucu Worker'a da gönderir: node scripts/tyf-takvim.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseCalendarPages, validCalendar } from '../src/lib/tyfCalendar.ts';

const PAGE = 'https://www.tyf.gov.tr/haber/2026-2027-sezonu-yuzme-faaliyet-takvimi-yayinda.html';
const SEASON = '2026-2027';

const html = await (await fetch(PAGE)).text();
// Revize edilen takvim aynı sayfaya yeni adla eklenir; en son yüklenen dosya alınır.
const links = [...new Set([...html.matchAll(/href="(https:\/\/dosya\.tyf\.gov\.tr\/public\/upload\/0\/(20\d\d-\d\d)\/[^"]*Faaliyet-Takvimi[^"]*\.pdf)"/gi)].map((m) => m[1]))];
if (!links.length) throw new Error('Faaliyet takvimi bağlantısı bulunamadı.');
const source = links.sort((a, b) => a.match(/\/(20\d\d-\d\d)\//)[1].localeCompare(b.match(/\/(20\d\d-\d\d)\//)[1])).at(-1);

const res = await fetch(source);
if (!res.ok) throw new Error(`Takvim indirilemedi: HTTP ${res.status}`);
const doc = await getDocument({ data: new Uint8Array(await res.arrayBuffer()), useSystemFonts: true, verbosity: 0, isEvalSupported: false }).promise;
const pages = [];
for (let n = 1; n <= doc.numPages; n += 1) {
  const { items } = await (await doc.getPage(n)).getTextContent();
  pages.push(items.flatMap((i) => ('str' in i ? [{ x: i.transform[4], y: i.transform[5], w: i.width, text: i.str }] : [])));
}
const events = parseCalendarPages(pages);
// Okuma bozulduysa (biçim değiştiyse) eksik takvim yayınlanmaz.
if (events.length < 10 || !validCalendar(events)) throw new Error(`Takvim şüpheli okundu: ${events.length} yarış.`);

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/calendar.json', `${JSON.stringify({ season: SEASON, source, events }, null, 1)}\n`);
console.log(`Takvim okundu: ${events.length} yarış (${events.filter((e) => !e.international).length} yurt içi).`);

const { ACTIONS_ID_TOKEN_REQUEST_URL: tokenUrl, ACTIONS_ID_TOKEN_REQUEST_TOKEN: tokenKey, WORKER_URL: worker } = process.env;
if (tokenUrl && tokenKey && worker) {
  const id = await (await fetch(`${tokenUrl}&audience=yuzme-kulup-worker`, { headers: { Authorization: `Bearer ${tokenKey}` } })).json();
  const sent = await fetch(`${worker.replace(/\/$/, '')}/calendar/publish`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${id.value}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ season: SEASON, source, events }),
  });
  const body = await sent.json().catch(() => ({}));
  if (!sent.ok) throw new Error(`Yayın başarısız: ${sent.status} ${body.error ?? ''}`);
  console.log(body.changed ? 'Takvim güncellendi.' : 'Takvimde değişiklik yok.');
}
