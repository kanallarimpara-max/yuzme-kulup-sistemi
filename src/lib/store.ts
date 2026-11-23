import { useEffect, useMemo, useState } from 'react';

// Firebase ayarı varsa Firestore, yoksa tarayıcıda çalışan demo deposu kullanılır.
// Ekranlar yalnızca bu dosyadaki API'yi bilir.

export type Row = { id: string; clubId?: string; createdAt?: number };
/** `id` tek belge, `contains` dizi alanı filtresidir. Ücretsiz okuma kotası için geniş dinleme yapılmaz. */
export type Scope = { clubId?: string; id?: string; contains?: [field: string, value: string]; eq?: [field: string, value: string | boolean]; skip?: boolean };
type Listener = (rows: Row[]) => void;

export interface DataStore {
  watch(name: string, scope: Scope, listener: Listener): () => void;
  add<T extends object>(name: string, data: T): Promise<string>;
  put<T extends object>(name: string, id: string, data: T): Promise<void>;
  update(name: string, id: string, patch: object): Promise<void>;
  remove(name: string, id: string): Promise<void>;
  get<T extends Row>(name: string, id: string): Promise<T | null>;
  /** Tüm yazımlar birlikte olur veya hiçbiri olmaz. Alanlar mevcut belgeyle birleştirilir. */
  batch(ops: BatchOp[]): Promise<void>;
}

export type BatchOp = { name: string; id: string; data: Record<string, unknown> };
type Increment = { __inc: number };
/** Sunucudaki değeri okumadan artırır; aynı anda yapılan işlemlerde bakiye kaybolmaz. */
export const inc = (n: number): Increment => ({ __inc: n });
const isInc = (v: unknown): v is Increment => typeof v === 'object' && v !== null && '__inc' in v;

export const firebaseEnabled = Boolean(import.meta.env?.VITE_FIREBASE_PROJECT_ID);

const KEY = 'yuzme-kulup:v1';
export const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

class LocalStore implements DataStore {
  private data: Record<string, Row[]> = {};
  private listeners = new Set<{ name: string; scope: Scope; listener: Listener }>();
  private channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel(KEY) : null;

  constructor() {
    this.load();
    if (this.channel) {
      this.channel.onmessage = () => {
        this.load();
        this.emit();
      };
    }
  }

  private load() {
    try {
      this.data = JSON.parse(localStorage.getItem(KEY) ?? '{}');
    } catch {
      this.data = {};
    }
  }

  private commit() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.data));
    } catch {
      console.warn('Demo verisi tarayıcıya kaydedilemedi.');
    }
    this.channel?.postMessage('changed');
    this.emit();
  }

  private rows(name: string, scope: Scope) {
    return (this.data[name] ?? []).filter((r) => {
      if (scope.skip) return false;
      if (scope.id && r.id !== scope.id) return false;
      if (scope.eq && (r as unknown as Record<string, unknown>)[scope.eq[0]] !== scope.eq[1]) return false;
      if (scope.clubId && r.clubId !== scope.clubId) return false;
      if (scope.contains) {
        const list = (r as unknown as Record<string, unknown>)[scope.contains[0]];
        if (!Array.isArray(list) || !list.includes(scope.contains[1])) return false;
      }
      return true;
    });
  }

  private emit() {
    this.listeners.forEach((l) => l.listener(this.rows(l.name, l.scope)));
  }

  isEmpty() {
    return Object.keys(this.data).length === 0;
  }

  seed(data: Record<string, Row[]>) {
    this.data = data;
    this.commit();
  }

  watch(name: string, scope: Scope, listener: Listener) {
    const entry = { name, scope, listener };
    this.listeners.add(entry);
    listener(this.rows(name, scope));
    return () => void this.listeners.delete(entry);
  }

  async add<T extends object>(name: string, data: T) {
    const id = newId();
    (this.data[name] ??= []).push({ ...data, id, createdAt: Date.now() });
    this.commit();
    return id;
  }

  async put<T extends object>(name: string, id: string, data: T) {
    const rows = (this.data[name] ??= []);
    const row = { ...data, id } as Row;
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) rows[i] = row;
    else rows.push({ ...row, createdAt: Date.now() });
    this.commit();
  }

  async update(name: string, id: string, patch: object) {
    const rows = this.data[name] ?? [];
    const i = rows.findIndex((r) => r.id === id);
    if (i < 0) throw new Error('Kayıt bulunamadı');
    rows[i] = { ...rows[i], ...patch };
    this.commit();
  }

  async remove(name: string, id: string) {
    this.data[name] = (this.data[name] ?? []).filter((r) => r.id !== id);
    this.commit();
  }

  async get<T extends Row>(name: string, id: string) {
    return ((this.data[name] ?? []).find((r) => r.id === id) as T | undefined) ?? null;
  }

  async batch(ops: BatchOp[]) {
    for (const { name, id, data } of ops) {
      const rows = (this.data[name] ??= []);
      const i = rows.findIndex((r) => r.id === id);
      const before = (i >= 0 ? rows[i] : { id }) as Row & Record<string, unknown>;
      const next: Record<string, unknown> = { ...before };
      for (const [key, value] of Object.entries(data)) next[key] = isInc(value) ? Number(before[key] ?? 0) + value.__inc : value;
      if (i >= 0) rows[i] = next as Row;
      else rows.push(next as Row);
    }
    this.commit();
  }
}

