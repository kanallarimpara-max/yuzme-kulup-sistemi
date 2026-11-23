// Tarayıcı ve Worker ortak kullanır. Yalnız TYF canlı sonuç adresleri kabul edilir.
const HOST = 'canli.tyf.gov.tr';

/** "https://canli.tyf.gov.tr/live/2026/1005927" adresini tek biçime getirir, başka adresi reddeder. */
export function normalizeMeetUrl(input: string): string | null {
  try {
    const url = new URL(input.trim());
    const m = url.pathname.match(/^\/live\/(\d{4})\/(\d+)\/?$/);
    if (url.protocol !== 'https:' || url.hostname !== HOST || url.port || url.username || url.password || !m) return null;
    return `https://${HOST}/live/${m[1]}/${m[2]}/`;
  } catch {
    return null;
  }
}

export function isResultPdfUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && url.hostname === HOST && !url.port && !url.username && !url.password
      && /^\/live\/\d{4}\/\d+\/ResultList_\d+\.pdf$/.test(url.pathname);
  } catch {
    return false;
  }
}

/** Uygulama içinde gösterilecek sonuç veya start listesi. */
export function isLivePdfUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && url.hostname === HOST && !url.port && !url.username && !url.password
      && /^\/live\/\d{4}\/\d+\/(?:ResultList|StartList)_\d+\.pdf$/.test(url.pathname);
  } catch {
    return false;
  }
}

export type LiveEvent = { no: string; name: string; gender: string; round: string; age: string; resultUrl: string; startUrl: string };
export type LiveSession = { title: string; events: LiveEvent[] };
export type LiveMeet = { title: string; info: string; sessions: LiveSession[] };

const clean = (html: string) => html.replace(/<small[\s\S]*?<\/small>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;/g, "'").replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();

/** TYF yarış sayfasındaki gün, seans ve yarış programını çözer. */
export function parseMeetPage(html: string, pageUrl: string): LiveMeet {
  const title = clean(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const info = clean(html.match(/class="info">([\s\S]*?)<\/div>/i)?.[1] ?? '');
  const sessions: LiveSession[] = [];
  const start = html.search(/id="tab-gun1"/);
  for (const row of (start < 0 ? '' : html.slice(start)).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => c[1]);
    if (/table-secondary/.test(row[0].slice(0, 60))) {
      sessions.push({ title: clean(cells[0] ?? ''), events: [] });
      continue;
    }
    if (cells.length < 7 || !sessions.length) continue;
    const link = (kind: string) => {
      const href = row[1].match(new RegExp(`href=["']([^"']*${kind}_\\d+\\.pdf[^"']*)["']`, 'i'))?.[1];
      if (!href) return '';
      const url = new URL(href.replace(/&amp;/g, '&'), pageUrl).toString();
      return isLivePdfUrl(url) ? url : '';
    };
    sessions[sessions.length - 1].events.push({
      no: clean(cells[0]), name: clean(cells[1]), gender: clean(cells[2]), round: clean(cells[3]), age: clean(cells[4]),
      resultUrl: link('ResultList'), startUrl: link('StartList'),
    });
  }
  return { title, info, sessions: sessions.filter((s) => s.events.length) };
}

export const meetIdsFrom = (html: string) => [...new Set([...html.matchAll(/data-section="yarisma_info" data-id="(\d+)"/g)].map((m) => m[1]))];

/** Yarış sayfasındaki tüm sonuç PDF bağlantılarını tekrarsız döndürür. */
export function resultLinks(html: string, pageUrl: string) {
  const found = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']*ResultList_\d+\.pdf[^"']*)["']/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), pageUrl).toString();
    if (isResultPdfUrl(url)) found.add(url);
  }
  return [...found];
}
