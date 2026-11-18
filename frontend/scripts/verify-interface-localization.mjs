import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadTypeScriptModule } from './load-typescript-module.mjs';

const { APP_LANGUAGES } = await loadTypeScriptModule(new URL('../src/languagePreference.ts', import.meta.url));
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../src');
const sources = readdirSync(directory).filter(name => name.endsWith('.tsx')).map(name =>
  ts.createSourceFile(name, readFileSync(resolve(directory, name), 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX),
);
const app = sources.find(source => source.fileName === 'App.tsx');
assert.ok(app);

function objectFor(name) {
  for (const statement of app.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(app) !== name) continue;
      assert.ok(declaration.initializer && ts.isObjectLiteralExpression(declaration.initializer));
      return declaration.initializer;
    }
  }
  assert.fail(`Missing App translation catalog: ${name}`);
}
function value(object, key) {
  if (!object || !ts.isObjectLiteralExpression(object)) return;
  return object.properties.find(property => ts.isPropertyAssignment(property) &&
    (ts.isStringLiteral(property.name) || ts.isIdentifier(property.name)) && property.name.text === key)?.initializer;
}

const common = objectFor('translations');
const alternate = objectFor('extraTranslations');
const keys = new Set();
const accessibleAttributes = new Set(['aria-label', 'title', 'placeholder', 'alt']);
// These are brand marks and platform-independent file units, not interface copy.
const allowedLiteral = new Set(['Modo Cultiva', 'MC', 'MP4 / WebM · 20 MiB']);
const unexpected = [];
function collectKeys(argument) {
  if (ts.isStringLiteral(argument)) keys.add(argument.text);
  else if (ts.isConditionalExpression(argument)) {
    collectKeys(argument.whenTrue);
    collectKeys(argument.whenFalse);
  }
}
for (const source of sources) {
  function checkLiteral(text, node) {
    const normalized = text.trim().replace(/\s+/gu, ' ');
    if (!/\p{L}{2,}/u.test(normalized) || allowedLiteral.has(normalized)) return;
    const { line } = source.getLineAndCharacterOfPosition(node.getStart(source));
    unexpected.push(`${source.fileName}:${line + 1}: ${normalized}`);
  }
  function visit(node) {
    if (ts.isJsxText(node)) checkLiteral(node.getText(source), node);
    if (ts.isJsxAttribute(node) && accessibleAttributes.has(node.name.getText(source)) &&
        node.initializer && ts.isStringLiteral(node.initializer)) checkLiteral(node.initializer.text, node);
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression) &&
        ['tr', 'trf'].includes(node.expression.text) && node.arguments[0]) collectKeys(node.arguments[0]);
    ts.forEachChild(node, visit);
  }
  visit(source);
}
assert.deepEqual(unexpected, [], 'Visible JSX and accessible labels should not contain hard-coded copy');
for (const key of ['dashboardTitle', 'badges', 'login', 'activityPool', 'close']) {
  assert.ok(keys.has(key), `The audit must visit actual ${key} usage`);
}
for (const key of keys) {
  for (const language of APP_LANGUAGES) {
    const label = value(value(alternate, key), language) ?? value(value(common, language), key);
    assert.ok(label && (ts.isStringLiteral(label) || ts.isNoSubstitutionTemplateLiteral(label)) && label.text.trim(),
      `Missing explicit ${language} translation for ${key}`);
  }
}
console.log(`[interface-localization] ${keys.size} used translation keys checked in ${APP_LANGUAGES.length} languages; visible JSX and accessibility literal audit passed`);
