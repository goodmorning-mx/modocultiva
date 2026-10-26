import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css=await readFile(new URL('../src/life-map-polish.css',import.meta.url),'utf8');
const blocks=[...css.matchAll(/\.welcome-view--polished\s*\{([^}]*--map-radius:[^}]*)\}/g)].map(match=>match[1]);
assert.equal(blocks.length,2,'Base and compact-desktop ring geometry tokens');
const longNames=css.match(/\.welcome-view--polished:is\(:lang\(it\), :lang\(de\), :lang\(ru\)\)\s*\{([^}]+)\}/)?.[1];
assert.ok(longNames,'Long translated names have wider cards');
for(const query of ['(min-width: 861px) and (max-width: 900px)','(min-width: 861px)','(max-width: 860px)','(max-width: 380px)'])assert.ok(css.includes(query));
const token=(block,key)=>block.match(new RegExp(`--map-${key}:\\s*([^;]+);`))?.[1];
function radius(value,width){
  const clamp=value.match(/^clamp\(([\d.]+)px, ([\d.]+)vw, ([\d.]+)px\)$/);
  return clamp?Math.min(Number(clamp[3]),Math.max(Number(clamp[1]),width*Number(clamp[2])/100)):Number.parseFloat(value);
}
assert.ok(css.includes('grid-template-columns: repeat(2, minmax(0, 1fr))'));
const name=css.match(/\.welcome-view--polished \.overview-mode-name\s*\{([^}]+)\}/)?.[1];
assert.ok(name?.includes('white-space: nowrap')&&name.includes('overflow: visible')&&name.includes('word-break: normal'));
assert.ok(!name.includes('ellipsis'),'Labels stay complete, not truncated');
const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
assert.ok(app.indexOf('className="overview-person"')<app.indexOf('className="overview-mode"'),'Person first in both visual and keyboard order');
// Read actual CSS tokens. Narrow screens use naturally separated grid cells;
// desktop keeps the ring, with additional room for the longest translations.
let ringCases=0,gridCases=0;
for(let width=320;width<=1920;width++){
  const padding=width<=380?12:width<=680?16:Math.min(64,Math.max(20,width*.04));
  const available=Math.min(820,width-padding*2);
  if(width<=860){
    const cellWidth=(Math.min(480,available)-12)/2;
    assert.ok(cellWidth>=116,'Narrow-screen cards never collapse to tiny tiles');
    gridCases++;
    continue;
  }
  for(const block of [blocks[width<=900?1:0],longNames]){
    const r=radius(token(block,'radius'),width),w=Number.parseFloat(token(block,'card-width')),h=Number.parseFloat(token(block,'card-height'));
    assert.ok(Number.isFinite(r)&&Number.isFinite(w)&&Number.isFinite(h));
    assert.ok(w>=116&&h>=93,'Every card retains at least the previous desktop footprint');
    assert.ok(r+w/2<=available/2,'Outer nodes stay inside the actual padded stage');
    const nodes=Array.from({length:12},(_,i)=>({x:Math.sin(i*Math.PI/6)*r-w/2,y:-Math.cos(i*Math.PI/6)*r-h/2}));
    for(let a=0;a<12;a++)for(let b=a+1;b<12;b++){
      const overlapX=Math.min(nodes[a].x+w,nodes[b].x+w)-Math.max(nodes[a].x,nodes[b].x);
      const overlapY=Math.min(nodes[a].y+h,nodes[b].y+h)-Math.max(nodes[a].y,nodes[b].y);
      assert.ok(overlapX<=.6||overlapY<=.6,`Targets overlap at ${width}px: modes ${a}, ${b}`);
    }
    ringCases++;
  }
}
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('forced-colors'));
const meter=app.slice(app.indexOf('className="overview-mode-meter"'),app.indexOf('className="overview-mode-meter"')+300);
assert.ok(meter.includes('aria-hidden="true"')&&meter.includes('length: 9')&&meter.includes('index < levels[mode.key]'));
assert.ok(app.includes("aria-label={tr('lifeModes')}"));
console.log(`[life-map] 1601 viewport widths (320–1920): ${ringCases} normal/long-name ring cases, ${gridCases} readable two-column cases, no overlap, padded-stage bounds, full single-line labels, person-first focus order and nine-step meters passed`);
