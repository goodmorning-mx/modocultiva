import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/home-mode-widgets.css', import.meta.url), 'utf8');
const modeList = app.match(/const modes: Mode\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const gridStart = app.indexOf('<div className="home-mode-grid"');
const cardGrid = gridStart < 0 ? '' : app.slice(gridStart, app.indexOf('</section>', gridStart));

assert.equal((modeList.match(/\{ key: '/g) ?? []).length, 12, 'All 12 modes remain in the home data');
assert.ok(cardGrid.includes('modes.map((mode) =>'), 'Home renders the complete mode collection');
assert.ok(cardGrid.includes('className="home-mode-card"') && cardGrid.includes('onClick={() => openMode(mode)}'), 'Each mode is an independent interactive card');
assert.ok(cardGrid.includes('aria-label={`${modeName(mode)}, ${tr(\'level\')} ${level}`}'), 'Each card keeps its full accessible name and level');
assert.ok(cardGrid.includes('localizedLevelNames[language][level]'), 'Cards expose the current level label');
assert.ok(cardGrid.includes('className="home-mode-meter"') && cardGrid.includes('length: 9') && cardGrid.includes('index < level'), 'Cards show their existing nine step progress meter');
assert.ok(cardGrid.includes('data-tour-mode={mode.key}'), 'Guided tour can target every mode card');
assert.ok(app.includes('topbar--silver-home') && app.includes('className="home-silverbar-title">Modo Cultiva</span>'), 'Home uses a centered Modo Cultiva silverbar');
assert.ok(app.includes('className="home-silverbar-shortcuts"') && app.includes('tr(\'profileButton\')') && app.includes('tr(\'presets\')'), 'Profile and presets remain accessible in the silverbar');
assert.ok(!app.includes('welcome-copy') && !cardGrid.includes('home-mode-roman'), 'Home shows no heading or roman characters above tiles');

for (const breakpoint of ['@media (max-width: 900px)', '@media (max-width: 680px)', '@media (max-width: 360px)']) assert.ok(css.includes(breakpoint), 'Responsive card layout includes ' + breakpoint);
assert.match(css, /\.home-mode-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/, 'Tiles remain in a single column');
assert.match(css, /\.home-mode-card\s*\{[^}]*grid-template-columns:\s*40px minmax\(0, 1fr\) 78px 16px/, 'Mode cards use a horizontal tile layout');
assert.match(css, /\.home-mode-card\s*\{[^}]*box-shadow:/, 'Cards retain elevation and shade');
assert.match(css, /\.app-shell--zen[\s\S]*?\.home-mode-card[\s\S]*?var\(--skin-accent\)/, 'Alternate skins retain their palette accent');
assert.ok(css.includes('prefers-reduced-motion') && css.includes('forced-colors'), 'Motion and high contrast accommodations remain available');
assert.ok(!cardGrid.includes('overview-mode') && !cardGrid.includes('overview-stage'), 'Home mode selection uses the card grid');

console.log('[home-mode-cards] 12 horizontal tiles in one column, centered silverbar, level labels, meters, responsive layout, elevation, theme palette and accessibility passed');
