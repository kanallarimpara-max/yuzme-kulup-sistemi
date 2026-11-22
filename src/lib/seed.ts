import type { Row } from './store';

// Yalnızca Firebase bağlı değilken kullanılan kurgusal örnek veri.
const clubId = 'demo-club';
const min = 60000;

type SeedRow = Row & Record<string, unknown>;

export const demoData: Record<string, SeedRow[]> = {
  clubs: [{ id: clubId, name: 'Mavi Dalga Spor Kulübü', color: '#19b5c9', slug: 'mavi-dalga', paymentMethods: ['Kredi kartı', 'Nakit', 'EFT / Havale'] }],
  discounts: [{ id: 'd1', clubId, code: 'KARDES10', type: 'percent', value: 10, active: true }],
  prereg: [],
  enrollments: [],
  chats: [],
  branches: [
    { id: 'b1', clubId, name: 'Merkez Havuz' },
    { id: 'b2', clubId, name: 'Sahil Şubesi' },
  ],
  users: [
    { id: 'u-super', name: 'Sistem Yöneticisi', email: 'super@demo.test', role: 'super', tag: '@sistem', isPublic: false },
    { id: 'u-admin', clubId, name: 'Deniz Kaya', email: 'admin@demo.test', role: 'admin', tag: '@denizkaya', isPublic: true },
    { id: 'u-sec', clubId, name: 'Ece Yılmaz', email: 'sekreter@demo.test', role: 'secretary', tag: '@eceyilmaz', isPublic: true },
    { id: 'u-coach', clubId, name: 'Can Demir', email: 'antrenor@demo.test', role: 'coach', tag: '@candemir', isPublic: true },
    { id: 'u-parent', clubId, name: 'Selin Aydın', email: 'veli@demo.test', role: 'parent', tag: '@selinaydin', isPublic: false },
  ],
  lessons: [
    { id: 'l1', clubId, modelId: 'm1', maxInstallments: 3, interestPercent: 10, branchId: 'b1', coachIds: ['u-coach'], name: 'Gelişim Grubu', weekdays: [1, 3, 5], startTime: '17:00', endTime: '18:00', startDate: '2026-11-02', endDate: '2027-01-29', capacity: 10, feeKurus: 350000, coachPayKurus: 1500000 },
    { id: 'l2', clubId, modelId: 'm3', maxInstallments: 1, interestPercent: 0, branchId: 'b2', coachIds: ['u-coach'], name: 'Performans Takımı', weekdays: [2, 4, 6], startTime: '18:30', endTime: '20:00', startDate: '2026-11-03', endDate: '2027-01-30', capacity: 8, feeKurus: 500000, coachPayKurus: 2000000 },
  ],
  students: [
    { id: 's1', clubId, parentId: 'u-parent', lessonId: 'l1', coachId: 'u-coach', firstName: 'Mert', lastName: 'Aydın', birthYear: 2014, gender: 'E' },
    { id: 's2', clubId, parentId: 'u-parent', lessonId: 'l2', coachId: 'u-coach', firstName: 'Ada', lastName: 'Aydın', birthYear: 2012, gender: 'K' },
  ],
  workouts: [
    { id: 'w1', clubId, coachId: 'u-coach', title: 'Aerobik Dayanıklılık', sets: [
      { name: 'Isınma', reps: 2, distance: 100, stroke: 'Serbest', intervalMs: 2 * min, restMs: 30000 },
      { name: 'Ana Set', reps: 6, distance: 100, stroke: 'Serbest', intervalMs: 95000, restMs: 60000 },
      { name: 'Çıkış', reps: 1, distance: 200, stroke: 'Karışık', intervalMs: 4 * min, restMs: 0 },
    ] },
    { id: 'w2', clubId, coachId: 'u-coach', title: 'Sürat Serisi', sets: [
      { name: 'Aktivasyon', reps: 4, distance: 25, stroke: 'Kelebek', intervalMs: 45000, restMs: 20000 },
      { name: 'Sürat', reps: 8, distance: 50, stroke: 'Serbest', intervalMs: 60000, restMs: 45000 },
    ] },
  ],
  models: [
    { id: 'm1', clubId, name: 'Grup Dersi', kind: 'grup', perCoach: 5 },
    { id: 'm2', clubId, name: 'Özel Ders', kind: 'ozel', perCoach: 1 },
    { id: 'm3', clubId, name: 'Sporcu Grubu', kind: 'sporcu', perCoach: 8 },
  ],
  availability: [1, 3, 5].flatMap((weekday) => [9, 10, 11].map((hour) => ({
    id: `u-coach_b1_${weekday}_${hour}`, clubId, coachId: 'u-coach', branchId: 'b1', weekday, hour,
  }))),
  notices: [],
  settings: [{ id: 'platform', bank: 'Örnek Banka', holder: 'Örnek Hesap Sahibi', iban: 'TR00 0000 0000 0000 0000 0000 00', rateCredits: 1000, rateKurus: 5000 }],
  packages: [
    { id: 'p1', name: 'Başlangıç', credits: 500, priceKurus: 5000 },
    { id: 'p2', name: 'Standart', credits: 1500, priceKurus: 12500 },
    { id: 'p3', name: 'Profesyonel', credits: 5000, priceKurus: 35000 },
  ],
  products: [
    { id: 'pr1', name: 'Yarış Gözlüğü', description: 'Aynalı camlı yarış gözlüğü', imageUrl: '', priceKurus: 89000, priceCredits: 900 },
    { id: 'pr2', name: 'Kulüp Bonesi', description: 'Silikon yüzücü bonesi', imageUrl: '', priceKurus: 25000, priceCredits: 250 },
  ],
  ledger: [{ id: 'lg1', userId: 'u-coach', delta: 1000, reason: 'Açılış kredisi' }],
  creditRequests: [],
  orders: [],
  listings: [],
  purchases: [],
  ads: [],
  sales: [{ id: 'sa1', clubName: 'Mavi Dalga Spor Kulübü', date: '2026-09-01', plan: 'Yıllık', amountKurus: 2400000 }],
  timers: [],
};
