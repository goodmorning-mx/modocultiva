import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

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
if (manifestHref !== '/manifest.webmanifest?v=2026-11-23-clear-launch') fail('keep the deployed manifest URL stable for installed apps');
if (!existsSync(resolve(root, 'public/downloads/modo-cultiva.apk'))) fail('Android fallback APK is missing');
for (const field of ['name', 'short_name', 'start_url', 'scope', 'display', 'icons']) {
  if (!manifest[field]) fail(`manifest is missing ${field}`);
}
if (manifest.prefer_related_applications !== false) fail('manifest must explicitly prefer the PWA over related native applications');
if (!Array.isArray(manifest.display_override) || !manifest.display_override.includes('standalone')) fail('manifest is missing standalone display override');

const brandPath = (name) => `/brand/cultiva-electric-green-${name}.png`;
const launchMarkPath = '/brand/cultiva-electric-mark-v1.webp';
const iconDimensions = [
  [32, brandPath(32)], [180, brandPath(180)],
  [192, '/brand/cultiva-electric-clear-192.png', 'any'],
  [512, '/brand/cultiva-electric-clear-512.png', 'any'],
  [512, '/brand/cultiva-electric-flat-maskable-512.png', 'maskable'],
];
for (const [size, src, purpose] of iconDimensions) {
  if (purpose && !manifest.icons.some(icon => icon.src === src && icon.sizes === `${size}x${size}` && icon.purpose === purpose)) {
    fail(`manifest is missing the ${size}px ${purpose} icon`);
  }
  const bytes = readFileSync(resolve(root, `public${src}`));
  if (bytes.toString('hex', 0, 8) !== '89504e470d0a1a0a' || bytes.readUInt32BE(16) !== size || bytes.readUInt32BE(20) !== size) fail(`icon has invalid format or size: ${src}`);
  if (purpose === 'any' && ![4, 6].includes(bytes[25]) && !bytes.includes(Buffer.from('tRNS'))) fail(`startup icon must have alpha: ${src}`);
}
for (const [rel, size] of [['icon', 32], ['apple-touch-icon', 180]]) {
  const tag = html.match(new RegExp(`<link rel="${rel}"[^>]*>`))?.[0];
  if (!tag?.includes(`href="${brandPath(size)}"`) || !tag.includes(`sizes="${size}x${size}"`)) fail(`wrong ${rel} metadata`);
}
if (!html.includes(`name="theme-color" content="${manifest.theme_color}"`) || manifest.theme_color !== '#0b231f') fail('PWA chrome must match the green brand');
if (!html.includes(`<img id="pwa-launch-mark" src="${launchMarkPath}"`) || !html.includes('<p id="pwa-launch-name">Modo Cultiva</p>')) fail('the launch screen must show the approved mark and the wordmark before loading JavaScript');
if (manifest.background_color !== manifest.theme_color || !html.includes(`background: ${manifest.background_color};`)) fail('the native and web launch surfaces must have the same background');
const launchMark = readFileSync(resolve(root, `public${launchMarkPath}`));
if (launchMark.toString('ascii', 8, 16) !== 'WEBPVP8X' || !(launchMark[20] & 0x10) || launchMark.length >= 80_000) fail('the launch mark must have alpha and remain lightweight');
if (!read('src/brandAssets.ts').includes(`'${launchMarkPath}'`) || !read('src/main.tsx').includes("document.getElementById('pwa-launch')?.remove()")) fail('the startup logo must be shared with the app, and startup must hand off to React');

