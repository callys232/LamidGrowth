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
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 7').get()) {
      db.exec(`
      CREATE TABLE agent_manifests (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, home_engine TEXT NOT NULL,
        max_authority TEXT NOT NULL, human_gate TEXT NOT NULL,
        allowed_tool_ids TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE TABLE agent_runs (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        principal_id TEXT NOT NULL REFERENCES users(id),
        agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
        input TEXT NOT NULL, output TEXT, status TEXT NOT NULL,
        created_at TEXT NOT NULL, completed_at TEXT
      );
      CREATE INDEX agent_runs_workspace ON agent_runs(workspace_id, created_at);
      INSERT INTO agent_manifests VALUES
        ('context-curator', 'Context Curator', 'Shared', 'A1', 'none', '[]', datetime('now')),
        ('diagnostic-intelligence', 'Diagnostic Intelligence', 'Clarity', 'A1', 'none', '[]', datetime('now')),
        ('workflow-orchestration', 'Workflow Orchestration', 'Consistency', 'A2', 'approve', '[]', datetime('now'));
      INSERT INTO migrations VALUES (7, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 8').get()) {
      db.exec(`
      CREATE TABLE model_registry (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, use_case TEXT NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX model_registry_use_case ON model_registry(use_case, status);
      INSERT INTO model_registry VALUES
        ('companion-context-v1', 'openai', 'companion.context-curator', 'approved', datetime('now')),
        ('companion-diagnostic-v1', 'openai', 'companion.diagnostic-intelligence', 'approved', datetime('now'));
      INSERT INTO migrations VALUES (8, datetime('now'));
    `);
    }
    const agentManifestColumns = db.prepare('PRAGMA table_info(agent_manifests)').all();
    if (!agentManifestColumns.some((column) => column.name === 'points_cost'))
      db.exec('ALTER TABLE agent_manifests ADD COLUMN points_cost INTEGER NOT NULL DEFAULT 0');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 9').get()) {
      db.exec(`
      UPDATE agent_manifests SET points_cost = 1 WHERE max_authority = 'A1';
      UPDATE agent_manifests SET points_cost = 3 WHERE max_authority = 'A2';
      INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
        ('signal-monitoring', 'Signal Monitoring', 'Shared', 'A1', 'none', '[]', datetime('now'), 1),
        ('capability-mapper', 'Capability Mapper', 'Capability', 'A1', 'none', '[]', datetime('now'), 1),
        ('performance-analytics', 'Performance Analytics', 'Growth', 'A1', 'none', '[]', datetime('now'), 1),
        ('market-intelligence', 'Market Intelligence', 'Growth', 'A1', 'none', '[]', datetime('now'), 1);
      INSERT INTO model_registry VALUES
        ('companion-signal-v1', 'openai', 'companion.signal-monitoring', 'approved', datetime('now')),
        ('companion-capability-v1', 'openai', 'companion.capability-mapper', 'approved', datetime('now')),
        ('companion-analytics-v1', 'openai', 'companion.performance-analytics', 'approved', datetime('now')),
        ('companion-market-v1', 'openai', 'companion.market-intelligence', 'approved', datetime('now'));
      INSERT INTO migrations VALUES (9, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 10').get()) {
      db.exec(`
      INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
        ('proposal-drafter', 'Proposal Drafter', 'Capability', 'A1', 'none', '[]', datetime('now'), 2);
      INSERT INTO model_registry VALUES
        ('companion-proposal-v1', 'openai', 'companion.proposal-drafter', 'approved', datetime('now'));
      INSERT INTO migrations VALUES (10, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 11').get()) {
      db.exec(`
      INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
        ('scope-builder', 'Scope of Work Builder', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('sow-builder', 'Statement of Work Builder', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('brief-builder', 'Client Brief Builder', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('deliverable-builder', 'Deliverable Builder', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('acceptance-builder', 'Acceptance Criteria Builder', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('change-order', 'Change Order Generator', 'Capability', 'A1', 'none', '[]', datetime('now'), 2),
        ('quote-generator', 'Quote Generator', 'Capability', 'A1', 'none', '[]', datetime('now'), 1),
        ('estimate-generator', 'Estimate Generator', 'Capability', 'A1', 'none', '[]', datetime('now'), 1);
      INSERT INTO model_registry VALUES
        ('companion-scope-v1', 'openai', 'companion.scope-builder', 'approved', datetime('now')),
        ('companion-sow-v1', 'openai', 'companion.sow-builder', 'approved', datetime('now')),
        ('companion-brief-v1', 'openai', 'companion.brief-builder', 'approved', datetime('now')),
        ('companion-deliverable-v1', 'openai', 'companion.deliverable-builder', 'approved', datetime('now')),
        ('companion-acceptance-v1', 'openai', 'companion.acceptance-builder', 'approved', datetime('now')),
        ('companion-change-order-v1', 'openai', 'companion.change-order', 'approved', datetime('now'));
      INSERT INTO migrations VALUES (11, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 12').get()) {
      db.exec(`
      CREATE TABLE talent_profiles (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
        headline TEXT NOT NULL DEFAULT '', skills TEXT NOT NULL DEFAULT '[]',
        experience_years INTEGER, availability TEXT, hourly_rate INTEGER, currency TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE TABLE talent_assessments (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
        skill TEXT NOT NULL, score INTEGER NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX talent_assessments_profile ON talent_assessments(profile_id);

      CREATE TABLE projects (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        job_id TEXT REFERENCES job_posts(id), title TEXT NOT NULL, status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX projects_workspace ON projects(workspace_id, status);
      CREATE TABLE milestones (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL,
        currency TEXT NOT NULL, due_date TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX milestones_project ON milestones(project_id, status);
      CREATE TABLE deliverables (
        id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE INDEX deliverables_milestone ON deliverables(milestone_id);

      CREATE TABLE scope_items (
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX scope_items_job ON scope_items(job_id);
      CREATE TABLE acceptance_criteria (
        id TEXT PRIMARY KEY, deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
        criterion TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX acceptance_criteria_deliverable ON acceptance_criteria(deliverable_id);
      CREATE TABLE change_orders (
        id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES proposals(id),
        description TEXT NOT NULL, amount_delta INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX change_orders_proposal ON change_orders(proposal_id);

      CREATE TABLE submissions (
        id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
        submitted_by TEXT NOT NULL REFERENCES users(id), notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX submissions_milestone ON submissions(milestone_id);
      CREATE TABLE submission_assets (
        id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
        url TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX submission_assets_submission ON submission_assets(submission_id);
      CREATE TABLE verification_cases (
        id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
        status TEXT NOT NULL, method TEXT NOT NULL, confidence REAL, created_at TEXT NOT NULL
      );
      CREATE INDEX verification_cases_submission ON verification_cases(submission_id);
      CREATE TABLE criterion_results (
        id TEXT PRIMARY KEY, verification_case_id TEXT NOT NULL REFERENCES verification_cases(id),
        criterion_id TEXT NOT NULL REFERENCES acceptance_criteria(id), result TEXT NOT NULL,
        rationale TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX criterion_results_case ON criterion_results(verification_case_id);

      CREATE TABLE approvals (
        id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
        approver_id TEXT NOT NULL REFERENCES users(id), decision TEXT NOT NULL,
        reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX approvals_subject ON approvals(subject_type, subject_id);
      CREATE TABLE disputes (
        id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
        opened_by TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
        status TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX disputes_subject ON disputes(subject_type, subject_id);

      CREATE TABLE kpi_definitions (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '', target REAL, created_at TEXT NOT NULL
      );
      CREATE INDEX kpi_definitions_workspace ON kpi_definitions(workspace_id);
      CREATE TABLE kpi_observations (
        id TEXT PRIMARY KEY, kpi_id TEXT NOT NULL REFERENCES kpi_definitions(id),
        value REAL NOT NULL, observed_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX kpi_observations_kpi ON kpi_observations(kpi_id, observed_at);

      CREATE TABLE learning_paths (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX learning_paths_workspace ON learning_paths(workspace_id);
      CREATE TABLE learning_enrollments (
        id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
        user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
        progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
      );
      CREATE INDEX learning_enrollments_path ON learning_enrollments(path_id, user_id);

      CREATE TABLE conversations (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        subject TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE INDEX conversations_workspace ON conversations(workspace_id, created_at);
      CREATE TABLE messages (
        id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id),
        sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX messages_conversation ON messages(conversation_id, created_at);

      CREATE TABLE connections (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        provider TEXT NOT NULL, status TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '[]',
        created_at TEXT NOT NULL
      );
      CREATE INDEX connections_workspace ON connections(workspace_id, provider);
      CREATE TABLE webhook_receipts (
        id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connections(id),
        event_type TEXT NOT NULL, payload TEXT NOT NULL, processed_at TEXT, created_at TEXT NOT NULL
      );
      CREATE INDEX webhook_receipts_connection ON webhook_receipts(connection_id, created_at);

      CREATE TABLE kyc_cases (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
        provider TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX kyc_cases_user ON kyc_cases(user_id);
      CREATE TABLE identity_evidence (
        id TEXT PRIMARY KEY, kyc_case_id TEXT NOT NULL REFERENCES kyc_cases(id),
        kind TEXT NOT NULL, reference TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX identity_evidence_case ON identity_evidence(kyc_case_id);

      INSERT INTO migrations VALUES (12, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 13').get()) {
      db.exec(`
      INSERT INTO model_registry VALUES
        ('companion-verification-v1', 'openai', 'companion.deliverable-verification', 'approved', datetime('now'));
      INSERT INTO migrations VALUES (13, datetime('now'));
    `);
    }
    const projectColumns = db.prepare('PRAGMA table_info(projects)').all();
    if (!projectColumns.some((column) => column.name === 'freelancer_user_id'))
      db.exec('ALTER TABLE projects ADD COLUMN freelancer_user_id TEXT REFERENCES users(id)');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 14').get()) {
      db.exec(`
      INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
        ('invoice-generator', 'Invoice Generator', 'Capability', 'A1', 'none', '[]', datetime('now'), 1);
      INSERT INTO migrations VALUES (14, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 15').get()) {
      db.exec(`
      CREATE TABLE payment_accounts (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        provider TEXT NOT NULL, account_name TEXT NOT NULL, account_number TEXT NOT NULL,
        bank_code TEXT, recipient_code TEXT, created_at TEXT NOT NULL
      );
      CREATE INDEX payment_accounts_user ON payment_accounts(user_id, provider);

      CREATE TABLE payment_transfers (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        milestone_id TEXT NOT NULL REFERENCES milestones(id), provider TEXT NOT NULL,
        amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, recipient_code TEXT,
        status TEXT NOT NULL, provider_reference TEXT, failure_reason TEXT,
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX payment_transfers_milestone ON payment_transfers(milestone_id);

      CREATE TABLE payment_webhook_events (
        id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_type TEXT NOT NULL,
        provider_event_id TEXT NOT NULL, payload TEXT NOT NULL,
        processed_at TEXT, created_at TEXT NOT NULL,
        UNIQUE(provider, provider_event_id)
      );

      INSERT INTO migrations VALUES (15, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 16').get()) {
      db.exec(`
      CREATE TABLE document_signatures (
        id TEXT PRIMARY KEY, agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
        signer_user_id TEXT NOT NULL REFERENCES users(id), signer_name TEXT NOT NULL,
        document_hash TEXT NOT NULL, signed_at TEXT NOT NULL, created_at TEXT NOT NULL
      );
      CREATE INDEX document_signatures_run ON document_signatures(agent_run_id);

      CREATE TABLE fx_rates (
        pair TEXT PRIMARY KEY, rate REAL NOT NULL, updated_at TEXT NOT NULL
      );
      INSERT INTO fx_rates VALUES
        ('USD_EUR', 0.92, datetime('now')), ('EUR_USD', 1.09, datetime('now')),
        ('USD_GBP', 0.79, datetime('now')), ('GBP_USD', 1.27, datetime('now')),
        ('USD_NGN', 1550, datetime('now')), ('NGN_USD', 0.000645, datetime('now')),
        ('USD_CAD', 1.36, datetime('now')), ('CAD_USD', 0.735, datetime('now')),
        ('USD_AUD', 1.51, datetime('now')), ('AUD_USD', 0.662, datetime('now'));

      INSERT INTO migrations VALUES (16, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 17').get()) {
      db.exec(`
      CREATE TABLE concierge_applications (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        headline TEXT NOT NULL, experience TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX concierge_applications_user ON concierge_applications(user_id, status);

      INSERT INTO migrations VALUES (17, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 18').get()) {
      db.exec(`
      CREATE TABLE billing_line_items (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        kind TEXT NOT NULL, description TEXT NOT NULL,
        amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
        period_start INTEGER NOT NULL, period_end INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(workspace_id, kind, period_start)
      );
      CREATE INDEX billing_line_items_workspace ON billing_line_items(workspace_id, period_start);

      INSERT INTO migrations VALUES (18, datetime('now'));
    `);
    }
    const conciergeApplicationColumns = db.prepare('PRAGMA table_info(concierge_applications)').all();
    if (!conciergeApplicationColumns.some((column) => column.name === 'monthly_rate_minor'))
      db.exec('ALTER TABLE concierge_applications ADD COLUMN monthly_rate_minor INTEGER NOT NULL DEFAULT 0');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 19').get()) {
      db.exec(`
      CREATE TABLE points_purchases (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        points INTEGER NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
        provider TEXT NOT NULL, provider_reference TEXT NOT NULL UNIQUE,
        status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL
      );
      CREATE INDEX points_purchases_user ON points_purchases(user_id, status);

      INSERT INTO migrations VALUES (19, datetime('now'));
    `);
    }
    const billingLineItemColumns = db.prepare('PRAGMA table_info(billing_line_items)').all();
    if (!billingLineItemColumns.some((column) => column.name === 'paid_at'))
      db.exec('ALTER TABLE billing_line_items ADD COLUMN paid_at TEXT');
    const talentProfileColumns = db.prepare('PRAGMA table_info(talent_profiles)').all();
    if (!talentProfileColumns.some((column) => column.name === 'location'))
      db.exec('ALTER TABLE talent_profiles ADD COLUMN location TEXT');
    if (!talentProfileColumns.some((column) => column.name === 'languages'))
      db.exec("ALTER TABLE talent_profiles ADD COLUMN languages TEXT NOT NULL DEFAULT '[]'");
    if (!talentProfileColumns.some((column) => column.name === 'portfolio_url'))
      db.exec('ALTER TABLE talent_profiles ADD COLUMN portfolio_url TEXT');
    if (!talentProfileColumns.some((column) => column.name === 'vetting_status'))
      db.exec("ALTER TABLE talent_profiles ADD COLUMN vetting_status TEXT NOT NULL DEFAULT 'unverified'");
    if (!talentProfileColumns.some((column) => column.name === 'vetted_at'))
      db.exec('ALTER TABLE talent_profiles ADD COLUMN vetted_at TEXT');
    if (!talentProfileColumns.some((column) => column.name === 'vetted_by'))
      db.exec('ALTER TABLE talent_profiles ADD COLUMN vetted_by TEXT REFERENCES users(id)');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 20').get()) {
      db.exec(`
      CREATE TABLE job_invitations (
        id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        freelancer_user_id TEXT NOT NULL REFERENCES users(id),
        invited_by TEXT NOT NULL REFERENCES users(id),
        message TEXT NOT NULL DEFAULT '',
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL, decided_at TEXT
      );
      CREATE INDEX job_invitations_job ON job_invitations(job_id, freelancer_user_id);
      CREATE INDEX job_invitations_freelancer ON job_invitations(freelancer_user_id, status);

      INSERT INTO migrations VALUES (20, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 21').get()) {
      db.exec(`
      CREATE TABLE rate_limit_buckets (
        key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at INTEGER NOT NULL
      );
      CREATE INDEX rate_limit_buckets_reset ON rate_limit_buckets(reset_at);

      INSERT INTO migrations VALUES (21, datetime('now'));
    `);
    }
    const conversationColumns = db.prepare('PRAGMA table_info(conversations)').all();
    if (!conversationColumns.some((column) => column.name === 'project_id'))
      db.exec('ALTER TABLE conversations ADD COLUMN project_id TEXT REFERENCES projects(id)');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 22').get()) {
      db.exec(`
      CREATE TABLE milestone_fundings (
        id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        provider TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL,
        provider_reference TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL, held_at TEXT, released_at TEXT
      );
      CREATE INDEX milestone_fundings_milestone ON milestone_fundings(milestone_id);

      INSERT INTO migrations VALUES (22, datetime('now'));
    `);
    }
    const milestoneFundingColumns = db.prepare('PRAGMA table_info(milestone_fundings)').all();
    if (!milestoneFundingColumns.some((column) => column.name === 'refunded_at'))
      db.exec('ALTER TABLE milestone_fundings ADD COLUMN refunded_at TEXT');
    const jobPostColumns = db.prepare('PRAGMA table_info(job_posts)').all();
    if (!jobPostColumns.some((column) => column.name === 'tags'))
      db.exec("ALTER TABLE job_posts ADD COLUMN tags TEXT NOT NULL DEFAULT '[]'");
    const talentProfileColumnsV23 = db.prepare('PRAGMA table_info(talent_profiles)').all();
    if (!talentProfileColumnsV23.some((column) => column.name === 'domains'))
      db.exec("ALTER TABLE talent_profiles ADD COLUMN domains TEXT NOT NULL DEFAULT '[]'");
    if (!talentProfileColumnsV23.some((column) => column.name === 'functions'))
      db.exec("ALTER TABLE talent_profiles ADD COLUMN functions TEXT NOT NULL DEFAULT '[]'");
    if (!talentProfileColumnsV23.some((column) => column.name === 'industries'))
      db.exec("ALTER TABLE talent_profiles ADD COLUMN industries TEXT NOT NULL DEFAULT '[]'");
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 23').get()) {
      db.exec(`
      CREATE TABLE expert_credentials (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
        type TEXT NOT NULL, title TEXT NOT NULL, issuer TEXT NOT NULL,
        issued_at TEXT, expires_at TEXT, evidence_url TEXT,
        verification_status TEXT NOT NULL DEFAULT 'pending',
        verified_at TEXT, verified_by TEXT REFERENCES users(id),
        created_at TEXT NOT NULL
      );
      CREATE INDEX expert_credentials_profile ON expert_credentials(profile_id);

      INSERT INTO migrations VALUES (23, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 24').get()) {
      db.exec(`
      CREATE TABLE bundles (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        price_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
        points_included INTEGER NOT NULL DEFAULT 0,
        billing_cycle TEXT NOT NULL DEFAULT 'one_time',
        status TEXT NOT NULL DEFAULT 'draft',
        created_by TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX bundles_status ON bundles(status);
      CREATE TABLE bundle_items (
        id TEXT PRIMARY KEY, bundle_id TEXT NOT NULL REFERENCES bundles(id),
        agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
        created_at TEXT NOT NULL
      );
      CREATE INDEX bundle_items_bundle ON bundle_items(bundle_id);

      INSERT INTO migrations VALUES (24, datetime('now'));
    `);
    }
    const pointsPurchaseColumns = db.prepare('PRAGMA table_info(points_purchases)').all();
    if (!pointsPurchaseColumns.some((column) => column.name === 'bundle_id'))
      db.exec('ALTER TABLE points_purchases ADD COLUMN bundle_id TEXT REFERENCES bundles(id)');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 25').get()) {
      // Migrations 9/10/11/14 inserted agent_manifests rows with positional VALUES written as if
      // points_cost preceded created_at. ALTER TABLE ADD COLUMN always appends physically at the
      // end, so those inserts actually landed points_cost's intended value into created_at and
      // datetime('now') into points_cost — every seeded tool from those migrations has a
      // timestamp string sitting in points_cost. Repair the known-affected rows explicitly.
      db.exec(`
      UPDATE agent_manifests SET points_cost = 1, created_at = datetime('now') WHERE id IN
        ('signal-monitoring', 'capability-mapper', 'performance-analytics', 'market-intelligence',
         'quote-generator', 'estimate-generator', 'invoice-generator');
      UPDATE agent_manifests SET points_cost = 2, created_at = datetime('now') WHERE id IN
        ('proposal-drafter', 'scope-builder', 'sow-builder', 'brief-builder', 'deliverable-builder',
         'acceptance-builder', 'change-order');
      INSERT INTO migrations VALUES (25, datetime('now'));
    `);
    }
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 26').get()) {
      db.exec(`
      CREATE TABLE reviews (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
        milestone_id TEXT NOT NULL REFERENCES milestones(id),
        reviewer_user_id TEXT NOT NULL REFERENCES users(id),
        reviewee_user_id TEXT NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX reviews_one_per_reviewer_milestone ON reviews(milestone_id, reviewer_user_id);
      CREATE INDEX reviews_reviewee ON reviews(reviewee_user_id);

      CREATE TABLE conflict_disclosures (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
        description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'disclosed',
        created_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT REFERENCES users(id)
      );
      CREATE INDEX conflict_disclosures_profile ON conflict_disclosures(profile_id, status);

      INSERT INTO migrations VALUES (26, datetime('now'));
    `);
    }
    const talentProfileColumnsV26 = db.prepare('PRAGMA table_info(talent_profiles)').all();
    if (!talentProfileColumnsV26.some((column) => column.name === 'jurisdiction'))
      db.exec('ALTER TABLE talent_profiles ADD COLUMN jurisdiction TEXT');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 27').get()) {
      db.exec(`
      CREATE TABLE scoping_cases (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        created_by TEXT NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'draft',
        objective TEXT NOT NULL DEFAULT '', problem_statement TEXT NOT NULL DEFAULT '',
        desired_outcome TEXT NOT NULL DEFAULT '', in_scope TEXT NOT NULL DEFAULT '',
        out_of_scope TEXT NOT NULL DEFAULT '', deliverables TEXT NOT NULL DEFAULT '',
        acceptance_criteria TEXT NOT NULL DEFAULT '', assumptions TEXT NOT NULL DEFAULT '',
        category TEXT, budget_context TEXT NOT NULL DEFAULT '', timeline_context TEXT NOT NULL DEFAULT '',
        risk_band TEXT NOT NULL DEFAULT 'green',
        published_job_id TEXT REFERENCES job_posts(id),
        created_at TEXT NOT NULL, updated_at TEXT NOT NULL
      );
      CREATE INDEX scoping_cases_workspace ON scoping_cases(workspace_id, status);

      INSERT INTO migrations VALUES (27, datetime('now'));
    `);
    }
    const scopingCaseColumnsV27 = db.prepare('PRAGMA table_info(scoping_cases)').all();
    if (!scopingCaseColumnsV27.some((column) => column.name === 'jurisdiction'))
      db.exec('ALTER TABLE scoping_cases ADD COLUMN jurisdiction TEXT');
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 28').get()) {
      db.exec(`
      CREATE TABLE availability_slots (
        id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
        start_at TEXT NOT NULL, end_at TEXT NOT NULL, format TEXT NOT NULL DEFAULT 'advisory_session',
        status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL
      );
      CREATE INDEX availability_slots_profile ON availability_slots(profile_id, status);

      CREATE TABLE bookings (
        id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES availability_slots(id),
        client_user_id TEXT NOT NULL REFERENCES users(id),
        expert_user_id TEXT NOT NULL REFERENCES users(id),
        project_id TEXT REFERENCES projects(id),
        status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX bookings_client ON bookings(client_user_id, status);
      CREATE INDEX bookings_expert ON bookings(expert_user_id, status);

      CREATE TABLE review_queue_entries (
        id TEXT PRIMARY KEY, scoping_case_id TEXT NOT NULL UNIQUE REFERENCES scoping_cases(id),
        risk_band TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
        claimed_by TEXT REFERENCES users(id), claimed_at TEXT, notes TEXT NOT NULL DEFAULT '',
        completed_at TEXT, created_at TEXT NOT NULL
      );
      CREATE INDEX review_queue_status ON review_queue_entries(status, created_at);

      CREATE TABLE jurisdiction_rules (
        id TEXT PRIMARY KEY, jurisdiction TEXT NOT NULL, category TEXT NOT NULL,
        requires_license INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX jurisdiction_rules_unique ON jurisdiction_rules(jurisdiction, category);

      CREATE TABLE handoffs (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        requested_by TEXT NOT NULL REFERENCES users(id),
        source TEXT NOT NULL, context_summary TEXT NOT NULL, context_snapshot TEXT NOT NULL DEFAULT '{}',
        target_user_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending',
        scoping_case_id TEXT REFERENCES scoping_cases(id), project_id TEXT REFERENCES projects(id),
        created_at TEXT NOT NULL, resolved_at TEXT
      );
      CREATE INDEX handoffs_workspace ON handoffs(workspace_id, status);
      CREATE INDEX handoffs_target ON handoffs(target_user_id, status);

      CREATE TABLE engagement_outcomes (
        id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
        workspace_id TEXT NOT NULL REFERENCES workspaces(id), created_by TEXT NOT NULL REFERENCES users(id),
        summary TEXT NOT NULL, learnings TEXT NOT NULL DEFAULT '', reusable_context TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL
      );
      CREATE INDEX engagement_outcomes_workspace ON engagement_outcomes(workspace_id, created_at);
      CREATE UNIQUE INDEX engagement_outcomes_project ON engagement_outcomes(project_id);

      CREATE TABLE expert_teams (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, lead_user_id TEXT NOT NULL REFERENCES users(id),
        description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE TABLE expert_team_members (
        id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES expert_teams(id),
        user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL DEFAULT '',
        access_scope TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX expert_team_members_unique ON expert_team_members(team_id, user_id);
      CREATE INDEX expert_team_members_user ON expert_team_members(user_id);

      INSERT INTO migrations VALUES (28, datetime('now'));
    `);
    }
    const projectColumnsV28 = db.prepare('PRAGMA table_info(projects)').all();
    if (!projectColumnsV28.some((column) => column.name === 'assigned_team_id'))
      db.exec('ALTER TABLE projects ADD COLUMN assigned_team_id TEXT REFERENCES expert_teams(id)');
    const learningPathColumnsV28 = db.prepare('PRAGMA table_info(learning_paths)').all();
    for (const [column, ddl] of [
      ['domain', "ALTER TABLE learning_paths ADD COLUMN domain TEXT"],
      ['function', "ALTER TABLE learning_paths ADD COLUMN function TEXT"],
      ['industry', "ALTER TABLE learning_paths ADD COLUMN industry TEXT"],
      ['estimated_hours', "ALTER TABLE learning_paths ADD COLUMN estimated_hours REAL"],
      ['points_cost', "ALTER TABLE learning_paths ADD COLUMN points_cost INTEGER"],
      ['language', "ALTER TABLE learning_paths ADD COLUMN language TEXT NOT NULL DEFAULT 'en'"],
      ['coach_user_id', "ALTER TABLE learning_paths ADD COLUMN coach_user_id TEXT REFERENCES users(id)"],
      ['created_by', "ALTER TABLE learning_paths ADD COLUMN created_by TEXT REFERENCES users(id)"],
    ])
      if (!learningPathColumnsV28.some((c) => c.name === column)) db.exec(ddl);
    const learningEnrollmentColumnsV28 = db.prepare('PRAGMA table_info(learning_enrollments)').all();
    for (const [column, ddl] of [
      ['assigned_by', "ALTER TABLE learning_enrollments ADD COLUMN assigned_by TEXT REFERENCES users(id)"],
      ['due_at', "ALTER TABLE learning_enrollments ADD COLUMN due_at TEXT"],
      ['completed_at', "ALTER TABLE learning_enrollments ADD COLUMN completed_at TEXT"],
    ])
      if (!learningEnrollmentColumnsV28.some((c) => c.name === column)) db.exec(ddl);
    if (!db.prepare('SELECT 1 FROM migrations WHERE version = 29').get()) {
      db.exec(`
      CREATE TABLE learning_modules (
        id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
        title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
        format TEXT NOT NULL DEFAULT 'reading', order_index INTEGER NOT NULL DEFAULT 0,
        estimated_minutes INTEGER, content_url TEXT, quiz_skill TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX learning_modules_path ON learning_modules(path_id, order_index);

      CREATE TABLE learning_module_completions (
        id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES learning_enrollments(id),
        module_id TEXT NOT NULL REFERENCES learning_modules(id),
        score INTEGER, completed_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX learning_module_completions_unique ON learning_module_completions(enrollment_id, module_id);

      CREATE TABLE learning_prerequisites (
        id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
        requires_path_id TEXT NOT NULL REFERENCES learning_paths(id)
      );
      CREATE UNIQUE INDEX learning_prerequisites_unique ON learning_prerequisites(path_id, requires_path_id);

      CREATE TABLE learning_certificates (
        id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL UNIQUE REFERENCES learning_enrollments(id),
        credential_id TEXT REFERENCES expert_credentials(id),
        issued_at TEXT NOT NULL, expires_at TEXT
      );

      CREATE TABLE learning_feedback (
        id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
        user_id TEXT NOT NULL REFERENCES users(id),
        rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX learning_feedback_unique ON learning_feedback(path_id, user_id);

      CREATE TABLE compliance_requirements (
        id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        path_id TEXT NOT NULL REFERENCES learning_paths(id),
        mandatory INTEGER NOT NULL DEFAULT 1, due_days INTEGER, created_at TEXT NOT NULL
      );
      CREATE INDEX compliance_requirements_workspace ON compliance_requirements(workspace_id);

      INSERT INTO migrations VALUES (29, datetime('now'));
    `);
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
