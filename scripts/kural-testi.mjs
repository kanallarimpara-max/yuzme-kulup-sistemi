// Firestore kurallarını yalnız yerel emülatörde, kurgusal veriyle dener: npm run test:rules
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

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
  products: { urun1: { name: 'Bone', priceCredits: 100, priceKurus: 10000 } },
  wallets: { coach1: { balance: 1000, held: 0 }, coach2: { balance: 50, held: 0 }, fakir: { balance: 10, held: 0 } },
  listings: { ilan1: { sellerId: 'coach2', title: 'Set', priceCredits: 50 }, ilan2: { sellerId: 'yenisatici', title: 'Set', priceCredits: 10 } },
  listingSets: { ilan1: { sellerId: 'coach2', sets: [] }, ilan2: { sellerId: 'yenisatici', sets: [] } },
};

const batch = (f, ops) => {
  const b = writeBatch(f);
  ops.forEach(([name, id, data]) => b.set(doc(f, name, id), data, { merge: true }));
  return b.commit();
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
  ok('antrenör krediyle ürün alır', () => batch(C, [['orders', 'o-ok', { userId: 'coach1', productId: 'urun1', productName: 'x', pay: 'kredi', credits: 100, kurus: 0, status: 'Ödendi' }], ['wallets', 'coach1', { balance: increment(-100), op: 'o-ok' }]])),
  no('aynı siparişle iki kez düşülemez', () => batch(C, [['orders', 'o-ok', { userId: 'coach1', productId: 'urun1', productName: 'x', pay: 'kredi', credits: 100, kurus: 0, status: 'Ödendi' }], ['wallets', 'coach1', { balance: increment(-100), op: 'o-ok' }]])),
  no('ürün fiyatından az ödenemez', () => batch(C, [['orders', 'o-az', { userId: 'coach1', productId: 'urun1', productName: 'x', pay: 'kredi', credits: 1, kurus: 0, status: 'Ödendi' }], ['wallets', 'coach1', { balance: increment(-1), op: 'o-az' }]])),
  no('bakiye düşmeden kredili sipariş açılamaz', () => setDoc(doc(C, 'orders', 'o-bedava'), { userId: 'coach1', productId: 'urun1', pay: 'kredi', credits: 100, status: 'Ödendi' })),
  no('sipariş bahanesiyle bakiye artırılamaz', () => batch(C, [['orders', 'o-art', { userId: 'coach1', productId: 'urun1', productName: 'x', pay: 'kredi', credits: 100, kurus: 0, status: 'Ödendi' }], ['wallets', 'coach1', { balance: increment(100), op: 'o-art' }]])),
  no('bakiyeden fazla ürün alınamaz', () => batch(as('fakir'), [['orders', 'o-fakir', { userId: 'fakir', productId: 'urun1', productName: 'x', pay: 'kredi', credits: 100, kurus: 0, status: 'Ödendi' }], ['wallets', 'fakir', { balance: increment(-100), op: 'o-fakir' }]])),
  no('antrenör bakiyesini doğrudan yazamaz', () => updateDoc(doc(C, 'wallets', 'coach1'), { balance: 999999 })),
  no('başkasının cüzdanı okunamaz', () => getDoc(doc(C, 'wallets', 'coach2'))),
  ok('bozdurma tutarı bloke edilir', () => batch(C, [['creditRequests', 'b-ok', { userId: 'coach1', type: 'bozdurma', credits: 100, kurus: 500, status: 'bekliyor' }], ['wallets', 'coach1', { held: increment(100), op: 'b-ok' }]])),
  no('bloke olmadan bozdurma açılamaz', () => setDoc(doc(C, 'creditRequests', 'b-no'), { userId: 'coach1', type: 'bozdurma', credits: 100, kurus: 500, status: 'bekliyor' })),
  no('bakiyeden fazla bozdurulamaz', () => batch(C, [['creditRequests', 'b-cok', { userId: 'coach1', type: 'bozdurma', credits: 99999, kurus: 500, status: 'bekliyor' }], ['wallets', 'coach1', { held: increment(99999), op: 'b-cok' }]])),
  no('antrenör talebini kendi onaylayamaz', () => updateDoc(doc(C, 'creditRequests', 'q1'), { status: 'onaylandi' })),
  no('satın almadan setler okunamaz', () => getDoc(doc(C, 'listingSets', 'ilan1'))),
  no('alıcı satıcıya eksik ödeyemez', () => batch(C, [['purchases', 'coach1_ilan1', { buyerId: 'coach1', listingId: 'ilan1', sellerId: 'coach2' }], ['wallets', 'coach1', { balance: increment(-1), op: 'coach1_ilan1' }], ['wallets', 'coach2', { balance: increment(1), op: 'coach1_ilan1' }]])),
  no('satıcıya fazla kredi yazılamaz', () => batch(C, [['purchases', 'coach1_ilan1', { buyerId: 'coach1', listingId: 'ilan1', sellerId: 'coach2' }], ['wallets', 'coach1', { balance: increment(-50), op: 'coach1_ilan1' }], ['wallets', 'coach2', { balance: increment(5000), op: 'coach1_ilan1' }]])),
  ok('antrenör antrenman satın alır', () => batch(C, [['purchases', 'coach1_ilan1', { buyerId: 'coach1', listingId: 'ilan1', sellerId: 'coach2' }], ['wallets', 'coach1', { balance: increment(-50), op: 'coach1_ilan1' }], ['wallets', 'coach2', { balance: increment(50), op: 'coach1_ilan1' }]])),
  ok('satın alınca setler okunur', () => getDoc(doc(C, 'listingSets', 'ilan1'))),
  no('aynı ilan iki kez satın alınamaz', () => batch(C, [['purchases', 'coach1_ilan1', { buyerId: 'coach1', listingId: 'ilan1', sellerId: 'coach2' }], ['wallets', 'coach1', { balance: increment(-50), op: 'coach1_ilan1' }], ['wallets', 'coach2', { balance: increment(50), op: 'coach1_ilan1' }]])),
  ok('satıcının ilk cüzdanı satışla açılır', () => batch(C, [['purchases', 'coach1_ilan2', { buyerId: 'coach1', listingId: 'ilan2', sellerId: 'yenisatici' }], ['wallets', 'coach1', { balance: increment(-10), op: 'coach1_ilan2' }], ['wallets', 'yenisatici', { balance: increment(10), held: increment(0), op: 'coach1_ilan2' }]])),
  ok('grup üyesi aramaya katılır', () => setDoc(doc(C, 'groupPeers', 'sohbet1_coach1'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentA'], uid: 'coach1', session: 's1', lastSeen: 1 })),
  no('grup dışı kişi aramaya katılamaz', () => setDoc(doc(as('parentB'), 'groupPeers', 'sohbet1_parentB'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentA'], uid: 'parentB', session: 's2', lastSeen: 1 })),
  no('grup dışı kişi aramayı göremez', () => getDoc(doc(as('parentB'), 'groupPeers', 'sohbet1_coach1'))),
  ok('grup üyesi sinyal gönderir', () => setDoc(doc(C, 'groupSignals', 's1_s3'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentA'], from: 'coach1', to: 'parentA', fromSession: 's1', toSession: 's3', offer: '{}' })),
  no('başkası adına sinyal gönderilemez', () => setDoc(doc(as('parentB'), 'groupSignals', 's9'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentB'], from: 'coach1', to: 'parentB', offer: '{}' })),
  no('sinyal alıcısı teklifi değiştiremez', () => updateDoc(doc(A, 'groupSignals', 's1_s3'), { offer: 'x' })),
  ok('sinyal alıcısı yanıt yazar', () => updateDoc(doc(A, 'groupSignals', 's1_s3'), { answer: '{}' })),
  ok('kullanıcı saatini eşitler', () => setDoc(doc(C, 'clockSync', 'coach1'), { at: serverTimestamp() })),
  no('saat kaydı elle yazılamaz', () => setDoc(doc(C, 'clockSync', 'coach1'), { at: new Date(0) })),
  no('başkasının saat kaydı yazılamaz', () => setDoc(doc(C, 'clockSync', 'coach2'), { at: serverTimestamp() })),
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
