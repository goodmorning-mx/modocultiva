const CACHE = 'modo-cultiva-shell-v6';
self.addEventListener('install', (event) => { self.skipWaiting(); event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(['/', '/manifest.webmanifest', '/modo-cultiva-icon-192.png', '/modo-cultiva-icon-512.png']))); });
self.addEventListener('activate', (event) => { event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim())); });
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/state') || url.pathname.startsWith('/agent/') || url.pathname.startsWith('/ai/') || url.pathname.startsWith('/api/')) return;
  const cacheable = request.destination === 'document' || ['script', 'style', 'image', 'font'].includes(request.destination);
  if (!cacheable) return;
  event.respondWith(fetch(request).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))));
});
