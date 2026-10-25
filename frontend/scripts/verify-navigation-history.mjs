import assert from 'node:assert/strict';
import { loadTypeScriptModule } from './load-typescript-module.mjs';
const { createNavigationHistory } = await loadTypeScriptModule(new URL('../src/navigationHistory.ts', import.meta.url));

class BrowserHistory {
  entries = [null, null];
  index = 1;
  pushes = 0;
  listener = () => {};
  get state() { return this.entries[this.index]; }
  replaceState(state) { this.entries[this.index] = structuredClone(state); }
  pushState(state) { this.entries.splice(this.index + 1); this.entries.push(structuredClone(state)); this.index += 1; this.pushes += 1; }
  go(delta) { this.index += delta; this.listener(this.state); }
}

const browser = new BrowserHistory();
const map = { screen: 'map', depth: 0 };
const journey = { screen: 'journey', depth: 1 };
const bank = { screen: 'activity-bank', depth: 2 };
let visible = map;
const navigation = createNavigationHistory(browser, map, (frame) => frame.depth, (frame) => { visible = frame; navigation.sync(frame); });
browser.listener = (state) => navigation.onPopState(state);
navigation.sync(journey);
navigation.sync(bank);
const pushesBeforeBack = browser.pushes;
browser.go(-1);
assert.deepEqual(visible, journey, 'First mobile Back must return to Journey');
browser.go(-1);
assert.deepEqual(visible, map, 'Second mobile Back must return to the overview in the app');
assert.equal(browser.index, 1, 'Back must not reach the external entry before the map');
assert.equal(browser.pushes, pushesBeforeBack, 'popstate must never manufacture new history entries');
browser.go(1);
assert.deepEqual(visible, journey, 'Forward restores the corresponding section');
browser.go(1);
assert.deepEqual(visible, bank);
navigation.sync(journey); // An in-app close button.
assert.deepEqual(visible, journey);
navigation.sync(map);
assert.deepEqual(visible, map);
navigation.sync(journey);
navigation.sync(bank);
browser.go(-1);
browser.go(-1); // Consecutive events need no React render between them.
assert.deepEqual(visible, map);
assert.equal(browser.index, 1);
navigation.sync(journey);
navigation.sync(bank);
navigation.back(); // Escape uses the same stack as mobile Back.
assert.deepEqual(visible, journey);
navigation.back();
assert.deepEqual(visible, map);
navigation.back();
assert.equal(browser.index, 1, 'Escape on the map must stay in the app');
const delayedBrowser = new BrowserHistory();
let queuedDelta = 0;
delayedBrowser.go = (delta) => { queuedDelta += delta; };
let delayedVisible = map;
const delayedNavigation = createNavigationHistory(delayedBrowser, map, (frame) => frame.depth, (frame) => { delayedVisible = frame; });
delayedNavigation.sync(journey);
delayedNavigation.sync(bank);
delayedNavigation.back();
delayedNavigation.sync(bank); // A render before asynchronous popstate must not add history.
delayedNavigation.back(); // Repeated Escape while already going Back must not skip Journey.
assert.equal(queuedDelta, -1);
assert.equal(delayedBrowser.pushes, 2);
delayedBrowser.index += queuedDelta;
delayedNavigation.onPopState(delayedBrowser.state);
assert.deepEqual(delayedVisible, journey);
console.log('[navigation-check] Bank → Journey → map, repeated Back, Forward, Escape and in-app close passed');
