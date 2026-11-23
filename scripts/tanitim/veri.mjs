// Tanıtım videoları için yalnız yerel emülatöre tamamen kurgusal kulüp verisi yükler.
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';

const env = await initializeTestEnvironment({
  projectId: 'demo-yuzme-e2e',
  firestore: { host: '127.0.0.1', port: 8080, rules: readFileSync('firestore.rules', 'utf8') },
});
const clubId = 'demo-club';
const names = [['Elif', 'Kara', 'K'], ['Kerem', 'Şen', 'E'], ['Zeynep', 'Toprak', 'K'], ['Arda', 'Güneş', 'E'], ['Defne', 'Aksoy', 'K'], ['Emir', 'Yalçın', 'E'], ['Lina', 'Korkmaz', 'K'], ['Efe', 'Polat', 'E'], ['Nehir', 'Çetin', 'K'], ['Can', 'Özkan', 'E']];
const students = names.map(([firstName, lastName, gender], i) => ({
  id: `f${i}`, clubId, parentId: `veli-f${i}`, lessonId: i < 6 ? 'l1' : 'l2', coachId: 'u-coach', firstName, lastName, birthYear: 2011 + (i % 5), gender,
}));
const allStudents = [{ id: 's1', parentId: 'u-parent', lessonId: 'l1' }, { id: 's2', parentId: 'u-parent', lessonId: 'l2' }, ...students];
const plan = (s, i) => ({
  id: `en-${s.id}`, clubId, studentId: s.id, parentId: s.parentId, lessonId: s.lessonId, coachId: 'u-coach', listKurus: 900000, netKurus: 900000, totalKurus: 900000, discountCode: '',
  installments: [
    { no: 1, dueDate: '2026-11-05', amountKurus: 300000, ...(i % 7 === 6 ? {} : { paidAt: '2026-11-04', method: 'Kredi kartı' }) },
    { no: 2, dueDate: '2026-12-05', amountKurus: 300000, ...(i % 3 === 0 ? { paidAt: '2026-11-20', method: 'EFT / Havale' } : {}) },
    { no: 3, dueDate: '2027-01-05', amountKurus: 300000 },
  ],
});
const series = (id, parentId, stroke, distance, times, kind) => times.map(([date, timeMs], i) => ({
  id: `sn-${id}-${stroke}-${distance}-${kind}-${i}`, clubId, studentId: id, parentId, stroke, distance, timeMs, date, pool: '25m', source: 'manuel', kind, ...(kind === 'yaris' ? { meet: 'Kış Kupası' } : {}),
}));
const dates = ['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13', '2026-11-16', '2026-11-18', '2026-11-20'];
const l1 = allStudents.filter((s) => s.lessonId === 'l1');
const mark = (i, d) => ((i + d) % 11 === 0 ? 'gelmedi' : (i * 2 + d) % 13 === 0 ? 'izinli' : 'geldi');
const attendance = dates.map((date, d) => ({ id: `l1_${date}_u-coach`, clubId, lessonId: 'l1', coachId: 'u-coach', date, marks: Object.fromEntries(l1.map((s, i) => [s.id, mark(i, d)])) }));
const attendanceMarks = attendance.flatMap((a) => l1.map((s) => ({ id: `${a.id}_${s.id}`, clubId, studentId: s.id, parentId: s.parentId, lessonId: 'l1', date: a.date, mark: a.marks[s.id] })));
const now = Date.parse('2026-11-23T14:00:00Z');
const dm = 'dm-u-coach-u-parent';
const say = (id, chatId, memberIds, senderId, text, min) => ({ id, chatId, memberIds, senderId, kind: 'text', text, createdAt: now + min * 60000 });

