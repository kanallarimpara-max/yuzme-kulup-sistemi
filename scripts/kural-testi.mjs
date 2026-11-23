// Firestore kurallarını yalnız yerel emülatörde, kurgusal veriyle dener: npm run test:rules
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-yuzme-kural',
  firestore: { rules: readFileSync('firestore.rules', 'utf8') },
});

const profile = (role, clubId) => ({ role, clubId, name: role, tag: `@${role}`, isPublic: false });
const seed = {
  users: {
    super1: { role: 'super', name: 'super', tag: '@s', isPublic: false },
    admin1: profile('admin', 'c1'), sec1: profile('secretary', 'c1'), coach1: profile('coach', 'c1'), coach2: profile('coach', 'c1'),
    parentA: profile('parent', 'c1'), parentB: profile('parent', 'c1'), admin2: profile('admin', 'c2'),
  },
  clubs: { c1: { name: 'Kurgu Kulüp', slug: 'kurgu' } },
  lessons: { l1: { clubId: 'c1', name: 'Ders' } },
  students: {
    s1: { clubId: 'c1', parentId: 'parentA', coachId: 'coach1', lessonId: 'l1' },
    s2: { clubId: 'c1', parentId: 'parentB', coachId: 'coach2', lessonId: 'l1' },
  },
  enrollments: {
    e1: { clubId: 'c1', parentId: 'parentA', studentId: 's1' },
    e2: { clubId: 'c1', parentId: 'parentB', studentId: 's2' },
  },
  results: { r1: { clubId: 'c1', parentId: 'parentA', studentId: 's1' }, r2: { clubId: 'c1', parentId: 'parentB', studentId: 's2' } },
  comments: { y1: { clubId: 'c1', parentId: 'parentA', studentId: 's1' }, y2: { clubId: 'c1', parentId: 'parentB', studentId: 's2' } },
  attendance: { a1: { clubId: 'c1', lessonId: 'l1', marks: { s1: 'geldi', s2: 'gelmedi' } } },
  attendanceMarks: {
    m1: { clubId: 'c1', parentId: 'parentA', studentId: 's1', mark: 'geldi' },
    m2: { clubId: 'c1', parentId: 'parentB', studentId: 's2', mark: 'gelmedi' },
  },
  ledger: { k1: { userId: 'coach1', delta: 100 }, k2: { userId: 'coach2', delta: 50 } },
  creditRequests: { q1: { userId: 'coach1', status: 'bekliyor' } },
  expenses: { g1: { clubId: 'c1', amountKurus: 100 } },
  salaries: { p1: { clubId: 'c1', coachId: 'coach1' }, p2: { clubId: 'c1', coachId: 'coach2' } },
  notices: { n1: { clubId: 'c1', senderId: 'admin1', recipientIds: ['parentA'] } },
  chats: { sohbet1: { clubId: 'c1', memberIds: ['coach1', 'parentA'] } },
  prereg: { o1: { clubId: 'c1', parentId: 'parentA', status: 'yeni' } },
};

await env.clearFirestore();
await env.withSecurityRulesDisabled(async (ctx) => {
  const f = ctx.firestore();
  for (const [name, rows] of Object.entries(seed)) {
    for (const [id, row] of Object.entries(rows)) await setDoc(doc(f, name, id), row);
  }
});

const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const q = (f, name, ...pairs) => query(collection(f, name), ...pairs.map(([k, v]) => where(k, '==', v)));
const ok = (label, run) => ({ label, run, allow: true });
const no = (label, run) => ({ label, run, allow: false });
const A = as('parentA'); const C = as('coach1'); const S = as('sec1'); const M = as('admin1'); const X = as('admin2'); const U = as(null); const Z = as('super1');

