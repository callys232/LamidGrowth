import { test } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { openStore } from '../server/store.mjs';

const expectedTables = [
  'talent_profiles',
  'talent_assessments',
  'projects',
  'milestones',
  'deliverables',
  'scope_items',
  'acceptance_criteria',
  'change_orders',
  'submissions',
  'submission_assets',
  'verification_cases',
  'criterion_results',
  'approvals',
  'disputes',
  'kpi_definitions',
  'kpi_observations',
  'learning_paths',
  'learning_enrollments',
  'learning_modules',
  'learning_module_completions',
  'learning_prerequisites',
  'learning_certificates',
  'learning_feedback',
  'compliance_requirements',
  'conversations',
  'messages',
  'connections',
  'webhook_receipts',
  'kyc_cases',
  'identity_evidence',
];

test('migration v12 creates all new domain tables', () => {
  const store = openStore(':memory:');
  try {
    for (const table of expectedTables) {
      const columns = store.db.prepare(`PRAGMA table_info(${table})`).all();
      assert.ok(columns.length > 0, `expected table "${table}" to exist with columns`);
    }
    const version = store.db.prepare('SELECT 1 FROM migrations WHERE version = 12').get();
    assert.ok(version, 'migration version 12 should be recorded');
  } finally {
    store.db.close();
  }
});

test('new domain tables enforce foreign-key integrity', () => {
  const store = openStore(':memory:');
  try {
    assert.throws(() => {
      store.db
        .prepare('INSERT INTO milestones VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .run(
          randomUUID(),
          'not-a-real-project-id',
          'Milestone',
          '',
          100,
          'USD',
          null,
          'planned',
          new Date().toISOString(),
        );
    }, /FOREIGN KEY constraint failed/);
  } finally {
    store.db.close();
  }
});

test('new domain tables support a basic insert/select roundtrip', () => {
  const store = openStore(':memory:');
  try {
    const user = randomUUID();
    const workspace = randomUUID();
    store.db
      .prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)')
      .run(user, 'Owner', new Date().toISOString());
    store.db
      .prepare('INSERT INTO workspaces VALUES (?, ?, ?, ?, ?, ?)')
      .run(workspace, user, 'Test', 'Professional', 'individual', 1);

    const profileId = randomUUID();
    store.db
      .prepare('INSERT INTO talent_profiles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(
        profileId,
        user,
        'Growth strategist',
        JSON.stringify(['strategy', 'finance']),
        5,
        'part-time',
        150,
        'USD',
        new Date().toISOString(),
        new Date().toISOString(),
        null,
        '[]',
        null,
        'unverified',
        null,
        null,
        '[]',
        '[]',
        '[]',
        null,
      );
    const row = store.db.prepare('SELECT * FROM talent_profiles WHERE id = ?').get(profileId);
    assert.equal(row.user_id, user);
    assert.deepEqual(JSON.parse(row.skills), ['strategy', 'finance']);

    const projectId = randomUUID();
    store.db
      .prepare('INSERT INTO projects VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run(projectId, workspace, null, 'Test project', 'active', new Date().toISOString(), null, null);
    const milestoneId = randomUUID();
    store.db
      .prepare('INSERT INTO milestones VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .run(milestoneId, projectId, 'Kickoff', '', 500, 'USD', null, 'planned', new Date().toISOString());
    const milestone = store.db.prepare('SELECT * FROM milestones WHERE id = ?').get(milestoneId);
    assert.equal(milestone.project_id, projectId);
  } finally {
    store.db.close();
  }
});
