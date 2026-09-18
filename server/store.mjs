import pg from 'pg';
import { randomUUID, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { AsyncLocalStorage } from 'node:async_hooks';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

// This module is the one common dependency of every entry point that needs DATABASE_URL
// (the production server, the e2e server, and every test file run directly via `node --test`,
// none of which otherwise load .env themselves) — loading it here, once, guarantees it's always
// set before the first openStore() call. Safe no-op in real deployments with no .env file.
if (existsSync('.env')) process.loadEnvFile('.env');

// Supabase's pooler presents a certificate chain rooted at its own (self-signed) CA, not one in
// Node's default trust store — `rejectUnauthorized: false` previously accepted ANY certificate
// from anyone, silently disabling TLS verification entirely (MITM-vulnerable). Pinning Supabase's
// actual public root CA here restores real verification. This is Supabase-specific by design —
// this codebase is built around Supabase's Session Pooler throughout — so migrating to a
// different Postgres host later means swapping this file, not just the connection string.
const SUPABASE_CA = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'supabase-ca.pem'), 'utf8');
const sslConfig = { rejectUnauthorized: true, ca: SUPABASE_CA };

// pg returns BIGINT (OID 20) as strings by default, to avoid silently losing precision beyond
// Number.MAX_SAFE_INTEGER. Every BIGINT column in this schema holds an epoch-millisecond
// timestamp (Date.now()-based), safely within that range for millennia, and the app expects
// plain numbers here — node:sqlite always returned proper numbers. Parsing globally, once, means
// no call site anywhere in the app needs to know or care that the column type changed.
pg.types.setTypeParser(20, (value) => parseInt(value, 10));
// Same story for NUMERIC (OID 1700) — Postgres's AVG() over an integer column (e.g. AVG(rating))
// returns NUMERIC, which pg also stringifies by default ("5.0000000000000000" instead of 5).
// There are no arbitrary-precision NUMERIC/DECIMAL business columns in this schema — every use is
// an AVG() aggregate over small rating values — so a plain float is always safe here too.
pg.types.setTypeParser(1700, (value) => parseFloat(value));

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

// Every call site across the app writes `?`-style positional placeholders (the SQLite
// convention). Translating them to Postgres's `$1,$2,...` here, once, means ~390 of the ~405
// query call sites outside this file need zero textual changes for the Postgres migration.
function toPgSql(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

// Routes every query through the active transaction's checked-out client when one exists,
// otherwise checks out a fresh client from the pool per call. This is what lets
// `store.transaction(() => {...})` callbacks keep closing over `db` exactly as they do today —
// no explicit client/tx parameter needs to be threaded through the ~25 files and ~84 transaction
// call sites that use it.
const als = new AsyncLocalStorage();

// Every pool is deliberately created with identical, generic connection parameters (see
// openStore below — no per-schema `options`/startup parameters). Supabase's Session Pooler
// (Supavisor) appears to bucket connections into distinct internal "pools" keyed by their exact
// startup parameters, capped independently of total connection count — giving each disposable
// test schema its own `-c search_path=...` startup option hit that cap (EMAXPOOLSREACHED) almost
// immediately with more than a couple of schemas in play. Selecting the schema at the SQL level
// instead, on every checked-out client, keeps every pool identical from the pooler's point of
// view, while still giving each schema correct isolation.
async function withClient(pool, schema, work) {
  const client = await pool.connect();
  // pool.on('error') (see openStore below) only covers a client that's IDLE, sitting unused in
  // the pool — one that's checked out (which this always is, for the lifetime of this function)
  // needs its own listener, or a connection severed between statements (not mid-query) is an
  // unhandled 'error' event on the Client itself, crashing the whole process the same way.
  // Confirmed by reproducing this exact crash during manual testing before adding this handler.
  // pg's Pool reuses the same underlying Client object across separate checkouts of an idle
  // connection — adding a listener on every checkout without ever removing it accumulates
  // indefinitely on that one long-lived object (confirmed via a real MaxListenersExceededWarning),
  // so it must come off again before release, symmetric with the add.
  const onError = (error) => console.error('Postgres client connection error:', error.message);
  client.on('error', onError);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    return await work(client);
  } finally {
    client.off('error', onError);
    client.release();
  }
}

function createDb(pool, schema) {
  const run = (fn) => {
    const active = als.getStore();
    return active ? fn(active) : withClient(pool, schema, fn);
  };
  return {
    prepare(sql) {
      const pgSql = toPgSql(sql);
      return {
        async get(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return result.rows[0];
        },
        async all(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return result.rows;
        },
        async run(...args) {
          const result = await run((client) => client.query(pgSql, args));
          return { changes: result.rowCount };
        },
      };
    },
    // Parameter-free `exec` uses pg's simple query protocol, which (like SQLite's db.exec)
    // supports multiple `;`-separated statements in one call — used for migration DDL blocks.
    async exec(sql) {
      await run((client) => client.query(sql));
    },
    async close() {
      await pool.end();
    },
  };
}

function createTransaction(pool, schema) {
  return async function transaction(work) {
    if (als.getStore())
      throw new Error('Nested transactions are not supported: a transaction() call was made while one was already active.');
    const client = await pool.connect();
    // See the identical comment in withClient above — a checked-out client needs its own error
    // listener, not just the pool's, and it must come off again before release (pg reuses the
    // same Client object across checkouts, so an unpaired add leaks listeners indefinitely).
    const onError = (error) => console.error('Postgres client connection error:', error.message);
    client.on('error', onError);
    try {
      await client.query(`SET search_path TO "${schema}"`);
      await client.query('BEGIN');
      const result = await als.run(client, () => work());
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.off('error', onError);
      client.release();
    }
  };
}

