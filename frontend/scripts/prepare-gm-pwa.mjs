import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const moduleRoot = resolve(frontendRoot, 'node_modules/@goodmorning/gm-pwa');
const moduleTsconfig = resolve(moduleRoot, 'frontend/tsconfig.json');
const typescriptCompiler = resolve(frontendRoot, 'node_modules/typescript/bin/tsc');

if (!existsSync(moduleTsconfig)) {
  console.warn('[gm-pwa] Package source is not installed; skipping preparation.');
  process.exit(0);
}

if (!existsSync(typescriptCompiler)) {
  console.error(`[gm-pwa] TypeScript compiler not found at ${typescriptCompiler}.`);
  process.exit(1);
}

const result = spawnSync(process.execPath, [typescriptCompiler, '-p', moduleTsconfig], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
