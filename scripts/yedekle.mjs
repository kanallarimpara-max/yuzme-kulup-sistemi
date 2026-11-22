import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const [yapilan, siradaki] = process.argv.slice(2);
if (!yapilan) {
  console.error('Kullanım: node scripts/yedekle.mjs "ne yapıldı" "sıradaki tek görev"');
  process.exit(1);
}

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim();
const yol = new URL('../docs/DURUM.md', import.meta.url);
const tarih = new Date().toLocaleDateString('sv-SE');
let durum = readFileSync(yol, 'utf8').replace(/\r\n/g, '\n');

if (siradaki) {
  durum = durum.replace(/(## Sıradaki tek görev\n\n)[\s\S]*?(\n\n## )/, `$1${siradaki}$2`);
}
durum = durum.replace(/(## Son kayıtlar\n\n)/, `$1- ${tarih}: ${yapilan}\n`);
writeFileSync(yol, durum);

git('add', '-A');
if (git('status', '--porcelain')) git('commit', '-m', yapilan);

try {
  git('push', '-u', 'origin', 'main');
  console.log(`GitHub yedeği alındı: ${git('rev-parse', '--short', 'HEAD')}`);
} catch {
  console.error('Commit yerelde duruyor, GitHub gönderimi başarısız. Bağlantı gelince tekrar çalıştır.');
  process.exit(2);
}
