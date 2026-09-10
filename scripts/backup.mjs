import { DatabaseSync } from 'node:sqlite';
import { resolve, dirname } from 'node:path';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';

export function backupDatabase(sourcePath, destinationPath) {
  const source = resolve(sourcePath),
    destination = resolve(destinationPath);
  if (source === destination || existsSync(destination))
    throw new Error('Choose a new backup file; existing files are never overwritten.');
  if (!existsSync(source)) throw new Error('Source database does not exist.');
  mkdirSync(dirname(destination), { recursive: true });
  const sourceDb = new DatabaseSync(source, { readOnly: true });
  try {
    sourceDb.exec('PRAGMA busy_timeout = 5000');
    sourceDb.prepare('VACUUM INTO ?').run(destination);
  } finally {
    sourceDb.close();
  }
  const backup = new DatabaseSync(destination, { readOnly: true });
  let migrations;
  try {
    const result = backup.prepare('PRAGMA integrity_check').get();
    if (result.integrity_check !== 'ok') throw new Error('The backup failed its integrity check.');
    if (backup.prepare('PRAGMA foreign_key_check').all().length)
      throw new Error('The backup contains foreign-key violations.');
    migrations = backup
      .prepare('SELECT version FROM migrations ORDER BY version')
      .all()
      .map((row) => row.version);
  } finally {
    backup.close();
  }
  const manifest = {
    createdAt: new Date().toISOString(),
    sha256: createHash('sha256').update(readFileSync(destination)).digest('hex'),
    migrations,
  };
  writeFileSync(`${destination}.manifest.json`, JSON.stringify(manifest, null, 2), { flag: 'wx' });
  return manifest;
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const destination = process.argv[2];
  if (!destination) throw new Error('Usage: npm run backup -- <new-backup-file.db>');
  const manifest = backupDatabase(process.env.DATABASE_PATH || 'data/lamid.db', destination);
  console.log(`Verified backup created. SHA-256: ${manifest.sha256}`);
}
