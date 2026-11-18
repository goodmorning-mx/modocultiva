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
const TOUR_STOPS = ['modes', 'modeDescription', 'selfAssessment', 'activityDesign', 'nextClarity', 'methods', 'custom', 'bank', 'localContacts', 'globalIdeas', 'ai', 'effort', 'activityCard', 'evidence', 'audience', 'reviews', 'vision', 'reactions', 'sharing', 'specialists', 'community', 'profile', 'badges', 'configurations', 'controlCenter', 'controlStrongest', 'controlLeast', 'controlFocus', 'controlTrivia', 'replay'];
const CASES = ['welcome', 'legacy-welcome', 'account-welcome', 'legacy-account-welcome', 'account-completed', 'locale-welcome', 'account-locale-welcome', 'account-legacy-locale-welcome', 'manual-welcome', 'account-manual-welcome', 'account-ambiguous-cache-welcome', 'tour', 'identity', 'drafts', 'local-idea', 'account-local-idea', 'account-local-zero', 'account-local-failure'];
const ACCESS = 'synthetic-qa-token-not-a-credential';
CASES.push('account-pending-tour', 'account-journey-ascent', 'fresh-journey', 'home-vision', 'account-home-vision');
CASES.push('electric-home', 'account-electric-home');
CASES.push('home-upload', 'account-home-upload');
CASES.push('guest-language-switch', 'account-language-switch');
CASES.push('mode-editorial');
CASES.push('global-editorial');
CASES.push('specialist-editorial');
CASES.push('install-guide');
CASES.push('management-surfaces', 'account-community-surfaces', 'anonymous-public-surface');
const FIXTURE_ONLY_CASES = ['premium-access-fixture'];
const ORG = '00000000-0000-4000-8000-000000000100';
const USER = '00000000-0000-4000-8000-000000000101';
const VISITOR = 'synthetic-onboarding-visitor';
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
const ACTIVITY = 'Synthetic saved practice: walk mindfully at the same time each morning.';
const ALIGNMENT = 'Repeating this practice supports recognizing myself in the exact NEXT clarity description.';
const PROPOSAL = 'Synthetic fixture proposal. No AI provider was contacted or charged.';
const CARD_ID = '00000000-0000-4000-8000-000000000202';
const REVIEW_ID = '00000000-0000-4000-8000-000000000203';
const OTHER_USER = '00000000-0000-4000-8000-000000000204';
const NOTICE_KIND = 'evidence_validated';
const EVIDENCE_TEXT = 'Original evidence note · conservar sin traducir.';
const CLARITY_CATALOG = JSON.parse(readFileSync(resolve(frontend, 'src/clarity-levels.json'), 'utf8'));
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
const { JOURNEY_REACTIONS_ENABLED } = sourceModule('src/journeySocial.ts');
const { JOURNEY_SUBMISSION_AUDIENCE_ENABLED } = sourceModule('src/journeyDeck.ts');
const { cleanHomeVisionCards, homeModePhoto, homeVisionCopy } = sourceModule('src/homeVision.ts');
const { electricSymbolLabel } = sourceModule('src/homeVision.ts');
const { interfaceCopy, homeGreetingPhrases } = sourceModule('src/interfaceLanguage.ts');
const { homeQuoteText } = sourceModule('src/homeQuoteTranslations.ts');
const { journeyModeTranslations, triviaModeQuestions } = sourceModule('src/modeEditorial.ts');
const { getBankActivities, bankSources } = sourceModule('src/quoteActivityCatalog.ts');
const { activityQuoteText } = sourceModule('src/activityQuoteTranslations.ts');
const { modeAiMessage } = sourceModule('src/modeAiMessages.ts');
const { globalIdeaTitle } = sourceModule('src/globalIdeaPractices.ts');
const { globalIdeaBio } = sourceModule('src/globalIdeaBios.ts');
const { specialistProfileCopy, specialistExampleCopy, specialistProfileIds } = sourceModule('src/specialistProfilesEditorial.ts');
const { planAccessCopy } = sourceModule('src/planAccessCopy.ts');
const { planDetailsForLocale, planKeys } = sourceModule('src/planTierEditorial.ts');
const { badgeCopy } = sourceModule('src/badgeMessages.ts');
const { activityFlowCopy, cardAudienceCopy } = sourceModule('src/activityJourneyFlowMessages.ts');
const { communityCopy, communityNoticeLabel } = sourceModule('src/communityMessages.ts');
const { publicCardCopy } = sourceModule('src/publicCardMessages.ts');
const STOPS = TOUR_STOPS.filter(stop => (JOURNEY_REACTIONS_ENABLED || stop !== 'reactions') && (JOURNEY_SUBMISSION_AUDIENCE_ENABLED || stop !== 'audience'));

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
  for (const name of result.cases) assert.ok([...CASES, ...FIXTURE_ONLY_CASES].includes(name), `Unknown case ${name}`);
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
const localFields = { levels: 'lastState', activityDrafts: 'activityDrafts', activityAlignments: 'activityAlignments', activityCompletions: 'activityCompletions', activityReactions: 'activityReactions', insightRequests: 'insightRequests', presets: 'presets', visionImages: 'visionImages', homeVisionCards: 'homeVisionCards', featuredBadges: 'featuredBadges', selectedPreset: 'selectedPreset', profileName: 'profileName', profileImage: 'profileImage', language: 'language', skin: 'skin' };
const protectedFields = ['levels', 'presets', 'selectedPreset', 'activityDrafts', 'activityAlignments', 'visionImages', 'profileImage', 'activityCompletions', 'activityReactions', 'featuredBadges'];
function serverIdentity(owner = false) {
  // The owner address is read from the checkout solely for a synthetic /auth/me fixture.
  const configured = readFileSync(resolve(frontend, 'src/App.tsx'), 'utf8').match(/const ownerEmail\s*=\s*['"]([^'"]+)['"]/u)?.[1];
  assert.ok(configured, 'Cannot identify the configured owner comparison.');
  return { user_id: USER, organization_id: ORG, name: 'Synthetic QA person', email: owner ? configured : 'qa-person@example.invalid', roles: ['owner'], permissions: ['*'] };
}
function deferred() { let resolvePromise; const promise = new Promise(resolve => { resolvePromise = resolve; }); return { promise, resolve: resolvePromise }; }
function sameProtected(actual, expected, uploads = false) {
  for (const field of protectedFields) {
    if (uploads && field === 'visionImages') {
      const { financiero, ...others } = actual[field];
      if (financiero) assert.match(financiero, /^data:image\//);
      assert.deepEqual(others, expected[field], 'Preserve photos for other modes');
    } else assert.deepEqual(actual[field], expected[field], `Preserve ${field}`);
  }
}

async function installTransport(context, origin, state, { identity = serverIdentity(), hold = false, syntheticAi = false, localIdeaCase = '', pendingTour = false, uploads = false, communitySurfaces = false } = {}) {
  let approvalCount = 1;
  const ideaWrites = []; let idea = null;
  const reads = [], writes = [], violations = [], blocked = [], aiPayloads = []; let revision = 1; let document = clone(state);
  let failNotices = false;
  const rubric = { version: CLARITY_CATALOG.version, source: CLARITY_CATALOG.languages.es[3], target: CLARITY_CATALOG.languages.es[4], effort: 'time_energy' };
  const submittedActivity = {
    id: REVIEW_ID, author_id: OTHER_USER, mode: 'fisico', source_level: 3, target_level: 4, revision_number: 1,
    activity: ACTIVITY, activity_hash: 'a'.repeat(64), target_alignment: ALIGNMENT, status: 'pending',
    created_at: '2026-10-29T12:00:00Z', review_count: 1, review_quorum: 3, reviews: [], can_review: true, advanced: false,
    evidence: { reflection: EVIDENCE_TEXT, image: PNG }, rubric_version: rubric.version, rubric_snapshot: rubric, audience: 'public',
  };
  const card = {
    id: CARD_ID, author_id: OTHER_USER, display_name: 'Original Creator', mode: 'fisico', source_level: 3,
    activity: ACTIVITY, activity_hash: 'a'.repeat(64), created_at: '2026-10-29T12:00:00Z', reactions: {}, my_reaction: null,
    audience: 'public', has_evidence: true,
  };
  const cardDetail = { ...card, reflection: EVIDENCE_TEXT, proof: { kind: 'photo', image: PNG }, rubric_snapshot: rubric, validation_status: 'pending', review_count: 1, review_quorum: 3 };
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
        sameProtected(body.state, state, uploads); assert.deepEqual(body.state.qa_unknown, state.qa_unknown, 'Keep unknown cloud fields');
        document = clone(body.state); revision++; return reply(route, snapshot());
      }
      if (apiPath === '/health' && method === 'GET') return reply(route, { status: 'ok', app_env: 'synthetic-test', version: 'qa-only' });
      if (apiPath === '/community/capabilities' && method === 'GET') return reply(route, { enabled: true, storage_ready: true });
      if (apiPath === '/community/profile' && method === 'GET') return reply(route, { user_id: USER, display_name: 'Synthetic QA person', bio: '', discoverable: true });
      if (communitySurfaces && method === 'GET') {
        if (apiPath === '/community/notifications' && authenticated) return failNotices
          ? reply(route, { detail: { code: 'fixture_unavailable' } }, 503)
          : reply(route, { notifications: [{ id: 'fixture-notice', kind: NOTICE_KIND, resource_id: REVIEW_ID, read: false, created_at: '2026-10-29T12:00:00Z' }] });
        if (apiPath === '/community/review-inbox' && authenticated) return reply(route, { submissions: [submittedActivity] });
        if (apiPath === `/community/submissions/${REVIEW_ID}` && authenticated) return reply(route, submittedActivity);
        if (apiPath === '/community/feed' && authenticated) return reply(route, { cards: [card] });
        if (apiPath === `/community/cards/${CARD_ID}` && authenticated) return reply(route, cardDetail);
        if (apiPath === `/community/public/cards/${CARD_ID}` && !request.headers().authorization) return reply(route, cardDetail);
      }
      if (apiPath === '/community/submissions' && method === 'GET' && pendingTour) {
        const rubric = JSON.parse(readFileSync(resolve(frontend, 'src/clarity-levels.json'), 'utf8'));
        return reply(route, { submissions: [{ id: 'synthetic-pending', author_id: USER, mode: 'fisico', source_level: 3, target_level: 4, revision_number: 1, activity: ACTIVITY, target_alignment: ALIGNMENT, status: approvalCount === 3 ? 'approved' : 'pending', review_count: approvalCount, review_quorum: 3, reviews: [], evidence: { reflection: 'Synthetic visual evidence context for the saved practice.', image: PNG }, rubric_version: rubric.version, rubric_snapshot: { version: rubric.version, source: rubric.languages[state.language][3], target: rubric.languages[state.language][4], effort: 'time_energy' }, audience: 'network', shared_card_id: '00000000-0000-4000-8000-000000000222' }] });
      }
      if (apiPath === '/community/ideas' && method === 'POST' && localIdeaCase && authenticated) {
        const body = request.postDataJSON(); ideaWrites.push(body); assert.deepEqual(body, { mode: 'fisico', level: 3 });
        await delay(150);
        if (localIdeaCase === 'account-local-failure') return reply(route, { detail: { code: 'request_failed' } }, 503);
        idea = { id: 'synthetic-idea-request', author_id: USER, mode: 'fisico', source_level: 3, status: 'pending', eligible_count: localIdeaCase === 'account-local-zero' ? 0 : 2, offers: [] };
        return reply(route, idea);
      }
      if (apiPath === '/community/ideas' && method === 'GET') return reply(route, { requests: idea ? [idea] : [] });
      const empty = { '/community/submissions': { submissions: [] }, '/community/review-inbox': { submissions: [] }, '/community/members': { members: [], limit: 50 }, '/community/feed': { cards: [] }, '/community/ideas': { requests: [] }, '/community/notifications': { notifications: [] }, '/community/reuse-requests': { requests: [] } };
      if (method === 'GET' && Object.hasOwn(empty, apiPath)) return reply(route, empty[apiPath]);
      if (syntheticAi && method === 'POST' && ['/ai/mode', '/ai/mode/public'].includes(apiPath)) { aiPayloads.push(request.postDataJSON()); return reply(route, { proposal: PROPOSAL }); }
      violations.push(`${method} ${apiPath}`); return reply(route, { detail: 'Synthetic verifier refuses unexpected API operations.' }, 503);
    }
    // Only static preview traffic may escape the interceptor. An unrecognized
    // same-origin fetch must not silently become a real API request either.
    if (url.origin === origin && ['GET', 'HEAD'].includes(method)
      && (!['fetch', 'xhr'].includes(request.resourceType()) || path.startsWith('/assets/'))) return route.continue();
    if (['fetch', 'xhr'].includes(request.resourceType()) || method !== 'GET') violations.push(`${method} unexpected external request`);
    blocked.push(request.resourceType()); return route.abort('blockedbyclient');
  });
  return { reads, writes, ideaWrites, violations, blocked, identityGate, stateGate, snapshot, aiPayloads, get aiCalls() { return aiPayloads.length; },
    failNotifications() { failNotices = true; },
    setApprovals(count) {
      approvalCount = count;
      if (count === 3) { document.levels.fisico = 4; revision++; }
    },
  };
}

