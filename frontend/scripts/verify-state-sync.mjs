import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const compilerOptions = { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 };
const transpile = (source) => ts.transpileModule(source, { compilerOptions }).outputText;
const moduleUrl = (source) => `data:text/javascript;base64,${Buffer.from(transpile(source)).toString('base64')}`;
const reconcileSource = await readFile(new URL('../src/stateReconcile.ts', import.meta.url), 'utf8');
const reconcileUrl = moduleUrl(reconcileSource);
const { reconcileState: merge, cloneStateValue: clone, stateValuesEqual: equal } = await import(reconcileUrl);
const queueSource = (await readFile(new URL('../src/stateSyncQueue.ts', import.meta.url), 'utf8')).replace("from './stateReconcile'", `from '${reconcileUrl}'`);
const { createStateSyncQueue: queue, STATE_CONFLICT_RETRIES, STATE_KEEPALIVE_LIMIT_BYTES, serializeStateSave } = await import(moduleUrl(queueSource));
const turn = () => new Promise((resolve) => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
function harness() {
  const calls = [];
  let active = 0, maxActive = 0;
  return {
    calls, get maxActive() { return maxActive; },
    transport(state, revision, signal, keepalive) {
      const pending = deferred();
      active += 1;
      maxActive = Math.max(maxActive, active);
      calls.push({ state: clone(state), revision, signal, keepalive, ...pending });
      return pending.promise.finally(() => { active -= 1; });
    },
  };
}
function freeze(value) {
  if (value && typeof value === 'object') { for (const child of Object.values(value)) freeze(child); Object.freeze(value); }
  return value;
}
const levels = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [`mode-${i}`, i % 10]));
levels['mode-0'] = 3;
const initialState = {
  modeLevels: levels, profile: { name: 'Synthetic person', bio: 'Keep this', removeMe: 'delete intentionally' },
  presets: [{ name: 'Saved map', levels: clone(levels) }], selectedPreset: 'Saved map',
  activityDrafts: { 'mode-11': 'Keep draft', 'mode-0': 'Activity aligned with next clarity' },
  modeImages: { 'mode-9': 'synthetic-still-image' }, language: 'da',
  activityCompletions: { historical: 'preserve-server-ledger' },
  futureField: { nested: { keep: true }, array: ['unknown', 'values'] },
};
const snapshot = (state, revision, metadata = {}) => ({ state: clone(state), revision, ...clone(metadata) });
const initial = snapshot(initialState, 'rev-A', { validationReceipts: { historical: true }, legacyCompletionSlots: ['mode-11:2'], unknownMetadata: { keep: true } });
freeze(initial);
assert.deepEqual(JSON.parse(serializeStateSave(initialState, 'rev-A')), {
  state: initialState, expected_revision: 'rev-A',
}, 'PUT /state request uses expected_revision, not the response revision field');
assert.ok(!Object.prototype.hasOwnProperty.call(JSON.parse(serializeStateSave({}, 'rev-A')), 'revision'));

