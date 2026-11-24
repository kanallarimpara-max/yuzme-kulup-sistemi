// Firestore kurallarını yalnız yerel emülatörde, kurgusal veriyle dener: npm run test:rules
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { assertFails, assertSucceeds, initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, increment, query, serverTimestamp, setDoc, updateDoc, where, writeBatch } from 'firebase/firestore';

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
  results: { r1: { clubId: 'c1', parentId: 'parentA', studentId: 's1' }, r2: { clubId: 'c1', parentId: 'parentB', studentId: 's2' }, rt: { clubId: 'c1', parentId: 'parentA', studentId: 's1', kind: 'antrenman', source: 'manuel' } },
  comments: { y1: { clubId: 'c1', parentId: 'parentA', studentId: 's1' }, y2: { clubId: 'c1', parentId: 'parentB', studentId: 's2' } },
  aiPrograms: { p1: { clubId: 'c1', coachId: 'coach1', lessonId: 'l1', period: 'gunluk', text: 'Program', date: '2026-11-24' } },
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
  packages: { paket1: { name: 'Paket', credits: 500, priceKurus: 10000 } },
  branches: { sube1: { clubId: 'c1', name: 'Şube' } },
  models: { model1: { clubId: 'c1', name: 'Grup' } },
  lessonPay: { l1: { clubId: 'c1', coachIds: ['coach1'], coachPayKurus: 150000 } },
  workouts: { w1: { clubId: 'c1', coachId: 'coach1', lessonId: 'l1', title: 'x', sets: [] }, w2: { clubId: 'c1', coachId: 'coach2', lessonId: 'l2', title: 'y', sets: [] } },
  parentAccess: { parentA: { clubId: 'c1', lessonIds: ['l1'] } },
  availability: { v1: { clubId: 'c1', coachId: 'coach1' } },
  timers: { 'timer-coach2': { clubId: 'c1', lanes: [] } },
  posts: {
    post1: { authorId: 'parentA', isPublic: true, audience: ['parentA'], likes: [], comments: [{ userId: 'coach1', text: 'y', at: 1 }], caption: 'x', kind: 'foto', imageUrl: '' },
    post2: { authorId: 'parentA', isPublic: true, audience: ['parentA'], likes: [], comments: [], caption: 'x', kind: 'foto', imageUrl: '' },
  },
  wallets: { coach1: { balance: 1000, held: 0 }, coach2: { balance: 50, held: 0 }, fakir: { balance: 10, held: 0 } },
  listings: { ilan1: { sellerId: 'coach2', title: 'Set', priceCredits: 50 }, ilan2: { sellerId: 'yenisatici', title: 'Set', priceCredits: 10 } },
  listingSets: { ilan1: { sellerId: 'coach2', sets: [] }, ilan2: { sellerId: 'yenisatici', sets: [] } },
};

const withTag = (f, uid, row, key = `${uid}etiket`) => batch(f, [['users', uid, { ...row, tag: `@${key}` }], ['tags', key, { uid }]]);
const tokenId = createHash('sha256').update('cihaz-token').digest('hex');
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

