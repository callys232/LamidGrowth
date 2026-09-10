import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
const server = spawn(process.execPath, ['server/index.mjs', '--production'], {
  env: { ...process.env, PORT: '3101', DATABASE_PATH: ':memory:' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
try {
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error('Production server startup timed out')),
      10000,
    );
    server.once('error', reject);
    server.once('exit', (code) => {
      clearTimeout(timeout);
      reject(new Error(`Server exited with ${code}`));
    });
    server.stdout.on('data', (chunk) => {
      if (chunk.toString().includes('is ready')) {
        clearTimeout(timeout);
        resolve();
      }
    });
  });
  const response = await fetch('http://127.0.0.1:3101/');
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  const html = await response.text();
  assert.match(html, /noindex/);
  const asset = html.match(/src="([^"]+\.js)"/)[1];
  assert.equal((await fetch(`http://127.0.0.1:3101${asset}`)).status, 200);
  assert.equal((await fetch('http://127.0.0.1:3101/os/clarity')).status, 200);
  assert.equal((await fetch('http://127.0.0.1:3101/api/state')).status, 401);
  console.log('Production assets, deep links, CSP, noindex, and private API checks passed.');
} finally {
  server.kill();
}
