import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { tmpdir } from 'node:os';
import ts from 'typescript';
import { loadTypeScriptModule } from './load-typescript-module.mjs';

const geometry = await loadTypeScriptModule(new URL('../src/guidedTourCore.ts', import.meta.url));
const messages = await loadTypeScriptModule(new URL('../src/guidedTourMessages.ts', import.meta.url));
const { tourBlackoutRects, clipTourRect, placeTourPanel, resolveTourTargets, tourNextDisabled, allTourMethodsVisited, TOUR_METHODS } = geometry;
let checks = 0;
function check(name, fn) { fn(); checks++; console.log(`PASS ${name}`); }
const area = rect => rect.width * rect.height;
const overlap = (a, b) => clipTourRect(a, b);
const inside = (x, y, rect) => x >= rect.left && x < rect.left + rect.width && y >= rect.top && y < rect.top + rect.height;
const unitStep = { id: 'methods', target: '.method', title: 'Methods', body: 'Only visits', methodChecklist: true };

check('four externally confirmed visits gate Next; duplicates do not qualify', () => {
  assert.equal(allTourMethodsVisited([]), false);
  assert.equal(allTourMethodsVisited(['custom', 'custom', 'bank', 'ai']), false);
  assert.equal(tourNextDisabled(unitStep, ['custom', 'bank', 'ai'], true), true);
  assert.equal(tourNextDisabled(unitStep, TOUR_METHODS, true), false);
  assert.equal(tourNextDisabled(unitStep, TOUR_METHODS, false), true);
  assert.equal(tourNextDisabled({ ...unitStep, nextDisabled: true }, TOUR_METHODS, true), true);
  assert.equal(tourNextDisabled({ ...unitStep, methodChecklist: false }, [], true), false);
});

check('blackout equals viewport minus the UNION, including overlapping/clipped targets', () => {
  const cases = [[], [{ left: 20, top: 20, width: 35, height: 30 }], [
    { left: -10, top: 20, width: 60, height: 30 }, { left: 30, top: 30, width: 60, height: 30 },
    { left: 40, top: 40, width: 10, height: 10 }, { left: 120, top: 90, width: 40, height: 30 },
  ]];
  for (const holes of cases) {
    const dark = tourBlackoutRects(120, 100, holes);
    for (let x = .5; x < 120; x++) for (let y = .5; y < 100; y++) {
      const lit = holes.some(rect => inside(x, y, rect));
      assert.equal(dark.filter(rect => inside(x, y, rect)).length, lit ? 0 : 1, `${x},${y}`);
    }
    assert.ok(dark.every(rect => area(rect) > 0));
  }
});

check('12 independent circle targets remain separate at 320px/tablet/desktop; panel avoids them', () => {
  for (const width of [320, 768, 1440]) {
    const height = width === 320 ? 640 : 900;
    const radius = Math.min(width * .37, 240); const center = { x: width / 2, y: Math.min(height / 2, 310) };
    const holes = Array.from({ length: 12 }, (_, index) => ({
      left: center.x + Math.cos(index * Math.PI / 6) * radius - 22,
      top: center.y + Math.sin(index * Math.PI / 6) * radius - 15, width: 44, height: 30,
    }));
    const frozen = JSON.stringify(holes);
    const dark = tourBlackoutRects(width, height, holes);
    for (const hole of holes) assert.equal(dark.some(rect => overlap(rect, hole)), false);
    for (const rtl of [false, true]) {
      const panel = placeTourPanel(width, height, holes, rtl);
      assert.ok(panel, `panel fits at ${width}`);
      assert.ok(panel.left >= 8 && panel.top >= 8 && panel.left + panel.width <= width - 8 && panel.top + panel.height <= height - 8);
      assert.equal(holes.some(hole => overlap(hole, panel)), false);
    }
    assert.equal(JSON.stringify(holes), frozen, 'geometry never rearranges targets');
  }
  assert.equal(placeTourPanel(320, 600, [{ left: 0, top: 0, width: 320, height: 600 }]), null);
});

