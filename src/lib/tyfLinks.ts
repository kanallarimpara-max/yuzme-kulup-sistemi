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

/** Yarış sayfasındaki tüm sonuç PDF bağlantılarını tekrarsız döndürür. */
export function resultLinks(html: string, pageUrl: string) {
  const found = new Set<string>();
  for (const m of html.matchAll(/href=["']([^"']*ResultList_\d+\.pdf[^"']*)["']/gi)) {
    const url = new URL(m[1].replace(/&amp;/g, '&'), pageUrl).toString();
    if (isResultPdfUrl(url)) found.add(url);
  }
  return [...found];
}
