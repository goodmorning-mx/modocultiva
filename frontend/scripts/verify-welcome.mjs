import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createHash } from 'node:crypto';

async function loadPure(name) {
  const source = await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
const messages = await loadPure('welcomeMessages');
const state = await loadPure('welcomeIntroState');
const {
  createWelcomeTimeline, reduceWelcomeTimeline: reduce, welcomeNextDelayMs, welcomeReadDurationMs,
  welcomeIntroStorageKey: key, readWelcomeIntroCompletion: read, markWelcomeIntroComplete: complete,
  decideWelcomeIntro: decide, parseWelcomeIntroCompletion: parse,
} = state;
const languages = ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'];
const preference = await loadPure('languagePreference');
assert.deepEqual(preference.APP_LANGUAGES, languages);
for (const language of languages) {
  assert.equal(preference.browserLanguage([`${language.toUpperCase()}_REGION`, 'en-US']), language);
  for (const saved of languages) {
    for (const source of [undefined, null, 'auto', 'stale']) assert.deepEqual(preference.resolveLanguagePreference(saved, source, language), { language, languageSource: 'auto' });
    assert.deepEqual(preference.resolveLanguagePreference(saved, 'manual', language), { language: saved, languageSource: 'manual' });
  }
  assert.deepEqual(preference.resolveLanguagePreference('unsupported', 'manual', language), { language, languageSource: 'auto' });
}
assert.equal(preference.browserLanguage(['xx-ZZ', 'pt-BR'], 'en-US'), 'pt');
assert.equal(preference.browserLanguage([], 'zh-Hans-CN'), 'zh');
assert.equal(preference.browserLanguage(['unknown']), 'es');
for (const language of languages) {
  const record = JSON.stringify({version:1,source:'manual',language});
  assert.equal(preference.readManualLanguage(record), language);
  assert.deepEqual(preference.restoreLanguagePreference('en', 'auto', 'es', record), {language,languageSource:'manual'});
}
for (const raw of [null,'{}','broken','{"version":0,"source":"manual","language":"fr"}','{"version":1,"source":"manual","language":"unsupported"}']) assert.equal(preference.readManualLanguage(raw), null);
assert.deepEqual(preference.normalizeLanguageState({language:'en'}, 'es'), {language:'es',languageSource:'auto'});
assert.deepEqual(messages.WELCOME_LANGUAGES, languages);
assert.deepEqual(Object.keys(messages.welcomeMessages), languages);
assert.deepEqual(messages.getWelcomeMessages('es').messages, [
  '¿En qué modo estás operando ahora?',
  '¿Tu vida se reduce al trabajo, la familia y los amigos?',
  'Para tener una vida plena, recomendamos tener un plan de inicio a fin para las 12 áreas de tu vida.',
  'Define tu estructura y conviértela en estrategias concretas.',
  'Recuperando así la claridad y una presencia consciente.',
  'Cultiva cada uno de tus modos de vida.',
  'Entra en Modo Cultiva.',
]);
assert.equal(messages.resolveWelcomeLanguage(' EN_us '), 'en');
assert.equal(messages.resolveWelcomeLanguage('zh-Hans'), 'zh');
assert.equal(messages.resolveWelcomeLanguage('unknown'), 'es');
for (const language of languages) {
  const copy = messages.getWelcomeMessages(language);
  assert.equal(copy.messages.length, 7);
  for (const phrase of [...copy.messages, copy.title, copy.pause, copy.resume, copy.automatic, copy.paused]) assert.ok(phrase.trim());
  assert.ok(welcomeReadDurationMs(copy.messages[2]) > welcomeReadDurationMs(copy.messages[6]), `${language}: long text gets more time`);
  for (const reducedMotion of [false, true]) {
    let timeline = createWelcomeTimeline(Object.freeze([...copy.messages]), 0, { reducedMotion });
    let time = 0;
    const seen = [];
    while (timeline.phase !== 'complete') {
      if (timeline.phase === 'read') seen.push(timeline.index);
      const delay = welcomeNextDelayMs(timeline);
      assert.ok(delay > 0);
      time += delay;
      Object.freeze(timeline);
      timeline = reduce(timeline, { type: 'tick', nowMs: time });
    }
    assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6]);
    assert.equal(welcomeNextDelayMs(timeline), null);
    for (const event of [{ type: 'tick' }, { type: 'pause', paused: false }, { type: 'language', messages: copy.messages }]) {
      assert.equal(reduce(timeline, { ...event, nowMs: time + 100000 }), timeline, 'completion is terminal');
    }
  }
}
assert.equal(welcomeReadDurationMs(''), state.WELCOME_MIN_READ_MS);
assert.equal(welcomeReadDurationMs('x'.repeat(10000)), state.WELCOME_MAX_READ_MS);
const copy = messages.getWelcomeMessages('es').messages;
assert.throws(() => createWelcomeTimeline([], 0), RangeError);
assert.equal(createWelcomeTimeline(copy, NaN).sampledAtMs, 0);

