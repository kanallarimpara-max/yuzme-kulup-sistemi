// Taksit hatırlatma kuralları. Hem uygulama hem Worker kullanır, bu yüzden başka dosyaya bağlı değildir.

export type ReminderStage = 'yaklasan' | 'bugun' | 'gecikti' | 'gecikti2';
type Inst = { no: number; dueDate: string; amountKurus: number; paidAt?: string };
export type ReminderEnrollment = { id: string; clubId: string; studentId: string; parentId: string; installments: Inst[] };
export type Reminder = { id: string; enrollmentId: string; clubId: string; studentId: string; parentId: string; no: number; count: number; dueDate: string; amountKurus: number; stage: ReminderStage; days: number };

const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d) / 86400000;
};
export const daysBetween = (from: string, to: string) => Math.round(day(to) - day(from));

/**
 * Vadeye 1-3 gün kala, vade günü, 1-6 gün gecikmede ve 7-30 gün gecikmede birer kez hatırlatılır.
 * Aralık kullanıldığı için Worker bir gün çalışmasa da hatırlatma kaçmaz; kimlik aynı olduğu için iki kez gitmez.
 * 30 günden eski gecikmeler için otomatik mesaj gitmez, sekreter elle hatırlatır.
 */
export function reminderStage(dueDate: string, today: string): ReminderStage | null {
  const d = daysBetween(today, dueDate);
  if (d >= 1 && d <= 3) return 'yaklasan';
  if (d === 0) return 'bugun';
  if (d <= -1 && d >= -6) return 'gecikti';
  if (d <= -7 && d >= -30) return 'gecikti2';
  return null;
}

export const reminderId = (enrollmentId: string, no: number, stage: ReminderStage) => `odeme-${enrollmentId}-${no}-${stage}`;

export function dueReminders(enrollments: ReminderEnrollment[], today: string, skipClubs: string[] = []): Reminder[] {
  const out: Reminder[] = [];
  for (const e of enrollments) {
    if (!e.parentId || !e.clubId || skipClubs.includes(e.clubId) || !Array.isArray(e.installments)) continue;
    for (const i of e.installments) {
      if (i.paidAt || !/^\d{4}-\d{2}-\d{2}$/.test(i.dueDate ?? '')) continue;
      const stage = reminderStage(i.dueDate, today);
      if (!stage) continue;
      out.push({ id: reminderId(e.id, i.no, stage), enrollmentId: e.id, clubId: e.clubId, studentId: e.studentId, parentId: e.parentId, no: i.no,
        count: e.installments.length, dueDate: i.dueDate, amountKurus: i.amountKurus, stage, days: daysBetween(today, i.dueDate) });
    }
  }
  return out;
}

/** 150000 kuruş → "1.500,00 TL" (Worker'da tarayıcı biçimine güvenmemek için elle yazılır). */
export function tl(kurus: number) {
  const sign = kurus < 0 ? '-' : '';
  const abs = Math.abs(Math.round(kurus));
  const lira = String(Math.floor(abs / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${sign}${lira},${String(abs % 100).padStart(2, '0')} TL`;
}
const trDate = (iso: string) => iso.split('-').reverse().join('.');

export function reminderText(r: Pick<Reminder, 'no' | 'count' | 'dueDate' | 'amountKurus' | 'stage' | 'days'>, studentName: string) {
  const what = `${studentName.trim() || 'Sporcu'} · ${r.no}/${r.count}. taksit · ${tl(r.amountKurus)} · vade ${trDate(r.dueDate)}`;
  if (r.stage === 'yaklasan') return { title: 'Taksit vadesi yaklaşıyor', body: `${what}. Vadeye ${r.days} gün kaldı.` };
  if (r.stage === 'bugun') return { title: 'Taksit vadesi bugün', body: `${what}. Ödemeyi yaptıysanız bu mesajı dikkate almayın.` };
  return { title: 'Taksit ödemesi gecikti', body: `${what}. Vade ${-r.days} gün geçti. Ödeme için kulübünüzle görüşebilirsiniz.` };
}
