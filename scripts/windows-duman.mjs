// Paketlenmiş Windows uygulamasını açar, tanıtımdan giriş ekranına geçer. CI içinde çalışır.
import { spawn } from 'node:child_process';
import { mkdirSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const dir = join('release', 'win-unpacked');
const exe = readdirSync(dir).find((f) => f.endsWith('.exe'));
const app = spawn(join(dir, exe), ['--remote-debugging-port=9333'], { stdio: 'ignore' });
mkdirSync('duman', { recursive: true });
let browser;
try {
  for (let i = 0; i < 40 && !browser; i += 1) {
    await new Promise((r) => setTimeout(r, 1500));
    browser = await chromium.connectOverCDP('http://127.0.0.1:9333').catch(() => undefined);
  }
  if (!browser) throw new Error('Uygulama açılmadı');
  const page = browser.contexts()[0].pages()[0];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.waitForSelector('a[href*="giris"]', { timeout: 30000 });
  await page.click('a[href*="giris"]');
  await page.waitForSelector('input[type=password]', { timeout: 15000 });
  const mic = await page.evaluate(() => Boolean(navigator.mediaDevices?.getUserMedia) && typeof RTCPeerConnection === 'function');
  await page.screenshot({ path: join('duman', 'windows.png') });
  if (!mic) throw new Error('Ses özellikleri kullanılamıyor');
  if (errors.length) throw new Error(errors.join(' | '));
  console.log('Windows uygulaması açıldı, giriş ekranı ve ses altyapısı hazır.');
} finally {
  await browser?.close().catch(() => undefined);
  app.kill();
}
process.exit(0);