// Three-way merge: local unchanged -> remote, remote unchanged -> local.
const local = clone(initialState);
local.profile.name = 'Pending profile';
delete local.profile.removeMe;
const remote = clone(initialState);
remote.modeLevels['mode-0'] = 4;
remote.profile.bio = 'Server-side bio';
remote.futureField.nested.serverAdded = 'unknown-preserved';
remote.activityCompletions = { validated: 'real-server-receipt' };
const merged = merge(initialState, freeze(local), freeze(remote));
assert.equal(merged.modeLevels['mode-0'], 4, 'stale profile saving cannot undo server 3 -> 4');
assert.equal(merged.profile.name, 'Pending profile');
assert.equal(merged.profile.bio, 'Server-side bio');
assert.ok(!('removeMe' in merged.profile));
assert.deepEqual(merged.activityCompletions, remote.activityCompletions);
assert.equal(Object.keys(merged.modeLevels).length, 12);
for (const name of ['presets', 'selectedPreset', 'activityDrafts', 'modeImages', 'language']) assert.deepEqual(merged[name], initialState[name]);
assert.equal(merged.futureField.nested.keep, true);
assert.equal(merged.futureField.nested.serverAdded, 'unknown-preserved');
assert.equal(merge(initialState, { ...clone(local), modeLevels: { ...levels, 'mode-0': 2 } }, remote).modeLevels['mode-0'], 2, 'explicit reassessment is not clamped to server max');
assert.deepEqual(merge({ x: [1] }, { x: [2] }, { x: [3] }), { x: [2] }, 'arrays are atomic local choices on conflict');
assert.deepEqual(merge({ x: [1] }, { x: [1] }, { x: [3] }), { x: [3] });
assert.deepEqual(merge({ x: { a: 1, b: 2 } }, { x: { b: 2 } }, { x: { a: 1, b: 3, c: 4 } }), { x: { b: 3, c: 4 } });
assert.deepEqual(merge({ x: { a: 1 } }, {}, { x: { a: 2 } }), {}, 'local object deletion wins a conflict');
assert.deepEqual(merge({ x: 1 }, { x: 1 }, {}), {}, 'remote deletion survives unchanged local');
assert.deepEqual(merge({}, { x: { a: 1 } }, { x: { b: 2 } }), { x: { b: 2, a: 1 } });
for (const field of ['activityCompletions', 'validationReceipts', 'legacyCompletionSlots']) {
  assert.deepEqual(merge({ [field]: {} }, { [field]: { fabricated: true } }, { [field]: {} }), { [field]: {} });
  assert.deepEqual(merge({ [field]: {} }, { [field]: { fabricated: true } }, {}), {}, 'absent remote ledger cannot be fabricated');
}
const exotic = JSON.parse('{"__proto__":{"safeData":true},"constructor":{"future":true}}');
const exoticResult = merge({}, exotic, {});
assert.ok(Object.prototype.hasOwnProperty.call(exoticResult, '__proto__'));
assert.equal({}.safeData, undefined);
assert.equal(exoticResult.__proto__.safeData, true);
assert.ok(equal({ a: { b: [1, 2] } }, { a: { b: [1, 2] } }));
assert.ok(!equal({ a: undefined }, {}));
assert.ok(!equal({ a: [1] }, { a: [1, 2] }));
assert.notEqual(merged.futureField, remote.futureField, 'result does not alias input');

// 409 rebase uses last acknowledged base, preserves canonical receipts, then retries.
{
  const h = harness(), notifications = [];
  const q = queue({ initial, transport: h.transport, onReconcile: (...args) => notifications.push(args) });
  q.stage(local);
  assert.equal(q.getDesired().profile.name, 'Pending profile', 'stage is immediate, with no debounce in queue');
  assert.equal(h.calls.length, 0);
  const flushing = q.flush();
  await turn();
  assert.equal(h.calls[0].revision, 'rev-A');
  h.calls[0].resolve({ conflict: snapshot(remote, 'rev-B', { validationReceipts: { approved: 'three-members' }, legacyCompletionSlots: [] }) });
  await turn();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].revision, 'rev-B');
  assert.equal(h.calls[1].state.modeLevels['mode-0'], 4);
  assert.equal(h.calls[1].state.profile.name, 'Pending profile');
  assert.ok(!('removeMe' in h.calls[1].state.profile));
  assert.deepEqual(notifications[0][0], initialState);
  assert.deepEqual(notifications[0][1], remote);
  h.calls[1].resolve(snapshot(h.calls[1].state, 'rev-C', { validationReceipts: { approved: 'three-members' }, legacyCompletionSlots: [] }));
  const result = await flushing;
  assert.equal(result.status, 'synced');
  assert.equal(result.dirty, false);
  assert.equal(h.maxActive, 1);
  assert.deepEqual(q.getSnapshot().validationReceipts, { approved: 'three-members' });
  assert.deepEqual(q.getSnapshot().legacyCompletionSlots, []);
  assert.deepEqual(q.getDesired().presets, initialState.presets);
  q.dispose();
}