// Hidden/user-paused time cannot consume any entry, reading or exit duration.
for (const phase of ['enter', 'read', 'exit']) {
  let timeline = createWelcomeTimeline(copy, 0);
  let time = 0;
  while (timeline.phase !== phase) {
    time += timeline.remainingMs;
    timeline = reduce(timeline, { type: 'tick', nowMs: time });
  }
  time += timeline.remainingMs / 2;
  timeline = reduce(timeline, { type: 'visibility', hidden: true, nowMs: time });
  const remaining = timeline.remainingMs;
  assert.equal(welcomeNextDelayMs(timeline), null);
  timeline = reduce(timeline, { type: 'tick', nowMs: time + 3600000 });
  assert.equal(timeline.phase, phase);
  assert.equal(timeline.remainingMs, remaining);
  timeline = reduce(timeline, { type: 'pause', paused: true, nowMs: time + 3600000 });
  timeline = reduce(timeline, { type: 'visibility', hidden: false, nowMs: time + 7200000 });
  assert.equal(welcomeNextDelayMs(timeline), null, 'showing the tab does not clear a manual pause');
  timeline = reduce(timeline, { type: 'pause', paused: false, nowMs: time + 7200000 });
  assert.equal(welcomeNextDelayMs(timeline), remaining);
  timeline = reduce(timeline, { type: 'tick', nowMs: time + 7200000 + remaining });
  assert.notEqual(timeline.phase, phase);
}
let timeline = createWelcomeTimeline(copy, 0, { hidden: true });
timeline = reduce(timeline, { type: 'tick', nowMs: 999999 });
assert.equal(timeline.phase, 'enter');
assert.equal(timeline.remainingMs, state.WELCOME_ENTER_MS);
timeline = reduce(timeline, { type: 'visibility', hidden: false, nowMs: 999999 });
timeline = reduce(timeline, { type: 'tick', nowMs: 999999999 });
assert.equal(timeline.phase, 'read', 'a late timer never skips unread phrases');
assert.equal(timeline.index, 0);
assert.equal(timeline.remainingMs, welcomeReadDurationMs(copy[0]));
assert.equal(reduce(timeline, { type: 'tick', nowMs: -100 }).remainingMs, timeline.remainingMs);
assert.equal(reduce(timeline, { type: 'tick', nowMs: Infinity }).remainingMs, timeline.remainingMs);
const old = timeline;
timeline = reduce(timeline, { type: 'language', messages: messages.getWelcomeMessages('ar').messages, nowMs: old.sampledAtMs });
assert.equal(timeline.index, old.index);
assert.equal(timeline.phase, 'enter');
assert.throws(() => reduce(timeline, { type: 'language', messages: [], nowMs: 0 }), RangeError);
timeline = reduce(timeline, { type: 'motion', reducedMotion: true, nowMs: timeline.sampledAtMs });
assert.equal(timeline.remainingMs, state.WELCOME_REDUCED_TRANSITION_MS);
assert.equal(timeline.index, old.index);

