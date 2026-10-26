import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { modeAiMessage, readModeAiProposal } = await loadTypeScriptModule(new URL('../src/modeAiMessages.ts', import.meta.url));
for (const language of ['es','en','zh','hi','ar','it','pt','ru','de','fr','da']) {
  for (const key of ['context','failed','first']) assert.ok(modeAiMessage(language,key).trim().length > 10, `${language}.${key}`);
}
assert.equal(modeAiMessage('unknown','failed'),modeAiMessage('en','failed'));
for (const value of [null,undefined,[],{},false,1,'answer',{proposal:''},{proposal:'   '},{proposal:null},{proposal:42},{proposal:['text']}]) assert.equal(readModeAiProposal(value),null);
assert.equal(readModeAiProposal({proposal:'  An activity.\nA second line.  ',model:'existing'}),'An activity.\nA second line.');
const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
const studio=await readFile(new URL('../src/ModeAiStudio.tsx',import.meta.url),'utf8');
const styles=await readFile(new URL('../src/mode-ai-studio.css',import.meta.url),'utf8');
assert.ok(!app.includes('agent-runtime-strip'));
assert.ok(!studio.includes('agent-runtime-strip')&&!studio.includes('agentReady'));
assert.ok(studio.includes('disabled={props.loading || !ready}'));
assert.ok(studio.includes('aria-busy={props.loading}'));
assert.ok(app.includes('signal: controller.signal')&&app.includes('if (controller.signal.aborted) return;'));
assert.ok(styles.includes('prefers-reduced-motion'));
assert.ok(styles.includes('.journey-panel.journey-panel--mode-ai'));
console.log('[mode-ai] eleven-language feedback, valid/nonempty proposals, removed readiness strip, loading/save guards, cancellation and reduced-motion contract passed');
