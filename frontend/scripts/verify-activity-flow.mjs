import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const cache = new Map();
// In-memory compilation: no generated source/test files and no package changes.
function sourceModule(filename) {
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} }; cache.set(filename, module);
  const source = readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020, esModuleInterop: true } });
  const localRequire = id => {
    if (!id.startsWith('.')) return require(id);
    if (id.endsWith('.css')) return {};
    const path = resolve(dirname(filename), id);
    if (id.endsWith('.json')) return JSON.parse(readFileSync(path, 'utf8'));
    return sourceModule(['.ts', '.tsx', ''].map(ext => path + ext).find(existsSync));
  };
  new Function('require', 'module', 'exports', outputText)(localRequire, module, module.exports);
  return module.exports;
}
const evidence = sourceModule(resolve(frontend, 'src/visualEvidence.ts'));
const flow = sourceModule(resolve(frontend, 'src/ActivityJourneyFlow.tsx'));
const messages = sourceModule(resolve(frontend, 'src/activityJourneyFlowMessages.ts'));
const { JourneyActivityCard } = sourceModule(resolve(frontend, 'src/JourneyActivityCard.tsx'));
const { VisualEvidenceInput } = sourceModule(resolve(frontend, 'src/VisualEvidenceInput.tsx'));
const languages = ['en', 'es', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da'];
const id = '00000000-0000-4000-8000-000000000001';
const definition = { activity: 'Practice a small routine at the same time each morning.', target_alignment: 'Repeating this routine helps me recognize myself in the next clarity description.' };
const videoDraft = { reflection: 'I carried out the activity and recorded the routine.', visual: { kind: 'video', video_asset_id: id } };
const submission = { id: 'synthetic-submission', revision: 'synthetic-revision', approvalCount: 0 };
const pending = count => ({ status: 'pending', definition, evidence: videoDraft, submission: { ...submission, approvalCount: count } });
const approved = { ...pending(3), status: 'approved' };
const card = { mode: 'Physical', level: 3, levelLabel: 'Level', stage: 'Routine', effort: 'Time + energy', activity: definition.activity, color: '#a9e5ba', icon: '✦', language: 'en' };

for (const value of [undefined, null, '', 'NETWORK', 'PUBLIC', 'everyone', true]) assert.equal(evidence.normalizeCardAudience(value), 'network');
assert.equal(evidence.normalizeCardAudience('public'), 'public');
assert.deepEqual(evidence.cardPublicationFields(undefined, true), { audience: 'network', public_confirmed: false });
assert.deepEqual(evidence.cardPublicationFields('public', true), { audience: 'public', public_confirmed: true });
for (const confirmation of [undefined, false, 'true', 1]) assert.throws(() => evidence.cardPublicationFields('public', confirmation), /public_confirmation_required/);

assert.equal(flow.activityFlowStage(3, { status: 'empty' }), 1);
for (const status of ['defined', 'evidenceDraft', 'legacyHistorical']) assert.equal(flow.activityFlowStage(3, { status, definition }), 2);
assert.equal(flow.activityFlowStage(3, { status: 'changesRequested', definition, evidence: videoDraft, submission, feedback: 'Show the full activity.' }), 2);
for (const count of [0, 1, 2, 3]) {
  assert.equal(flow.activityFlowStage(3, pending(count)), 3);
  assert.equal(flow.activityApprovalCount(pending(count)), count);
  assert.equal(flow.activityIsValidated(pending(count)), false, 'A local/snapshot count alone is not validation');
}
assert.equal(flow.activityIsValidated(approved), true);
assert.equal(flow.activityIsValidated({ ...approved, submission: { ...submission, id: '', approvalCount: 3 } }), false);
assert.equal(flow.activityIsValidated({ ...approved, submission: { ...submission, approvalCount: 2 } }), false);
for (const bad of [-1, 4, NaN, '3']) assert.equal(flow.activityApprovalCount(pending(bad)), 0);
for (const level of [-1, 9, 10, 1.5, NaN, Infinity]) {
  assert.equal(flow.activityFlowStage(level, approved), null);
  assert.equal(renderToStaticMarkup(React.createElement(flow.ActivityJourneyFlow, { sourceLevel: level, state: approved })), '');
}
assert.equal(flow.activityFlowStage(3, { ...pending(0), evidence: { reflection: videoDraft.reflection } }), 2, 'Text-only cannot enter review');
assert.equal(flow.validActivityDefinition({ ...definition, activity: 'too short' }), false);
for (const activity of ['Walk', 'x'.repeat(3001), 'x'.repeat(12000)]) {
  const saved = { ...approved, definition: { ...definition, activity } };
  assert.equal(flow.validSavedActivityDefinition(saved.definition), true);
  assert.equal(flow.activityFlowStage(3, saved), 3);
  assert.equal(flow.activityIsValidated(saved), true, 'Existing short/long saved activities retain real server approval');
}
assert.equal(flow.validSavedActivityDefinition({ ...definition, activity: 'x'.repeat(12001) }), false);
assert.equal(flow.validActivityDefinition({ activity: '界'.repeat(20), target_alignment: '🌱'.repeat(20) }), true, 'Use code points, like the server');
assert.equal(flow.validActivityDefinition({ ...definition, target_alignment: 'a'.repeat(3001) }), false);
assert.deepEqual(Object.keys(messages.activityJourneyFlowMessages).sort(), languages.toSorted());
for (const language of languages) {
  const copy = messages.activityFlowCopy(language);
  const audience = messages.cardAudienceCopy(language);
  assert.deepEqual(Object.keys(audience).sort(), Object.keys(messages.cardAudienceCopy('en')).sort());
  for (const [key, value] of Object.entries(audience)) assert.ok(value.trim(), `${language}.audience.${key}`);
  assert.equal(copy.privacy, audience.privacy);
  const publicHTML = renderToStaticMarkup(React.createElement(flow.CardAudienceControl, { language, value: 'public', confirmed: false, onChange() {}, onConfirm() {}, draft: true }));
  assert.equal((publicHTML.match(/type="radio"/g) ?? []).length, 2);
  assert.ok(publicHTML.includes('activity-flow-audience'));
  assert.ok(publicHTML.includes('type="checkbox"'));
  const networkHTML = renderToStaticMarkup(React.createElement(flow.CardAudienceControl, { language, value: 'network', confirmed: false, onChange() {}, onConfirm() {} }));
  assert.ok(!networkHTML.includes('type="checkbox"'), 'Network never implies public consent');
  assert.equal(copy.stages.length, 3);
  for (const [key, value] of Object.entries(copy)) if (typeof value === 'string') assert.ok(value.trim(), `${language}.${key}`);
  assert.deepEqual(Object.keys(copy.errors).sort(), Object.keys(messages.activityFlowCopy('en').errors).sort());
  for (const value of Object.values(copy.errors)) assert.ok(value.trim());
  for (const state of [{ status: 'empty' }, { status: 'defined', definition }, { status: 'evidenceDraft', definition, evidence: videoDraft }, pending(0), pending(1), pending(2), pending(3), approved, { status: 'changesRequested', definition, submission, feedback: 'Show the whole activity.' }, { status: 'legacyHistorical', definition }]) {
    const html = renderToStaticMarkup(React.createElement(flow.ActivityJourneyFlow, { sourceLevel: 3, state, language }));
    assert.equal((html.match(/<li /g) ?? []).length, 3, `${language}: exactly three stages`);
    assert.equal((html.match(/aria-current="step"/g) ?? []).length, 1);
    assert.ok(html.includes(language === 'ar' ? 'dir="rtl"' : 'dir="ltr"'));
    assert.ok(html.includes(copy.alignment.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#x27;')));
    if (state.status === 'approved') assert.ok(html.includes(copy.validated));
    if (state.status === 'legacyHistorical') assert.ok(html.includes(copy.legacy.replaceAll('&', '&amp;').replaceAll("'", '&#x27;')));
  }
}
assert.equal(messages.activityFlowCopy('unsupported'), messages.activityFlowCopy('en'));
const oldCard = renderToStaticMarkup(React.createElement(JourneyActivityCard, { card, current: true, defined: true, onReact() {} }));
assert.ok(!oldCard.includes('activity-journey-flow'));
assert.equal((oldCard.match(/journey-reaction--/g) ?? []).length, 5);
assert.equal((oldCard.match(/<button/g) ?? []).length, 9, 'Five unchanged reactions and four external share buttons');
const newCard = renderToStaticMarkup(React.createElement(JourneyActivityCard, { card, current: true, defined: true, onReact() {}, flow: { state: approved } }));
assert.ok(newCard.includes('activity-journey-flow'));
assert.equal((newCard.match(/<li /g) ?? []).length, 3);
assert.equal((newCard.match(/journey-reaction--/g) ?? []).length, 5);
assert.ok(!renderToStaticMarkup(React.createElement(JourneyActivityCard, { card: { ...card, level: 9 }, current: true, defined: true, onReact() {}, flow: { state: approved } })).includes('activity-journey-flow'));
const inputHTML = renderToStaticMarkup(React.createElement(VisualEvidenceInput, { value: videoDraft.visual, onChange() {}, language: 'en' }));
assert.ok(inputHTML.includes(messages.activityFlowCopy('en').videoStored));
assert.ok(renderToStaticMarkup(React.createElement(VisualEvidenceInput, { onChange() {}, language: 'en' })).includes(messages.activityFlowCopy('en').errors.videoUnavailable));
assert.ok(!inputHTML.includes('autoplay'));

assert.deepEqual(evidence.fitEvidenceDimensions(4000, 2000), { width: 1600, height: 800 });
assert.deepEqual(evidence.fitEvidenceDimensions(1000, 4000), { width: 400, height: 1600 });
assert.deepEqual(evidence.fitEvidenceDimensions(12, 8), { width: 12, height: 8 });
for (const args of [[0, 1], [-1, 1], [NaN, 1], [1, Infinity]]) assert.throws(() => evidence.fitEvidenceDimensions(...args));
assert.equal(evidence.evidenceDraftProblem({ reflection: 'too short', visual: videoDraft.visual }), 'reflectionShort');
assert.equal(evidence.evidenceDraftProblem({ reflection: videoDraft.reflection, link: 'https://example.invalid' }), 'visualRequired');
for (const link of ['http://example.invalid', 'https://user:secret@example.invalid', 'javascript:alert(1)', 'not a link']) assert.equal(evidence.evidenceDraftProblem({ ...videoDraft, link }), 'invalidLink');
assert.equal(evidence.evidenceDraftProblem({ ...videoDraft, link: 'https://example.invalid/reference' }), null);
assert.deepEqual(evidence.evidenceInputFromDraft({ ...videoDraft, previewUrl: 'blob:PRIVATE', receiptId: 'PRIVATE', approvalCount: 3, reflection: ` ${videoDraft.reflection} ` }), { reflection: videoDraft.reflection, video_asset_id: id });
assert.throws(() => evidence.evidenceInputFromDraft({ reflection: videoDraft.reflection }));
assert.throws(() => evidence.validateEvidenceVideo({ type: 'video/quicktime', size: 30 }));
for (const size of [0, evidence.MAX_EVIDENCE_VIDEO_BYTES + 1]) assert.throws(() => evidence.validateEvidenceVideo({ type: 'video/mp4', size }));
assert.equal(evidence.validateEvidenceVideo({ type: 'video/webm', size: evidence.MAX_EVIDENCE_VIDEO_BYTES }), 'video/webm');
const videoFile = new File(['synthetic-video-bytes'], 'synthetic.mp4', { type: 'video/mp4' });
const asset = { id, mime_type: 'video/mp4', byte_size: videoFile.size, sha256: 'a'.repeat(64) };
await assert.rejects(evidence.uploadVideoEvidence(videoFile, undefined, new AbortController().signal), error => error.code === 'videoUnavailable');
let resolveUpload;
let emitted = false;
const deferredUpload = evidence.uploadVideoEvidence(videoFile, () => new Promise(resolve => { resolveUpload = resolve; }), new AbortController().signal).then(value => { emitted = true; return value; });
await Promise.resolve(); assert.equal(emitted, false);
resolveUpload(asset);
assert.deepEqual(await deferredUpload, videoDraft.visual);
for (const invalid of [{ ...asset, id: 'public-url' }, { ...asset, byte_size: 7 }, { ...asset, mime_type: 'video/webm' }, { ...asset, sha256: '' }, undefined]) await assert.rejects(evidence.uploadVideoEvidence(videoFile, async () => invalid, new AbortController().signal), error => error.code === 'uploadFailed');
await assert.rejects(evidence.uploadVideoEvidence(videoFile, async () => { throw new Error('PRIVATE SERVER DETAIL'); }, new AbortController().signal), error => error.code === 'uploadFailed' && !error.message.includes('PRIVATE'));
const cancelled = new AbortController();
await assert.rejects(evidence.uploadVideoEvidence(videoFile, async () => { cancelled.abort(); return asset; }, cancelled.signal), error => error.name === 'AbortError');
const preCancelled = new AbortController(); preCancelled.abort();
await assert.rejects(evidence.uploadVideoEvidence(videoFile, async () => { throw new Error('must not call'); }, preCancelled.signal), error => error.name === 'AbortError');

// Deterministic browser API doubles exercise rescaling and bitmap cleanup.
function headerPNG(width, height, padding = 0) {
  const bytes = Buffer.alloc(45 + padding);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(bytes);
  bytes.writeUInt32BE(13, 8); bytes.write('IHDR', 12); bytes.writeUInt32BE(width, 16); bytes.writeUInt32BE(height, 20); bytes[24] = 8; bytes[25] = 6;
  return `data:image/png;base64,${bytes.toString('base64')}`;
}
let released = 0; const drawn = []; let encoded = 0;
const oldDocument = globalThis.document; const oldBitmap = globalThis.createImageBitmap;
try {
  globalThis.createImageBitmap = async () => ({ width: 4000, height: 2000, close() { released++; } });
  globalThis.document = { createElement() { return { width: 0, height: 0, getContext() { return { drawImage(...args) { drawn.push(args.slice(1)); } }; }, toDataURL() { encoded++; return headerPNG(this.width, this.height, this.width > 820 ? 310000 : 0); } }; } };
  const normalized = await evidence.normalizeEvidenceImage(new File(['synthetic'], 'still.webp', { type: 'image/webp' }));
  assert.ok(evidence.isNormalizedEvidenceImage(normalized)); assert.ok(normalized.length <= 400000); assert.ok(encoded > 1);
  assert.deepEqual(drawn[0], [0, 0, 1600, 800]);
  for (const [x, y, width, height] of drawn) { assert.equal(x, 0); assert.equal(y, 0); assert.ok(Math.abs(width / height - 2) < .01); }
  assert.equal(released, 1);
  assert.deepEqual(evidence.evidenceInputFromDraft({ reflection: videoDraft.reflection, visual: { kind: 'photo', image: normalized } }), { reflection: videoDraft.reflection, image: normalized });
  globalThis.document.createElement = () => ({ getContext: () => null });
  await assert.rejects(evidence.normalizeEvidenceImage(new File(['x'], 'x.png', { type: 'image/png' })), error => error.code === 'imageEncode');
  assert.equal(released, 2);
  const controller = new AbortController();
  globalThis.createImageBitmap = async () => { controller.abort(); return { width: 10, height: 10, close() { released++; } }; };
  await assert.rejects(evidence.normalizeEvidenceImage(new File(['x'], 'x.png', { type: 'image/png' }), controller.signal), error => error.name === 'AbortError');
  assert.equal(released, 3);
} finally { globalThis.document = oldDocument; globalThis.createImageBitmap = oldBitmap; }
assert.equal(evidence.isNormalizedEvidenceImage('data:image/svg+xml,<svg/>'), false);
assert.equal(evidence.isNormalizedEvidenceImage(headerPNG(1601, 1)), false);
assert.equal(evidence.isNormalizedEvidenceImage(headerPNG(1, 1, 310000)), false);
for (const [offset, byte] of [[24, 16], [25, 3], [28, 1]]) {
  const bytes = Buffer.from(headerPNG(10, 10).slice(22), 'base64'); bytes[offset] = byte;
  assert.equal(evidence.isNormalizedEvidenceImage(`data:image/png;base64,${bytes.toString('base64')}`), false);
}
console.log('[activity-flow] PASS: three stages, exact-three server status, feedback/fresh revision, historical label, no level9, 11 languages/RTL, old card/reactions/activity-only exports, audience/consent guards, mandatory visual, upload acknowledgement/cancellation, PNG bounds/aspect/resizing and cleanup');

if (process.argv.includes('--serve')) {
  const { createServer } = await import('vite');
  const port = Number(process.env.ACTIVITY_FLOW_FIXTURE_PORT ?? 4178);
  const server = await createServer({
    configFile: false, root: frontend, logLevel: 'error',
    plugins: [{ name: 'isolated-activity-flow-fixture', resolveId(id) { if (id === '/activity-flow-fixture.js') return '\0activity-flow-fixture'; }, load(id) { if (id === '\0activity-flow-fixture') return fixtureCode; }, configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url?.split('?')[0] !== '/activity-flow-fixture') return next();
        const html = await server.transformIndexHtml('/activity-flow-fixture', '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Isolated activity flow · synthetic fixture</title></head><body><main id="fixture"></main><div id="test-root"></div><script type="module" src="/activity-flow-fixture.js"></script></body></html>');
        response.setHeader('Content-Type', 'text/html'); response.end(html);
      });
    } }], server: { host: '127.0.0.1', port, strictPort: true },
  });
  await server.listen();
  console.log(`[activity-flow] Isolated synthetic browser fixture: http://127.0.0.1:${port}/activity-flow-fixture (no API/account/storage writes)`);
}