const serviceWorker = read('public/sw.js');
if (!serviceWorker.includes(`'${launchMarkPath}'`)) fail('the launch mark must be available offline');
const nginx = read('nginx.conf');
for (const [previous, current] of [
  ['/brand/cultiva-electric-green-192.png', '/brand/cultiva-electric-clear-192.png'],
  ['/brand/cultiva-electric-green-512.png', '/brand/cultiva-electric-clear-512.png'],
  ['/brand/cultiva-electric-green-maskable-512.png', '/brand/cultiva-electric-flat-maskable-512.png'],
  ['/modo-cultiva-icon-192.png', '/brand/cultiva-electric-clear-192.png'],
  ['/modo-cultiva-icon-512.png', '/brand/cultiva-electric-clear-512.png'],
]) {
  if (!readFileSync(resolve(root, `public${previous}`)).equals(readFileSync(resolve(root, `public${current}`)))) fail(`legacy URL still serves different artwork: ${previous}`);
  if (!serviceWorker.includes(`'${previous}': '${current}'`)) fail(`missing offline upgrade for ${previous}`);
}
for (const path of ['/', '/index.html', '/manifest.webmanifest', '/sw.js']) {
  const location = nginx.split(`location = ${path} {`)[1]?.split('}')[0];
  if (!location?.includes('Cache-Control "no-cache, max-age=0, must-revalidate" always')) fail(`${path} must revalidate installation metadata`);
}
if (!serviceWorker.includes(`const MANIFEST = '${manifestHref}'`)) fail('offline metadata must match the version linked by the page');
if (!nginx.includes('text/html html;') || !nginx.includes('application/javascript js mjs;') || !nginx.includes('text/css css;') || !nginx.includes('application/manifest+json webmanifest') || !nginx.includes('location = /') || !nginx.includes('location = /index.html') || !nginx.includes('default_type text/html') || !nginx.includes('location ~* \\.m?js$') || !nginx.includes('location ~* \\.css$') || !nginx.includes('location = /manifest.webmanifest') || !nginx.includes('default_type application/manifest+json') || !nginx.includes('location = /sw.js') || !nginx.includes('default_type application/javascript') || !nginx.includes('location = /downloads/modo-cultiva.apk') || !nginx.includes('application/vnd.android.package-archive') || !nginx.includes('Content-Disposition "inline"')) {
  fail('nginx does not serve webmanifest with the installable MIME type');
}
for (const required of ["request.method !== 'GET'", "startsWith('/auth/')", "startsWith('/api/')", "BRAND_ICONS", "SKIP_WAITING", 'clients.claim']) {
  if (!serviceWorker.includes(required)) fail(`service worker contract is missing ${required}`);
}

if (serviceWorker.includes('modo-cultiva-shell-v3')) fail('old service-worker cache remains');
if (!read('src/main.tsx').includes("navigator.serviceWorker.register('/sw.js')")) fail('service worker is not registered before the app mounts');
if (!existsSync(resolve(root, 'node_modules/@goodmorning/gm-pwa/frontend/dist/index.js'))) fail('GM-PWA build output is missing');

const launchClock = html.match(/<script id="pwa-launch-clock">([\s\S]*?)<\/script>/)?.[1];
if (!launchClock || !read('src/main.tsx').includes('launchReady.then(mount)')) fail('standalone launch clock must gate the real React entry point');

function evaluateClock({ installed = true, loaded = true } = {}) {
  let now = 0, nextTask = 0, ready = false;
  const tasks = new Map();
  const setTimeout = (run, delay) => { tasks.set(++nextTask, { run, at: now + delay }); return nextTask; };
  const clearTimeout = id => tasks.delete(id);
  const mark = Object.assign(new EventTarget(), { complete: loaded });
  const document = Object.assign(new EventTarget(), { hidden: false, getElementById: () => mark });
  const window = {};
  runInNewContext(launchClock, {
    matchMedia: () => ({ matches: installed }), document, navigator: { userAgent: '' }, window,
    performance: { now: () => now }, setTimeout, clearTimeout,
    requestAnimationFrame: run => setTimeout(run, 16), cancelAnimationFrame: clearTimeout,
  });
  window.modoCultivaLaunchReady?.then(() => { ready = true; });
  return {
    gated: Boolean(window.modoCultivaLaunchReady), mark,
    get ready() { return ready; },
    setHidden(hidden) { document.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); },
    async advance(duration) {
      const end = now + duration;
      let pending;
      while ((pending = [...tasks].sort((a, b) => a[1].at - b[1].at)[0]) && pending[1].at <= end) {
        tasks.delete(pending[0]);
        now = pending[1].at;
        pending[1].run();
      }
      now = end;
      await Promise.resolve();
    },
  };
}
assert.equal(evaluateClock({ installed: false }).gated, false, 'Browser tabs are not artificially delayed');
const standalone = evaluateClock();
await standalone.advance(632); // Two paints, then 600 ms of actual foreground view.
standalone.setHidden(true);
await standalone.advance(10000);
assert.equal(standalone.ready, false, 'Time while hidden must not consume the visible launch');
standalone.setHidden(false);
await standalone.advance(631);
assert.equal(standalone.ready, false);
await standalone.advance(1);
assert.equal(standalone.ready, true);
const loadingMark = evaluateClock({ loaded: false });
await loadingMark.advance(500);
loadingMark.mark.dispatchEvent(new Event('load'));
await loadingMark.advance(1231);
assert.equal(loadingMark.ready, false, 'Slow logo fetch does not consume its display time');
await loadingMark.advance(1);
assert.equal(loadingMark.ready, true);
const missingMark = evaluateClock({ loaded: false });
await missingMark.advance(2032);
assert.equal(missingMark.ready, true, 'A stalled mark cannot strand the app');

console.log('[pwa-check] transparent launch mark, timing, footer, stable manifest, legacy icons and offline assets verified');