class FirestoreStore implements DataStore {
  private sdk = (async () => {
    const [{ getApp, getApps, initializeApp }, firestore] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const env = import.meta.env;
    const app = getApps().length ? getApp() : initializeApp({
      apiKey: env.VITE_FIREBASE_API_KEY,
      authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    });
    return { db: firestore.getFirestore(app), ...firestore };
  })();

  watch(name: string, scope: Scope, listener: Listener) {
    let stop = () => {};
    let closed = false;
    if (scope.skip) {
      listener([]);
      return () => {};
    }
    // Oturum kapanınca dinleyici izin hatası alır; ekran boş listeye düşer.
    const denied = (error: Error) => {
      console.warn(`${name} okunamadı:`, error.message);
      listener([]);
    };
    this.sdk.then((f) => {
      if (closed) return;
      if (scope.id) {
        stop = f.onSnapshot(f.doc(f.db, name, scope.id), (d) => listener(d.exists() ? [{ ...d.data(), id: d.id }] : []), denied);
        return;
      }
      const ref = f.collection(f.db, name);
      // Kulüp filtresi hem veri izolasyonu hem de ücretsiz okuma kotası için zorunludur.
      const filters = [
        ...(scope.clubId ? [f.where('clubId', '==', scope.clubId)] : []),
        ...(scope.eq ? [f.where(scope.eq[0], '==', scope.eq[1])] : []),
        ...(scope.contains ? [f.where(scope.contains[0], 'array-contains', scope.contains[1])] : []),
      ];
      stop = f.onSnapshot(f.query(ref, ...filters), (snap) => listener(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), denied);
    });
    return () => {
      closed = true;
      stop();
    };
  }

  async add<T extends object>(name: string, data: T) {
    const f = await this.sdk;
    return (await f.addDoc(f.collection(f.db, name), { ...data, createdAt: Date.now() })).id;
  }

  async put<T extends object>(name: string, id: string, data: T) {
    const f = await this.sdk;
    await f.setDoc(f.doc(f.db, name, id), data);
  }

  async update(name: string, id: string, patch: object) {
    const f = await this.sdk;
    await f.updateDoc(f.doc(f.db, name, id), patch as Record<string, unknown>);
  }

  async remove(name: string, id: string) {
    const f = await this.sdk;
    await f.deleteDoc(f.doc(f.db, name, id));
  }

  async get<T extends Row>(name: string, id: string) {
    const f = await this.sdk;
    const snap = await f.getDoc(f.doc(f.db, name, id));
    return snap.exists() ? ({ ...snap.data(), id: snap.id } as T) : null;
  }

  async batch(ops: BatchOp[]) {
    const f = await this.sdk;
    const batch = f.writeBatch(f.db);
    for (const { name, id, data } of ops) {
      const row = Object.fromEntries(Object.entries(data).map(([k, v]) => [k, isInc(v) ? f.increment(v.__inc) : v]));
      batch.set(f.doc(f.db, name, id), row, { merge: true });
    }
    await batch.commit();
  }
}

export const localStore = firebaseEnabled ? null : new LocalStore();
export const db: DataStore = localStore ?? new FirestoreStore();

export function useCollection<T extends Row>(name: string, scope: Scope = {}): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => db.watch(name, scope, (next) => setRows(next as T[])), [name, scope.clubId, scope.id, scope.skip, scope.contains?.join('|'), scope.eq?.join('|')]);
  return rows;
}

/** Kuralların ayrı sorgu istediği iki listeyi tekrarsız birleştirir. */
export function useMerged<T extends Row>(name: string, first: Scope, second: Scope): T[] {
  const a = useCollection<T>(name, first);
  const b = useCollection<T>(name, second);
  return useMemo(() => [...new Map([...a, ...b].map((r) => [r.id, r])).values()], [a, b]);
}
