import assert from 'node:assert/strict';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { REACTIONS, SHARE_PLATFORMS, activityReactionKey, cleanReactions, socialCopy, platformName, shareCaption } = await loadTypeScriptModule(new URL('../src/journeySocial.ts', import.meta.url));
const { wrapLines } = await loadTypeScriptModule(new URL('../src/activityShareImage.ts', import.meta.url));
assert.deepEqual(REACTIONS, ['leaf', 'soil', 'water', 'sun', 'roots']);
assert.deepEqual(SHARE_PLATFORMS, ['linkedin', 'whatsapp', 'instagram', 'facebook']);
const key = activityReactionKey('fisico', 3, 'Walk ten minutes');
assert.equal(key, activityReactionKey('fisico', 3, '  Walk ten minutes  '));
assert.notEqual(key, activityReactionKey('fisico', 4, 'Walk ten minutes'));
assert.notEqual(key, activityReactionKey('social', 3, 'Walk ten minutes'));
assert.notEqual(key, activityReactionKey('fisico', 3, 'Walk twenty minutes'));
const map = { [key]: 'leaf', invalid: 'leaf', 'fisico-9-0123456789abcdef': 'sun', [activityReactionKey('fisico', 0, '')]: 'water', 'fisico-3-0123456789abcdef': 'invented' };
assert.deepEqual(cleanReactions(map), { [key]: 'leaf', [activityReactionKey('fisico', 0, '')]: 'water' });
for (const invalid of [undefined, null, [], 'leaf', 0]) assert.deepEqual(cleanReactions(invalid), {});
for (const lang of ['es','en','zh','hi','ar','it','pt','ru','de','fr','da']) {
  const copy = socialCopy(lang);
  assert.equal(copy.reactions.length, 5);
  for (const [key, value] of Object.entries(copy)) if (typeof value === 'string') assert.ok(value.length, `${lang}.${key}`);
  for (const platform of SHARE_PLATFORMS) {
    assert.ok(copy.steps[platform].length > 25);
    assert.ok(platformName(platform, lang).length > 4);
  }
}
const card = { mode: 'Physical Mode', level: 3, levelLabel: 'Level', stage: 'Stage', effort: 'Time + energy', activity: 'Walk ten minutes.\nWith a friend.', color: '#54d6bc', icon: '✦', language: 'en', profileName: 'PRIVATE_NAME', access_token: 'PRIVATE_TOKEN', visionImages: { private: 'PRIVATE_IMAGE' } };
assert.equal(shareCaption(card), 'Physical Mode · Level 3\nWalk ten minutes.\nWith a friend.\n\nModo Cultiva');
assert.ok(!shareCaption(card).includes('PRIVATE'));
const ctx = { measureText: text => ({ width: Array.from(text).length * 10 }) };
for (const text of ['short sentence', 'a'.repeat(300), '活动建议'.repeat(50), 'مرحبا بالعالم '.repeat(20), 'one\ntwo', 'a  b  c']) {
  const lines = wrapLines(ctx, text, 100);
  assert.ok(lines.every(line => ctx.measureText(line).width <= 100));
  assert.equal(lines.join('').replace(/\s/g, ''), text.replace(/\s/g, ''));
}
console.log('[journey-social] five reactions, content scoping, legacy normalization, 11 languages, four platforms, private-data allowlist and long/CJK/RTL text wrapping passed');