const guest = { kind: 'guest', visitorId: 'synthetic-guest' };
const account = { kind: 'account', organizationId: 'synthetic-org', accountId: 'synthetic-person' };
const readyPerson = (scope) => ({ status: 'ready', scope });
for (const completion of ['complete', 'incomplete', 'unavailable']) {
  assert.equal(decide({ status: 'pending' }, completion), 'wait');
  assert.equal(decide({ status: 'unavailable' }, completion), 'wait');
  for (const scope of [guest, account]) {
    assert.equal(decide(readyPerson(scope), completion), completion === 'complete' ? 'skip' : 'show', 'Only actual welcome completion skips the introduction, never existing map data');
  }
}
assert.notEqual(key(guest), key(account));
assert.notEqual(key(account), key({ ...account, organizationId: 'another-org' }));
assert.notEqual(key({ ...account, accountId: 'a:b', organizationId: 'c' }), key({ ...account, accountId: 'b', organizationId: 'c:a' }));
for (const visitorId of ['', ' ', '\ud800']) {
  const invalid = { kind: 'guest', visitorId };
  assert.equal(key(invalid), null);
  assert.equal(decide(readyPerson(invalid), 'incomplete'), 'wait');
}
for (const raw of [null, '', 'not json', 'true', '1', '[]', '{}', '{"version":2,"completed":true}', '{"version":1,"completed":"true"}']) assert.equal(parse(raw), 'incomplete');
assert.equal(parse('{"version":1,"completed":true}'), 'complete');
const throwsStorage = { getItem() { throw Error('denied'); }, setItem() { throw Error('quota'); } };
for (const storage of [null, undefined, throwsStorage]) {
  assert.equal(read(storage, guest), 'unavailable');
  assert.equal(complete(storage, guest), false);
}
assert.equal(read({ get getItem() { throw Error('getter'); } }, guest), 'unavailable');
assert.equal(complete({ get setItem() { throw Error('getter'); } }, guest), false);

// A full historical account remains byte-for-byte unchanged, including all modes.
const historical = JSON.stringify({
  levels: Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`mode-${i}`, i % 10])),
  presets: [{ name: 'My saved map', levels: Array(12).fill(4) }], selectedPreset: 'My saved map',
  activityDrafts: { 'mode-0': 'Keep my draft' }, activityCompletions: { old: true },
  images: { 'mode-11': 'existing-image' }, language: 'da', account: 'synthetic-only',
  unknownFutureField: { keep: true },
});
const entries = new Map([['existing-person-state', historical], ['existing-guest-state', historical]]);
const storage = { getItem: (name) => entries.get(name) ?? null, setItem: (name, value) => entries.set(name, value) };
const before = new Map(entries);
assert.equal(read(storage, account), 'incomplete');
assert.equal(decide(readyPerson(account), read(storage, account)), 'show', 'Existing historical state without a completed welcome still gets its first introduction');
assert.deepEqual(entries, before, 'eligibility is read-only');
assert.equal(complete(storage, guest), true);
assert.equal(complete(storage, guest), true);
assert.equal(read(storage, guest), 'complete');
assert.equal(read(storage, account), 'incomplete', 'guest completion cannot mark an account');
assert.equal(complete(storage, account), true);
assert.equal(read(storage, { ...account, accountId: 'another-person' }), 'incomplete');
for (const [name, value] of before) assert.equal(entries.get(name), value);
assert.equal(entries.size, before.size + 2, 'only the two scoped flags were written');

