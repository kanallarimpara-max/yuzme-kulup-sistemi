// İndirilen Firebase servis anahtarını Worker secret yapar, sonra indirilen dosyayı siler. İçeriği ekrana yazmaz.
import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const PROJECT = 'yuzme-kulup-sistemi';
const folder = join(homedir(), 'Downloads');
const files = readdirSync(folder)
  .filter((name) => name.startsWith(`${PROJECT}-firebase-adminsdk-`) && name.endsWith('.json'))
  .map((name) => join(folder, name))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

if (files.length !== 1) {
  console.log(files.length ? `Indirilenler klasorunde ${files.length} anahtar dosyasi var, yalniz yenisini birak.` : 'Indirilenler klasorunde anahtar dosyasi bulunamadi.');
  process.exit(1);
}

const key = JSON.parse(readFileSync(files[0], 'utf8'));
if (key.type !== 'service_account' || key.project_id !== PROJECT || !key.client_email || !key.private_key) {
  console.log('Dosya bu projenin servis anahtari degil. Hicbir sey degistirilmedi.');
  process.exit(1);
}

const wrangler = (args, input) => spawnSync(`npx.cmd --yes wrangler@4 ${args} --config worker/wrangler.toml`, {
  shell: true, input, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});

if (wrangler('secret put FIREBASE_SERVICE_ACCOUNT', JSON.stringify(key)).status !== 0) {
  console.log('Anahtar kaydedilemedi. Dosya silinmedi.');
  process.exit(1);
}
// Wrangler JSON'dan önce başlık yazabilir; yalnız secret adları aranır.
const saved = (wrangler('secret list --format json').stdout || '').includes('"FIREBASE_SERVICE_ACCOUNT"');
if (!saved) {
  console.log('Kayit dogrulanamadi. Dosya silinmedi.');
  process.exit(1);
}
rmSync(files[0]);
console.log('TAMAM: servis anahtari Worker a kaydedildi, indirilen dosya silindi.');
