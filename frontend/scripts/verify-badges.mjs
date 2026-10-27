import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { BADGE_MODES, COMPLETION_TARGET, completionToken, cleanCompletions, isActivityCompleted, toggleActivityCompletion, hasVisionImage, badgeProgress, eligibleFeaturedBadges } = await loadTypeScriptModule(new URL('../src/badgeProgress.ts', import.meta.url));
const { badgeMessages } = await loadTypeScriptModule(new URL('../src/badgeMessages.ts', import.meta.url));
const drafts = Object.fromEntries(BADGE_MODES.flatMap(mode => Array.from({ length: 10 }, (_, level) => [`${mode}-${level}`, `${mode} practice ${level}`])));
const ledger = Object.fromEntries(Object.entries(drafts).map(([slot, activity]) => [slot, completionToken(activity)]));
const levels = Object.fromEntries(BADGE_MODES.map(mode => [mode, 9]));
const image = 'data:image/svg+xml;base64,' + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>').toString('base64');
const images = Object.fromEntries(BADGE_MODES.map(mode => [mode, image]));
const snapshot = JSON.stringify({ drafts, ledger, levels, images });
assert.equal(COMPLETION_TARGET, 120);
assert.equal(Object.keys(drafts).length, 120);
assert.equal(badgeProgress(drafts, {}, levels).completed, 0, 'Definitions and high levels are not completions');
assert.equal(badgeProgress(drafts, {}, levels, images).completed, 12, 'Previously uploaded images count automatically');
assert.equal(badgeProgress(drafts, ledger, levels, images).completed, 120, '108 activities + 12 images, target unchanged');
assert.equal(badgeProgress(drafts, ledger, levels, images).completionist, true);
assert.equal(badgeProgress(drafts, ledger, levels, images).maxed, true);
const lowLevels = Object.fromEntries(BADGE_MODES.map(mode => [mode, 0]));
assert.equal(badgeProgress(drafts, ledger, lowLevels, images).completionist, true, 'Completionist is independent of the current level assessment');
assert.equal(badgeProgress(drafts, ledger, lowLevels, images).maxed, false);
assert.equal(badgeProgress(drafts, ledger, levels).completed, 108);
assert.equal(badgeProgress(drafts, ledger, levels).completionist, false, 'Legacy level-9 activity entries cannot substitute for images');
for (const slot of Object.keys(drafts)) {
  const missing = { ...ledger }; delete missing[slot];
  if (slot.endsWith('-9')) {
    const mode = slot.slice(0, -2);
    const missingImage = { ...images }; delete missingImage[mode];
    assert.equal(badgeProgress(drafts, ledger, levels, missingImage).completed, 119, slot);
    assert.equal(badgeProgress(drafts, ledger, levels, missingImage).completionist, false);
    assert.equal(badgeProgress(drafts, missing, levels, images).completed, 120, 'No manual level-9 confirmation needed');
    assert.equal(isActivityCompleted(slot, drafts[slot], ledger), false);
    assert.deepEqual(toggleActivityCompletion(slot, drafts[slot], ledger), ledger, 'Do not delete legacy entries or create new level-9 confirmations');
    assert.equal(badgeProgress({ ...drafts, [slot]: '' }, ledger, levels, images).completed, 120);
    continue;
  }
  const short = badgeProgress(drafts, missing, levels, images);
  assert.equal(short.completed, 119); assert.equal(short.completionist, false, slot);
  const edited = { ...drafts, [slot]: `${drafts[slot]} edited` };
  assert.equal(badgeProgress(edited, ledger, levels, images).completed, 119, 'Editing invalidates this confirmation');
  assert.equal(badgeProgress({ ...drafts, [slot]: ' ' }, ledger, levels, images).completionist, false);
  assert.equal(badgeProgress({ ...drafts, [slot]: null }, ledger, levels, images).completionist, false);
}
for (const mode of BADGE_MODES) {
  for (const value of [undefined, null, 8, 8.99, 9.01, 10, '9', NaN, Infinity, -9]) {
    assert.equal(badgeProgress(drafts, ledger, { ...levels, [mode]: value }).maxed, false, `${mode}: ${value}`);
  }
}
const invalid = { ...ledger, 'not-a-mode-0': completionToken('x'), 'fisico-10': completionToken('x'), 'fisico-01': completionToken('x'), 'fisico--1': completionToken('x') };
assert.equal(badgeProgress(drafts, invalid, levels, { ...images, unknown: image }).completed, 120);
assert.deepEqual(cleanCompletions(invalid), ledger);
for (const value of [null, [], 'bad', 42, true, { 'fisico-0': true }, { 'fisico-0': 'wrong' }]) assert.deepEqual(cleanCompletions(value), {});
const confirmed = toggleActivityCompletion('fisico-0', drafts['fisico-0'], {});
assert.equal(isActivityCompleted('fisico-0', drafts['fisico-0'], confirmed), true);
assert.equal(isActivityCompleted('fisico-0', ` ${drafts['fisico-0']} `, confirmed), true);
assert.deepEqual(toggleActivityCompletion('fisico-0', drafts['fisico-0'], confirmed), {});
assert.deepEqual(toggleActivityCompletion('fisico-0', ' ', {}), {});
assert.deepEqual(toggleActivityCompletion('unknown-0', 'test', {}), {});
for (const value of [null, undefined, '', ' ', false, [], {}, 123, 'not an image', 'data:image/png;base64,', 'data:text/plain;base64,abc']) assert.equal(hasVisionImage(value), false);
assert.equal(hasVisionImage(image), true);
assert.equal(hasVisionImage(` ${image} `), true);
assert.equal(hasVisionImage('https://example.test/saved-vision.png'), true);
assert.equal(JSON.stringify({ drafts, ledger, levels, images }), snapshot, 'Calculations must not mutate saved state');
assert.deepEqual(eligibleFeaturedBadges(['unknown', 'maxed', 'maxed', 'first-step', null], ['first-step']), ['first-step']);
assert.deepEqual(eligibleFeaturedBadges(['completionist', 'maxed', 'first-step', 'level-up'], ['completionist', 'maxed', 'first-step', 'level-up']), ['completionist', 'maxed', 'first-step']);
assert.deepEqual(eligibleFeaturedBadges(['maxed'], ['maxed']), ['maxed']);
assert.deepEqual(eligibleFeaturedBadges(['maxed'], []), [], 'Maxed becomes inactive when levels fall');
const expected = ['es','en','zh','hi','ar','it','pt','ru','de','fr','da'];
assert.deepEqual(Object.keys(badgeMessages).sort(), expected.sort());
for (const [language, copy] of Object.entries(badgeMessages)) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(badgeMessages.es).sort());
  for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length > 0, language);
  assert.match(copy.completionist, /108/); assert.match(copy.completionist, /120/); assert.match(copy.maxed, /99/);
  assert.ok(copy.visionDone && copy.visionPending && copy.visionHint);
}
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(app, /\bXP\b|xpCultiva|journeyXp|xpProgressHint/);
assert.match(app, /activityCompletions, activityReactions/);
assert.match(app, /activityCompletions: cleanCompletions/);
assert.match(app, /setActivityCompletions\(remoteCompletions\)/);
assert.doesNotMatch(app, /journey-final-activity|openActivity\(9/);
assert.match(app, /badgeProgress\(activityDrafts, activityCompletions, levels, visionImages\)/);
assert.match(app, /journeySlide < 9 && <ActivityCompletion/);
assert.match(app, /hasVisionImage\(visionImages\[selectedMode.key\]\)/);
assert.match(app, /journeySlide === 9 \? tr\('finalVisionCopy'\)/, 'Level 9 explains the image rather than asking for a practice');
const start = app.indexOf('  const renderCultSection = () => {');
const end = app.indexOf('\n  const ', start + 1);
assert.doesNotMatch(app.slice(start, end), /insightNotice &&/, 'Embedded Global Ideas must not duplicate the journey notice');
assert.equal((app.match(/insightNotice &&/g) ?? []).length, 2, 'One journey notice and one separate standalone-page notice');
console.log('[badges] Target 120 = 108 manual activities + 12 uploaded visions; missing/edit/image cases, legacy preservation, Maxed, 11 languages, level-9 UI and single journey notice passed');
