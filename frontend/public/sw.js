const CACHE = 'modo-cultiva-shell-v10';
// Keep this URL and the manifest identity stable for existing Android installs.
const MANIFEST = '/manifest.webmanifest?v=2026-11-23-clear-launch';
const BRAND_ICONS = [
  '/brand/cultiva-electric-green-32.png',
  '/brand/cultiva-electric-green-180.png',
  '/brand/cultiva-electric-mark-v1.webp',
  '/brand/cultiva-electric-clear-192.png',
  '/brand/cultiva-electric-clear-512.png',
  '/brand/cultiva-electric-flat-maskable-512.png',
];
// Older installations may still ask for the icon URLs stored at install time.
const LEGACY_ICONS = {
  '/brand/cultiva-electric-green-192.png': '/brand/cultiva-electric-clear-192.png',
  '/brand/cultiva-electric-green-512.png': '/brand/cultiva-electric-clear-512.png',
  '/brand/cultiva-electric-green-maskable-512.png': '/brand/cultiva-electric-flat-maskable-512.png',
  '/modo-cultiva-icon-192.png': '/brand/cultiva-electric-clear-192.png',
  '/modo-cultiva-icon-512.png': '/brand/cultiva-electric-clear-512.png',
};
self.addEventListener('install', (event) => {
  self.skipWaiting();
  // Bypass previously cached installation metadata when upgrading the shell.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(
    ['/', MANIFEST, ...BRAND_ICONS]
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
  const icon = LEGACY_ICONS[url.pathname] ?? url.pathname;
  if (url.origin === self.location.origin && BRAND_ICONS.includes(icon)) {
    // Installed and legacy URLs serve the same artwork online and offline.
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(icon);
      if (hit) return hit;
      const response = await fetch(new Request(new URL(icon, url.origin), { cache: 'reload' }));
      if (response.ok) await cache.put(icon, response.clone());
      return response;
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