// Edits during a save are rebased against its SENT payload, then drained serially.
{
  const h = harness();
  let reactState = clone(initialState);
  const q = queue({ initial, transport: h.transport,
    onReconcile(base, remote) { reactState = merge(base, reactState, remote); },
  });
  reactState.profile.name = 'Sent profile';
  q.stage(reactState);
  const firstFlush = q.flush();
  const secondFlush = q.flush();
  await turn();
  assert.equal(h.calls.length, 1);
  reactState.profile.bio = 'New pending React edit';
  reactState.modeLevels['mode-0'] = 2;
  q.stage(reactState);
  const ack = clone(h.calls[0].state);
  ack.modeLevels['mode-0'] = 4;
  ack.activityCompletions = { verified: 'server-only' };
  h.calls[0].resolve(snapshot(ack, 'rev-advanced'));
  await turn();
  assert.equal(h.calls.length, 2);
  assert.equal(h.calls[1].revision, 'rev-advanced');
  assert.equal(h.calls[1].state.modeLevels['mode-0'], 2);
  assert.equal(h.calls[1].state.profile.bio, 'New pending React edit');
  assert.deepEqual(h.calls[1].state.activityCompletions, { verified: 'server-only' });
  assert.equal(reactState.modeLevels['mode-0'], 2);
  assert.equal(reactState.profile.bio, 'New pending React edit');
  h.calls[1].resolve(snapshot(h.calls[1].state, 'rev-final'));
  assert.equal((await firstFlush).status, 'synced');
  assert.equal((await secondFlush).status, 'synced');
  assert.equal(h.maxActive, 1);
}

// The functional setter contract also preserves React edits NOT YET staged.
{
  const h = harness();
  let reactState = clone(local);
  const q = queue({ initial, transport: h.transport, onReconcile(base, remote) { reactState = merge(base, reactState, remote); } });
  q.stage(local);
  const flushing = q.flush();
  await turn();
  reactState.profile.bio = 'Too new for debounced React serialization';
  const ack = clone(h.calls[0].state);
  ack.modeLevels['mode-0'] = 4;
  h.calls[0].resolve(snapshot(ack, 'rev-new'));
  assert.equal((await flushing).status, 'synced');
  assert.equal(reactState.modeLevels['mode-0'], 4);
  assert.equal(reactState.profile.bio, 'Too new for debounced React serialization');
}

// Dirty intent is retained on network failure. Retry is explicit, not an endless loop.
{
  const calls = [];
  let secondFlush;
  const q = queue({ initial, transport: async (state) => {
    calls.push(clone(state));
    return snapshot(state, `microtask-${calls.length}`);
  }, onReconcile() {
    if (calls.length === 1) queueMicrotask(() => {
      q.stage((current) => ({ ...current, language: 'it' }));
      secondFlush = q.flush();
    });
  } });
  q.stage(local);
  await q.flush();
  await turn();
  assert.equal((await secondFlush).status, 'synced');
  assert.equal(calls.length, 2, 'flush in the promise-cleanup window must drain its own edit');
  assert.equal(q.getSnapshot().state.language, 'it');
  assert.equal(q.isDirty(), false);
}

// Dirty intent is retained on network failure. Retry is explicit, not an endless loop.
{
  const h = harness(), q = queue({ initial, transport: h.transport });
  q.stage(local);
  const flushing = q.flush();
  await turn();
  q.stage((current) => ({ ...current, language: 'fr' }));
  h.calls[0].reject(new Error('synthetic offline'));
  assert.equal((await flushing).status, 'error');
  assert.equal(q.isDirty(), true);
  assert.equal(q.getDesired().language, 'fr');
  assert.equal(q.getSnapshot().revision, 'rev-A');
  assert.equal(h.calls.length, 1);
  const retry = q.flush();
  await turn();
  assert.equal(h.calls[1].state.language, 'fr');
  assert.equal(h.calls[1].revision, 'rev-A');
  h.calls[1].resolve(snapshot(h.calls[1].state, 'rev-retry'));
  assert.equal((await retry).status, 'synced');
}

