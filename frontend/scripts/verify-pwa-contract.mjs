import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (relative) => readFileSync(resolve(root, relative), 'utf8');
const fail = (message) => { console.error(`[pwa-check] ${message}`); process.exit(1); };

const manifest = JSON.parse(read('public/manifest.webmanifest'));
for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
  if (!manifest[field]) fail(`manifest is missing ${field}`);
}

for (const requiredIcon of [
  { src: '/modo-cultiva-icon-192.png', sizes: '192x192' },
  { src: '/modo-cultiva-icon-512.png', sizes: '512x512' },
]) {
  if (!manifest.icons.some((icon) => icon.src === requiredIcon.src && icon.sizes === requiredIcon.sizes)) {
    fail(`manifest is missing ${requiredIcon.sizes} install icon`);
  }
  if (!existsSync(resolve(root, `public${requiredIcon.src}`))) fail(`install icon is missing: ${requiredIcon.src}`);
}

const serviceWorker = read('public/sw.js');
const nginx = read('nginx.conf');
if (!nginx.includes('application/manifest+json webmanifest') || !nginx.includes('location = /manifest.webmanifest') || !nginx.includes('default_type application/manifest+json') || !nginx.includes('location = /sw.js') || !nginx.includes('default_type application/javascript') || !nginx.includes('Content-Disposition "inline"')) {
  fail('nginx does not serve webmanifest with the installable MIME type');
}
for (const required of ["request.method !== 'GET'", "startsWith('/auth/')", "startsWith('/api/')", "SKIP_WAITING", 'clients.claim']) {
  if (!serviceWorker.includes(required)) fail(`service worker contract is missing ${required}`);
}

if (serviceWorker.includes('modo-cultiva-shell-v3')) fail('old service-worker cache remains');
if (read('src/main.tsx').includes('serviceWorker.register')) fail('service worker is still registered outside GM-PWA');
if (!existsSync(resolve(root, 'node_modules/@goodmorning/gm-pwa/frontend/dist/index.js'))) fail('GM-PWA build output is missing');

console.log('[pwa-check] manifest, service worker boundaries and GM-PWA build output verified');