const checks = [
  ok('oturumsuz kulüp okur', () => getDoc(doc(U, 'clubs', 'c1'))),
  ok('oturumsuz ders okur', () => getDocs(q(U, 'lessons', ['clubId', 'c1']))),
  no('oturumsuz öğrenci okuyamaz', () => getDocs(q(U, 'students', ['clubId', 'c1']))),
  no('oturumsuz kullanıcı listesi okuyamaz', () => getDocs(collection(U, 'users'))),

  ok('veli kendi çocuğunu okur', () => getDocs(q(A, 'students', ['clubId', 'c1'], ['parentId', 'parentA']))),
  no('veli tüm kulübü sorgulayamaz', () => getDocs(q(A, 'students', ['clubId', 'c1']))),
  no('veli başka çocuğu okuyamaz', () => getDoc(doc(A, 'students', 's2'))),
  ok('veli kendi ödemesini okur', () => getDocs(q(A, 'enrollments', ['clubId', 'c1'], ['parentId', 'parentA']))),
  no('veli başka ödemeyi okuyamaz', () => getDoc(doc(A, 'enrollments', 'e2'))),
  ok('veli kendi sonucunu okur', () => getDocs(q(A, 'results', ['clubId', 'c1'], ['parentId', 'parentA']))),
  no('veli kulüp sonuçlarını okuyamaz', () => getDocs(q(A, 'results', ['clubId', 'c1']))),
  no('veli başka sonucu okuyamaz', () => getDoc(doc(A, 'results', 'r2'))),
  ok('veli kendi yorumunu okur', () => getDocs(q(A, 'comments', ['clubId', 'c1'], ['parentId', 'parentA']))),
  no('veli başka yorumu okuyamaz', () => getDoc(doc(A, 'comments', 'y2'))),
  ok('veli kendi yoklamasını okur', () => getDocs(q(A, 'attendanceMarks', ['clubId', 'c1'], ['parentId', 'parentA']))),
  no('veli sınıf yoklamasını okuyamaz', () => getDoc(doc(A, 'attendance', 'a1'))),
  no('veli başka yoklamayı okuyamaz', () => getDoc(doc(A, 'attendanceMarks', 'm2'))),
  no('veli gider okuyamaz', () => getDocs(q(A, 'expenses', ['clubId', 'c1']))),
  no('veli rolünü yükseltemez', () => updateDoc(doc(A, 'users', 'parentA'), { role: 'admin' })),
  no('veli kulübünü değiştiremez', () => updateDoc(doc(A, 'users', 'parentA'), { clubId: 'c2' })),
  ok('veli profil görünürlüğünü değiştirir', () => updateDoc(doc(A, 'users', 'parentA'), { isPublic: true })),
  no('veli kendine kredi yazamaz', () => addDoc(collection(A, 'ledger'), { userId: 'parentA', delta: 9999 })),
  ok('veli ön kayıt gönderir', () => addDoc(collection(A, 'prereg'), { clubId: 'c1', parentId: 'parentA', status: 'yeni' })),
  no('veli başkası adına ön kayıt gönderemez', () => addDoc(collection(A, 'prereg'), { clubId: 'c1', parentId: 'parentB', status: 'yeni' })),
  ok('veli kendine gelen duyuruyu okur', () => getDocs(query(collection(A, 'notices'), where('recipientIds', 'array-contains', 'parentA')))),
  no('yeni kullanıcı kendini admin yapamaz', () => setDoc(doc(as('yeni'), 'users', 'yeni'), profile('admin', 'c1'))),
  ok('yeni kullanıcı veli profili açar', () => setDoc(doc(as('yeni2'), 'users', 'yeni2'), profile('parent', 'c1'))),

  ok('antrenör kendi öğrencisini okur', () => getDocs(q(C, 'students', ['clubId', 'c1'], ['coachId', 'coach1']))),
  no('antrenör tüm öğrencileri sorgulayamaz', () => getDocs(q(C, 'students', ['clubId', 'c1']))),
  no('antrenör başka öğrenciyi okuyamaz', () => getDoc(doc(C, 'students', 's2'))),
  ok('antrenör kendi maaşını okur', () => getDocs(q(C, 'salaries', ['clubId', 'c1'], ['coachId', 'coach1']))),
  no('antrenör başka maaşı okuyamaz', () => getDoc(doc(C, 'salaries', 'p2'))),
  ok('antrenör yoklama yazar', () => setDoc(doc(C, 'attendance', 'a2'), { clubId: 'c1', marks: {} })),
  ok('antrenör veli kopyasını yazar', () => setDoc(doc(C, 'attendanceMarks', 'm3'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', mark: 'izinli' })),
  ok('antrenör kendi cüzdanını okur', () => getDocs(q(C, 'ledger', ['userId', 'coach1']))),
  no('antrenör başka cüzdanı okuyamaz', () => getDoc(doc(C, 'ledger', 'k2'))),
  no('antrenör kendine kredi yazamaz', () => addDoc(collection(C, 'ledger'), { userId: 'coach1', delta: 9999 })),

  ok('sekreter kulüp öğrencilerini okur', () => getDocs(q(S, 'students', ['clubId', 'c1']))),
  ok('sekreter ön kayıtları okur', () => getDocs(q(S, 'prereg', ['clubId', 'c1']))),
  ok('sekreter ders gruplarını okur', () => getDocs(q(S, 'chats', ['clubId', 'c1']))),
  no('sekreter gider okuyamaz', () => getDocs(q(S, 'expenses', ['clubId', 'c1']))),

  ok('admin kulüp giderini okur', () => getDocs(q(M, 'expenses', ['clubId', 'c1']))),
  ok('admin antrenör profili açar', () => setDoc(doc(M, 'users', 'coach3'), profile('coach', 'c1'))),
  no('admin başka kulübe personel açamaz', () => setDoc(doc(M, 'users', 'coach4'), profile('coach', 'c2'))),
  no('admin kendine süper rol veremez', () => updateDoc(doc(M, 'users', 'admin1'), { role: 'super' })),
  no('başka kulüp admini öğrenci okuyamaz', () => getDocs(q(X, 'students', ['clubId', 'c1']))),
  no('başka kulüp admini gider okuyamaz', () => getDocs(q(X, 'expenses', ['clubId', 'c1']))),

  ok('süper admin kredi yazar', () => addDoc(collection(Z, 'ledger'), { userId: 'coach1', delta: 10 })),
  ok('süper admin tüm öğrencileri okur', () => getDocs(collection(Z, 'students'))),
  ok('süper admin tasarım yazar', () => setDoc(doc(Z, 'appDesign', 'main'), { appName: 'Kurgu' })),
  ok('oturumsuz tasarım okur', () => getDoc(doc(U, 'appDesign', 'main'))),
  no('kulüp admini tasarım yazamaz', () => setDoc(doc(M, 'appDesign', 'main'), { appName: 'x' })),
  ok('süper admin kulüp açar', () => setDoc(doc(Z, 'clubs', 'c3'), { name: 'Yeni', slug: 'yeni' })),
  ok('süper admin kulüp admini açar', () => setDoc(doc(Z, 'users', 'admin3'), profile('admin', 'c3'))),
  no('kulüp admini kulüp açamaz', () => setDoc(doc(M, 'clubs', 'c4'), { name: 'x', slug: 'x' })),
  no('kulüp admini başka admin açamaz', () => setDoc(doc(M, 'users', 'admin4'), profile('admin', 'c1'))),
];

let failed = 0;
for (const c of checks) {
  try {
    await (c.allow ? assertSucceeds(c.run()) : assertFails(c.run()));
    console.log(`GEÇTİ  ${c.label}`);
  } catch (error) {
    failed += 1;
    console.log(`KALDI  ${c.label}: ${error.message}`);
  }
}
console.log(`\n${checks.length - failed}/${checks.length} kural testi geçti.`);
await env.cleanup();
process.exit(failed ? 1 : 0);
