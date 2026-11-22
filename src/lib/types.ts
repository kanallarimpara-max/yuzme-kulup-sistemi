import type { Row } from './store';
import type { LaneClock, WorkoutSet } from './timer';

export type Role = 'super' | 'admin' | 'secretary' | 'coach' | 'parent';

export const ROLE_LABEL: Record<Role, string> = {
  super: 'Süper Admin',
  admin: 'Kulüp Yöneticisi',
  secretary: 'Sekreter',
  coach: 'Antrenör',
  parent: 'Veli',
};

export type User = Row & { name: string; email: string; role: Role; tag: string; isPublic: boolean; branchIds?: string[] };
export type Club = Row & { name: string; logoUrl?: string; color: string; slug: string };
export type Branch = Row & { clubId: string; name: string };
export type Lesson = Row & {
  clubId: string; branchId: string; coachIds: string[]; name: string; weekdays: number[]; startTime: string;
  endTime: string; startDate: string; endDate: string; capacity: number; feeKurus: number; coachPayKurus: number;
};
export type Student = Row & {
  clubId: string; parentId: string; lessonId: string; coachId: string; firstName: string; lastName: string;
  birthYear: number; gender: 'K' | 'E';
};
export type Workout = Row & { clubId: string; coachId: string; title: string; sets: WorkoutSet[] };
export type TimerLane = { id: string; name: string; workoutId: string | null; clock: LaneClock };
export type TimerDoc = Row & { clubId: string; lanes: TimerLane[] };