// This module is served only by --serve, never imported by the application.
const fixtureCode = String.raw`
import React, { act, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JourneyActivityCard } from '/src/JourneyActivityCard.tsx';
import { ActivityJourneyFlow } from '/src/ActivityJourneyFlow.tsx';
import { VisualEvidenceInput } from '/src/VisualEvidenceInput.tsx';
import { normalizeEvidenceImage, evidenceInputFromDraft } from '/src/visualEvidence.ts';
const definition = { activity: 'Practice a small routine at the same time each morning.', target_alignment: 'Repeating this routine helps me recognize myself in the next clarity description.' };
const id = '00000000-0000-4000-8000-000000000001';
const asset = { id, mime_type: 'video/mp4', byte_size: 20, sha256: 'a'.repeat(64) };
const evidence = { reflection: 'I carried out the activity and recorded the routine.', visual: { kind: 'video', video_asset_id: id } };
const submission = { id: 'synthetic', revision: 'synthetic-1', approvalCount: 0 };
const h = React.createElement;
const results = [];
function check(condition, label) { if (!condition) throw new Error(label); results.push(label); }
const style = document.createElement('style');
style.textContent = 'html{background:#061b22;color:#e9f5ed;font-family:system-ui}body{margin:0}main{box-sizing:border-box;width:min(100%,960px);margin:auto;padding:16px}h1{font-size:1.4rem}label{display:block;margin:12px 0}select,button{font:inherit;min-height:44px;max-width:100%}.journey-social-card{--mode-color:#a9e5ba;position:relative;isolation:isolate;display:block;overflow:hidden;border:1px solid #60947b66;border-radius:22px;background:#123236}.journey-social-title{font-size:2rem;margin:12px 0}.journey-social-art{z-index:-1}#test-root{position:absolute;left:-10000px;width:320px}';
document.head.append(style);
const blobFile = (canvas, type = 'image/png') => new Promise(resolve => canvas.toBlob(blob => resolve(new File([blob], 'synthetic', { type })), type));
const noisy = document.createElement('canvas'); noisy.width = 2400; noisy.height = 1200;
const ctx = noisy.getContext('2d'); const pixels = ctx.createImageData(noisy.width, noisy.height);
for (let i = 0; i < pixels.data.length; i += 4) { pixels.data[i] = (i * 17 + (i >>> 8)) & 255; pixels.data[i+1] = (i * 31 + (i >>> 7)) & 255; pixels.data[i+2] = (i * 13 + (i >>> 5)) & 255; pixels.data[i+3] = 255; }
ctx.putImageData(pixels, 0, 0);
const photo = await normalizeEvidenceImage(await blobFile(noisy));
const image = new Image(); image.src = photo; await image.decode();
check(photo.length <= 400000 && image.width <= 1600 && image.height <= 1600, 'real browser PNG is within encoded and dimension limits');
check(Math.abs(image.width / image.height - 2) < .01, 'real browser canvas preserves aspect ratio');
const bytes = Uint8Array.from(atob(photo.slice(22)), ch => ch.charCodeAt(0));
check(bytes[24] === 8 && [2,6].includes(bytes[25]) && bytes[28] === 0, 'real browser PNG is 8-bit RGB/RGBA non-interlaced');
const testRoot = createRoot(document.getElementById('test-root'));
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const testElement = document.getElementById('test-root');
const fileEvent = async file => {
  const input = testElement.querySelector('input[type=file]');
  Object.defineProperty(input, 'files', { configurable: true, value: [file] });
  await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })));
};
const previous = { kind:'photo', image: photo };
let attachments = []; let resolveUpload;
const livePreviewURLs = new Set();
const createPreviewURL = URL.createObjectURL.bind(URL), revokePreviewURL = URL.revokeObjectURL.bind(URL);
URL.createObjectURL = blob => { const url = createPreviewURL(blob); livePreviewURLs.add(url); return url; };
URL.revokeObjectURL = url => { livePreviewURLs.delete(url); revokePreviewURL(url); };
const video = new File(['synthetic-video-data'], 'synthetic.mp4', { type:'video/mp4' });
await act(async () => testRoot.render(h(VisualEvidenceInput, { value: previous, onChange: v => attachments.push(v) })));
await fileEvent(video);
check(attachments.length === 0 && testElement.textContent.includes('NOT been uploaded'), 'missing upload callback preserves attachment and gives honest availability');
await act(async () => testRoot.render(h(VisualEvidenceInput, { value: previous, onChange: v => attachments.push(v), onUploadVideo: () => new Promise(resolve => { resolveUpload = resolve; }) })));
await fileEvent(video);
check(attachments.length === 0, 'pending callback does not emit a video asset');
await act(async () => testElement.querySelector('button').click());
await act(async () => resolveUpload({ ...asset, byte_size:video.size }));
check(attachments.length === 0, 'cancelled upload cannot replace an attachment');
await fileEvent(video);
await fileEvent(new File(['not an image'], 'bad.png', { type:'image/png' }));
await act(async () => resolveUpload({ ...asset, byte_size:video.size }));
check(attachments.length === 0, 'superseded upload response cannot win a selection race');
check(testElement.querySelector('img')?.src === photo, 'failed replacement retains previous image');
await act(async () => testRoot.render(h(VisualEvidenceInput, { value: previous, onChange: v => attachments.push(v), onUploadVideo: () => new Promise(resolve => { resolveUpload = resolve; }) })));
await fileEvent(video);
let latestCallbackUsed = false;
await act(async () => testRoot.render(h(VisualEvidenceInput, { value: previous, onChange: v => { latestCallbackUsed = true; attachments.push(v); } })));
await act(async () => resolveUpload({ ...asset, byte_size:video.size }));
check(attachments.length === 1 && attachments[0].video_asset_id === id, 'successful upload emits only private asset ID');
check(latestCallbackUsed, 'upload uses the newest change callback instead of restoring an older text draft');
await act(async () => testRoot.render(h(VisualEvidenceInput, { value: attachments[0], onChange() {} })));
const player = testElement.querySelector('video');
check(player && player.controls && !player.autoplay && player.preload === 'none', 'video preview has explicit native playback without autoplay');
await act(async () => testRoot.render(h(ActivityJourneyFlow, { sourceLevel:3, state:{ status:'defined', definition }, onSubmit:async()=>{} })));
check(testElement.querySelector('button[type=submit]').disabled, 'no photo or video means submission disabled');
const submitted=[], savedAudiences=[], selections=[];let unshares=0;
const publishingProps={sourceLevel:3,activityKey:'audience-fixture',state:{status:'evidenceDraft',definition,evidence},onSubmit:async value=>{submitted.push(value);},onAudienceChange:value=>selections.push(value)};
await act(async()=>testRoot.render(h(ActivityJourneyFlow,publishingProps)));
check(testElement.querySelector('input[value=network]').checked&&!testElement.querySelector('input[type=checkbox]'),'missing audience defaults to Network without public consent');
await act(async()=>testElement.querySelector('button[type=submit]').click());
check(submitted.length===1&&submitted[0].audience==='network'&&submitted[0].public_confirmed===false,'explicit Network submission includes safe audience fields');
await act(async()=>testElement.querySelector('input[value=public]').click());
check(submitted.length===1&&selections.at(-1)==='public'&&testElement.querySelector('button[type=submit]').disabled,'Public selection alone never submits and requires explicit confirmation');
check(testElement.textContent.includes('PHOTO')&&testElement.textContent.includes('reflection')&&testElement.textContent.includes('copy'),'public warning names visual proof, reflection and copying risk');
await act(async()=>testElement.querySelector('input[type=checkbox]').click());
await act(async()=>testElement.querySelector('button[type=submit]').click());
check(submitted.length===2&&submitted[1].audience==='public'&&submitted[1].public_confirmed===true,'confirmed explicit Public submission includes real consent');
await act(async()=>testRoot.render(h(ActivityJourneyFlow,{...publishingProps,state:{...publishingProps.state,evidence:{...evidence,reflection:'A different recorded activity reflection after confirming.'}}})));
check(!testElement.querySelector('input[type=checkbox]').checked&&testElement.querySelector('button[type=submit]').disabled,'changing evidence reflection resets Public consent');
const publishedProps={...publishingProps,activityKey:'published-audience',state:{status:'approved',definition,evidence,submission:{...submission,approvalCount:3}},onSetAudience:async(...args)=>savedAudiences.push(args),onUnshare:async()=>{unshares++;}};
await act(async()=>testRoot.render(h(ActivityJourneyFlow,publishedProps)));
await act(async()=>testElement.querySelector('input[value=public]').click());
check(savedAudiences.length===0&&testElement.querySelector('.activity-flow-published-audience strong').textContent==='My network','changing published audience choice does not change current server-confirmed label');
check([...testElement.querySelectorAll('button')].find(x=>x.textContent==='Save audience').disabled,'public audience save requires fresh explicit confirmation');
await act(async()=>testElement.querySelector('input[type=checkbox]').click());
await act(async()=>[...testElement.querySelectorAll('button')].find(x=>x.textContent==='Save audience').click());
check(savedAudiences.length===1&&savedAudiences[0][0]==='public'&&savedAudiences[0][1]===true&&savedAudiences[0][2] instanceof AbortSignal,'Save audience delegates confirmed selection and cancellation signal');
check(testElement.querySelector('.activity-flow-published-audience strong').textContent==='Public · everyone'&&testElement.querySelectorAll('li').length===3,'successful server callback changes published audience without adding a fourth stage');
await act(async()=>[...testElement.querySelectorAll('button')].find(x=>x.textContent==='Unshare card').click());
check(unshares===1&&testElement.querySelector('.activity-flow-published-audience').textContent.includes('not published')&&testElement.querySelector('li:last-child').textContent.includes('Validated'),'unsharing is delegated and preserves earned validation');
await act(async () => testRoot.render(h(ActivityJourneyFlow, { sourceLevel:3, state:{ status:'pending', definition, evidence, submission:{...submission,approvalCount:3} } })));
check(testElement.querySelectorAll('li').length === 3 && !testElement.querySelector('.activity-flow-review h6').textContent.includes('Validated'), '3/3 without approved server status is still awaiting confirmation');
await act(async () => testRoot.render(h(ActivityJourneyFlow, { sourceLevel:3, state:{ status:'approved', definition, evidence, submission:{...submission,approvalCount:3} } })));
check(testElement.querySelectorAll('li').length === 3 && testElement.querySelector('li:last-child').textContent.includes('Validated'), 'third stage becomes Validated without a fourth');
await act(async () => testRoot.render(h(ActivityJourneyFlow, { sourceLevel:3, state:{ status:'changesRequested', definition, evidence, submission, feedback:'Include the full activity.' } })));
check(testElement.querySelector('li[aria-current=step]').textContent.includes('Attach') && testElement.textContent.includes('Include the full activity.'), 'changes requested returns to evidence with feedback');
check(livePreviewURLs.size === 0, 'preview blob URLs are revoked when replaced/unmounted');
URL.createObjectURL = createPreviewURL; URL.revokeObjectURL = revokePreviewURL;
await act(async () => testRoot.unmount()); globalThis.IS_REACT_ACT_ENVIRONMENT = false;
globalThis.activityFlowFixtureResults = { passed:results.length, results, photoLength:photo.length, dimensions:[image.width,image.height] };
function Fixture() {
  const query = new URLSearchParams(location.search);
  const [language,setLanguage] = useState(query.get('lang') || 'en');
  const [status,setStatus] = useState(query.get('status') || 'defined');
  const [count,setCount] = useState(Number(query.get('count') || 0));
  const [saved,setSaved] = useState(definition);
  const [draft,setDraft] = useState({ reflection:'', visual:undefined });
  const state = status === 'empty' ? {status} : { status, definition:saved, evidence:status === 'defined' || status === 'evidenceDraft' ? draft : {...evidence,visual:{kind:'photo',image:photo}}, submission:{...submission,approvalCount:status === 'approved' ? 3 : count}, feedback:'Show the whole routine and explain how it matches the next clarity description.' };
  return h(React.Fragment,null,
    h('h1',null,'Isolated activity UI · SYNTHETIC data only'),
    h('p',{id:'browser-test-results'},results.length+' browser checks passed. No network upload, votes, account or storage writes.'),
    h('label',null,'Language ',h('select',{value:language,onChange:e=>setLanguage(e.target.value)},['en','es','zh','hi','ar','it','pt','ru','de','fr','da'].map(x=>h('option',{key:x},x)))),
    h('label',null,'Server fixture status ',h('select',{value:status,onChange:e=>setStatus(e.target.value)},['empty','defined','evidenceDraft','pending','changesRequested','approved','legacyHistorical'].map(x=>h('option',{key:x},x)))),
    h('label',null,'Server fixture count ',h('select',{value:count,onChange:e=>setCount(Number(e.target.value))},[0,1,2,3].map(x=>h('option',{key:x},x)))),
    h('div',{className:'journey-level-grid--carousel'},h(JourneyActivityCard,{card:{mode:'Physical · Físico',level:3,levelLabel:'Level',stage:'Routine · Rutina',effort:'Time + energy',activity:saved.activity,color:'#a9e5ba',icon:'✦',language},current:true,defined:true,onReact(){},flow:{state,onDefine:async d=>{setSaved(d);setStatus('defined');},onDraftChange:setDraft,onSubmit:async()=>{throw new Error('This fixture never submits to an API');}}})));
}
createRoot(document.getElementById('fixture')).render(h(Fixture));
`;