check('missing, malformed, broad or undersized selectors fail closed', () => {
  const a = {}; const b = {}; const body = {}; const html = {};
  const scope = { body, documentElement: html, querySelectorAll(selector) {
    if (selector === '[') throw new Error('invalid');
    return ({ '.many': [a, b], body: [body], html: [html] })[selector] ?? [];
  } };
  assert.equal(resolveTourTargets([], scope).reason, 'missing');
  assert.equal(resolveTourTargets([''], scope).reason, 'invalid-selector');
  assert.equal(resolveTourTargets(['['], scope).reason, 'invalid-selector');
  assert.equal(resolveTourTargets(['.missing'], scope).reason, 'missing');
  assert.equal(resolveTourTargets(['body'], scope).reason, 'unsafe-target');
  assert.equal(resolveTourTargets(['html'], scope).reason, 'unsafe-target');
  assert.equal(resolveTourTargets([{ selector: '.many', minMatches: 12 }], scope).reason, 'missing');
  assert.equal(resolveTourTargets([{ selector: '.many', minMatches: 0 }], scope).reason, 'invalid-selector');
  assert.equal(resolveTourTargets([{ selector: '.many', minMatches: 2 }], scope).elements.length, 2);
  assert.equal(resolveTourTargets(['.many', '.many'], scope).elements.length, 2);
  assert.equal(resolveTourTargets(['.many', '.missing'], scope).elements.length, 0, 'never expose a partial selector set');
});

check('11 complete locales, 26 topics including audience choice, localized controls, exactly 3 activity stages', () => {
  assert.deepEqual(messages.TOUR_LANGUAGES, ['es', 'en', 'zh', 'hi', 'ar', 'it', 'pt', 'ru', 'de', 'fr', 'da']);
  assert.equal(messages.TOUR_STAGE_IDS.length, 26);
  for (const [language, copy] of Object.entries(messages.guidedTourMessages)) {
    assert.deepEqual(Object.keys(copy.stages).sort(), [...messages.TOUR_STAGE_IDS].sort(), language);
    assert.deepEqual(Object.keys(copy.controls).sort(), Object.keys(messages.guidedTourMessages.es.controls).sort(), language);
    assert.equal(copy.activityStages.length, 3, `${language}: Validated is a replacement label`);
    assert.ok(copy.validated);
    assert.deepEqual(Object.keys(copy.methods), [...TOUR_METHODS]);
    for (const text of Object.values(copy.controls)) assert.ok(text.trim(), language);
    for (const [id, [title, body]] of Object.entries(copy.stages)) {
      assert.ok(title.length > 3 && body.length > 20, `${language}:${id}`);
      if (language !== 'en') assert.notEqual(body, messages.guidedTourMessages.en.stages[id][1], `${language}:${id} translated`);
    }
    assert.match(copy.stages.badges[1], /108/); assert.match(copy.stages.badges[1], /120/); assert.match(copy.stages.badges[1], /99/);
    assert.match(copy.stages.badges[1], /12/); assert.match(copy.stages.badges[1], /3/);
    assert.match(copy.stages.effort[1], /0–2/); assert.match(copy.stages.effort[1], /3–5/); assert.match(copy.stages.effort[1], /6–8/);
    for (const platform of ['LinkedIn', 'WhatsApp', 'Instagram', 'Facebook']) assert.ok(copy.stages.sharing[1].includes(platform));
    assert.match(copy.stages.activityCard[1], /3/); assert.match(copy.stages.reviews[1], /3/);
    assert.match(copy.stages.bank[1], /10/); assert.match(copy.stages.vision[1], /120/);
  }
  assert.equal(messages.getGuidedTourCopy('ar-SA'), messages.guidedTourMessages.ar);
  assert.equal(messages.getGuidedTourCopy('EN_us'), messages.guidedTourMessages.en);
  assert.equal(messages.getGuidedTourCopy('unknown'), messages.guidedTourMessages.es);
  assert.match(messages.guidedTourStepCopy('en', 'nextClarity').body, /arbitrary current-level task is not enough/);
  assert.match(messages.guidedTourStepCopy('en', 'activityCard').body, /no fourth stage/);
  assert.match(messages.guidedTourStepCopy('en', 'reviews').body, /third approval validates once/);
  assert.match(messages.guidedTourStepCopy('en', 'vision').body, /image-only/);
});

