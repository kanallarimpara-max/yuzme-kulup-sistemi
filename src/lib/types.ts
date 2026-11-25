import type { Row } from './store';
export type { Standard } from './rules';
import type { LaneClock, WorkoutSet } from './timer';
import type { PaidInstallment, Stroke } from './rules';

export type Role = 'super' | 'admin' | 'secretary' | 'coach' | 'parent';

export const ROLE_LABEL: Record<Role, string> = {
  super: 'Süper Admin',
  admin: 'Kulüp Yöneticisi',
  secretary: 'Sekreter',
  coach: 'Antrenör',
  parent: 'Veli',
};

export type User = Row & { name: string; role: Role; tag: string; isPublic: boolean; branchIds?: string[]; bio?: string; avatarUrl?: string; tempPassword?: boolean };
export type Contact = Row & { fromId: string; toId: string; memberIds: string[]; status: 'bekliyor' | 'kabul' };
export type Message = Row & { chatId: string; memberIds: string[]; senderId: string; kind: 'text' | 'image' | 'audio'; text?: string; url?: string };
export type CallDoc = Row & {
  chatId: string; memberIds: string[]; callerId: string; calleeId: string; status: 'caliyor' | 'bagli' | 'bitti';
  offer: string; answer?: string;
};
export type Post = Row & {
  authorId: string; imageUrl: string; caption: string; kind: 'foto' | 'derece' | 'madalya'; isPublic: boolean; audience: string[];
  likes: string[]; comments: Array<{ userId: string; text: string; at: number }>;
};
export type PreRegLook = { eyebrow: string; color: string; title: string; description: string; logoUrl: string; videoUrl: string };
export type Club = Row & {
  name: string; logoUrl?: string; color: string; slug: string; paymentMethods?: string[]; preRegLook?: Partial<PreRegLook>;
};
/** Antrenör maaşı herkese açık ders kaydından ayrı tutulur. */
export type LessonPay = Row & { clubId: string; coachIds: string[]; coachPayKurus: number };
export type DiscountCode = Row & { clubId: string; code: string; type: 'percent' | 'amount'; value: number; active: boolean };
export type PreReg = Row & {
  clubId: string; modelId: string; branchId: string; firstName: string; lastName: string; birthYear: number; gender: 'K' | 'E';
  studentPhone: string; parentName: string; parentEmail: string; parentPhone: string; address: string; paymentMethod: string;
  parentId: string; status: 'yeni' | 'kayitli';
};
export type Enrollment = Row & {
  clubId: string; studentId: string; parentId: string; lessonId: string; coachId: string; listKurus: number; netKurus: number; totalKurus: number;
  discountCode?: string; installments: PaidInstallment[];
};
export type Chat = Row & { clubId?: string; name: string; lessonId?: string; memberIds: string[]; direct?: boolean; pinnedId?: string | null; createdBy?: string };
export type Branch = Row & { clubId: string; name: string };
export type Lesson = Row & {
  clubId: string; branchId: string; coachIds: string[]; name: string; weekdays: number[]; startTime: string;
  endTime: string; startDate: string; endDate: string; capacity: number; feeKurus: number;
  modelId?: string; sessionCount?: number; maxInstallments?: number; interestPercent?: number;
};
export type Student = Row & {
  clubId: string; parentId: string; lessonId: string; coachId: string; firstName: string; lastName: string;
  birthYear: number; gender: 'K' | 'E';
};
export type TrainingModel = Row & { clubId: string; name: string; kind: 'grup' | 'altgrup' | 'performans' | 'sporcu' | 'ozel' | 'yetiskin' | 'minik'; perCoach: number };
export type Availability = Row & { clubId: string; coachId: string; branchId: string; weekday: number; hour: number };
export type Notice = Row & {
  clubId: string; senderId: string; kind: 'duyuru' | 'yaris' | 'ders'; title: string; body: string; date?: string;
  recipientIds: string[]; readBy: string[];
};
export type Workout = Row & {
  clubId: string; coachId: string; title: string; sets: WorkoutSet[]; lessonId?: string; date?: string; description?: string;
};
export type Expense = Row & { clubId: string; title: string; category: string; date: string; amountKurus: number };
export type SalaryPayment = Row & { clubId: string; coachId: string; date: string; amountKurus: number; note?: string };
export type AttendanceMark ='geldi' | 'gelmedi' | 'izinli';
export type AttendanceDoc = Row & { clubId: string; lessonId: string; coachId: string; date: string; marks: Record<string, AttendanceMark> };
export type SwimResult = Row & {
  clubId: string; studentId: string; parentId?: string; stroke: Stroke; distance: number; timeMs: number; date: string;
  source: 'manuel' | 'tyf'; kind?: 'yaris' | 'antrenman'; meet?: string; lapsMs?: number[]; pool?: '25m' | '50m';
};
/** Eski kayıtlarda tür yoktur, onlar yarış derecesi sayılır. Baraj yalnız yarış derecesiyle geçilir. */
export const isRaceResult = (r: Pick<SwimResult, 'kind'>) => r.kind !== 'antrenman';
export type TyfMeet = Row & { url: string; title: string; info: string; startDate: string; endDate?: string; version?: string; updatedAt?: string };
/** Yönetici veya antrenörün TYF takviminden kulüp takvimine eklediği yarış. Veliler kendi kulübününkileri görür. */
export type ClubRace = Row & { clubId: string; eventId: string; title: string; dateText: string; startDate: string; endDate: string; pool: string; category: string; place: string; note?: string; approvedBy: string; createdAt: number };
export const isMeetLive = (m: Pick<TyfMeet, 'startDate' | 'endDate'>, today: string) => Boolean(m.startDate) && m.startDate <= today && (m.endDate || m.startDate) >= today;
export type CoachComment = Row & { clubId: string; studentId: string; parentId?: string; coachId: string; text: string; date: string };
export type TimerLane = { id: string; name: string; workoutId: string | null; clock: LaneClock; muted?: boolean };
export type TimerDoc = Row & { clubId: string; lanes: TimerLane[]; touchLocked?: boolean };
