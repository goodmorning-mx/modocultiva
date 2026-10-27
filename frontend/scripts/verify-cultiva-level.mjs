import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { calculateCultivaLevel, CULTIVA_MAX_LEVEL } = await loadTypeScriptModule(new URL('../src/cultivaLevel.ts', import.meta.url));
const zeros = Array(12).fill(0);
const complete = Array(12).fill(9);
assert.equal(CULTIVA_MAX_LEVEL, 99);
assert.equal(calculateCultivaLevel(zeros), 0);
assert.equal(calculateCultivaLevel(complete), 99);
assert.equal(calculateCultivaLevel([...Array(6).fill(4), ...Array(6).fill(5)]), 49.5);
assert.equal(calculateCultivaLevel([9, ...Array(11).fill(0)]), 8.3);
assert.equal(calculateCultivaLevel([8, ...Array(11).fill(9)]), 98.1);
// Verify each of the 108 one-point increases, including every mode's final point.
let prior = 0;
const progress = [...zeros];
for (let mode = 0; mode < 12; mode++) {
  for (let level = 1; level <= 9; level++) {
    progress[mode] = level;
    const score = calculateCultivaLevel(progress);
    assert.ok(score > prior, 'Every point contributes monotonically');
    assert.ok(score >= 0 && score <= 99);
    assert.equal(score === 99, progress.every(v => v === 9), '99 is reserved for twelve complete modes');
    prior = score;
  }
  const justShort = [...complete]; justShort[mode] = 8;
  assert.ok(calculateCultivaLevel(justShort) < 99);
}
const keys = ['fisico','intelectual','emocional','arquetipico','espiritual','romantico','familiar','social','financiero','profesional','ludico','visionario'];
const saved = { fisico:3,intelectual:6,emocional:2,arquetipico:9,espiritual:9,romantico:0,familiar:4,social:2,financiero:4,profesional:6,ludico:4,visionario:7 };
const snapshot = JSON.stringify(saved);
assert.equal(calculateCultivaLevel(keys.map(key => saved[key])), 51.3);
assert.equal(JSON.stringify(saved), snapshot, 'Calculation must not modify saved mode levels');
assert.equal(calculateCultivaLevel(Object.freeze([...complete])), 99);
assert.equal(calculateCultivaLevel([]), 0);
assert.equal(calculateCultivaLevel([undefined, null, NaN, Infinity, -1, '9']), 0);
assert.equal(calculateCultivaLevel([9.99, ...Array(11).fill(9)]), 99);
assert.equal(calculateCultivaLevel([8.99, ...Array(11).fill(9)]), 98.1);
console.log('[cultiva-level] 0–99 endpoints, midpoint, all 108 steps, every near-max mode, raw-sum scaling, input normalization and existing levels passed');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const profile = app.slice(app.indexOf('{profilePreviewMode &&'), app.indexOf('{customizingAvatar &&'));
assert.match(profile, /className="profile-cultiva-level" role="group" aria-label=\{`\$\{tr\('profileCultivaLevel'\)\}: \$\{cultivaLevelLabel\}`\}/);
assert.match(profile, /<strong>\{cultivaLevelLabel\}<\/strong>/, 'Profile shares the dashboard number, not a separate calculation');
assert.doesNotMatch(profile, /scoreMax|CULTIVA_MAX_LEVEL|currentScoreAria/, 'The profile must not mention the maximum, including its accessible label');
assert.match(app, /<small>\{trf\('scoreMax', \{ max: String\(CULTIVA_MAX_LEVEL\) \}\)\}<\/small>/, 'The dashboard keeps its maximum reference');
assert.match(profile, /<CultivaLeaf \/>/);
assert.doesNotMatch(profile, /localStorage\.setItem|setLevels\(/, 'Opening the profile must not rewrite saved progress');
console.log('[cultiva-level] Profile uses the shared formatted level, accessible label and leaf; maximum appears only on the dashboard; no progress rewrite');
