// Emülatör açıkken kurgusal veriyi yükler ve uygulamayı 5175 portunda emülatöre bağlı çalıştırır.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createServer } from 'vite';

execFileSync(process.execPath, ['scripts/emulator-veri.mjs'], { stdio: 'inherit' });
const envDir = mkdtempSync(join(tmpdir(), 'yuzme-e2e-'));
writeFileSync(join(envDir, '.env'), [
  'VITE_FIREBASE_API_KEY=demo-key', 'VITE_FIREBASE_AUTH_DOMAIN=demo-yuzme-e2e.firebaseapp.com', 'VITE_FIREBASE_PROJECT_ID=demo-yuzme-e2e',
  'VITE_FIREBASE_APP_ID=1:1:web:1', 'VITE_FIREBASE_MESSAGING_SENDER_ID=1', 'VITE_USE_EMULATOR=1', 'VITE_WORKER_URL=http://127.0.0.1:8798', '',
].join('\n'));
const server = await createServer({ envDir, server: { port: 5175, strictPort: true } });
await server.listen();
console.log('e2e hazir');
await new Promise((resolve) => setTimeout(resolve, Number(process.env.E2E_MS ?? 14400000)));
await server.close();
process.exit(0);