async function seed(context, state, { account = false, cachedOwner = false, guestCompleted = false, languageSource = 'manual', cachedManual = false, manualRecord = true } = {}) {
  const cachedIdentity = serverIdentity(cachedOwner);
  await context.addInitScript(({ state, localFields, account, cachedIdentity, access, visitor, guestCompleted, languageSource, cachedManual, manualRecord, organization, user }) => {
    if (!localStorage.getItem('__synthetic_onboarding_seed_v1__')) {
      for (const [field, suffix] of Object.entries(localFields)) {
        if (state[field] === null) continue;
        const key = `modoCultiva_${suffix}`;
        localStorage.setItem(key, typeof state[field] === 'string' ? state[field] : JSON.stringify(state[field]));
      }
      localStorage.setItem('modoCultiva_language_source', languageSource); localStorage.setItem('modoCultiva_welcomeVisitorId', visitor);
      if (manualRecord) localStorage.setItem('modoCultiva_manualLanguage_v1', JSON.stringify({version:1,source:'manual',language:state.language}));
      if (guestCompleted) localStorage.setItem(`modo-cultiva:welcome-intro:v1:guest:${visitor}`, JSON.stringify({ version: 1, completed: true }));
      if (account) sessionStorage.setItem('gm-auth-tokens', JSON.stringify({ access_token: access, refresh_token: 'synthetic-refresh-not-a-credential', expires_in: 3600, identity: cachedIdentity }));
      if (cachedManual) {
        const prefix = `modo-cultiva:account-cache:v1:${organization}:${user}:`;
        localStorage.setItem(`${prefix}modoCultiva_language`, state.language); localStorage.setItem(`${prefix}modoCultiva_language_source`, 'manual');
      }
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
  }, { state, localFields, account, cachedIdentity, access: ACCESS, visitor: VISITOR, guestCompleted, languageSource, cachedManual, manualRecord, organization: ORG, user: USER });
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
  }, `Expected ready App spotlight ${step}`, timeout);
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
    const opener = page.locator('.home-menu-button:visible, .profile-button:visible').first();
    if (keyboard) await opener.press('Enter');
    else await opener.click();
  }
  if (keyboard) { await replay.focus(); await page.keyboard.press('Enter'); } else await replay.click();
  await ready(page, 'modes', timeout);
}
async function closeTour(page) {
  await page.locator('.guided-tour-close').click();
  await eventually(async () => await page.locator('.guided-tour-layer').count() === 0, 'Tour did not close');
}
async function assertMap(page, expectedLevels) {
  const carousel = page.locator('.circular-carousel[data-ready]');
  await carousel.scrollIntoViewIfNeeded();
  const cards = await carousel.locator('.home-mode-card').evaluateAll(elements => elements.map(element => ({
    mode: element.dataset.tourMode,
    level: Number(element.querySelector('.home-mode-summary b').textContent.match(/\d+$/)?.[0]),
    label: element.getAttribute('aria-label'),
  })));
  assert.deepEqual(cards.map(card => card.mode), MODES);
  for (const card of cards) {
    assert.equal(card.level, expectedLevels[card.mode]);
    assert.ok(card.label);
  }
  assert.equal(await carousel.locator('.home-mode-card[tabindex="0"]').count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
}
async function selectPhysicalMode(page) {
  const carousel = page.locator('.circular-carousel[data-ready]');
  await carousel.locator('.home-mode-card[tabindex="0"]').press('Home');
  await carousel.locator('.home-mode-card[data-tour-mode="fisico"][tabindex="0"]').click();
}
async function assertFixedHome(page) {
  const controls = page.locator('.circular-carousel__controls');
  await controls.waitFor();
  await page.mouse.move(5, 5);
  await page.mouse.wheel(0, 900);
  await page.evaluate(() => window.scrollTo(0, 999));
  const bounds = await controls.boundingBox();
  const viewport = page.viewportSize();
  assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= viewport.height + 1, 'Carousel controls fit without scrolling');
  assert.equal(await page.evaluate(() => window.scrollY), 0, 'Home stays fixed under a wheel or programmatic scroll');
}
async function assertJourneyNumbers(steps, language) {
  assert.equal(await steps.count(), 3, 'Only the numbered stages appear after the overview');
  for (const step of [1, 2, 3]) {
    const number = steps.nth(step - 1).locator('.journey-step-number');
    assert.equal(await number.evaluate(tag => tag.firstChild.textContent), step.toLocaleString(language), 'The activity number remains visible regardless of status');
  }
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
const methodSelectors = { custom: '.journey-manual-button', bank: '.journey-recommended-button', localContacts: '.journey-local-button', globalIdeas: '.journey-global-button', ai: '.journey-ai-button' };
async function advance(page, current, timeout) {
  const next = current === 'methods' ? 'effort' : STOPS[STOPS.indexOf(current) + 1];
  const button = page.locator('.guided-tour-rail button:last-child'); assert.equal(await button.isDisabled(), false, `Next available: ${current}`);
  await button.click();
  if (next) await ready(page, next, timeout);
  else await eventually(async () => await page.locator('.guided-tour-layer').count() === 0, 'Final tour did not finish', timeout);
}
async function visitMethods(page, timeout, language, regress) {
  const next = page.locator('.guided-tour-rail button:last-child');
  const visited = page.locator('.guided-tour-methods li[data-visited="true"]');
  const group = page.locator('.journey-fixed-actions');
  assert.equal(await visited.count(), 0, 'Overview precedes all individual visits');
  assert.equal(await group.locator('button').count(), 5);
  assert.deepEqual(await group.locator('button').evaluateAll(elements => elements.map(button => button.classList[0])), Object.values(methodSelectors).map(selector => selector.slice(1)));
  assert.equal(await group.locator('.journey-local-pin').count(), 1);
  assert.equal(await group.locator('.journey-global-globe').count(), 1);
  assert.equal(await group.locator('.journey-global-button .global-sparks').count(), 0);
  assert.equal(await group.locator('.journey-ai-button .global-sparks').count(), 1);
  assert.ok(await group.locator('button').evaluateAll(buttons => buttons.every(button => button.scrollWidth <= button.clientWidth + 1 && getComputedStyle(button).hyphens === 'none')), 'The button labels fit without forced hyphenation');
  if (regress) {
    await group.locator(methodSelectors.localContacts).dispatchEvent('click');
    assert.equal(await visited.count(), 0, 'A synthetic click cannot count toward completion');
  }
  const seen = [];
  for (const [method, selector] of Object.entries(methodSelectors)) {
    assert.equal(await next.isDisabled(), true, 'Next remains locked while any option is unvisited');
    await page.locator(selector).click(); await ready(page, method, timeout);
    const surface = method === 'localContacts' ? selector : method === 'globalIdeas' ? '.cult-embedded-content .cult-section-heading' : `.activity-agent--${method === 'bank' ? 'pool' : method}`;
    assert.equal(await page.locator(surface).isVisible(), true, `Summary button actually opens ${method}, not just a local checklist toggle`);
    if (method === 'globalIdeas') assert.ok((await page.locator('.cult-embedded-content').innerText()).includes(onboardingIntegrationCopy(language).demoDetail));
    seen.push(method);
    await next.click(); await ready(page, 'methods', timeout);
    assert.equal(await visited.count(), seen.length);
    if (regress && method === 'custom') {
      await page.locator(selector).click(); await ready(page, method, timeout);
      await page.locator('.guided-tour-rail button:first-child').click(); await ready(page, 'methods', timeout);
      assert.equal(await visited.count(), 1, 'Visiting the same option twice does not unlock others');
    }
  }
  assert.equal(await next.isEnabled(), true);
  return seen;
}
async function walkTour(page, configuration, { owner = false, regress = false, sharePreview = true } = {}) {
  const seen = [], scrollEvidence = [];
  await ready(page, 'modes', configuration.timeout); seen.push('modes');
  await inspectSpotlight(page, owner); assert.equal(await page.locator('.guided-tour-rail button:last-child').isDisabled(), true, 'Choosing an actual mode is required');
  await selectPhysicalMode(page); await ready(page, 'modeDescription', configuration.timeout);
  for (const step of STOPS.slice(1).filter(step => !(step in methodSelectors))) {
    await ready(page, step, configuration.timeout); seen.push(step);
    const inspected = await inspectSpotlight(page, owner);
    assert.equal(inspected.dir, configuration.language === 'ar' ? 'rtl' : 'ltr', 'Localized spotlight direction');
    if (inspected.scrollY > inspected.height) scrollEvidence.push(step);
    if (step === 'nextClarity') {
      assert.ok((await page.locator('.guided-tour-clarity').innerText()).trim());
      assert.equal(await page.locator('.journey-builder > .clarity-goal').count(), 0, 'Duplicate target above the card is removed');
      assert.equal(await page.locator('.journey-builder .activity-flow-target').count(), 1, 'Canonical next-clarity guidance remains inside the activity');
      assert.ok((await page.locator('.journey-builder .activity-flow-target summary').innerText()).trim());
    }
    if (step === 'methods') {
      seen.push(...await visitMethods(page, configuration.timeout, configuration.language, regress));
    }
    if (['activityCard', 'evidence', 'audience'].includes(step)) assert.equal(await page.locator('.journey-step-list > li').count(), 3, 'Three numbered activity stages');
    if (step === 'audience') {
      assert.equal(await page.locator('.activity-flow-audience input[value="network"]').isChecked(), true);
      assert.equal(await page.locator('.activity-flow-audience input[type="checkbox"]').count(), 0);
      await eventually(async () => page.evaluate(() => {
        const options = document.querySelector('.activity-flow-audience .card-audience-options').getBoundingClientRect();
        const hole = document.querySelector('.guided-tour-outline').getBoundingClientRect();
        const panel = document.querySelector('.guided-tour-card').getBoundingClientRect();
        return options.top >= hole.top - 2 && options.bottom <= hole.bottom + 2 && options.left >= hole.left - 2 && options.right <= hole.right + 2
          && !(panel.left < options.right && panel.right > options.left && panel.top < options.bottom && panel.bottom > options.top);
      }), 'Both actual audience choices must be completely illuminated and not blocked by navigation', configuration.timeout);
    }
    if (step === 'vision') { assert.equal(await page.locator('.activity-flow-stages').count(), 0, 'Level9 stays separate'); assert.equal(await page.locator('.journey-level-card--vision input[type="file"]').count(), 1); }
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
  assert.deepEqual(seen, STOPS, 'Exactly the intended tour stops');
  return { stops: seen.length, methods: Object.keys(methodSelectors).length, longScrollStops: scrollEvidence };
}

async function welcomeCase(page, configuration, account = false) {
  const messages = welcomeMessages[configuration.language].messages; const intro = page.locator('.mc-welcome');
  await intro.waitFor({ timeout: configuration.timeout });
  assert.equal(await intro.getAttribute('lang'), configuration.language);
  assert.equal(await page.locator('html').getAttribute('lang'), configuration.language === 'zh' ? 'zh-CN' : configuration.language);
  await eventually(async () => intro.locator('.mc-welcome__brand img').evaluate(img => img.complete && img.naturalWidth > 0), 'Official header logo must load');
  assert.equal(await intro.locator('.mc-welcome__brand svg').count(), 0, 'Header uses the actual logo, not the cultivation leaf');
  assert.equal(await intro.locator('.mc-welcome__mark svg').count(), 1, 'Central cultivation leaf is preserved');
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
  await page.clock.resume(); await ready(page, 'modes', configuration.timeout);
  assert.equal(await page.locator('.guided-tour-layer').getAttribute('lang'), configuration.language, 'Automatic tutorial retains the resolved interface language');
  await closeTour(page);
  await page.reload({ waitUntil: 'domcontentloaded' }); await settleHydration(page, configuration.language, configuration.timeout);
  await delay(150); assert.equal(await intro.count(), 0, 'Completed intro does not repeat on reload');
  assert.equal(await page.locator('.guided-tour-layer').count(), 0, 'Reload does not restart tutorial');
  return { phrases: 7, automaticOnly: true, pause: true, syntheticVisibilityPause: true, reducedMotion: reduced, noRepeat: true };
}

async function runCase(browser, config, task) {
  const welcomeTask = task.name.endsWith('welcome');
  const localeTask = task.name.includes('locale') || task.name.includes('ambiguous-cache'); const manualTask = task.name.includes('manual');
  const established = task.name !== 'fresh-journey' && (task.name.startsWith('legacy-') || localeTask || manualTask || !welcomeTask); const state = fixture(task.language, established);
  const expectedLanguage = manualTask ? (task.language === 'en' ? 'es' : 'en') : task.language;
  if (localeTask) { state.language = 'en'; if (!task.name.includes('legacy-locale') && !task.name.includes('ambiguous-cache')) state.languageSource = 'auto'; }
  if (manualTask) { state.language = expectedLanguage; if (!task.name.includes('cached-manual')) state.languageSource = 'manual'; }
  const account = task.name.includes('account') || task.name === 'identity'; const reduced = task.width === 320 || task.width === 870;
  const uploads = task.name.endsWith('home-upload');
  const switchesLanguage = task.name.endsWith('language-switch');
  const modeEditorial = task.name === 'mode-editorial';
  const globalEditorial = task.name === 'global-editorial';
  const specialistEditorial = task.name === 'specialist-editorial';
  const premiumAccess = task.name === 'premium-access-fixture';
  const installGuide = task.name === 'install-guide';
  const managementSurfaces = task.name === 'management-surfaces';
  const communitySurfaces = task.name === 'account-community-surfaces';
  const publicSurface = task.name === 'anonymous-public-surface';
  const editorialCase = modeEditorial || globalEditorial || specialistEditorial || premiumAccess || installGuide || managementSurfaces || communitySurfaces || publicSurface;
  if (switchesLanguage) {
    state.profileName = 'Cultiva todos tus modos.';
    if (account) state.languageSource = 'manual';
  }
  if (communitySurfaces) state.languageSource = 'auto';
  if (uploads) delete state.visionImages.financiero;
  if (task.name.endsWith('electric-home')) state.homeVisionCards = { fisico: true };
  if (task.name.endsWith('home-vision')) {
    state.levels.fisico = 9;
    state.visionImages = { fisico: PNG, arquetipico: 'data:image/png;base64,AAAA' };
    state.homeVisionCards = Object.fromEntries(MODES.map(mode => [mode, 'stock']));
    state.activityReactions = { 'fisico-3-abcdef0123456789': 'leaf' };
  }
  if (task.name.includes('local-')) state.insightRequests = { 'fisico-3': true }; // Old cache is not authoritative delivery.
  // Other test cases represent a genuinely completed introduction, not merely
  // saved map data. account-completed deliberately has no browser account flag.
  if (account && !welcomeTask) state.onboardingWelcomeCompleted = true;
  const regionalLocales = { es: 'es-MX', en: 'en-GB', zh: 'zh-Hans-CN', hi: 'hi-IN', ar: 'ar-SA', it: 'it-IT', pt: 'pt-BR', ru: 'ru-RU', de: 'de-DE', fr: 'fr-FR', da: 'da-DK' };
  const height = ['fresh-journey', 'tour'].includes(task.name) ? (task.width <= 390 ? 568 : task.width === 870 ? 667 : 835) : 835;
  const context = await browser.newContext({ viewport: { width: task.width, height }, hasTouch: task.width <= 390, serviceWorkers: 'block', reducedMotion: reduced ? 'reduce' : 'no-preference', locale: regionalLocales[task.language] });
  const errors = []; const page = await context.newPage(); page.setDefaultTimeout(config.timeout);
  page.on('pageerror', error => errors.push(error.message));
  context.on('page', popup => { if (popup !== page) { errors.push('Unexpected external page'); void popup.close(); } });
  const transport = await installTransport(context, config.url, state, { identity: serverIdentity(task.identity === 'owner'), hold: task.name === 'identity', syntheticAi: task.name === 'drafts' || modeEditorial, localIdeaCase: task.name.includes('local-') ? task.name : '', pendingTour: ['account-pending-tour', 'account-journey-ascent'].includes(task.name), uploads, communitySurfaces: communitySurfaces || publicSurface });
  await seed(context, state, { account, cachedOwner: task.identity === 'forged', guestCompleted: !welcomeTask || account, languageSource: editorialCase ? 'auto' : 'manual', manualRecord: !localeTask && !switchesLanguage && !editorialCase, cachedManual: task.name.includes('ambiguous-cache') });
  const iosGuide = installGuide && task.width <= 390;
  if (iosGuide) await context.addInitScript(() => {
    Object.defineProperty(navigator, 'userAgent', { configurable: true, get: () => 'iPhone Synthetic QA Safari' });
  });
  const setLocale = async language => {
    await page.evaluate(language => {
      Object.defineProperty(navigator, 'languages', { configurable: true, get: () => [language] });
      dispatchEvent(new Event('languagechange'));
    }, language);
    await eventually(async () => await page.locator('html').getAttribute('lang') === (language === 'zh' ? 'zh-CN' : language), 'Browser language changes live');
  };
  if (task.name.endsWith('electric-home') && !account) await context.addInitScript(() => {
    if (!localStorage.getItem('__electric_seed')) {
      localStorage.setItem('modo-cultiva:guest-cache:v1:modoCultiva_homeVisionCards', JSON.stringify({fisico:true}));
      localStorage.setItem('__electric_seed','1');
    }
  });
  const configuration = { ...config, ...task, language: expectedLanguage, reduced }; let result;
  try {
    if (welcomeTask) { await page.clock.install({ time: new Date('2026-10-29T12:00:00Z') }); await page.clock.pauseAt(new Date('2026-10-29T12:00:01Z')); }
    await page.goto(publicSurface ? `${config.url}/?community-card=${CARD_ID}` : config.url, { waitUntil: 'domcontentloaded' });
    if (task.name === 'identity') {
      await page.locator('.state-account-boundary').waitFor();
      assert.equal(await page.locator('.guided-tour-counter, .mc-welcome, .guided-tour-layer').count(), 0, 'Cached identity cannot start owner UI before verification');
      transport.identityGate.resolve(); await delay(80);
      assert.equal(await page.locator('.guided-tour-counter, .mc-welcome, .guided-tour-layer').count(), 0, 'Identity without completed state hydration cannot enable tour/counter');
      transport.stateGate.resolve();
    }
    const consentSeen = account ? await settleHydration(page, expectedLanguage, config.timeout) : false;
    if (welcomeTask) {
      result = await welcomeCase(page, configuration, account);
      await assertPreserved(page, state, account); await assertMap(page, state.levels);
      result.savedMapPreserved = true;
    }
    else {
      await delay(150); assert.equal(await page.locator('.mc-welcome').count(), 0, 'A genuinely completed introduction does not repeat');
      await assertPreserved(page, state, account); if (!publicSurface) await assertMap(page, state.levels);
      if (task.name === 'account-completed') {
        assert.equal(await page.locator('.guided-tour-layer').count(), 0, 'Cloud completion does not restart tutorial on another browser');
        result = { cloudCompletionWithoutBrowserFlag: true, noRepeat: true, preserved: true };
      } else if (task.name === 'tour' || task.name === 'account-pending-tour') {
        const tours = [];
        for (let replay = 0; replay < config.replays; replay++) {
          await openReplay(page, config.timeout);
          tours.push(await walkTour(page, configuration, { regress: replay === 0 && config.methodRegressions, sharePreview: replay === 0 && config.sharePreview }));
          await assertPreserved(page, state); await assertMap(page, state.levels);
        }
        result = { tours, preserved: true, guestCounter: false, sharingPreviewTested: config.sharePreview };
      } else if (switchesLanguage) {
        const preferred = LANGUAGES.filter(code => code !== expectedLanguage).at(-1);
        const assertLanguage = async code => {
          assert.equal(await page.locator('html').getAttribute('lang'), code === 'zh' ? 'zh-CN' : code);
          assert.equal(await page.locator('html').getAttribute('dir'), code === 'ar' ? 'rtl' : 'ltr');
          assert.equal(await page.locator('.home-greeting h1 > span').textContent(), interfaceCopy[code][0]);
          assert.equal(await page.locator('.home-greeting h1 > strong').textContent(), state.profileName, 'Never translate names or user-entered text');
          const phrase = await page.locator('.home-greeting-welcome-phrase').evaluate(el => el.firstChild.textContent);
          assert.ok(homeGreetingPhrases[code].includes(phrase));
        };
        await assertLanguage(expectedLanguage);
        const dailyQuoteLink = await page.locator('.home-greeting-quote a').getAttribute('href');
        const setBrowserLanguage = code => page.evaluate(code => {
          Object.defineProperty(navigator, 'languages', {configurable:true, get: () => [code]});
          dispatchEvent(new Event('languagechange'));
        }, code);
        if (!account) {
          await setBrowserLanguage('it');
          await eventually(async () => await page.locator('html').getAttribute('lang') === 'it', 'Auto preference follows browser language changes');
          await assertLanguage('it');
        }
        await page.locator('.home-menu-button').click();
        const picker = page.locator('.home-sidebar-language select');
        await picker.waitFor();
        const originalShell = await page.locator('main').elementHandle();
        for (const code of [...LANGUAGES.filter(code => code !== preferred), preferred]) {
          await picker.selectOption(code);
          await assertLanguage(code);
          assert.equal(await picker.inputValue(), code);
          assert.equal(await page.locator('.home-greeting-quote a').getAttribute('href'), dailyQuoteLink, 'Changing language does not change the quote source');
        }
        assert.equal(await originalShell.evaluate(node => node.isConnected), true, 'Language switch does not remount the application');
        if (account) await eventually(() => transport.snapshot().state.language === preferred && transport.snapshot().state.languageSource === 'manual', 'Explicit account language syncs with provenance');
        await setBrowserLanguage('zh');
        await assertLanguage(preferred);
        await page.reload({waitUntil:'domcontentloaded'});
        if (account) await settleHydration(page, preferred, config.timeout);
        await assertLanguage(preferred);
        await assertPreserved(page, state, account);
        await assertMap(page, state.levels);
        result = { switchedLanguages:11, sameShell:true, manualSurvivesReload:true, guestFollowsBrowser:!account, userTextPreserved:true };
      } else if (managementSurfaces) {
        const code = task.language, alternate = code === 'ar' ? 'en' : 'ar';
        const chooseHomeSection = async id => {
          await page.locator('.home-menu-button').click();
          await page.locator(`[data-home-menu-item="${id}"]`).click();
        };
        await chooseHomeSection('dashboard');
        const heading = page.locator('#dashboard-title');
        const originalHeading = await heading.textContent();
        assert.ok(originalHeading?.trim());
        const gallery = page.locator('.crm-dashboard .badges-gallery');
        assert.equal(await gallery.locator('.achievement-intro').textContent(), badgeCopy(code).intro);
        assert.equal(await gallery.locator('article[data-badge="completionist"] > p').textContent(), badgeCopy(code).completionist);
        assert.equal(await gallery.locator('article[data-badge="maxed"] > p').textContent(), badgeCopy(code).maxed);
        await setLocale(alternate);
        assert.notEqual(await heading.textContent(), originalHeading);
        assert.equal(await gallery.locator('.achievement-intro').textContent(), badgeCopy(alternate).intro);
        await page.locator('.dashboard-back').click();
        await setLocale(code);
        await chooseHomeSection('configurations');
        const dialog = page.locator('.life-configurations-card');
        const title = await dialog.locator('h2').textContent();
        const name = 'Mon plan · خطة · Mi mapa';
        await dialog.locator('#preset-name').fill(name);
        await dialog.locator('.configuration-save-action').click();
        const notice = dialog.locator('.configuration-notice');
        const originalNotice = await notice.textContent();
        assert.ok(originalNotice.includes(name));
        await setLocale(alternate);
        assert.notEqual(await dialog.locator('h2').textContent(), title);
        assert.notEqual(await notice.textContent(), originalNotice);
        assert.ok((await notice.textContent()).includes(name));
        assert.equal(await dialog.locator('#preset-select').inputValue(), name);
        assert.equal(await dialog.locator('#preset-select option:checked').textContent(), name);
        await page.keyboard.press('Escape');
        await setLocale(code);
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        await page.locator('[data-journey-step="2"] button').click();
        const evidence = page.locator('.visual-evidence-input');
        const reflection = page.locator('.activity-journey-flow textarea').first();
        await reflection.fill(EVIDENCE_TEXT);
        await evidence.locator('input[type=file]').setInputFiles({ name: 'invalid-evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('not a photo or video') });
        const error = evidence.getByRole('alert');
        assert.equal(await error.textContent(), activityFlowCopy(code).errors.unsupported);
        await setLocale(alternate);
        assert.equal(await error.textContent(), activityFlowCopy(alternate).errors.unsupported);
        assert.equal(await reflection.inputValue(), EVIDENCE_TEXT);
        assert.equal(await evidence.locator('input[type=file]').getAttribute('aria-label'), activityFlowCopy(alternate).choose);
        result = { dashboard: true, badges: true, configurationNotice: true, originalPresetNamePreserved: true, localizedEvidenceError: true, draftPreserved: true };
      } else if (communitySurfaces) {
        const code = task.language, alternate = code === 'ar' ? 'en' : 'ar';
        await page.locator('.home-menu-button').click();
        await page.locator('[data-home-menu-item="dashboard"]').click();
        await page.locator('.profile-button').click();
        await page.locator('.profile-menu-dropdown [role="menuitem"]').nth(1).click();
        const community = page.locator('.community-panel');
        const tabs = community.locator('.community-tabs button');
        const requests = path => transport.reads.filter(value => value === path).length;
        await tabs.nth(4).click();
        const notification = community.locator('.community-tab-content .community-card');
        const noticePath = '/community/notifications';
        assert.equal(await notification.locator('h4').textContent(), communityNoticeLabel(code, NOTICE_KIND));
        const time = notification.locator('time');
        const expectedDate = await time.getAttribute('datetime');
        const originalTime = await time.textContent();
        const noticeReads = requests(noticePath);
        await setLocale(alternate);
        assert.equal(await notification.locator('h4').textContent(), communityNoticeLabel(alternate, NOTICE_KIND));
        assert.notEqual(await time.textContent(), originalTime);
        assert.equal(await time.getAttribute('datetime'), expectedDate);
        assert.equal(requests(noticePath), noticeReads, 'Locale changes must not fetch notifications again');
        transport.failNotifications();
        await community.locator('.community-toolbar button').click();
        const error = community.locator('.community-error');
        assert.equal(await error.textContent(), communityCopy(alternate).unavailable);
        await setLocale(code);
        assert.equal(await error.textContent(), communityCopy(code).unavailable);

        await tabs.nth(1).click();
        await community.locator('.community-tab-content .community-card button').first().click();
        const review = community.locator('.community-review-detail');
        const assertRubric = async (node, language, selector) => {
          const target = CLARITY_CATALOG.languages[language][4];
          assert.equal(await node.locator(`${selector} p`).first().textContent(), target.description);
          assert.ok((await node.locator(`${selector} strong`).first().textContent()).includes(target.name));
        };
        await assertRubric(review, code, '.community-rubric');
        assert.equal(await review.locator('.community-private-image').getAttribute('alt'), activityFlowCopy(code).preview);
        assert.ok((await review.textContent()).includes(EVIDENCE_TEXT));
        const reviewDraft = 'Una nota propia para la revisión.';
        await review.locator('textarea').fill(reviewDraft);
        const reviewReads = requests(`/community/submissions/${REVIEW_ID}`);
        await setLocale(alternate);
        await assertRubric(review, alternate, '.community-rubric');
        assert.equal(await review.locator('textarea').inputValue(), reviewDraft);
        assert.ok((await review.textContent()).includes(EVIDENCE_TEXT));
        assert.equal(requests(`/community/submissions/${REVIEW_ID}`), reviewReads);
        await setLocale(code);
        await tabs.nth(2).click();
        await community.locator('.community-feed-card').getByRole('button', {name: cardAudienceCopy(code).openCard, exact: true}).click();
        const card = page.locator('.public-activity-card[open]');
        await card.locator('article').waitFor();
        assert.equal(await card.locator('h2').textContent(), ACTIVITY);
        await assertRubric(card, code, '.public-card-goal');
        const cardReads = requests(`/community/cards/${CARD_ID}`);
        await setLocale(alternate);
        await assertRubric(card, alternate, '.public-card-goal');
        assert.equal(await card.locator('.public-card-audience').textContent(), publicCardCopy(alternate).public);
        assert.equal(await card.locator('.public-card-photo').getAttribute('alt'), publicCardCopy(alternate).photo);
        assert.equal(await card.locator('.public-card-reflection').textContent(), EVIDENCE_TEXT);
        assert.equal(await card.locator('.public-card-author').textContent(), 'Original Creator');
        assert.equal(requests(`/community/cards/${CARD_ID}`), cardReads);
        result = { notifications: true, localizedNetworkError: true, localizedRubric: true, unchangedReviewDraft: true, authorshipPreserved: true, noRefetchOnLocaleChange: true };
      } else if (publicSurface) {
        const code = task.language, alternate = code === 'ar' ? 'en' : 'ar';
        const card = page.locator('.public-activity-card[open]');
        await card.locator('article').waitFor();
        assert.equal(await card.locator('h2').textContent(), ACTIVITY);
        assert.equal(await card.locator('.public-card-audience').textContent(), publicCardCopy(code).public);
        assert.equal(await card.locator('.public-card-goal p').first().textContent(), CLARITY_CATALOG.languages[code][4].description);
        assert.equal(await card.locator('.public-card-reflection').textContent(), EVIDENCE_TEXT);
        await setLocale(alternate);
        assert.equal(await card.locator('.public-card-goal p').first().textContent(), CLARITY_CATALOG.languages[alternate][4].description);
        assert.equal(await card.locator('h2').textContent(), ACTIVITY);
        assert.equal(await card.locator('.public-card-photo').getAttribute('alt'), publicCardCopy(alternate).photo);
        assert.equal(transport.reads.filter(value => value === `/community/public/cards/${CARD_ID}`).length, 1);
        assert.equal(transport.reads.includes('/auth/me'), false);
        result = { anonymousDeepLink: true, localizedMetadataAndPhoto: true, localizedCanonicalRubric: true, authorContentUnchanged: true };
      } else if (installGuide) {
        const switchingTo = task.language === 'hi' ? 'ar' : 'hi';
        await page.locator('.home-menu-button').click();
        const sidebar = page.locator('.home-sidebar-nav');
        assert.equal(await sidebar.locator('button').count(), 8, 'Premium remains hidden in the shipping build');
        await sidebar.locator('[data-home-menu-item="dashboard"]').click();
        const controls = page.locator('.pwa-controls');
        await controls.locator('.pwa-action--install').click();
        const guide = page.locator('.pwa-guide');
        await guide.waitFor();
        const direction = await guide.evaluate(el => getComputedStyle(el).direction);
        assert.equal(direction, task.language === 'ar' ? 'rtl' : 'ltr');
        const firstLabel = await controls.getAttribute('aria-label');
        const steps = guide.locator('li');
        const original = await steps.allTextContents();
        assert.equal(original.length, iosGuide ? 3 : 2);
        await setLocale(switchingTo);
        assert.notEqual(await controls.getAttribute('aria-label'), firstLabel);
        assert.notDeepEqual(await steps.allTextContents(), original);
        assert.match(await steps.last().textContent(), switchingTo === 'hi' ? /होम स्क्रीन पर जोड़ें/ : /الشاشة الرئيسية/);
        await guide.locator('.pwa-guide-close').click();
        assert.equal(await guide.count(), 0);
        result = { installationCopy: true, installedNothing: true, platform: iosGuide ? 'ios guide' : 'browser guide', premiumRemainedHidden: true };
      } else if (premiumAccess) {
        const code = task.language;
        const alternate = code === 'fr' ? 'ar' : 'fr';
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        const recommendation = page.locator('.journey-recommended-button');
        const originalFeature = (await recommendation.textContent()).replace(/^[^\p{L}]+/u, '');
        await recommendation.click();
        await page.locator('.bank-use').click();
        const plans = page.locator('.plans-view');
        const dialog = page.locator('.plan-detail-modal');
        const assertPlan = async (language, plan) => {
          const expected = planDetailsForLocale(language, plan);
          assert.equal(await plans.locator('h1').textContent(), planAccessCopy(language).plansTitle);
          assert.equal(await dialog.locator('h2').textContent(), expected.name);
          assert.equal(await dialog.locator('.plan-detail-price').textContent(), expected.price);
          assert.equal(await dialog.locator('.plan-detail-promise').textContent(), expected.promise);
          assert.deepEqual(await dialog.locator('li').allTextContents(), expected.features);
        };
        await assertPlan(code, 'basic');
        assert.equal(await page.locator('.journey-panel').count(), 0, 'Journey does not cover the gated flow');
        await setLocale(alternate);
        await assertPlan(alternate, 'basic');
        await dialog.locator('.close-journey').click();
        const cards = plans.locator('.plan-card');
        for (const [index, plan] of planKeys.entries()) {
          if (!index) continue;
          await cards.nth(index).click();
          await assertPlan(alternate, plan);
          await dialog.locator('.close-journey').click();
        }
        await plans.locator('.plans-signup').click();
        await page.locator('#login-name').waitFor();
        const login = page.locator('.login-view');
        assert.equal(await login.locator('h1').textContent(), planAccessCopy(alternate).contextualTitle);
        const names = { fr: 'Activités recommandées', ar: 'أنشطة مقترحة' };
        assert.ok((await login.locator('.login-copy').textContent()).includes('Entry'));
        assert.ok((await login.locator('.login-copy').textContent()).includes(names[alternate]), 'The gated feature is named in the current language');
        await setLocale(code);
        assert.equal(await login.locator('h1').textContent(), planAccessCopy(code).contextualTitle);
        assert.ok((await login.locator('.login-copy').textContent()).includes(originalFeature), 'The feature retains its name when the original locale is restored');
        await login.getByRole('button', {name: planAccessCopy(code).continueGuest}).click();
        await page.locator('.welcome-view').waitFor();
        await assertPreserved(page, state);
        result = { fixtureOnlyPremium: true, plans: planKeys.length, unlockedNothing: true, contextRetainedInLogin: true, originalActivityPreserved: true };
      } else if (specialistEditorial) {
        const code = task.language;
        const alternate = code === 'fr' ? 'ar' : 'fr';
        const setBrowserLanguage = async language => {
          await page.evaluate(language => {
            Object.defineProperty(navigator, 'languages', { configurable: true, get: () => [language] });
            dispatchEvent(new Event('languagechange'));
          }, language);
          await eventually(async () => await page.locator('html').getAttribute('lang') === (language === 'zh' ? 'zh-CN' : language), 'Specialist view follows browser language');
        };
        await page.locator('.home-menu-button').click();
        await page.locator('[data-home-menu-item="specialists"]').click();
        const profiles = page.locator('.cult-specialist-list article');
        await profiles.first().waitFor();
        assert.equal(await profiles.count(), specialistProfileIds.length);
        const specialties = await profiles.locator('.cult-specialist-copy small').allTextContents();
        for (const [index, id] of specialistProfileIds.entries()) assert.ok(specialties[index].endsWith(specialistProfileCopy(code, id).specialty));
        await profiles.first().locator('button').click();
        const profile = page.locator('.specialist-profile-modal');
        const assertCurated = async language => {
          const expected = specialistProfileCopy(language, 'sofia');
          assert.equal(await profile.locator('h2').textContent(), 'Sofía Méndez');
          assert.ok((await profile.locator('.specialist-profile-heading p').textContent()).startsWith(expected.specialty));
          assert.equal(await profile.locator('.specialist-profile-copy p').textContent(), expected.trajectory);
          assert.equal(await profile.locator('blockquote').textContent(), `“${expected.message}”`);
          assert.equal(await profile.locator('.specialist-preset h3').textContent(), expected.presetName);
          assert.equal(await profile.locator('.specialist-profile-meta bdi').textContent(), 'Español');
        };
        await assertCurated(code);
        await setBrowserLanguage(alternate);
        await assertCurated(alternate);
        await profile.locator('.close-journey').click();
        await setBrowserLanguage(code);
        const filters = page.locator('.cult-filter-row select');
        await filters.nth(0).selectOption('visionario');
        await filters.nth(1).selectOption('中文');
        await filters.nth(2).selectOption('Asia');
        assert.equal(await profiles.count(), 1);
        assert.equal(await filters.nth(1).locator('option:checked').getAttribute('lang'), 'zh');
        const exampleName = await profiles.first().locator('.cult-specialist-copy strong').textContent();
        await profiles.first().locator('button').click();
        const assertExample = async language => {
          const expected = specialistExampleCopy(language, 'visionario', 'mode');
          assert.equal(await profile.locator('h2').textContent(), exampleName);
          assert.ok((await profile.locator('.specialist-profile-heading p').textContent()).startsWith(expected.specialty));
          assert.equal(await profile.locator('.specialist-profile-copy p').textContent(), expected.trajectory);
          assert.equal(await profile.locator('.specialist-profile-meta bdi[lang="zh"]').textContent(), '中文');
        };
        await assertExample(code);
        await setBrowserLanguage(alternate);
        await assertExample(alternate);
        await profile.locator('.close-journey').click();
        assert.deepEqual(await filters.evaluateAll(selects => selects.map(select => select.value)), ['visionario', '中文', 'Asia']);
        result = { profileCards: specialties.length, localizedCuratedDetails: true, localizedFilteredExample: true, preservedLanguageAndRegionFilters: true };
      } else if (globalEditorial) {
        const code = task.language;
        const alternate = code === 'es' ? 'fr' : 'es';
        const level = state.levels.fisico;
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        await page.locator('.journey-global-button').click();
        const dialog = page.locator('.journey-global-dialog');
        const title = dialog.locator('.cult-insight-spotlight-copy h3');
        const reload = dialog.locator('.cult-insight-regenerate-button');
        assert.equal(await title.textContent(), globalIdeaTitle(code, 'fisico', level, 0));
        assert.ok(await reload.getAttribute('aria-label'));
        assert.equal(await dialog.locator('.cult-insight-dots button').count(), 12);
        await reload.click();
        const selected = globalIdeaTitle(code, 'fisico', level, 1);
        assert.equal(await title.textContent(), selected);
        const author = await dialog.locator('.cult-insight-spotlight-copy p strong').textContent();
        await dialog.locator('.cult-insight-actions button').first().click();
        const details = page.locator('.cult-insight-modal');
        const detailTitle = details.locator('h2');
        const bio = details.locator('.insight-author-bio');
        assert.equal(await detailTitle.textContent(), selected);
        assert.equal(await bio.textContent(), `“${globalIdeaBio(code, author)}”`);
        await page.evaluate(language => {
          Object.defineProperty(navigator, 'languages', { configurable: true, get: () => [language] });
          dispatchEvent(new Event('languagechange'));
        }, alternate);
        const translated = globalIdeaTitle(alternate, 'fisico', level, 1);
        await eventually(async () => await detailTitle.textContent() === translated, 'Open Global idea follows the active locale');
        assert.equal(await bio.textContent(), `“${globalIdeaBio(alternate, author)}”`, 'Same author after language change');
        assert.equal(await title.textContent(), translated, 'The same idea remains selected in the carousel');
        await details.locator('.feature-preview-cta').click();
        const draft = page.locator('.journey-social-body');
        assert.ok((await draft.textContent()).includes(translated));
        await page.evaluate(language => {
          Object.defineProperty(navigator, 'languages', { configurable: true, get: () => [language] });
          dispatchEvent(new Event('languagechange'));
        }, code);
        await eventually(async () => await page.locator('html').getAttribute('lang') === (code === 'zh' ? 'zh-CN' : code), 'Restore test locale');
        assert.ok((await draft.textContent()).includes(translated), 'A saved Global activity must not be translated retrospectively');
        result = { localizedGlobalIdea: true, newTranslatedVariant: true, openDetailRetained: true, originalAuthorRetained: true, savedAsShown: true };
      } else if (modeEditorial) {
        const code = task.language;
        const alternate = code === 'es' ? 'fr' : 'es';
        const documentLanguage = language => language === 'zh' ? 'zh-CN' : language;
        const setBrowserLanguage = async language => {
          await page.evaluate(language => {
            Object.defineProperty(navigator, 'languages', { configurable: true, get: () => [language] });
            dispatchEvent(new Event('languagechange'));
          }, language);
          await eventually(async () => await page.locator('html').getAttribute('lang') === documentLanguage(language), `Browser switch to ${language}`);
        };
        assert.equal(await page.locator('html').getAttribute('lang'), documentLanguage(code));
        await page.locator('.home-menu-button').click();
        await page.locator('[data-home-menu-item="trivia"]').click();
        const trivia = page.locator('.modo-lab-grid');
        await trivia.waitFor();
        const questions = await trivia.locator('.modo-lab-front h2').allTextContents();
        const answers = await trivia.locator('.modo-lab-answer').allTextContents();
        assert.equal(questions.length, MODES.length);
        assert.equal(new Set(questions).size, MODES.length);
        assert.equal(new Set(answers).size, MODES.length);
        if (code !== 'es') assert.deepEqual(questions, MODES.map(mode => triviaModeQuestions[code][mode]));
        const firstTrivia = trivia.locator('.modo-lab-card').first();
        await firstTrivia.locator('.modo-lab-front button').click();
        assert.ok(await firstTrivia.evaluate(card => card.classList.contains('modo-lab-card--flipped')));
        await setBrowserLanguage(alternate);
        assert.notEqual(await firstTrivia.locator('.modo-lab-answer').textContent(), answers[0]);
        assert.ok(await firstTrivia.evaluate(card => card.classList.contains('modo-lab-card--flipped')), 'Changing the language does not flip a card back');
        await setBrowserLanguage(code);
        await page.locator('.modo-lab-dashboard-back').click();
        await page.locator('.dashboard-back').click();
        const carousel = page.locator('.circular-carousel[data-ready]');
        const active = carousel.locator('.home-mode-card[tabindex="0"]');
        const journey = page.locator('.journey-panel');
        const descriptions = [];
        await active.press('Home');
        for (const [index, mode] of MODES.entries()) {
          await carousel.locator(`[data-tour-mode="${mode}"][tabindex="0"]`).press('Enter');
          const description = await journey.locator('.journey-deck-overview h3 + p').textContent();
          descriptions.push(description);
          if (code in journeyModeTranslations) assert.equal(description, journeyModeTranslations[code][mode]);
          if (code !== 'es') assert.equal(description, answers[index]);
          await journey.locator('.close-journey').click();
          if (index < MODES.length - 1) await carousel.locator('.circular-carousel__controls button').nth(1).click();
        }
        assert.equal(new Set(descriptions).size, MODES.length);
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        await page.locator('.journey-recommended-button').click();
        const bank = page.locator('.bank-presentation');
        const assertBank = async (language, slide) => {
          const item = getBankActivities('fisico', state.levels.fisico, language)[slide];
          const quote = bank.locator('.bank-quote-page blockquote');
          assert.equal(await quote.getAttribute('lang'), language);
          assert.equal(await quote.textContent(), activityQuoteText(item.quote, language));
          assert.equal(await bank.locator('.bank-attribution cite').textContent(), bankSources[item.quote.source].author);
          assert.equal(await bank.locator('.bank-source a').getAttribute('href'), bankSources[item.quote.source].url);
          assert.equal(await bank.locator('.bank-source p[lang="en"]').textContent(), `“${item.quote.en}”`);
          assert.ok((await bank.locator('.bank-pagination [aria-current="true"]').getAttribute('aria-label')).endsWith(item.title));
          return item;
        };
        await assertBank(code, 0);
        await bank.locator('.bank-pagination button').nth(1).click();
        await assertBank(code, 1);
        await setBrowserLanguage(alternate);
        const item = await assertBank(alternate, 1);
        await bank.locator('.bank-use').click();
        const activity = page.locator('.journey-social-body');
        assert.ok((await activity.textContent()).includes(`${item.title}. ${item.description}`));
        await page.locator('.journey-ai-button').click();
        await page.locator('.mode-ai-ask').click();
        const notice = page.locator('.mode-ai-notice');
        assert.equal(await notice.textContent(), modeAiMessage(alternate, 'context'));
        await setBrowserLanguage(code);
        assert.equal(await notice.textContent(), modeAiMessage(code, 'context'));
        const prompt = 'Texto de la persona · Keep my input exactly as entered.';
        await page.locator('#activity-prompt').fill(prompt);
        await page.locator('.mode-ai-ask').click();
        const proposal = page.locator('.mode-ai-proposal-text');
        assert.equal(await proposal.textContent(), PROPOSAL);
        assert.equal(await proposal.getAttribute('lang'), code);
        assert.equal(transport.aiPayloads[0].language, code);
        assert.equal(transport.aiPayloads[0].context, prompt);
        await setBrowserLanguage(alternate);
        assert.equal(await page.locator('#activity-prompt').inputValue(), prompt);
        assert.equal(await proposal.textContent(), PROPOSAL);
        assert.equal(await proposal.getAttribute('lang'), code, 'Retain the original language of an existing suggestion');
        await page.locator('.mode-ai-ask').click();
        await eventually(async () => await proposal.count() === 1 && await proposal.getAttribute('lang') === alternate, 'New suggestion uses the current language');
        assert.equal(transport.aiPayloads[1].language, alternate);
        result = { modeDescriptions: descriptions.length, triviaCards: questions.length, bankOriginalRetained: true, localizedSavedRecommendation: true, aiLanguageAndDraftVerified: true };
      } else if (task.name.endsWith('electric-home')) {
        const modal = page.locator('.home-vision-settings[open]');
        const open = async () => { await page.locator('.home-menu-button').click(); await page.locator('[data-home-menu-item="images"]').click(); await modal.waitFor(); };
        await open();
        assert.equal(await modal.locator('[data-mode=fisico] input[value=vision]').isChecked(), true, 'Keep the old boolean preference');
        assert.equal(await modal.locator('input[value=electric]').count(), 12);
        assert.deepEqual(await modal.locator('[data-mode=intelectual] input').evaluateAll(inputs => inputs.map(input => input.value)), ['electric','vision','stock']);
        assert.ok((await modal.locator('[data-mode=intelectual]').innerText()).includes(homeVisionCopy(task.language)[2]));
        assert.equal(await modal.locator('[data-mode=intelectual] input[value=electric]').isChecked(), true, 'Unconfigured modes default to electric symbols');
        assert.equal(await modal.locator('[data-mode=fisico] input[type=file]').count(), 1, 'Existing Vision can be changed');
        for (const mode of MODES) {
          if (await modal.locator(`[data-mode=${mode}] input[value=electric]`).isChecked()) await modal.locator(`[data-mode=${mode}] input[value=stock]`).check();
          await modal.locator(`[data-mode=${mode}] input[value=electric]`).check();
          assert.ok((await modal.locator(`[data-mode=${mode}]`).innerText()).includes(electricSymbolLabel(task.language)));
        }
        assert.equal(await modal.locator('input[type=file]').count(), 0, 'Symbol choices do not show upload controls');
        assert.equal(await page.locator('.global-sparks--symbol').count(), 0, 'Settings pause decorative effects');
        await page.keyboard.press('Escape');
        const expected = Object.fromEntries(MODES.map(mode => [mode, 'electric']));
        if (account) await eventually(() => JSON.stringify(transport.snapshot().state.homeVisionCards) === JSON.stringify(expected), 'All electric preferences synced');
        await page.reload({ waitUntil: 'domcontentloaded' });
        if (account) await settleHydration(page, expectedLanguage, config.timeout);
        const carousel = page.locator('.circular-carousel[data-ready]');
        await carousel.locator('.home-mode-card[tabindex="0"]').press('Home');
        const sparks = carousel.locator('.global-sparks--symbol');
        if (!reduced) {
          assert.equal(await sparks.count(), 1, 'One card has particles');
          assert.equal(await sparks.evaluate(el => getComputedStyle(el, '::before').animationName), 'global-spark-drift');
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await sparks.waitFor({state:'detached'});
          await page.emulateMedia({ reducedMotion: 'no-preference' });
          await sparks.waitFor();
          if (process.env.ELECTRIC_QA_SCREENSHOT) await page.screenshot({path:process.env.ELECTRIC_QA_SCREENSHOT});
        } else assert.equal(await sparks.count(), 0);
        assert.equal(await carousel.locator('canvas').count(), 0);
        assert.equal(await carousel.locator('.circular-carousel__photo').count(), 0, 'No redundant curved image tiles when all cards use symbols');
        for (const [index, mode] of MODES.entries()) {
          const button = carousel.locator(`[data-tour-mode="${mode}"][tabindex="0"]`);
          await button.waitFor();
          assert.ok((await button.getAttribute('class')).includes('home-mode-card--electric'));
          const artwork = button.locator('.mode-electric-symbol-fallback');
          const customAssets = { fisico: 'fisico-caduceo.svg', emocional: 'emocional-caritas.svg', intelectual: 'intelectual-cerebro.svg', espiritual: 'espiritual-sol.svg', familiar: 'familiar-casa.svg', profesional: 'profesional-portafolio.svg', ludico: 'ludico-mando.svg' };
          const asset = { emocional: 'emocional-electrico.svg?v=3', intelectual: 'intelectual-electrico.svg', espiritual: 'espiritual-electrico.svg', profesional: 'profesional-electrico.svg', fisico: 'fisico-electrico.svg', visionario: 'fisico.webp', ludico: 'ludico-electrico.svg?v=2' }[mode] ?? `${mode}.webp`;
          assert.equal(await artwork.getAttribute('src'), `/mode-symbols/${asset}`);
          await eventually(() => artwork.evaluate(img => img.complete && img.naturalWidth > 0), 'Premium artwork loaded');
          const scale = { fisico: .63, intelectual: .536, emocional: .85, arquetipico: .737, espiritual: .603, romantico: .67, familiar: .737, social: .67, financiero: .67, profesional: .67, ludico: .95, visionario: .8375 }[mode];
          assert.equal(await artwork.evaluate(img => {
            const matrix = getComputedStyle(img).transform;
            return matrix === 'none' ? 1 : new DOMMatrix(matrix).a;
          }), scale, 'Electric Home artwork uses its assigned scale without resizing the card');
          if (mode === 'ludico' || mode === 'emocional') assert.ok(await artwork.evaluate((img, mode) => {
            const playful = mode === 'ludico';
            const [width, height] = playful ? [160, 136] : [120, 112];
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const layer = canvas.getContext('2d');
            layer.drawImage(img, 0, 0, width, height);
            const { data } = layer.getImageData(0, 0, width, height);
            let left = width, right = 0, bright = 0, saturatedRed = 0;
            for (let offset = 0; offset < data.length; offset += 4) {
              if (data[offset + 3] < 170) continue;
              const x = (offset / 4) % width;
              left = Math.min(left, x); right = Math.max(right, x);
              if (data[offset] >= 245 && data[offset + 1] >= 225 && data[offset + 2] >= 205) bright++;
              if (data[offset] >= 200 && data[offset + 1] <= 70 && data[offset + 2] <= 95) saturatedRed++;
            }
            const alpha = (x, y) => data[(y * width + x) * 4 + 3];
            const [sx, sy] = playful ? [42, 37] : [33, 30];
            const spark = Math.max(alpha(sx, sy), alpha(sx + 1, sy), alpha(sx, sy + 1), alpha(sx + 1, sy + 1));
            return right - left >= width * .55 && right - left <= width * .69
              && bright >= 12 && spark >= 170 && (playful ? alpha(80, 59) < 30 : saturatedRed >= 250);
          }, mode), 'The luminous spirals and core fit the smaller footprint; Lúdico remains hollow');
          if (mode === 'emocional') assert.equal(await artwork.evaluate(img => getComputedStyle(img).filter), 'none', 'Emocional retains its authored vivid reds');
          else assert.ok(await artwork.evaluate(img => {
            const palette = getComputedStyle(img).getPropertyValue('--mode-color').trim();
            const filter = img.parentElement.querySelector('filter');
            const channels = [1, 3, 5].map(offset => parseInt(palette.slice(offset, offset + 2), 16) / 255);
            return getComputedStyle(img).filter.includes(filter.id)
              && ['R', 'G', 'B'].every((key, i) => Number(filter.querySelector(`feFunc${key}`).getAttribute('tableValues').split(' ')[3]) === channels[i]);
          }), 'The electric artwork uses the color of its destination mode');
          const icon = button.locator('.home-mode-icon');
          if (mode === 'visionario') assert.equal(await icon.textContent(), '✦');
          if (mode === 'arquetipico') assert.equal(await icon.textContent(), '✺');
          if (customAssets[mode]) assert.equal(await icon.locator('img').getAttribute('src'), `/mode-symbols/${customAssets[mode]}`);
          if (index % 2) await button.press('Enter'); else if (task.width <= 390) await button.tap(); else await button.click();
          await page.locator('.journey-panel').waitFor();
          if (customAssets[mode]) assert.equal(await page.locator('.journey-panel .journey-icon img').getAttribute('src'), `/mode-symbols/${customAssets[mode]}`);
          assert.equal(await sparks.count(), 0, 'Covered home pauses its effects');
          await page.locator('.close-journey').click();
          if (index < MODES.length-1) await carousel.locator('.circular-carousel__controls button').nth(1).click();
        }
        await open();
        for (const mode of MODES) assert.equal(await modal.locator(`[data-mode=${mode}] input[value=electric]`).isChecked(), true);
        await modal.locator('[data-mode=fisico] input[value=vision]').check();
        await modal.locator('[data-mode=intelectual] input[value=stock]').check();
        await page.keyboard.press('Escape');
        if (account) await eventually(() => transport.snapshot().state.homeVisionCards?.fisico === true && transport.snapshot().state.homeVisionCards?.intelectual === 'stock', 'Restoring existing choices synced');
        await assertPreserved(page,state,account);
        result = { electricModes:12, oldBooleanPreserved:true, selectableSources:3, persistence:account?'account':'guest', noCanvas:true, strictReducedMotion:true, allModesOpen:true, preserved:true };
      } else if (uploads) {
        const modal = page.locator('.home-vision-settings[open]');
        const open = async () => { await page.locator('.home-menu-button').click(); await page.locator('[data-home-menu-item="images"]').click(); await modal.waitFor(); };
        const field = modal.locator('[data-mode=financiero]');
        const current = field.locator('img');
        const prior = await page.locator('[data-tour-mode=financiero]').getAttribute('aria-label');
        const choose = async () => {
          await field.locator('input[value=vision]').check();
          assert.equal(await modal.isVisible(), true, 'Selecting Vision keeps the person in Home Images');
          assert.equal(await field.locator('.vision-upload').isVisible(), true, 'The person chooses when to open the image picker');
          const event = page.waitForEvent('filechooser');
          await field.locator('.vision-upload').click();
          return await event;
        };
        await open();
        await field.locator('input[value=vision]').check();
        assert.equal(await modal.isVisible(), true, 'Choosing Vision alone does not navigate away');
        assert.equal(await field.locator('.vision-upload').isVisible(), true, 'Image selection waits for the explicit upload button');
        await field.locator('input[value=stock]').check();
        const cancelled = await choose();
        await cancelled.setFiles([]);
        assert.equal(await modal.isVisible(), true, 'Cancelling the native picker returns to the same settings dialog');
        assert.equal(await field.locator('input[value=vision]').isChecked(), true, 'Cancelling leaves Vision selected');
        const invalidPicker = await choose();
        await invalidPicker.setFiles({name:'invalid.png',mimeType:'image/png',buffer:Buffer.from('invalid')});
        await field.locator('.vision-image-notice:not(:empty)').waitFor();
        assert.equal(await field.locator('input[value=vision]').isChecked(), true, 'A failed upload keeps the Vision selection');
        assert.equal(await field.locator('.home-vision-empty-preview').isVisible(), true, 'A missing Vision photo stays blank instead of showing stock');
        const valid = await choose();
        await valid.setFiles({name:'valid.png',mimeType:'image/png',buffer:Buffer.from(PNG.split(',')[1],'base64')});
        await eventually(async () => (await current.getAttribute('src'))?.startsWith('data:image/'), 'Uploaded photo appears in the preview');
        const uploaded = await current.getAttribute('src');
        assert.match(uploaded, /^data:image\//);
        if (account) await eventually(() => transport.snapshot().state.visionImages.financiero === uploaded && transport.snapshot().state.homeVisionCards.financiero === true, 'Photo and choice synced');
        await page.keyboard.press('Escape');
        await page.reload({ waitUntil:'domcontentloaded' });
        if (account) await settleHydration(page, expectedLanguage, config.timeout);
        const card = page.locator('[data-tour-mode=financiero]');
        assert.equal(await card.getAttribute('aria-label'), prior, 'Upload does not change the level');
        const carouselPhoto = page.locator('.circular-carousel__card:has([data-tour-mode=financiero]) .circular-carousel__photo').first();
        assert.equal(await carouselPhoto.getAttribute('src'), uploaded);
        await open();
        assert.equal(await field.locator('input[type=file]').count(), 1, 'Available photo can be replaced');
        sameProtected(await storedDocument(page, account), state, true);
        result = { uploadFromHome:true, invalidRejected:true, persistence:account?'account':'guest', levelPreserved:true };
      } else if (task.name.endsWith('home-vision')) {
        const menu = page.locator('.home-menu-button');
        const modal = page.locator('.home-vision-settings[open]');
        const photo = mode => page.locator(`.circular-carousel__card:has([data-tour-mode="${mode}"]) .circular-carousel__photo`).first();
        const choice = (mode, value) => modal.locator(`[data-mode="${mode}"] input[value="${value}"]`);
        const open = async () => {
          await menu.click();
          assert.deepEqual(await page.locator('#home-sidebar [data-home-menu-item]').evaluateAll(items => items.map(item => item.dataset.homeMenuItem)),
            ['home', 'profile', 'configurations', 'images', 'dashboard', 'specialists', 'trivia', 'replay']);
          await page.locator('[data-home-menu-item="images"]').click();
          await modal.waitFor();
        };
        await assertFixedHome(page);
        assert.equal(await photo('fisico').getAttribute('src'), '/mode-photos/fisico.jpg', 'Existing vision does not opt anyone in');
        await open();
        assert.equal(await modal.locator('h2').innerText(), homeVisionCopy(task.language)[0]);
        assert.equal(await modal.locator('fieldset').count(), 12);
        assert.equal(await choice('financiero', 'vision').isEnabled(), true, 'Vision is available even before a photo exists');
        await choice('arquetipico', 'vision').check();
        await eventually(async () => await photo('arquetipico').getAttribute('src') === '/mode-photos/arquetipico.jpg', 'Broken image falls back');
        await choice('arquetipico', 'stock').check();
        await choice('romantico', 'vision').check();
        assert.equal(await modal.locator('[data-mode=romantico] .home-vision-empty-preview').isVisible(), true, 'No level-nine photo means an empty Vision preview');
        assert.equal(await photo('romantico').count(), 0, 'Empty Vision does not load a stock carousel image');
        await choice('fisico', 'vision').check();
        await page.keyboard.press('Escape');
        await modal.waitFor({ state: 'detached' });
        assert.equal(await photo('fisico').getAttribute('src'), PNG);
        assert.equal(await photo('financiero').getAttribute('src'), '/mode-photos/financiero.jpg');
        if (account) await eventually(() => transport.snapshot().state.homeVisionCards?.fisico === true, 'Account preference does not sync');
        await page.reload({ waitUntil: 'domcontentloaded' });
        if (account) await settleHydration(page, expectedLanguage, config.timeout);
        assert.equal(await photo('fisico').getAttribute('src'), PNG, 'Selection survives reload');
        await open();
        assert.equal(await choice('fisico', 'vision').isChecked(), true);
        await choice('fisico', 'stock').check();
        await page.goBack();
        await modal.waitFor({ state: 'detached' });
        assert.equal(await photo('fisico').getAttribute('src'), '/mode-photos/fisico.jpg');
        if (account) await eventually(() => transport.snapshot().state.homeVisionCards?.fisico === 'stock', 'Restoring stock does not sync');
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        await page.locator('.journey-level-card--vision').waitFor();
        assert.equal(await page.locator('.journey-level-card--vision input[type=file]').count(), 1, 'Vision still owns the uploader');
        assert.equal(await page.locator('.journey-level-card--vision .vision-image-content').getAttribute('src'), PNG, 'Restoring stock never changes the original Vision');
        await assertPreserved(page, state, account);
        result = { menuOrder: true, twelvePhotoSettings: true, existingVisionOptIn: true, persistence: account ? 'account' : 'guest', missingAndBrokenFallback: true, levelNineUploadStillWorks: true, preserved: true };
      } else if (task.name === 'fresh-journey') {
        const carousel = page.locator('.circular-carousel[data-ready]');
        await assertFixedHome(page);
        if (task.width === 870) {
          await page.setViewportSize({ width: 667, height: 375 });
          await assertFixedHome(page);
          await page.setViewportSize({ width: task.width, height });
        }
        const active = carousel.locator('.home-mode-card[tabindex="0"]');
        const header = page.locator('.topbar--material-home');
        assert.equal(await header.evaluate(el => getComputedStyle(el).boxShadow), 'none');
        assert.equal(await header.locator('.topbar-actions').evaluate(el => getComputedStyle(el).position), 'fixed');
        const expectedColors = ['#22C7A5', '#3D8FD2', '#D94A4A', '#EF7909', '#FFFFFF', '#F16FAD', '#A47DAB', '#3FBBC3', '#D9B65D', '#7A91A8', '#A87554', '#A77BDB'];
        await active.press('Home');
        for (const [index, mode] of MODES.entries()) {
          const card = carousel.locator(`[data-tour-mode="${mode}"][tabindex="0"]`);
          await card.waitFor();
          const method = index % 2 ? 'press' : 'click';
          if (method === 'press') await card.press('Enter'); else await card.click();
          const dialog = page.locator('.journey-panel');
          assert.equal(await dialog.locator('.journey-replay').count(), 0);
          assert.equal(await dialog.locator('.journey-current-level .global-sparks').count(), 1);
          assert.equal(await dialog.locator('.journey-step-arrow--previous').count(), 0, 'No Previous arrow on Overview');
          assert.equal(await dialog.locator('.journey-step-arrow--next .global-sparks').count(), 1);
          const separator = await dialog.locator('.journey-definition-label').evaluate(el => {
            const label = el.getBoundingClientRect();
            const caption = el.firstElementChild.getBoundingClientRect();
            return {
              centerOffset: Math.abs((label.left + label.right) - (caption.left + caption.right)) / 2,
              before: parseFloat(getComputedStyle(el, '::before').width),
              after: parseFloat(getComputedStyle(el, '::after').width),
              animation: getComputedStyle(el.querySelector('.global-sparks'), '::before').animationName,
            };
          });
          assert.ok(separator.centerOffset < 1 && separator.before > 0 && Math.abs(separator.before - separator.after) < 1, 'Separator label is centered between equal lines');
          assert.equal(separator.animation, reduced ? 'none' : 'global-spark-drift');
          if (task.language === 'es') {
            assert.equal((await dialog.locator('.journey-current-level').textContent()).trim(), 'Estás en nivel: 0');
            assert.equal(await dialog.locator('.journey-definition-label').textContent(), 'Definición de este nivel:');
          }
          assert.equal(await dialog.evaluate(el => el.style.getPropertyValue('--mode-color')), expectedColors[index]);
          assert.equal(await dialog.locator('.journey-level-link--up').isDisabled(), true);
          assert.equal(await dialog.locator('.journey-level-link--down').count(), 0);
          assert.equal(await dialog.locator('.journey-step-list').count(), 0, 'Overview hides the steps');
          await dialog.locator('.journey-step-arrow--next').click();
          assert.equal(await dialog.locator('[data-journey-step="2"] button').isDisabled(), true);
          assert.equal(await dialog.locator('[data-journey-step="3"] button').isDisabled(), true);
          await dialog.locator('.close-journey').click();
          if (index < MODES.length - 1) await carousel.locator('.circular-carousel__controls button').nth(1).click();
        }
        await page.locator('.home-menu-button').click();
        await page.locator('[data-home-menu-item="specialists"]').click();
        await page.locator('.specialists-view .cult-specialist-list').waitFor();
        await page.locator('.specialists-view .cult-exit').click();
        await page.locator('.home-menu-button').click();
        await page.locator('[data-home-menu-item="dashboard"]').click();
        assert.ok(await page.locator('.crm-dashboard > .badges-gallery:last-child').isVisible());
        await page.locator('.crm-focus-list button').first().click();
        await page.locator('.journey-panel .journey-back').click();
        await assertFixedHome(page);
        await selectPhysicalMode(page);
        await page.locator('.journey-step-arrow--next').click();
        const social = page.locator('.journey-social-footer');
        assert.equal(await social.locator('.journey-reactions').count(), JOURNEY_REACTIONS_ENABLED ? 1 : 0);
        const share = social.locator('.journey-share');
        const buttons = share.getByRole('button');
        assert.equal(await share.locator('button:disabled').count(), 4);
        if (task.language === 'es') {
          assert.equal(await share.locator('.journey-social-label').textContent(), 'Define actividad para poder compartir');
          assert.equal(await page.locator('.journey-social-title').textContent(), 'Usa los 5 botones de abajo para definir la actividad que te llevará al siguiente nivel');
        }
        // A direct click event cannot open an export while the activity is undefined.
        await buttons.first().dispatchEvent('click');
        assert.equal(await page.locator('.activity-share-dialog').count(), 0);
        await page.locator(methodSelectors.custom).click();
        await page.locator('#activity-prompt').fill(ACTIVITY);
        await page.locator('.activity-agent--custom textarea').last().fill(ALIGNMENT);
        await page.locator('.activity-agent--custom button[type="submit"]').click();
        await social.waitFor();
        assert.equal(await share.locator('button:enabled').count(), 4, 'Saving the definition enables sharing without requiring evidence or publication');
        await buttons.first().click();
        await page.locator('.activity-share-dialog[open]').waitFor();
        await page.locator('.activity-share-dialog[open] .share-close').click();
        result = { freshLevels: 0, allModesOpen: 12, palette: true, floatingHome: true, specialistsAndBadges: true, fixedHome: true, shareGatedOnDefinition: true };
      } else if (task.name === 'account-journey-ascent') {
        await selectPhysicalMode(page);
        const steps = page.locator('.journey-step-list button');
        const up = page.locator('.journey-level-link--up');
        const previous = page.locator('.journey-step-arrow--previous');
        const next = page.locator('.journey-step-arrow--next');
        const down = page.locator('.journey-level-link--down');
        const frame = page.locator('.journey-deck-frame');
        const stepButton = step => page.locator(`[data-journey-step="${step}"] button`);
        assert.equal(await previous.count(), 0);
        assert.equal(await steps.count(), 0);
        assert.equal(await up.locator('svg').count(), 1, 'Locked ascent shows a lock');
        assert.equal(await up.locator('.global-sparks').count(), 0);
        assert.equal(await down.isEnabled(), true);
        assert.equal(await down.locator('.global-sparks').count(), 0);
        const bounds = await frame.boundingBox(), upper = await up.boundingBox(), lower = await down.boundingBox(), forward = await next.boundingBox();
        assert.ok(upper.y + upper.height <= bounds.y && lower.y >= bounds.y + bounds.height, 'Level controls are outside the central card');
        // Layout dimensions remain stable while the modal entrance is animating.
        const controlDimensions = button => button.evaluate(element => [element.offsetWidth, element.offsetHeight]);
        assert.deepEqual(await controlDimensions(up), await controlDimensions(down));
        assert.ok(task.language === 'ar' ? forward.x + forward.width <= bounds.x : forward.x >= bounds.x + bounds.width, 'Next floats in the side rail');
        assert.equal(await next.locator('svg.journey-boomerang').count(), 1);
        assert.equal(await next.locator('.global-sparks').count(), 1);
        const assertStepLabelsFit = () => steps.locator('small').evaluateAll(labels => labels.map(label => {
          const range = document.createRange();
          range.selectNodeContents(label);
          const lines = range.getClientRects();
          const text = range.getBoundingClientRect();
          const button = label.closest('button').getBoundingClientRect();
          const list = label.closest('ol').getBoundingClientRect();
          return lines.length === 1
            && text.left >= button.left && text.right <= button.right
            && text.top >= button.top && text.bottom <= button.bottom
            && button.left >= list.left && button.right <= list.right;
        }));
        await next.click();
        await assertJourneyNumbers(steps, task.language);
        for (const step of [1, 2, 3]) {
          await stepButton(step).click();
          assert.equal(await previous.isVisible(), true, `Previous is visible in step ${step}`);
          assert.equal(await previous.locator('.global-sparks').count(), 0);
          assert.deepEqual(await assertStepLabelsFit(), [true, true, true], 'Tab text stays inside each button on one line');
          assert.equal(await steps.evaluateAll(buttons => new Set(buttons.map(b => b.getBoundingClientRect().top)).size), 1, 'All three buttons are on one row');
        }
        await previous.click();
        assert.equal(await stepButton(2).getAttribute('aria-current'), 'step');
        await previous.click();
        await previous.click();
        assert.equal(await previous.count(), 0);
        assert.equal(await steps.count(), 0);
        await eventually(() => next.evaluate(button => button === document.activeElement), 'Focus returns to the remaining next arrow');
        await next.click();
        await previous.press(task.language === 'ar' ? 'ArrowRight' : 'ArrowLeft');
        assert.equal(await previous.count(), 0, 'Keyboard navigation also hides Previous when it reaches the overview');
        await eventually(() => next.evaluate(button => button === document.activeElement), 'Keyboard focus moves to the next arrow on overview');
        if (task.language === 'es') {
          assert.match(await up.textContent(), /Siguiente nivel · 4.*Se desbloquea al validar tu actividad/s);
          assert.match(await page.locator('.journey-level-link--down').textContent(), /Ver nivel anterior · 2/);
        }
        await next.click();
        await stepButton(3).click();
        assert.equal(await page.locator('.activity-flow-review progress').getAttribute('value'), '1');
        assert.equal(await up.isDisabled(), true);
        transport.setApprovals(2);
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.locator('.activity-flow-review progress[value="2"]').waitFor();
        assert.equal(await up.isDisabled(), true, 'Two approvals do not unlock a new level');
        transport.setApprovals(3); state.levels.fisico = 4;
        await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
        await page.locator('.activity-flow-review progress[value="3"]').waitFor();
        if (task.language === 'es') await eventually(async () => /Subir al siguiente nivel · 4/.test(await up.textContent()), 'The unlocked ascent invites the user to go up');
        await up.locator('.global-sparks').waitFor();
        assert.equal(await up.isEnabled(), true, 'Only unlocked ascent gets neon particles');
        await up.click();
        assert.equal(await steps.count(), 0);
        await next.click();
        assert.equal(await stepButton(2).isDisabled(), true, 'A new level has no evidence until its activity is defined');
        assert.equal(await stepButton(3).isDisabled(), true);
        assert.equal(await up.isDisabled(), true);
        await page.locator('.journey-level-link--down').click();
        await next.click();
        await stepButton(3).click();
        assert.equal(await page.locator('.activity-flow-review progress').getAttribute('value'), '3');
        await assertPreserved(page, state, true);
        result = { fourCards: true, approvalsUnlockAscent: 3, priorLevelStillVisible: true };
      } else if (task.name === 'identity') {
        await openReplay(page, config.timeout); await inspectSpotlight(page, task.identity === 'owner');
        if (task.identity === 'owner') assert.ok((await page.locator('.guided-tour-counter').innerText()).includes(STOPS.length.toLocaleString(expectedLanguage)), 'Verified owner sees the current stop total');
        await closeTour(page); await assertPreserved(page, state, true);
        // Replay restores its original MC menu too. Close it before opening another surface.
        if (await page.locator('[data-tour="replay"]').isVisible()) await page.locator('.profile-button').click();
        await selectPhysicalMode(page);
        await page.locator('.journey-panel').waitFor();
        assert.equal(await page.locator('.journey-community-actions').count(), 0, 'No redundant community callout under the activity');
        await page.locator('.profile-button').click();
        await page.locator('[role="menuitem"]').filter({ hasText: onboardingIntegrationCopy(task.language).network }).click();
        await page.locator('.community-tabs button').nth(2).click();
        await page.locator('[data-tour="community-feed"] .community-inline-form').waitFor();
        const chooser = page.locator('[data-tour="community-feed"] .community-inline-form');
        assert.ok((await chooser.locator('select').innerText()).includes(ACTIVITY), 'App supplies actual saved share candidate');
        assert.equal(await chooser.locator('input[value="network"]').isChecked(), true); assert.equal(await chooser.locator('input[type="checkbox"]').count(), 0);
        await page.locator('.community-close').click(); await assertPreserved(page, state, true);
        result = { identity: task.identity, counter: task.identity === 'owner', verifiedAndHydrated: true, consentSeen, shareCtaOpensFeedChooser: true, guestArchivePreserved: true };
      } else if (task.name.includes('local-')) {
        await selectPhysicalMode(page);
        const steps = page.locator('.journey-step-list button');
        assert.equal(await steps.count(), 0);
        await page.locator('.journey-step-arrow--next').click();
        await assertJourneyNumbers(steps, task.language);
        assert.ok(await steps.nth(0).locator('.journey-step-check').isVisible(), 'A completion check does not replace the step number');
        assert.equal(await steps.nth(2).isDisabled(), true);
        assert.equal(await page.locator('.journey-level-link--up').isDisabled(), true);
        assert.equal(await page.locator('#journey-slider').count(), 0);
        const activity = page.locator('.journey-deck-content > .journey-level-card');
        assert.ok(await activity.evaluate(card => card.querySelector('.journey-fixed-actions') && card.nextElementSibling.classList.contains('journey-social-footer')), 'The five activity actions sit inside the card above the separate social footer');
        const neonButtons = activity.locator('.journey-action-neon');
        assert.equal(await neonButtons.count(), 4);
        const neonColors = await neonButtons.evaluateAll(buttons => buttons.map(button => getComputedStyle(button).color));
        assert.equal(new Set(neonColors).size, 1, 'All four neon actions use the same theme color');
        assert.equal(await activity.locator('.journey-global-button .journey-global-globe').count(), 1);
        assert.equal(await activity.locator('.activity-journey-flow > .activity-flow-help').count(), 0);
        const reminder = activity.locator('.activity-flow-target summary');
        if (task.language === 'es') assert.equal(await reminder.textContent(), 'Recordatorios para pasar al siguiente nivel');
        await reminder.click();
        const paragraphs = activity.locator('.activity-flow-target details > p');
        const divider = activity.locator('.activity-flow-target details > p + .journey-definition-label');
        assert.equal(await divider.count(), 1, 'The neon divider follows the alignment rule');
        assert.equal(await divider.locator('.global-sparks').count(), 1);
        assert.equal(await activity.locator('.journey-definition-label + .activity-flow-description').count(), 1, 'The divider introduces the definition');
        if (task.language === 'es') assert.equal(await divider.textContent(), 'Definición del siguiente nivel:');
        assert.equal(await paragraphs.nth(1).getAttribute('class'), 'activity-flow-description', 'The alignment comes before the target description');
        assert.doesNotMatch(await paragraphs.nth(0).textContent(), /No basta con/i);
        await reminder.click();
        await page.locator('.journey-global-button').click();
        await page.locator('.journey-global-dialog .cult-insight-spotlight').waitFor();
        assert.equal(transport.ideaWrites.length, 0, 'Global ideas display recommendations without notifying contacts');
        await page.locator('.journey-global-dialog > .close-journey').click();
        await steps.nth(1).click();
        const flow = page.locator('.activity-journey-flow'); await flow.waitFor();
        assert.equal(await page.locator('.journey-community-actions').count(), 0);
        assert.equal(await flow.locator(':scope > .activity-flow-help').count(), 0);
        assert.equal(await flow.locator('form .activity-flow-audience').count(), Number(JOURNEY_SUBMISSION_AUDIENCE_ENABLED));
        assert.equal(await flow.locator('form .activity-flow-audience .activity-flow-help').count(), 0, 'Audience details do not appear in the evidence form');
        assert.equal(await flow.locator('form .activity-flow-reference').count(), 1, 'Evidence reference is still available');
        const height = (await flow.boundingBox()).height; assert.ok(height < 1350, `Compact default flow height: ${height}`);
        await steps.nth(0).click();
        const trigger = page.locator(methodSelectors.localContacts);
        await trigger.click(); await page.locator('.journey-local-idea-status').waitFor();
        assert.equal(await page.locator('.community-panel').count(), 0, 'Direct action never opens another section');
        assert.equal(transport.ideaWrites.length, account ? 1 : 0, 'One synthetic transport call, no anonymous sends');
        assert.equal(await trigger.getAttribute('aria-pressed'), task.name === 'account-local-idea' ? 'true' : 'false');
        assert.equal(await trigger.isDisabled(), task.name === 'account-local-idea');
        if (process.env.ACTIVITY_QA_SCREENSHOTS) { await steps.nth(1).click(); await flow.scrollIntoViewIfNeeded(); await page.screenshot({ path: resolve(process.env.ACTIVITY_QA_SCREENSHOTS, `compact-${task.name}-${task.width}-${task.language}.png`) }); }
        await assertPreserved(page, state, account);
        result = { directRequest: true, compactHeight: height, ideaCalls: transport.ideaWrites.length, dataPreserved: true };
      } else if (task.name === 'drafts') {
        const drafts = [];
        for (const entry of ['custom', 'ai']) {
          if (await page.locator('[data-tour="replay"]').isVisible()) {
            if (config.draftReplay === 'keyboard') { await page.locator('.profile-button').focus(); await page.keyboard.press('Enter'); }
            else await page.locator('.profile-button').click();
          }
          if (!await page.locator('.journey-panel').count()) await selectPhysicalMode(page);
          else if (await page.locator('.activity-agent-back').isVisible()) { await page.locator('.activity-agent-back').click(); await page.locator('.journey-fixed-actions').waitFor(); }
          if (!await page.locator(methodSelectors[entry]).isVisible()) await page.locator('.journey-step-arrow--next').click();
          await page.locator(methodSelectors[entry]).click();
          const text = `Unsaved ${entry} draft · العربية · QA only. Never replace this with saved text.`;
          await page.locator('#activity-prompt').fill(text);
          if (entry === 'ai') { await page.locator('.mode-ai-ask').click(); await eventually(async () => await page.locator('.mode-ai-proposal-text').textContent() === PROPOSAL, 'Synthetic AI response not rendered'); }
          assert.equal(await page.locator('#activity-prompt').inputValue(), text);
          assert.equal(await page.locator('.journey-panel .journey-replay').count(), 0, 'Tutorial is started from the home menu, not the editor');
          await page.locator('.journey-panel .close-journey').click();
          const beforeAi = transport.aiCalls;
          await openReplay(page, config.timeout, config.draftReplay === 'keyboard'); await walkTour(page, configuration, { sharePreview: false });
          assert.equal(transport.aiCalls, beforeAi, 'Tour does not call AI'); await assertPreserved(page, state); drafts.push(entry);
        }
        result = { drafts, replayEntry: config.draftReplay, syntheticAiResponses: transport.aiCalls, paidAiRequests: 0, preserved: true };
      }
    }
    assert.deepEqual(errors, [], 'No uncaught browser errors'); assert.deepEqual(transport.violations, [], 'No unexpected API mutation/external request');
    if (task.name !== 'drafts' && !modeEditorial) assert.equal(transport.aiCalls, 0);
    if (account) { sameProtected(transport.snapshot().state, state, uploads); assert.ok(transport.reads.includes('/auth/me') && transport.reads.includes('/state')); }
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
  assert.equal(STOPS.length, 28 + Number(JOURNEY_REACTIONS_ENABLED) + Number(JOURNEY_SUBMISSION_AUDIENCE_ENABLED));
  assert.equal(new Set(STOPS).size, STOPS.length); assert.equal(STOPS.includes('audience'), JOURNEY_SUBMISSION_AUDIENCE_ENABLED);
  assert.deepEqual(cleanHomeVisionCards({ fisico: true, emocional: false, unknown: true, social: 'true', ludico:'stock' }), { fisico: true, ludico:'stock' });
  assert.deepEqual(cleanHomeVisionCards({ fisico: true, social: 'electric', unknown: 'electric', ludico:'stock' }), { fisico:true, social:'electric', ludico:'stock' });
  assert.equal(homeModePhoto('fisico', PNG, { fisico:'electric' }), '/mode-symbols/fisico-electrico.svg');
  assert.equal(homeModePhoto('visionario', PNG, { visionario:'electric' }), '/mode-symbols/fisico.webp');
  assert.equal(homeModePhoto('emocional', PNG, { emocional:'electric' }), '/mode-symbols/emocional-electrico.svg?v=3');
  assert.equal(homeModePhoto('intelectual', PNG, { intelectual:'electric' }), '/mode-symbols/intelectual-electrico.svg');
  assert.equal(homeModePhoto('espiritual', PNG, { espiritual:'electric' }), '/mode-symbols/espiritual-electrico.svg');
  assert.equal(homeModePhoto('profesional', PNG, { profesional:'electric' }), '/mode-symbols/profesional-electrico.svg');
  assert.equal(homeModePhoto('ludico', PNG, { ludico:'electric' }), '/mode-symbols/ludico-electrico.svg?v=2');
  assert.equal(homeModePhoto('fisico', PNG, { fisico: true }), PNG);
  assert.equal(homeModePhoto('fisico', undefined, { fisico: true }), '');
  assert.equal(homeModePhoto('fisico', PNG, {}), '/mode-symbols/fisico-electrico.svg');
  assert.equal(homeModePhoto('fisico', PNG, { fisico:'stock' }), '/mode-photos/fisico.jpg');
  assert.equal(options(['--smoke']).languages[0], 'en');
  for (const url of ['https://example.com', 'http://127.0.0.1:4173/?token=x', 'http://user:secret@localhost:4173']) assert.throws(() => options([`--url=${url}`]));
  for (const language of LANGUAGES) {
    assert.equal(interfaceCopy[language].filter(Boolean).length, 10);
    assert.equal(homeGreetingPhrases[language].filter(Boolean).length, 10);
    if (language !== 'es') for (let index = 0; index < 20; index++) assert.notEqual(homeQuoteText(language, index, '<untranslated>'), '<untranslated>');
    assert.equal(welcomeMessages[language].messages.length, 7); assert.ok(stateAccountCopy(language).cloudOnly);
    assert.ok(onboardingIntegrationCopy(language).share); for (const stop of STOPS.filter(stop => !stop.startsWith('control'))) assert.ok(guidedTourStepCopy(language, stop).title);
    assert.equal(homeVisionCopy(language).filter(Boolean).length, 6);
    assert.equal(homeVisionCopy(language)[2], language === 'es' ? 'Galería de imágenes' : language === 'en' ? 'Stock Images' : homeVisionCopy(language)[2]);
    if (language === 'es') assert.ok(homeVisionCopy(language)[1].includes('distinto para cada modo'));
    if (language === 'en') assert.ok(homeVisionCopy(language)[1].includes('different one for each mode'));
    if (language !== 'es') {
      assert.deepEqual(Object.keys(triviaModeQuestions[language]).sort(), [...MODES].sort());
      assert.equal(new Set(Object.values(triviaModeQuestions[language])).size, MODES.length);
    }
    if (language !== 'es' && language !== 'en') {
      assert.deepEqual(Object.keys(journeyModeTranslations[language]).sort(), [...MODES].sort());
      assert.equal(new Set(Object.values(journeyModeTranslations[language])).size, MODES.length);
    }
    for (const id of specialistProfileIds) {
      const copy = specialistProfileCopy(language, id);
      assert.equal(Object.values(copy).filter(text => text?.trim()).length, 4, `Missing copy for ${language}/${id}`);
      if (language !== 'es') assert.notEqual(copy.trajectory, specialistProfileCopy('es', id).trajectory);
    }
    const exampleTopics = MODES.map(mode => specialistExampleCopy(language, mode, mode).specialty);
    assert.ok(exampleTopics.every(Boolean));
    assert.equal(new Set(exampleTopics).size, MODES.length);
    for (const [index, plan] of planKeys.entries()) {
      const details = planDetailsForLocale(language, plan);
      assert.match(details.price, /MXN/u);
      assert.equal(details.features.length, [12, 10, 13][index]);
      assert.ok(details.features.every(text => text?.trim()));
      assert.equal(new Set(details.features).size, details.features.length);
      assert.ok(planAccessCopy(language).contextualDescription('feature-fixture', details.name).includes(details.name));
      if (language !== 'es') assert.notEqual(details.features[0], planDetailsForLocale('es', plan).features[0]);
    }
    const document = fixture(language); assert.equal(Object.keys(document.levels).length, 12); sameProtected(clone(document), document);
  }
  emit({ selfTest: 'PASS', languages: 11, widths: WIDTHS, tourStops: STOPS.length, cases: CASES, safety: 'loopback preview only; all API requests intercepted; no dependencies installed' });
}
async function main() {
  const config = options(process.argv.slice(2));
  if (config.help) { process.stdout.write('Actual-App synthetic QA. --url=loopback --languages=en,ar --widths=320,390,870,1440 --cases=welcome,legacy-welcome,account-welcome,legacy-account-welcome,account-completed,tour,identity,drafts --replays=2 --workers=2 --smoke --self-test\nDiagnostic-only subsets: --share-preview=off --draft-replay=keyboard --method-regressions=off. These omissions/entry paths are reported explicitly; default checks remain strict.\n'); return; }
  selfTest(); if (config['self-test']) return;
  let playwright;
  try { playwright = require(process.env.PLAYWRIGHT_MODULE ?? 'playwright'); }
  catch { playwright = require(resolve(dirname(process.execPath), '..', 'node_modules', 'playwright')); }
  const tasks = [];
  for (const name of config.cases) {
    if (name.endsWith('welcome') || name.endsWith('tour') || name.includes('local-') || ['account-journey-ascent', 'mode-editorial', 'global-editorial', 'specialist-editorial', 'install-guide', 'premium-access-fixture', 'management-surfaces', 'account-community-surfaces', 'anonymous-public-surface'].includes(name)) for (const width of config.widths) for (const language of config.languages) tasks.push({ name, width, language });
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
