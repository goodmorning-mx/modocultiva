// Real browser UI against a local build. Only static app traffic is allowed;
// both login identities, state stores, and all API traffic are synthetic.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const origin = new URL(process.argv[2] ?? 'http://127.0.0.1:4173');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname) && !origin.username && !origin.password && !origin.search && !origin.hash, 'Loopback only');
const modes = ['fisico', 'intelectual', 'emocional', 'arquetipico', 'espiritual', 'romantico', 'familiar', 'social', 'financiero', 'profesional', 'ludico', 'visionario'];
const fields = ['profileName', 'levels', 'presets', 'selectedPreset', 'activityDrafts'];
const password = 'synthetic-fixture-not-a-real-password';
const visitor = 'synthetic-language-scope-guest';
const session = (key, name, language, languageSource, offset) => {
  const levels = Object.fromEntries(modes.map((mode, index) => [mode, (index + offset) % 10]));
  const preset = `Fixture map · ${key}`;
  const state = {
    profileName: name, levels, presets: { [preset]: { ...levels } }, selectedPreset: preset,
    activityDrafts: { [`fisico-${levels.fisico}`]: `Text authored for ${key}; do not translate.` },
    language, languageSource, skin: 'holista', profileImage: null, paletteFilter: 'none', activePlan: 'ultimate',
    activityAlignments: {}, activityCompletions: {}, activityReactions: {}, insightRequests: {}, visionImages: {}, featuredBadges: [],
    onboardingWelcomeCompleted: true,
  };
  const identity = {
    user_id: '00000000-0000-4000-8000-000000000909',
    organization_id: `00000000-0000-4000-8000-00000000090${offset}`,
    name, email: `${key}@fixture.invalid`, roles: [], permissions: [],
  };
  return { key, baseline: structuredClone(state), state, identity, token: `synthetic-${key}`, revision: 1, writes: [] };
};
const guest = session('guest', 'Fixture guest', 'ar', 'manual', 0);
const a = session('account-a', 'Fixture account A', 'fr', 'manual', 1);
const b = session('account-b', 'Fixture account B', 'en', 'auto', 2);
const actors = [a, b];
const verifyData = (state, actor) => {
  for (const field of fields) assert.deepEqual(state[field], actor.baseline[field], `${actor.key}: keep ${field} unchanged`);
};
const violations = [];
const logged = [];
const browsers = [];
async function openBrowser(channel, locale, hasGuestPreference) {
  const browser = await chromium.launch({ channel, headless: true });
  browsers.push(browser);
  const context = await browser.newContext({ viewport: { width: 870, height: 760 }, locale, serviceWorkers: 'block', reducedMotion: 'reduce' });
  await context.addInitScript(({ guest, visitor, hasGuestPreference }) => {
    const marker = '__language_scope_seeded';
    if (localStorage.getItem(marker)) return;
    localStorage.setItem(marker, '1');
    localStorage.setItem('modoCultiva_welcomeVisitorId', visitor);
    localStorage.setItem(`modo-cultiva:welcome-intro:v1:guest:${visitor}`, JSON.stringify({ version: 1, completed: true }));
    if (!hasGuestPreference) return;
    const prefix = 'modo-cultiva:guest-cache:v1:modoCultiva_';
    localStorage.setItem(prefix + 'manualLanguage_v1', JSON.stringify({ version: 1, source: 'manual', language: guest.language }));
    localStorage.setItem(prefix + 'language', guest.language);
    localStorage.setItem(prefix + 'language_source', 'manual');
    localStorage.setItem(prefix + 'profileName', guest.profileName);
    localStorage.setItem(prefix + 'lastState', JSON.stringify(guest.levels));
    localStorage.setItem(prefix + 'presets', JSON.stringify(guest.presets));
    localStorage.setItem(prefix + 'selectedPreset', guest.selectedPreset);
    localStorage.setItem(prefix + 'activityDrafts', JSON.stringify(guest.activityDrafts));
  }, { guest: guest.state, visitor, hasGuestPreference });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()), method = request.method();
    const reply = (value, status = 200) => route.fulfill({ json: value, status, headers: {
      'access-control-allow-origin': origin.origin,
      'access-control-allow-headers': 'authorization,content-type',
      'access-control-allow-methods': 'GET,PUT,POST,OPTIONS',
    } });
    const path = url.pathname;
    if (path === '/health' && method === 'GET') return reply({ status: 'ok', app_env: 'synthetic-test', version: 'qa-only' });
    if (path === '/auth/login' && method === 'POST') {
      const body = request.postDataJSON();
      const actor = actors.find(value => value.identity.email === body.email);
      if (!actor || body.password !== password) { violations.push('Unexpected login'); return reply({}, 401); }
      logged.push(actor.key);
      return reply({ access_token: actor.token, refresh_token: actor.token + '-refresh', expires_in: 3600, identity: actor.identity });
    }
    if (path === '/auth/logout' && method === 'POST') {
      if (!actors.some(actor => request.postDataJSON().refresh_token === actor.token + '-refresh')) violations.push('Unexpected logout');
      return reply({});
    }
    if ((path.startsWith('/auth/') || path.startsWith('/community/') || path === '/state') && method === 'OPTIONS') return reply({});
    if (path === '/auth/me' || path === '/state' || path.startsWith('/community/')) {
      const actor = actors.find(value => request.headers().authorization === `Bearer ${value.token}`);
      if (!actor) { violations.push('Unexpected authenticated request'); return reply({}, 401); }
      if (path === '/auth/me' && method === 'GET') return reply(actor.identity);
      const snapshot = () => ({ state: actor.state, revision: String(actor.revision), validationReceipts: {}, legacyCompletionSlots: [] });
      if (path === '/state' && method === 'GET') return reply(snapshot());
      if (path === '/state' && method === 'PUT') {
        const { state, expected_revision } = request.postDataJSON();
        if (String(expected_revision) !== String(actor.revision)) return reply(snapshot(), 409);
        try { verifyData(state, actor); } catch (error) { violations.push(error.message); return reply({}, 400); }
        actor.state = structuredClone(state); actor.revision++; actor.writes.push({ language: state.language, source: state.languageSource });
        return reply(snapshot());
      }
      if (path.startsWith('/community/') && method === 'GET') return reply({ members: [], notifications: [], submissions: [], cards: [], requests: [] });
    }
    if (url.origin === origin.origin && method === 'GET' && !['xhr', 'fetch'].includes(request.resourceType())) return route.continue();
    if (['xhr', 'fetch'].includes(request.resourceType()) || method !== 'GET') violations.push(`Unexpected ${method} ${path}`);
    return route.abort('blockedbyclient');
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on('pageerror', error => violations.push(error.message));
  await page.goto(origin.href, { waitUntil: 'domcontentloaded' });
  return { context, page };
}
const dashboard = async page => {
  await page.locator('.home-menu-button').click();
  await page.locator('[data-home-menu-item="dashboard"]').click();
};
const menuAction = async page => {
  await dashboard(page);
  await page.locator('.profile-button').click();
  await page.locator('.profile-menu-dropdown [role="menuitem"]').last().click();
};
const verifyHome = async (page, language, name) => {
  await page.waitForFunction(({ language, name }) => {
    const greeting = document.querySelector('.home-greeting h1 strong')?.textContent;
    return document.documentElement.lang === language && (!name || greeting === name) && !!document.querySelector('.welcome-view') && !document.querySelector('.state-account-boundary');
  }, { language: language === 'zh' ? 'zh-CN' : language, name });
  assert.equal(await page.locator('html').getAttribute('dir'), language === 'ar' ? 'rtl' : 'ltr');
};
const signIn = async (page, actor, language) => {
  await menuAction(page);
  await page.locator('#login-username').fill(actor.identity.email);
  await page.locator('#login-password').fill(password);
  await page.locator('.login-submit').click();
  await verifyHome(page, language, actor.identity.name);
};
const choose = async (page, language, name) => {
  await page.locator('.home-menu-button').click();
  await page.locator('.home-sidebar-language select').selectOption(language);
  await page.locator('.home-sidebar-close').click();
  await verifyHome(page, language, name);
};
const verifyGuest = async page => {
  await verifyHome(page, 'ar', guest.state.profileName);
  const restored = await page.evaluate(() => {
    const read = key => localStorage.getItem(`modo-cultiva:guest-cache:v1:modoCultiva_${key}`);
    return {
      profileName: read('profileName'), levels: JSON.parse(read('lastState')),
      presets: JSON.parse(read('presets')), selectedPreset: read('selectedPreset'),
      activityDrafts: JSON.parse(read('activityDrafts')),
    };
  });
  verifyData(restored, guest);
};