// Initial attempt + at most three 409 retries; each latest remote is reconciled.
{
  const calls = [], notifications = [];
  const q = queue({ initial, transport: async (state, revision) => {
    calls.push({ state: clone(state), revision });
    return { conflict: snapshot({ ...clone(initialState), futureConflict: calls.length }, `conflict-${calls.length}`) };
  }, onReconcile: (...args) => notifications.push(args) });
  q.stage(local);
  const result = await q.flush();
  assert.equal(result.status, 'conflict-limit');
  assert.equal(calls.length, 1 + STATE_CONFLICT_RETRIES);
  assert.equal(notifications.length, calls.length);
  assert.equal(result.snapshot.revision, `conflict-${calls.length}`);
  assert.equal(q.getDesired().profile.name, 'Pending profile');
  assert.equal(q.getDesired().futureConflict, calls.length);
  assert.equal(q.isDirty(), true);
}

// Canonical refresh is an authority barrier while a save is in flight.
for (const failOldRequest of [false, true]) {
  const h = harness(), notifications = [];
  const q = queue({ initial, transport: h.transport, onReconcile: (...args) => notifications.push(args) });
  q.stage(local);
  const flushing = q.flush();
  await turn();
  q.stage((current) => ({ ...current, language: 'ar' }));
  q.refresh(snapshot(remote, 'rev-refresh', { validationReceipts: { fresh: true } }));
  assert.equal(q.getDesired().modeLevels['mode-0'], 4);
  assert.equal(q.getDesired().language, 'ar');
  assert.equal(q.getDesired().profile.name, 'Pending profile');
  assert.equal(q.getSnapshot().revision, 'rev-refresh');
  assert.equal(h.calls.length, 1, 'refresh cannot start a parallel save');
  if (failOldRequest) h.calls[0].reject(new Error('old request failed'));
  else h.calls[0].resolve(snapshot(h.calls[0].state, 'stale-response'));
  await turn();
  assert.equal(h.calls[1].revision, 'rev-refresh');
  assert.equal(h.calls[1].state.modeLevels['mode-0'], 4);
  assert.equal(q.getSnapshot().revision, 'rev-refresh');
  assert.equal(notifications.length, 1, 'obsolete response cannot notify React');
  h.calls[1].resolve(snapshot(h.calls[1].state, 'rev-refreshed-save', { validationReceipts: { fresh: true } }));
  assert.equal((await flushing).status, 'synced');
  assert.equal(h.maxActive, 1);
  q.refresh(initial);
  assert.equal(q.getSnapshot().revision, 'rev-refreshed-save', 'known old revision is ignored');
  const copy = q.getSnapshot();
  copy.state.modeLevels['mode-0'] = 0;
  copy.validationReceipts.fresh = false;
  assert.equal(q.getSnapshot().state.modeLevels['mode-0'], 4);
  assert.deepEqual(q.getSnapshot().validationReceipts, { fresh: true });
}

// Pagehide keepalive is optional, serialized, and bounded by UTF-8 BODY size.
{
  const h = harness(), q = queue({ initial, transport: h.transport });
  q.stage(local);
  const flushing = q.flush({ keepalive: true });
  await turn();
  assert.equal(h.calls[0].keepalive, true);
  assert.ok(new TextEncoder().encode(serializeStateSave(h.calls[0].state, h.calls[0].revision)).byteLength < 60000);
  h.calls[0].resolve(snapshot(h.calls[0].state, 'rev-keepalive'));
  assert.equal((await flushing).status, 'synced');
  const count = h.calls.length;
  assert.equal((await q.flush({ keepalive: true })).status, 'synced');
  assert.equal(h.calls.length, count, 'clean queues do not send on pagehide');
}
for (const body of ['a'.repeat(STATE_KEEPALIVE_LIMIT_BYTES), '界'.repeat(21000)]) {
  let calls = 0;
  const q = queue({ initial, serializeBody: () => body, transport: async () => { calls += 1; return initial; } });
  q.stage(local);
  assert.equal((await q.flush({ keepalive: true })).status, 'keepalive-too-large');
  assert.equal(calls, 0);
  assert.equal(q.isDirty(), true);
}
{
  const h = harness(), q = queue({ initial, transport: h.transport });
  q.stage(local);
  const normal = q.flush();
  await turn();
  q.stage((current) => ({ ...current, language: 'zh' }));
  const pagehide = q.flush({ keepalive: true });
  assert.equal(h.calls.length, 1);
  assert.equal(h.calls[0].keepalive, false);
  h.calls[0].resolve(snapshot(h.calls[0].state, 'rev-normal'));
  await turn();
  assert.equal(h.calls[1].keepalive, true);
  h.calls[1].resolve(snapshot(h.calls[1].state, 'rev-hidden'));
  assert.equal((await normal).status, 'synced');
  assert.equal((await pagehide).status, 'synced');
  assert.equal(h.maxActive, 1);
}

