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

/** Süper admin tümünü, diğer kullanıcılar yalnız kendi kayıtlarını okur. */
export function ownScope(user: User | null | undefined, field: string): Scope {
  if (!user) return SKIP;
  return user.role === 'super' ? {} : { eq: [field, user.id] };
}
