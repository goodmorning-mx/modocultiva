import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { BADGE_MODES, COMPLETION_TARGET, completionToken, cleanCompletions, isActivityCompleted, toggleActivityCompletion, badgeProgress, eligibleFeaturedBadges } = await loadTypeScriptModule(new URL('../src/badgeProgress.ts', import.meta.url));
const { badgeMessages } = await loadTypeScriptModule(new URL('../src/badgeMessages.ts', import.meta.url));
const drafts = Object.fromEntries(BADGE_MODES.flatMap(mode => Array.from({ length: 10 }, (_, level) => [`${mode}-${level}`, `${mode} practice ${level}`])));
const ledger = Object.fromEntries(Object.entries(drafts).map(([slot, activity]) => [slot, completionToken(activity)]));
const levels = Object.fromEntries(BADGE_MODES.map(mode => [mode, 9]));
const snapshot = JSON.stringify({ drafts, ledger, levels });
assert.equal(COMPLETION_TARGET, 120);
assert.equal(Object.keys(drafts).length, 120);
assert.equal(badgeProgress(drafts, {}, levels).completed, 0, 'Definitions and high levels are not completions');
assert.equal(badgeProgress(drafts, ledger, levels).completionist, true);
assert.equal(badgeProgress(drafts, ledger, levels).maxed, true);
const lowLevels = Object.fromEntries(BADGE_MODES.map(mode => [mode, 0]));
assert.equal(badgeProgress(drafts, ledger, lowLevels).completionist, true, 'Completionist is independent of the current level assessment');
assert.equal(badgeProgress(drafts, ledger, lowLevels).maxed, false);
const withoutFinalPractices = Object.fromEntries(Object.entries(ledger).filter(([slot]) => !slot.endsWith('-9')));
assert.equal(badgeProgress(drafts, withoutFinalPractices, levels).completed, 108);
assert.equal(badgeProgress(drafts, withoutFinalPractices, levels).completionist, false, 'Final vision images do not stand in for the twelve level-9 activities');
for (const slot of Object.keys(drafts)) {
  const missing = { ...ledger }; delete missing[slot];
  const short = badgeProgress(drafts, missing, levels);
  assert.equal(short.completed, 119); assert.equal(short.completionist, false, slot);
  const edited = { ...drafts, [slot]: `${drafts[slot]} edited` };
  assert.equal(badgeProgress(edited, ledger, levels).completed, 119, 'Editing invalidates this confirmation');
  assert.equal(badgeProgress({ ...drafts, [slot]: ' ' }, ledger, levels).completionist, false);
  assert.equal(badgeProgress({ ...drafts, [slot]: null }, ledger, levels).completionist, false);
}
for (const mode of BADGE_MODES) {
  for (const value of [undefined, null, 8, 8.99, 9.01, 10, '9', NaN, Infinity, -9]) {
    assert.equal(badgeProgress(drafts, ledger, { ...levels, [mode]: value }).maxed, false, `${mode}: ${value}`);
  }
}
const invalid = { ...ledger, 'not-a-mode-0': completionToken('x'), 'fisico-10': completionToken('x'), 'fisico-01': completionToken('x'), 'fisico--1': completionToken('x') };
assert.equal(badgeProgress(drafts, invalid, levels).completed, 120);
assert.deepEqual(cleanCompletions(invalid), ledger);
for (const value of [null, [], 'bad', 42, true, { 'fisico-0': true }, { 'fisico-0': 'wrong' }]) assert.deepEqual(cleanCompletions(value), {});
const confirmed = toggleActivityCompletion('fisico-0', drafts['fisico-0'], {});
assert.equal(isActivityCompleted('fisico-0', drafts['fisico-0'], confirmed), true);
assert.equal(isActivityCompleted('fisico-0', ` ${drafts['fisico-0']} `, confirmed), true);
assert.deepEqual(toggleActivityCompletion('fisico-0', drafts['fisico-0'], confirmed), {});
assert.deepEqual(toggleActivityCompletion('fisico-0', ' ', {}), {});
assert.deepEqual(toggleActivityCompletion('unknown-0', 'test', {}), {});
assert.equal(JSON.stringify({ drafts, ledger, levels }), snapshot, 'Calculations must not mutate saved state');
assert.deepEqual(eligibleFeaturedBadges(['unknown', 'maxed', 'maxed', 'first-step', null], ['first-step']), ['first-step']);
assert.deepEqual(eligibleFeaturedBadges(['completionist', 'maxed', 'first-step', 'level-up'], ['completionist', 'maxed', 'first-step', 'level-up']), ['completionist', 'maxed', 'first-step']);
assert.deepEqual(eligibleFeaturedBadges(['maxed'], ['maxed']), ['maxed']);
assert.deepEqual(eligibleFeaturedBadges(['maxed'], []), [], 'Maxed becomes inactive when levels fall');
const expected = ['es','en','zh','hi','ar','it','pt','ru','de','fr','da'];
assert.deepEqual(Object.keys(badgeMessages).sort(), expected.sort());
for (const [language, copy] of Object.entries(badgeMessages)) {
  assert.deepEqual(Object.keys(copy).sort(), Object.keys(badgeMessages.es).sort());
  for (const value of Object.values(copy)) assert.ok(typeof value === 'string' && value.length > 0, language);
  assert.match(copy.completionist, /120/); assert.match(copy.maxed, /99/);
}
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.doesNotMatch(app, /\bXP\b|xpCultiva|journeyXp|xpProgressHint/);
assert.match(app, /activityCompletions, activityReactions/);
assert.match(app, /activityCompletions: cleanCompletions/);
assert.match(app, /setActivityCompletions\(remoteCompletions\)/);
assert.match(app, /journeySlide === 9 && <div className="journey-final-activity"/);
assert.match(app, /<ActivityCompletion key=/);
console.log('[badges] 120 slots (all 0–9 levels), 120 missing/edit/empty cases, strict 12-mode Maxed eligibility, malformed input, confirm/undo, featured limits/inactivity, immutable old data, cloud wiring and all 11 languages passed');