const component = await readFile(new URL('../src/WelcomeIntro.tsx', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const welcomeEligibility = app.slice(app.indexOf('if (publicCardId) return; // Shared cards'), app.indexOf('const navigationHistoryRef'));
assert.ok(welcomeEligibility.includes('decideWelcomeIntro'));
assert.doesNotMatch(welcomeEligibility, /hasLegacyDeviceConfiguration|savedPerson|established/, 'Legacy configuration must not suppress a first welcome');
assert.match(welcomeEligibility, /!stateHydrated \|\| !verifiedIdentity/);
const css = await readFile(new URL('../src/welcome-intro.css', import.meta.url), 'utf8');
assert.match(component, /completionSentRef\.current = true/);
assert.match(component, /clearTimeout\(timeout\)/);
assert.match(component, /removeEventListener\('visibilitychange'/);
assert.match(component, /removeEventListener\('focusin'/);
assert.match(component, /element\.inert = inert/);
assert.doesNotMatch(component, /localStorage|sessionStorage|fetch\(|onSkip|onNext|1\s*\/\s*7/);
assert.match(component, /className="mc-welcome__brand"[^\n]+<img src=\{brandLogo\}/);
assert.match(component.slice(component.indexOf('export function WelcomeIntroMark'), component.indexOf('const now')), /<CultivaLeaf \/>/);
const logoBytes = await readFile(new URL('../src/assets/modo-cultiva-logo-official.png', import.meta.url));
assert.equal(createHash('sha256').update(logoBytes).digest('hex'), '74b3793b31bd1de21cf688e5d5e4ff2a6bc1163e44a7e1457ccc8ae2b1ee54d0', 'Use the supplied official logo unmodified');
assert.match(css, /prefers-reduced-motion: reduce/);
assert.doesNotMatch(css, /(?:^|\n)(?:body|:root|\.overview-mode)\s*\{/);
console.log('[welcome] exact Spanish; 77 messages; 11 locales; normal/reduced timing; hidden/pause/language/late timers; terminal completion; scoped flags/storage failures; existing 12 modes/presets/drafts/images unchanged: passed');

// Optional isolated browser fixture. No App, auth, backend, storage, or on-disk fixture.
if (process.argv.includes('--serve')) {
  const { createServer } = await import('vite');
  const fixture = `
    import React, { StrictMode, useEffect, useState } from 'react';
    import { createRoot } from 'react-dom/client';
    import { WelcomeIntro } from '/src/WelcomeIntro.tsx';
    function Fixture() {
      const [active, setActive] = useState(false);
      const [completed, setCompleted] = useState(0);
      useEffect(() => { document.getElementById('restore-focus')?.focus(); setActive(true); }, []);
      return <><button id="restore-focus" onClick={() => setActive(true)}>Open isolated welcome</button>
        <output id="fixture-result" data-completions={completed}>Completed callbacks: {completed}</output>
        {active && <WelcomeIntro language={new URLSearchParams(location.search).get('language') || 'es'} onComplete={() => { setCompleted(n => n + 1); setActive(false); }} />}
      </>;
    }
    createRoot(document.getElementById('fixture')).render(<StrictMode><Fixture /></StrictMode>);
  `;
  const server = await createServer({
    root: fileURLToPath(new URL('..', import.meta.url)), configFile: false,
    esbuild: { jsx: 'automatic' },
    server: { host: '127.0.0.1', port: 5199, strictPort: true },
    plugins: [{
      name: 'isolated-welcome-fixture',
      resolveId(id) { if (id === '/__welcome-fixture.tsx') return '\0welcome-fixture.tsx'; },
      load(id) {
        if (id === '\0welcome-fixture.tsx') return ts.transpileModule(fixture, {
          compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 },
        }).outputText;
      },
      configureServer(vite) {
        vite.middlewares.use(async (request, response, next) => {
          if (request.url?.split('?')[0] !== '/__welcome-fixture') return next();
          try {
            const html = await vite.transformIndexHtml('/__welcome-fixture', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated Modo Cultiva welcome</title><link rel="stylesheet" href="/src/styles.css"></head><body><div id="fixture"></div><script type="module" src="/__welcome-fixture.tsx"></script></body></html>');
            response.setHeader('Content-Type', 'text/html; charset=utf-8');
            response.end(html);
          } catch (error) { next(error); }
        });
      },
    }],
  });
  await server.listen();
  console.log('[welcome fixture] http://127.0.0.1:5199/__welcome-fixture?language=es (StrictMode; no App/accounts/storage). Stop with Ctrl+C.');
}
