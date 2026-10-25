import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const read = (relative) => readFileSync(resolve(root, relative), 'utf8');
const fail = (message) => { console.error(`[pwa-check] ${message}`); process.exit(1); };

const manifest = JSON.parse(read('public/manifest.webmanifest'));
if (manifest.name !== 'Modo Cultiva' || manifest.short_name !== 'Modo Cultiva') fail('both installation names must be Modo Cultiva');
if (manifest.id !== '/' || manifest.start_url !== '/' || manifest.scope !== '/') fail('existing app identity and scope must be preserved');
const html = read('index.html');
for (const required of ['<title>Modo Cultiva</title>', 'name="application-name" content="Modo Cultiva"', 'name="apple-mobile-web-app-title" content="Modo Cultiva"']) {
  if (!html.includes(required)) fail(`installation name fallback is missing: ${required}`);
}
const manifestHref = html.match(/rel="manifest" href="([^"]+)"/)?.[1];
if (!manifestHref?.startsWith('/manifest.webmanifest?v=')) fail('installation metadata must have a versioned URL');
if (!existsSync(resolve(root, 'public/downloads/modo-cultiva.apk'))) fail('Android fallback APK is missing');
for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
  if (!manifest[field]) fail(`manifest is missing ${field}`);
}
if (manifest.prefer_related_applications !== false) fail('manifest must explicitly prefer the PWA over related native applications');
if (!Array.isArray(manifest.display_override) || !manifest.display_override.includes('standalone')) fail('manifest is missing standalone display override');

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
for (const path of ['/', '/index.html', '/manifest.webmanifest', '/sw.js']) {
  const location = nginx.split(`location = ${path} {`)[1]?.split('}')[0];
  if (!location?.includes('Cache-Control "no-cache, max-age=0, must-revalidate" always')) fail(`${path} must revalidate installation metadata`);
}
if (!serviceWorker.includes(`const MANIFEST = '${manifestHref}'`)) fail('offline metadata must match the version linked by the page');
if (!nginx.includes('text/html html;') || !nginx.includes('application/javascript js mjs;') || !nginx.includes('text/css css;') || !nginx.includes('application/manifest+json webmanifest') || !nginx.includes('location = /') || !nginx.includes('location = /index.html') || !nginx.includes('default_type text/html') || !nginx.includes('location ~* \\.m?js$') || !nginx.includes('location ~* \\.css$') || !nginx.includes('location = /manifest.webmanifest') || !nginx.includes('default_type application/manifest+json') || !nginx.includes('location = /sw.js') || !nginx.includes('default_type application/javascript') || !nginx.includes('location = /downloads/modo-cultiva.apk') || !nginx.includes('application/vnd.android.package-archive') || !nginx.includes('Content-Disposition "inline"')) {
  fail('nginx does not serve webmanifest with the installable MIME type');
}
for (const required of ["request.method !== 'GET'", "startsWith('/auth/')", "startsWith('/api/')", "modo-cultiva-icon-192.png", "modo-cultiva-icon-512.png", "SKIP_WAITING", 'clients.claim']) {
  if (!serviceWorker.includes(required)) fail(`service worker contract is missing ${required}`);
}

if (serviceWorker.includes('modo-cultiva-shell-v3')) fail('old service-worker cache remains');
if (!read('src/main.tsx').includes("navigator.serviceWorker.register('/sw.js')")) fail('service worker is not registered before the app mounts');
if (!existsSync(resolve(root, 'node_modules/@goodmorning/gm-pwa/frontend/dist/index.js'))) fail('GM-PWA build output is missing');

console.log('[pwa-check] manifest, service worker boundaries and GM-PWA build output verified');
