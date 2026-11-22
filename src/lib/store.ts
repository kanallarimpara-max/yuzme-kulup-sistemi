import { useEffect, useState } from 'react';

// Firebase ayarı varsa Firestore, yoksa tarayıcıda çalışan demo deposu kullanılır.
// Ekranlar yalnızca bu dosyadaki API'yi bilir.

export type Row = { id: string; clubId?: string; createdAt?: number };
export type Scope = { clubId?: string };
type Listener = (rows: Row[]) => void;

export interface DataStore {
  watch(name: string, scope: Scope, listener: Listener): () => void;
  add<T extends object>(name: string, data: T): Promise<string>;
  put<T extends object>(name: string, id: string, data: T): Promise<void>;
  update(name: string, id: string, patch: object): Promise<void>;
  remove(name: string, id: string): Promise<void>;
}

export const firebaseEnabled = Boolean(import.meta.env?.VITE_FIREBASE_PROJECT_ID);

const KEY = 'yuzme-kulup:v1';
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

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
    const rows = this.data[name] ?? [];
    return scope.clubId ? rows.filter((r) => r.clubId === scope.clubId) : [...rows];
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
}

class FirestoreStore implements DataStore {
  private sdk = (async () => {
    const [{ initializeApp }, firestore] = await Promise.all([import('firebase/app'), import('firebase/firestore')]);
    const env = import.meta.env;
    const app = initializeApp({
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
    this.sdk.then((f) => {
      if (closed) return;
      const ref = f.collection(f.db, name);
      // Kulüp filtresi hem veri izolasyonu hem de ücretsiz okuma kotası için zorunludur.
      const target = scope.clubId ? f.query(ref, f.where('clubId', '==', scope.clubId)) : ref;
      stop = f.onSnapshot(target, (snap) => listener(snap.docs.map((d) => ({ ...d.data(), id: d.id }))));
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
}

export const localStore = firebaseEnabled ? null : new LocalStore();
export const db: DataStore = localStore ?? new FirestoreStore();

export function useCollection<T extends Row>(name: string, scope: Scope = {}): T[] {
  const [rows, setRows] = useState<T[]>([]);
  useEffect(() => db.watch(name, scope, (next) => setRows(next as T[])), [name, scope.clubId]);
  return rows;
}
