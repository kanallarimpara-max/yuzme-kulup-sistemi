// TYF sezon sayfasındaki reglamanlardan barajları çıkarır: node scripts/tyf-barajlar.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseStandardPage } from '../src/lib/standards.ts';

const PAGE = 'https://www.tyf.gov.tr/haber/2026-2027-sezonu-yuzme-faaliyet-takvimi-yayinda.html';
const ENTITIES = { nbsp: ' ', Uuml: 'Ü', uuml: 'ü', Ccedil: 'Ç', ccedil: 'ç', Ouml: 'Ö', ouml: 'ö', amp: '&', ndash: '–' };
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&(\w+);/g, (all, name) => ENTITIES[name] ?? all).replace(/\s+/g, ' ').trim();

const html = await (await fetch(PAGE)).text();
const links = [...html.matchAll(/<a[^>]+href="(https:\/\/dosya\.tyf\.gov\.tr\/public\/upload\/0\/202[67]-[^"]+\.pdf)"[^>]*>([\s\S]*?)<\/a>/gi)]
  .map((m) => ({ url: m[1], title: clean(m[2]) }))
  .filter((l, i, all) => l.title && all.findIndex((x) => x.url === l.url) === i);

const standards = [];
const report = [];
for (const { url, title } of links) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const doc = await getDocument({ data: new Uint8Array(await res.arrayBuffer()), useSystemFonts: true, verbosity: 0 }).promise;
    let count = 0;
    for (let n = 1; n <= doc.numPages; n += 1) {
      const { items } = await (await doc.getPage(n)).getTextContent();
      const cells = items.flatMap((i) => ('str' in i && i.str.trim() ? [{ x: i.transform[4], y: i.transform[5], text: i.str }] : []));
      const rows = parseStandardPage(cells, title, url);
      standards.push(...rows);
      count += rows.length;
    }
    report.push({ title: title.slice(0, 60), sayfa: doc.numPages, baraj: count });
  } catch (error) {
    report.push({ title: title.slice(0, 60), hata: error.message });
  }
}

mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });
writeFileSync(new URL('../src/data/standards.json', import.meta.url), JSON.stringify({ season: '2026-2027', source: PAGE, standards }));
console.table(report);
console.log(`Toplam baraj: ${standards.length}`);