const data = {
  users: students.map((s) => ({ id: s.parentId, clubId, name: `${s.lastName} Ailesi`, role: 'parent', tag: `@veli${s.id}`, isPublic: false })),
  students,
  enrollments: allStudents.map((s, i) => plan({ ...s }, i)),
  results: [
    ...series('s1', 'u-parent', 'serbest', 50, [['2026-09-14', 34200], ['2026-10-12', 33150], ['2026-11-08', 32040], ['2026-11-22', 31280]], 'yaris'),
    ...series('s1', 'u-parent', 'serbest', 100, [['2026-09-14', 76100], ['2026-10-12', 74250], ['2026-11-22', 71880]], 'yaris'),
    ...series('s1', 'u-parent', 'sirt', 50, [['2026-10-12', 39800], ['2026-11-22', 38420]], 'yaris'),
    ...series('s1', 'u-parent', 'serbest', 50, [['2026-11-02', 33600], ['2026-11-09', 33100], ['2026-11-16', 32500], ['2026-11-20', 32180]], 'antrenman'),
    ...series('s2', 'u-parent', 'kelebek', 100, [['2026-10-12', 78200], ['2026-11-22', 75300]], 'yaris'),
  ],
  attendance, attendanceMarks,
  comments: [
    { id: 'fy1', clubId, studentId: 's1', parentId: 'u-parent', coachId: 'u-coach', text: 'Dönüşleri belirgin biçimde hızlandı, nefes düzeni daha sakin.', date: '2026-11-20' },
    { id: 'fy2', clubId, studentId: 's1', parentId: 'u-parent', coachId: 'u-coach', text: 'Çıkış tekniğine bu hafta odaklandık, çok istekli çalıştı.', date: '2026-11-13' },
  ],
  expenses: [
    { id: 'fg1', clubId, title: 'Havuz kirası', category: 'Kira', date: '2026-11-01', amountKurus: 1800000 },
    { id: 'fg2', clubId, title: 'Malzeme alımı', category: 'Malzeme', date: '2026-11-10', amountKurus: 320000 },
    { id: 'fg3', clubId, title: 'Havuz kirası', category: 'Kira', date: '2026-10-01', amountKurus: 1800000 },
  ],
  salaries: [{ id: 'fm1', clubId, coachId: 'u-coach', date: '2026-11-05', amountKurus: 1200000, note: 'Kasım avansı' }],
  prereg: [['Mira', 'Tekin', 2016, 'K'], ['Batu', 'Erdem', 2015, 'E'], ['Asya', 'Demirel', 2017, 'K']].map(([firstName, lastName, birthYear, gender], i) => ({
    id: `fo${i}`, clubId, modelId: 'm1', branchId: 'b1', firstName, lastName, birthYear, gender, studentPhone: '', parentName: `${lastName} Ailesi`, parentEmail: `aile${i}@ornek.test`, parentPhone: '05000000000', address: 'Örnek Mahallesi', paymentMethod: 'Kredi kartı', parentId: `onveli${i}`, status: 'yeni', createdAt: now - i * 3600000,
  })),
  notices: [
    { id: 'fn1', clubId, senderId: 'u-admin', kind: 'yaris', title: 'Kış Kupası', body: 'Yarış günü sabah 08.30 toplanma.', date: '2026-12-12', recipientIds: ['u-parent', 'u-coach', 'u-sec'], readBy: [], createdAt: now - 7200000 },
    { id: 'fn2', clubId, senderId: 'u-admin', kind: 'duyuru', title: 'Yeni dönem kayıtları açıldı', body: 'Ocak dönemi için ön kayıt formu yayında.', recipientIds: ['u-parent', 'u-coach', 'u-sec'], readBy: [], createdAt: now - 3600000 },
  ],
  contacts: [{ id: 'contact-u-coach-u-parent', fromId: 'u-coach', toId: 'u-parent', memberIds: ['u-coach', 'u-parent'], status: 'kabul', createdAt: now - 86400000 }],
  chats: [{ id: dm, name: '', direct: true, memberIds: ['u-coach', 'u-parent'], createdAt: now - 86400000 }],
  messages: [
    say('fm-1', dm, ['u-coach', 'u-parent'], 'u-parent', 'Merhaba hocam, Mert bu hafta nasıldı?', 0),
    say('fm-2', dm, ['u-coach', 'u-parent'], 'u-coach', 'Çok iyi gidiyor, 50 serbestte derecesini yine düşürdü.', 2),
    say('fm-3', dm, ['u-coach', 'u-parent'], 'u-parent', 'Harika, teşekkür ederiz!', 3),
    say('fm-4', 'lesson-l1-u-coach', ['u-coach', 'u-parent'], 'u-coach', 'Yarınki antrenman 17.00, bone ve gözlükleri unutmayalım.', 4),
  ],
  posts: [
    { id: 'fp1', authorId: 'u-admin', imageUrl: '', caption: 'Kış Kupası hazırlıklarımız başladı. Bütün sporcularımıza başarılar!', kind: 'madalya', isPublic: true, audience: ['u-admin', 'u-coach', 'u-parent'], likes: ['u-coach', 'u-parent'], comments: [{ userId: 'u-parent', text: 'Başarılar çocuklar!', at: now }], createdAt: now },
    { id: 'fp2', authorId: 'u-coach', imageUrl: '', caption: 'Gelişim Grubu bu hafta 50 metrede kişisel rekorlarını yeniledi.', kind: 'derece', isPublic: true, audience: ['u-coach', 'u-parent'], likes: ['u-admin'], comments: [], createdAt: now - 3600000 },
  ],
  clubs: [
    { id: 'kurgu-2', name: 'Lacivert Yüzme Akademisi', color: '#3f7fd8', slug: 'lacivert', paymentMethods: ['Nakit'] },
    { id: 'kurgu-3', name: 'Dalga Spor Kulübü', color: '#19b58f', slug: 'dalga', paymentMethods: ['Nakit'] },
  ],
  sales: [
    { id: 'fs2', clubName: 'Lacivert Yüzme Akademisi', date: '2026-10-14', plan: 'Yıllık', amountKurus: 2400000 },
    { id: 'fs3', clubName: 'Dalga Spor Kulübü', date: '2026-11-03', plan: 'Aylık', amountKurus: 250000 },
  ],
  creditRequests: [{ id: 'fc1', userId: 'u-coach', type: 'yukleme', credits: 1500, kurus: 12500, note: 'Standart paket', status: 'bekliyor', createdAt: now }],
  tyfMeets: [{ id: 'kurgu-kupa', url: 'https://canli.tyf.gov.tr/live/2026/999001/', title: 'KIŞ KUPASI YÜZME YARIŞLARI', info: 'Örnek Şehir | 23.11.2026 - 24.11.2026 | 25 Metre Havuz', startDate: '2026-11-23', endDate: '2026-11-24', version: '1:1' }],
};

await env.withSecurityRulesDisabled(async (ctx) => {
  const db = ctx.firestore();
  const { deleteDoc } = await import('firebase/firestore');
  await deleteDoc(doc(db, 'tyfMeets', '2026-1005927'));
  await setDoc(doc(db, 'students', 's1'), { birthYear: 2011 }, { merge: true });
  for (const [name, rows] of Object.entries(data)) {
    for (const { id, ...row } of rows) await setDoc(doc(db, name, id), row);
  }
});
await env.cleanup();
console.log('tanitim verisi hazir');
process.exit(0);
