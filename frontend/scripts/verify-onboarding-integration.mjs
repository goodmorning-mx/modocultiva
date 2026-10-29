/** Actual built App, synthetic transport only. No API, account, AI or repository writes.
 * node scripts/verify-onboarding-integration.mjs --self-test
 * node scripts/verify-onboarding-integration.mjs --url=http://127.0.0.1:4173
 * --languages=en,ar --widths=320,870 --cases=welcome,tour --replays=2 --workers=2
 * Requires an existing Playwright installation; never installs dependencies or builds App.
 * PLAYWRIGHT_MODULE can name an existing absolute Playwright package directory.
 * Reports JSON lines to stdout; failure diagnostics contain synthetic UI data only.
 */
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as delay } from 'node:timers/promises';
import ts from 'typescript';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const LANGUAGES = ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'];
const WIDTHS = [320, 390, 870, 1440];
const MODES = ['fisico', 'intelectual', 'emocional', 'arquetipico', 'espiritual', 'romantico', 'familiar', 'social', 'financiero', 'profesional', 'ludico', 'visionario'];
const STOPS = ['modes', 'modeDescription', 'selfAssessment', 'activityDesign', 'nextClarity', 'custom', 'bank', 'ai', 'localContacts', 'methods', 'effort', 'activityCard', 'evidence', 'audience', 'reviews', 'vision', 'reactions', 'sharing', 'globalIdeas', 'specialists', 'community', 'profile', 'badges', 'configurations', 'controlCenter', 'controlStrongest', 'controlLeast', 'controlFocus', 'controlTrivia', 'replay'];
const CASES = ['welcome', 'tour', 'identity', 'drafts', 'account-welcome'];
const ACCESS = 'synthetic-qa-token-not-a-credential';
const ORG = '00000000-0000-4000-8000-000000000100';
const USER = '00000000-0000-4000-8000-000000000101';
const VISITOR = 'synthetic-onboarding-visitor';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const ACTIVITY = 'Synthetic saved practice: walk mindfully at the same time each morning.';
const ALIGNMENT = 'Repeating this practice supports recognizing myself in the exact NEXT clarity description.';
const PROPOSAL = 'Synthetic fixture proposal. No AI provider was contacted or charged.';
const clone = value => structuredClone(value);
const emit = value => process.stdout.write(`${JSON.stringify(value)}\n`);

// Read-only in-memory compilation of existing copy/timing, not App or a replacement fixture.
const modules = new Map();
function sourceModule(relative) {
  const filename = resolve(frontend, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} }; modules.set(filename, module);
  const output = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  new Function('require', 'module', 'exports', output)(id => {
    if (!id.startsWith('.')) return require(id);
    const base = resolve(dirname(filename), id);
    const target = ['.ts', '.tsx', ''].map(extension => base + extension).find(existsSync);
    return sourceModule(target);
  }, module, module.exports);
  return module.exports;
}
const { welcomeMessages } = sourceModule('src/welcomeMessages.ts');
const timing = sourceModule('src/welcomeIntroState.ts');
const { stateAccountCopy } = sourceModule('src/stateAccountMessages.ts');
const { onboardingIntegrationCopy } = sourceModule('src/onboardingIntegrationMessages.ts');
const { guidedTourStepCopy } = sourceModule('src/guidedTourMessages.ts');

