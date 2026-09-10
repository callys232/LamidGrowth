import { DatabaseSync } from 'node:sqlite';
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${hash.toString('hex')}`;
}
export async function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const actual = await scrypt(password, salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), actual);
}
export function openStore(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), { recursive: true });
  const db = new DatabaseSync(filename);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec('BEGIN IMMEDIATE');
  try {
    db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT NOT NULL, demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, verified_at INTEGER, disabled_at INTEGER, points_balance INTEGER NOT NULL DEFAULT 100);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL, workspace_id TEXT REFERENCES workspaces(id));
    CREATE TABLE IF NOT EXISTS workspaces (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL, context TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'individual', member_limit INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS workspace_members (workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL, PRIMARY KEY (workspace_id, user_id));
    CREATE TABLE IF NOT EXISTS job_posts (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), client_user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, category TEXT NOT NULL, project_type TEXT NOT NULL, description TEXT NOT NULL, deliverables TEXT NOT NULL, budget_min INTEGER NOT NULL, budget_max INTEGER NOT NULL, currency TEXT NOT NULL, timeline TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS bids (id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id), freelancer_user_id TEXT NOT NULL REFERENCES users(id), cover_letter TEXT NOT NULL, proposed_amount INTEGER NOT NULL, currency TEXT NOT NULL, timeline TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS proposals (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), job_id TEXT NOT NULL REFERENCES job_posts(id), bid_id TEXT REFERENCES bids(id), author_user_id TEXT NOT NULL REFERENCES users(id), source_type TEXT NOT NULL, title TEXT NOT NULL, scope TEXT NOT NULL, deliverables TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL, timeline TEXT NOT NULL, status TEXT NOT NULL, created_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS points_ledger (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT REFERENCES workspaces(id), amount INTEGER NOT NULL, reason TEXT NOT NULL, reference_id TEXT, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS job_posts_workspace ON job_posts(workspace_id, status, created_at);
    CREATE INDEX IF NOT EXISTS bids_job ON bids(job_id, status, created_at);
    CREATE INDEX IF NOT EXISTS proposals_job ON proposals(job_id, created_at);
    CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), kind TEXT NOT NULL, data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_workspace ON records(workspace_id, kind);
    CREATE TABLE IF NOT EXISTS audit (id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), actor TEXT NOT NULL, action TEXT NOT NULL, object_id TEXT, detail TEXT NOT NULL, created_at TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS audit_workspace ON audit(workspace_id, created_at);
    CREATE TABLE IF NOT EXISTS account_tokens (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL, token_hash TEXT UNIQUE NOT NULL, expires_at INTEGER NOT NULL, used_at INTEGER, created_at INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS account_tokens_lookup ON account_tokens(token_hash, kind, expires_at);
    INSERT OR IGNORE INTO migrations VALUES (1, datetime('now'));
    INSERT OR IGNORE INTO migrations VALUES (2, datetime('now'));`);
    const userColumns = db.prepare('PRAGMA table_info(users)').all();
    if (!userColumns.some((column) => column.name === 'verified_at'))
      db.exec('ALTER TABLE users ADD COLUMN verified_at INTEGER');
    if (!userColumns.some((column) => column.name === 'disabled_at'))
      db.exec('ALTER TABLE users ADD COLUMN disabled_at INTEGER');
    if (!userColumns.some((column) => column.name === 'points_balance'))
      db.exec('ALTER TABLE users ADD COLUMN points_balance INTEGER NOT NULL DEFAULT 100');
    const sessionColumns = db.prepare('PRAGMA table_info(sessions)').all();
    if (!sessionColumns.some((column) => column.name === 'workspace_id'))
      db.exec('ALTER TABLE sessions ADD COLUMN workspace_id TEXT REFERENCES workspaces(id)');
    const workspaceColumns = db.prepare('PRAGMA table_info(workspaces)').all();
    if (!workspaceColumns.some((column) => column.name === 'tier')) {
      db.exec("ALTER TABLE workspaces ADD COLUMN tier TEXT NOT NULL DEFAULT 'individual'");
      db.exec("UPDATE workspaces SET tier = 'enterprise' WHERE context = 'Enterprise'");
    }
    if (!workspaceColumns.some((column) => column.name === 'member_limit'))
      db.exec('ALTER TABLE workspaces ADD COLUMN member_limit INTEGER NOT NULL DEFAULT 1');
    if (!workspaceColumns.some((column) => column.name === 'tier'))
      db.exec("UPDATE workspaces SET member_limit = 200 WHERE tier = 'enterprise'");
    db.exec(
      "INSERT OR IGNORE INTO workspace_members (workspace_id, user_id, role, status, created_at) SELECT id, user_id, 'owner', 'active', strftime('%s','now') * 1000 FROM workspaces",
    );
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 3').get()) {
      db.exec(`
      CREATE TABLE idempotency (
        user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        operation TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL,
        status INTEGER NOT NULL, response TEXT NOT NULL, created_at INTEGER NOT NULL,
        PRIMARY KEY(user_id, workspace_id, operation, key)
      );
      CREATE UNIQUE INDEX bids_one_per_user_job ON bids(job_id, freelancer_user_id);
      INSERT INTO migrations VALUES (3, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 4').get()) {
      db.exec(`
      CREATE TABLE workflow_runs (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        principal_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
        objective_id TEXT NOT NULL REFERENCES records(id), state TEXT NOT NULL,
        version INTEGER NOT NULL DEFAULT 1, steps TEXT NOT NULL,
        start_at INTEGER NOT NULL, expires_at INTEGER NOT NULL,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL, reason TEXT NOT NULL DEFAULT ''
      );
      CREATE INDEX workflow_due ON workflow_runs(state, start_at);
      CREATE TABLE tool_invocations (
        id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
        step_id TEXT NOT NULL, tool_id TEXT NOT NULL, tool_version TEXT NOT NULL,
        principal_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
        input TEXT NOT NULL, output TEXT NOT NULL, created_at TEXT NOT NULL,
        UNIQUE(run_id, step_id)
      );
      INSERT INTO migrations VALUES (4, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 5').get()) {
      db.exec(`CREATE TABLE administration_audit (
      id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
      object_id TEXT NOT NULL, created_at TEXT NOT NULL
    ); INSERT INTO migrations VALUES (5, datetime('now'));`);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 6').get()) {
      db.exec(`CREATE TABLE ai_usage (
      id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
      principal_id TEXT NOT NULL, created_at INTEGER NOT NULL, status TEXT NOT NULL
    ); CREATE INDEX ai_usage_workspace_day ON ai_usage(workspace_id, created_at);
    INSERT INTO migrations VALUES (6, datetime('now'));`);
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    db.close();
    throw error;
  }
  const transaction = (work) => {
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      db.exec('COMMIT');
      return result;
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  };
  const log = (workspace, actor, action, object, detail) =>
    db
      .prepare('INSERT INTO audit VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), workspace, actor, action, object, detail, new Date().toISOString());
  const insert = (workspace, kind, data) => {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    db.prepare('INSERT INTO records VALUES (?, ?, ?, ?, 1, ?)').run(
      id,
      workspace,
      kind,
      JSON.stringify(data),
      createdAt,
    );
    return { ...data, id, version: 1, createdAt };
  };
  const records = (workspace, kind) =>
    db
      .prepare(
        'SELECT * FROM records WHERE workspace_id = ? AND kind = ? ORDER BY created_at DESC, rowid DESC',
      )
      .all(workspace, kind)
      .map((row) => ({
        ...JSON.parse(row.data),
        id: row.id,
        version: row.version,
        createdAt: row.created_at,
      }));
  return { db, transaction, log, insert, records };
}

export function seedWorkspace(store, workspace, name) {
  const { insert, log } = store;
  const due = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const first = insert(workspace, 'objective', {
    title: 'Launch our advisory practice',
    description:
      'Build a focused service for growing businesses. Validate the offer with three potential customers before investing in a full launch.',
    context: 'Founder',
    priority: 'High',
    status: 'Active',
    targetDate: due(28),
    constraints: 'Keep the initial scope small. Protect time for existing client work.',
    success: 'Three customer conversations and one validated service offer.',
  });
  const second = insert(workspace, 'objective', {
    title: 'Build a more intentional week',
    description: 'Make space for deep work and a meaningful weekly review.',
    context: 'Professional',
    priority: 'Medium',
    status: 'Active',
    targetDate: due(14),
    constraints: 'Two afternoons are reserved for client meetings.',
    success: 'Complete three focused work sessions each week.',
  });
  insert(workspace, 'action', {
    title: 'Draft the service offer',
    objectiveId: first.id,
    status: 'In progress',
    dueDate: due(1),
    owner: name,
    requiresApproval: false,
    notes: 'Describe the outcome, audience, and boundaries of the first offer.',
  });
  insert(workspace, 'action', {
    title: 'Review customer interview questions',
    objectiveId: first.id,
    status: 'Needs review',
    dueDate: due(0),
    owner: name,
    requiresApproval: true,
    notes:
      'Draft includes questions about current challenges, alternatives, and decision criteria. Review wording before using it.',
  });
  insert(workspace, 'action', {
    title: 'Schedule three discovery conversations',
    objectiveId: first.id,
    status: 'Planned',
    dueDate: due(3),
    owner: name,
    requiresApproval: false,
    notes: 'Start with existing professional connections.',
  });
  insert(workspace, 'action', {
    title: 'Protect two deep-work blocks',
    objectiveId: second.id,
    status: 'Done',
    dueDate: due(-1),
    owner: name,
    requiresApproval: false,
    notes: 'Reserved Tuesday and Thursday mornings.',
  });
  insert(workspace, 'action', {
    title: 'Write a Friday reflection',
    objectiveId: second.id,
    status: 'Planned',
    dueDate: due(4),
    owner: name,
    requiresApproval: false,
    notes: '',
  });
  log(
    workspace,
    name,
    'Sample workspace created',
    first.id,
    'Illustrative objectives and actions. No external work has been performed.',
  );
}
