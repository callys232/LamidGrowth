import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

test('production main entry stays within its JavaScript budget', (t) => {
  if (!existsSync('dist/index.html'))
    return t.skip('Build first; the release gate always builds before testing.');
  const html = readFileSync('dist/index.html', 'utf8');
  const entry = html.match(/<script[^>]*type="module"[^>]*src="([^"]+)"/);
  assert.ok(entry, 'Production entry script is missing');
  const path = resolve('dist', entry[1].replace(/^\//, ''));
  assert.ok(path.startsWith(resolve('dist') + (process.platform === 'win32' ? '\\' : '/')));
  const bytes = readFileSync(path);
  assert.ok(bytes.length <= 200000, `Main entry is ${bytes.length} bytes; budget is 200000`);
  assert.ok(gzipSync(bytes).length <= 60000, 'Gzipped main entry exceeds 60000 bytes');
});