const component = await readFile(new URL('../src/GuidedTour.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/guided-tour.css', import.meta.url), 'utf8');
check('engine contract: no writes/fake DOM; live event, native dialog, viewport and accessibility paths', () => {
  assert.doesNotMatch(component, /localStorage|sessionStorage|\bfetch\s*\(|XMLHttpRequest|cloneNode|dangerouslySetInnerHTML|innerHTML\s*=/);
  for (const token of ['event.isTrusted', 'onTargetInteraction', 'visualViewport', "'resize'", "'scroll'", 'requestAnimationFrame', 'AbortController', 'showPopover', 'portalRoot', 'aria-modal="false"', "'Escape'", "'ArrowLeft'", "'ArrowRight'", 'props.showCounter &&']) {
    assert.ok(component.includes(token), token);
  }
  assert.match(css, /fill: #020706/);
  assert.match(css, /pointer-events: fill/);
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /min-width: 44px; min-height: 44px/);
  const result = ts.transpileModule(component, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.length ?? 0, 0);
});
console.log(`Guided tour: ${checks} unit/contract groups passed.`);

if (process.argv.includes('--browser')) {
  const supplied = process.argv.find(arg => arg.startsWith('--playwright='))?.slice('--playwright='.length);
  const { chromium } = supplied ? await import(pathToFileURL(resolve(supplied)).href) : await import('playwright');
  const { createServer } = await import('vite');
  const root = fileURLToPath(new URL('..', import.meta.url));
  const fixtureId = resolve(root, '__tour_fixture__.tsx').replaceAll('\\', '/');
  // In-memory test fixture: never imports/edits App or touches a real account/service.
  const fixture = `
    import React, {useState, useEffect, useRef} from 'react';
    import {createRoot} from 'react-dom/client';
    import {GuidedTour} from '/src/GuidedTour.tsx';
    const stats = {actual:0, interactions:[], next:0, back:0, close:0, unavailable:[]};
    function Fixture() {
      const [open,setOpen]=useState(false), [scenario,setScenario]=useState('basic');
      const [visits,setVisits]=useState([]), [delayed,setDelayed]=useState(false);
      const [fixtureWidth,setFixtureWidth]=useState(innerWidth);
      const dialog=useRef(null);
      const methodNames=['custom','bank','ai','localContacts'];
      const buttonStyle={position:'absolute',left:24,top:24,width:88,height:44};
      useEffect(()=>{window.__tour={stats,open:()=>setOpen(true),close:()=>setOpen(false),scenario:(name)=>{setDelayed(false);setVisits([]);setScenario(name)},visits:setVisits};},[]);
      useEffect(()=>{const resize=()=>setFixtureWidth(innerWidth);addEventListener('resize',resize);return()=>removeEventListener('resize',resize)},[]);
      useEffect(()=>{if(scenario==='dialog')dialog.current.showModal();else if(dialog.current?.open)dialog.current.close();},[scenario]);
      let step={id:scenario,target:'#real',title:'A real live target',body:'Explore the actual control. No state is saved by this tour.'};
      if(scenario==='multi') step={...step,target:undefined,targets:[{selector:'.fixture-mode',minMatches:12}]};
      if(scenario==='methods') step={...step,target:undefined,targets:methodNames.map(method=>({selector:'#method-'+method,method})),methodChecklist:true};
      if(scenario==='missing') step={...step,target:'#not-mounted'};
      if(scenario==='unsafe') step={...step,target:'body'};
      if(scenario==='delayed') step={...step,target:'#delayed',onEnter:({signal})=>new Promise(resolve=>setTimeout(()=>{if(!signal.aborted)setDelayed(true);resolve()},100))};
      if(scenario==='rejected') step={...step,onEnter:()=>Promise.reject(new Error('synthetic navigation failure'))};
      if(scenario==='dialog') step={...step,target:'#dialog-real'};
      if(scenario==='scroll') step={...step,target:'#scroll-real'};
      if(scenario==='section') step={...step,target:'#real-section'};
      const realClick=()=>{stats.actual++};
      return <><button id="start" style={{position:'absolute',left:4,top:4}} onClick={()=>setOpen(true)}>Start</button>
        <button id="real" style={buttonStyle} onClick={realClick}>Real target</button>
        <button id="unrelated" style={{...buttonStyle,left:220}} onClick={()=>stats.actual+=100}>Background</button>
        {methodNames.map((method,i)=><button key={method} id={'method-'+method} style={{...buttonStyle,left:10+i*110,top:90,width:100}} onClick={()=>{realClick();setVisits(v=>[...new Set([...v,method])])}}>{method}</button>)}
        <div id="real-section" style={{position:'absolute',left:24,top:160,width:220,height:100,background:'#547b50'}}><input id="live-input" aria-label="Live text"/><button id="section-button" onClick={realClick}>Inside section</button></div>
        {scenario==='multi'&&Array.from({length:12},(_,i)=><button key={i} className="fixture-mode" style={{position:'absolute',left:fixtureWidth/2+Math.cos(i*Math.PI/6)*Math.min(110,fixtureWidth*.35)-22,top:230+Math.sin(i*Math.PI/6)*Math.min(110,fixtureWidth*.35)-15,width:44,height:30}} onClick={realClick}>{i+1}</button>)}
        {delayed&&<button id="delayed" style={buttonStyle} onClick={realClick}>Mounted later</button>}
        {scenario==='scroll'&&<button id="scroll-real" style={{...buttonStyle,top:1500}} onClick={realClick}>Scroll target</button>}
        <div style={{position:'absolute',left:innerWidth-12,top:0,width:8,height:8,overflow:'hidden'}}><dialog ref={dialog} style={{width:500,height:450}}><button id="dialog-real" style={buttonStyle} onClick={realClick}>Native modal target</button></dialog></div>
        <GuidedTour step={open?step:null} language={scenario==='rtl'?'ar':'en'} targetWaitMs={350}
          visitedMethods={visits} showCounter={scenario==='owner'} counter={{current:3,total:25}}
          onNext={()=>stats.next++} onPrevious={()=>stats.back++} onClose={()=>stats.close++}
          onTargetInteraction={e=>stats.interactions.push({id:e.stepId,method:e.method,trusted:e.event.isTrusted})}
          onTargetUnavailable={e=>stats.unavailable.push(e.reason)}/></>;
    }
    createRoot(document.getElementById('root')).render(<Fixture/>);
  `;
  const server = await createServer({ root, configFile: false, cacheDir: resolve(tmpdir(), `modo-cultiva-tour-verifier-${process.pid}`), logLevel: 'error', server: { host: '127.0.0.1', port: 0, hmr: false }, plugins: [{
    name: 'guided-tour-memory-fixture',
    resolveId(id) { if (id === '/__tour_fixture__.tsx') return fixtureId; },
    load(id) { if (id === fixtureId) return fixture; },
    configureServer(vite) { vite.middlewares.use((req, res, next) => {
      if (req.url !== '/') return next();
      res.setHeader('Content-Type', 'text/html');
      res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;min-height:1800px;background:#91b99b"><div id="root"></div><script type="module" src="/__tour_fixture__.tsx"></script></body></html>');
    }); },
  }] });
  let browser;
  try {
    await server.listen();
    const port = server.httpServer.address().port;
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 800, height: 700 }, reducedMotion: 'reduce' });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`);
    await page.waitForFunction(() => Boolean(window.__tour));
    await page.evaluate(() => localStorage.setItem('tour-preservation-fixture', JSON.stringify({ levels: [0,1,2,3,4,5,6,7,8,9,3,7], draft: 'keep me', images: ['preserved'], presets: { original: true } })));
    const saved = await page.evaluate(() => localStorage.getItem('tour-preservation-fixture'));
    await page.focus('#start'); await page.evaluate(() => window.__tour.open());
    const ready = async (outlines = 1) => { await page.waitForFunction(n => document.querySelectorAll('.guided-tour-outline').length === n, outlines); };
    const scenario = async name => { await page.evaluate(value => window.__tour.scenario(value), name); };
    await ready();
    assert.equal(await page.locator('.guided-tour-counter').count(), 0);
    await page.locator('#real').click();
    assert.equal(await page.evaluate(() => window.__tour.stats.actual), 1);
    assert.equal(await page.evaluate(() => window.__tour.stats.interactions[0].trusted), true);
    assert.equal(await page.evaluate(() => document.elementFromPoint(240, 40)?.id), '', 'background is not clickable');
    await page.locator('.guided-tour-card').focus(); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => window.__tour.stats.next), 1); assert.equal(await page.evaluate(() => window.__tour.stats.back), 1);
    await page.focus('#real'); await page.keyboard.press('ArrowRight');
    assert.equal(await page.evaluate(() => window.__tour.stats.next), 1, 'target owns its native keys');
    await page.evaluate(() => document.querySelector('#unrelated').focus());
    assert.equal(await page.evaluate(() => document.activeElement.className), 'guided-tour-card', 'background focus redirected');
    await page.keyboard.press('Tab'); assert.equal(await page.evaluate(() => document.activeElement.id), 'real');
    await page.keyboard.press('Enter'); assert.equal(await page.evaluate(() => window.__tour.stats.actual), 2);
    console.log('PASS browser: real target pointer/keyboard interaction, blackout and focus fence');

    await scenario('methods'); await ready(4);
    const next = page.getByRole('button', { name: 'Next', exact: true });
    assert.equal(await next.isDisabled(), true);
    for (const method of ['custom', 'bank', 'ai']) await page.locator('#method-' + method).click();
    assert.equal(await next.isDisabled(), true);
    await page.locator('#method-localContacts').click(); assert.equal(await next.isEnabled(), true);
    assert.equal(await page.locator('.guided-tour-methods [data-visited="true"]').count(), 4);
    assert.equal(await page.evaluate(() => window.__tour.stats.interactions.filter(e => e.method).length), 4);
    console.log('PASS browser: four real method visits, no automatic actions');

    await scenario('section'); await ready(); await page.locator('#live-input').fill('keep native typing');
    await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#live-input').inputValue(), 'keep native typing');
    await scenario('owner'); await ready(); assert.equal(await page.locator('.guided-tour-counter').innerText(), 'Step 3 of 25');
    await scenario('rtl'); await ready(); await page.locator('.guided-tour-card').focus();
    const beforeRtl = await page.evaluate(() => window.__tour.stats.next); await page.keyboard.press('ArrowLeft');
    assert.equal(await page.evaluate(() => window.__tour.stats.next), beforeRtl + 1);
    assert.equal(await page.locator('.guided-tour-layer').getAttribute('dir'), 'rtl');
    assert.equal(await page.locator('.guided-tour-card').evaluate(el => getComputedStyle(el).animationName), 'none');
    console.log('PASS browser: native input, opt-in counter, RTL and reduced motion');

    await scenario('section'); await ready();
    await page.evaluate(() => {
      for (const [key,value] of Object.entries({width:780,height:420,offsetTop:95,offsetLeft:10})) Object.defineProperty(visualViewport,key,{configurable:true,get:()=>value});
      visualViewport.dispatchEvent(new Event('resize'));
    });
    await page.waitForFunction(() => document.querySelector('.guided-tour-layer').style.top === '95px');
    assert.equal(await page.locator('.guided-tour-layer').evaluate(el => el.getBoundingClientRect().height),420);
    assert.ok(await page.evaluate(() => Math.abs(document.querySelector('.guided-tour-outline').getBoundingClientRect().left-document.querySelector('#real-section').getBoundingClientRect().left)<1));
    await page.evaluate(() => { for(const key of ['width','height','offsetTop','offsetLeft']) delete visualViewport[key]; visualViewport.dispatchEvent(new Event('resize')); });
    console.log('PASS browser: mobile visualViewport offsets/keyboard-sized viewport keep holes aligned');

    await scenario('multi'); await ready(12);
    for (const viewport of [{width:320,height:640},{width:768,height:900},{width:1440,height:900}]) {
      await page.setViewportSize(viewport); await ready(12);
      await page.waitForFunction(width => document.querySelector('.guided-tour-layer').getBoundingClientRect().width === width, viewport.width);
      const result = await page.evaluate(() => {
        const panel=document.querySelector('.guided-tour-card').getBoundingClientRect();
        return { outside: panel.left < 0 || panel.right > innerWidth || panel.top < 0 || panel.bottom > innerHeight,
          covered: [...document.querySelectorAll('.fixture-mode')].some(el=>{const r=el.getBoundingClientRect();return panel.left<r.right&&panel.right>r.left&&panel.top<r.bottom&&panel.bottom>r.top;}) };
      });
      assert.deepEqual(result, {outside:false,covered:false});
      await page.locator('.fixture-mode').first().click();
    }
    console.log('PASS browser: 12 live circle targets at 320 / 768 / 1440, panel never blocks them');

    await page.setViewportSize({width:800,height:700}); await scenario('delayed'); await ready();
    await page.locator('#delayed').click();
    for (const name of ['missing','unsafe','rejected']) {
      await scenario(name);
      await page.getByRole('button',{name:'Find section again'}).waitFor();
      assert.equal(await page.locator('.guided-tour-outline').count(),0);
      assert.equal(await page.getByRole('button',{name:'Next',exact:true}).isDisabled(),true);
      await page.getByRole('button',{name:'Find section again'}).click();
    }
    console.log('PASS browser: async navigation waits, missing/unsafe/error paths fail closed and retry');

    await scenario('dialog'); await ready();
    assert.equal(await page.locator('.guided-tour-layer').evaluate(el => Boolean(el.closest('dialog[open]'))),true);
    assert.equal(await page.locator('.guided-tour-layer').evaluate(el => el.matches(':popover-open')),true);
    await page.locator('#dialog-real').click();
    const beforeEscape = await page.evaluate(() => window.__tour.stats.close);
    await page.keyboard.press('Escape'); assert.equal(await page.evaluate(() => window.__tour.stats.close),beforeEscape+1);
    assert.equal(await page.locator('dialog').evaluate(el => el.open),true,'Escape must not dismiss the underlying dialog');
    console.log('PASS browser: native modal/top-layer host, real click, Escape isolation');

    await page.addStyleTag({ content: 'html { overflow-x: hidden; overflow-y: auto; } body { overflow-x: hidden; }' });
    await scenario('scroll'); await ready();
    assert.ok(await page.evaluate(() => scrollY > 800));
    await page.locator('#scroll-real').click();
    await page.waitForTimeout(400); // The original entry deadline has already passed.
    await page.evaluate(() => document.querySelector('#scroll-real').remove());
    await page.waitForFunction(() => document.querySelectorAll('.guided-tour-outline').length === 0);
    assert.equal(await page.getByRole('button',{name:'Find section again'}).count(),0,'newly unmounted targets receive a fresh grace period');
    await page.getByRole('button',{name:'Find section again'}).waitFor();
    assert.equal(await page.locator('.guided-tour-outline').count(),0,'unmounted live target closes every hole');
    await page.evaluate(() => window.__tour.close());
    await page.waitForFunction(() => !document.querySelector('.guided-tour-layer'));
    assert.equal(await page.evaluate(() => localStorage.getItem('tour-preservation-fixture')),saved);
    assert.equal(await page.evaluate(() => document.activeElement.id),'start','restore focus on close');
    assert.deepEqual(errors,[]);
    console.log('PASS browser: scroll-to-target, close focus restoration and preserved saved state');
    await page.close();
  } finally { await browser?.close(); await server.close(); }
}
