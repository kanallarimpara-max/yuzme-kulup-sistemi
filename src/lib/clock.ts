import { db } from './store';
import { clockOffset } from './timer';

// Kronometre kulvarları tüm cihazlarda aynı sunucu saatine göre hesaplanır.
let offsetMs = 0;
let syncedFor: string | null = null;

export const serverNow = () => Date.now() + offsetMs;

/** Oturum başına bir kez çalışır; ücretsiz kotadan bir yazma ve bir okuma harcar. */
export async function syncClock(uid: string) {
  if (syncedFor === uid) return;
  syncedFor = uid;
  try {
    const sentAt = Date.now();
    const server = await db.serverTime(uid);
    offsetMs = clockOffset(sentAt, server, Date.now());
  } catch {
    // Eşitleme başarısızsa cihaz saatiyle devam edilir, sonraki açılışta yeniden denenir.
    syncedFor = null;
  }
}
