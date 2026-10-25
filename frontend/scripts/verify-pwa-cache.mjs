import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const origin = 'https://pwa.example.test';
const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const manifestUrl = new URL(html.match(/rel="manifest" href="([^"]+)"/)[1], origin).href;
const oldManifest = { ...manifest, short_name: 'Cultiva' };
const json = (value) => new Response(JSON.stringify(value), { headers: { 'Content-Type': 'application/manifest+json' } });
const key = (request) => new URL(typeof request === 'string' ? request : request.url, origin).href;
const stores = new Map();
const handlers = new Map();
const calls = [];
let offline = false;
let claimed = false;

// Model a phone with both the old shell and stale HTTP installation metadata.
async function network(request, options) {
  const url = key(request);
  const mode = options?.cache ?? request.cache;
  calls.push({ url, mode });
  if (offline) throw new TypeError('Offline');
  if (new URL(url).pathname === '/manifest.webmanifest') {
    return json(['reload', 'no-store', 'no-cache'].includes(mode) ? manifest : oldManifest);
  }
  return new Response(url === `${origin}/` ? '<html>Modo Cultiva</html>' : 'asset');
}

const caches = {
  async open(name) {
    if (!stores.has(name)) stores.set(name, new Map());
    const entries = stores.get(name);
    return {
      async put(request, response) { entries.set(key(request), response.clone()); },
      async match(request) { return entries.get(key(request))?.clone(); },
      async addAll(requests) {
        for (const request of requests) entries.set(key(request), await network(request));
      },
    };
  },
  async keys() { return [...stores.keys()]; },
  async delete(name) { return stores.delete(name); },
  async match(request) {
    for (const entries of stores.values()) {
      if (entries.has(key(request))) return entries.get(key(request)).clone();
    }
  },
};
const oldCache = await caches.open('modo-cultiva-shell-v6');
await oldCache.put('/manifest.webmanifest', json(oldManifest));
await oldCache.put('/', new Response('<html>Old shell</html>'));
const userCache = await caches.open('user-content');
await userCache.put('/saved-map', json({ fisico: 7, familiar: 4 }));

runInNewContext(readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8'), {
  self: {
    location: { origin },
    addEventListener: (name, handler) => handlers.set(name, handler),
    skipWaiting() {},
    clients: { claim() { claimed = true; } },
  },
  caches,
  fetch: network,
  URL,
  Request: class extends Request {
    constructor(url, options) { super(new URL(url, origin), options); }
  },
  Response,
});

let lifecycle;
handlers.get('install')({ waitUntil: (promise) => { lifecycle = promise; } });
await lifecycle;
assert.ok(calls.length >= 4 && calls.every((call) => call.mode === 'reload'), 'Upgrade must bypass stale HTTP cache for the shell and installation assets');
const currentCache = stores.get((await caches.keys()).find((name) => name.startsWith('modo-cultiva-shell-') && name !== 'modo-cultiva-shell-v6'));
assert.equal((await currentCache.get(manifestUrl).clone().json()).short_name, 'Modo Cultiva');

handlers.get('activate')({ waitUntil: (promise) => { lifecycle = promise; } });
await lifecycle;
assert.equal(stores.has('modo-cultiva-shell-v6'), false, 'Old abbreviated metadata must be discarded');
assert.equal(claimed, true);
assert.deepEqual(await (await userCache.match('/saved-map')).json(), { fisico: 7, familiar: 4 }, 'Unrelated user caches must survive the upgrade');

function dispatchFetch(path, destination = '', method = 'GET') {
  let response;
  handlers.get('fetch')({
    request: { url: new URL(path, origin).href, destination, method },
    respondWith(promise) { response = promise; },
  });
  return response;
}

for (const path of [manifestUrl, '/manifest.webmanifest']) {
  const response = await dispatchFetch(path);
  assert.equal(response.headers.get('Content-Type'), 'application/manifest+json');
  const data = await response.json();
  assert.equal(data.name, 'Modo Cultiva');
  assert.equal(data.short_name, 'Modo Cultiva');
  assert.equal(calls.at(-1).mode, 'no-store', 'Browser metadata requests must bypass stale HTTP responses');
}
await dispatchFetch('/', 'document');
assert.equal(calls.at(-1).mode, 'no-cache', 'Page refreshes must revalidate the linked manifest version');

offline = true;
assert.equal((await (await dispatchFetch('/manifest.webmanifest')).json()).short_name, 'Modo Cultiva', 'Offline metadata must use the current name');
currentCache.delete(manifestUrl);
assert.equal((await dispatchFetch('/manifest.webmanifest')).type, 'error', 'Missing offline metadata must not fall back to HTML or an old name');
for (const path of ['/auth/session', '/state', '/agent/run', '/ai/generate', '/api/state']) {
  assert.equal(dispatchFetch(path), undefined, `${path} must stay outside the shell cache`);
}
assert.equal(dispatchFetch('/manifest.webmanifest', '', 'POST'), undefined);
assert.equal(dispatchFetch('https://other.example.test/manifest.webmanifest'), undefined);

console.log('[pwa-cache-check] Stale-install upgrade, full name online/offline, user-cache preservation and API boundaries passed');
