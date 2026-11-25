// Canlı tanıtım için "Kulvar360 Demo Yüzme Kulübü"nü kurar: hesaplar ve bütün özellikleri gösteren örnek veriler.
// Her kayıt gerçek kullanımdaki gibi ilgili hesapla yazılır (yönetici, antrenör, veli). Şifre repoya ve ekrana yazılmaz.
// Gerçek sistem:  node scripts/demo-kulup.mjs            (sistem sahibi e-postası, şifresi ve demo şifresi sorulur)
// Deneme:         node scripts/demo-kulup.mjs --emulator (yerel emülatör, e2e sunucusu açıkken)
import { readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { deleteApp, initializeApp } from 'firebase/app';
import { connectAuthEmulator, createUserWithEmailAndPassword, getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { connectFirestoreEmulator, doc, getFirestore, setDoc, writeBatch } from 'firebase/firestore';

const EMULATOR = process.argv.includes('--emulator');
const DOMAIN = 'kulvar360.test';
const CLUB = 'kulvar360-demo';

const env = Object.fromEntries(readFileSync('.env', 'utf8').split(/\r?\n/).filter((l) => l.includes('=')).map((l) => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)]));
const config = EMULATOR
  ? { apiKey: 'demo', authDomain: 'demo', projectId: 'demo-yuzme-e2e', appId: 'demo' }
  : { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID, appId: env.VITE_FIREBASE_APP_ID };

const ask = (q, hidden = false) => new Promise((resolve) => {
  const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) rl._writeToOutput = (s) => { if (!s.includes(q)) rl.output.write('*'); else rl.output.write(s); };
  rl.question(q, (a) => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(a.trim()); });
});

let n = 0;
async function session(email, password, create = false) {
  const app = initializeApp(config, `oturum-${n += 1}`);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (EMULATOR) { connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true }); connectFirestoreEmulator(db, '127.0.0.1', 8080); }
  let cred;
  if (create) {
    try { cred = await createUserWithEmailAndPassword(auth, email, password); } catch (e) {
      if (e.code !== 'auth/email-already-in-use') throw e;
      cred = await signInWithEmailAndPassword(auth, email, password);
    }
  } else cred = await signInWithEmailAndPassword(auth, email, password);
  return { app, db, uid: cred.user.uid, email };
}
// Duyuru, yorum ve mesaj sonradan değiştirilemez; yeniden çalıştırmada var olanlar atlanır.
const ONCE = new Set(['notices', 'comments', 'messages']);
async function put(s, rows) {
  const once = rows.filter(([name]) => ONCE.has(name));
  const rest = rows.filter(([name]) => !ONCE.has(name));
  for (let i = 0; i < rest.length; i += 400) {
    const b = writeBatch(s.db);
    rest.slice(i, i + 400).forEach(([name, id, data]) => b.set(doc(s.db, name, id), data));
    await b.commit();
  }
  for (const [name, id, data] of once) await setDoc(doc(s.db, name, id), data).catch((e) => { if (e.code !== 'permission-denied') throw e; });
}

// ---- Kişiler (kurgusal) ----
const STAFF = [
  { key: 'yonetici', name: 'Murat Aksoy', role: 'admin', tag: 'murataksoy' },
  { key: 'sekreter', name: 'Zeynep Arslan', role: 'secretary', tag: 'zeyneparslan' },
  { key: 'antrenor1', name: 'Emre Çelik', role: 'coach', tag: 'emrecelik' },
  { key: 'antrenor2', name: 'Burcu Yıldız', role: 'coach', tag: 'burcuyildiz' },
];
const FAMILIES = [
  ['Ayşe Demir', 'Demir', [['Kerem', 2013, 'E'], ['Ela', 2016, 'K']]],
  ['Mehmet Kaya', 'Kaya', [['Deniz', 2012, 'K'], ['Arda', 2015, 'E']]],
  ['Elif Şahin', 'Şahin', [['Ege', 2014, 'E'], ['Lina', 2017, 'K']]],
  ['Hakan Öztürk', 'Öztürk', [['Yiğit', 2011, 'E'], ['Ada', 2013, 'K']]],
  ['Selin Koç', 'Koç', [['Mira', 2015, 'K'], ['Aras', 2018, 'E']]],
  ['Burak Polat', 'Polat', [['Defne', 2012, 'K'], ['Kaan', 2016, 'E']]],
  ['Gizem Aydın', 'Aydın', [['Nehir', 2014, 'K'], ['Emir', 2017, 'E']]],
  ['Okan Yalçın', 'Yalçın', [['Asya', 2013, 'K'], ['Çınar', 2015, 'E']]],
];
const tagOf = (name) => name.toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '');

