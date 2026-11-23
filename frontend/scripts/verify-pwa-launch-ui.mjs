import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); }
catch { playwright = require(resolve(dirname(process.execPath), '..', 'node_modules', 'playwright')); }

const site = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['127.0.0.1', 'localhost'].includes(site.hostname) || site.origin === 'https://dev.modocultiva.goodmorning.mx');
const screenshot = process.argv[3];
const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const { width, height, installed = null } of [
    { width: 390, height: 844 }, { width: 667, height: 375 }, { width: 1280, height: 800 },
    { width: 390, height: 844, installed: 'fast' }, { width: 390, height: 844, installed: 'slow' },
  ]) {
    const viewport = { width, height };
    const mobile = viewport.width < 768;
    const context = await browser.newContext({
      viewport, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1,
      reducedMotion: 'reduce', serviceWorkers: 'block',
    });
    let release;
    const boot = new Promise(resolveBoot => { release = resolveBoot; });
    let bundleHeld = false;
    try {
      if (installed) {
        await context.addInitScript(() => {
          const actualMatchMedia = window.matchMedia.bind(window);
          window.matchMedia = media => {
            const result = actualMatchMedia(media);
            if (media === '(display-mode: standalone)') Object.defineProperty(result, 'matches', { value: true });
            return result;
          };
        });
      }
      await context.route('**/*', async route => {
        const request = route.request();
        const url = new URL(request.url());
        if (url.origin !== site.origin || ['fetch', 'xhr', 'eventsource', 'other'].includes(request.resourceType())) {
          return route.abort();
        }
        if (/^\/assets\/index-[\w-]+\.js$/.test(url.pathname)) {
          bundleHeld = true;
          await boot;
        }
        return route.continue();
      });
      const page = await context.newPage();
      if (installed) {
        await page.clock.install({ time: new Date('2026-11-23T12:00:00Z') });
        await page.clock.pauseAt(new Date('2026-11-23T12:00:01Z'));
      }
      await page.goto(site.href, { waitUntil: 'commit' });
      const splash = page.locator('#pwa-launch');
      const logo = splash.locator('#pwa-launch-mark');
      const wordmark = splash.getByText('Modo Cultiva', { exact: true });
      await splash.waitFor();
      await logo.evaluate(img => img.decode());
      assert.equal(bundleHeld, true, 'The screen must be visible before the application bundle resolves');
      assert.equal(await page.locator('#root').evaluate(root => root.childElementCount), 0, 'Nothing is mounted behind the first paint');
      assert.equal(await splash.evaluate(el => getComputedStyle(el).backgroundColor), 'rgb(11, 35, 31)');
      const markBox = await logo.boundingBox();
      const nameBox = await wordmark.boundingBox();
      const near = (a, b) => Math.abs(a - b) <= 1;
      assert.ok(near(markBox.x + markBox.width / 2, viewport.width / 2));
      assert.ok(near(markBox.y + markBox.height / 2, viewport.height / 2));
      assert.ok(nameBox.y > viewport.height * .78 && nameBox.y + nameBox.height < viewport.height - 16, 'The name stays near the bottom with room for system gestures');

      // Decode the exact served artwork, not the computed CSS background.
      const pixels = await logo.evaluate(el => {
        const image = document.createElement('canvas');
        image.width = el.naturalWidth; image.height = el.naturalHeight;
        const canvas = image.getContext('2d');
        canvas.drawImage(el, 0, 0);
        const sample = (x, y) => Array.from(canvas.getImageData(x, y, 1, 1).data);
        const end = image.width - 1, mid = Math.floor(image.width / 2);
        return [sample(0, 0), sample(end, 0), sample(0, end), sample(end, end), sample(mid, 0), sample(end, mid), sample(mid, end), sample(0, mid)];
      });
      assert.ok(pixels.every(rgba => rgba[3] === 0), 'Neither corners nor edges of the image may paint a box');

      if (viewport.width === 390 && !installed) {
        const installedIcons = await page.evaluate(async paths => {
          return Promise.all(paths.map(async url => {
            const img = new Image();
            img.src = url;
            await img.decode();
            const tile = document.createElement('canvas');
            tile.width = img.naturalWidth; tile.height = img.naturalHeight;
            const canvas = tile.getContext('2d');
            canvas.drawImage(img, 0, 0);
            const end = tile.width - 1, mid = Math.floor(tile.width / 2);
            const points = [[0, 0], [mid, 0], [end, mid], [mid, end], [0, mid], [end, end]]
              .map(([x, y]) => [...canvas.getImageData(x, y, 1, 1).data]);
            if (!url.includes('maskable')) return { points };
            const { data } = canvas.getImageData(0, 0, tile.width, tile.height);
            const center = end / 2;
            let radius = 0;
            for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
              const i = (y * tile.width + x) * 4;
              if ([11, 35, 31].some((value, channel) => Math.abs(data[i + channel] - value) >= 2)) {
                radius = Math.max(radius, Math.hypot(x - center, y - center));
              }
            }
            return { points, radius, size: tile.width };
          }));
        }, [
          '/brand/cultiva-electric-clear-192.png', '/brand/cultiva-electric-clear-512.png',
          '/brand/cultiva-electric-green-192.png', '/brand/cultiva-electric-green-512.png',
          '/modo-cultiva-icon-192.png', '/modo-cultiva-icon-512.png',
          '/brand/cultiva-electric-flat-maskable-512.png', '/brand/cultiva-electric-green-maskable-512.png',
        ]);
        for (const { points, radius, size } of installedIcons) {
          if (radius === undefined) {
            assert.ok(points.every(pixel => pixel[3] === 0), 'Generic installed icons must be transparent outside their mark');
          } else {
            for (const pixel of points) assert.deepEqual(pixel, [11, 35, 31, 255], 'All adaptive icon edges must blend precisely into the startup background');
            assert.ok(radius > 0 && radius <= size * .4, 'The installed mark stays inside the Android adaptive icon safe circle');
          }
        }
      }

      if (screenshot && viewport.width === 390 && !installed) {
        await mkdir(dirname(resolve(screenshot)), { recursive: true });
        await page.screenshot({ path: screenshot });
      }
      if (installed) {
        await page.evaluate(() => {
          if (!window.modoCultivaLaunchReady) throw new Error('Standalone clock is missing');
          window.modoCultivaLaunchReady.then(() => { window.__qaLaunchReady = true; });
        });
        if (installed === 'fast') {
          release();
          await page.clock.runFor(1100);
          assert.equal(await page.evaluate(() => window.__qaLaunchReady), undefined, 'Fast launches cannot skip the readable splash');
          assert.ok(await splash.isVisible());
          assert.equal(await page.locator('#root').evaluate(root => root.childElementCount), 0, 'Intro or Home must not begin under the splash');
          await page.clock.runFor(200);
          assert.equal(await page.evaluate(() => window.__qaLaunchReady), true);
        } else {
          await page.clock.runFor(3000);
          assert.equal(await page.evaluate(() => window.__qaLaunchReady), true, 'The clock runs while the bundle is loading');
          assert.ok(await splash.isVisible(), 'Do not hide the launch screen until the app is ready');
        }
      } else {
        assert.equal(await page.evaluate(() => window.modoCultivaLaunchReady), undefined, 'Do not delay the ordinary website');
      }
      release();
      await page.locator('.app-shell').waitFor();
      await splash.waitFor({ state: 'detached' });
      assert.ok(await page.locator('.topbar--material-home .home-brand-electric').evaluate(img => img.getAttribute('src') === '/brand/cultiva-electric-mark-v1.webp'), 'Home reuses the startup artwork without downloading a different copy');
      console.log(`[pwa-launch-ui] ${site.origin} ${viewport.width}×${viewport.height} ${installed ?? 'browser'}: transparent first paint, footer, React handoff PASS`);
    } finally {
      release();
      await context.close();
    }
  }
} finally {
  await browser.close();
}
