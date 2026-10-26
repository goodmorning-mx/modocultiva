import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';

const css = await readFile(new URL('../src/life-map-polish.css', import.meta.url), 'utf8');
const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const rules = await readFile(new URL('../../AGENTS.md', import.meta.url), 'utf8');
const blocks = [...css.matchAll(/\.welcome-view--polished\s*\{([^}]*--map-radius:[^}]*)\}/g)].map(match => match[1]);
assert.equal(blocks.length, 5, 'Desktop, tablet, phone, large-phone and small-phone geometry');
for (const query of ['(min-width: 681px) and (max-width: 900px)', '(max-width: 680px)', '(min-width: 500px) and (max-width: 680px)', '(max-width: 380px)']) assert.ok(css.includes(query));
assert.ok(rules.includes('Non-negotiable: Holista home map') && rules.includes('one circle'));

const token = (block, key) => block.match(new RegExp('--map-' + key + ':\\s*([^;]+);'))?.[1];
function radius(block, width) {
  const value = token(block, 'radius');
  const clamp = value.match(/^clamp\(([\d.]+)px, ([\d.]+)vw, ([\d.]+)px\)$/);
  if (clamp) return Math.min(+clamp[3], Math.max(+clamp[1], width * +clamp[2] / 100));
  if (value === 'calc((100vw - var(--map-card-width) - 4px) / 2)') return (width - parseFloat(token(block, 'card-width')) - 4) / 2;
  assert.match(value, /^[\d.]+px$/);
  return parseFloat(value);
}
const oldSizes = [[122, 94], [106, 86], [64, 50], [90, 70], [52, 44]];
for (let width = 320; width <= 1920; width++) {
  const index = width <= 380 ? 4 : width <= 680 ? (width >= 500 ? 3 : 2) : width <= 900 ? 1 : 0;
  const block = blocks[index], r = radius(block, width);
  const w = parseFloat(token(block, 'card-width')), h = parseFloat(token(block, 'card-height'));
  const a = parseFloat(token(block, 'first-angle')), b = parseFloat(token(block, 'second-angle'));
  assert.ok([r, w, h, a, b].every(Number.isFinite));
  assert.ok(w > oldSizes[index][0] && h >= oldSizes[index][1], 'Cards grow at every breakpoint');
  assert.ok(w >= 44 && h >= 44, 'Independent 44px minimum targets');
  assert.ok(a > 0 && a < b && b < 90, 'Unchanged clockwise mode order');
  const padding = Math.min(64, Math.max(20, width * .04));
  const stageWidth = width <= 680 ? width : Math.min(820, width - padding * 2);
  assert.ok(r + w / 2 <= stageWidth / 2, 'Whole circle stays visible at ' + width + 'px');
  const angles = [0, a, b, 90, 180-b, 180-a, 180, 180+a, 180+b, 270, 360-b, 360-a];
  const nodes = angles.map(angle => ({ x: Math.sin(angle * Math.PI / 180) * r, y: -Math.cos(angle * Math.PI / 180) * r }));
  for (const node of nodes) assert.ok(Math.abs(Math.hypot(node.x, node.y) - r) < 1e-8, 'One circle, never columns or an ellipse');
  for (let first = 0; first < 12; first++) for (let second = first + 1; second < 12; second++) {
    const dx = Math.abs(nodes[first].x - nodes[second].x), dy = Math.abs(nodes[first].y - nodes[second].y);
    assert.ok(dx >= w - .1 || dy >= h - .1, 'Cards overlap at ' + width + 'px: ' + first + ', ' + second);
  }
}

const stageRules = [...css.matchAll(/\.welcome-view--polished \.overview-stage\s*\{([^}]+)\}/g)].map(match => match[1]);
assert.ok(stageRules[0].includes('display: block'));
assert.ok(stageRules.every(body => !/display:\s*(grid|flex)|grid-template|flex-direction/.test(body)), 'NON-NEGOTIABLE: no alternate grid/list layout at any breakpoint');
const nameRule = css.match(/\.welcome-view--polished \.overview-mode-name\s*\{([^}]+)\}/)?.[1];
assert.ok(nameRule.includes('white-space: nowrap') && nameRule.includes('overflow: visible') && nameRule.includes('hyphens: none'));
assert.ok(!nameRule.includes('ellipsis') && !nameRule.includes('overflow-wrap: anywhere'));
for (const ordinal of [2, 3, 5, 6, 8, 9, 11, 12]) assert.ok(css.includes(':is(.overview-mode, .overview-map-guide):nth-of-type(' + ordinal + ')'), 'Card and decorative guide keep matching angles');
assert.ok(css.includes('rotate(var(--map-angle, var(--mode-angle))) translateY'));
assert.ok(css.includes('prefers-reduced-motion') && css.includes('forced-colors'));
assert.ok(app.indexOf('className="overview-mode"') < app.indexOf('className="overview-person"'), 'Original card/profile DOM order');
assert.ok(app.includes('lifeMapLabel(modeName(mode))') && app.includes("parent.closest('.overview-mode-name')"));
assert.ok(app.includes('aria-label=') && app.includes('modeName(mode)},') && app.includes("tr('level')"), 'Full accessible name remains');
const meter = app.slice(app.indexOf('className="overview-mode-meter"'), app.indexOf('className="overview-mode-meter"') + 300);
assert.ok(meter.includes('aria-hidden="true"') && meter.includes('length: 9') && meter.includes('index < levels[mode.key]'));

const labelSource = await readFile(new URL('../src/lifeMapLabel.ts', import.meta.url), 'utf8');
const output = ts.transpileModule(labelSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { lifeMapLabel } = await import('data:text/javascript;base64,' + Buffer.from(output).toString('base64'));
for (const [full, label] of [
  ['Modo Intelectual', 'Intelectual'], ['Intellectual Mode', 'Intellectual'],
  ['Modalità professionale', 'professionale'], ['Профессиональный режим', 'Профессиональный'],
  ['Archetypischer Modus', 'Archetypischer'], ['Körper-Modus', 'Körper-Modus'],
  ['Familienmodus', 'Familienmodus'], ['आर्केटाइपल मोड', 'आर्केटाइपल'],
  ['الوضع الاستشرافي', 'الاستشرافي'], ['智力模式', '智力'], ['Ludic 模式', 'Ludic'],
  ['Familiemode', 'Familiemode'], ['Mode professionnel', 'professionnel'],
]) assert.equal(lifeMapLabel(full), label, 'Only generic Mode wrapper is removed; full mode word preserved');
console.log('[life-map] 1601 widths (320–1920): larger cards, one visible Holista circle, no overlap/grid, complete nonbreaking mode words, matching guides, original order, full accessibility and meters passed');
