import { useMemo } from 'react';
import { useCollection, type Row } from './store';
import type { AttendanceDoc, AttendanceMark, User } from './types';

export type AttendanceMarkRow = Row & { clubId: string; studentId: string; parentId: string; lessonId: string; date: string; mark: AttendanceMark };

/** Yoklama belgesi tüm sınıfı içerir. Veli yalnız kendi çocuğunun öğrenci başına kopyasını okur. */
export function useAttendance(user: User | null | undefined): AttendanceDoc[] {
  const isParent = user?.role === 'parent';
  const full = useCollection<AttendanceDoc>('attendance', user && !isParent ? { clubId: user.clubId } : { skip: true });
  const own = useCollection<AttendanceMarkRow>('attendanceMarks', user && isParent ? { clubId: user.clubId, eq: ['parentId', user.id] } : { skip: true });
  return useMemo(() => (isParent
    ? own.map((m) => ({ id: m.id, clubId: m.clubId, lessonId: m.lessonId, coachId: '', date: m.date, marks: { [m.studentId]: m.mark } }))
    : full), [isParent, own, full]);
}
