import { db, useCollection, type Row } from './store';
import type { Post } from './types';

/** Kişinin kendi sosyal tercihleri: engellediği kişiler, gizlediği gönderiler, görmek istemediği gönderi türleri. Yalnız kendisi okur. */
export type SocialPrefs = Row & { blocked: string[]; hiddenPosts: string[]; hiddenKinds: Post['kind'][] };
const EMPTY = { blocked: [] as string[], hiddenPosts: [] as string[], hiddenKinds: [] as Post['kind'][] };
const LIMIT = 500;

export function useSocialPrefs(uid?: string) {
  const row = useCollection<SocialPrefs>('socialPrefs', uid ? { id: uid } : { skip: true })[0];
  const prefs = { ...EMPTY, ...row };
  const save = (patch: Partial<typeof EMPTY>) => {
    if (!uid) return Promise.resolve();
    const next = { ...prefs, ...patch };
    return db.put('socialPrefs', uid, { blocked: next.blocked, hiddenPosts: next.hiddenPosts, hiddenKinds: next.hiddenKinds });
  };
  const toggle = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K][number]) => {
    const list = prefs[key] as string[];
    const next = list.includes(value) ? list.filter((v) => v !== value) : [...list, value].slice(-LIMIT);
    return save({ [key]: next } as Partial<typeof EMPTY>);
  };
  return { ...prefs, toggle, save };
}
