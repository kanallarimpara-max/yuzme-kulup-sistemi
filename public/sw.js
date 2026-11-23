// Kurulabilir web uygulaması. Yalnız aynı adresteki dosyaları saklar, kişisel veri ve API yanıtı saklamaz.
const CACHE = 'yuzme-kabuk-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
// Uygulama kapalıyken gelen bildirim. Bağlantı yalnız uygulama içi sayfaya gidebilir.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data?.json()?.data ?? {};
  } catch {
    data = {};
  }
  const link = typeof data.link === 'string' && data.link.startsWith('#/') ? data.link : '#/panel';
  event.waitUntil(self.registration.showNotification(data.title || 'Yeni bildirim', {
    body: data.body || 'Görmek için dokunun.', icon: 'icon.svg', badge: 'icon.svg', tag: link, renotify: true, data: { link },
  }));
});
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = new URL(`./${event.notification.data?.link ?? '#/panel'}`, self.registration.scope).toString();
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    const open = list.find((c) => c.url.startsWith(self.registration.scope));
    return open ? open.navigate(target).then((c) => (c ?? open).focus()) : self.clients.openWindow(target);
  }));
});
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      event.waitUntil(caches.open(CACHE).then((cache) => cache.put(event.request, copy)));
    }
    return response;
  }).catch(() => caches.match(event.request).then((hit) => hit ?? Response.error())));
});
