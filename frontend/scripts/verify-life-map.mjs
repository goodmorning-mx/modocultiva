import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const app = await readFile(new URL('../src/App.tsx', import.meta.url), 'utf8');
const css = await readFile(new URL('../src/home-mode-widgets.css', import.meta.url), 'utf8');
const modeList = app.match(/const modes: Mode\[\] = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const greetingList = app.match(/const homeGreetingPhrases = \[([\s\S]*?)\n\];/)?.[1] ?? '';
const gridStart = app.indexOf('<div className="home-mode-grid"');
const cardGrid = gridStart < 0 ? '' : app.slice(gridStart, app.indexOf('</section>', gridStart));

assert.equal((modeList.match(/\{ key: '/g) ?? []).length, 12, 'All 12 modes remain in the home data');
assert.ok(cardGrid.includes('orderedHomeModes.map((mode) =>'), 'Home renders modes in the selected sort order');
assert.ok(cardGrid.includes('className="home-mode-card"') && cardGrid.includes('onClick={() => openMode(mode)}'), 'Each mode is an independent interactive card');
assert.ok(cardGrid.includes('aria-label={`${modeName(mode)}, ${tr(\'level\')} ${level}`}'), 'Each card keeps its full accessible name and level');
assert.ok(cardGrid.includes('localizedLevelNames[language][level]'), 'Cards expose the current level label');
assert.ok(cardGrid.includes('className="home-mode-meter"') && cardGrid.includes('length: 9') && cardGrid.includes('index < level'), 'Cards show their existing nine step progress meter');
assert.ok(cardGrid.includes('data-tour-mode={mode.key}'), 'Guided tour can target every mode card');
assert.ok(app.includes('topbar--material-home') && app.includes('className="home-material-title">Modo Cultiva</span>'), 'Home uses a centered Material title bar');
assert.ok(app.includes('<h1><span>Bienvenido,</span> <strong>{displayedProfileName}</strong></h1>'), 'Home has an expanded, styled greeting for the signed in user');
assert.equal((greetingList.match(/^\s*'/gm) ?? []).length, 10, 'Home has ten friendly greeting messages');
assert.ok(app.includes('homeGreetingPhrases[Math.floor(Math.random() * homeGreetingPhrases.length)]') && app.includes('className="home-greeting-emoji" role="img"'), 'Home selects a friendly greeting and displays its welcome emoji');
assert.ok(app.includes('<p>{homeGreetingPhrase}<span className="home-greeting-emoji"') && app.includes('>👋</span>'), 'The small phone emoji follows the welcome phrase');
assert.ok(app.includes('homeSortDescending') && app.includes('levels[right.key] - levels[left.key]') && app.includes('home-sort-glyph') && app.includes('<i>↑</i><i>↓</i>'), 'Home sorts modes with an up/down arrow-only control');
assert.match(css, /\.topbar--material-home \.brand\s*\{[^}]*grid-column:\s*1/,'Current brand logo sits on the left side of the app bar');
assert.ok(app.includes('languageFlags[code]') && app.includes('{view !== \'welcome\' && <><PwaControls'), 'Home keeps only the flag language picker in its title bar');
assert.ok(!app.includes('home-silverbar-shortcuts') && !app.includes('home-silverbar-action'), 'Home title bar contains no shortcut icons');
assert.ok(!app.includes('welcome-copy') && !cardGrid.includes('home-mode-roman'), 'Home shows no heading or roman characters above tiles');

for (const breakpoint of ['@media (max-width: 900px)', '@media (max-width: 680px)', '@media (max-width: 360px)']) assert.ok(css.includes(breakpoint), 'Responsive card layout includes ' + breakpoint);
assert.match(css, /\.home-mode-grid\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)/, 'Tiles remain in a single column');
assert.match(css, /\.home-mode-card\s*\{[^}]*grid-template-columns:\s*56px minmax\(0, 1fr\) 92px 20px/, 'Mode cards use a larger horizontal tile layout');
assert.match(css, /\.home-mode-card\s*\{[^}]*min-height:\s*152px[^}]*padding:\s*20px 22px/, 'Mode tiles are tall and have generous padding');
assert.match(css, /\.home-mode-card\s*\{[^}]*box-shadow:/, 'Cards retain elevation and shade');
assert.match(css, /\.topbar--material-home\s*\{[^}]*border:\s*0[^}]*border-bottom:\s*1px/, 'Silver bar has only a bottom border');
assert.match(css, /\.home-greeting\s*\{[^}]*min-height:\s*244px/, 'Greeting header reserves room for quick actions');
assert.match(css, /\.home-greeting\s*\{[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none/, 'Greeting header is completely transparent');
assert.match(css, /\.home-greeting-heading\s*\{[^}]*margin-top:\s*24px/, 'Greeting title and phrase sit lower within the same header');
assert.match(css, /\.home-sort-button\s*\{[^}]*border:\s*0[^}]*background:\s*transparent[^}]*box-shadow:\s*none/, 'Sort arrows have a completely transparent container');
assert.match(css, /\.home-greeting\s*\{[^}]*margin:\s*0 auto 4px/, 'Sort arrows and welcome header sit close to the first mode tile');
assert.match(css, /\.home-greeting h1\s*\{[^}]*font-weight:\s*600/, 'Greeting uses Material-style semibold typography');
assert.match(css, /\.app-shell--zen[\s\S]*?\.home-mode-card[\s\S]*?var\(--skin-accent\)/, 'Alternate skins retain their palette accent');
assert.ok(css.includes('prefers-reduced-motion') && css.includes('forced-colors'), 'Motion and high contrast accommodations remain available');
assert.ok(!cardGrid.includes('overview-mode') && !cardGrid.includes('overview-stage'), 'Home mode selection uses the card grid');

console.log('[home-mode-cards] 12 large horizontal tiles in one column, centered Material title bar, user greeting, level labels, meters, responsive layout, elevation, theme palette and accessibility passed');
