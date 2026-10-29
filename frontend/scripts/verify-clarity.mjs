import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const frontend = JSON.parse(await readFile(new URL('../src/clarity-levels.json', import.meta.url), 'utf8'));
const backend = JSON.parse(await readFile(new URL('../../backend/app/clarity_levels.json', import.meta.url), 'utf8'));
assert.deepEqual(frontend, backend, 'The server and client must use exactly the same versioned clarity rubric');
const source = (await readFile(new URL('../src/clarityRubric.ts', import.meta.url), 'utf8')).replace("import rubric from './clarity-levels.json';", `const rubric = ${JSON.stringify(frontend)};`);
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
const { clarityTransition, clarityMessages, CLARITY_VERSION } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
const languages = ['es','en','zh','hi','ar','it','pt','ru','de','fr','da'];
assert.deepEqual(Object.keys(frontend.languages), languages);
assert.deepEqual(Object.keys(clarityMessages), languages);
for (const language of languages) {
  const levels = frontend.languages[language];
  assert.equal(levels.length, 10);
  for (const [index, level] of levels.entries()) {
    assert.equal(level.level, index); assert.ok(level.name.trim()); assert.ok(level.description.trim());
    if (index === 9) continue;
    const transition = clarityTransition(index, language);
    assert.deepEqual(transition.source, level);
    assert.deepEqual(transition.target, levels[index + 1]);
    assert.equal(transition.version, CLARITY_VERSION);
    assert.equal(transition.effort, index <= 2 ? 'time' : index <= 5 ? 'time_energy' : 'time_energy_investment');
  }
  for (const value of Object.values(clarityMessages[language])) assert.ok(value.trim());
}
for (const level of [-1,9,10,1.5,NaN,Infinity,null,undefined,'3',true]) assert.equal(clarityTransition(level,'es'), null);
assert.deepEqual(clarityTransition(8,'unknown'), clarityTransition(8,'es'));
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
assert.equal((app.match(/<ClarityGoal /g) ?? []).length,3, 'Custom, bank and Mode AI retain the canonical target');
assert.doesNotMatch(app, /journeySlide < 9 && <ClarityGoal/, 'Do not repeat the activity target above the journey card');
assert.ok(app.includes("nextClarity: '.journey-builder .activity-flow-target > p:first-of-type'"), 'Tour uses the remaining activity definition');
const flow = await readFile(new URL('../src/ActivityJourneyFlow.tsx', import.meta.url), 'utf8');
assert.equal((flow.match(/<aside className="activity-flow-target"/g) ?? []).length,1, 'Keep one target inside the activity workflow');
assert.match(app, /mode_name: modeName\(selectedMode\),\s+language,/);
assert.match(app, /import clarityLevels from '\.\/clarity-levels\.json'/);
const api = await readFile(new URL('../../backend/app/main.py', import.meta.url), 'utf8');
assert.equal((api.match(/activity_alignment_instruction\(request.level, request.language\)/g) ?? []).length,2, 'Authenticated and guest AI both receive server-owned next-level criteria');
console.log('[clarity] 99 transitions across 11 languages, identical client/server rubric, exact next level, effort boundaries, image-only9, one in-card target/no duplicate journey block, three authoring surfaces and both AI routes passed');
