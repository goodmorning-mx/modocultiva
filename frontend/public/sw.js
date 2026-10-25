const CACHE = 'modo-cultiva-shell-v7';
const MANIFEST = '/manifest.webmanifest?v=2026-10-25-full-name';
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Bypass previously cached installation metadata when upgrading the shell.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(
    ['/', MANIFEST, '/modo-cultiva-icon-192.png', '/modo-cultiva-icon-512.png']
      .map((url) => new Request(url, { cache: 'reload' })),
  )));
});
self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys
    .filter((key) => key.startsWith('modo-cultiva-shell-') && key !== CACHE)
    .map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.pathname.startsWith('/auth/') || url.pathname.startsWith('/state') || url.pathname.startsWith('/agent/') || url.pathname.startsWith('/ai/') || url.pathname.startsWith('/api/')) return;
  if (url.origin === self.location.origin && url.pathname === '/manifest.webmanifest') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(request, { cache: 'no-store' });
        if (response.ok) await cache.put(MANIFEST, response.clone());
        return response;
      } catch {
        // Only use this release's metadata offline; never an old name or HTML.
        return (await cache.match(MANIFEST)) || Response.error();
      }
    })());
    return;
  }
  const cacheable = request.destination === 'document' || ['script', 'style', 'image', 'font'].includes(request.destination);
  if (!cacheable) return;
  event.respondWith(fetch(request, request.destination === 'document' ? { cache: 'no-cache' } : undefined).then((response) => {
    if (response.ok) {
      const copy = response.clone();
      void caches.open(CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  }).catch(() => caches.match(request).then((cached) => cached || caches.match('/'))));
});