const program = (coachId, extra = {}) => ({ clubId: 'c1', coachId, lessonId: 'l1', period: 'haftalik', text: 'Plan', date: '2026-11-24', ...extra });
const checks = [
  ok('antrenör kendi AI programını kaydeder', () => addDoc(collection(C, 'aiPrograms'), program('coach1'))),
  no('antrenör başkası adına AI programı kaydedemez', () => addDoc(collection(C, 'aiPrograms'), program('coach2'))),
  no('veli AI programı kaydedemez', () => addDoc(collection(A, 'aiPrograms'), program('parentA'))),
  no('geçersiz süreli program kaydedilemez', () => addDoc(collection(C, 'aiPrograms'), program('coach1', { period: 'yillik' }))),
  ok('antrenör kendi programlarını okur', () => getDocs(q(C, 'aiPrograms', ['clubId', 'c1'], ['coachId', 'coach1']))),
  no('başka antrenör programı okuyamaz', () => getDoc(doc(as('coach2'), 'aiPrograms', 'p1'))),
  no('veli AI programını okuyamaz', () => getDoc(doc(A, 'aiPrograms', 'p1'))),
  ok('kulüp yöneticisi programı okur', () => getDoc(doc(M, 'aiPrograms', 'p1'))),
  no('başka kulüp yöneticisi programı okuyamaz', () => getDoc(doc(X, 'aiPrograms', 'p1'))),
  no('AI programı değiştirilemez', () => updateDoc(doc(C, 'aiPrograms', 'p1'), { text: 'x' })),
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
  no('yeni kullanıcı kendini admin yapamaz', () => withTag(as('yeni'), 'yeni', profile('admin', 'c1'))),
  ok('yeni kullanıcı veli profili açar', () => withTag(as('yeni2'), 'yeni2', profile('parent', 'c1'))),
  no('alınmış etiket tekrar kullanılamaz', () => withTag(as('yeni3'), 'yeni3', profile('parent', 'c1'), 'yeni2etiket')),
  ok('tam etiketle kişi bulunur', () => getDoc(doc(A, 'tags', 'yeni2etiket'))),
  no('etiketler listelenemez', () => getDocs(collection(A, 'tags'))),

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
  ok('admin antrenör profili açar', () => withTag(M, 'coach3', profile('coach', 'c1'))),
  no('admin başka kulübe personel açamaz', () => withTag(M, 'coach4', profile('coach', 'c2'))),
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
  ok('kullanıcı cihazını bildirime kaydeder', () => setDoc(doc(C, 'pushTokens', tokenId), { uid: 'coach1', token: 'cihaz-token', platform: 'web', updatedAt: 1 })),
  no('cihaz kaydı okunamaz', () => getDoc(doc(C, 'pushTokens', tokenId))),
  no('cihaz kayıtları listelenemez', () => getDocs(collection(Z, 'pushTokens'))),
  no('başkası adına cihaz kaydedilemez', () => setDoc(doc(A, 'pushTokens', tokenId), { uid: 'coach1', token: 'cihaz-token', platform: 'web', updatedAt: 1 })),
  no('token ile uyuşmayan kayıt açılamaz', () => setDoc(doc(C, 'pushTokens', 'uydurma'), { uid: 'coach1', token: 'cihaz-token', platform: 'web', updatedAt: 1 })),
  no('başkasının cihaz kaydı silinemez', () => deleteDoc(doc(A, 'pushTokens', tokenId))),
  ok('kullanıcı kendi cihaz kaydını siler', () => deleteDoc(doc(C, 'pushTokens', tokenId))),
  no('bildirim günlüğü yazılamaz', () => setDoc(doc(Z, 'pushLog', 'notices_n1'), { next: 0 })),
  // Saldırı senaryoları
  no('başka kulübün öğrencisi kendi kulübüne çekilemez', () => updateDoc(doc(X, 'students', 's1'), { clubId: 'c2' })),
  no('başka kulübün ödemesi kendi kulübüne çekilemez', () => updateDoc(doc(X, 'enrollments', 'e1'), { clubId: 'c2' })),
  no('başka kulübün dersi ele geçirilemez', () => updateDoc(doc(X, 'lessons', 'l1'), { clubId: 'c2' })),
  no('başka kulübün şubesi ele geçirilemez', () => setDoc(doc(X, 'branches', 'sube1'), { clubId: 'c2', name: 'x' })),
  no('başka kulübün modeli ele geçirilemez', () => setDoc(doc(X, 'models', 'model1'), { clubId: 'c2', name: 'x' })),
  no('başka kulübün gideri ele geçirilemez', () => updateDoc(doc(X, 'expenses', 'g1'), { clubId: 'c2' })),
  no('başka kulübün maaşı ele geçirilemez', () => updateDoc(doc(X, 'salaries', 'p1'), { clubId: 'c2' })),
  no('başka kulübün sonucu ele geçirilemez', () => updateDoc(doc(X, 'results', 'r1'), { clubId: 'c2' })),
  no('başka kulübün yoklaması ele geçirilemez', () => updateDoc(doc(X, 'attendance', 'a1'), { clubId: 'c2' })),
  no('oturumsuz kişi antrenör maaşını göremez', () => getDoc(doc(U, 'lessonPay', 'l1'))),
  no('veli antrenör maaşını göremez', () => getDoc(doc(A, 'lessonPay', 'l1'))),
  no('ders kaydına maaş yazılamaz', () => setDoc(doc(M, 'lessons', 'l9'), { clubId: 'c1', name: 'x', coachIds: [], coachPayKurus: 100 })),
  ok('admin antrenör maaşını görür', () => getDoc(doc(M, 'lessonPay', 'l1'))),
  ok('dersin antrenörü kendi maaşını görür', () => getDocs(query(collection(C, 'lessonPay'), where('coachIds', 'array-contains', 'coach1')))),
  no('dersin dışındaki antrenör maaşı göremez', () => getDoc(doc(as('coach2'), 'lessonPay', 'l1'))),
  no('yabancı kişi ders grubuna kendini ekleyemez', () => updateDoc(doc(as('parentB'), 'chats', 'sohbet1'), { memberIds: ['coach1', 'parentA', 'parentB'] })),
  no('yabancı kişi başka iki kişinin sohbetini açamaz', () => setDoc(doc(as('parentB'), 'chats', 'dm-coach1-parentB'), { name: '', direct: true, memberIds: ['coach1', 'parentB'] })),
  no('sohbette olmayan kişi mesaj gönderemez', () => addDoc(collection(as('parentB'), 'messages'), { chatId: 'sohbet1', memberIds: ['parentB', 'coach1'], senderId: 'parentB', kind: 'text', text: 'x' })),
  ok('sohbet üyesi mesaj gönderir', () => addDoc(collection(A, 'messages'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentA'], senderId: 'parentA', kind: 'text', text: 'x' })),
  no('mesaj alıcıları değiştirilemez', () => addDoc(collection(A, 'messages'), { chatId: 'sohbet1', memberIds: ['parentA'], senderId: 'parentA', kind: 'text', text: 'x' })),
  no('mesajda zararlı bağlantı olamaz', () => addDoc(collection(A, 'messages'), { chatId: 'sohbet1', memberIds: ['coach1', 'parentA'], senderId: 'parentA', kind: 'image', url: 'javascript:alert(1)' })),
  no('sohbetsiz kişi arama başlatamaz', () => addDoc(collection(as('parentB'), 'calls'), { chatId: 'sohbet1', memberIds: ['parentB', 'coach1'], callerId: 'parentB', calleeId: 'coach1', status: 'caliyor', offer: '{}' })),
  no('başkası adına duyuru gönderilemez', () => addDoc(collection(C, 'notices'), { clubId: 'c1', senderId: 'admin1', kind: 'duyuru', title: 'x', body: 'x', recipientIds: ['parentA'], readBy: [] })),
  no('kişi isteğine üçüncü kişi eklenemez', () => setDoc(doc(as('parentB'), 'contacts', 'c-x'), { fromId: 'parentB', toId: 'coach1', memberIds: ['parentB', 'coach1', 'parentA'], status: 'bekliyor' })),
  no('başkasının gönderi yorumu silinemez', () => updateDoc(doc(as('parentB'), 'posts', 'post1'), { comments: [] })),
  no('başkası adına yorum yazılamaz', () => updateDoc(doc(as('parentB'), 'posts', 'post1'), { comments: [{ userId: 'coach1', text: 'y', at: 1 }, { userId: 'coach1', text: 'sahte', at: 2 }] })),
  no('başkası adına beğeni eklenemez', () => updateDoc(doc(as('parentB'), 'posts', 'post1'), { likes: ['coach1', 'parentA'] })),
  no('başkası gönderiyi başka yazara aktaramaz', () => updateDoc(doc(as('coach1'), 'posts', 'post1'), { authorId: 'coach1' })),
  no('kulübe kendini ekleyen kişi antrenman okuyamaz', () => getDocs(q(as('yeni2'), 'workouts', ['clubId', 'c1']))),
  no('veli müsaitlik saatlerini okuyamaz', () => getDocs(q(A, 'availability', ['clubId', 'c1']))),
  no('veli kronometreyi okuyamaz', () => getDocs(q(A, 'timers', ['clubId', 'c1']))),
  no('başka kulübe kronometre yazılamaz', () => setDoc(doc(as('coach1'), 'timers', 'timer-coach1'), { clubId: 'c2', lanes: [] })),
  no('sonuç başka velinin kaydına bağlanamaz', () => setDoc(doc(C, 'results', 'r-yanlis'), { clubId: 'c1', parentId: 'parentB', studentId: 's1' })),
  no('antrenör yarış derecesi giremez', () => setDoc(doc(C, 'results', 'k-y1'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'manuel', kind: 'yaris' })),
  no('antrenör türsüz derece giremez', () => setDoc(doc(C, 'results', 'k-y2'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'manuel' })),
  no('antrenör TYF kaydı oluşturamaz', () => setDoc(doc(C, 'results', 'k-y3'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'tyf', kind: 'antrenman' })),
  ok('antrenör antrenman derecesi girer', () => setDoc(doc(C, 'results', 'k-a1'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'manuel', kind: 'antrenman' })),
  no('antrenör antrenman derecesini yarışa çeviremez', () => updateDoc(doc(C, 'results', 'rt'), { kind: 'yaris' })),
  no('antrenör yarış derecesini değiştiremez', () => updateDoc(doc(C, 'results', 'r1'), { timeMs: 1 })),
  no('antrenör yarış derecesini silemez', () => deleteDoc(doc(C, 'results', 'r1'))),
  ok('admin yarış derecesi girer', () => setDoc(doc(M, 'results', 'k-y4'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'manuel', kind: 'yaris' })),
  no('veli derece giremez', () => setDoc(doc(A, 'results', 'k-v1'), { clubId: 'c1', parentId: 'parentA', studentId: 's1', source: 'manuel', kind: 'antrenman' })),
  no('kimse TYF yarış listesine yazamaz', () => setDoc(doc(M, 'tyfMeets', 'x'), { title: 'x' })),
  ok('TYF yarış listesi okunur', () => getDocs(collection(A, 'tyfMeets'))),
  no('kimse baraj listesine yazamaz', () => setDoc(doc(M, 'standardSets', 'current'), { payload: 'x' })),
  ok('baraj listesi okunur', () => getDoc(doc(A, 'standardSets', 'current'))),
  no('antrenör başkasının öğrencisine yorum yazamaz', () => setDoc(doc(C, 'comments', 'y-yanlis'), { clubId: 'c1', coachId: 'coach1', parentId: 'parentB', studentId: 's2' })),
  no('tüm kullanıcılar listelenemez', () => getDocs(collection(A, 'users'))),
  no('admin kulüp adresini değiştiremez', () => updateDoc(doc(M, 'clubs', 'c1'), { slug: 'baska' })),
  no('ürün ucuza TL siparişi verilemez', () => addDoc(collection(C, 'orders'), { userId: 'coach1', productId: 'urun1', productName: 'x', pay: 'tl', credits: 0, kurus: 1, status: 'Ödeme bekliyor' })),
  no('dekont zararlı bağlantı olamaz', () => addDoc(collection(C, 'creditRequests'), { userId: 'coach1', type: 'yukleme', credits: 500, kurus: 100, receiptUrl: 'javascript:alert(1)', status: 'bekliyor', packageId: 'paket1' })),
  no('paketten fazla kredi talep edilemez', () => addDoc(collection(C, 'creditRequests'), { userId: 'coach1', type: 'yukleme', credits: 999999, kurus: 100, receiptUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', status: 'bekliyor', packageId: 'paket1' })),
  no('veli başka etiketle profil açamaz', () => setDoc(doc(as('sahte'), 'users', 'sahte'), { ...profile('parent', 'c1'), tag: '@admin1' })),
  ok('veli çocuğunun dersindeki antrenmanı görür', () => getDocs(query(collection(A, 'workouts'), where('clubId', '==', 'c1'), where('lessonId', 'in', ['l1'])))),
  no('veli başka dersin antrenmanını göremez', () => getDocs(query(collection(A, 'workouts'), where('clubId', '==', 'c1'), where('lessonId', 'in', ['l2'])))),
  ok('kişi isteği gönderilir', () => setDoc(doc(as('coach2'), 'contacts', 'contact-coach2-parentB'), { fromId: 'coach2', toId: 'parentB', memberIds: ['coach2', 'parentB'], status: 'bekliyor' })),
  no('istek kabul edilmeden özel sohbet açılamaz', () => setDoc(doc(as('coach2'), 'chats', 'dm-coach2-parentB'), { name: '', direct: true, memberIds: ['coach2', 'parentB'] })),
  no('istek sahibi kendi isteğini kabul edemez', () => updateDoc(doc(as('coach2'), 'contacts', 'contact-coach2-parentB'), { status: 'kabul' })),
  ok('alıcı kabul edince sohbet açılır', () => batch(as('parentB'), [['contacts', 'contact-coach2-parentB', { status: 'kabul' }], ['chats', 'dm-coach2-parentB', { name: '', direct: true, memberIds: ['coach2', 'parentB'] }]])),
  ok('özel sohbette mesaj gönderilir', () => addDoc(collection(as('coach2'), 'messages'), { chatId: 'dm-coach2-parentB', memberIds: ['coach2', 'parentB'], senderId: 'coach2', kind: 'text', text: 'merhaba' })),
  ok('arama başlatılır', () => setDoc(doc(as('coach2'), 'calls', 'arama1'), { chatId: 'dm-coach2-parentB', memberIds: ['coach2', 'parentB'], callerId: 'coach2', calleeId: 'parentB', status: 'caliyor', offer: '{}' })),
  no('arayan yanıtı sahteleyemez', () => updateDoc(doc(as('coach2'), 'calls', 'arama1'), { status: 'bagli', answer: '{}' })),
  ok('aranan aramayı açar', () => updateDoc(doc(as('parentB'), 'calls', 'arama1'), { status: 'bagli', answer: '{}' })),
  ok('kullanıcı kendi adına beğenir', () => updateDoc(doc(as('parentB'), 'posts', 'post1'), { likes: ['parentB'] })),
  ok('yorumsuz gönderiye ilk yorum yazılır', () => updateDoc(doc(as('parentB'), 'posts', 'post2'), { comments: [{ userId: 'parentB', text: 'ilk', at: 1 }] })),
  ok('kullanıcı kendi adına yorum yazar', () => updateDoc(doc(as('parentB'), 'posts', 'post1'), { comments: [{ userId: 'coach1', text: 'y', at: 1 }, { userId: 'parentB', text: 'güzel', at: 2 }] })),
  ok('yazar gönderisini gizler', () => updateDoc(doc(A, 'posts', 'post1'), { isPublic: false })),
  ok('antrenör kredi paketi talep eder', () => addDoc(collection(C, 'creditRequests'), { userId: 'coach1', type: 'yukleme', packageId: 'paket1', credits: 500, kurus: 10000, receiptUrl: 'https://res.cloudinary.com/x/image/upload/a.jpg', status: 'bekliyor' })),
  ok('doğru fiyatla TL siparişi verilir', () => addDoc(collection(C, 'orders'), { userId: 'coach1', productId: 'urun1', productName: 'Bone', pay: 'tl', credits: 0, kurus: 10000, status: 'Ödeme bekliyor' })),
  ok('admin antrenöre şube atar', () => updateDoc(doc(M, 'users', 'coach2'), { branchIds: ['sube1'] })),
  no('admin antrenörün rolünü değiştiremez', () => updateDoc(doc(M, 'users', 'coach2'), { role: 'admin' })),
  no('başka kulüp admini şube atayamaz', () => updateDoc(doc(X, 'users', 'coach2'), { branchIds: [] })),
  no('başka kulüp admini personel çıkaramaz', () => deleteDoc(doc(X, 'users', 'sec1'))),
  no('admin veli hesabını silemez', () => deleteDoc(doc(M, 'users', 'parentB'))),
  no('admin kendini silemez', () => deleteDoc(doc(M, 'users', 'admin1'))),
  ok('admin personeli kulüpten çıkarır', () => deleteDoc(doc(M, 'users', 'coach3'))),
  no('çıkarılan personel kulüp verisini okuyamaz', () => getDocs(q(as('coach3'), 'attendance', ['clubId', 'c1']))),
  ok('süper admin tüm öğrencileri okur', () => getDocs(collection(Z, 'students'))),
  ok('süper admin tasarım yazar', () => setDoc(doc(Z, 'appDesign', 'main'), { appName: 'Kurgu' })),
  ok('oturumsuz tasarım okur', () => getDoc(doc(U, 'appDesign', 'main'))),
  no('kulüp admini tasarım yazamaz', () => setDoc(doc(M, 'appDesign', 'main'), { appName: 'x' })),
  ok('süper admin kulüp açar', () => setDoc(doc(Z, 'clubs', 'c3'), { name: 'Yeni', slug: 'yeni' })),
  ok('süper admin kulüp admini açar', () => withTag(Z, 'admin3', profile('admin', 'c3'))),
  no('kulüp admini kulüp açamaz', () => setDoc(doc(M, 'clubs', 'c4'), { name: 'x', slug: 'x' })),
  no('kulüp admini başka admin açamaz', () => withTag(M, 'admin4', profile('admin', 'c1'))),
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
