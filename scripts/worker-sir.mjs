// Cloudinary değerlerini ekranda göstermeden Worker secret olarak kaydeder. Değerler diske yazılmaz.
import { spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline';
import { Writable } from 'node:stream';

const FIELDS = [
  ['CLOUDINARY_CLOUD_NAME', 'Cloud name', /^[a-zA-Z0-9_-]{2,}$/],
  ['CLOUDINARY_API_KEY', 'API Key', /^\d{6,}$/],
  ['CLOUDINARY_API_SECRET', 'API Secret', /^[\w-]{16,}$/],
];
const silent = new Writable({ write: (_chunk, _encoding, done) => done() });

function ask(label) {
  process.stdout.write(`${label} yapistir ve Enter'a bas (ekranda gorunmez): `);
  const rl = createInterface({ input: process.stdin, output: silent, terminal: true });
  return new Promise((resolve) => rl.question('', (answer) => {
    rl.close();
    process.stdout.write('\n');
    resolve(answer.trim());
  }));
}

const wrangler = (args, input) => spawnSync('npx.cmd --yes wrangler@4 ' + args + ' --config worker/wrangler.toml', {
  shell: true, input, encoding: 'utf8', env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
});

for (const [name, label, pattern] of FIELDS) {
  let value = await ask(label);
  while (!pattern.test(value)) {
    console.log(`${label} bicimi uygun degil, tekrar dene.`);
    value = await ask(label);
  }
  const result = wrangler(`secret put ${name}`, value);
  if (result.status !== 0) {
    console.log(`${label} kaydedilemedi. Komutu yeniden calistir.`);
    process.exit(1);
  }
  console.log(`${label} kaydedildi.`);
}

const saved = JSON.parse(wrangler('secret list --format json').stdout || '[]').map((s) => s.name);
const missing = FIELDS.map(([name]) => name).filter((name) => !saved.includes(name));
console.log(missing.length ? `Eksik: ${missing.join(', ')}` : 'TAMAM: uc deger Worker a kaydedildi.');
process.exit(missing.length ? 1 : 0);
