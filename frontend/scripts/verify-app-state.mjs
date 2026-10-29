import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const options = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX };
const compile = source => ts.transpileModule(source, { compilerOptions: options }).outputText;
const loaded = new Map();
async function pure(name) {
  if (loaded.has(name)) return loaded.get(name);
  let code = compile(await readFile(new URL(`../src/${name}.ts`, import.meta.url), 'utf8'));
  for (const match of [...code.matchAll(/from ['"]\.\/([^'"]+)['"]/g)]) code = code.replace(match[0], `from '${(await pure(match[1])).url}'`);
  const url = `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
  const result = { url, module: await import(url) }; loaded.set(name, result); return result;
}
const recovery = (await pure('stateRecovery')).module;
const { createStateSyncQueue } = (await pure('stateSyncQueue')).module;
const { reconcileState, cloneStateValue: clone } = (await pure('stateReconcile')).module;
const { stateAccountCopy, stateAccountMessageValues } = (await pure('stateAccountMessages')).module;
const { resolveLanguagePreference, normalizeLanguageState } = (await pure('languagePreference')).module;
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ast = ts.createSourceFile('App.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
function expression(name) {
  let found;
  function visit(node) {
    if (ts.isVariableDeclaration(node) && node.name.getText(ast) === name) found = node.initializer.getText(ast);
    if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node.getText(ast);
    ts.forEachChild(node, visit);
  }
  visit(ast); assert.ok(found, `Actual App helper ${name}`); return found;
}
const actual = (name, bindings) => new Function(...Object.keys(bindings), compile(`return (${expression(name)});`))(...Object.values(bindings));
const tick = () => new Promise(resolve => setImmediate(resolve));
const modes = actual('modes', {});
const levels = Object.fromEntries(modes.map((mode, index) => [mode.key, index % 10])); levels.fisico = 3;
const state = { profileName: 'Synthetic', levels, presets: { Saved: clone(levels) }, selectedPreset: 'Saved', activityDrafts: { 'fisico-3': 'Original activity' }, activityCompletions: { historical: 'canonical-only' }, visionImages: { fisico: 'synthetic-image' }, language: 'da', futureField: { keep: true } };
const snapshot = (value, revision) => ({ state: clone(value), revision, validationReceipts: { server: true }, legacyCompletionSlots: ['fisico-1'] });
const initial = snapshot(state, 'A');
const scopeA = { organizationId: 'synthetic-org', accountId: 'synthetic-A' }, scopeB = { ...scopeA, accountId: 'synthetic-B' };
const entries = new Map();
const storage = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
const failedStorage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('full'); }, removeItem() { throw Error('blocked'); } };

// Actual App language handler/canonical ingress + queue, not a copied reducer.
function preferenceFixture(preference, browser) {
  const ui = { ...clone(state), ...preference }, ref = { current: clone(ui) };
  const normalizeLanguageDocument = value => normalizeLanguageState(value, browser);
  const normalize = actual('normalizeCanonicalSnapshot', { normalizeLanguageDocument });
  const bindings = { persistedDocumentRef: ref, reconcileState, normalizeLanguageDocument, resolveLanguagePreference, detectBrowserLanguage: () => browser, cleanCompletions: value => value ?? {}, retainPendingState() {} };
  for (const setter of new Set(expression('reconcileCanonicalState').match(/\bset[A-Z]\w*/g))) {
    const key = setter[3].toLowerCase() + setter.slice(4);
    bindings[setter] = value => { ui[key] = typeof value === 'function' ? value(ui[key]) : value; };
  }
  const q = createStateSyncQueue({ initial: normalize(snapshot(ui, 'pref-initial')), transport: async document => normalize(snapshot(document, 'pref-saved')), onReconcile: actual('reconcileCanonicalState', bindings) });
  const choose = actual('handleLanguageChange', { ...bindings, personalStorageRef: { current: { setItem() {} } }, stateQueueRef: { current: q } });
  const assertPreference = expected => {
    for (const value of [ui, ref.current, q.getDesired()]) assert.deepEqual({ language: value.language, languageSource: value.languageSource }, expected);
    assert.deepEqual(ref.current.levels, state.levels); assert.deepEqual(q.getDesired().presets, state.presets);
  };
  return { ui, ref, q, normalize, choose, assertPreference };
}
{
  const f = preferenceFixture({ language: 'es', languageSource: 'manual' }, 'en');
  f.choose('fr');
  const legacy = { ...clone(state), language: 'es' }; // No languageSource in an old response.
  f.q.refresh(f.normalize(snapshot(legacy, 'legacy-response')));
  f.assertPreference({ language: 'fr', languageSource: 'manual' });
  await f.q.flush(); f.assertPreference({ language: 'fr', languageSource: 'manual' }); f.q.dispose();
}
{
  const f = preferenceFixture({ language: 'fr', languageSource: 'auto' }, 'fr');
  f.q.refresh(f.normalize(snapshot({ ...clone(state), language: 'en', languageSource: 'auto' }, 'automatic-response')));
  f.assertPreference({ language: 'fr', languageSource: 'auto' });
  const previousUi = clone(f.ui);
  f.q.refresh(f.normalize(snapshot({ ...clone(state), language: 'de', languageSource: 'manual' }, 'manual-response')));
  f.assertPreference({ language: 'de', languageSource: 'manual' });
  f.q.stage(current => recovery.stageCommittedUi(previousUi, f.ui, current));
  f.assertPreference({ language: 'de', languageSource: 'manual' }); f.q.dispose();
}

// Synchronous canonical reconciliation + committed UI deltas close 4 -> 3 regression.
{
  const ref = { current: clone(state) }, statuses = [], sent = [];
  const bindings = { persistedDocumentRef: ref, reconcileState, normalizeLanguageDocument: state => normalizeLanguageState(state, 'es'), resolveLanguagePreference, detectBrowserLanguage: () => 'es', cleanCompletions: value => value ?? {}, retainPendingState() {} };
  for (const name of new Set(expression('reconcileCanonicalState').match(/\bset[A-Z]\w*/g))) bindings[name] = () => {}; // React updates remain uncommitted.
  const reconcile = actual('reconcileCanonicalState', bindings);
  const q = createStateSyncQueue({ initial, transport: async document => { sent.push(clone(document)); return snapshot(document, 'C'); }, onReconcile: reconcile });
  const advanced = clone(state); advanced.levels.fisico = 4;
  q.refresh(snapshot(advanced, 'B'));
  assert.equal(ref.current.levels.fisico, 4);
  const rendered = { ...clone(state), profileName: 'New profile, stale rendered level' };
  ref.current = recovery.stageCommittedUi(state, rendered, ref.current);
  q.stage(current => recovery.stageCommittedUi(state, rendered, current));
  const flush = actual('flushPersonalState', { authTokens: { access_token: 'fixture-A' }, stateQueueRef: { current: q }, stateHydrated: true, sessionIsCurrent: () => true, persistedDocumentRef: ref, retainPendingState() {}, stateAccountCopy, language: 'es', setStateSyncStatus: value => statuses.push(value) });
  await flush();
  assert.equal(sent[0].levels.fisico, 4);
  assert.equal(sent[0].profileName, rendered.profileName);
  assert.deepEqual(sent[0].presets, state.presets);
  assert.deepEqual(sent[0].futureField, state.futureField);
  assert.equal(recovery.stageCommittedUi(state, { ...clone(state), levels: { ...levels, fisico: 2 } }, advanced).levels.fisico, 2);
}
// Run the actual functional setters against React edits newer than the sent
// payload; the synchronous canonical document and server-only metadata agree.
{
  const ui = { ...clone(state), profileName: 'New React name', levels: { ...levels, fisico: 2 }, activityDrafts: {}, presets: { ...state.presets, New: clone(levels) } };
  const ref = { current: clone(ui) }, metadata = {};
  const bindings = { persistedDocumentRef: ref, reconcileState, normalizeLanguageDocument: state => normalizeLanguageState(state, 'es'), resolveLanguagePreference, detectBrowserLanguage: () => 'es', cleanCompletions: value => value ?? {}, retainPendingState() {} };
  for (const setter of new Set(expression('reconcileCanonicalState').match(/\bset[A-Z]\w*/g))) {
    const key = setter[3].toLowerCase() + setter.slice(4);
    bindings[setter] = value => {
      if (['validationReceipts', 'legacyCompletionSlots'].includes(key)) metadata[key] = value;
      else ui[key] = typeof value === 'function' ? value(ui[key]) : value;
    };
  }
  const server = { ...clone(state), levels: { ...levels, fisico: 4, intelectual: 7 }, activityCompletions: { canonical: 'receipt-only' }, futureField: { keep: true, added: true } };
  const envelope = snapshot(server, 'functional-ack');
  actual('reconcileCanonicalState', bindings)(state, server, envelope);
  assert.equal(ui.profileName, 'New React name'); assert.equal(ui.levels.fisico, 2); assert.equal(ui.levels.intelectual, 7);
  assert.deepEqual(ui.activityDrafts, {}); assert.ok('New' in ui.presets);
  assert.deepEqual(ui.activityCompletions, server.activityCompletions);
  assert.deepEqual(metadata.validationReceipts, envelope.validationReceipts);
  assert.deepEqual(metadata.legacyCompletionSlots, envelope.legacyCompletionSlots);
  assert.deepEqual(ref.current.futureField, server.futureField);
  assert.deepEqual(ref.current.levels, ui.levels);
}
// Actual flush drains newer live dirty intent and never updates an obsolete session.
{
  let q, extra = false, current = true;
  const ref = { current: { ...clone(state), profileName: 'Sent' } }, statuses = [];
  q = createStateSyncQueue({ initial, transport: async document => snapshot(document, `saved-${document.profileName}`), onReconcile() {
    if (!extra) { extra = true; queueMicrotask(() => { ref.current = { ...ref.current, profileName: 'Newer' }; q.stage(ref.current); }); }
  } });
  const flush = actual('flushPersonalState', { authTokens: { access_token: 'A' }, stateQueueRef: { current: q }, stateHydrated: true, sessionIsCurrent: () => current, persistedDocumentRef: ref, retainPendingState() {}, stateAccountCopy, language: 'en', setStateSyncStatus: value => statuses.push(value) });
  await flush(); assert.equal(q.isDirty(), false); assert.equal(q.getSnapshot().state.profileName, 'Newer');
  const pending = q.flush(); current = false; await pending;
  await assert.rejects(flush, /Wait for your account/);
}
{
  let finish, active = true;
  const statuses = [], q = createStateSyncQueue({ initial, transport: () => new Promise(resolve => { finish = resolve; }) });
  const flush = actual('flushPersonalState', { authTokens: { access_token: 'A' }, stateQueueRef: { current: q }, stateHydrated: true, sessionIsCurrent: () => active, persistedDocumentRef: { current: { ...state, profileName: 'Pending' } }, retainPendingState() {}, stateAccountCopy, language: 'en', setStateSyncStatus: value => statuses.push(value) });
  const saving = flush(); await tick(); active = false; q.dispose();
  await assert.rejects(saving, { name: 'AbortError' });
  assert.deepEqual(statuses, []); finish(snapshot(state, 'late'));
}

// Account-scoped pending intent rebases onto fresh canonical hydration.
const desired = { ...clone(state), profileName: 'Offline name', activityDrafts: {} };
const record = recovery.pendingAccountRecord(scopeA, initial, desired);
assert.ok(recovery.writeStoredJson(storage, recovery.accountRecoveryKey(scopeA), record));
const remote = clone(state); remote.levels.fisico = 4; remote.activityCompletions = { approved: 'three-real-members' };
const recovered = recovery.recoverAccountState(recovery.readPendingAccount(storage, scopeA), snapshot(remote, 'B'));
assert.equal(recovered.profileName, 'Offline name'); assert.equal(recovered.levels.fisico, 4);
assert.deepEqual(recovered.activityDrafts, {}); assert.deepEqual(recovered.activityCompletions, remote.activityCompletions);
assert.deepEqual(recovered.presets, state.presets); assert.deepEqual(recovered.futureField, state.futureField);
assert.equal(Object.keys(recovered.levels).length, 12); assert.equal(recovered.visionImages.fisico, 'synthetic-image');
assert.equal(recovered.language, 'da');
assert.equal(recovery.readPendingAccount(storage, scopeB), null);
entries.set(recovery.accountRecoveryKey(scopeB), JSON.stringify(record));
assert.equal(recovery.readPendingAccount(storage, scopeB), null, 'scope inside the record must match too');
assert.equal(recovery.readPendingAccount(failedStorage, scopeA), null);
assert.equal(recovery.writeStoredJson(failedStorage, recovery.accountRecoveryKey(scopeA), record), false);
assert.equal(recovery.recoverAccountState(recovery.pendingAccountRecord(scopeA, initial, { ...desired, levels: { ...levels, fisico: 2 } }), snapshot(remote, 'B')).levels.fisico, 2);

// Immutable original archive, per-account consent, no local completion credit.
entries.set('modoCultiva_activityDrafts', JSON.stringify(state.activityDrafts));
const archive = recovery.captureLegacyArchive(storage, state);
recovery.captureLegacyArchive(storage, { profileName: 'Other account must not replace the archive' });
assert.deepEqual(recovery.captureLegacyArchive(storage, {}), archive);
assert.equal(entries.get('modoCultiva_activityDrafts'), JSON.stringify(state.activityDrafts));
assert.equal(recovery.hasLegacyConsent(storage, scopeA), false);
recovery.writeStoredJson(storage, recovery.legacyConsentKey(scopeA), { version: 1, choice: 'cloud-only' });
assert.equal(recovery.hasLegacyConsent(storage, scopeA), true); assert.equal(recovery.hasLegacyConsent(storage, scopeB), false);
const importing = recovery.legacyImportDocument({ ...archive, validationReceipts: { fake: true }, legacyCompletionSlots: ['fake'], communityApprovals: { fake: true } });
for (const key of ['activityCompletions', 'validationReceipts', 'legacyCompletionSlots', 'communityApprovals']) assert.ok(!(key in importing));
assert.deepEqual(archive.activityCompletions, state.activityCompletions);
assert.deepEqual(importing.levels, levels); assert.deepEqual(importing.presets, state.presets);
const cacheA = recovery.scopedPersonalStorage(storage, scopeA), cacheB = recovery.scopedPersonalStorage(storage, scopeB);
cacheA.setItem('modoCultiva_activityDrafts', 'A-only'); assert.equal(cacheB.getItem('modoCultiva_activityDrafts'), null);
assert.equal(entries.get('modoCultiva_activityDrafts'), JSON.stringify(state.activityDrafts), 'authenticated cache writes never touch original keys');
const guestCache = recovery.scopedPersonalStorage(storage, null);
assert.equal(guestCache.getItem('modoCultiva_activityDrafts'), JSON.stringify(state.activityDrafts));
guestCache.removeItem('modoCultiva_activityDrafts');
assert.equal(recovery.scopedPersonalStorage(storage, null).getItem('modoCultiva_activityDrafts'), null, 'guest deletion cannot resurrect unknown-owner legacy data on reload');
assert.equal(entries.get('modoCultiva_activityDrafts'), JSON.stringify(state.activityDrafts), 'deleting a guest value retains the original archive');
guestCache.setItem('modoCultiva_activityDrafts', 'New guest draft');
assert.equal(guestCache.getItem('modoCultiva_activityDrafts'), 'New guest draft');
cacheA.removeItem('modoCultiva_activityDrafts');
assert.equal(cacheA.getItem('modoCultiva_activityDrafts'), null);
assert.equal(cacheB.getItem('modoCultiva_activityDrafts'), null);
assert.throws(() => recovery.scopedPersonalStorage(failedStorage, null).removeItem('draft'), /full/);
assert.throws(() => recovery.scopedPersonalStorage(null, null).removeItem('draft'), /unavailable/);

// Offline A -> logout -> B -> A: pending intent never crosses identity, and a
// fresh cloud advance/history wins over unchanged legacy/recovery fields.
{
  const durable = new Map(), device = { getItem: key => durable.get(key) ?? null, setItem: (key, value) => durable.set(key, value), removeItem: key => durable.delete(key) };
  const a = createStateSyncQueue({ initial, transport: async () => { throw Error('offline'); } });
  a.stage({ ...clone(state), profileName: 'A offline', activityDrafts: {} });
  assert.equal((await a.flush()).status, 'error');
  recovery.writeStoredJson(device, recovery.accountRecoveryKey(scopeA), recovery.pendingAccountRecord(scopeA, a.getSnapshot(), a.getDesired()));
  a.dispose();
  const bRemote = snapshot({ ...clone(state), profileName: 'B cloud', levels: { ...levels, fisico: 7 }, bOnly: { retained: true } }, 'B1');
  const bState = recovery.recoverAccountState(recovery.readPendingAccount(device, scopeB), bRemote);
  assert.deepEqual(bState, bRemote.state);
  const aRemote = snapshot({ ...clone(remote), futureField: { keep: true, newServerField: true } }, 'A2');
  const sent = [];
  const resumed = createStateSyncQueue({ initial: aRemote, transport: async document => { sent.push(clone(document)); return snapshot(document, 'A3'); } });
  resumed.stage(recovery.recoverAccountState(recovery.readPendingAccount(device, scopeA), aRemote));
  assert.equal((await resumed.flush()).status, 'synced');
  assert.equal(sent[0].profileName, 'A offline'); assert.equal(sent[0].levels.fisico, 4);
  assert.deepEqual(sent[0].activityDrafts, {}); assert.deepEqual(sent[0].activityCompletions, remote.activityCompletions);
  assert.deepEqual(sent[0].futureField, aRemote.state.futureField); assert.deepEqual(sent[0].presets, state.presets);
  recovery.writeStoredJson(device, recovery.accountRecoveryKey(scopeA), recovery.pendingAccountRecord(scopeA, resumed.getSnapshot(), resumed.getDesired()));
  assert.equal(recovery.readPendingAccount(device, scopeA), null, 'acknowledged intent cannot replay on a later login');
  resumed.dispose();
}

// Actual logout either saves or retains durably, and refuses lossy offline logout.
for (const storageAvailable of [true, false]) {
  const local = storageAvailable ? storage : failedStorage;
  const q = createStateSyncQueue({ initial, transport: async () => { throw Error('offline'); } });
  q.stage(desired);
  const refs = { current: q }, activeSessionRef = { current: 'A' }, phases = [], authentication = [];
  const retain = () => recovery.writeStoredJson(local, recovery.accountRecoveryKey(scopeA), recovery.pendingAccountRecord(scopeA, q.getSnapshot(), q.getDesired()));
  const bindings = { activeSessionRef, stateQueueRef: refs, stateQueueSessionRef: { current: 'A' }, signingOut: false, accountPhase: 'loading', consentChoiceRef: { current: null }, sessionIsCurrent: token => token === activeSessionRef.current,
    persistedDocumentRef: { current: desired }, retainPendingState: retain, flushPersonalState: async () => { throw Error('offline'); }, hydrationGenerationRef: { current: 1 }, authTokens: { refresh_token: 'synthetic' }, authClient: { logout: async () => authentication.push('server-logout') },
    window: { setTimeout, clearTimeout, sessionStorage: { removeItem() {} } }, personalStorageRef: { current: cacheA }, scopedPersonalStorage: recovery.scopedPersonalStorage, deviceStateStorage: () => local, accountScopeRef: { current: scopeA }, committedDocumentRef: { current: state }, normalizePersonalDocument: value => value, applyPersonalDocument() {}, guestDocumentRef: { current: { profileName: 'Guest' } }, cloneStateValue: clone, loginSkinChoice: { current: null } };
  for (const setter of new Set(expression('logout').match(/\bset[A-Z]\w*/g))) bindings[setter] = value => { if (setter === 'setAccountPhase') phases.push(value); if (setter === 'setAuthTokens') authentication.push(value); };
  await actual('logout', bindings)();
  if (storageAvailable) { assert.equal(activeSessionRef.current, null); assert.ok(authentication.includes('server-logout')); assert.equal(recovery.readPendingAccount(storage, scopeA).desired.profileName, desired.profileName); }
  else { assert.equal(activeSessionRef.current, 'A'); assert.equal(refs.current, q); assert.deepEqual(authentication, []); assert.ok(phases.includes('logout-error')); }
}

for (const [language, values] of Object.entries(stateAccountMessageValues)) {
  assert.equal(values.length, 19, language); for (const value of values) assert.ok(value.trim(), language);
  assert.deepEqual(Object.keys(stateAccountCopy(language)), Object.keys(stateAccountCopy('es')));
}
// Execute the real boundary key handler: initial reverse-Tab, wraparound and a
// busy phase without controls all retain focus inside the persistence gate.
{
  const source = await readFile(new URL('../src/StateAccountBoundary.tsx', import.meta.url), 'utf8');
  const tree = ts.createSourceFile('Boundary.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let handlerSource;
  function visit(node) {
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === 'onKeyDown') handlerSource = node.initializer.expression.getText(tree);
    ts.forEachChild(node, visit);
  }
  visit(tree); assert.ok(handlerSource);
  const focused = [], targets = [0, 1, 2].map(id => ({ focus: () => focused.push(id) }));
  const root = { querySelectorAll: () => targets, focus: () => focused.push('root') };
  const document = { activeElement: root };
  const handle = new Function('document', 'rootRef', compile(`return (${handlerSource});`))(document, { current: root });
  let prevented = 0, stopped = 0;
  const press = (key, shiftKey = false) => handle({ key, shiftKey, preventDefault() { prevented++; }, stopPropagation() { stopped++; } });
  press('Tab', true); assert.equal(focused.at(-1), 2);
  press('Tab'); assert.equal(focused.at(-1), 0);
  document.activeElement = targets[0]; press('Tab', true); assert.equal(focused.at(-1), 2);
  document.activeElement = targets[2]; press('Tab'); assert.equal(focused.at(-1), 0);
  targets.length = 0; press('Tab'); assert.equal(focused.at(-1), 'root');
  press('Escape'); assert.equal(prevented, 6); assert.equal(stopped, 6);
}
assert.match(app, /useLayoutEffect\(\(\) =>/);
assert.match(app, /stageCommittedUi\(base, persistedDocument, current\)/);
assert.doesNotMatch(app, /queue\.stage\(current => \(\{ \.\.\.current, \.\.\.persistedDocument/);
assert.match(app, /await queue\.refreshFrom/);
assert.match(app, /if \(choice === 'import'\)/);
assert.match(app, /legacyImportDocument\(legacyArchive\)/);
assert.doesNotMatch(app, /modoCultiva_deviceStateMigrated/);
assert.match(app, /<StateAccountBoundary/);
assert.match(app, /accountBlocked = signingOut \|\|/);
assert.match(app, /setVerifiedIdentity\(identity\)/);
assert.match(app, /\/auth\/me/);
console.log('[App state] actual canonical/functional setters/staging/flush/logout helpers; stale4->3 blocked; reassessment2; live dirty/session guards; offline A->B->A recovery; non-replaying acknowledged intent; immutable archive/consent; no minted credit; guest deletion tombstones; all12 levels/presets/drafts/images/unknowns; 11 languages/hydration/keyboard gate: passed');

if (process.argv.includes('--serve')) {
  const { createServer } = await import('vite');
  const fixture = `
    import React, { StrictMode } from 'react'; import { createRoot } from 'react-dom/client';
    import '/src/styles.css';
    const query = new URLSearchParams(location.search), delay = Number(query.get('delay') || '2500');
    const modes = ${JSON.stringify(modes.map(mode => mode.key))};
    const levels = Object.fromEntries(modes.map((mode,index) => [mode,index%10])); levels.fisico = 3;
    const fixtureState = { profileName:'Synthetic fixture A',levels,presets:{Saved:{...levels}},activityDrafts:{'fisico-3':'Synthetic activity'},activityCompletions:{},activityReactions:{},activityAlignments:{},insightRequests:{},visionImages:{},featuredBadges:[],selectedPreset:'Saved',language:query.get('language')||'es',skin:'holista',paletteFilter:'none',activePlan:'basic',onboardingWelcomeCompleted:true,futureField:{keep:true} };
    const identityFor=account=>({user_id:account,organization_id:'fixture-org',email:account+'@example.invalid',name:'Synthetic '+account,roles:[],permissions:[]});
    const tokensFor=account=>({access_token:'fixture-token-'+account,refresh_token:'fixture-refresh-'+account,expires_in:3600,identity:identityFor(account)});
    const identity=identityFor(query.get('account')||'fixture-A');
    sessionStorage.setItem('gm-auth-tokens',JSON.stringify(tokensFor(identity.user_id)));
    const records=new Map(), events=[]; let offline=false, active=0, maxActive=0;
    const recordFor=account=>{if(!records.has(account))records.set(account,{revision:1,state:{...structuredClone(fixtureState),profileName:'Synthetic '+account},validationReceipts:{},legacyCompletionSlots:[]});return records.get(account);};
    const first=recordFor(identity.user_id);
    if(query.get('recovery')==='yes') {
      const desired={...structuredClone(fixtureState),profileName:'Recovered offline profile'};
      localStorage.setItem('modo-cultiva:pending-state:v1:fixture-org:'+identity.user_id,JSON.stringify({version:1,scope:{organizationId:'fixture-org',accountId:identity.user_id},base:{state:structuredClone(fixtureState),revision:'fixture-base'},desired,pending:true}));
      first.state.levels.fisico=4;
    }
    if(query.get('legacy')==='yes') {
      localStorage.setItem('modoCultiva_activityDrafts',JSON.stringify({'fisico-1':'Synthetic unknown-owner archive'}));
      localStorage.setItem('modo-cultiva:legacy-device-archive:v1',JSON.stringify({version:1,state:{levels:{...levels},presets:{Archived:{...levels}},activityDrafts:{'fisico-1':'Synthetic unknown-owner archive'},activityCompletions:{archived:'unverified-only'}}}));
    }
    const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json'}});
    const snapshot=record=>({state:structuredClone(record.state),revision:'fixture-r'+record.revision,validationReceipts:structuredClone(record.validationReceipts),legacyCompletionSlots:[...record.legacyCompletionSlots]});
    // A visible, synthetic-only control/trace surface: browser QA never needs to
    // read storage or invoke application internals through browser evaluation.
    const panel=document.createElement('details');panel.id='fixture-controls';panel.style.cssText='position:fixed;z-index:9999;bottom:0;left:0;max-width:90vw;max-height:45vh;overflow:auto;background:#fff;color:#111;font:12px monospace;padding:8px';
    panel.innerHTML='<summary>Isolated persistence fixture</summary><button id="fixture-disconnect">Fixture: disconnect</button><button id="fixture-reconnect">Fixture: reconnect</button><button id="fixture-advance">Fixture: canonical advance</button><pre id="fixture-trace"></pre>';document.body.append(panel);
    const trace=()=>{const pending={},consent={};for(let i=0;i<localStorage.length;i++){const key=localStorage.key(i);if(key.startsWith('modo-cultiva:pending-state:'))pending[key]=JSON.parse(localStorage.getItem(key));if(key.startsWith('modo-cultiva:legacy-consent:'))consent[key]=JSON.parse(localStorage.getItem(key));}document.getElementById('fixture-trace').textContent=JSON.stringify({offline,active,maxActive,events,records:Object.fromEntries(records),pending,consent,archive:JSON.parse(localStorage.getItem('modo-cultiva:legacy-device-archive:v1')||'null')},null,2);};
    document.getElementById('fixture-disconnect').onclick=()=>{offline=true;trace();};
    document.getElementById('fixture-reconnect').onclick=()=>{offline=false;window.dispatchEvent(new Event('online'));trace();};
    document.getElementById('fixture-advance').onclick=()=>{const record=recordFor(identity.user_id);record.state.levels.fisico=4;record.state.activityCompletions={'fisico-3':true};record.validationReceipts={'fisico-3':{approved_by:['synthetic-1','synthetic-2','synthetic-3']}};record.revision++;trace();};
    setInterval(trace,100);trace();
    const wait=(ms,signal)=>new Promise((resolve,reject)=>{if(signal?.aborted)return reject(new DOMException('Aborted','AbortError'));const finish=()=>{signal?.removeEventListener('abort',abort);resolve();};const timer=setTimeout(finish,ms);const abort=()=>{clearTimeout(timer);reject(new DOMException('Aborted','AbortError'));};signal?.addEventListener('abort',abort,{once:true});});
    const cloudMerge=(local,remote)=>{if(!local||!remote||typeof local!=='object'||typeof remote!=='object'||Array.isArray(local)||Array.isArray(remote))return structuredClone(remote);const merged={...structuredClone(local)};for(const [key,value]of Object.entries(remote))merged[key]=key in merged?cloudMerge(merged[key],value):structuredClone(value);return merged;};
    window.fetch=async(input,options={})=>{
      const path=new URL(typeof input==='string'?input:input.url,location.href).pathname;
      const token=new Headers(options.headers).get('Authorization')?.replace('Bearer fixture-token-',''),account=token||identity.user_id,record=recordFor(account);
      if(path.endsWith('/auth/login')) {if(offline)throw Error('Synthetic offline');const body=JSON.parse(options.body);return response(tokensFor(body.email.toLowerCase().startsWith('b')?'fixture-B':'fixture-A'));}
      if(path.endsWith('/auth/me')) return response(identityFor(account));
      if(path.endsWith('/auth/logout')) {events.push({method:'LOGOUT',account});if(offline)throw Error('Synthetic offline');return response({});}
      if(path.endsWith('/health')) return response({service:'synthetic-fixture',status:'ok',environment:'test'});
      if(path.endsWith('/state/merge')) {const imported=JSON.parse(options.body).state;events.push({method:'MERGE',account,body:structuredClone(imported)});const ledger=record.state.activityCompletions;record.state=cloudMerge(imported,record.state);record.state.activityCompletions=ledger;record.revision++;trace();return response(snapshot(record));}
      if(path.endsWith('/state')) {
        const method=options.method||'GET';active++;maxActive=Math.max(maxActive,active);events.push({method:method+':start',account,...(options.body?{body:JSON.parse(options.body)}:{})});trace();
        try {
          if(offline||(method==='PUT'&&query.get('offline')==='yes'))throw Error('Synthetic offline');
          await wait(method==='PUT'?Number(query.get('putDelay')||'50'):delay,options.signal);
          if(method==='PUT'){const body=JSON.parse(options.body);if(body.expected_revision!=='fixture-r'+record.revision)return response({...snapshot(record),detail:'conflict'},409);record.state={...body.state,activityCompletions:record.state.activityCompletions};record.revision++;return response(snapshot(record));}
          if(query.get('error')==='yes')return response({detail:'synthetic'},503);return response(snapshot(record));
        } finally {active--;events.push({method:method+':end',account});trace();}
      }
      if(path.includes('/community/')) return response({submissions:[],notifications:[],members:[],cards:[],requests:[]});
      throw Error('Fixture refuses unexpected request: '+path);
    };
    const {default:App}=await import('/src/App.tsx');
    createRoot(document.getElementById('fixture-root')).render(<StrictMode><App/></StrictMode>);
  `;
  const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), configFile: false, esbuild: { jsx: 'automatic' }, server: { host: '127.0.0.1', port: 5204, strictPort: true }, plugins: [{
    name: 'isolated-app-state-regression', resolveId(id) { if (id === '/__app-state.tsx') return '\0app-state.tsx'; },
    load(id) { if (id === '\0app-state.tsx') return compile(fixture); },
    configureServer(vite) { vite.middlewares.use(async (request, response, next) => {
      if (request.url?.split('?')[0] !== '/__app-state') return next();
      try { response.setHeader('Content-Type', 'text/html; charset=utf-8'); response.end(await vite.transformIndexHtml('/__app-state', '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated App state regression</title></head><body><div id="fixture-root"></div><script type="module" src="/__app-state.tsx"></script></body></html>')); } catch(error) { next(error); }
    }); },
  }] });
  await server.listen(); console.log('[App state fixture] http://127.0.0.1:5204/__app-state?delay=2500 (synthetic fetch only; isolated origin; Ctrl+C stops)');
}
