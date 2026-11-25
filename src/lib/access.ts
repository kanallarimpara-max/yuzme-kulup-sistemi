import type { Scope } from './store';
import type { User } from './types';

// Firestore, kuralın izin vermediği belgeyi içerebilecek sorguyu tümden reddeder.
// Bu yüzden her rol yalnız kurallarda okuyabildiği belgeleri sorgular.

const SKIP: Scope = { skip: true };

export function studentScope(user: User | null | undefined): Scope {
  if (!user) return SKIP;
  if (user.role === 'parent') return { clubId: user.clubId, eq: ['parentId', user.id] };
  if (user.role === 'coach') return { clubId: user.clubId, eq: ['coachId', user.id] };
  return { clubId: user.clubId };
}

export function enrollmentScope(user: User | null | undefined): Scope {
  if (!user || user.role === 'coach') return SKIP;
  if (user.role === 'parent') return { clubId: user.clubId, eq: ['parentId', user.id] };
  return { clubId: user.clubId };
}

export function salaryScope(user: User | null | undefined): Scope {
  if (!user) return SKIP;
  if (user.role === 'coach') return { clubId: user.clubId, eq: ['coachId', user.id] };
  return user.role === 'admin' || user.role === 'super' ? { clubId: user.clubId } : SKIP;
}

/** Veli kulüpteki diğer velileri listeleyemez, yalnız açık profilleri görür. */
export function peopleScope(user: User | null | undefined): Scope {
  if (!user) return SKIP;
  if (user.role === 'super') return {};
  return user.role === 'parent' ? { clubId: user.clubId, eq: ['isPublic', true] } : { clubId: user.clubId };
}

/** Sonuç ve yorumlarda veli yalnız kendi çocuğunun kaydını görür. */
export function athleteRecordScope(user: User | null | undefined): Scope {
  if (!user) return SKIP;
  return user.role === 'parent' ? { clubId: user.clubId, eq: ['parentId', user.id] } : { clubId: user.clubId };
}

/** Süper admin tümünü, diğer kullanıcılar yalnız kendi kayıtlarını okur. */
export function ownScope(user: User | null | undefined, field: string): Scope {
  if (!user) return SKIP;
  return user.role === 'super' ? {} : { eq: [field, user.id] };
}

/** Gelen duyurular yalnız kullanıcının kendi kulübünden okunur; kurallar başka kulübün duyurusunu zaten reddeder. */
export function noticeScope(user: User): Scope {
  return user.clubId ? { clubId: user.clubId, contains: ['recipientIds', user.id] } : { contains: ['recipientIds', user.id] };
}