// Disposal resolves waiters even if the adapter ignores abort; never callbacks.
{
  const h = harness(), notifications = [];
  const q = queue({ initial, transport: h.transport, onReconcile: (...args) => notifications.push(args) });
  q.stage(local);
  const flushing = q.flush();
  await turn();
  q.dispose();
  q.dispose();
  assert.equal(h.calls[0].signal.aborted, true);
  assert.equal((await flushing).status, 'disposed');
  q.stage(remote);
  q.refresh(snapshot(remote, 'ignored-after-dispose'));
  h.calls[0].resolve(snapshot(remote, 'late-after-dispose'));
  await turn();
  assert.equal(q.getSnapshot().revision, 'rev-A');
  assert.equal(notifications.length, 0);
  assert.equal((await q.flush()).status, 'disposed');
  assert.equal(h.calls.length, 1);
}
{
  let calls = 0;
  const q = queue({ initial, transport: async () => { calls += 1; return initial; } });
  q.stage(local);
  const flushing = q.flush();
  q.dispose();
  assert.equal((await flushing).status, 'disposed');
  assert.equal(calls, 0, 'dispose before scheduled flush prevents transport entirely');
}
assert.throws(() => queue({ initial: { state: {}, revision: '' }, transport: async () => initial }), TypeError);
// Canonical GETs share an exclusive barrier with PUT acknowledgements.
{
  const h = harness(), reads = [];
  const q = queue({ initial, transport: h.transport });
  q.stage(local);
  const saving = q.flush();
  await turn();
  const reading = q.refreshFrom(signal => { const d = deferred(); reads.push({ ...d, signal }); return d.promise; });
  await turn();
  assert.equal(reads.length, 0, 'GET waits for the active PUT acknowledgement');
  h.calls[0].resolve(snapshot(h.calls[0].state, 'read-before'));
  await saving; await turn();
  assert.equal(reads.length, 1);
  q.stage(current => ({ ...current, language: 'it' }));
  const afterReadSave = q.flush();
  await turn();
  assert.equal(h.calls.length, 1, 'PUT cannot overtake an authoritative GET');
  const fresh = clone(local); fresh.modeLevels['mode-0'] = 4;
  reads[0].resolve(snapshot(fresh, 'read-fresh'));
  assert.equal(await reading, true); await turn();
  assert.equal(h.calls[1].revision, 'read-fresh');
  assert.equal(h.calls[1].state.modeLevels['mode-0'], 4);
  assert.equal(h.calls[1].state.language, 'it');
  h.calls[1].resolve(snapshot(h.calls[1].state, 'read-after'));
  assert.equal((await afterReadSave).status, 'synced');
  assert.equal(h.maxActive, 1);
}
{
  const reads = [], notifications = [];
  const q = queue({ initial, transport: async () => { throw Error('no writes'); }, onReconcile: (...args) => notifications.push(args) });
  const reader = () => { const d = deferred(); reads.push(d); return d.promise; };
  const old = q.refreshFrom(reader); await turn();
  const latest = q.refreshFrom(reader); await turn();
  assert.equal(reads.length, 1, 'canonical reads are serialized');
  reads[0].resolve(snapshot({ ...initialState, levels: { fisico: 4 } }, 'unseen-B'));
  assert.equal(await old, false); await turn();
  assert.equal(notifications.length, 0, 'superseded GET cannot reconcile an unseen old revision');
  reads[1].resolve(snapshot({ ...initialState, levels: { fisico: 5 } }, 'latest-C'));
  assert.equal(await latest, true);
  assert.equal(q.getSnapshot().state.levels.fisico, 5);
  assert.equal(notifications.length, 1);
}
{
  const q = queue({ initial, transport: async () => initial });
  let signal;
  const reading = q.refreshFrom(value => { signal = value; return new Promise(() => {}); });
  await turn(); q.dispose();
  assert.equal(await reading, false); assert.equal(signal.aborted, true);
}
// Failed saves cannot be overtaken by GET; a later read first drains retained
// intent. Fresh metadata/unknown fields still win without clamping reassessment.
{
  const h = harness(), reads = [];
  const q = queue({ initial, transport: h.transport });
  q.stage(local);
  const firstRead = q.refreshFrom(async () => { reads.push('unexpected'); return initial; });
  await turn(); h.calls[0].reject(Error('offline before read'));
  await assert.rejects(firstRead, /offline before read/);
  assert.deepEqual(reads, []); assert.equal(q.isDirty(), true);
  const nextRead = q.refreshFrom(async () => {
    reads.push('canonical');
    return snapshot({ ...clone(h.calls[1].state), modeLevels: { ...levels, 'mode-0': 4 }, newUnknown: { preserved: true } }, 'after-retry-read', { validationReceipts: { new: true }, legacyCompletionSlots: [] });
  });
  await turn(); assert.equal(h.calls[1].revision, 'rev-A');
  h.calls[1].resolve(snapshot(h.calls[1].state, 'retry-saved'));
  assert.equal(await nextRead, true); assert.deepEqual(reads, ['canonical']);
  assert.equal(q.getDesired().profile.name, local.profile.name);
  assert.equal(q.getDesired().modeLevels['mode-0'], 4);
  assert.deepEqual(q.getSnapshot().validationReceipts, { new: true });
  assert.deepEqual(q.getDesired().newUnknown, { preserved: true });
  q.stage(current => ({ ...current, modeLevels: { ...current.modeLevels, 'mode-0': 2 } }));
  assert.equal(q.getDesired().modeLevels['mode-0'], 2);
  assert.equal(h.maxActive, 1); q.dispose();
}
// A failed GET releases waiting flushes without discarding edits made during it.
{
  const h = harness(), read = deferred(), q = queue({ initial, transport: h.transport });
  const reading = q.refreshFrom(() => read.promise); await turn();
  q.stage(local); const flushing = q.flush(); await turn();
  assert.equal(h.calls.length, 0);
  read.reject(Error('canonical read failed'));
  await assert.rejects(reading, /canonical read failed/); await turn();
  assert.equal(h.calls.length, 1); assert.equal(h.calls[0].revision, 'rev-A');
  assert.equal(h.calls[0].state.profile.name, local.profile.name);
  h.calls[0].resolve(snapshot(h.calls[0].state, 'saved-after-failed-read'));
  assert.equal((await flushing).status, 'synced'); assert.equal(q.isDirty(), false);
}
// Account disposal also releases queued reads and a flush behind the GET gate.
{
  const read = deferred(), notifications = [];
  const q = queue({ initial, transport: async () => { throw Error('must not send'); }, onReconcile: (...args) => notifications.push(args) });
  const firstRead = q.refreshFrom(() => read.promise); await turn();
  q.stage(local);
  const secondRead = q.refreshFrom(async () => { throw Error('must not read'); });
  const flushing = q.flush(); q.dispose();
  assert.equal(await firstRead, false); assert.equal(await secondRead, false);
  assert.equal((await flushing).status, 'disposed');
  read.resolve(snapshot(remote, 'obsolete-other-session')); await turn();
  assert.deepEqual(notifications, []); assert.equal(q.getSnapshot().revision, 'rev-A');
}
assert.deepEqual(initial.state, initialState, 'frozen historical input is unchanged');
console.log('[state sync] deep three-way deletions/arrays/unknowns; all 12 levels/presets; server-owned ledgers/metadata; stale 3->4 vs profile and explicit reassessment2; staged/pending React edits; serialized saves; bounded 409; refresh barrier; failure/retry; UTF-8 keepalive; abort/dispose: passed');