// ---- Tarihler ----
const iso = (d) => d.toISOString().slice(0, 10);
const today = new Date(); today.setHours(12, 0, 0, 0);
const addDays = (d, k) => { const x = new Date(d); x.setDate(x.getDate() + k); return x; };
const pastSessions = (weekdays, days) => Array.from({ length: days }, (_, i) => addDays(today, -i - 1)).filter((d) => weekdays.includes(d.getDay())).map(iso).reverse();
let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

async function main() {
  console.log(`Kulvar360 demo kulübü kurulumu ${EMULATOR ? '(EMÜLATÖR)' : '(GERÇEK SİSTEM)'}`);
  const superEmail = EMULATOR ? process.env.DEMO_SUPER_EMAIL : await ask('Sistem sahibi e-postası: ');
  const superPass = EMULATOR ? process.env.DEMO_SUPER_PASSWORD : await ask('Sistem sahibi şifresi: ', true);
  const demoPass = EMULATOR ? process.env.DEMO_PASSWORD : await ask('Demo hesapların ortak şifresi (en az 8 karakter): ', true);
  if (!demoPass || demoPass.length < 8) throw new Error('Demo şifresi en az 8 karakter olmalı.');

  const sup = await session(superEmail, superPass);
  console.log('Sistem sahibi girişi tamam.');
  await put(sup, [['clubs', CLUB, { name: 'Kulvar360 Demo Yüzme Kulübü', color: '#19b5c9', slug: CLUB, paymentMethods: ['Kredi kartı', 'Nakit', 'EFT / Havale'] }]]);

  // Hesaplar: Auth kaydı ve profil (+ benzersiz etiket) birlikte yazılır.
  const acc = {};
  const people = [...STAFF.map((s) => ({ ...s, email: `${s.key}@${DOMAIN}` })),
    ...FAMILIES.map(([name], i) => ({ key: `veli${i + 1}`, name, role: 'parent', tag: tagOf(name), email: `veli${i + 1}@${DOMAIN}` }))];
  for (const p of people) {
    acc[p.key] = { ...p, ...(await session(p.email, demoPass, true)) };
    const profile = ['users', acc[p.key].uid, { clubId: CLUB, name: p.name, role: p.role, tag: `@${p.tag}`, isPublic: p.role !== 'parent', createdAt: Date.now() }];
    // Yeniden çalıştırmada etiket zaten vardır; yalnız profil güncellenir.
    await put(sup, [profile, ['tags', p.tag, { uid: acc[p.key].uid }]]).catch(() => put(sup, [profile]));
    console.log(`hesap hazır: ${p.email}`);
  }
  const A = acc.yonetici; const C1 = acc.antrenor1; const C2 = acc.antrenor2;

  // ---- Yönetici: şube, model, ders, maaş, indirim, öğrenci, kayıt, gider, duyuru ----
  const lessons = [
    { id: 'demo-l1', modelId: 'demo-m1', branchId: 'demo-b1', coachIds: [C1.uid], name: 'Minikler Grubu', weekdays: [1, 3, 5], startTime: '16:00', endTime: '17:00', capacity: 12, feeKurus: 300000, pay: 1200000 },
    { id: 'demo-l2', modelId: 'demo-m1', branchId: 'demo-b1', coachIds: [C2.uid], name: 'Gelişim Grubu', weekdays: [2, 4, 6], startTime: '17:00', endTime: '18:00', capacity: 12, feeKurus: 350000, pay: 1400000 },
    { id: 'demo-l3', modelId: 'demo-m3', branchId: 'demo-b2', coachIds: [C1.uid, C2.uid], name: 'Performans Takımı', weekdays: [1, 2, 3, 4, 5], startTime: '18:00', endTime: '19:30', capacity: 10, feeKurus: 550000, pay: 2200000 },
    { id: 'demo-l4', modelId: 'demo-m2', branchId: 'demo-b2', coachIds: [C2.uid], name: 'Özel Ders (Cumartesi)', weekdays: [6], startTime: '10:00', endTime: '11:00', capacity: 1, feeKurus: 150000, pay: 600000 },
  ];
  const students = []; let si = 0;
  FAMILIES.forEach(([, last, kids], fi) => kids.forEach(([first, year, gender]) => {
    si += 1;
    const lesson = year >= 2016 ? lessons[0] : year >= 2014 ? lessons[1] : lessons[2];
    const coachId = lesson.coachIds[0];
    students.push({ id: `demo-s${si}`, clubId: CLUB, parentId: acc[`veli${fi + 1}`].uid, lessonId: lesson.id, coachId, firstName: first, lastName: last, birthYear: year, gender });
  }));
  const start = iso(addDays(today, -80)); const end = iso(addDays(today, 200));
  const rows = [
    ['branches', 'demo-b1', { clubId: CLUB, name: 'Merkez Olimpik Havuz' }],
    ['branches', 'demo-b2', { clubId: CLUB, name: 'Sahil Yarı Olimpik Havuz' }],
    ['models', 'demo-m1', { clubId: CLUB, name: 'Grup Dersi', kind: 'grup', perCoach: 6 }],
    ['models', 'demo-m2', { clubId: CLUB, name: 'Özel Ders', kind: 'ozel', perCoach: 1 }],
    ['models', 'demo-m3', { clubId: CLUB, name: 'Sporcu Grubu', kind: 'sporcu', perCoach: 8 }],
    ['discounts', 'demo-d1', { clubId: CLUB, code: 'KARDES10', type: 'percent', value: 10, active: true }],
    ['discounts', 'demo-d2', { clubId: CLUB, code: 'ERKEN15', type: 'percent', value: 15, active: true }],
    ...lessons.flatMap(({ pay, ...l }) => [
      ['lessons', l.id, { ...l, clubId: CLUB, startDate: start, endDate: end, maxInstallments: 3, interestPercent: 0 }],
      ['lessonPay', l.id, { clubId: CLUB, coachIds: l.coachIds, coachPayKurus: pay }],
    ]),
    ...students.map((s) => ['students', s.id, s]),
  ];
  // Kayıt ve taksitler: kardeşe %10 indirim, bazı taksitler ödenmiş, bazıları gecikmiş.
  students.forEach((s, i) => {
    const lesson = lessons.find((l) => l.id === s.lessonId);
    const sibling = i % 2 === 1;
    const net = Math.round(lesson.feeKurus * 3 * (sibling ? 0.9 : 1));
    const part = Math.round(net / 3);
    const installments = [0, 1, 2].map((k) => {
      const due = addDays(today, -50 + k * 30);
      const paid = due < today && !(k === 1 && i % 4 === 0);
      return { no: k + 1, dueDate: iso(due), amountKurus: k === 2 ? net - part * 2 : part, ...(paid ? { paidAt: iso(addDays(due, -2)), method: ['Kredi kartı', 'EFT / Havale', 'Nakit'][i % 3] } : {}) };
    });
    rows.push(['enrollments', `demo-e${i + 1}`, { clubId: CLUB, studentId: s.id, parentId: s.parentId, lessonId: s.lessonId, coachId: s.coachId, listKurus: lesson.feeKurus * 3, netKurus: net, totalKurus: net, ...(sibling ? { discountCode: 'KARDES10' } : {}), installments }]);
  });
  FAMILIES.forEach((_, fi) => {
    const uid = acc[`veli${fi + 1}`].uid;
    rows.push(['parentAccess', uid, { clubId: CLUB, lessonIds: [...new Set(students.filter((s) => s.parentId === uid).map((s) => s.lessonId))] }]);
  });
  [['Havuz kulvar kirası', 'Havuz kirası', 1800000], ['Yüzme malzemeleri (pull buoy, palet)', 'Malzeme', 420000], ['Servis aracı yakıtı', 'Ulaşım', 260000], ['Yarış kayıt ücretleri', 'Yarış', 175000], ['Kulüp bonesi siparişi', 'Diğer', 150000], ['Havuz kulvar kirası', 'Havuz kirası', 1800000]]
    .forEach(([title, category, amountKurus], i) => rows.push(['expenses', `demo-g${i + 1}`, { clubId: CLUB, title, category, date: iso(addDays(today, -(i < 5 ? 5 + i * 6 : 35))), amountKurus }]));
  [C1, C2].forEach((c, i) => [1].forEach((m) => rows.push(['salaries', `demo-p${i}${m}`, { clubId: CLUB, coachId: c.uid, date: iso(addDays(today, -m * 30 + 3)), amountKurus: i ? 1500000 : 1800000, note: 'Aylık ders ücreti' }])));
  // Ders grupları (sohbet) ve duyurular
  const everyone = Object.values(acc).map((a) => a.uid);
  lessons.slice(0, 3).forEach((l) => rows.push(['chats', `demo-chat-${l.id}`, { clubId: CLUB, name: l.name, lessonId: l.id, memberIds: [...new Set([...l.coachIds, ...students.filter((s) => s.lessonId === l.id).map((s) => s.parentId)])] }]));
  rows.push(['notices', 'demo-n1', { clubId: CLUB, senderId: A.uid, kind: 'duyuru', title: 'Yeni dönem kayıtları açıldı', body: 'Ocak dönemi için ön kayıt formu yayında. Kardeş indiriminde KARDES10 kodunu kullanabilirsiniz.', recipientIds: everyone.filter((u) => u !== A.uid), readBy: [], createdAt: Date.now() - 86400000 * 3 }]);
  rows.push(['notices', 'demo-n2', { clubId: CLUB, senderId: A.uid, kind: 'yaris', title: 'Kulüp içi yarış', body: 'Tüm gruplar için kulüp içi yarış Merkez Olimpik Havuz\'da yapılacak. Isınma 09:00.', date: iso(addDays(today, 18)), recipientIds: everyone.filter((u) => u !== A.uid), readBy: [], createdAt: Date.now() - 86400000 }]);
  // Yarış dereceleri (yönetici; TYF kaynaklı yarış derecesi gibi)
  const EV = [['serbest', 50], ['serbest', 100], ['sirt', 50], ['kurbaga', 50], ['kelebek', 50]];
  const baseMs = (s, stroke, dist) => Math.round((dist === 100 ? 2.15 : 1) * ({ serbest: 31000, sirt: 36000, kurbaga: 41000, kelebek: 35000 }[stroke]) * (1 + (s.birthYear - 2011) * 0.07) * (s.gender === 'K' ? 1.04 : 1));
  const raceRows = [];
  students.forEach((s) => EV.slice(0, 3).forEach(([stroke, dist], k) => [-60, -20].forEach((ago, m) => {
    const date = iso(addDays(today, ago + k));
    raceRows.push(['results', `demo-r-${s.id}-${stroke}${dist}-${m}`, { clubId: CLUB, studentId: s.id, parentId: s.parentId, stroke, distance: dist, timeMs: Math.round(baseMs(s, stroke, dist) * (1 - m * 0.025 + rnd() * 0.01)), date, pool: '25m', source: 'tyf', kind: 'yaris', meet: m ? 'İl Kısa Kulvar Yarışları' : 'Kulüpler Arası Sonbahar Kupası' }]);
  })));
  // Öğrenciler önce yazılır: derece kuralı öğrenci kaydını okur.
  await put(A, rows);
  await put(A, raceRows);
  console.log(`yönetici verileri yazıldı: ${rows.length + raceRows.length} kayıt`);

  // ---- Sekreter: kulüp içi grup sohbetine katılabilsin diye ders grubu zaten var ----

  // ---- Antrenörler: müsaitlik, yoklama, antrenman derecesi, yorum, antrenman ----
  for (const [c, idx] of [[C1, 1], [C2, 2]]) {
    const out = [];
    [1, 2, 3, 4, 5, 6].forEach((wd) => [9, 10, 11, 16, 17, 18].forEach((h) => { if ((wd + h + idx) % 3) out.push(['availability', `${c.uid}_demo-b${idx}_${wd}_${h}`, { clubId: CLUB, coachId: c.uid, branchId: `demo-b${idx}`, weekday: wd, hour: h }]); }));
    const myLessons = lessons.filter((l) => l.coachIds[0] === c.uid);
    myLessons.forEach((l) => {
      const roster = students.filter((s) => s.lessonId === l.id);
      pastSessions(l.weekdays, 21).forEach((date) => {
        const marks = Object.fromEntries(roster.map((s) => [s.id, rnd() < 0.82 ? 'geldi' : rnd() < 0.5 ? 'izinli' : 'gelmedi']));
        const docId = `${l.id}_${date}`;
        out.push(['attendance', docId, { clubId: CLUB, lessonId: l.id, coachId: c.uid, date, marks }]);
        roster.filter((s) => s.coachId === c.uid).forEach((s) => out.push(['attendanceMarks', `${docId}_${s.id}`, { clubId: CLUB, studentId: s.id, parentId: s.parentId, lessonId: l.id, date, mark: marks[s.id] }]));
      });
    });
    const mine = students.filter((s) => s.coachId === c.uid);
    mine.forEach((s) => EV.forEach(([stroke, dist], k) => [-28, -21, -14, -7, -2].forEach((ago, m) => out.push(['results', `demo-t-${s.id}-${stroke}${dist}-${m}`, {
      clubId: CLUB, studentId: s.id, parentId: s.parentId, stroke, distance: dist, timeMs: Math.round(baseMs(s, stroke, dist) * (1.06 - m * 0.012 + rnd() * 0.015)), date: iso(addDays(today, ago - (k % 2))), pool: '25m', source: 'manuel', kind: 'antrenman',
    }]))));
    const notes = ['Dönüşlerde çok gelişti, çıkışta biraz daha cesur olmalı.', 'Kurbağa ayak vuruşunda zamanlama düzeliyor, devam!', 'Bu hafta derslere düzenli geldi, dayanıklılığı arttı.', 'Kelebekte nefes ritmine çalışacağız.'];
    mine.forEach((s, i) => out.push(['comments', `demo-y-${s.id}`, { clubId: CLUB, studentId: s.id, parentId: s.parentId, coachId: c.uid, text: notes[i % notes.length], date: iso(addDays(today, -(i % 6) - 1)) }]));
    const sets = idx === 1
      ? [{ name: 'Isınma', reps: 4, distance: 50, stroke: 'Serbest', intervalMs: 75000, restMs: 15000 }, { name: 'Teknik: sırt', reps: 6, distance: 25, stroke: 'Sırt', intervalMs: 45000, restMs: 15000 }, { name: 'Ana set', reps: 8, distance: 50, stroke: 'Serbest', intervalMs: 60000, restMs: 20000 }, { name: 'Gevşeme', reps: 1, distance: 100, stroke: 'Karışık', intervalMs: 180000, restMs: 0 }]
      : [{ name: 'Isınma', reps: 2, distance: 200, stroke: 'Serbest', intervalMs: 240000, restMs: 30000 }, { name: 'Sürat', reps: 10, distance: 50, stroke: 'Kelebek', intervalMs: 60000, restMs: 30000 }, { name: 'Ana set', reps: 5, distance: 200, stroke: 'Karışık', intervalMs: 210000, restMs: 30000 }];
    myLessons.forEach((l, i) => [0, 3].forEach((ago, j) => out.push(['workouts', `demo-w-${l.id}-${j}`, { clubId: CLUB, coachId: c.uid, lessonId: l.id, date: iso(addDays(today, -ago)), title: j ? 'Dayanıklılık günü' : (idx === 1 ? 'Teknik ve tempo' : 'Sürat ve karışık'), description: 'Isınmadan sonra setler sırayla, dinlenmelere dikkat.', sets }])));
    await put(c, out);
    console.log(`${c.email}: ${out.length} kayıt`);
  }

  // ---- Grup sohbeti: antrenör ve veliler mesajlaşır ----
  for (const l of lessons.slice(0, 3)) {
    const members = [...new Set([...l.coachIds, ...students.filter((s) => s.lessonId === l.id).map((s) => s.parentId)])];
    const coach = [C1, C2].find((c) => c.uid === l.coachIds[0]);
    await put(coach, [['messages', `demo-m-${l.id}-1`, { chatId: `demo-chat-${l.id}`, memberIds: members, senderId: coach.uid, kind: 'text', text: 'Merhaba, bu haftanın antrenmanı uygulamada paylaşıldı. Cumartesi dersine boneleri getirmeyi unutmayalım 🏊', createdAt: Date.now() - 7200000 }]]);
    const parent = Object.values(acc).find((a) => a.uid === members.find((m) => m !== coach.uid));
    if (parent) await put(parent, [['messages', `demo-m-${l.id}-2`, { chatId: `demo-chat-${l.id}`, memberIds: members, senderId: parent.uid, kind: 'text', text: 'Teşekkürler hocam, programı gördük 👍', createdAt: Date.now() - 3600000 }]]);
  }
  console.log('sohbet mesajları yazıldı');

  const list = ['# Kulvar360 demo kulübü hesapları', '', `Kulüp: Kulvar360 Demo Yüzme Kulübü (${CLUB})`, 'Şifre: kurulumda girilen ortak demo şifresi (burada yazmaz).', '', '| Rol | Ad | E-posta |', '| --- | --- | --- |',
    ...people.map((p) => `| ${{ admin: 'Yönetici', secretary: 'Sekreter', coach: 'Antrenör', parent: 'Veli' }[p.role]} | ${p.name} | ${p.email} |`)].join('\n');
  if (!EMULATOR) writeFileSync('docs/demo-hesaplari.md', `${list}\n`);
  console.log(`\n${list}\n\nKurulum tamamlandı.`);
  for (const a of [sup, ...Object.values(acc)]) await deleteApp(a.app);
  process.exit(0);
}
main().catch((e) => { console.error('HATA:', e.code ?? '', e.message); process.exit(1); });
