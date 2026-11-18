// This fixture contains the only override of RELEASE_FREE_ACCESS.
// It runs on loopback in Vite, does not write/edit source, and produces no deployment.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const server = await createServer({
  root: frontend,
  server: { host: '127.0.0.1', port: 0, strictPort: true, hmr: false },
  plugins: [{
    name: 'locked-plans-test-fixture-only',
    enforce: 'pre',
    transform(source, id) {
      if (!id.replaceAll('\\', '/').endsWith('/src/App.tsx')) return;
      const releaseFlag = 'const RELEASE_FREE_ACCESS = true;';
      assert.equal(source.split(releaseFlag).length, 2, 'Only override the original flag in this local fixture');
      return { code: source.replace(releaseFlag, 'const RELEASE_FREE_ACCESS = false;'), map: null };
    },
  }],
});

try {
  await server.listen();
  const address = server.httpServer?.address();
  assert.ok(address && typeof address === 'object' && address.address === '127.0.0.1', 'The fixture must remain on loopback');
  const args = [
    resolve(frontend, 'scripts/verify-onboarding-integration.mjs'),
    ...process.argv.slice(2).filter(arg => !/^--(?:url|cases)(?:=|$)/.test(arg)),
    `--url=http://127.0.0.1:${address.port}`,
    '--cases=premium-access-fixture',
  ];
  process.exitCode = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, { cwd: frontend, stdio: 'inherit' });
    child.once('error', reject);
    child.once('exit', code => resolve(code ?? 1));
  });
} finally {
  await server.close();
}