function options(argv) {
  const result = { url: process.env.ONBOARDING_URL ?? 'http://127.0.0.1:4173', languages: LANGUAGES, widths: WIDTHS, cases: CASES, replays: 2, workers: 2, timeout: 12000, methodRegressions: true, sharePreview: true, draftReplay: 'pointer' };
  for (const argument of argv) {
    const [key, ...parts] = argument.replace(/^--/, '').split('='); const value = parts.join('=');
    if (['self-test', 'help', 'smoke'].includes(key)) { result[key] = true; continue; }
    if (key === 'url') result.url = value;
    else if (key === 'languages') result.languages = value.split(',');
    else if (key === 'widths') result.widths = value.split(',').map(Number);
    else if (key === 'cases') result.cases = value.split(',');
    else if (['replays', 'workers', 'timeout'].includes(key)) result[key] = Number(value);
    else if (key === 'method-regressions') result.methodRegressions = value !== 'off';
    else if (key === 'share-preview') result.sharePreview = value !== 'off';
    else if (key === 'draft-replay') { assert.ok(['pointer', 'keyboard'].includes(value)); result.draftReplay = value; }
    else throw new Error(`Unknown option: ${key}`);
  }
  if (result.smoke) { result.languages = ['en']; result.widths = [390]; result.replays = 1; }
  const url = new URL(result.url);
  assert.ok(['http:', 'https:'].includes(url.protocol) && ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only a local preview is allowed.');
  assert.ok(!url.username && !url.password && !url.search && !url.hash, 'No credentials, tokens or public deep links in the QA URL.');
  result.url = url.origin;
  for (const language of result.languages) assert.ok(LANGUAGES.includes(language), `Unsupported language ${language}`);
  for (const width of result.widths) assert.ok(WIDTHS.includes(width), `Unsupported width ${width}`);
  for (const name of result.cases) assert.ok(CASES.includes(name), `Unknown case ${name}`);
  for (const key of ['replays', 'workers', 'timeout']) assert.ok(Number.isInteger(result[key]) && result[key] > 0, `Invalid ${key}`);
  assert.ok(result.workers <= 4 && result.replays <= 10 && result.timeout <= 60000);
  return result;
}
function fixture(language, established = true) {
  const levels = Object.fromEntries(MODES.map((mode, index) => [mode, established ? index % 10 : 0]));
  if (established) levels.fisico = 3;
  return { levels, language, skin: 'holista', paletteFilter: 'none', activePlan: 'ultimate', profileName: '', profileImage: established ? PNG : null,
    activityDrafts: established ? { 'fisico-3': ACTIVITY, 'social-7': 'Another saved activity that must remain intact.' } : {},
    activityAlignments: established ? { 'fisico-3': ALIGNMENT } : {}, activityCompletions: {}, activityReactions: {}, insightRequests: {},
    presets: established ? { 'QA existing map': clone(levels), 'QA alternate map': Object.fromEntries(MODES.map(mode => [mode, 6])) } : {},
    selectedPreset: established ? 'QA existing map' : '', visionImages: established ? Object.fromEntries(MODES.map(mode => [mode, PNG])) : {},
    featuredBadges: [], onboardingWelcomeCompleted: false, qa_unknown: { retained: ['synthetic', 'unknown state field'] } };
}
const localFields = { levels: 'lastState', activityDrafts: 'activityDrafts', activityAlignments: 'activityAlignments', activityCompletions: 'activityCompletions', activityReactions: 'activityReactions', insightRequests: 'insightRequests', presets: 'presets', visionImages: 'visionImages', featuredBadges: 'featuredBadges', selectedPreset: 'selectedPreset', profileName: 'profileName', profileImage: 'profileImage', language: 'language', skin: 'skin' };
const protectedFields = ['levels', 'presets', 'selectedPreset', 'activityDrafts', 'activityAlignments', 'visionImages', 'profileImage', 'activityCompletions', 'activityReactions', 'featuredBadges'];
function serverIdentity(owner = false) {
  // The owner address is read from the checkout solely for a synthetic /auth/me fixture.
  const configured = readFileSync(resolve(frontend, 'src/App.tsx'), 'utf8').match(/const ownerEmail\s*=\s*['"]([^'"]+)['"]/u)?.[1];
  assert.ok(configured, 'Cannot identify the configured owner comparison.');
  return { user_id: USER, organization_id: ORG, name: 'Synthetic QA person', email: owner ? configured : 'qa-person@example.invalid', roles: ['owner'], permissions: ['*'] };
}
function deferred() { let resolvePromise; const promise = new Promise(resolve => { resolvePromise = resolve; }); return { promise, resolve: resolvePromise }; }
function sameProtected(actual, expected) { for (const field of protectedFields) assert.deepEqual(actual[field], expected[field], `Preserve ${field}`); }

async function installTransport(context, origin, state, { identity = serverIdentity(), hold = false, syntheticAi = false } = {}) {
  const reads = [], writes = [], violations = [], blocked = []; let aiCalls = 0; let revision = 1; let document = clone(state);
  const identityGate = deferred(), stateGate = deferred();
  if (!hold) { identityGate.resolve(); stateGate.resolve(); }
  const snapshot = () => ({ state: clone(document), revision: `synthetic-qa-revision-${revision}`, validationReceipts: {}, legacyCompletionSlots: [] });
  const reply = (route, body, status = 200) => route.fulfill({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,PUT,POST,OPTIONS' }, body: JSON.stringify(body) });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url()); const path = url.pathname.replace(/\/$/, '') || '/'; const method = request.method();
    const apiPath = path.match(/\/(auth|community|ai)(\/.*)?$/u)?.[0] ?? (path.endsWith('/state/merge') ? '/state/merge' : path.endsWith('/state') ? '/state' : path.endsWith('/health') ? '/health' : null);
    if (apiPath) {
      if (method === 'OPTIONS') return reply(route, {});
      if (method === 'GET') reads.push(apiPath);
      const authenticated = request.headers().authorization === `Bearer ${ACCESS}`;
      if (['/auth/me', '/state'].includes(apiPath) && !authenticated) { violations.push(`missing synthetic Bearer: ${apiPath}`); return reply(route, {}, 401); }
      if (apiPath === '/auth/me' && method === 'GET') { await identityGate.promise; return reply(route, identity); }
      if (apiPath === '/state' && method === 'GET') { await stateGate.promise; return reply(route, snapshot()); }
      if (apiPath === '/state' && method === 'PUT' && authenticated) {
        const body = request.postDataJSON(); writes.push({ path: apiPath, body: clone(body) });
        if (body.expected_revision !== snapshot().revision) return reply(route, snapshot(), 409);
        sameProtected(body.state, state); assert.deepEqual(body.state.qa_unknown, state.qa_unknown, 'Keep unknown cloud fields');
        document = clone(body.state); revision++; return reply(route, snapshot());
      }
      if (apiPath === '/health' && method === 'GET') return reply(route, { status: 'ok', app_env: 'synthetic-test', version: 'qa-only' });
      if (apiPath === '/community/capabilities' && method === 'GET') return reply(route, { enabled: true, storage_ready: true });
      if (apiPath === '/community/profile' && method === 'GET') return reply(route, { user_id: USER, display_name: 'Synthetic QA person', bio: '', discoverable: true });
      const empty = { '/community/submissions': { submissions: [] }, '/community/review-inbox': { submissions: [] }, '/community/members': { members: [], limit: 50 }, '/community/feed': { cards: [] }, '/community/ideas': { requests: [] }, '/community/notifications': { notifications: [] }, '/community/reuse-requests': { requests: [] } };
      if (method === 'GET' && Object.hasOwn(empty, apiPath)) return reply(route, empty[apiPath]);
      if (syntheticAi && method === 'POST' && ['/ai/mode', '/ai/mode/public'].includes(apiPath)) { aiCalls++; return reply(route, { proposal: PROPOSAL }); }
      violations.push(`${method} ${apiPath}`); return reply(route, { detail: 'Synthetic verifier refuses unexpected API operations.' }, 503);
    }
    // Only static preview traffic may escape the interceptor. An unrecognized
    // same-origin fetch must not silently become a real API request either.
    if (url.origin === origin && ['GET', 'HEAD'].includes(method)
      && (!['fetch', 'xhr'].includes(request.resourceType()) || path.startsWith('/assets/'))) return route.continue();
    if (['fetch', 'xhr'].includes(request.resourceType()) || method !== 'GET') violations.push(`${method} unexpected external request`);
    blocked.push(request.resourceType()); return route.abort('blockedbyclient');
  });
  return { reads, writes, violations, blocked, identityGate, stateGate, snapshot, get aiCalls() { return aiCalls; } };
}

async function seed(context, state, { account = false, cachedOwner = false, guestCompleted = false } = {}) {
  const cachedIdentity = serverIdentity(cachedOwner);
  await context.addInitScript(({ state, localFields, account, cachedIdentity, access, visitor, guestCompleted }) => {
    if (!localStorage.getItem('__synthetic_onboarding_seed_v1__')) {
      for (const [field, suffix] of Object.entries(localFields)) {
        if (state[field] === null) continue;
        const key = `modoCultiva_${suffix}`;
        localStorage.setItem(key, typeof state[field] === 'string' ? state[field] : JSON.stringify(state[field]));
      }
      localStorage.setItem('modoCultiva_language_source', 'manual'); localStorage.setItem('modoCultiva_welcomeVisitorId', visitor);
      if (guestCompleted) localStorage.setItem(`modo-cultiva:welcome-intro:v1:guest:${visitor}`, JSON.stringify({ version: 1, completed: true }));
      if (account) sessionStorage.setItem('gm-auth-tokens', JSON.stringify({ access_token: access, refresh_token: 'synthetic-refresh-not-a-credential', expires_in: 3600, identity: cachedIdentity }));
      localStorage.setItem('__synthetic_onboarding_seed_v1__', '1');
    }
    // Explicit synthetic visibility events exercise the real component handler.
    const actualHidden = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden')?.get;
    globalThis.__qaVisibility = null;
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => globalThis.__qaVisibility ?? actualHidden?.call(document) ?? false });
    globalThis.__qaWelcomePhrases = [];
    const observe = () => { const phrase = document.querySelector('.mc-welcome__phrase')?.textContent; if (phrase && globalThis.__qaWelcomePhrases.at(-1) !== phrase) globalThis.__qaWelcomePhrases.push(phrase); };
    new MutationObserver(observe).observe(document, { childList: true, subtree: true, characterData: true });
    // Force the genuine in-app fallback without opening external share destinations.
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => false });
    Object.defineProperty(navigator, 'share', { configurable: true, value: async () => { throw new DOMException('Synthetic native share cancellation', 'AbortError'); } });
  }, { state, localFields, account, cachedIdentity, access: ACCESS, visitor: VISITOR, guestCompleted });
}
async function eventually(callback, message, timeout = 12000) {
  const until = Date.now() + timeout; let last;
  do { try { const value = await callback(); if (value) return value; } catch (error) { last = error; } await delay(20); } while (Date.now() < until);
  throw new Error(`${message}${last ? `: ${last.message}` : ''}`);
}
async function ready(page, step, timeout = 12000) {
  return eventually(async () => {
    const current = await page.locator('.guided-tour-layer').evaluateAll(elements => elements.map(element => ({ step: element.dataset.tourStep, phase: element.dataset.tourPhase })));
    if (current[0]?.step === step && current[0]?.phase === 'unavailable') throw new Error(`Target unavailable: ${step}`);
    return current.length === 1 && current[0].step === step && current[0].phase === 'ready';
  }, `Expected ready App spotlight ${step} (rebuild preview if its bundle predates the 30-stop audience integration)`, timeout);
}
async function settleHydration(page, language, timeout) {
  let consentSeen = false;
  await eventually(async () => {
    const boundary = page.locator('.state-account-boundary');
    if (await boundary.count() === 0) return true;
    const choice = boundary.getByRole('button', { name: stateAccountCopy(language).cloudOnly, exact: true });
    if (await choice.count() && !consentSeen) { consentSeen = true; await choice.click(); }
    return false;
  }, 'Hydration did not finish (consent is supported; errors are not silently bypassed)', timeout);
  return consentSeen;
}
async function storedDocument(page, account = false) {
  return page.evaluate(({ fields, prefix }) => Object.fromEntries(Object.entries(fields).map(([field, suffix]) => {
    const raw = localStorage.getItem(`${prefix}modoCultiva_${suffix}`) ?? localStorage.getItem(`modoCultiva_${suffix}`);
    let value = raw; if (!['selectedPreset', 'profileName', 'profileImage', 'language', 'skin'].includes(field)) { try { value = JSON.parse(raw); } catch { /* Assertion reports malformed data. */ } }
    return [field, value];
  })), { fields: localFields, prefix: account ? `modo-cultiva:account-cache:v1:${ORG}:${USER}:` : 'modo-cultiva:guest-cache:v1:' });
}
async function assertPreserved(page, expected, account = false) { sameProtected(await storedDocument(page, account), expected); }
async function openReplay(page, timeout, keyboard = false) {
  const replay = page.locator('[data-tour="replay"]');
  if (!await replay.isVisible()) {
    if (keyboard) { await page.locator('.profile-button').focus(); await page.keyboard.press('Enter'); }
    else await page.locator('.profile-button').click();
  }
  if (keyboard) { await replay.focus(); await page.keyboard.press('Enter'); } else await replay.click();
  await ready(page, 'modes', timeout);
}
async function closeTour(page) {
  await page.locator('.guided-tour-close').click();
  await eventually(async () => await page.locator('.guided-tour-layer').count() === 0, 'Tour did not close');
}
async function assertMap(page, expectedLevels) {
  await page.locator('.overview-stage').scrollIntoViewIfNeeded();
  const map = await page.locator('.overview-stage').evaluate(stage => {
    const center = stage.querySelector('.overview-identity-orb').getBoundingClientRect(); const cx = center.x + center.width / 2, cy = center.y + center.height / 2;
    const cards = [...stage.querySelectorAll('.overview-mode')].map(element => {
      const rect = element.getBoundingClientRect(), label = element.querySelector('.overview-mode-name'), style = getComputedStyle(label);
      return { mode: element.dataset.tourMode, level: Number(element.querySelector('strong').textContent), x: rect.x, y: rect.y, w: rect.width, h: rect.height,
        radius: Math.hypot(rect.x + rect.width / 2 - cx, rect.y + rect.height / 2 - cy), label: label.textContent, clipped: label.scrollWidth > label.clientWidth + 1,
        oneLine: label.getBoundingClientRect().height <= parseFloat(style.lineHeight) + 2, visible: rect.width > 0 && rect.height > 0 && rect.left >= -1 && rect.right <= innerWidth + 1 && rect.top >= -1 && rect.bottom <= innerHeight + 1,
        angle: element.style.getPropertyValue('--mode-angle'), layout: getComputedStyle(element).position };
    });
    return { cards, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
  });
  assert.equal(map.cards.length, 12, 'All twelve independent Holista targets');
  assert.deepEqual(map.cards.map(card => card.mode), MODES);
  assert.equal(new Set(map.cards.map(card => card.angle)).size, 12, 'Twelve distinct circle positions');
  const radii = map.cards.map(card => card.radius);
  assert.ok(Math.max(...radii) - Math.min(...radii) <= 3, 'All twelve centers lie on ONE circle');
  for (const card of map.cards) { assert.equal(card.level, expectedLevels[card.mode]); assert.ok(card.visible && card.oneLine && !card.clipped && card.label.trim(), `Visible complete single-line label: ${card.mode}`); }
  for (let a = 0; a < 12; a++) for (let b = a + 1; b < 12; b++) {
    const one = map.cards[a], two = map.cards[b];
    assert.ok(Math.min(one.x + one.w, two.x + two.w) - Math.max(one.x, two.x) <= 1 || Math.min(one.y + one.h, two.y + two.h) - Math.max(one.y, two.y) <= 1, `Independent non-overlapping cards ${one.mode}/${two.mode}`);
  }
  assert.equal(map.overflow, false, 'No horizontal page overflow'); return map;
}
async function inspectSpotlight(page, owner) {
  const result = await page.locator('.guided-tour-layer').evaluate(layer => {
    const rect = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    const modals = [...document.querySelectorAll('dialog:modal')];
    return { id: layer.dataset.tourStep, phase: layer.dataset.tourPhase, dir: layer.dir, panel: rect(layer.querySelector('.guided-tour-card')), holes: [...layer.querySelectorAll('.guided-tour-outline')].map(rect),
      counters: layer.querySelectorAll('.guided-tour-counter').length, counter: layer.querySelector('.guided-tour-counter')?.textContent,
      modalSafe: !modals.length || modals.at(-1).contains(layer), shade: !!layer.querySelector('.guided-tour-shade path[d]'), scrollY, width: innerWidth, height: innerHeight };
  });
  assert.equal(result.phase, 'ready'); assert.ok(result.shade && result.holes.length > 0, `Real shade and target holes: ${result.id}`);
  assert.ok(result.modalSafe, `Spotlight portal inside active native modal: ${result.id}`);
  assert.equal(result.counters, owner ? 1 : 0, 'Global count is server-verified owner-only');
  for (const rect of [result.panel, ...result.holes]) assert.ok(rect.w > 0 && rect.h > 0 && rect.x >= -2 && rect.y >= -2 && rect.right <= result.width + 2 && rect.bottom <= result.height + 2, `Clipped spotlight/panel stays within viewport: ${result.id}`);
  return result;
}
const methodSelectors = { custom: '.journey-fixed-actions > button:first-child', bank: '.activity-pool-button', ai: '.activity-ai-button', localContacts: '.journey-fixed-actions > .insight-button' };
async function advance(page, current, timeout) {
  const next = STOPS[STOPS.indexOf(current) + 1];
  const button = page.locator('.guided-tour-rail button:last-child'); assert.equal(await button.isDisabled(), false, `Next available: ${current}`);
  await button.click();
  if (next) await ready(page, next, timeout);
  else await eventually(async () => await page.locator('.guided-tour-layer').count() === 0, 'Final tour did not finish', timeout);
}
async function methodRegression(page, timeout) {
  for (const [method, selector] of Object.entries(methodSelectors)) {
    await page.locator(selector).click(); await ready(page, method, timeout);
    const surface = method === 'localContacts' ? '.community-panel' : `.activity-agent--${method === 'bank' ? 'pool' : method}`;
    assert.equal(await page.locator(surface).isVisible(), true, `Summary button actually opens ${method}, not just a local checklist toggle`);
    for (let index = STOPS.indexOf(method); STOPS[index] !== 'methods'; index++) await advance(page, STOPS[index], timeout);
    assert.equal(await page.locator('.guided-tour-methods li[data-visited="true"]').count(), 4);
  }
}
async function walkTour(page, configuration, { owner = false, regress = false, sharePreview = true } = {}) {
  const seen = [], scrollEvidence = [];
  await ready(page, 'modes', configuration.timeout); seen.push('modes');
  await inspectSpotlight(page, owner); assert.equal(await page.locator('.guided-tour-rail button:last-child').isDisabled(), true, 'Choosing an actual mode is required');
  await page.locator('.overview-mode[data-tour-mode="fisico"]').click(); await ready(page, 'modeDescription', configuration.timeout);
  for (const step of STOPS.slice(1)) {
    await ready(page, step, configuration.timeout); seen.push(step);
    const inspected = await inspectSpotlight(page, owner);
    assert.equal(inspected.dir, configuration.language === 'ar' ? 'rtl' : 'ltr', 'Localized spotlight direction');
    if (inspected.scrollY > inspected.height) scrollEvidence.push(step);
    if (step === 'nextClarity') assert.ok((await page.locator('.guided-tour-clarity').innerText()).trim());
    if (step === 'methods') { assert.equal(await page.locator('.guided-tour-methods li[data-visited="true"]').count(), 4); if (regress) await methodRegression(page, configuration.timeout); }
    if (['activityCard', 'evidence', 'audience'].includes(step)) assert.equal(await page.locator('.activity-flow-stages > li').count(), 3, 'No fourth activity stage');
    if (step === 'audience') { assert.equal(await page.locator('.activity-flow-audience input[value="network"]').isChecked(), true); assert.equal(await page.locator('.activity-flow-audience input[type="checkbox"]').count(), 0); }
    if (step === 'vision') { assert.equal(await page.locator('.activity-flow-stages').count(), 0, 'Level9 stays separate'); assert.equal(await page.locator('.journey-level-card--vision input[type="file"]').count(), 1); }
    if (step === 'globalIdeas') assert.ok((await page.locator('.cult-embedded-content').innerText()).includes(onboardingIntegrationCopy(configuration.language).demoDetail), 'Static global ideas carry the localized demonstration disclaimer');
    if (step === 'specialists') {
      const labels = await page.locator('.cult-embedded-content .cult-specialist-copy p').allTextContents();
      assert.ok(labels.length && labels.every(label => label.includes(onboardingIntegrationCopy(configuration.language).demo)), 'Every static specialist is labelled as a demonstration');
    }
    if (step === 'sharing' && sharePreview) {
      assert.equal(await page.locator('.journey-share button').count(), 4);
      await page.locator('.journey-share button').first().click();
      await page.locator('.activity-share-dialog[open]').waitFor({ timeout: configuration.timeout });
      await ready(page, step, configuration.timeout); await inspectSpotlight(page, owner);
      assert.equal(await page.locator('.activity-share-dialog[open] .guided-tour-layer').count(), 1, 'Sharing spotlight relocates to native modal');
    }
    await advance(page, step, configuration.timeout);
  }
  assert.deepEqual(seen, STOPS, 'Exactly the thirty intended tour stops');
  return { stops: seen.length, methods: 4, longScrollStops: scrollEvidence };
}

async function welcomeCase(page, configuration, account = false) {
  const messages = welcomeMessages[configuration.language].messages; const intro = page.locator('.mc-welcome');
  await intro.waitFor({ timeout: configuration.timeout });
  assert.equal(await intro.getAttribute('dir'), configuration.language === 'ar' ? 'rtl' : 'ltr');
  assert.equal(await intro.locator('button').count(), 1, 'Welcome has pause only; no forward/back/skip');
  assert.equal(await page.locator('.guided-tour-counter').count(), 0);
  await intro.focus();
  for (const key of ['ArrowRight', 'ArrowLeft', 'Enter', 'Escape', 'Space']) await page.keyboard.press(key);
  await intro.locator('.mc-welcome__phrase').click({ force: true });
  assert.equal(await intro.locator('.mc-welcome__phrase').innerText(), messages[0], 'Keys/tap never advance or skip introduction');
  await intro.locator('.mc-welcome__pause').click({ force: true });
  await page.clock.runFor(90000);
  assert.equal(await intro.getAttribute('data-paused'), 'true'); assert.equal(await intro.locator('.mc-welcome__phrase').innerText(), messages[0]);
  await intro.locator('.mc-welcome__pause').click({ force: true });
  await page.evaluate(() => { globalThis.__qaVisibility = true; document.dispatchEvent(new Event('visibilitychange')); });
  const before = await intro.getAttribute('data-phase'); await page.clock.runFor(90000);
  assert.equal(await intro.getAttribute('data-phase'), before); assert.equal(await intro.locator('.mc-welcome__phrase').innerText(), messages[0], 'Hidden time is never counted as reading');
  await page.evaluate(() => { globalThis.__qaVisibility = false; document.dispatchEvent(new Event('visibilitychange')); });
  const reduced = await intro.getAttribute('data-reduced-motion') === 'true';
  assert.equal(reduced, configuration.reduced);
  for (let index = 0; index < 7; index++) {
    assert.equal(await intro.locator('.mc-welcome__phrase').innerText(), messages[index]);
    await page.clock.runFor((reduced ? timing.WELCOME_REDUCED_TRANSITION_MS : timing.WELCOME_ENTER_MS) + 1);
    assert.equal(await intro.getAttribute('data-phase'), 'read', `Message ${index + 1} gets an automatic reading phase`);
    await page.clock.runFor(timing.welcomeReadDurationMs(messages[index]) + 1);
    assert.equal(await intro.getAttribute('data-phase'), 'exit');
    await page.clock.runFor((reduced ? timing.WELCOME_REDUCED_TRANSITION_MS : timing.WELCOME_EXIT_MS) + 1);
  }
  await eventually(async () => await intro.count() === 0, 'Welcome did not finish automatically');
  assert.deepEqual(await page.evaluate(() => globalThis.__qaWelcomePhrases), messages, 'Exactly seven automatic phrases, ordered once');
  const key = account ? `modo-cultiva:welcome-intro:v1:account:${ORG}:${USER}` : `modo-cultiva:welcome-intro:v1:guest:${VISITOR}`;
  assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), key), { version: 1, completed: true });
  await page.clock.resume(); await ready(page, 'modes', configuration.timeout); await closeTour(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await settleHydration(page, configuration.language, configuration.timeout);
  await delay(150); assert.equal(await intro.count(), 0, 'Completed intro does not repeat on reload');
  assert.equal(await page.locator('.guided-tour-layer').count(), 0, 'Reload does not restart tutorial');
  return { phrases: 7, automaticOnly: true, pause: true, syntheticVisibilityPause: true, reducedMotion: reduced, noRepeat: true };
}

