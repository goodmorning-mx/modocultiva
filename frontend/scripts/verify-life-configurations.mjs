import assert from 'node:assert/strict';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { renameLifeConfiguration, persistRenamedConfiguration } = await loadTypeScriptModule(new URL('../src/lifeConfigurations.ts', import.meta.url));

const keys = ['fisico', 'intelectual', 'emocional', 'arquetipico', 'espiritual', 'romantico', 'familiar', 'social', 'financiero', 'profesional', 'ludico', 'visionario'];
const existing = JSON.parse(JSON.stringify({
  '10 de Julio': Object.fromEntries(keys.map((key, index) => [key, index % 10])),
  'Prueba Preset 1': Object.fromEntries(keys.map((key) => [key, 7])),
}));
const before = structuredClone(existing);
const renamed = renameLifeConfiguration(existing, 'Prueba Preset 1', '  Mi equilibrio  ');
assert.equal(renamed.ok, true);
const reloaded = JSON.parse(JSON.stringify(renamed.configurations));
assert.deepEqual(reloaded['Mi equilibrio'], before['Prueba Preset 1'], 'Renaming preserves all 12 saved levels');
assert.deepEqual(reloaded['10 de Julio'], before['10 de Julio'], 'Other saved configurations must be unchanged');
assert.equal(renamed.selectedName, 'Mi equilibrio');
assert.equal(reloaded['Prueba Preset 1'], undefined);
assert.deepEqual(existing, before, 'The original state must not be mutated');
assert.deepEqual(renameLifeConfiguration(existing, 'Prueba Preset 1', '10 de Julio'), { ok: false, reason: 'duplicate' });
assert.deepEqual(renameLifeConfiguration(existing, 'Prueba Preset 1', '   '), { ok: false, reason: 'empty' });
assert.deepEqual(renameLifeConfiguration(existing, 'missing', 'Nuevo'), { ok: false, reason: 'missing' });
assert.deepEqual(renameLifeConfiguration(existing, 'Prueba Preset 1', 'Prueba Preset 1').configurations, before);
const stored = new Map([['modoCultiva_presets', JSON.stringify(before)], ['modoCultiva_selectedPreset', 'Prueba Preset 1']]);
let rejectMapWrite = true;
const storage = {
  getItem: (key) => stored.get(key) ?? null,
  setItem: (key, value) => { if (rejectMapWrite && key === 'modoCultiva_presets') throw new Error('storage full'); stored.set(key, value); },
  removeItem: (key) => stored.delete(key),
};
assert.throws(() => persistRenamedConfiguration(storage, renamed.configurations, renamed.selectedName), /storage full/);
assert.equal(stored.get('modoCultiva_selectedPreset'), 'Prueba Preset 1', 'A failed write must restore the previous selection');
assert.deepEqual(JSON.parse(stored.get('modoCultiva_presets')), before);
rejectMapWrite = false;
persistRenamedConfiguration(storage, renamed.configurations, renamed.selectedName);
assert.equal(stored.get('modoCultiva_selectedPreset'), 'Mi equilibrio');
assert.deepEqual(JSON.parse(stored.get('modoCultiva_presets')), reloaded);
console.log('[configuration-check] Existing state, rename, reload, all 12 levels and collision protection passed');
