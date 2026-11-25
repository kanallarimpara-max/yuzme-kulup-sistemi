// Kurgusal veriyle çalışan yerel uygulamanın gerçek ekranlarını masaüstü ve telefon boyutunda çeker.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const OUT = join('tanitim-videolari', 'kaynak', 'ekran');
mkdirSync(OUT, { recursive: true });
const BASE = 'http://localhost:5175/#';
const go = async (p, route) => { await p.evaluate((x) => { location.hash = x; }, route); await p.waitForTimeout(1300); };
const toEl = async (p, sel) => { await p.locator(sel).first().evaluate((e) => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(400); };
const LIVE = {
  url: 'https://canli.tyf.gov.tr/live/2026/999001/', title: 'KIŞ KUPASI YÜZME YARIŞLARI', info: 'Örnek Şehir | 23.11.2026 - 24.11.2026 | 25 Metre Havuz',
  sessions: [{ title: '1. GÜN SABAH SEANSI - 23.11.2026 - 09:30', events: [
    { no: '1', name: '50m Serbest', gender: 'Erkekler', round: 'Timed Final', age: '12 Yaş', resultUrl: 'https://canli.tyf.gov.tr/live/2026/999001/ResultList_1.pdf?v=1', startUrl: '' },
    { no: '2', name: '100m Sırtüstü', gender: 'Kadınlar', round: 'Timed Final', age: '12 Yaş', resultUrl: '', startUrl: 'https://canli.tyf.gov.tr/live/2026/999001/StartList_2.pdf?v=1' },
    { no: '3', name: '200m Karışık', gender: 'Erkekler', round: 'Timed Final', age: '12 Yaş', resultUrl: '', startUrl: '' },
  ] }],
};
const row = (rank, maskedName, club, timeMs, a, b) => ({ rank, maskedName, birthYear: 2014, club, timeMs, status: '', lapsMs: a ? [a, b] : [] });
const EVENT = { gender: 'E', distance: 50, stroke: 'serbest', date: '2026-11-23', meet: 'Kış Kupası', rows: [
  row(1, 'De*** Y***z', 'Lacivert Yüzme Akademisi', 30410), row(2, 'Me** A***n', 'Mavi Dalga Spor Kulübü', 31280), row(3, 'Ka** T***n', 'Dalga Spor Kulübü', 31550),
  row(4, 'Ke*** Ş*n', 'Mavi Dalga Spor Kulübü', 31920), row(5, 'Ar** G***ş', 'Mavi Dalga Spor Kulübü', 32140), row(6, 'Ba** E***m', 'Lacivert Yüzme Akademisi', 32600), row(7, 'Oz** K***t', 'Dalga Spor Kulübü', 33010),
] };

// Film bilgisayar, reel telefon, tablet yatay ekran görüntüsüdür.
const DEVICES = {
  film: { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1.3334 },
  reel: { viewport: { width: 390, height: 800 }, deviceScaleFactor: 2.5, hasTouch: true },
  tablet: { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1.5, hasTouch: true },
};
const TABLET = new Set(['krono-ekran', 'krono-kilit', 'krono-kontrol', 'admin-panel', 'canli-sonuc', 'ders-analizi', 'veli-performans', 'admin-finans']);
// Tanıtım için kurgusal yapay zekâ yanıtı; "Sporcu 1" ekranda gerçek adla gösterilir.
const AI_ANALYSIS = 'Grup\nEn güçlü stil serbest: ortalama katılım barajının %1,8 altında.\nEn eksik stil kurbağa: barajdan ortalama %9,6 uzak.\nKelebek 2 sporcuda hiç ölçülmedi, karışık hiç ölçülmedi.\nAntrenman dereceleri yarıştan ortalama %4 yavaş.\n\nSporcular\nSporcu 1: güçlü serbest, eksik kurbağa. Kurbağa ayak vuruşu ve kayış çalışması.\nSporcu 2: güçlü sırt, eksik kurbağa. Dönüş sonrası su altı evresine odaklan.\nSporcu 3: güçlü serbest, eksik sırt. Sırtta vücut pozisyonu drilleri.\nSporcu 4: güçlü kelebek, eksik kurbağa. Nefes zamanlamasını sabitle.\n\nBu derste öncelik\nKurbağa tekniği ve dönüşleri.\nKelebek ve karışık için ölçüm günü planla.';
const AI_PROGRAM = '1. gün: kurbağa tekniği\nIsınma 300 m serbest, 4x50 m karışık drill\nAna set 8x50 m kurbağa, 20 sn dinlenme\nTeknik 6x25 m kurbağa dönüş + su altı\nSoğuma 200 m kolay\n\n2. gün: tempo ve hız\nIsınma 400 m\nAna set 6x100 m serbest, 1:50 çıkış\nHız 8x25 m kelebek, 30 sn dinlenme\nSoğuma 200 m\n\n3. gün: ölçüm\nKelebek ve karışık 50 m derece ölçümü\nHaftalık toplam 6.200 m';
const SHOTS = [
  ['tanitim', null, async (p) => { await p.goto(`${BASE}/`); await p.waitForSelector('.landing'); await p.waitForTimeout(900); }],
  ['tanitim-acik', null, async (p) => { await p.goto(`${BASE}/`); await p.evaluate(() => localStorage.setItem('yuzme-tema', 'light')); await p.reload(); await p.waitForSelector('.landing'); await p.waitForTimeout(900); }],
  ['giris', null, async (p) => { await p.goto(`${BASE}/giris`); await p.waitForSelector('input[type=password]'); await p.waitForTimeout(500); }],
  ['onkayit-formu', null, async (p) => { await p.goto(`${BASE}/on-kayit/mavi-dalga`); await p.waitForSelector('.prereg-card form'); await p.waitForTimeout(700); }],
  ['super-panel', 'super', (p) => go(p, '/panel')], ['super-platform', 'super', (p) => go(p, '/platform')], ['super-kredi', 'super', (p) => go(p, '/kredi-yonetimi')], ['super-market', 'super', (p) => go(p, '/market')],
  ['admin-panel', 'admin', (p) => go(p, '/panel')], ['admin-dersler', 'admin', (p) => go(p, '/dersler')], ['admin-finans', 'admin', (p) => go(p, '/finans')], ['admin-personel', 'admin', (p) => go(p, '/personel')],
  ['admin-kulup', 'admin', (p) => go(p, '/kulup')], ['admin-performans', 'admin', (p) => go(p, '/performans')], ['admin-duyuru', 'admin', (p) => go(p, '/duyurular')],
  ['sekreter-kayit', 'sekreter', (p) => go(p, '/kayit')], ['sekreter-ogrenci', 'sekreter', (p) => go(p, '/ogrenciler')], ['sekreter-onkayit', 'sekreter', (p) => go(p, '/on-kayit-ayar')],
  ['sekreter-taksit', 'sekreter', async (p) => { await go(p, '/ogrenciler'); await p.locator('button:has-text("Taksitler")').first().click(); await p.waitForTimeout(400); await toEl(p, '.simple-list'); }],
  ['antrenor-panel', 'antrenor', (p) => go(p, '/panel')],
  ['antrenor-yoklama', 'antrenor', async (p) => { await go(p, '/yoklama'); for (const n of ['Mert Aydın Geldi', 'Elif Kara Geldi', 'Kerem Şen Geldi', 'Zeynep Toprak İzinli', 'Arda Güneş Geldi']) await p.locator(`[aria-label="${n}"]`).click(); await p.waitForTimeout(300); }],
  ['antrenor-ogrenci', 'antrenor', async (p) => { await go(p, '/ogrencilerim'); await p.locator('button:has-text("Yorumlar")').first().click(); await p.waitForTimeout(800); }],
  ['antrenor-rapor', 'antrenor', async (p) => { await go(p, '/ogrencilerim'); await toEl(p, '.attendance-grid'); }],
  ['antrenor-derece', 'antrenor', async (p) => { await go(p, '/derece'); const t = p.locator('.time-input'); await t.nth(0).fill('32.18'); await t.nth(1).fill('34.02'); }],
  ['antrenor-antrenman', 'antrenor', (p) => go(p, '/antrenman')], ['antrenor-musait', 'antrenor', (p) => go(p, '/musaitlik')], ['antrenor-kredi', 'antrenor', (p) => go(p, '/kredilerim')], ['antrenor-pazar', 'antrenor', (p) => go(p, '/antrenman-pazari')],
  ['antrenor-mesaj', 'antrenor', async (p) => { await go(p, '/mesajlar'); await p.locator('.chat-item:has-text("Selin")').click(); await p.waitForTimeout(700); }],
  ['sosyal', 'antrenor', (p) => go(p, '/sosyal')],
  ['veli-sporcular', 'veli', (p) => go(p, '/sporcularim')], ['veli-performans', 'veli', (p) => go(p, '/performans')], ['veli-barajlar', 'veli', (p) => go(p, '/barajlar')], ['veli-market', 'veli', (p) => go(p, '/market')],
  ['canli-liste', 'veli', (p) => go(p, '/canli-sonuclar')],
  ['canli-program', 'veli', async (p) => { await go(p, '/canli-sonuclar'); await p.locator('.live-list button:has-text("KIŞ KUPASI")').click(); await p.waitForSelector('.live-list button:has-text("50m Serbest")'); await p.waitForTimeout(400); }],
  ['canli-sonuc', 'veli', async (p) => { await go(p, '/canli-sonuclar'); await p.locator('.live-list button:has-text("KIŞ KUPASI")').click(); await p.locator('.live-list button:has-text("50m Serbest")').click(); await p.waitForSelector('.live-table tbody tr'); await p.waitForTimeout(500); }],
  ['ders-analizi', 'antrenor', async (p) => { await go(p, '/ders-analizi'); await p.click('button:has-text("Dersi analiz et")'); await p.waitForSelector('.ai-text'); await p.waitForTimeout(300); }],
  ['ders-program', 'antrenor', async (p) => { await go(p, '/ders-analizi'); await p.click('button:has-text("Haftalık")'); await p.fill('textarea', 'Yarışa iki hafta var, kurbağa dönüşlerine ağırlık ver'); await p.click('button:has-text("Haftalık program öner")'); await p.waitForSelector('text=1. gün'); await toEl(p, '.ai-col'); }],
  ['aydinlik-panel', 'veli', async (p) => { await p.evaluate(() => localStorage.setItem('yuzme-tema', 'light')); await p.reload(); await p.waitForTimeout(1500); await go(p, '/performans'); }],
];

async function context(browser, device, role, clock = true) {
  const ctx = await browser.newContext({ ...DEVICES[device], colorScheme: 'dark' });
  await ctx.route('**/ai/session', (r) => {
    const program = JSON.parse(r.request().postData() ?? '{}').task === 'program';
    r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ text: program ? AI_PROGRAM : AI_ANALYSIS }) });
  });
  await ctx.addInitScript(([event]) => { window.__fakeEvent = event; try { if (!localStorage.getItem('yuzme-tema')) localStorage.setItem('yuzme-tema', 'dark'); } catch { /* yok */ } }, [EVENT]);
  await ctx.route('**/tyf/meet-detail**', (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(role === 'veli' ? LIVE : { ...LIVE, sessions: [] }) }));
  await ctx.route('**/tyf/pdf**', (r) => r.fulfill({ status: 200, contentType: 'application/pdf', headers: { 'Access-Control-Allow-Origin': '*' }, body: Buffer.from('%PDF-1.4') }));
  await ctx.route('**/src/lib/tyf.ts*', async (r) => {
    const res = await r.fetch();
    const body = (await res.text()).replace(/async function readResultPdf\((\w+)\) \{/, 'async function readResultPdf($1) { if (window.__fakeEvent) return window.__fakeEvent;');
    await r.fulfill({ response: res, body });
  });
  const page = await ctx.newPage();
  if (clock) await page.clock.setFixedTime(new Date('2026-11-23T17:30:00'));
  if (role) {
    await page.goto(`${BASE}/giris`);
    await page.fill('input[type=email]', `${role}@demo.test`);
    await page.fill('input[type=password]', 'emulator-test-1234');
    await page.click('button:has-text("Giriş yap")');
    await page.waitForURL(/panel/, { timeout: 25000 });
    await page.waitForTimeout(700);
  }
  return { ctx, page };
}

