import { useEffect, useMemo, useState } from 'react';
import { peopleScope } from './access';
import { db, useMerged } from './store';
import type { User } from './types';

/** Kulüp ve açık profilleri listeler; sohbet ettiği kişiler gibi diğer profilleri tek tek okur. */
export function usePeople(user: User | null | undefined, extraIds: string[] = []) {
  const base = useMerged<User>('users', peopleScope(user), user ? { eq: ['isPublic', true] } : { skip: true });
  const [extra, setExtra] = useState<User[]>([]);
  const known = new Set([...base, ...extra].map((u) => u.id));
  const key = [...new Set(extraIds)].filter((id) => id && !known.has(id)).sort().slice(0, 50).join('|');
  useEffect(() => {
    if (!key) return;
    let live = true;
    void Promise.all(key.split('|').map((id) => db.get<User>('users', id).catch(() => null))).then((rows) => {
      if (live) setExtra((prev) => [...prev, ...rows.filter((r): r is User => !!r && !prev.some((p) => p.id === r.id))]);
    });
    return () => { live = false; };
  }, [key]);
  return useMemo(() => [...new Map([...extra, ...base].map((u) => [u.id, u])).values()], [base, extra]);
}

/** Etiket tam yazılmadan kişi bulunamaz; kullanıcı listesi dışarı açılmaz. */
export async function findByTag(tag: string) {
  const key = tag.trim().toLocaleLowerCase('tr-TR').replace(/^@/, '');
  if (!/^[a-z0-9]{3,40}$/.test(key)) return null;
  const row = await db.get<{ id: string; uid: string }>('tags', key);
  return row ? db.get<User>('users', row.uid) : null;
}

export const contactId = (a: string, b: string) => `contact-${[a, b].sort().join('-')}`;
export const directChatId = (a: string, b: string) => `dm-${[a, b].sort().join('-')}`;
