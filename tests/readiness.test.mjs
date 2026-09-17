import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createReadinessCheck } from '../src/app/readiness.mjs';

test('readiness bounds waiting and shares pending database work across callers', async () => {
  let calls = 0,
    resolve;
  const check = createReadinessCheck(
    {
      db: {
        prepare: () => ({
          get: () => {
            calls++;
            return new Promise((r) => {
              resolve = r;
            });
          },
        }),
      },
    },
    10,
  );
  assert.deepEqual(await Promise.all([check(), check(), check()]), [false, false, false]);
  assert.equal(calls, 1);
  resolve({ ready: 1 });
  await new Promise((r) => setImmediate(r));
  const retry = check();
  resolve({ ready: 1 });
  assert.equal(await retry, true);
  assert.equal(calls, 2);
});
