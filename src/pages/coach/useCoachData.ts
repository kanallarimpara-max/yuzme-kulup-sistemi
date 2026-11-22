import { useSession } from '../../lib/session';
import { useCollection } from '../../lib/store';
import type { Branch, Lesson, Student } from '../../lib/types';

/** Antrenör yalnız kendi derslerini ve öğrencilerini, yönetici tüm kulübü görür. */
export function useCoachData() {
  const { user } = useSession();
  const clubId = user?.clubId ?? '';
  const allLessons = useCollection<Lesson>('lessons', { clubId });
  const allStudents = useCollection<Student>('students', { clubId });
  const branches = useCollection<Branch>('branches', { clubId });
  const isCoach = user?.role === 'coach';
  const lessons = isCoach ? allLessons.filter((l) => l.coachIds.includes(user.id)) : allLessons;
  const students = isCoach ? allStudents.filter((s) => s.coachId === user.id) : allStudents;
  const branchName = (id: string) => branches.find((b) => b.id === id)?.name ?? '';
  return { user, clubId, lessons, students, branches, branchName };
}
