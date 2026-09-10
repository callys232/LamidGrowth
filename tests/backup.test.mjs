import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openStore } from '../server/store.mjs';
import { backupDatabase } from '../scripts/backup.mjs';

test('online backup includes WAL data and can reopen without changing the source', () => {
  const dir = mkdtempSync(join(tmpdir(), 'lamid-backup-'));
  const source = join(dir, 'source.db'),
    destination = join(dir, 'backup.db');
  const store = openStore(source);
  let restored;
  try {
    store.db
      .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
      .run('account', 'Backup test', new Date().toISOString());
    const manifest = backupDatabase(source, destination);
    assert.equal(manifest.sha256.length, 64);
    assert.ok(manifest.migrations.includes(5));
    restored = openStore(destination);
    assert.equal(restored.db.prepare('SELECT name FROM users').get().name, 'Backup test');
    assert.throws(() => backupDatabase(source, destination), /never overwritten/);
    assert.equal(store.db.prepare('SELECT COUNT(*) AS count FROM users').get().count, 1);
  } finally {
    restored?.db.close();
    store.db.close();
    rmSync(dir, { recursive: true, force: true });
  }
});
