import { describe, expect, it } from 'vitest';
import { isLivePdfUrl, isResultPdfUrl, meetIdsFrom, normalizeMeetUrl, parseMeetPage, resultLinks } from './tyfLinks';

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
  it('yarış programını gün ve seanslarıyla çözer', () => {
    const html = '<title>Kurgu Yarışı</title><div class="info">Ankara | 21.11.2026</div><div id="tab-gun1"><table><tr class="table-secondary"><td colspan="5">1. GÜN SABAH</td></tr>'
      + '<tr><td>1</td><td>50m Serbest<small>Timed Final</small></td><td>Kadınlar<small>8 Yaş</small></td><td>Timed Final</td><td>8 Yaş</td><td><a href="StartList_7.pdf?v=1">S</a></td><td><a href="ResultList_7.pdf?v=2">R</a></td></tr>'
      + '<tr><td>2</td><td>100m Sırtüstü</td><td>Erkekler</td><td>Final</td><td>9 Yaş</td><td></td><td><a href="https://evil.test/ResultList_8.pdf">R</a></td></tr></table></div>';
    const meet = parseMeetPage(html, page);
    expect([meet.title, meet.info, meet.sessions[0].title]).toEqual(['Kurgu Yarışı', 'Ankara | 21.11.2026', '1. GÜN SABAH']);
    expect(meet.sessions[0].events[0]).toMatchObject({ no: '1', name: '50m Serbest', gender: 'Kadınlar', resultUrl: `${page}ResultList_7.pdf?v=2`, startUrl: `${page}StartList_7.pdf?v=1` });
    expect(meet.sessions[0].events[1].resultUrl).toBe('');
  });
  it('start listesi yalnız TYF adresinden açılır ve yarış numaraları tekrarsızdır', () => {
    expect(isLivePdfUrl(`${page}StartList_1.pdf?v=1`)).toBe(true);
    expect(isLivePdfUrl('https://evil.test/live/2026/1/StartList_1.pdf')).toBe(false);
    expect(meetIdsFrom('data-section="yarisma_info" data-id="5" data-section="yarisma_info" data-id="5"')).toEqual(['5']);
  });
});
