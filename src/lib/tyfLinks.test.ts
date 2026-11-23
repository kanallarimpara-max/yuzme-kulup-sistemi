import { describe, expect, it } from 'vitest';
import { isResultPdfUrl, normalizeMeetUrl, resultLinks } from './tyfLinks';

const page = 'https://canli.tyf.gov.tr/live/2026/1005927/';

describe('TYF canlı sonuç bağlantıları', () => {
  it('yarış adresini tek biçime getirir', () => {
    expect(normalizeMeetUrl('https://canli.tyf.gov.tr/live/2026/1005927')).toBe(page);
  });

  it('başka adresleri reddeder', () => {
    for (const bad of ['http://canli.tyf.gov.tr/live/2026/1/', 'https://canli.tyf.gov.tr.evil.test/live/2026/1/', 'https://canli.tyf.gov.tr@evil.test/live/2026/1/', 'https://canli.tyf.gov.tr/admin', 'yazi']) {
      expect(normalizeMeetUrl(bad)).toBeNull();
    }
  });

  it('yalnız sonuç PDF bağlantılarını alır', () => {
    const html = '<a href="StartList_1.pdf?v=1">x</a><a href="ResultList_1325.pdf?v=9">y</a><a href="ResultList_1325.pdf?v=9">y</a><a href="https://evil.test/ResultList_2.pdf">z</a>';
    expect(resultLinks(html, page)).toEqual([`${page}ResultList_1325.pdf?v=9`]);
  });

  it('PDF adresini denetler', () => {
    expect(isResultPdfUrl(`${page}ResultList_1.pdf?v=1`)).toBe(true);
    expect(isResultPdfUrl(`${page}StartList_1.pdf`)).toBe(false);
    expect(isResultPdfUrl('https://evil.test/live/2026/1/ResultList_1.pdf')).toBe(false);
  });
});