function sanitizeSchemaName(name) {
  return name.toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 60) || 'public';
}

// The single consolidated schema (replaces 31 sequential SQLite migrations). There is no
// production data to preserve pre-launch, and several of the 31 were bug-then-fix pairs
// (see git history) that cannot recur when every table is created once, in final column order.
// Kept schema-agnostic (no explicit schema-qualified names) so the exact same DDL text is used
// for the real `public` schema and every disposable per-test-file schema alike — routed by
// each connection's `search_path`, set at connection-startup time in `openStore` below.
const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY, email TEXT UNIQUE, password TEXT, name TEXT NOT NULL,
  demo INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  verified_at BIGINT, disabled_at BIGINT, points_balance INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), name TEXT NOT NULL,
  context TEXT NOT NULL, tier TEXT NOT NULL DEFAULT 'individual', member_limit INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  expires_at BIGINT NOT NULL, workspace_id TEXT REFERENCES workspaces(id)
);
CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at BIGINT NOT NULL,
  PRIMARY KEY (workspace_id, user_id)
);
CREATE TABLE IF NOT EXISTS job_posts (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  client_user_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, category TEXT NOT NULL,
  project_type TEXT NOT NULL, description TEXT NOT NULL, deliverables TEXT NOT NULL,
  budget_min INTEGER NOT NULL, budget_max INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS bids (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), freelancer_user_id TEXT NOT NULL REFERENCES users(id),
  cover_letter TEXT NOT NULL, proposed_amount INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS bids_one_per_user_job ON bids(job_id, freelancer_user_id);
CREATE TABLE IF NOT EXISTS proposals (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  job_id TEXT NOT NULL REFERENCES job_posts(id), bid_id TEXT REFERENCES bids(id),
  author_user_id TEXT NOT NULL REFERENCES users(id), source_type TEXT NOT NULL, title TEXT NOT NULL,
  scope TEXT NOT NULL, deliverables TEXT NOT NULL, amount INTEGER NOT NULL, currency TEXT NOT NULL,
  timeline TEXT NOT NULL, status TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE TABLE IF NOT EXISTS points_ledger (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT REFERENCES workspaces(id),
  amount INTEGER NOT NULL, reason TEXT NOT NULL, reference_id TEXT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS job_posts_workspace ON job_posts(workspace_id, status, created_at);
CREATE INDEX IF NOT EXISTS bids_job ON bids(job_id, status, created_at);
CREATE INDEX IF NOT EXISTS proposals_job ON proposals(job_id, created_at);
CREATE TABLE IF NOT EXISTS records (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), kind TEXT NOT NULL,
  data TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL,
  seq BIGSERIAL
);
CREATE INDEX IF NOT EXISTS records_workspace ON records(workspace_id, kind);
CREATE TABLE IF NOT EXISTS audit (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id), actor TEXT NOT NULL,
  action TEXT NOT NULL, object_id TEXT, detail TEXT NOT NULL, created_at TEXT NOT NULL,
  seq BIGSERIAL
);
CREATE INDEX IF NOT EXISTS audit_workspace ON audit(workspace_id, created_at);
CREATE TABLE IF NOT EXISTS account_tokens (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS account_tokens_lookup ON account_tokens(token_hash, kind, expires_at);

CREATE TABLE IF NOT EXISTS idempotency (
  user_id TEXT NOT NULL REFERENCES users(id), workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  operation TEXT NOT NULL, key TEXT NOT NULL, fingerprint TEXT NOT NULL,
  status INTEGER NOT NULL, response TEXT NOT NULL, created_at BIGINT NOT NULL,
  PRIMARY KEY(user_id, workspace_id, operation, key)
);

CREATE TABLE IF NOT EXISTS workflow_runs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL,
  objective_id TEXT NOT NULL REFERENCES records(id), state TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1, steps TEXT NOT NULL,
  start_at BIGINT NOT NULL, expires_at BIGINT NOT NULL,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, reason TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS workflow_due ON workflow_runs(state, start_at);
CREATE TABLE IF NOT EXISTS tool_invocations (
  id TEXT PRIMARY KEY, run_id TEXT NOT NULL REFERENCES workflow_runs(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL, tool_id TEXT NOT NULL, tool_version TEXT NOT NULL,
  principal_id TEXT NOT NULL, workspace_id TEXT NOT NULL,
  input TEXT NOT NULL, output TEXT NOT NULL, created_at TEXT NOT NULL,
  UNIQUE(run_id, step_id)
);

CREATE TABLE IF NOT EXISTS administration_audit (
  id TEXT PRIMARY KEY, actor_id TEXT NOT NULL, action TEXT NOT NULL,
  object_id TEXT NOT NULL, created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ai_usage (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL, created_at BIGINT NOT NULL, status TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ai_usage_workspace_day ON ai_usage(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS agent_manifests (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, home_engine TEXT NOT NULL,
  max_authority TEXT NOT NULL, human_gate TEXT NOT NULL,
  allowed_tool_ids TEXT NOT NULL, created_at TEXT NOT NULL,
  points_cost INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS agent_runs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  principal_id TEXT NOT NULL REFERENCES users(id),
  agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
  input TEXT NOT NULL, output TEXT, status TEXT NOT NULL,
  created_at TEXT NOT NULL, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS agent_runs_workspace ON agent_runs(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS model_registry (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, use_case TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS model_registry_use_case ON model_registry(use_case, status);

CREATE TABLE IF NOT EXISTS talent_profiles (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  headline TEXT NOT NULL DEFAULT '', skills TEXT NOT NULL DEFAULT '[]',
  experience_years INTEGER, availability TEXT, hourly_rate INTEGER, currency TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
  location TEXT, languages TEXT NOT NULL DEFAULT '[]', portfolio_url TEXT,
  vetting_status TEXT NOT NULL DEFAULT 'unverified', vetted_at TEXT, vetted_by TEXT REFERENCES users(id),
  domains TEXT NOT NULL DEFAULT '[]', functions TEXT NOT NULL DEFAULT '[]', industries TEXT NOT NULL DEFAULT '[]',
  jurisdiction TEXT
);
CREATE TABLE IF NOT EXISTS talent_assessments (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  skill TEXT NOT NULL, score INTEGER NOT NULL, method TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS talent_assessments_profile ON talent_assessments(profile_id);

CREATE TABLE IF NOT EXISTS expert_teams (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, lead_user_id TEXT NOT NULL REFERENCES users(id),
  description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  job_id TEXT REFERENCES job_posts(id), title TEXT NOT NULL, status TEXT NOT NULL,
  created_at TEXT NOT NULL, freelancer_user_id TEXT REFERENCES users(id),
  assigned_team_id TEXT REFERENCES expert_teams(id)
);
CREATE INDEX IF NOT EXISTS projects_workspace ON projects(workspace_id, status);
CREATE TABLE IF NOT EXISTS milestones (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', amount INTEGER NOT NULL,
  currency TEXT NOT NULL, due_date TEXT, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS milestones_project ON milestones(project_id, status);
CREATE TABLE IF NOT EXISTS deliverables (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', status TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS deliverables_milestone ON deliverables(milestone_id);

CREATE TABLE IF NOT EXISTS scope_items (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS scope_items_job ON scope_items(job_id);
CREATE TABLE IF NOT EXISTS acceptance_criteria (
  id TEXT PRIMARY KEY, deliverable_id TEXT NOT NULL REFERENCES deliverables(id),
  criterion TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS acceptance_criteria_deliverable ON acceptance_criteria(deliverable_id);
CREATE TABLE IF NOT EXISTS change_orders (
  id TEXT PRIMARY KEY, proposal_id TEXT NOT NULL REFERENCES proposals(id),
  description TEXT NOT NULL, amount_delta INTEGER NOT NULL DEFAULT 0, currency TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS change_orders_proposal ON change_orders(proposal_id);

CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  submitted_by TEXT NOT NULL REFERENCES users(id), notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submissions_milestone ON submissions(milestone_id);
CREATE TABLE IF NOT EXISTS submission_assets (
  id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
  url TEXT NOT NULL, kind TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS submission_assets_submission ON submission_assets(submission_id);
CREATE TABLE IF NOT EXISTS verification_cases (
  id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id),
  status TEXT NOT NULL, method TEXT NOT NULL, confidence DOUBLE PRECISION, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS verification_cases_submission ON verification_cases(submission_id);
CREATE TABLE IF NOT EXISTS criterion_results (
  id TEXT PRIMARY KEY, verification_case_id TEXT NOT NULL REFERENCES verification_cases(id),
  criterion_id TEXT NOT NULL REFERENCES acceptance_criteria(id), result TEXT NOT NULL,
  rationale TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS criterion_results_case ON criterion_results(verification_case_id);

CREATE TABLE IF NOT EXISTS approvals (
  id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
  approver_id TEXT NOT NULL REFERENCES users(id), decision TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS approvals_subject ON approvals(subject_type, subject_id);
CREATE TABLE IF NOT EXISTS disputes (
  id TEXT PRIMARY KEY, subject_type TEXT NOT NULL, subject_id TEXT NOT NULL,
  opened_by TEXT NOT NULL REFERENCES users(id), reason TEXT NOT NULL,
  status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS disputes_subject ON disputes(subject_type, subject_id);

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  name TEXT NOT NULL, unit TEXT NOT NULL DEFAULT '', target DOUBLE PRECISION, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kpi_definitions_workspace ON kpi_definitions(workspace_id);
CREATE TABLE IF NOT EXISTS kpi_observations (
  id TEXT PRIMARY KEY, kpi_id TEXT NOT NULL REFERENCES kpi_definitions(id),
  value DOUBLE PRECISION NOT NULL, observed_at TEXT NOT NULL, source TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kpi_observations_kpi ON kpi_observations(kpi_id, observed_at);

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  domain TEXT, function TEXT, industry TEXT, estimated_hours DOUBLE PRECISION,
  points_cost INTEGER, language TEXT NOT NULL DEFAULT 'en',
  coach_user_id TEXT REFERENCES users(id), created_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS learning_paths_workspace ON learning_paths(workspace_id);
CREATE TABLE IF NOT EXISTS learning_enrollments (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL,
  assigned_by TEXT REFERENCES users(id), due_at TEXT, completed_at TEXT
);
CREATE INDEX IF NOT EXISTS learning_enrollments_path ON learning_enrollments(path_id, user_id);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  subject TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL,
  project_id TEXT REFERENCES projects(id)
);
CREATE INDEX IF NOT EXISTS conversations_workspace ON conversations(workspace_id, created_at);
CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY, conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS messages_conversation ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS connections (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL, status TEXT NOT NULL, scopes TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS connections_workspace ON connections(workspace_id, provider);
CREATE TABLE IF NOT EXISTS webhook_receipts (
  id TEXT PRIMARY KEY, connection_id TEXT NOT NULL REFERENCES connections(id),
  event_type TEXT NOT NULL, payload TEXT NOT NULL, processed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS webhook_receipts_connection ON webhook_receipts(connection_id, created_at);

CREATE TABLE IF NOT EXISTS kyc_cases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL,
  provider TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS kyc_cases_user ON kyc_cases(user_id);
CREATE TABLE IF NOT EXISTS identity_evidence (
  id TEXT PRIMARY KEY, kyc_case_id TEXT NOT NULL REFERENCES kyc_cases(id),
  kind TEXT NOT NULL, reference TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS identity_evidence_case ON identity_evidence(kyc_case_id);

CREATE TABLE IF NOT EXISTS payment_accounts (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  provider TEXT NOT NULL, account_name TEXT NOT NULL, account_number TEXT NOT NULL,
  bank_code TEXT, recipient_code TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_accounts_user ON payment_accounts(user_id, provider);
CREATE TABLE IF NOT EXISTS payment_transfers (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  milestone_id TEXT NOT NULL REFERENCES milestones(id), provider TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, currency TEXT NOT NULL, recipient_code TEXT,
  status TEXT NOT NULL, provider_reference TEXT, failure_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS payment_transfers_milestone ON payment_transfers(milestone_id);
CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id TEXT PRIMARY KEY, provider TEXT NOT NULL, event_type TEXT NOT NULL,
  provider_event_id TEXT NOT NULL, payload TEXT NOT NULL,
  processed_at TEXT, created_at TEXT NOT NULL,
  UNIQUE(provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS document_signatures (
  id TEXT PRIMARY KEY, agent_run_id TEXT NOT NULL REFERENCES agent_runs(id),
  signer_user_id TEXT NOT NULL REFERENCES users(id), signer_name TEXT NOT NULL,
  document_hash TEXT NOT NULL, signed_at TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS document_signatures_run ON document_signatures(agent_run_id);

CREATE TABLE IF NOT EXISTS fx_rates (pair TEXT PRIMARY KEY, rate DOUBLE PRECISION NOT NULL, updated_at TEXT NOT NULL);

CREATE TABLE IF NOT EXISTS concierge_applications (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  headline TEXT NOT NULL, experience TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by TEXT REFERENCES users(id), reviewed_at TEXT,
  created_at TEXT NOT NULL, monthly_rate_minor INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS concierge_applications_user ON concierge_applications(user_id, status);

CREATE TABLE IF NOT EXISTS billing_line_items (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  kind TEXT NOT NULL, description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  period_start BIGINT NOT NULL, period_end BIGINT NOT NULL,
  created_at TEXT NOT NULL, paid_at TEXT,
  UNIQUE(workspace_id, kind, period_start)
);
CREATE INDEX IF NOT EXISTS billing_line_items_workspace ON billing_line_items(workspace_id, period_start);

CREATE TABLE IF NOT EXISTS bundles (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  price_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  points_included INTEGER NOT NULL DEFAULT 0,
  billing_cycle TEXT NOT NULL DEFAULT 'one_time',
  status TEXT NOT NULL DEFAULT 'draft',
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bundles_status ON bundles(status);
CREATE TABLE IF NOT EXISTS bundle_items (
  id TEXT PRIMARY KEY, bundle_id TEXT NOT NULL REFERENCES bundles(id),
  agent_id TEXT NOT NULL REFERENCES agent_manifests(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bundle_items_bundle ON bundle_items(bundle_id);

CREATE TABLE IF NOT EXISTS points_purchases (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  points INTEGER NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL DEFAULT 'USD',
  provider TEXT NOT NULL, provider_reference TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', created_at TEXT NOT NULL,
  bundle_id TEXT REFERENCES bundles(id)
);
CREATE INDEX IF NOT EXISTS points_purchases_user ON points_purchases(user_id, status);

CREATE TABLE IF NOT EXISTS job_invitations (
  id TEXT PRIMARY KEY, job_id TEXT NOT NULL REFERENCES job_posts(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  freelancer_user_id TEXT NOT NULL REFERENCES users(id),
  invited_by TEXT NOT NULL REFERENCES users(id),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, decided_at TEXT
);
CREATE INDEX IF NOT EXISTS job_invitations_job ON job_invitations(job_id, freelancer_user_id);
CREATE INDEX IF NOT EXISTS job_invitations_freelancer ON job_invitations(freelancer_user_id, status);

CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  key TEXT PRIMARY KEY, count INTEGER NOT NULL, reset_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS rate_limit_buckets_reset ON rate_limit_buckets(reset_at);

CREATE TABLE IF NOT EXISTS milestone_fundings (
  id TEXT PRIMARY KEY, milestone_id TEXT NOT NULL REFERENCES milestones(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  provider TEXT NOT NULL, amount_minor INTEGER NOT NULL, currency TEXT NOT NULL,
  provider_reference TEXT NOT NULL UNIQUE, status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL, held_at TEXT, released_at TEXT, refunded_at TEXT
);
CREATE INDEX IF NOT EXISTS milestone_fundings_milestone ON milestone_fundings(milestone_id);

CREATE TABLE IF NOT EXISTS expert_credentials (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  type TEXT NOT NULL, title TEXT NOT NULL, issuer TEXT NOT NULL,
  issued_at TEXT, expires_at TEXT, evidence_url TEXT,
  verification_status TEXT NOT NULL DEFAULT 'pending',
  verified_at TEXT, verified_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS expert_credentials_profile ON expert_credentials(profile_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  milestone_id TEXT NOT NULL REFERENCES milestones(id),
  reviewer_user_id TEXT NOT NULL REFERENCES users(id),
  reviewee_user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS reviews_one_per_reviewer_milestone ON reviews(milestone_id, reviewer_user_id);
CREATE INDEX IF NOT EXISTS reviews_reviewee ON reviews(reviewee_user_id);

CREATE TABLE IF NOT EXISTS conflict_disclosures (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  description TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'disclosed',
  created_at TEXT NOT NULL, reviewed_at TEXT, reviewed_by TEXT REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS conflict_disclosures_profile ON conflict_disclosures(profile_id, status);

CREATE TABLE IF NOT EXISTS scoping_cases (
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
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL, jurisdiction TEXT
);
CREATE INDEX IF NOT EXISTS scoping_cases_workspace ON scoping_cases(workspace_id, status);

CREATE TABLE IF NOT EXISTS availability_slots (
  id TEXT PRIMARY KEY, profile_id TEXT NOT NULL REFERENCES talent_profiles(id),
  start_at TEXT NOT NULL, end_at TEXT NOT NULL, format TEXT NOT NULL DEFAULT 'advisory_session',
  status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS availability_slots_profile ON availability_slots(profile_id, status);

CREATE TABLE IF NOT EXISTS bookings (
  id TEXT PRIMARY KEY, slot_id TEXT NOT NULL REFERENCES availability_slots(id),
  client_user_id TEXT NOT NULL REFERENCES users(id),
  expert_user_id TEXT NOT NULL REFERENCES users(id),
  project_id TEXT REFERENCES projects(id),
  status TEXT NOT NULL DEFAULT 'confirmed', notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS bookings_client ON bookings(client_user_id, status);
CREATE INDEX IF NOT EXISTS bookings_expert ON bookings(expert_user_id, status);

CREATE TABLE IF NOT EXISTS review_queue_entries (
  id TEXT PRIMARY KEY, scoping_case_id TEXT NOT NULL UNIQUE REFERENCES scoping_cases(id),
  risk_band TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'pending',
  claimed_by TEXT REFERENCES users(id), claimed_at TEXT, notes TEXT NOT NULL DEFAULT '',
  completed_at TEXT, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS review_queue_status ON review_queue_entries(status, created_at);

CREATE TABLE IF NOT EXISTS jurisdiction_rules (
  id TEXT PRIMARY KEY, jurisdiction TEXT NOT NULL, category TEXT NOT NULL,
  requires_license INTEGER NOT NULL DEFAULT 1, notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS jurisdiction_rules_unique ON jurisdiction_rules(jurisdiction, category);

CREATE TABLE IF NOT EXISTS handoffs (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  requested_by TEXT NOT NULL REFERENCES users(id),
  source TEXT NOT NULL, context_summary TEXT NOT NULL, context_snapshot TEXT NOT NULL DEFAULT '{}',
  target_user_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'pending',
  scoping_case_id TEXT REFERENCES scoping_cases(id), project_id TEXT REFERENCES projects(id),
  created_at TEXT NOT NULL, resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS handoffs_workspace ON handoffs(workspace_id, status);
CREATE INDEX IF NOT EXISTS handoffs_target ON handoffs(target_user_id, status);

CREATE TABLE IF NOT EXISTS engagement_outcomes (
  id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id),
  workspace_id TEXT NOT NULL REFERENCES workspaces(id), created_by TEXT NOT NULL REFERENCES users(id),
  summary TEXT NOT NULL, learnings TEXT NOT NULL DEFAULT '', reusable_context TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS engagement_outcomes_workspace ON engagement_outcomes(workspace_id, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS engagement_outcomes_project ON engagement_outcomes(project_id);

CREATE TABLE IF NOT EXISTS expert_team_members (
  id TEXT PRIMARY KEY, team_id TEXT NOT NULL REFERENCES expert_teams(id),
  user_id TEXT NOT NULL REFERENCES users(id), role TEXT NOT NULL DEFAULT '',
  access_scope TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS expert_team_members_unique ON expert_team_members(team_id, user_id);
CREATE INDEX IF NOT EXISTS expert_team_members_user ON expert_team_members(user_id);

CREATE TABLE IF NOT EXISTS learning_modules (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  format TEXT NOT NULL DEFAULT 'reading', order_index INTEGER NOT NULL DEFAULT 0,
  estimated_minutes INTEGER, content_url TEXT, quiz_skill TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS learning_modules_path ON learning_modules(path_id, order_index);

CREATE TABLE IF NOT EXISTS learning_module_completions (
  id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL REFERENCES learning_enrollments(id),
  module_id TEXT NOT NULL REFERENCES learning_modules(id),
  score INTEGER, completed_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_module_completions_unique ON learning_module_completions(enrollment_id, module_id);

CREATE TABLE IF NOT EXISTS learning_prerequisites (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  requires_path_id TEXT NOT NULL REFERENCES learning_paths(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_prerequisites_unique ON learning_prerequisites(path_id, requires_path_id);

CREATE TABLE IF NOT EXISTS learning_certificates (
  id TEXT PRIMARY KEY, enrollment_id TEXT NOT NULL UNIQUE REFERENCES learning_enrollments(id),
  credential_id TEXT REFERENCES expert_credentials(id),
  issued_at TEXT NOT NULL, expires_at TEXT
);

CREATE TABLE IF NOT EXISTS learning_feedback (
  id TEXT PRIMARY KEY, path_id TEXT NOT NULL REFERENCES learning_paths(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  rating INTEGER NOT NULL, comment TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS learning_feedback_unique ON learning_feedback(path_id, user_id);

CREATE TABLE IF NOT EXISTS compliance_requirements (
  id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL REFERENCES workspaces(id),
  path_id TEXT NOT NULL REFERENCES learning_paths(id),
  mandatory INTEGER NOT NULL DEFAULT 1, due_days INTEGER, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS compliance_requirements_workspace ON compliance_requirements(workspace_id);

CREATE TABLE IF NOT EXISTS signup_signals (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  email_hash TEXT NOT NULL, device_hash TEXT NOT NULL, ip_hash TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS signup_ip ON signup_signals(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS welcome_claims (
  user_id TEXT PRIMARY KEY, email_hash TEXT UNIQUE NOT NULL, device_hash TEXT,
  ip_hash TEXT, status TEXT NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS welcome_device ON welcome_claims(device_hash) WHERE status = 'granted';
CREATE INDEX IF NOT EXISTS welcome_ip ON welcome_claims(ip_hash, created_at);

CREATE TABLE IF NOT EXISTS otp_challenges (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL, code_hash TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  expires_at BIGINT NOT NULL, used_at BIGINT, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS otp_user ON otp_challenges(user_id, purpose, created_at);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  payload TEXT NOT NULL, status TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
  next_at BIGINT NOT NULL, lease_until BIGINT, expires_at BIGINT NOT NULL, created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS mail_pending ON mail_outbox(status, next_at);

CREATE TABLE IF NOT EXISTS service_leases (name TEXT PRIMARY KEY, owner TEXT NOT NULL, expires_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS account_security_keys (name TEXT PRIMARY KEY, value TEXT NOT NULL);
`;

const SEED_SQL = `
INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
  ('context-curator', 'Context Curator', 'Shared', 'A1', 'none', '[]', now()::text, 65),
  ('diagnostic-intelligence', 'Diagnostic Intelligence', 'Clarity', 'A1', 'none', '[]', now()::text, 65),
  ('workflow-orchestration', 'Workflow Orchestration', 'Consistency', 'A2', 'approve', '[]', now()::text, 5),
  ('signal-monitoring', 'Signal Monitoring', 'Shared', 'A1', 'none', '[]', now()::text, 65),
  ('capability-mapper', 'Capability Mapper', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('performance-analytics', 'Performance Analytics', 'Growth', 'A1', 'none', '[]', now()::text, 65),
  ('market-intelligence', 'Market Intelligence', 'Growth', 'A1', 'none', '[]', now()::text, 65),
  ('proposal-drafter', 'Proposal Drafter', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('scope-builder', 'Scope of Work Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('sow-builder', 'Statement of Work Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('brief-builder', 'Client Brief Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('deliverable-builder', 'Deliverable Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('acceptance-builder', 'Acceptance Criteria Builder', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('change-order', 'Change Order Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('quote-generator', 'Quote Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('estimate-generator', 'Estimate Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65),
  ('invoice-generator', 'Invoice Generator', 'Capability', 'A1', 'none', '[]', now()::text, 65);

INSERT INTO model_registry (id, provider, use_case, status, created_at) VALUES
  ('companion-context-v1', 'openai', 'companion.context-curator', 'approved', now()::text),
  ('companion-diagnostic-v1', 'openai', 'companion.diagnostic-intelligence', 'approved', now()::text),
  ('companion-signal-v1', 'openai', 'companion.signal-monitoring', 'approved', now()::text),
  ('companion-capability-v1', 'openai', 'companion.capability-mapper', 'approved', now()::text),
  ('companion-analytics-v1', 'openai', 'companion.performance-analytics', 'approved', now()::text),
  ('companion-market-v1', 'openai', 'companion.market-intelligence', 'approved', now()::text),
  ('companion-proposal-v1', 'openai', 'companion.proposal-drafter', 'approved', now()::text),
  ('companion-scope-v1', 'openai', 'companion.scope-builder', 'approved', now()::text),
  ('companion-sow-v1', 'openai', 'companion.sow-builder', 'approved', now()::text),
  ('companion-brief-v1', 'openai', 'companion.brief-builder', 'approved', now()::text),
  ('companion-deliverable-v1', 'openai', 'companion.deliverable-builder', 'approved', now()::text),
  ('companion-acceptance-v1', 'openai', 'companion.acceptance-builder', 'approved', now()::text),
  ('companion-change-order-v1', 'openai', 'companion.change-order', 'approved', now()::text),
  ('companion-verification-v1', 'openai', 'companion.deliverable-verification', 'approved', now()::text);

INSERT INTO fx_rates (pair, rate, updated_at) VALUES
  ('USD_EUR', 0.92, now()::text), ('EUR_USD', 1.09, now()::text),
  ('USD_GBP', 0.79, now()::text), ('GBP_USD', 1.27, now()::text),
  ('USD_NGN', 1450, now()::text), ('NGN_USD', 0.000690, now()::text),
  ('USD_CAD', 1.36, now()::text), ('CAD_USD', 0.735, now()::text),
  ('USD_AUD', 1.51, now()::text), ('AUD_USD', 0.662, now()::text);
`;

/**
 * `filename` keeps its historical name/positional meaning for call-site compatibility:
 *  - ':memory:' creates a randomly-named, disposable schema (test isolation).
 *  - any other string is sanitized and used directly as a real, reusable schema name.
 *  - omitted defaults to Postgres's own default schema, 'public' (normal/production use).
 *
 * `poolMax` is this *process's* share of the connection budget, not a fleet-wide total — under
 * Node clustering (server/index.mjs), every worker opens its own pool against the same Supabase
 * project, so the caller is responsible for dividing the total budget across worker count before
 * calling openStore. Test files run many pools concurrently too (see package.json's
 * --test-concurrency=3), so their ceiling must stay small and fixed regardless of environment:
 * 3 processes x 3 connections = 9, safely under the Session Pooler's 15-connection cap on lower
 * tiers.
 */
export async function openStore(filename, { poolMax } = {}) {
  const disposable = filename === ':memory:';
  const schema = disposable ? `test_${randomBytes(6).toString('hex')}` : sanitizeSchemaName(filename || 'public');

  // Any explicit `filename` (':memory:' or a named schema) only ever comes from test code —
  // server/index.mjs's real production boot never passes one. Routing every test call through a
  // dedicated TEST_DATABASE_URL, physically separate from the production project, means repeated
  // test runs (or a crashed run that skips its own cleanup) can never fill or corrupt production
  // data again. This throws rather than silently falling back to DATABASE_URL on purpose: a
  // missing TEST_DATABASE_URL should fail loudly, not quietly point tests at production.
  const isTestContext = filename !== undefined;
  if (isTestContext && !process.env.TEST_DATABASE_URL)
    throw new Error(
      'TEST_DATABASE_URL is not set. Tests must run against a separate Supabase project from production — set TEST_DATABASE_URL in .env to that project\'s connection string.',
    );
  const connectionString = isTestContext ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;

  const bootstrap = new pg.Pool({ connectionString, ssl: sslConfig, max: 1, connectionTimeoutMillis: 15000, statement_timeout: 30000, lock_timeout: 10000 });
  // node-postgres emits 'error' on the POOL (not the individual client) when an idle pooled
  // connection is severed — a network blip, Supabase recycling a connection, anything that
  // doesn't happen while the client is actively mid-query. With no listener, Node's default
  // behavior for an unhandled EventEmitter 'error' is to throw, crashing the entire process —
  // confirmed by reproducing exactly this crash during manual testing. A query in flight on that
  // connection still rejects normally to its caller; this only stops the *idle*-connection case
  // from taking down every other request the process is serving.
  bootstrap.on('error', (error) => console.error('Idle Postgres connection error (bootstrap pool):', error.message));
  try {
    await bootstrap.query(`CREATE SCHEMA IF NOT EXISTS "${schema}"`);
  } catch (error) {
    // Despite IF NOT EXISTS, Postgres's catalog check-then-create isn't itself atomic under true
    // concurrency: two processes racing to create the same schema (e.g. several cluster workers
    // starting simultaneously) can both pass the "not exists" check and both attempt the CREATE,
    // one hitting pg_namespace's own unique index. That failure means the schema now exists —
    // exactly the desired end state — so it's safe to swallow specifically this error.
    if (error.code !== '23505') throw error;
  } finally {
    await bootstrap.end();
  }

  const resolvedPoolMax = disposable ? 3 : poolMax || Number(process.env.PG_POOL_MAX) || 10;
  const pool = new pg.Pool({
    connectionString,
    ssl: sslConfig,
    connectionTimeoutMillis: 15000,
    statement_timeout: 30000,
    lock_timeout: 10000,
    idle_in_transaction_session_timeout: 60000,
    // Every pool uses identical, generic connection parameters — deliberately no per-schema
    // startup `options` here; see the comment on withClient above for why. Schema selection
    // happens per-checkout instead, via a runtime `SET search_path`.
    max: resolvedPoolMax,
  });
  pool.on('error', (error) => console.error('Idle Postgres connection error:', error.message));

  const client = await pool.connect();
  // Symmetric add/remove — see the comment in withClient for why an unpaired add leaks listeners
  // on this pool's connections, which withClient/transaction go on to reuse for this store's
  // entire lifetime.
  const onClientError = (error) => console.error('Postgres client connection error:', error.message);
  client.on('error', onClientError);
  try {
    await client.query(`SET search_path TO "${schema}"`);
    await client.query('BEGIN');
    // Serializes concurrent openStore() calls targeting the same schema — e.g. several Node
    // cluster workers all starting up at once against the production 'public' schema — so only
    // one of them actually runs the migration DDL/seed; the rest block here until it commits, then
    // correctly see migration 1 already applied and skip straight past it. Without this, several
    // workers could race on CREATE TABLE / the seed INSERTs simultaneously at startup. Transaction-
    // scoped, so the lock releases automatically at COMMIT/ROLLBACK below — no separate unlock.
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [schema]);
    await client.query('CREATE TABLE IF NOT EXISTS migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)');
    const already = await client.query('SELECT 1 FROM migrations WHERE version = 1');
    if (already.rowCount === 0) {
      await client.query(SCHEMA_SQL);
      await client.query(SEED_SQL);
      await client.query('INSERT INTO migrations VALUES (1, $1)', [new Date().toISOString()]);
    }
    await client.query(`CREATE TABLE IF NOT EXISTS refund_receipts (
      reference_id TEXT NOT NULL, reason TEXT NOT NULL, created_at BIGINT NOT NULL,
      PRIMARY KEY (reference_id, reason)
    );
    INSERT INTO refund_receipts SELECT reference_id, reason, MIN(created_at) FROM points_ledger
      WHERE reference_id IS NOT NULL AND reason IN ('agent_run_refund', 'ai_review_refund')
      GROUP BY reference_id, reason ON CONFLICT DO NOTHING;
    CREATE INDEX IF NOT EXISTS agent_history_owner ON agent_runs(workspace_id, principal_id, created_at);
    CREATE INDEX IF NOT EXISTS companion_task_owner ON records(workspace_id, (data::jsonb->>'ownerId'), seq) WHERE kind = 'companion_task';`);
    await client.query(`INSERT INTO agent_manifests (id, name, home_engine, max_authority, human_gate, allowed_tool_ids, created_at, points_cost) VALUES
      ('starter-planner', 'Starter Plan', 'Guidance', 'A1', 'none', '[]', $1, 0),
      ('onboarding', 'Onboarding Guide', 'Shared', 'A1', 'none', '[]', $1, 0),
      ('support', 'Support Guide', 'Shared', 'A1', 'none', '[]', $1, 0),
      ('pricing', 'Pricing Guide', 'Shared', 'A1', 'none', '[]', $1, 0)
      ON CONFLICT (id) DO NOTHING`, [new Date().toISOString()]);
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    client.off('error', onClientError);
    client.release();
    await pool.end();
    throw error;
  }
  client.off('error', onClientError);
  client.release();

  const db = createDb(pool, schema);
  const transaction = createTransaction(pool, schema);
  const log = async (workspace, actor, action, object, detail) =>
    db
      .prepare('INSERT INTO audit (id, workspace_id, actor, action, object_id, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(randomUUID(), workspace, actor, action, object, detail, new Date().toISOString());
  const insert = async (workspace, kind, data) => {
    const id = randomUUID();
    const createdAt = new Date().toISOString();
    await db
      .prepare('INSERT INTO records (id, workspace_id, kind, data, version, created_at) VALUES (?, ?, ?, ?, 1, ?)')
      .run(id, workspace, kind, JSON.stringify(data), createdAt);
    return { ...data, id, version: 1, createdAt };
  };
  const records = async (workspace, kind) => {
    const rows = await db
      .prepare('SELECT * FROM records WHERE workspace_id = ? AND kind = ? ORDER BY created_at DESC, seq DESC')
      .all(workspace, kind);
    return rows.map((row) => ({
      ...JSON.parse(row.data),
      id: row.id,
      version: row.version,
      createdAt: row.created_at,
    }));
  };
  // Only meaningful/safe for disposable test schemas — never called on 'public' or a named
  // production/dev schema. Tears down both the schema and this store's own connection pool.
  const dropSchema = async () => {
    await pool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await pool.end();
  };

  return { db, transaction, log, insert, records, schema, disposable, dropSchema };
}

export async function seedWorkspace(store, workspace, name) {
  const { insert, log } = store;
  const due = (days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toISOString().slice(0, 10);
  };
  const first = await insert(workspace, 'objective', {
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
  const second = await insert(workspace, 'objective', {
    title: 'Build a more intentional week',
    description: 'Make space for deep work and a meaningful weekly review.',
    context: 'Professional',
    priority: 'Medium',
    status: 'Active',
    targetDate: due(14),
    constraints: 'Two afternoons are reserved for client meetings.',
    success: 'Complete three focused work sessions each week.',
  });
  await insert(workspace, 'action', {
    title: 'Draft the service offer',
    objectiveId: first.id,
    status: 'In progress',
    dueDate: due(1),
    owner: name,
    requiresApproval: false,
    notes: 'Describe the outcome, audience, and boundaries of the first offer.',
  });
  await insert(workspace, 'action', {
    title: 'Review customer interview questions',
    objectiveId: first.id,
    status: 'Needs review',
    dueDate: due(0),
    owner: name,
    requiresApproval: true,
    notes:
      'Draft includes questions about current challenges, alternatives, and decision criteria. Review wording before using it.',
  });
  await insert(workspace, 'action', {
    title: 'Schedule three discovery conversations',
    objectiveId: first.id,
    status: 'Planned',
    dueDate: due(3),
    owner: name,
    requiresApproval: false,
    notes: 'Start with existing professional connections.',
  });
  await insert(workspace, 'action', {
    title: 'Protect two deep-work blocks',
    objectiveId: second.id,
    status: 'Done',
    dueDate: due(-1),
    owner: name,
    requiresApproval: false,
    notes: 'Reserved Tuesday and Thursday mornings.',
  });
  await insert(workspace, 'action', {
    title: 'Write a Friday reflection',
    objectiveId: second.id,
    status: 'Planned',
    dueDate: due(4),
    owner: name,
    requiresApproval: false,
    notes: '',
  });
  await log(
    workspace,
    name,
    'Sample workspace created',
    first.id,
    'Illustrative objectives and actions. No external work has been performed.',
  );
}
