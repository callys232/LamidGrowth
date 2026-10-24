import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMigrations } from '../server/migrations.mjs';

function createMigrationClient(initialVersions = []) {
  const versions = [...initialVersions];
  const calls = [];
  return {
    versions,
    calls,
    async query(sql, values = []) {
      calls.push(sql);
      if (sql === 'SELECT version FROM migrations ORDER BY version')
        return { rows: versions.map((version) => ({ version })) };
      if (sql.startsWith('INSERT INTO migrations')) {
        versions.push(values[0]);
        return { rowCount: 1, rows: [] };
      }
      return { rowCount: 0, rows: [] };
    },
  };
}

test('migrations run in declared order and are recorded after success', async () => {
  const client = createMigrationClient();
  const order = [];
  await applyMigrations(client, [
    { version: 1, name: 'base schema', up: async () => order.push('base') },
    { version: 2, name: 'add feature', up: async () => order.push('feature') },
  ]);

  assert.deepEqual(order, ['base', 'feature']);
  assert.deepEqual(client.versions, [1, 2]);
});

test('applied migrations are skipped on subsequent startups', async () => {
  const client = createMigrationClient([1, 2]);
  let ran = false;

  await applyMigrations(client, [
    { version: 1, name: 'base schema', up: async () => assert.fail('version 1 reran') },
    { version: 2, name: 'add feature', up: async () => assert.fail('version 2 reran') },
    { version: 3, name: 'new feature', up: async () => (ran = true) },
  ]);

  assert.equal(ran, true);
  assert.deepEqual(client.versions, [1, 2, 3]);
});

test('an existing baseline database receives every later migration in order', async () => {
  const client = createMigrationClient([1]);
  const order = [];
  const migrations = [
    { version: 1, name: 'base schema', up: async () => assert.fail('baseline reran') },
    { version: 2, name: 'domain schema', up: async () => order.push(2) },
    { version: 3, name: 'payment schema', up: async () => order.push(3) },
  ];

  await applyMigrations(client, migrations);
  await applyMigrations(client, migrations);

  assert.deepEqual(order, [2, 3]);
  assert.deepEqual(client.versions, [1, 2, 3]);
});

test('a failed migration is not marked as applied', async () => {
  const client = createMigrationClient();
  const failure = new Error('migration failed');

  await assert.rejects(
    applyMigrations(client, [
      {
        version: 1,
        name: 'base schema',
        up: async () => {
          throw failure;
        },
      },
    ]),
    failure,
  );
  assert.deepEqual(client.versions, []);
});

test('a database newer than the application fails explicitly', async () => {
  const client = createMigrationClient([1, 4]);

  await assert.rejects(
    applyMigrations(client, [{ version: 1, name: 'base schema', up: async () => {} }]),
    /schema version 4 is newer than this application supports/,
  );
});

test('migration versions must be strictly increasing', async () => {
  const client = createMigrationClient();

  await assert.rejects(
    applyMigrations(client, [
      { version: 2, name: 'second', up: async () => {} },
      { version: 1, name: 'first', up: async () => {} },
    ]),
    /increasing versions/,
  );
});

test('migration history cannot have an applied version after a gap', async () => {
  const client = createMigrationClient([1, 3]);

  await assert.rejects(
    applyMigrations(client, [
      { version: 1, name: 'base schema', up: async () => {} },
      { version: 2, name: 'domain schema', up: async () => {} },
      { version: 3, name: 'payment schema', up: async () => {} },
    ]),
    /history is incomplete/,
  );
});
