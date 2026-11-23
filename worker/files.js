// Özel dosya yüklemesi. Cloudinary gizli anahtarı yalnız Worker'da kalır, istemci tek seferlik imza alır.
import { consumeQuota } from './push.js';

const UPLOADS_PER_DAY = 30;
const KINDS = {
  image: { resource: 'image', formats: 'jpg,jpeg,png,webp,heic' },
  audio: { resource: 'video', formats: 'webm,ogg,mp3,m4a,mp4,wav,aac' },
  pdf: { resource: 'image', formats: 'pdf' },
};

async function sha1(text) {
  const hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(text));
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cloudinary imzası: parametreler ada göre sıralanır, sonuna gizli anahtar eklenir. */
export const signParams = (params, secret) => sha1(`${Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join('&')}${secret}`);

export async function handleSign(request, env, uid, json) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_API_KEY || !env.CLOUDINARY_API_SECRET || !env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Dosya yükleme henüz ayarlanmadı.' }, 503);
  }
  const input = await request.json().catch(() => null);
  const kind = typeof input?.kind === 'string' && Object.hasOwn(KINDS, input.kind) ? KINDS[input.kind] : null;
  if (!kind) return json({ error: 'Bu dosya türü desteklenmiyor.' }, 400);
  if (!(await consumeQuota(env, `upload_${uid}`, UPLOADS_PER_DAY))) return json({ error: 'Günlük dosya yükleme hakkınız doldu.' }, 429);
  // Dosya adı tahmin edilemez ve kullanıcı kimliği adreste görünmez.
  const params = { allowed_formats: kind.formats, overwrite: 'false', public_id: `f/${crypto.randomUUID()}`, timestamp: String(Math.floor(Date.now() / 1000)), type: 'authenticated' };
  return json({
    url: `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${kind.resource}/upload`,
    fields: { ...params, api_key: env.CLOUDINARY_API_KEY, signature: await signParams(params, env.CLOUDINARY_API_SECRET) },
  });
}