const BOXES = join(OUT, 'kutular.json');
const boxes = existsSync(BOXES) ? JSON.parse(readFileSync(BOXES, 'utf8')) : {};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
for (const device of ['film', 'reel', 'tablet']) {
  for (const role of [null, 'super', 'admin', 'sekreter', 'antrenor', 'veli']) {
    for (const [id, owner, act] of SHOTS.filter((s) => s[1] === role && (!process.env.ONLY || s[0] === process.env.ONLY) && (device !== 'tablet' || TABLET.has(s[0])))) {
      const { ctx, page } = await context(browser, device, role);
      try {
        await act(page);
        await page.mouse.move(1, 1);
        await page.screenshot({ path: join(OUT, `${device}-${id}.png`) });
        // Videodaki dokunma halkası gerçek düğmenin üstüne gelsin diye görünen düğmelerin yeri saklanır.
        boxes[`${device}-${id}`] = await page.evaluate(() => {
          const vw = innerWidth; const vh = innerHeight;
          const seen = (e) => { const r = e.getBoundingClientRect(); return r.width > 20 && r.height > 14 && r.top >= 0 && r.bottom <= vh && r.left >= 0 && r.right <= vw ? { x: (r.left + r.width / 2) / vw, y: (r.top + r.height / 2) / vh } : null; };
          return [...document.querySelectorAll('button.primary, .chip.on, button[aria-pressed="true"], .live-list button, .chat-item, nav a.active')].map(seen).filter(Boolean).slice(0, 4);
        });
        // Telefonda sayfanın kaydırılmış hali de çekilir; videoda ekran içinde kayar.
        if (device === 'reel') {
          await page.evaluate(() => window.scrollTo(0, 0));
          await page.waitForTimeout(250);
          await page.screenshot({ path: join(OUT, `${device}-${id}-tam.png`), fullPage: true, clip: { x: 0, y: 0, width: 390, height: Math.min(2400, await page.evaluate(() => document.documentElement.scrollHeight)) } });
        }
      } catch (e) {
        console.log('HATA', device, id, owner, e.message.split('\n')[0]);
      }
      await ctx.close();
    }
  }
  if (process.env.ONLY) continue;
  // Kronometre gerçek saatle çalışır.
  const { ctx, page } = await context(browser, device, 'antrenor', false);
  await go(page, '/kronometre/kontrol');
  while (await page.locator('.lane-controls article').count()) { await page.locator('.lane-controls article').first().locator('button[aria-label*="sil"]').click(); await page.waitForTimeout(250); }
  for (let i = 0; i < 4; i += 1) { await page.click('button:has-text("Kulvar ekle")'); await page.waitForTimeout(350); }
  const lanes = page.locator('.lane-controls article');
  for (let i = 0; i < 4; i += 1) await lanes.nth(i).locator('select').first().selectOption(i % 2 ? 'w2' : 'w1');
  await page.waitForTimeout(400);
  await lanes.nth(1).locator('button:has-text("Çıkış sesi")').click();
  await page.click('button:has-text("Tümünü başlat")');
  await page.waitForTimeout(1200);
  await lanes.nth(3).locator('button:has-text("Durdur")').click();
  await page.waitForTimeout(700);
  await page.locator('.lane-board').evaluate((e) => e.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${device}-krono-kontrol.png`) });
  await page.evaluate(() => { location.hash = '/kronometre/ekran'; });
  await page.waitForSelector('.timer-screen .lane');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: join(OUT, `${device}-krono-ekran.png`) });
  await page.click('[aria-label="Ekranı dokunmaya kilitle"]');
  await page.waitForSelector('.touch-shield');
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(OUT, `${device}-krono-kilit.png`) });
  await page.keyboard.press('Escape');
  await page.waitForTimeout(400);
  await ctx.close();
}
await browser.close();
writeFileSync(BOXES, JSON.stringify(boxes, null, 1));
console.log('ekranlar cekildi');
