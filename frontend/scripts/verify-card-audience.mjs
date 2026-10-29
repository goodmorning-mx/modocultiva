import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const client = await loadTypeScriptModule(new URL('../src/communityClient.ts', import.meta.url));
const { publicCardCopy } = await loadTypeScriptModule(new URL('../src/publicCardMessages.ts', import.meta.url));
const { adaptActivityFlow } = await loadTypeScriptModule(new URL('../src/activityFlowAdapter.ts', import.meta.url));
const correctedAlignment = 'A revised explanation that clearly matches the next clarity stage.';
const corrected = adaptActivityFlow({ actor: 'synthetic-author', mode: 'fisico', level: 3, activity: 'A saved activity', alignment: correctedAlignment, historical: false,
  submissions: [{ id: 'synthetic-revision', author_id: 'synthetic-author', mode: 'fisico', source_level: 3, activity: 'A saved activity', target_alignment: 'Original explanation needing correction.', status: 'changes_requested', revision_number: 1,
    review_count: 0, review_quorum: 3, evidence: { reflection: 'Synthetic context.' }, reviews: [{ decision: 'changes_requested', feedback: 'Explain the next clarity match.' }] }] });
assert.equal(corrected.status, 'changesRequested');
assert.equal(corrected.definition.target_alignment, correctedAlignment, 'A feedback correction cannot silently restore the old alignment');
const languages = ['es','en','zh','hi','ar','it','pt','ru','de','fr','da'];
for (const language of languages) {
  const copy = publicCardCopy(language);
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(publicCardCopy('es')).sort());
  for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.trim(), language);
  assert.ok(copy.awaiting.includes('{count}') && copy.awaiting.includes('3'));
}
const identifier = '00000000-0000-4000-8000-000000000001';
assert.equal(client.isCommunityCardId(identifier), true);
for (const value of ['', '../state', 'abc?token=synthetic', identifier + '/video', '\n' + identifier]) assert.equal(client.isCommunityCardId(value), false);
assert.equal(await client.activitySha256('\ufeffhello\ufeff'), await client.activitySha256('hello'));
assert.notEqual(await client.activitySha256('\u0085hello\u0085'), await client.activitySha256('hello'));
const originalFetch = globalThis.fetch;
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url, init });
  return new Response(JSON.stringify({ id: identifier, audience: 'public' }), { status: 200, headers: { 'Content-Type': 'application/json' } });
};
try {
  await client.fetchPublicCommunityCard('https://synthetic.example.test', identifier);
  await client.loadPublicCardVideo('https://synthetic.example.test', identifier, new AbortController().signal);
  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.startsWith('https://synthetic.example.test/community/public/cards/')));
  assert.ok(calls.every(call => !call.init.headers?.Authorization && !call.url.includes('token=')));
  assert.ok(calls.every(call => call.init.cache === 'no-store'));
  const authenticated = client.createCommunityClient('https://synthetic.example.test', 'synthetic-test-only-bearer');
  await authenticated.setAudience(identifier, 'public', true);
  const last = calls.at(-1);
  assert.equal(last.init.method, 'PUT');
  assert.deepEqual(JSON.parse(last.init.body), { audience: 'public', public_confirmed: true });
  await authenticated.setAudience(identifier, 'network', false);
  assert.deepEqual(JSON.parse(calls.at(-1).init.body), { audience: 'network', public_confirmed: false });
  const before = calls.length;
  await assert.rejects(client.fetchPublicCommunityCard('https://synthetic.example.test', '../state'));
  assert.equal(calls.length, before, 'Invalid public IDs never initiate a request');
} finally { globalThis.fetch = originalFetch; }
const component = await readFile(new URL('../src/PublicActivityCard.tsx', import.meta.url), 'utf8');
assert.match(component, /validation_status === 'approved' && count === 3/);
assert.match(component, /isNormalizedEvidenceImage/);
assert.match(component, /URL\.revokeObjectURL/);
assert.match(component, /preload="none"/);
assert.doesNotMatch(component, /autoPlay|dangerouslySetInnerHTML|setInterval/);
console.log('[card audiences] 11 locales, public anonymous/uncached reads, UUID guards, explicit audience mutation, strict validated presentation, bounded still photo/explicit video and blob cleanup passed');
