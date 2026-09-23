import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import pg from 'pg';
import { createTransaction, withClient, openStore } from '../server/store.mjs';
import {
  acquireDatabaseClient,
  databaseFailureResponse,
  markDatabaseError,
} from '../server/databaseErrors.mjs';

function fixture(query = async () => ({})) {
  const client = Object.assign(new EventEmitter(), {
    query,
    release: (destroy) => {
      client.destroyed = Boolean(destroy);
      client.released = true;
    },
  });
  return { client, pool: { connect: async () => client } };
}

test('rollback failure preserves the original error and discards the broken connection', async () => {
  const original = Object.assign(
    new Error('Constraint failed before rollback lost its connection'),
    { code: '23514' },
  );
  const { client, pool } = fixture(async (sql) => {
    if (sql === 'ROLLBACK') throw new Error('Rollback connection lost');
  });
  await assert.rejects(
    createTransaction(
      pool,
      'test_schema',
    )(async () => {
      throw original;
    }),
    (error) => error === original,
  );
  assert.equal(client.released, true);
  assert.equal(client.destroyed, true);
  assert.equal(client.listenerCount('error'), 0);
});

test('failed standalone database calls discard disconnected clients', async () => {
  const { client, pool } = fixture();
  const original = Object.assign(new Error('socket reset'), { code: 'ECONNRESET' });
  await assert.rejects(
    withClient(pool, 'test_schema', async () => {
      throw original;
    }),
    (error) => error === original,
  );
  assert.equal(client.destroyed, true);
});

test('acquisition retries are bounded and never retry authentication errors or saturated pools', async () => {
  let calls = 0;
  const timeout = Object.assign(new Error('connect timeout'), { code: 'ETIMEDOUT' });
  const pool = {
    waitingCount: 0,
    connect: async () => {
      calls++;
      if (calls < 2) throw timeout;
      return 'connected';
    },
  };
  assert.equal(
    await acquireDatabaseClient(pool, { attempts: 2, wait: async () => {} }),
    'connected',
  );
  assert.equal(calls, 2);
  pool.connect = async () => {
    calls++;
    throw timeout;
  };
  calls = 0;
  await assert.rejects(
    acquireDatabaseClient(pool, { attempts: 2, wait: async () => {} }),
    (error) => error === timeout,
  );
  assert.equal(calls, 2);
  pool.waitingCount = 1;
  calls = 0;
  await assert.rejects(acquireDatabaseClient(pool, { attempts: 2, wait: async () => {} }));
  assert.equal(calls, 1);
  pool.waitingCount = 0;
  calls = 0;
  pool.connect = async () => {
    calls++;
    throw Object.assign(new Error('bad password'), { code: '28P01' });
  };
  await assert.rejects(acquireDatabaseClient(pool, { attempts: 2, wait: async () => {} }));
  assert.equal(calls, 1);
});

test('database failures return a safe retryable response without masking unrelated errors', () => {
  const error = markDatabaseError(
    Object.assign(new Error('Connection terminated due to connection timeout'), {
      code: 'ETIMEDOUT',
    }),
  );
  assert.equal(databaseFailureResponse(error).status, 503);
  error.commitOutcomeUnknown = true;
  assert.match(databaseFailureResponse(error).message, /Check whether your change was saved/);
  assert.equal(databaseFailureResponse(new Error('Connection terminated unexpectedly')), null);
  assert.equal(
    databaseFailureResponse(
      markDatabaseError(Object.assign(new Error('wrong column'), { code: '42703' })),
    ),
    null,
  );
});

test('business validation errors roll back but keep a healthy connection reusable', async () => {
  const { client, pool } = fixture();
  const rejected = new Error('Invalid action');
  await assert.rejects(
    createTransaction(
      pool,
      'test_schema',
    )(async () => {
      throw rejected;
    }),
    (error) => error === rejected,
  );
  assert.equal(client.released, true);
  assert.equal(client.destroyed, false);
});

test('an uncertain commit is never replayed automatically', async () => {
  const failure = Object.assign(new Error('Connection terminated unexpectedly'), {
    code: 'ECONNRESET',
  });
  const { client, pool } = fixture(async (sql) => {
    if (sql === 'COMMIT') throw failure;
  });
  let writes = 0;
  await assert.rejects(
    createTransaction(
      pool,
      'test_schema',
    )(async () => {
      writes++;
    }),
    (error) => error === failure,
  );
  assert.equal(writes, 1);
  assert.equal(client.destroyed, true);
});

test('startup failures close both pools even when acquisition or rollback fails', async () => {
  const RealPool = pg.Pool;
  const previousURL = process.env.TEST_DATABASE_URL;
  process.env.TEST_DATABASE_URL = 'postgres://unused-for-fake-pool/test';
  try {
    for (const failurePoint of ['connect', 'migration']) {
      const instances = [];
      const original = Object.assign(
        new Error(failurePoint === 'connect' ? 'connect timeout' : 'Migration failed'),
        { code: failurePoint === 'connect' ? 'ETIMEDOUT' : '42601' },
      );
      pg.Pool = class extends EventEmitter {
        constructor(options) {
          super();
          this.options = options;
          this.index = instances.length;
          instances.push(this);
        }
        async connect() {
          if (this.index === 1 && failurePoint === 'connect') throw original;
          const { client } = fixture(async (sql) => {
            if (this.index === 1 && sql.startsWith('CREATE TABLE')) throw original;
            if (sql === 'ROLLBACK') throw new Error('Rollback failed too');
            return { rows: [], rowCount: 0 };
          });
          this.client = client;
          return client;
        }
        async end() {
          this.ended = true;
        }
      };
      await assert.rejects(openStore(failurePoint === 'connect' ? ':memory:' : 'named_reconnect_test'), (error) => error === original);
      assert.equal(instances.length, 2);
      assert.ok(instances.every((pool) => pool.ended));
      assert.ok(instances[1].options.max <= 3, 'Named test schemas must also respect the test pool cap');
      if (failurePoint === 'migration') assert.equal(instances[1].client.destroyed, true);
    }
  } finally {
    pg.Pool = RealPool;
    if (previousURL === undefined) delete process.env.TEST_DATABASE_URL;
    else process.env.TEST_DATABASE_URL = previousURL;
  }
});