try {
  const same = await openBrowser('chrome', 'hi-IN', true);
  await verifyGuest(same.page);
  await signIn(same.page, a, 'fr');
  await choose(same.page, 'da', a.state.profileName);
  await menuAction(same.page);
  await verifyGuest(same.page);
  assert.equal(a.state.language, 'da');
  assert.equal(a.state.languageSource, 'manual');
  await signIn(same.page, b, 'hi');
  await choose(same.page, 'it', b.state.profileName);
  await menuAction(same.page);
  await verifyGuest(same.page);
  assert.equal(b.state.language, 'it');
  assert.equal(a.state.language, 'da');
  await signIn(same.page, a, 'da');
  await same.page.reload({ waitUntil: 'domcontentloaded' });
  await verifyHome(same.page, 'da', a.state.profileName);
  await menuAction(same.page);
  await verifyGuest(same.page);
  await same.context.close();

  const other = await openBrowser('msedge', 'pt-BR', false);
  await verifyHome(other.page, 'pt');
  await signIn(other.page, b, 'it');
  await menuAction(other.page);
  await verifyHome(other.page, 'pt');
  await signIn(other.page, a, 'da');
  await other.context.close();
  for (const actor of actors) verifyData(actor.state, actor);
  assert.ok(a.writes.every(({ source, language }) => source === 'manual' && ['fr', 'da'].includes(language)));
  assert.ok(b.writes.every(({ source, language }) => source === 'manual' ? language === 'it' : ['en', 'hi'].includes(language)));
  assert.deepEqual(logged, ['account-a', 'account-b', 'account-a', 'account-b', 'account-a']);
  assert.deepEqual(violations, []);
  console.log('[language-scope] guest, two separately scoped accounts, reload, and fresh Edge browser: PASS (synthetic API only)');
} finally {
  await Promise.all(browsers.map(browser => browser.close()));
}
