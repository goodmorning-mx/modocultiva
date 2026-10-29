import assert from 'node:assert/strict';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { getBankActivities, bankPairings, bankQuotes, bankSources } = await loadTypeScriptModule(new URL('../src/quoteActivityCatalog.ts', import.meta.url));
const languages = ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'];
assert.equal(Object.keys(bankPairings).length, 12);
assert.equal(new Set(bankQuotes.map(q => q.id)).size, bankQuotes.length);
for (const q of bankQuotes) {
  assert.ok(q.en && q.es && q.locator && bankSources[q.source], `Missing provenance: ${q.id}`);
  assert.equal(new URL(bankSources[q.source].url).protocol, 'https:');
}
let checked = 0;
for (const mode of Object.keys(bankPairings)) {
  for (let level = 0; level <= 9; level++) {
    for (const language of languages) {
      const items = getBankActivities(mode, level, language);
      assert.equal(items.length, 10, `${mode}/${level}/${language}: incomplete deck`);
      assert.equal(new Set(items.map(a => a.quote.id)).size, 10, 'No duplicate quotes within a deck');
      assert.equal(new Set(items.map(a => a.title)).size, 10, 'No duplicate topics within a deck');
      for (const item of items) {
        assert.equal(item.level, level);
        assert.ok(item.title && item.description && item.quote, 'Empty recommendation');
        assert.doesNotMatch(item.description, /undefined|\{topic\}/);
        if (level < 9) {
          const duration = language === 'ar' && level === 0 ? 'دقيقتين' : String([2, 3, 5, 10, 15, 15, 30, 45, 45][level]);
          assert.ok(item.description.includes(duration), `${mode}/${level}/${language}: duration must follow the selected level, never the slide number`);
        }
        checked++;
      }
    }
  }
}
for (const level of [-1, 10, 1.5, NaN]) assert.deepEqual(getBankActivities('fisico', level, 'en'), []);
assert.deepEqual(getBankActivities('missing', 0, 'en'), []);
// Direction must change at the transition points, not keep a person at the
// current clarity stage. These anchors supplement the full localized deck checks.
for (const mode of Object.keys(bankPairings)) {
  for (const activity of getBankActivities(mode, 5, 'en')) assert.match(activity.description, /goal beyond your comfort zone/);
  for (const activity of getBankActivities(mode, 6, 'en')) assert.match(activity.description, /Measure one result, review it weekly/);
  for (const activity of getBankActivities(mode, 7, 'en')) assert.match(activity.description, /automation or agreed delegation/);
  for (const activity of getBankActivities(mode, 8, 'en')) assert.match(activity.description, /Support someone who wants to learn/);
  for (const activity of getBankActivities(mode, 5, 'es')) assert.match(activity.description, /meta concreta fuera de tu zona de confort/);
  for (const activity of getBankActivities(mode, 8, 'es')) assert.match(activity.description, /Acompaña a alguien que quiera aprender/);
}
console.log(`[activity-bank] ${checked} localized recommendations checked; 12 modes, 10 levels, 10 choices; provenance, uniqueness, duration and invalid-input checks passed`);
console.log('[activity-bank] Next-clarity direction, measured growth, optimization/delegation and teaching transition anchors passed');