async function runCase(browser, config, task) {
  const established = !['welcome', 'account-welcome'].includes(task.name); const state = fixture(task.language, established);
  const account = ['identity', 'account-welcome'].includes(task.name); const reduced = task.width === 320 || task.width === 870;
  const context = await browser.newContext({ viewport: { width: task.width, height: 835 }, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference', locale: task.language });
  const errors = []; const page = await context.newPage(); page.setDefaultTimeout(config.timeout);
  page.on('pageerror', error => errors.push(error.message));
  context.on('page', popup => { if (popup !== page) { errors.push('Unexpected external page'); void popup.close(); } });
  const transport = await installTransport(context, config.url, state, { identity: serverIdentity(task.identity === 'owner'), hold: task.name === 'identity', syntheticAi: task.name === 'drafts' });
  await seed(context, state, { account, cachedOwner: task.identity === 'forged', guestCompleted: task.name === 'account-welcome' });
  const configuration = { ...config, ...task, reduced }; let result;
  try {
    if (['welcome', 'account-welcome'].includes(task.name)) { await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-29T12:00:00Z')); }
    await page.goto(config.url, { waitUntil: 'domcontentloaded' });
    if (task.name === 'identity') {
      await page.locator('.state-account-boundary').waitFor();
      assert.equal(await page.locator('.guided-tour-counter, .mc-welcome, .guided-tour-layer').count(), 0, 'Cached identity cannot start owner UI before verification');
      transport.identityGate.resolve(); await delay(80);
      assert.equal(await page.locator('.guided-tour-counter, .mc-welcome, .guided-tour-layer').count(), 0, 'Identity without completed state hydration cannot enable tour/counter');
      transport.stateGate.resolve();
    }
    const consentSeen = account ? await settleHydration(page, task.language, config.timeout) : false;
    if (['welcome', 'account-welcome'].includes(task.name)) result = await welcomeCase(page, configuration, account);
    else {
      await delay(150); assert.equal(await page.locator('.mc-welcome').count(), 0, 'Established people skip introduction');
      await assertPreserved(page, state, account); await assertMap(page, state.levels);
      if (task.name === 'tour') {
        const tours = [];
        for (let replay = 0; replay < config.replays; replay++) {
          await openReplay(page, config.timeout);
          tours.push(await walkTour(page, configuration, { regress: replay === 0 && config.methodRegressions, sharePreview: replay === 0 && config.sharePreview }));
          await assertPreserved(page, state); await assertMap(page, state.levels);
        }
        result = { tours, preserved: true, guestCounter: false, sharingPreviewTested: config.sharePreview };
      } else if (task.name === 'identity') {
        await openReplay(page, config.timeout); await inspectSpotlight(page, task.identity === 'owner');
        if (task.identity === 'owner') assert.ok((await page.locator('.guided-tour-counter').innerText()).includes('30'), 'Verified owner sees the thirty-stop total');
        await closeTour(page); await assertPreserved(page, state, true);
        // Replay restores its original MC menu too. Close it before opening another surface.
        if (await page.locator('[data-tour="replay"]').isVisible()) await page.locator('.profile-button').click();
        await page.locator('.overview-mode[data-tour-mode="fisico"]').click();
        await page.locator('.journey-panel').waitFor();
        await page.locator('.journey-community-actions button').filter({ hasText: onboardingIntegrationCopy(task.language).share }).click();
        await page.locator('[data-tour="community-feed"] .community-inline-form').waitFor();
        const chooser = page.locator('[data-tour="community-feed"] .community-inline-form');
        assert.ok((await chooser.locator('select').innerText()).includes(ACTIVITY), 'App supplies actual saved share candidate');
        assert.equal(await chooser.locator('input[value="network"]').isChecked(), true); assert.equal(await chooser.locator('input[type="checkbox"]').count(), 0);
        await page.locator('.community-close').click(); await assertPreserved(page, state, true);
        result = { identity: task.identity, counter: task.identity === 'owner', verifiedAndHydrated: true, consentSeen, shareCtaOpensFeedChooser: true, guestArchivePreserved: true };
      } else if (task.name === 'drafts') {
        const drafts = [];
        for (const entry of ['custom', 'ai']) {
          if (await page.locator('[data-tour="replay"]').isVisible()) {
            if (config.draftReplay === 'keyboard') { await page.locator('.profile-button').focus(); await page.keyboard.press('Enter'); }
            else await page.locator('.profile-button').click();
          }
          if (!await page.locator('.journey-panel').count()) await page.locator('.overview-mode[data-tour-mode="fisico"]').click();
          else if (await page.locator('.activity-agent-back').isVisible()) { await page.locator('.activity-agent-back').click(); await page.locator('.journey-fixed-actions').waitFor(); }
          await page.locator(methodSelectors[entry]).click();
          const text = `Unsaved ${entry} draft · العربية · QA only. Never replace this with saved text.`;
          await page.locator('#activity-prompt').fill(text);
          if (entry === 'ai') { await page.locator('.mode-ai-ask').click(); await eventually(async () => await page.locator('.mode-ai-proposal-text').textContent() === PROPOSAL, 'Synthetic AI response not rendered'); }
          const beforeAi = transport.aiCalls;
          await openReplay(page, config.timeout, config.draftReplay === 'keyboard'); await walkTour(page, configuration, { sharePreview: false });
          await eventually(async () => await page.locator('#activity-prompt').inputValue() === text, `Unsaved ${entry} context restored after the host's deferred navigation/form restoration`, config.timeout);
          if (entry === 'ai') await eventually(async () => await page.locator('.mode-ai-proposal-text').textContent() === PROPOSAL, 'Unsaved synthetic AI proposal restored', config.timeout);
          assert.equal(transport.aiCalls, beforeAi, 'Tour does not call AI'); await assertPreserved(page, state); drafts.push(entry);
        }
        result = { drafts, replayEntry: config.draftReplay, syntheticAiResponses: transport.aiCalls, paidAiRequests: 0, preserved: true };
      }
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors'); assert.deepEqual(transport.violations, [], 'No unexpected API mutation/external request');
    if (task.name !== 'drafts') assert.equal(transport.aiCalls, 0);
    if (account) { sameProtected(transport.snapshot().state, state); assert.ok(transport.reads.includes('/auth/me') && transport.reads.includes('/state')); }
    const bundle = await page.locator('script[type="module"][src]').first().getAttribute('src');
    return { ...task, ...result, bundle, mockedStateWrites: transport.writes.length, realApiRequests: 0, errors: [] };
  } catch (error) {
    const diagnostic = await page.evaluate(() => ({ bundle: document.querySelector('script[type="module"][src]')?.getAttribute('src'), welcome: document.querySelector('.mc-welcome')?.dataset, phrase: document.querySelector('.mc-welcome__phrase')?.textContent,
      step: document.querySelector('.guided-tour-layer')?.dataset, title: document.querySelector('.guided-tour-card h2')?.textContent,
      boundary: document.querySelector('.state-account-boundary')?.textContent?.slice(0, 500), scrollY,
      modals: [...document.querySelectorAll('dialog[open]')].map(element => element.className),
      broadDialogHeadings: [...document.querySelectorAll('.activity-share-dialog[open] h2')].map(element => ({ text: element.textContent, insideTour: Boolean(element.closest('.guided-tour-layer')) })),
      directSharingTargets: [...document.querySelectorAll('.activity-share-dialog[open] > header > div > h2')].map(element => ({ text: element.textContent, insideTour: Boolean(element.closest('.guided-tour-layer')), rect: element.getBoundingClientRect().toJSON(), nativeModal: Boolean(element.closest('dialog:modal')) })),
      mcPointer: (() => { const button = document.querySelector('.profile-button'); if (!button) return null; const rect = button.getBoundingClientRect(); const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2); return { rect: rect.toJSON(), hitTag: hit?.tagName, hitClass: hit?.className, profileMenuZ: getComputedStyle(button.closest('.profile-menu')).zIndex, journeyBackdropZ: document.querySelector('.journey-backdrop') ? getComputedStyle(document.querySelector('.journey-backdrop')).zIndex : null, journeyScrollTop: document.querySelector('.journey-panel')?.scrollTop }; })(),
      sharingAncestors: (() => { const result = []; let element = document.querySelector('.activity-share-dialog[open] h2'); while (element) { const style = getComputedStyle(element); result.push({ tag: element.tagName, class: element.className, rect: element.getBoundingClientRect().toJSON(), overflow: [style.overflowX, style.overflowY] }); element = element.parentElement; } return result; })(),
      body: document.body.innerText.slice(-800) })).catch(() => ({}));
    emit({ failed: task, message: error.message, diagnostic, errors, rejectedOperations: transport.violations }); throw error;
  } finally { transport.identityGate.resolve(); transport.stateGate.resolve(); await context.close(); }
}

function selfTest() {
  assert.equal(STOPS.length, 30); assert.equal(new Set(STOPS).size, 30); assert.ok(STOPS.includes('audience'));
  assert.equal(options(['--smoke']).languages[0], 'en');
  for (const url of ['https://example.com', 'http://127.0.0.1:4173/?token=x', 'http://user:secret@localhost:4173']) assert.throws(() => options([`--url=${url}`]));
  for (const language of LANGUAGES) {
    assert.equal(welcomeMessages[language].messages.length, 7); assert.ok(stateAccountCopy(language).cloudOnly);
    assert.ok(onboardingIntegrationCopy(language).share); for (const stop of STOPS.filter(stop => !stop.startsWith('control'))) assert.ok(guidedTourStepCopy(language, stop).title);
    const document = fixture(language); assert.equal(Object.keys(document.levels).length, 12); sameProtected(clone(document), document);
  }
  emit({ selfTest: 'PASS', languages: 11, widths: WIDTHS, tourStops: 30, cases: CASES, safety: 'loopback preview only; all API requests intercepted; no dependencies installed' });
}
async function main() {
  const config = options(process.argv.slice(2));
  if (config.help) { process.stdout.write('Actual-App synthetic QA. --url=loopback --languages=en,ar --widths=320,390,870,1440 --cases=welcome,tour,identity,drafts,account-welcome --replays=2 --workers=2 --smoke --self-test\nDiagnostic-only subsets: --share-preview=off --draft-replay=keyboard --method-regressions=off. These omissions/entry paths are reported explicitly; default checks remain strict.\n'); return; }
  selfTest(); if (config['self-test']) return;
  let playwright;
  try { playwright = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); }
  catch { playwright = require(resolve(dirname(process.execPath), '..', 'node_modules', 'playwright')); }
  const tasks = [];
  for (const name of config.cases) {
    if (['welcome', 'tour'].includes(name)) for (const width of config.widths) for (const language of config.languages) tasks.push({ name, width, language });
    else for (const [index, width] of config.widths.entries()) {
      const language = config.languages[index % config.languages.length];
      if (name === 'identity') for (const identity of ['normal', 'forged', 'owner']) tasks.push({ name, width, language, identity });
      else tasks.push({ name, width, language });
    }
  }
  emit({ start: true, contexts: tasks.length, ...config, transport: 'SYNTHETIC ONLY — never a real-backend result' });
  const browser = await playwright.chromium.launch({ channel: 'chrome', headless: true }); const results = []; let next = 0; let failure;
  try {
    await Promise.all(Array.from({ length: Math.min(config.workers, tasks.length) }, async () => {
      while (!failure && next < tasks.length) {
        const task = tasks[next++];
        try { const result = await runCase(browser, config, task); results.push(result); emit({ passed: result }); }
        catch (error) { failure ??= error; }
      }
    }));
  } finally { await browser.close(); }
  if (failure) throw failure;
  emit({ result: 'PASS', contexts: results.length, coreTourTraversals: results.reduce((count, result) => count + (result.tours?.length ?? 0) + (result.drafts?.length ?? 0), 0), languages: config.languages, widths: config.widths,
    selectedCoverage: { cases: config.cases, sharingPreview: config.cases.includes('tour') ? config.sharePreview : 'not selected', draftReplay: config.cases.includes('drafts') ? config.draftReplay : 'not selected' },
    realApiRequests: 0, paidAiRequests: 0, note: 'Selected synthetic checks only, not release certification. Main owns real-backend/private/public proof integration.' });
}
main().catch(error => { emit({ result: 'FAIL', message: error.message }); process.exitCode = 1; });
