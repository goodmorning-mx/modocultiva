import assert from 'node:assert/strict';
import { loadTypeScriptModule } from './load-typescript-module.mjs';

const source = name => loadTypeScriptModule(new URL(`../src/${name}.ts`, import.meta.url));
const { APP_LANGUAGES } = await source('languagePreference');
const { BADGE_MODES } = await source('badgeProgress');
const { globalIdeaTitle, globalIdeaPractices } = await source('globalIdeaPractices');
const { globalIdeaAuthors, globalIdeaBio } = await source('globalIdeaBios');

let checked = 0;
for (const language of APP_LANGUAGES) {
  const practices = globalIdeaPractices[language];
  assert.deepEqual(Object.keys(practices).sort(), [...BADGE_MODES].sort());
  assert.equal(new Set(Object.values(practices).flat()).size, BADGE_MODES.length * 9, `${language}: every mode and level needs its own practice`);
  const bios = globalIdeaAuthors.map(author => globalIdeaBio(language, author));
  assert.ok(bios.every(bio => bio?.trim().length > 15));
  assert.equal(new Set(bios).size, globalIdeaAuthors.length, `${language}: each demo profile needs its own biography`);
  if (language !== 'es') {
    for (const [index, author] of globalIdeaAuthors.entries()) assert.notEqual(bios[index], globalIdeaBio('es', author));
  }
  for (const mode of BADGE_MODES) {
    assert.equal(practices[mode].length, 9);
    for (const [level, practice] of practices[mode].entries()) {
      assert.ok(practice.trim().length > 10);
      if (language !== 'es') assert.notEqual(practice, globalIdeaPractices.es[mode][level]);
      const variants = Array.from({ length: 12 }, (_, variant) => globalIdeaTitle(language, mode, level, variant));
      assert.equal(variants[0], practice);
      assert.equal(new Set(variants).size, 10, `${language}/${mode}/${level}: all ten editorial framings remain available in the 12 cards`);
      for (const title of variants) assert.ok(title.toLocaleLowerCase(language).includes(practice.toLocaleLowerCase(language)), 'A variant must retain its level-specific practice');
      checked += variants.length;
    }
  }
}
assert.equal(globalIdeaTitle('es', 'fisico', 5, 1), 'Observar un momento concreto relacionado con esto: crear una rutina semanal de movimiento y descanso que puedas sostener.');
assert.match(globalIdeaTitle('zh', 'fisico', 3, 3), /散步三次.*每次二十分钟.*呼吸/);
assert.match(globalIdeaTitle('en', 'financiero', 3, 0), /every expense for seven days/);
console.log(`[global-ideas] ${checked} localized variant titles and ${globalIdeaAuthors.length * APP_LANGUAGES.length} biographies checked`);
