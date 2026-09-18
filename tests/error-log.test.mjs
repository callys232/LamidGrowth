import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createErrorLogger, readDailyErrors } from '../src/app/errorLog.mjs';

test('daily logger writes structured errors and separates UTC days', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'lamid-errors-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const output = [];
  let date = new Date('2026-09-18T23:59:59Z');
  const log = createErrorLogger({
    directory,
    now: () => date,
    stderr: (line) => output.push(line),
  });
  log('http_error', { requestId: 'abc', status: 500, path: '/api/example' });
  date = new Date('2026-09-19T00:00:00Z');
  log('worker_error', { message: 'failed' });
  assert.equal(readDailyErrors(directory, '2026-09-18').length, 1);
  assert.equal(readDailyErrors(directory, '2026-09-19')[0].event, 'worker_error');
  assert.equal(readDailyErrors(directory, '2026-09-20').length, 0);
  assert.equal(output.length, 2);
  assert.throws(() => readDailyErrors(directory, '../other'));
});
