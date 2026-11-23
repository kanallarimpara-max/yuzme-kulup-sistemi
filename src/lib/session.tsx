import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { db, firebaseEnabled, localStore, useCollection } from './store';
import { demoData } from './seed';
import type { Club, User } from './types';

type Session = {
  user: User | null;
  club: Club | null;
  ready: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInDemo: (userId: string) => void;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Session | null>(null);
const DEMO_KEY = 'yuzme-kulup:demo-user';

if (localStore?.isEmpty()) localStore.seed(structuredClone(demoData));

const authSdk = async () => {
  const [{ getApp, getApps, initializeApp }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const env = import.meta.env;
  const app = getApps().length ? getApp() : initializeApp({
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  });
  return { auth: auth.getAuth(app), ...auth };
};

const makeTag = (name: string) =>
  `@${name.toLocaleLowerCase('tr-TR').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]/g, '')}${Math.floor(1000 + Math.random() * 9000)}`;

/** Şifre veritabanına yazılmaz. Demo modunda hiç saklanmaz, Firebase'de yalnız Auth'a gider. */
export async function createParentAccount(clubId: string, name: string, email: string, password: string, whileSignedIn: (uid: string) => Promise<unknown>) {
  // E-posta profile yazılmaz: profiller tag aramasında görünür, e-posta yalnız Auth'ta kalır.
  const profile = { clubId, name, role: 'parent' as const, tag: makeTag(name), isPublic: false };
  if (!firebaseEnabled) {
    const id = await db.add('users', profile);
    await whileSignedIn(id);
    return id;
  }
  const f = await authSdk();
  const credential = await f.createUserWithEmailAndPassword(f.auth, email, password);
  try {
    await db.put('users', credential.user.uid, { ...profile, createdAt: Date.now() });
    // Ön kayıt kuralı oturum ister; bu yüzden çıkış kayıt yazıldıktan sonra yapılır.
    await whileSignedIn(credential.user.uid);
  } finally {
    await f.signOut(f.auth);
  }
  return credential.user.uid;
}

/** Yönetici personel açarken kendi oturumu kapanmasın diye Firebase'de ikinci uygulama örneği kullanılır. */
export async function createStaffAccount(clubId: string, name: string, email: string, password: string, role: 'coach' | 'secretary' | 'admin') {
  const profile = { clubId, name, role, tag: makeTag(name), isPublic: true };
  if (!firebaseEnabled) return db.add('users', profile);
  const [{ deleteApp, getApp, initializeApp }, auth] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
  const secondary = initializeApp(getApp().options, `staff-${Date.now()}`);
  try {
    const credential = await auth.createUserWithEmailAndPassword(auth.getAuth(secondary), email, password);
    await db.put('users', credential.user.uid, { ...profile, createdAt: Date.now() });
    return credential.user.uid;
  } finally {
    await deleteApp(secondary);
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(() => (firebaseEnabled ? null : sessionStorage.getItem(DEMO_KEY)));
  const [ready, setReady] = useState(!firebaseEnabled);
  const [user, setUser] = useState<User | null>(null);
  // Profil gelmeden yönlendirme yapılırsa sayfa yenilemede kullanıcı panele atılır.
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const profileReady = ready && (!userId || (loadedFor === userId && user?.id === userId) || (loadedFor === userId && !user));
  const clubs = useCollection<Club>('clubs');

  useEffect(() => {
    if (!firebaseEnabled) return;
    let stop = () => {};
    authSdk().then((f) => {
      stop = f.onAuthStateChanged(f.auth, (u) => {
        setUserId(u?.uid ?? null);
        setReady(true);
      });
    });
    return () => stop();
  }, []);

  useEffect(() => {
    if (!userId) {
      setUser(null);
      return;
    }
    return db.watch('users', { id: userId }, (rows) => {
      setUser((rows.find((r) => r.id === userId) as User) ?? null);
      setLoadedFor(userId);
    });
  }, [userId]);

  const value = useMemo<Session>(() => ({
    user,
    club: clubs.find((c) => c.id === user?.clubId) ?? null,
    ready: profileReady,
    signIn: async (email, password) => {
      if (!firebaseEnabled) throw new Error('Demo modunda rol kartlarından giriş yapın.');
      const f = await authSdk();
      await f.signInWithEmailAndPassword(f.auth, email, password);
    },
    signInDemo: (id) => {
      sessionStorage.setItem(DEMO_KEY, id);
      setUserId(id);
    },
    signOut: async () => {
      if (firebaseEnabled) {
        const f = await authSdk();
        await import('./push').then((p) => p.disablePush()).catch(() => undefined);
        await f.signOut(f.auth);
      } else {
        sessionStorage.removeItem(DEMO_KEY);
        setUserId(null);
      }
    },
  }), [user, clubs, profileReady]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSession() {
  const value = useContext(Ctx);
  if (!value) throw new Error('SessionProvider eksik');
  return value;
}
