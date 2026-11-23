// Yalnız yerel emülatöre kurgusal veri yükler. Gerçek Firebase projesine bağlanamaz.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { demoData } from '../src/lib/seed.ts';

const projectId = 'demo-yuzme-e2e';
const password = 'emulator-test-1234';
const env = await initializeTestEnvironment({
  projectId,
  firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
});
await env.clearFirestore();

const extra = {
  enrollments: [{ id: 'e1', clubId: 'demo-club', studentId: 's1', parentId: 'u-parent', lessonId: 'l1', coachId: 'u-coach', listKurus: 350000, netKurus: 350000, totalKurus: 350000, discountCode: '', installments: [{ no: 1, dueDate: '2026-12-01', amountKurus: 350000 }] }],
  results: [{ id: 'r1', clubId: 'demo-club', studentId: 's1', parentId: 'u-parent', stroke: 'serbest', distance: 50, timeMs: 32000, date: '2026-11-01', pool: '25m', source: 'manuel' }],
  comments: [{ id: 'y1', clubId: 'demo-club', studentId: 's1', parentId: 'u-parent', coachId: 'u-coach', text: 'Kurgusal yorum', date: '2026-11-02' }],
  attendance: [{ id: 'a1', clubId: 'demo-club', lessonId: 'l1', coachId: 'u-coach', date: '2026-11-02', marks: { s1: 'geldi' } }],
  attendanceMarks: [{ id: 'a1_s1', clubId: 'demo-club', studentId: 's1', parentId: 'u-parent', lessonId: 'l1', date: '2026-11-02', mark: 'geldi' }],
  notices: [{ id: 'n1', clubId: 'demo-club', senderId: 'u-admin', kind: 'yaris', title: 'Kurgusal yarış', body: 'Test', date: '2026-12-10', recipientIds: ['u-parent', 'u-coach'], readBy: [] }],
  chats: [{ id: 'lesson-l1-u-coach', clubId: 'demo-club', name: 'Gelişim Grubu', lessonId: 'l1', memberIds: ['u-coach', 'u-parent'] }],
  packages: [{ id: 'paket1', name: 'Başlangıç', credits: 500, priceKurus: 10000 }],
  settings: [{ id: 'platform', bank: 'Kurgu Bankası', holder: 'Kurgu', iban: 'TR000000000000000000000000', rateCredits: 1000, rateKurus: 5000 }],
};

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  for (const [name, rows] of Object.entries({ ...demoData, ...extra })) {
    for (const { id, ...row } of rows) {
      const { email: _email, ...clean } = row;
      await setDoc(doc(db, name, id), clean);
    }
  }
});

for (const user of demoData.users) {
  const res = await fetch(`http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/projects/${projectId}/accounts`, {
    method: 'POST',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify({ localId: user.id, email: user.email, password }),
  });
  if (!res.ok && !(await res.text()).includes('DUPLICATE')) throw new Error(`Hesap açılamadı: ${user.id}`);
}
await env.cleanup();
console.log('emulator verisi hazir');
process.exit(0);
