import { useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { db, firebaseEnabled } from './store';
import { pushNotify, workerEnabled } from './worker';

const KEY = 'yuzme-kulup:push-token';
const VAPID = import.meta.env.VITE_FIREBASE_VAPID_KEY as string | undefined;
// google-services.json olmadan Android eklentisi uygulamayı kapatır; bu yüzden ayrı anahtarla açılır.
const androidReady = Capacitor.getPlatform() === 'android' && import.meta.env.VITE_ANDROID_PUSH === '1';
const webReady = !Capacitor.isNativePlatform() && !navigator.userAgent.includes('Electron') && import.meta.env.PROD
  && Boolean(VAPID) && 'serviceWorker' in navigator && 'Notification' in window && location.protocol === 'https:';

export const pushAvailable = firebaseEnabled && workerEnabled && (androidReady || webReady);

const remembered = () => {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
};
const remember = (id: string | null) => {
  try {
    if (id) localStorage.setItem(KEY, id);
    else localStorage.removeItem(KEY);
  } catch {
    // Tarayıcı depolaması kapalıysa bildirim yine çalışır, yalnız düğme durumu hatırlanmaz.
  }
};

async function saveToken(uid: string, token: string, platform: 'web' | 'android') {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
  const id = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
  await db.put('pushTokens', id, { uid, token, platform, updatedAt: Date.now() });
  remember(id);
}

async function webToken() {
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Bildirim izni verilmedi.');
  const [{ getApp }, messaging] = await Promise.all([import('firebase/app'), import('firebase/messaging')]);
  if (!(await messaging.isSupported())) throw new Error('Bu tarayıcı bildirimleri desteklemiyor.');
  const serviceWorkerRegistration = await navigator.serviceWorker.ready;
  return messaging.getToken(messaging.getMessaging(getApp()), { vapidKey: VAPID, serviceWorkerRegistration });
}

async function androidToken() {
  const { PushNotifications } = await import('@capacitor/push-notifications');
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') throw new Error('Bildirim izni verilmedi.');
  return new Promise<string>((resolve, reject) => {
    void PushNotifications.addListener('registration', (t) => resolve(t.value));
    void PushNotifications.addListener('registrationError', () => reject(new Error('Cihaz bildirime kaydedilemedi.')));
    void PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const link = action.notification.data?.link;
      if (typeof link === 'string' && link.startsWith('#/')) location.hash = link;
    });
    void PushNotifications.register();
  });
}

export async function enablePush(uid: string) {
  if (androidReady) await saveToken(uid, await androidToken(), 'android');
  else await saveToken(uid, await webToken(), 'web');
}

/** Oturum kapanınca bu cihaza önceki kullanıcının bildirimi gelmez. */
export async function disablePush() {
  const id = remembered();
  if (!id) return;
  remember(null);
  await db.remove('pushTokens', id).catch(() => undefined);
}

/** Worker büyük duyuruları parça parça işler; tamamlanana kadar devam edilir. */
export async function notifyPush(collection: string, id: string) {
  if (!workerEnabled) return;
  for (let i = 0; i < 100; i += 1) {
    const result = await pushNotify(collection, id);
    if (result.done) return;
    if (result.retry) await new Promise((r) => setTimeout(r, 400));
  }
}

export function usePushToggle(uid?: string) {
  const [on, setOn] = useState(() => Boolean(remembered()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const toggle = async () => {
    if (!uid || busy) return;
    setBusy(true);
    setError('');
    try {
      if (on) await disablePush();
      else await enablePush(uid);
      setOn(!on);
    } catch (err) {
      setError((err as Error).message || 'Bildirim açılamadı.');
    } finally {
      setBusy(false);
    }
  };
  return { on, busy, error, toggle };
}
