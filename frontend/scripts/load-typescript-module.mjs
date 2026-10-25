import { readFile } from 'node:fs/promises';
import ts from 'typescript';

// Tests use the same source as the app without relying on Node's TS support.
export async function loadTypeScriptModule(url) {
  const source = await readFile(url, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } });
  return import(`data:text/javascript;base64,${Buffer.from(outputText).toString('base64')}`);
}
