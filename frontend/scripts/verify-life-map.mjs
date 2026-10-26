import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const css=await readFile(new URL('../src/life-map-polish.css',import.meta.url),'utf8');
const blocks=[...css.matchAll(/\.welcome-view--polished\s*\{([^}]*--map-radius:[^}]*)\}/g)].map(match=>match[1]);
assert.equal(blocks.length,5,'Base, tablet, phone, large-phone and small-phone geometry tokens');
for(const query of ['(min-width: 681px) and (max-width: 900px)','(max-width: 680px)','(min-width: 500px) and (max-width: 680px)','(max-width: 380px)'])assert.ok(css.includes(query));
const token=(block,key)=>block.match(new RegExp(`--map-${key}:\\s*([^;]+);`))?.[1];
function radius(value,width){
  const clamp=value.match(/^clamp\(([\d.]+)px, ([\d.]+)vw, ([\d.]+)px\)$/);
  return clamp?Math.min(Number(clamp[3]),Math.max(Number(clamp[1]),width*Number(clamp[2])/100)):Number.parseFloat(value);
}
// Read actual CSS tokens, then check every width, not only a few screenshots.
for(let width=320;width<=1920;width++){
  const block=blocks[width<=380?4:width<=680?(width>=500?3:2):width<=900?1:0];
  const r=radius(token(block,'radius'),width),w=Number.parseFloat(token(block,'card-width')),h=Number.parseFloat(token(block,'card-height'));
  assert.ok(Number.isFinite(r)&&Number.isFinite(w)&&Number.isFinite(h));
  assert.ok(w>=44&&h>=44,'Every node retains a minimum 44px target');
  assert.ok(r+w/2<=width/2,'Outer nodes stay inside the viewport');
  const nodes=Array.from({length:12},(_,i)=>({x:Math.sin(i*Math.PI/6)*r-w/2,y:-Math.cos(i*Math.PI/6)*r-h/2}));
  for(let a=0;a<12;a++)for(let b=a+1;b<12;b++){
    const overlapX=Math.min(nodes[a].x+w,nodes[b].x+w)-Math.max(nodes[a].x,nodes[b].x);
    const overlapY=Math.min(nodes[a].y+h,nodes[b].y+h)-Math.max(nodes[a].y,nodes[b].y);
    assert.ok(overlapX<=.6||overlapY<=.6,`Targets overlap at ${width}px: modes ${a}, ${b}`);
  }
}
assert.ok(css.includes('prefers-reduced-motion')&&css.includes('forced-colors'));
const app=await readFile(new URL('../src/App.tsx',import.meta.url),'utf8');
const meter=app.slice(app.indexOf('className="overview-mode-meter"'),app.indexOf('className="overview-mode-meter"')+300);
assert.ok(meter.includes('aria-hidden="true"')&&meter.includes('length: 9')&&meter.includes('index < levels[mode.key]'));
assert.ok(app.includes("aria-label={tr('lifeModes')}"));
console.log('[life-map] 1601 viewport widths (320–1920): twelve non-overlapping minimum-44px targets, bounds, CSS-driven geometry, nine-step decorative meters and accessibility contracts passed');
