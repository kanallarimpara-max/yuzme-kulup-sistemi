// Özel dosya yüklemesi. Yükleme ayarının adı yalnız Worker'da kalır, dosya oturum ve kota denetiminden geçer.
import { consumeQuota } from './push.js';

const UPLOADS_PER_DAY = 30;
const MAX_BYTES = 10_000_000;
const resourceFor = (type) => (type.startsWith('image/') || type === 'application/pdf' ? 'image' : type.startsWith('audio/') ? 'video' : null);

export async function handleUpload(request, env, uid, json) {
  if (!env.CLOUDINARY_CLOUD_NAME || !env.CLOUDINARY_UPLOAD_PRESET || !env.FIREBASE_SERVICE_ACCOUNT) {
    return json({ error: 'Dosya yükleme henüz ayarlanmadı.' }, 503);
  }
  const declared = Number(request.headers.get('Content-Length') ?? 0);
  if (declared > MAX_BYTES + 4096) return json({ error: 'Dosya en fazla 10 MB olabilir.' }, 413);
  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return json({ error: 'Dosya bulunamadı.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'Dosya en fazla 10 MB olabilir.' }, 413);
  const resource = resourceFor(file.type);
  if (!resource) return json({ error: 'Bu dosya türü desteklenmiyor.' }, 400);
  if (!(await consumeQuota(env, `upload_${uid}`, UPLOADS_PER_DAY))) return json({ error: 'Günlük dosya yükleme hakkınız doldu.' }, 429);

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', env.CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/${resource}/upload`, { method: 'POST', body });
  if (!res.ok) return json({ error: 'Dosya yüklenemedi.' }, 502);
  const url = (await res.json()).secure_url;
  if (typeof url !== 'string' || !url.startsWith(`https://res.cloudinary.com/${env.CLOUDINARY_CLOUD_NAME}/`)) return json({ error: 'Dosya yüklenemedi.' }, 502);
  return json({ url });
}
